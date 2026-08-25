-- V166 one-time referral checkout benefit and loyalty redemption idempotency.

alter table public.customer_referrals
  add column if not exists instant_discount_booking_id uuid references public.bookings(id) on delete set null,
  add column if not exists instant_discount_amount numeric(14,2) not null default 0,
  add column if not exists instant_discount_used_at timestamptz;

alter table public.customer_referrals drop constraint if exists customer_referrals_instant_discount_amount_check;
alter table public.customer_referrals add constraint customer_referrals_instant_discount_amount_check check (instant_discount_amount >= 0);
create unique index if not exists customer_referrals_instant_discount_booking_uidx
  on public.customer_referrals(instant_discount_booking_id) where instant_discount_booking_id is not null;
create unique index if not exists customer_loyalty_booking_redeem_uidx
  on public.customer_loyalty_ledger(booking_id) where booking_id is not null and direction='REDEEM';
create unique index if not exists customer_loyalty_booking_refund_uidx
  on public.customer_loyalty_ledger(booking_id,reason) where booking_id is not null and reason='BOOKING_REDEMPTION_REFUND';

create or replace function private.v166_offer_breakdown(
  p_booking_type text,
  p_vehicle_id uuid,
  p_tour_id uuid,
  p_campaign_id uuid,
  p_customer_user_id uuid,
  p_normal_subtotal numeric,
  p_quantity numeric default 1,
  p_rental_days integer default null,
  p_rental_hours integer default null,
  p_requested_loyalty_points integer default 0
) returns jsonb
language plpgsql
security definer
set search_path=public,private,pg_catalog
as $$
declare
  v_campaign public.campaigns%rowtype;
  v_settings public.loyalty_program_settings%rowtype;
  v_normal numeric := round(greatest(0,coalesce(p_normal_subtotal,0)),2);
  v_campaign_discount numeric := 0;
  v_referral_discount numeric := 0;
  v_loyalty_discount numeric := 0;
  v_after_campaign numeric;
  v_after_referral numeric;
  v_points_balance integer := 0;
  v_points_requested integer := greatest(0,coalesce(p_requested_loyalty_points,0));
  v_points_used integer := 0;
  v_referral_value numeric := 0;
  v_active_redemptions integer := 0;
  v_customer_redemptions integer := 0;
  v_referral_id uuid := null;
  v_campaign_applied uuid := null;
