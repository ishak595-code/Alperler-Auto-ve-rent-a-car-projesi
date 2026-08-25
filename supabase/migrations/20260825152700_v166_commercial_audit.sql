-- V166 commercial pricing audit trail.

create or replace function private.audit_v166_campaign_commercial_change()
returns trigger
language plpgsql
security definer
set search_path=public,auth,pg_catalog
as $$
declare
  v_actor uuid:=auth.uid();
  v_email text:=nullif(lower(btrim(coalesce(auth.jwt()->>'email',''))),'');
  v_before jsonb;
  v_after jsonb;
begin
  v_before:=case when tg_op='INSERT' then null else jsonb_build_object(
    'discountMethod',old.discount_method,'discountValue',old.discount_value,'discountScope',old.discount_scope,
    'visibilityMode',old.visibility_mode,'minimumOrderAmount',old.minimum_order_amount,
    'minimumRentalDays',old.minimum_rental_days,'minimumRentalHours',old.minimum_rental_hours,
    'maxRedemptions',old.max_redemptions,'perCustomerLimit',old.per_customer_limit,
    'allowReferralDiscount',old.allow_referral_discount,'allowLoyaltyRedemption',old.allow_loyalty_redemption,
    'priority',old.priority,'startsAt',old.starts_at,'endsAt',old.ends_at,'publicationStatus',old.publication_status,'isActive',old.is_active
  ) end;
  v_after:=jsonb_build_object(
    'discountMethod',new.discount_method,'discountValue',new.discount_value,'discountScope',new.discount_scope,
    'visibilityMode',new.visibility_mode,'minimumOrderAmount',new.minimum_order_amount,
    'minimumRentalDays',new.minimum_rental_days,'minimumRentalHours',new.minimum_rental_hours,
    'maxRedemptions',new.max_redemptions,'perCustomerLimit',new.per_customer_limit,
    'allowReferralDiscount',new.allow_referral_discount,'allowLoyaltyRedemption',new.allow_loyalty_redemption,
    'priority',new.priority,'startsAt',new.starts_at,'endsAt',new.ends_at,'publicationStatus',new.publication_status,'isActive',new.is_active
  );
  if tg_op='INSERT' or v_before is distinct from v_after then
    insert into public.audit_logs(actor_user_id,actor_email,action,entity_type,entity_id,before_data,after_data,event_meta)
    values(v_actor,v_email,case when tg_op='INSERT' then 'campaign_commercial_rules_created' else 'campaign_commercial_rules_changed' end,'campaign',new.id::text,v_before,v_after,jsonb_build_object('pricingVersion','V166'));
  end if;
  return new;
end;
$$;
revoke all on function private.audit_v166_campaign_commercial_change() from public,anon,authenticated,service_role;

drop trigger if exists campaigns_v166_commercial_audit on public.campaigns;
create trigger campaigns_v166_commercial_audit after insert or update on public.campaigns
for each row execute function private.audit_v166_campaign_commercial_change();

create or replace function private.audit_v166_loyalty_policy_change()
returns trigger
language plpgsql
security definer
set search_path=public,auth,pg_catalog
as $$
declare
  v_actor uuid:=auth.uid();
  v_email text:=nullif(lower(btrim(coalesce(auth.jwt()->>'email',''))),'');
  v_before jsonb;
  v_after jsonb;
begin
  v_before:=jsonb_build_object(
    'enabled',old.enabled,'pointsPerRentalDay',old.points_per_rental_day,
    'redemptionEnabled',old.redemption_enabled,'pointValueTry',old.point_value_try,
    'minimumRedeemPoints',old.minimum_redeem_points,'maxRedeemPercent',old.max_redeem_percent,
    'referralCheckoutDiscountEnabled',old.referral_checkout_discount_enabled,
    'referralCheckoutDiscountMode',old.referral_checkout_discount_mode,
    'referralRentalInviteeDiscount',old.referral_rental_invitee_discount,
    'referralSaleInviteeDiscount',old.referral_sale_invitee_discount,
    'referralTourInviteeDiscount',old.referral_tour_invitee_discount,
    'allowCampaignReferralStack',old.allow_campaign_referral_stack,
    'allowCampaignLoyaltyStack',old.allow_campaign_loyalty_stack,
    'allowReferralLoyaltyStack',old.allow_referral_loyalty_stack,
    'tourPointsPer100Try',old.tour_points_per_100_try,'salePointsPer1000Try',old.sale_points_per_1000_try
  );
  v_after:=jsonb_build_object(
    'enabled',new.enabled,'pointsPerRentalDay',new.points_per_rental_day,
    'redemptionEnabled',new.redemption_enabled,'pointValueTry',new.point_value_try,
    'minimumRedeemPoints',new.minimum_redeem_points,'maxRedeemPercent',new.max_redeem_percent,
    'referralCheckoutDiscountEnabled',new.referral_checkout_discount_enabled,
    'referralCheckoutDiscountMode',new.referral_checkout_discount_mode,
    'referralRentalInviteeDiscount',new.referral_rental_invitee_discount,
    'referralSaleInviteeDiscount',new.referral_sale_invitee_discount,
    'referralTourInviteeDiscount',new.referral_tour_invitee_discount,
    'allowCampaignReferralStack',new.allow_campaign_referral_stack,
    'allowCampaignLoyaltyStack',new.allow_campaign_loyalty_stack,
    'allowReferralLoyaltyStack',new.allow_referral_loyalty_stack,
    'tourPointsPer100Try',new.tour_points_per_100_try,'salePointsPer1000Try',new.sale_points_per_1000_try
  );
  if v_before is distinct from v_after then
    insert into public.audit_logs(actor_user_id,actor_email,action,entity_type,entity_id,before_data,after_data,event_meta)
    values(v_actor,v_email,'loyalty_commercial_rules_changed','loyalty_program','global',v_before,v_after,jsonb_build_object('pricingVersion','V166'));
  end if;
  return new;
end;
$$;
revoke all on function private.audit_v166_loyalty_policy_change() from public,anon,authenticated,service_role;

drop trigger if exists loyalty_v166_commercial_audit on public.loyalty_program_settings;
create trigger loyalty_v166_commercial_audit after update on public.loyalty_program_settings
for each row execute function private.audit_v166_loyalty_policy_change();
