-- V166 Commercial Offer Engine
-- Campaigns are pricing overlays on canonical rental, sale and tour inventory.
-- The browser may request a campaign/loyalty intent, but authoritative amounts are
-- calculated and reserved server-side. All monetary snapshots stay attached to bookings.

alter table public.campaigns
  add column if not exists discount_method text,
  add column if not exists discount_value numeric(14,2),
  add column if not exists discount_scope text not null default 'UNIT',
  add column if not exists visibility_mode text not null default 'CAMPAIGN_ONLY',
  add column if not exists minimum_order_amount numeric(14,2) not null default 0,
  add column if not exists minimum_rental_days integer,
  add column if not exists minimum_rental_hours integer,
  add column if not exists max_redemptions integer,
  add column if not exists per_customer_limit integer not null default 1,
  add column if not exists allow_referral_discount boolean not null default true,
  add column if not exists allow_loyalty_redemption boolean not null default true,
  add column if not exists priority integer not null default 100;

update public.campaigns
set discount_method = case
  when new_price is not null and new_price >= 0 then 'FIXED_PRICE'
  when discount_percent is not null and discount_percent > 0 then 'PERCENT'
  else 'FIXED_AMOUNT'
end,
discount_value = case
  when new_price is not null and new_price >= 0 then new_price
  when discount_percent is not null and discount_percent > 0 then discount_percent
  when old_price is not null and new_price is not null and old_price > new_price then old_price-new_price
  else coalesce(discount_value,0)
end
where discount_method is null or discount_value is null;

alter table public.campaigns alter column discount_method set default 'FIXED_AMOUNT';
alter table public.campaigns alter column discount_method set not null;
alter table public.campaigns alter column discount_value set default 0;
alter table public.campaigns alter column discount_value set not null;

alter table public.campaigns drop constraint if exists campaigns_discount_method_check;
alter table public.campaigns add constraint campaigns_discount_method_check
  check (discount_method in ('FIXED_AMOUNT','PERCENT','FIXED_PRICE'));
alter table public.campaigns drop constraint if exists campaigns_discount_scope_check;
alter table public.campaigns add constraint campaigns_discount_scope_check
  check (discount_scope in ('UNIT','ORDER'));
alter table public.campaigns drop constraint if exists campaigns_visibility_mode_check;
alter table public.campaigns add constraint campaigns_visibility_mode_check
  check (visibility_mode in ('CAMPAIGN_ONLY','EVERYWHERE'));
alter table public.campaigns drop constraint if exists campaigns_discount_value_check;
alter table public.campaigns add constraint campaigns_discount_value_check
  check (discount_value >= 0 and (discount_method <> 'PERCENT' or discount_value <= 100));
alter table public.campaigns drop constraint if exists campaigns_minimum_order_amount_check;
alter table public.campaigns add constraint campaigns_minimum_order_amount_check check (minimum_order_amount >= 0);
alter table public.campaigns drop constraint if exists campaigns_minimum_rental_days_check;
alter table public.campaigns add constraint campaigns_minimum_rental_days_check check (minimum_rental_days is null or minimum_rental_days between 1 and 3650);
alter table public.campaigns drop constraint if exists campaigns_minimum_rental_hours_check;
alter table public.campaigns add constraint campaigns_minimum_rental_hours_check check (minimum_rental_hours is null or minimum_rental_hours between 1 and 23);
alter table public.campaigns drop constraint if exists campaigns_max_redemptions_check;
alter table public.campaigns add constraint campaigns_max_redemptions_check check (max_redemptions is null or max_redemptions > 0);
alter table public.campaigns drop constraint if exists campaigns_per_customer_limit_check;
alter table public.campaigns add constraint campaigns_per_customer_limit_check check (per_customer_limit between 1 and 1000);

create index if not exists campaigns_live_target_priority_idx
  on public.campaigns(target_type,target_id,priority,sort_order,created_at desc)
  where is_active and publication_status='PUBLISHED';