begin
  if p_booking_type not in ('RENTAL','TOUR','SALE_INQUIRY') then raise exception 'INVALID_BOOKING_TYPE'; end if;
  select * into v_settings from public.loyalty_program_settings where id=true;

  if p_campaign_id is not null then
    select * into v_campaign from public.campaigns c
    where c.id=p_campaign_id and c.is_active and c.publication_status='PUBLISHED'
      and (c.starts_at is null or c.starts_at<=now()) and (c.ends_at is null or c.ends_at>now())
    for share;
    if not found then raise exception 'CAMPAIGN_NOT_ACTIVE'; end if;
    if v_campaign.target_type='VEHICLE' and (p_vehicle_id is null or v_campaign.target_id<>p_vehicle_id) then raise exception 'CAMPAIGN_TARGET_MISMATCH'; end if;
    if v_campaign.target_type='TOUR' and (p_tour_id is null or v_campaign.target_id<>p_tour_id) then raise exception 'CAMPAIGN_TARGET_MISMATCH'; end if;
    if v_campaign.target_type not in ('VEHICLE','TOUR') then raise exception 'CAMPAIGN_TARGET_UNSUPPORTED'; end if;
    if v_normal < v_campaign.minimum_order_amount then raise exception 'CAMPAIGN_MINIMUM_NOT_MET'; end if;
    if p_booking_type='RENTAL' and v_campaign.minimum_rental_days is not null and coalesce(p_rental_days,0)<v_campaign.minimum_rental_days then raise exception 'CAMPAIGN_MINIMUM_DAYS_NOT_MET'; end if;
    if p_booking_type='RENTAL' and v_campaign.minimum_rental_hours is not null and coalesce(p_rental_hours,0)<v_campaign.minimum_rental_hours then raise exception 'CAMPAIGN_MINIMUM_HOURS_NOT_MET'; end if;
    select count(*)::integer into v_active_redemptions from public.campaign_redemptions r where r.campaign_id=v_campaign.id and r.status in ('RESERVED','COMPLETED');
    if v_campaign.max_redemptions is not null and v_active_redemptions>=v_campaign.max_redemptions then raise exception 'CAMPAIGN_LIMIT_REACHED'; end if;
    if p_customer_user_id is not null then
      select count(*)::integer into v_customer_redemptions from public.campaign_redemptions r where r.campaign_id=v_campaign.id and r.customer_user_id=p_customer_user_id and r.status in ('RESERVED','COMPLETED');
      if v_customer_redemptions>=v_campaign.per_customer_limit then raise exception 'CAMPAIGN_CUSTOMER_LIMIT_REACHED'; end if;
    end if;
    v_campaign_discount:=private.v166_discount_amount(v_normal,p_quantity,v_campaign.discount_method,v_campaign.discount_value,v_campaign.discount_scope);
    v_campaign_applied:=v_campaign.id;
  end if;

  v_after_campaign:=greatest(0,v_normal-v_campaign_discount);
  if p_customer_user_id is not null and coalesce(v_settings.referral_checkout_discount_enabled,false) then
    select r.id into v_referral_id from public.customer_referrals r
      where r.invitee_user_id=p_customer_user_id and r.status in ('REGISTERED','REWARDED') and r.instant_discount_booking_id is null
      order by r.created_at asc limit 1;
    if v_referral_id is not null and (v_campaign_applied is null or (v_campaign.allow_referral_discount and v_settings.allow_campaign_referral_stack)) then
      v_referral_value:=case p_booking_type when 'RENTAL' then v_settings.referral_rental_invitee_discount when 'SALE_INQUIRY' then v_settings.referral_sale_invitee_discount when 'TOUR' then v_settings.referral_tour_invitee_discount else 0 end;
      if v_settings.referral_checkout_discount_mode='PERCENT' then v_referral_discount:=round(v_after_campaign*least(100,v_referral_value)/100,2);
      else v_referral_discount:=least(v_after_campaign,greatest(0,v_referral_value)); end if;
    end if;
  end if;

  v_after_referral:=greatest(0,v_after_campaign-v_referral_discount);
  if p_customer_user_id is not null and v_points_requested>0 and coalesce(v_settings.redemption_enabled,false)
     and (v_campaign_applied is null or (v_campaign.allow_loyalty_redemption and v_settings.allow_campaign_loyalty_stack))
     and (v_referral_discount=0 or v_settings.allow_referral_loyalty_stack) then
    select coalesce(a.points_balance,0) into v_points_balance from public.customer_loyalty_accounts a where a.user_id=p_customer_user_id;
    if v_points_balance is null then v_points_balance:=0; end if;
    v_points_used:=least(v_points_requested,v_points_balance);
    if v_points_used<v_settings.minimum_redeem_points then v_points_used:=0; end if;
    if v_points_used>0 and v_settings.point_value_try>0 then
      v_loyalty_discount:=least(v_after_referral,round(v_after_referral*v_settings.max_redeem_percent/100,2),round(v_points_used*v_settings.point_value_try,2));
      v_points_used:=least(v_points_used,floor(v_loyalty_discount/v_settings.point_value_try)::integer);
      v_loyalty_discount:=round(v_points_used*v_settings.point_value_try,2);
    end if;
  end if;

  return jsonb_build_object(
    'campaignId',v_campaign_applied,'referralId',v_referral_id,'normalSubtotal',v_normal,
    'campaignDiscount',v_campaign_discount,'referralDiscount',v_referral_discount,'loyaltyDiscount',v_loyalty_discount,
    'loyaltyPoints',v_points_used,'commercialSubtotal',round(greatest(0,v_normal-v_campaign_discount-v_referral_discount-v_loyalty_discount),2),
    'currency','TRY','campaignVisibility',case when v_campaign_applied is null then null else v_campaign.visibility_mode end,'pricingVersion','V166'
  );
end;
$$;
revoke all on function private.v166_offer_breakdown(text,uuid,uuid,uuid,uuid,numeric,numeric,integer,integer,integer) from public,anon,authenticated,service_role;

