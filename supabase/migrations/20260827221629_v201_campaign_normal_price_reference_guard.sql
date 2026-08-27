create or replace function private.v201_campaign_normal_subtotal(
  p_campaign_id uuid,
  p_normal_subtotal numeric,
  p_quantity numeric default 1
)
returns numeric
language plpgsql
stable
security definer
set search_path = public, private, pg_catalog
as $$
declare
  v_campaign public.campaigns%rowtype;
  v_normal numeric := round(greatest(0, coalesce(p_normal_subtotal, 0)), 2);
  v_quantity numeric := greatest(1, coalesce(p_quantity, 1));
  v_marketed_new numeric;
  v_marketed_old numeric;
begin
  if p_campaign_id is null then
    return v_normal;
  end if;

  select * into v_campaign
  from public.campaigns c
  where c.id = p_campaign_id
    and c.is_active
    and c.publication_status = 'PUBLISHED'
    and (c.starts_at is null or c.starts_at <= now())
    and (c.ends_at is null or c.ends_at > now());

  if not found or v_campaign.old_price is null or v_campaign.new_price is null
     or v_campaign.old_price <= v_campaign.new_price then
    return v_normal;
  end if;

  if v_campaign.discount_scope = 'UNIT' then
    v_marketed_new := round(v_campaign.new_price * v_quantity, 2);
    v_marketed_old := round(v_campaign.old_price * v_quantity, 2);
  else
    v_marketed_new := round(v_campaign.new_price, 2);
    v_marketed_old := round(v_campaign.old_price, 2);
  end if;

  if abs(v_normal - v_marketed_new) <= 0.02 then
    return v_marketed_old;
  end if;

  return v_normal;
end;
$$;

revoke all on function private.v201_campaign_normal_subtotal(uuid,numeric,numeric) from public, anon, authenticated;
grant execute on function private.v201_campaign_normal_subtotal(uuid,numeric,numeric) to service_role;

create or replace function public.reserve_booking_commercial_offer(
  p_booking_id uuid,
  p_campaign_id uuid default null,
  p_requested_loyalty_points integer default 0,
  p_normal_subtotal numeric default 0,
  p_quantity numeric default 1,
  p_extras_total numeric default 0,
  p_route_fuel_total numeric default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_catalog
as $$
declare
  v_booking public.bookings%rowtype; v_offer jsonb; v_campaign_id uuid; v_referral_id uuid;
  v_campaign_discount numeric; v_referral_discount numeric; v_loyalty_discount numeric; v_points integer;
  v_commercial_subtotal numeric; v_final numeric; v_balance integer; v_quote_id uuid; v_ledger_id uuid; v_referral_claimed uuid;
  v_effective_normal_subtotal numeric;
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

  v_effective_normal_subtotal := private.v201_campaign_normal_subtotal(p_campaign_id, p_normal_subtotal, p_quantity);
  v_offer:=private.v166_offer_breakdown(v_booking.booking_type,v_booking.vehicle_id,v_booking.tour_id,p_campaign_id,v_booking.customer_user_id,v_effective_normal_subtotal,p_quantity,v_booking.days,v_booking.rental_hours,p_requested_loyalty_points);
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
  values(v_booking.customer_user_id,v_booking.booking_type,v_booking.vehicle_id,v_booking.tour_id,v_campaign_id,round(greatest(0,v_effective_normal_subtotal),2),v_campaign_discount,v_referral_discount,v_loyalty_discount,v_points,round(greatest(0,p_extras_total),2),round(greatest(0,p_route_fuel_total),2),v_final,'TRY',v_offer,now(),v_booking.id)
  returning id into v_quote_id;

  update public.bookings set campaign_id=v_campaign_id,normal_price_amount=round(greatest(0,v_effective_normal_subtotal),2),campaign_discount_amount=v_campaign_discount,
    referral_discount_amount=v_referral_discount,loyalty_discount_amount=v_loyalty_discount,loyalty_points_redeemed=v_points,
    discount_amount=round(v_campaign_discount+v_referral_discount+v_loyalty_discount,2),
    base_price=case when p_quantity>0 then round(v_commercial_subtotal/greatest(1,p_quantity),2) else v_commercial_subtotal end,
    total_price=v_final,pricing_snapshot=v_offer||jsonb_build_object('quoteId',v_quote_id,'extrasTotal',greatest(0,p_extras_total),'routeFuelTotal',greatest(0,p_route_fuel_total),'finalTotal',v_final,'submittedNormalSubtotal',round(greatest(0,p_normal_subtotal),2),'effectiveNormalSubtotal',round(greatest(0,v_effective_normal_subtotal),2),'normalReferenceGuard','V201'),
    metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('commercial_offer',v_offer||jsonb_build_object('quoteId',v_quote_id,'finalTotal',v_final,'normalReferenceGuard','V201')),updated_at=now()
  where id=v_booking.id;

  return v_offer||jsonb_build_object('quoteId',v_quote_id,'finalTotal',v_final,'bookingId',v_booking.id,'submittedNormalSubtotal',round(greatest(0,p_normal_subtotal),2),'effectiveNormalSubtotal',round(greatest(0,v_effective_normal_subtotal),2),'normalReferenceGuard','V201');
end;
$$;

revoke all on function public.reserve_booking_commercial_offer(uuid,uuid,integer,numeric,numeric,numeric,numeric) from public, anon, authenticated;
grant execute on function public.reserve_booking_commercial_offer(uuid,uuid,integer,numeric,numeric,numeric,numeric) to service_role;