alter table public.loyalty_program_settings
  add column if not exists redemption_enabled boolean not null default true,
  add column if not exists point_value_try numeric(10,4) not null default 0.10,
  add column if not exists minimum_redeem_points integer not null default 100,
  add column if not exists max_redeem_percent numeric(5,2) not null default 20,
  add column if not exists referral_checkout_discount_enabled boolean not null default true,
  add column if not exists referral_checkout_discount_mode text not null default 'FIXED_AMOUNT',
  add column if not exists referral_rental_invitee_discount numeric(14,2) not null default 250,
  add column if not exists referral_sale_invitee_discount numeric(14,2) not null default 1000,
  add column if not exists referral_tour_invitee_discount numeric(14,2) not null default 100,
  add column if not exists allow_campaign_referral_stack boolean not null default true,
  add column if not exists allow_campaign_loyalty_stack boolean not null default true,
  add column if not exists allow_referral_loyalty_stack boolean not null default false,
  add column if not exists tour_points_per_100_try integer not null default 2,
  add column if not exists sale_points_per_1000_try integer not null default 1;

alter table public.loyalty_program_settings drop constraint if exists loyalty_point_value_try_check;
alter table public.loyalty_program_settings add constraint loyalty_point_value_try_check check (point_value_try >= 0 and point_value_try <= 1000);
alter table public.loyalty_program_settings drop constraint if exists loyalty_minimum_redeem_points_check;
alter table public.loyalty_program_settings add constraint loyalty_minimum_redeem_points_check check (minimum_redeem_points between 0 and 100000000);
alter table public.loyalty_program_settings drop constraint if exists loyalty_max_redeem_percent_check;
alter table public.loyalty_program_settings add constraint loyalty_max_redeem_percent_check check (max_redeem_percent between 0 and 100);
alter table public.loyalty_program_settings drop constraint if exists loyalty_referral_checkout_discount_mode_check;
alter table public.loyalty_program_settings add constraint loyalty_referral_checkout_discount_mode_check check (referral_checkout_discount_mode in ('FIXED_AMOUNT','PERCENT'));
alter table public.loyalty_program_settings drop constraint if exists loyalty_referral_discount_amounts_check;
alter table public.loyalty_program_settings add constraint loyalty_referral_discount_amounts_check check (
  referral_rental_invitee_discount >= 0 and referral_sale_invitee_discount >= 0 and referral_tour_invitee_discount >= 0
);
alter table public.loyalty_program_settings drop constraint if exists loyalty_cross_service_points_check;
alter table public.loyalty_program_settings add constraint loyalty_cross_service_points_check check (
  tour_points_per_100_try between 0 and 100000 and sale_points_per_1000_try between 0 and 100000
);

alter table public.bookings
  add column if not exists normal_price_amount numeric(14,2) not null default 0,
  add column if not exists campaign_discount_amount numeric(14,2) not null default 0,
  add column if not exists referral_discount_amount numeric(14,2) not null default 0,
  add column if not exists loyalty_discount_amount numeric(14,2) not null default 0,
  add column if not exists loyalty_points_redeemed integer not null default 0,
  add column if not exists pricing_snapshot jsonb not null default '{}'::jsonb;

alter table public.bookings drop constraint if exists bookings_v166_commercial_amounts_check;
alter table public.bookings add constraint bookings_v166_commercial_amounts_check check (
  normal_price_amount >= 0 and campaign_discount_amount >= 0 and referral_discount_amount >= 0 and
  loyalty_discount_amount >= 0 and loyalty_points_redeemed >= 0
);

create table if not exists public.campaign_redemptions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete restrict,
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  customer_user_id uuid references public.customer_profiles(user_id) on delete set null,
  discount_amount numeric(14,2) not null default 0 check (discount_amount >= 0),
  status text not null default 'RESERVED' check (status in ('RESERVED','COMPLETED','REVERSED')),
  reserved_at timestamptz not null default now(),
  completed_at timestamptz,
  reversed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists campaign_redemptions_campaign_status_idx on public.campaign_redemptions(campaign_id,status,created_at desc);