create or replace function public.reserve_booking_commercial_offer(
  p_booking_id uuid,
  p_campaign_id uuid default null,
  p_requested_loyalty_points integer default 0,
  p_normal_subtotal numeric default 0,
  p_quantity numeric default 1,
  p_extras_total numeric default 0,
  p_route_fuel_total numeric default 0
) returns jsonb
language plpgsql
security definer
set search_path=public,private,pg_catalog
as $$
declare
  v_booking public.bookings%rowtype; v_offer jsonb; v_campaign_id uuid; v_referral_id uuid;
  v_campaign_discount numeric; v_referral_discount numeric; v_loyalty_discount numeric; v_points integer;
  v_commercial_subtotal numeric; v_final numeric; v_balance integer; v_quote_id uuid; v_ledger_id uuid; v_referral_claimed uuid;
begin
  select * into v_booking from public.bookings b where b.id=p_booking_id and b.deleted_at is null for update;
  if not found then raise exception 'BOOKING_NOT_FOUND'; end if;
  if v_booking.status<>'PENDING' then raise exception 'BOOKING_NOT_PENDING'; end if;
  if exists(select 1 from public.commercial_offer_quotes q where q.booking_id=v_booking.id) then raise exception 'COMMERCIAL_OFFER_ALREADY_RESERVED'; end if;

  if p_campaign_id is not null then perform pg_advisory_xact_lock(hashtextextended(p_campaign_id::text,166)); end if;
  if v_booking.customer_user_id is not null then
    perform pg_advisory_xact_lock(hashtextextended(v_booking.customer_user_id::text,167));
    perform 1 from public.customer_loyalty_accounts a where a.user_id=v_booking.customer_user_id for update;
  end if;

  v_offer:=private.v166_offer_breakdown(v_booking.booking_type,v_booking.vehicle_id,v_booking.tour_id,p_campaign_id,v_booking.customer_user_id,p_normal_subtotal,p_quantity,v_booking.days,v_booking.rental_hours,p_requested_loyalty_points);
  v_campaign_id:=nullif(v_offer->>'campaignId','')::uuid;
  v_referral_id:=nullif(v_offer->>'referralId','')::uuid;
  v_campaign_discount:=coalesce((v_offer->>'campaignDiscount')::numeric,0);
  v_referral_discount:=coalesce((v_offer->>'referralDiscount')::numeric,0);
  v_loyalty_discount:=coalesce((v_offer->>'loyaltyDiscount')::numeric,0);
  v_points:=coalesce((v_offer->>'loyaltyPoints')::integer,0);
  v_commercial_subtotal:=coalesce((v_offer->>'commercialSubtotal')::numeric,0);
  v_final:=round(greatest(0,v_commercial_subtotal+greatest(0,coalesce(p_extras_total,0))+greatest(0,coalesce(p_route_fuel_total,0))),2);

  if v_referral_id is not null and v_referral_discount>0 then
    update public.customer_referrals set instant_discount_booking_id=v_booking.id,instant_discount_amount=v_referral_discount,instant_discount_used_at=now(),updated_at=now()
      where id=v_referral_id and instant_discount_booking_id is null returning id into v_referral_claimed;
    if v_referral_claimed is null then raise exception 'REFERRAL_DISCOUNT_ALREADY_USED'; end if;
  end if;

  if v_points>0 then
    update public.customer_loyalty_accounts set points_balance=points_balance-v_points,updated_at=now()
      where user_id=v_booking.customer_user_id and points_balance>=v_points returning points_balance into v_balance;
    if v_balance is null then raise exception 'LOYALTY_BALANCE_CHANGED'; end if;
    insert into public.customer_loyalty_ledger(user_id,booking_id,direction,points,reason,source)
      values(v_booking.customer_user_id,v_booking.id,'REDEEM',v_points,'BOOKING_CHECKOUT_REDEMPTION','SYSTEM') returning id into v_ledger_id;
  end if;

  if v_campaign_id is not null then
    insert into public.campaign_redemptions(campaign_id,booking_id,customer_user_id,discount_amount,status)
      values(v_campaign_id,v_booking.id,v_booking.customer_user_id,v_campaign_discount,'RESERVED');
  end if;

  insert into public.commercial_offer_quotes(customer_user_id,booking_type,vehicle_id,tour_id,campaign_id,normal_subtotal,campaign_discount,referral_discount,loyalty_discount,loyalty_points,extras_total,route_fuel_total,final_total,currency,pricing_snapshot,consumed_at,booking_id)
  values(v_booking.customer_user_id,v_booking.booking_type,v_booking.vehicle_id,v_booking.tour_id,v_campaign_id,round(greatest(0,p_normal_subtotal),2),v_campaign_discount,v_referral_discount,v_loyalty_discount,v_points,round(greatest(0,p_extras_total),2),round(greatest(0,p_route_fuel_total),2),v_final,'TRY',v_offer,now(),v_booking.id)
  returning id into v_quote_id;

  update public.bookings set campaign_id=v_campaign_id,normal_price_amount=round(greatest(0,p_normal_subtotal),2),campaign_discount_amount=v_campaign_discount,
    referral_discount_amount=v_referral_discount,loyalty_discount_amount=v_loyalty_discount,loyalty_points_redeemed=v_points,
    discount_amount=round(v_campaign_discount+v_referral_discount+v_loyalty_discount,2),
    base_price=case when p_quantity>0 then round(v_commercial_subtotal/greatest(1,p_quantity),2) else v_commercial_subtotal end,
    total_price=v_final,pricing_snapshot=v_offer||jsonb_build_object('quoteId',v_quote_id,'extrasTotal',greatest(0,p_extras_total),'routeFuelTotal',greatest(0,p_route_fuel_total),'finalTotal',v_final),
    metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('commercial_offer',v_offer||jsonb_build_object('quoteId',v_quote_id,'finalTotal',v_final)),updated_at=now()
  where id=v_booking.id;

  return v_offer||jsonb_build_object('quoteId',v_quote_id,'finalTotal',v_final,'bookingId',v_booking.id);
