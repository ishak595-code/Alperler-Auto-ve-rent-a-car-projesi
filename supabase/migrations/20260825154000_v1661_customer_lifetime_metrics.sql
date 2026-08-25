-- V166.1 Dynamic customer lifetime value and loyalty history.
-- No derived counters are persisted here. The summary is calculated from canonical
-- profile, booking, loyalty-ledger, campaign-redemption and referral records so it
-- cannot drift when a booking is completed, cancelled or refunded.

create or replace function public.customer_lifetime_summary(p_user_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path=public,private,pg_catalog
as $$
declare
  v_requester uuid := (select auth.uid());
  v_target uuid := coalesce(p_user_id,v_requester);
  v_profile_created timestamptz;
  v_first_booking timestamptz;
  v_customer_since timestamptz;
  v_tenure_days integer := 0;
  v_tenure_months integer := 0;
  v_completed_total integer := 0;
  v_completed_rentals integer := 0;
  v_completed_sales integer := 0;
  v_completed_tours integer := 0;
  v_completed_appointments integer := 0;
  v_first_completed timestamptz;
  v_last_completed timestamptz;
  v_first_rental timestamptz;
  v_last_rental timestamptz;
  v_rental_tenure_months integer := 0;
  v_points_balance integer := 0;
  v_lifetime_points integer := 0;
  v_points_earned integer := 0;
  v_points_redeemed integer := 0;
  v_points_refunded integer := 0;
  v_points_expired integer := 0;
  v_successful_referrals integer := 0;
  v_referral_points integer := 0;
  v_campaigns_completed integer := 0;
  v_campaigns_reserved integer := 0;
  v_referral_discount_uses integer := 0;
  v_tier text := 'BRONZE';
  v_engagement text := 'NEW';
  v_spend jsonb := '{}'::jsonb;
begin
  if v_requester is null or v_target is null then raise exception 'UNAUTHORIZED'; end if;
  if v_target<>v_requester and not (select private.can_manage_operations()) then raise exception 'FORBIDDEN'; end if;

  select p.created_at into v_profile_created from public.customer_profiles p where p.user_id=v_target;
  if v_profile_created is null then raise exception 'CUSTOMER_NOT_FOUND'; end if;

  select min(b.created_at) into v_first_booking from public.bookings b where b.customer_user_id=v_target;
  v_customer_since:=least(v_profile_created,coalesce(v_first_booking,v_profile_created));
  v_tenure_days:=greatest(0,(current_date-v_customer_since::date));
  v_tenure_months:=greatest(0,(extract(year from age(now(),v_customer_since))::integer*12)+extract(month from age(now(),v_customer_since))::integer);

  select
    count(*)::integer,
    count(*) filter(where b.booking_type='RENTAL')::integer,
    count(*) filter(where b.booking_type='SALE_INQUIRY')::integer,
    count(*) filter(where b.booking_type='TOUR')::integer,
    count(*) filter(where b.booking_type='APPOINTMENT')::integer,
    min(b.updated_at),max(b.updated_at),
    min(b.updated_at) filter(where b.booking_type='RENTAL'),
    max(b.updated_at) filter(where b.booking_type='RENTAL')
  into v_completed_total,v_completed_rentals,v_completed_sales,v_completed_tours,v_completed_appointments,v_first_completed,v_last_completed,v_first_rental,v_last_rental
  from public.bookings b
  where b.customer_user_id=v_target and b.deleted_at is null and b.status='COMPLETED';

  if v_first_rental is not null then
    v_rental_tenure_months:=greatest(0,(extract(year from age(now(),v_first_rental))::integer*12)+extract(month from age(now(),v_first_rental))::integer);
  end if;

  select coalesce(jsonb_object_agg(x.currency,x.payload),'{}'::jsonb) into v_spend
  from (
    select b.currency,
      jsonb_build_object(
        'spent',round(sum(case when coalesce(b.amount_paid,0)>0 then b.amount_paid else coalesce(b.total_price,0) end),2),
        'saved',round(sum(coalesce(b.discount_amount,0)),2),
        'transactions',count(*)
      ) as payload
    from public.bookings b
    where b.customer_user_id=v_target and b.deleted_at is null and b.status='COMPLETED'
    group by b.currency
  ) x;

  select coalesce(a.points_balance,0),coalesce(a.lifetime_points,0),coalesce(a.successful_referrals,0),coalesce(a.referral_points_earned,0),coalesce(a.tier,'BRONZE')
  into v_points_balance,v_lifetime_points,v_successful_referrals,v_referral_points,v_tier
  from public.customer_loyalty_accounts a where a.user_id=v_target;

  select
    coalesce(sum(l.points) filter(where l.direction='EARN'),0)::integer,
    coalesce(sum(l.points) filter(where l.direction='REDEEM'),0)::integer,
    coalesce(sum(l.points) filter(where l.direction='ADJUST' and l.reason='BOOKING_REDEMPTION_REFUND'),0)::integer,
    coalesce(sum(l.points) filter(where l.direction='EXPIRE'),0)::integer
  into v_points_earned,v_points_redeemed,v_points_refunded,v_points_expired
  from public.customer_loyalty_ledger l where l.user_id=v_target;

  if to_regclass('public.campaign_redemptions') is not null then
    select
      count(*) filter(where r.status='COMPLETED')::integer,
      count(*) filter(where r.status='RESERVED')::integer
    into v_campaigns_completed,v_campaigns_reserved
    from public.campaign_redemptions r where r.customer_user_id=v_target;
  end if;

  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='customer_referrals' and column_name='instant_discount_booking_id') then
    select count(*)::integer into v_referral_discount_uses from public.customer_referrals r
    where r.invitee_user_id=v_target and r.instant_discount_booking_id is not null;
  end if;

  v_engagement:=case
    when v_tenure_months>=48 and v_completed_total>=20 then 'LONG_TERM'
    when v_tenure_months>=24 and v_completed_total>=10 then 'LOYAL'
    when v_tenure_months>=6 and v_completed_total>=3 then 'REGULAR'
    else 'NEW'
  end;

  return jsonb_build_object(
    'userId',v_target,
    'customerSince',v_customer_since,
    'tenureDays',v_tenure_days,
    'tenureMonths',v_tenure_months,
    'tenureFullYears',floor(v_tenure_months/12.0)::integer,
    'firstRentalAt',v_first_rental,
    'lastRentalAt',v_last_rental,
    'rentalTenureMonths',v_rental_tenure_months,
    'rentalTenureFullYears',floor(v_rental_tenure_months/12.0)::integer,
    'engagementBand',v_engagement,
    'tier',v_tier,
    'completedTotal',v_completed_total,
    'completedRentals',v_completed_rentals,
    'completedSales',v_completed_sales,
    'completedTours',v_completed_tours,
    'completedAppointments',v_completed_appointments,
    'firstCompletedAt',v_first_completed,
    'lastCompletedAt',v_last_completed,
    'spendByCurrency',v_spend,
    'pointsBalance',v_points_balance,
    'lifetimePoints',v_lifetime_points,
    'pointsEarned',v_points_earned,
    'pointsRedeemedGross',v_points_redeemed,
    'pointsRedemptionRefunded',v_points_refunded,
    'pointsRedeemedNet',greatest(0,v_points_redeemed-v_points_refunded),
    'pointsExpired',v_points_expired,
    'successfulReferrals',v_successful_referrals,
    'referralPointsEarned',v_referral_points,
    'campaignsCompleted',v_campaigns_completed,
    'campaignsReserved',v_campaigns_reserved,
    'referralDiscountUses',v_referral_discount_uses,
    'generatedAt',now()
  );
end;
$$;

revoke all on function public.customer_lifetime_summary(uuid) from public,anon,authenticated,service_role;
grant execute on function public.customer_lifetime_summary(uuid) to authenticated;

comment on function public.customer_lifetime_summary(uuid) is
'Dynamic customer tenure, rental tenure, completed-service, spend, campaign, referral and loyalty ledger summary. Self-readable; operations admins may request another customer.';