create index if not exists campaign_redemptions_customer_campaign_idx on public.campaign_redemptions(customer_user_id,campaign_id,status) where customer_user_id is not null;
alter table public.campaign_redemptions enable row level security;
revoke all on public.campaign_redemptions from anon, authenticated, service_role;
grant select,insert,update,delete on public.campaign_redemptions to service_role;
grant select on public.campaign_redemptions to authenticated;
drop policy if exists campaign_redemptions_participant_read on public.campaign_redemptions;
create policy campaign_redemptions_participant_read on public.campaign_redemptions for select to authenticated
  using ((select auth.uid())=customer_user_id or (select private.can_manage_operations()));

create table if not exists public.commercial_offer_quotes (
  id uuid primary key default gen_random_uuid(),
  customer_user_id uuid references public.customer_profiles(user_id) on delete set null,
  booking_type text not null check (booking_type in ('RENTAL','TOUR','SALE_INQUIRY')),
  vehicle_id uuid references public.vehicles(id) on delete cascade,
  tour_id uuid references public.tours(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  normal_subtotal numeric(14,2) not null check (normal_subtotal >= 0),
  campaign_discount numeric(14,2) not null default 0 check (campaign_discount >= 0),
  referral_discount numeric(14,2) not null default 0 check (referral_discount >= 0),
  loyalty_discount numeric(14,2) not null default 0 check (loyalty_discount >= 0),
  loyalty_points integer not null default 0 check (loyalty_points >= 0),
  extras_total numeric(14,2) not null default 0 check (extras_total >= 0),
  route_fuel_total numeric(14,2) not null default 0 check (route_fuel_total >= 0),
  final_total numeric(14,2) not null check (final_total >= 0),
  currency text not null default 'TRY',
  pricing_snapshot jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null default (now()+interval '15 minutes'),
  consumed_at timestamptz,
  booking_id uuid unique references public.bookings(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists commercial_offer_quotes_customer_created_idx on public.commercial_offer_quotes(customer_user_id,created_at desc) where customer_user_id is not null;
create index if not exists commercial_offer_quotes_expiry_idx on public.commercial_offer_quotes(expires_at) where consumed_at is null;
alter table public.commercial_offer_quotes enable row level security;
revoke all on public.commercial_offer_quotes from anon, authenticated, service_role;
grant select,insert,update,delete on public.commercial_offer_quotes to service_role;

create or replace function private.v166_discount_amount(
  p_normal_subtotal numeric,
  p_quantity numeric,
  p_method text,
  p_value numeric,
  p_scope text
) returns numeric
language plpgsql immutable
set search_path=pg_catalog
as $$
declare
  v_normal numeric := greatest(0,coalesce(p_normal_subtotal,0));
  v_qty numeric := greatest(1,coalesce(p_quantity,1));
  v_value numeric := greatest(0,coalesce(p_value,0));
  v_discount numeric := 0;
begin
  if p_method='PERCENT' then
    v_discount := v_normal*least(100,v_value)/100;
  elsif p_method='FIXED_PRICE' then
    if p_scope='ORDER' then v_discount := greatest(0,v_normal-v_value);
    else v_discount := greatest(0,v_normal-(v_value*v_qty)); end if;
  else
    if p_scope='ORDER' then v_discount := v_value;
    else v_discount := v_value*v_qty; end if;
  end if;
  return round(least(v_normal,greatest(0,v_discount)),2);
end;
$$;
revoke all on function private.v166_discount_amount(numeric,numeric,text,numeric,text) from public,anon,authenticated,service_role;

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
  v_has_referral boolean := false;
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

    select count(*)::integer into v_active_redemptions from public.campaign_redemptions r
      where r.campaign_id=v_campaign.id and r.status in ('RESERVED','COMPLETED');
    if v_campaign.max_redemptions is not null and v_active_redemptions>=v_campaign.max_redemptions then raise exception 'CAMPAIGN_LIMIT_REACHED'; end if;
    if p_customer_user_id is not null then
      select count(*)::integer into v_customer_redemptions from public.campaign_redemptions r
      where r.campaign_id=v_campaign.id and r.customer_user_id=p_customer_user_id and r.status in ('RESERVED','COMPLETED');
      if v_customer_redemptions>=v_campaign.per_customer_limit then raise exception 'CAMPAIGN_CUSTOMER_LIMIT_REACHED'; end if;
    end if;

    v_campaign_discount := private.v166_discount_amount(v_normal,p_quantity,v_campaign.discount_method,v_campaign.discount_value,v_campaign.discount_scope);
    v_campaign_applied := v_campaign.id;
  end if;

  v_after_campaign := greatest(0,v_normal-v_campaign_discount);

  if p_customer_user_id is not null and coalesce(v_settings.referral_checkout_discount_enabled,false) then
    select exists(select 1 from public.customer_referrals r where r.invitee_user_id=p_customer_user_id and r.status in ('REGISTERED','REWARDED')) into v_has_referral;
    if v_has_referral and (v_campaign_applied is null or (v_campaign.allow_referral_discount and v_settings.allow_campaign_referral_stack)) then
      v_referral_value := case p_booking_type
        when 'RENTAL' then v_settings.referral_rental_invitee_discount
        when 'SALE_INQUIRY' then v_settings.referral_sale_invitee_discount
        when 'TOUR' then v_settings.referral_tour_invitee_discount
        else 0 end;
      if v_settings.referral_checkout_discount_mode='PERCENT' then
        v_referral_discount := round(v_after_campaign*least(100,v_referral_value)/100,2);
      else
        v_referral_discount := least(v_after_campaign,greatest(0,v_referral_value));
      end if;
    end if;
  end if;

  v_after_referral := greatest(0,v_after_campaign-v_referral_discount);

  if p_customer_user_id is not null and v_points_requested>0 and coalesce(v_settings.redemption_enabled,false)
     and (v_campaign_applied is null or (v_campaign.allow_loyalty_redemption and v_settings.allow_campaign_loyalty_stack))
     and (v_referral_discount=0 or v_settings.allow_referral_loyalty_stack) then
    select coalesce(a.points_balance,0) into v_points_balance from public.customer_loyalty_accounts a where a.user_id=p_customer_user_id;
    if v_points_balance is null then v_points_balance:=0; end if;
    v_points_used := least(v_points_requested,v_points_balance);
    if v_points_used < v_settings.minimum_redeem_points then v_points_used:=0; end if;
    if v_points_used>0 and v_settings.point_value_try>0 then
      v_loyalty_discount := least(
        v_after_referral,
        round(v_after_referral*v_settings.max_redeem_percent/100,2),
        round(v_points_used*v_settings.point_value_try,2)
      );
      v_points_used := least(v_points_used,floor(v_loyalty_discount/v_settings.point_value_try)::integer);
      v_loyalty_discount := round(v_points_used*v_settings.point_value_try,2);
    end if;
  end if;

  return jsonb_build_object(
    'campaignId',v_campaign_applied,
    'normalSubtotal',v_normal,
    'campaignDiscount',v_campaign_discount,
    'referralDiscount',v_referral_discount,
    'loyaltyDiscount',v_loyalty_discount,
    'loyaltyPoints',v_points_used,
    'commercialSubtotal',round(greatest(0,v_normal-v_campaign_discount-v_referral_discount-v_loyalty_discount),2),
    'currency','TRY',
    'campaignVisibility',case when v_campaign_applied is null then null else v_campaign.visibility_mode end,
    'pricingVersion','V166'
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
  v_booking public.bookings%rowtype;
  v_offer jsonb;
  v_campaign_id uuid;
  v_campaign_discount numeric;
  v_referral_discount numeric;
  v_loyalty_discount numeric;
  v_points integer;
  v_commercial_subtotal numeric;
  v_final numeric;
  v_balance integer;
  v_quote_id uuid;
  v_ledger_id uuid;
begin
  select * into v_booking from public.bookings b where b.id=p_booking_id and b.deleted_at is null for update;
  if not found then raise exception 'BOOKING_NOT_FOUND'; end if;
  if v_booking.status<>'PENDING' then raise exception 'BOOKING_NOT_PENDING'; end if;

  if p_campaign_id is not null then perform pg_advisory_xact_lock(hashtextextended(p_campaign_id::text,166)); end if;
  if v_booking.customer_user_id is not null then
    perform pg_advisory_xact_lock(hashtextextended(v_booking.customer_user_id::text,167));
    perform 1 from public.customer_loyalty_accounts a where a.user_id=v_booking.customer_user_id for update;
  end if;

  v_offer := private.v166_offer_breakdown(
    v_booking.booking_type,v_booking.vehicle_id,v_booking.tour_id,p_campaign_id,v_booking.customer_user_id,
    p_normal_subtotal,p_quantity,v_booking.days,v_booking.rental_hours,p_requested_loyalty_points
  );
  v_campaign_id := nullif(v_offer->>'campaignId','')::uuid;
  v_campaign_discount := coalesce((v_offer->>'campaignDiscount')::numeric,0);
  v_referral_discount := coalesce((v_offer->>'referralDiscount')::numeric,0);
  v_loyalty_discount := coalesce((v_offer->>'loyaltyDiscount')::numeric,0);
  v_points := coalesce((v_offer->>'loyaltyPoints')::integer,0);
  v_commercial_subtotal := coalesce((v_offer->>'commercialSubtotal')::numeric,0);
  v_final := round(greatest(0,v_commercial_subtotal+greatest(0,coalesce(p_extras_total,0))+greatest(0,coalesce(p_route_fuel_total,0))),2);

  if v_points>0 then
    update public.customer_loyalty_accounts set points_balance=points_balance-v_points,updated_at=now()
      where user_id=v_booking.customer_user_id and points_balance>=v_points returning points_balance into v_balance;
    if v_balance is null then raise exception 'LOYALTY_BALANCE_CHANGED'; end if;
    insert into public.customer_loyalty_ledger(user_id,booking_id,direction,points,reason,source)
      values(v_booking.customer_user_id,v_booking.id,'REDEEM',v_points,'BOOKING_CHECKOUT_REDEMPTION','SYSTEM')
      on conflict do nothing returning id into v_ledger_id;
    if v_ledger_id is null then raise exception 'LOYALTY_REDEMPTION_ALREADY_EXISTS'; end if;
  end if;

  if v_campaign_id is not null then
    insert into public.campaign_redemptions(campaign_id,booking_id,customer_user_id,discount_amount,status)
      values(v_campaign_id,v_booking.id,v_booking.customer_user_id,v_campaign_discount,'RESERVED');
  end if;

  insert into public.commercial_offer_quotes(
    customer_user_id,booking_type,vehicle_id,tour_id,campaign_id,normal_subtotal,campaign_discount,referral_discount,
    loyalty_discount,loyalty_points,extras_total,route_fuel_total,final_total,currency,pricing_snapshot,consumed_at,booking_id
  ) values(
    v_booking.customer_user_id,v_booking.booking_type,v_booking.vehicle_id,v_booking.tour_id,v_campaign_id,
    round(greatest(0,p_normal_subtotal),2),v_campaign_discount,v_referral_discount,v_loyalty_discount,v_points,
    round(greatest(0,p_extras_total),2),round(greatest(0,p_route_fuel_total),2),v_final,'TRY',v_offer,now(),v_booking.id
  ) returning id into v_quote_id;

  update public.bookings set
    campaign_id=v_campaign_id,
    normal_price_amount=round(greatest(0,p_normal_subtotal),2),
    campaign_discount_amount=v_campaign_discount,
    referral_discount_amount=v_referral_discount,
    loyalty_discount_amount=v_loyalty_discount,
    loyalty_points_redeemed=v_points,
    discount_amount=round(v_campaign_discount+v_referral_discount+v_loyalty_discount,2),
    base_price=case when p_quantity>0 then round(v_commercial_subtotal/greatest(1,p_quantity),2) else v_commercial_subtotal end,
    total_price=v_final,
    pricing_snapshot=v_offer || jsonb_build_object('quoteId',v_quote_id,'extrasTotal',greatest(0,p_extras_total),'routeFuelTotal',greatest(0,p_route_fuel_total),'finalTotal',v_final),
    metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('commercial_offer',v_offer||jsonb_build_object('quoteId',v_quote_id,'finalTotal',v_final)),
    updated_at=now()
  where id=v_booking.id;

  return v_offer || jsonb_build_object('quoteId',v_quote_id,'finalTotal',v_final,'bookingId',v_booking.id);
end;
$$;
revoke all on function public.reserve_booking_commercial_offer(uuid,uuid,integer,numeric,numeric,numeric,numeric) from public,anon,authenticated,service_role;
grant execute on function public.reserve_booking_commercial_offer(uuid,uuid,integer,numeric,numeric,numeric,numeric) to service_role;

create or replace function public.preview_commercial_offer(
  p_booking_type text,
  p_vehicle_id uuid default null,
  p_tour_id uuid default null,
  p_campaign_id uuid default null,
  p_customer_user_id uuid default null,
  p_normal_subtotal numeric default 0,
  p_quantity numeric default 1,
  p_rental_days integer default null,
  p_rental_hours integer default null,
  p_requested_loyalty_points integer default 0,
  p_extras_total numeric default 0,
  p_route_fuel_total numeric default 0
) returns jsonb
language plpgsql
security definer
set search_path=public,private,pg_catalog
as $$
declare v_offer jsonb; v_final numeric;
begin
  v_offer:=private.v166_offer_breakdown(p_booking_type,p_vehicle_id,p_tour_id,p_campaign_id,p_customer_user_id,p_normal_subtotal,p_quantity,p_rental_days,p_rental_hours,p_requested_loyalty_points);
  v_final:=round(greatest(0,coalesce((v_offer->>'commercialSubtotal')::numeric,0)+greatest(0,p_extras_total)+greatest(0,p_route_fuel_total)),2);
  return v_offer||jsonb_build_object('extrasTotal',greatest(0,p_extras_total),'routeFuelTotal',greatest(0,p_route_fuel_total),'finalTotal',v_final);
end;
$$;
revoke all on function public.preview_commercial_offer(text,uuid,uuid,uuid,uuid,numeric,numeric,integer,integer,integer,numeric,numeric) from public,anon,authenticated,service_role;
grant execute on function public.preview_commercial_offer(text,uuid,uuid,uuid,uuid,numeric,numeric,integer,integer,integer,numeric,numeric) to service_role;

create or replace function private.v166_reverse_commercial_benefits()
returns trigger
language plpgsql
security definer
set search_path=public,private,pg_catalog
as $$
declare v_points integer; v_refund_id uuid;
begin
  if old.status in ('PENDING','APPROVED') and new.status in ('CANCELLED','REJECTED') then
    update public.campaign_redemptions set status='REVERSED',reversed_at=coalesce(reversed_at,now()),updated_at=now()
      where booking_id=new.id and status='RESERVED';
    v_points:=coalesce(old.loyalty_points_redeemed,0);
    if v_points>0 and old.customer_user_id is not null then
      insert into public.customer_loyalty_ledger(user_id,booking_id,direction,points,reason,source)
        values(old.customer_user_id,new.id,'ADJUST',v_points,'BOOKING_REDEMPTION_REFUND','SYSTEM')
        on conflict do nothing returning id into v_refund_id;
      if v_refund_id is not null then
        update public.customer_loyalty_accounts set points_balance=points_balance+v_points,updated_at=now() where user_id=old.customer_user_id;
      end if;
    end if;
  elsif old.status is distinct from 'COMPLETED' and new.status='COMPLETED' then
    update public.campaign_redemptions set status='COMPLETED',completed_at=coalesce(completed_at,now()),updated_at=now()
      where booking_id=new.id and status='RESERVED';
  end if;
  return new;
end;
$$;
revoke all on function private.v166_reverse_commercial_benefits() from public,anon,authenticated,service_role;
drop trigger if exists bookings_v166_commercial_status on public.bookings;
create trigger bookings_v166_commercial_status after update of status on public.bookings
for each row execute function private.v166_reverse_commercial_benefits();

-- Replace the rental-only loyalty earn trigger with a cross-service, idempotent earn policy.
create or replace function private.award_customer_booking_loyalty()
returns trigger
language plpgsql
security definer
set search_path=public,private,pg_catalog
as $$
declare
  v_settings public.loyalty_program_settings;
  v_points integer:=0;
  v_days integer:=1;
  v_inserted uuid;
  v_new_lifetime integer;
  v_tier text;
  v_spend numeric:=greatest(0,coalesce(new.total_price,0));
begin
  if new.status<>'COMPLETED' or new.customer_user_id is null or new.deleted_at is not null then return new; end if;
  if new.booking_type not in ('RENTAL','TOUR','SALE_INQUIRY') then return new; end if;
  select * into v_settings from public.loyalty_program_settings where id=true;
  if not found or not v_settings.enabled then return new; end if;

  if new.booking_type='RENTAL' then
    v_days:=coalesce(new.days,case when new.start_at is not null and new.end_at is not null and new.end_at>new.start_at then greatest(1,ceil(extract(epoch from(new.end_at-new.start_at))/86400.0)::int) end,1);
    v_points:=greatest(v_settings.minimum_points_per_rental,v_days*v_settings.points_per_rental_day);
  elsif new.booking_type='TOUR' then
    v_points:=floor(v_spend/100)::integer*v_settings.tour_points_per_100_try;
  else
    v_points:=floor(v_spend/1000)::integer*v_settings.sale_points_per_1000_try;
  end if;
  if v_points<=0 then return new; end if;

  insert into public.customer_loyalty_ledger(user_id,booking_id,direction,points,reason,source)
    values(new.customer_user_id,new.id,'EARN',v_points,'COMPLETED_'||new.booking_type,'SYSTEM')
    on conflict do nothing returning id into v_inserted;
  if v_inserted is null then return new; end if;

  insert into public.customer_loyalty_accounts(user_id,points_balance,lifetime_points,completed_rentals,lifetime_spend)
    values(new.customer_user_id,v_points,v_points,case when new.booking_type='RENTAL' then 1 else 0 end,v_spend)
    on conflict(user_id) do update set
      points_balance=customer_loyalty_accounts.points_balance+excluded.points_balance,
      lifetime_points=customer_loyalty_accounts.lifetime_points+excluded.lifetime_points,
      completed_rentals=customer_loyalty_accounts.completed_rentals+excluded.completed_rentals,
      lifetime_spend=customer_loyalty_accounts.lifetime_spend+excluded.lifetime_spend,
      updated_at=now()
    returning lifetime_points into v_new_lifetime;

  v_tier:=case when v_new_lifetime>=v_settings.platinum_threshold then 'PLATINUM' when v_new_lifetime>=v_settings.gold_threshold then 'GOLD' when v_new_lifetime>=v_settings.silver_threshold then 'SILVER' else 'MEMBER' end;
  update public.customer_loyalty_accounts set tier=v_tier,updated_at=now() where user_id=new.customer_user_id;
  update public.bookings set loyalty_points_awarded=v_points where id=new.id and loyalty_points_awarded=0;
  return new;
end;
$$;
revoke all on function private.award_customer_booking_loyalty() from public,anon,authenticated,service_role;
drop trigger if exists bookings_customer_loyalty_award on public.bookings;
create trigger bookings_customer_loyalty_award after insert or update of status,customer_user_id on public.bookings
for each row execute function private.award_customer_booking_loyalty();

comment on table public.campaign_redemptions is 'V166 authoritative campaign redemption ledger. PENDING/APPROVED bookings reserve a campaign use; cancellation/rejection reverses it.';
comment on table public.commercial_offer_quotes is 'V166 service-only commercial price snapshots. Browser values are never authoritative.';
comment on function public.reserve_booking_commercial_offer(uuid,uuid,integer,numeric,numeric,numeric,numeric) is 'V166 service-only atomic reservation of campaign, referral and loyalty benefits for a validated booking.';