end;
$$;
revoke all on function public.reserve_booking_commercial_offer(uuid,uuid,integer,numeric,numeric,numeric,numeric) from public,anon,authenticated,service_role;
grant execute on function public.reserve_booking_commercial_offer(uuid,uuid,integer,numeric,numeric,numeric,numeric) to service_role;

create or replace function private.v166_reverse_commercial_benefits()
returns trigger
language plpgsql
security definer
set search_path=public,private,pg_catalog
as $$
declare v_points integer; v_refund_id uuid;
begin
  if old.status in ('PENDING','APPROVED') and new.status in ('CANCELLED','REJECTED') then
    update public.campaign_redemptions set status='REVERSED',reversed_at=coalesce(reversed_at,now()),updated_at=now() where booking_id=new.id and status='RESERVED';
    update public.customer_referrals set instant_discount_booking_id=null,instant_discount_amount=0,instant_discount_used_at=null,updated_at=now() where instant_discount_booking_id=new.id;
    v_points:=coalesce(old.loyalty_points_redeemed,0);
    if v_points>0 and old.customer_user_id is not null then
      insert into public.customer_loyalty_ledger(user_id,booking_id,direction,points,reason,source)
        values(old.customer_user_id,new.id,'ADJUST',v_points,'BOOKING_REDEMPTION_REFUND','SYSTEM') on conflict do nothing returning id into v_refund_id;
      if v_refund_id is not null then update public.customer_loyalty_accounts set points_balance=points_balance+v_points,updated_at=now() where user_id=old.customer_user_id; end if;
    end if;
  elsif old.status is distinct from 'COMPLETED' and new.status='COMPLETED' then
    update public.campaign_redemptions set status='COMPLETED',completed_at=coalesce(completed_at,now()),updated_at=now() where booking_id=new.id and status='RESERVED';
  end if;
  return new;
end;
$$;
revoke all on function private.v166_reverse_commercial_benefits() from public,anon,authenticated,service_role;

drop trigger if exists bookings_v166_commercial_status on public.bookings;
create trigger bookings_v166_commercial_status after update of status on public.bookings for each row execute function private.v166_reverse_commercial_benefits();
