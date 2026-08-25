-- V173 Customer CRM & Loyalty Security Gateway
-- Moves privileged customer administration behind service-role RPCs while preserving customer self-service RLS.
-- Legacy authenticated admin RPC grants are revoked only in the V173.1 cutover migration after the new gateway is live.

create or replace function public.service_customer_admin_list_v173(
  p_actor uuid,
  p_limit integer default 1000
)
returns jsonb
language plpgsql
stable
security definer
set search_path=public,private,auth,pg_catalog
as $$
declare
  v_limit integer:=greatest(1,least(coalesce(p_limit,1000),2000));
  v_customers jsonb;
  v_settings jsonb;
begin
  if not private.can_actor_manage_operations(p_actor) then
    raise exception using errcode='42501',message='ADMIN_OPERATIONS_REQUIRED';
  end if;

  select coalesce(jsonb_agg(x.payload order by x.created_at desc),'[]'::jsonb)
  into v_customers
  from (
    select p.created_at,
      jsonb_build_object(
        'user_id',p.user_id,
        'email',p.email,
        'full_name',p.full_name,
        'phone',p.phone,
        'city',p.city,
        'avatar_url',p.avatar_url,
        'preferred_branch_id',p.preferred_branch_id,
        'status',p.status,
        'points_balance',coalesce(l.points_balance,0),
        'lifetime_points',coalesce(l.lifetime_points,0),
        'completed_rentals',coalesce(l.completed_rentals,0),
        'lifetime_spend',coalesce(l.lifetime_spend,0),
        'tier',coalesce(l.tier,'MEMBER'),
        'successful_referrals',coalesce(l.successful_referrals,0),
        'referral_points_earned',coalesce(l.referral_points_earned,0)
      ) payload
    from public.customer_profiles p
    left join public.customer_loyalty_accounts l on l.user_id=p.user_id
    order by p.created_at desc
    limit v_limit
  ) x;

  select jsonb_build_object(
    'enabled',s.enabled,
    'points_per_rental_day',s.points_per_rental_day,
    'minimum_points_per_rental',s.minimum_points_per_rental,
    'silver_threshold',s.silver_threshold,
    'gold_threshold',s.gold_threshold,
    'platinum_threshold',s.platinum_threshold,
    'referral_inviter_points',s.referral_inviter_points,
    'referral_invitee_points',s.referral_invitee_points,
    'referral_rental_inviter_points',s.referral_rental_inviter_points,
    'referral_rental_invitee_points',s.referral_rental_invitee_points,
    'referral_sale_inviter_points',s.referral_sale_inviter_points,
    'referral_sale_invitee_points',s.referral_sale_invitee_points,
    'referral_tour_inviter_points',s.referral_tour_inviter_points,
    'referral_tour_invitee_points',s.referral_tour_invitee_points,
    'referral_milestone_3_points',s.referral_milestone_3_points,
    'referral_milestone_5_points',s.referral_milestone_5_points,
    'referral_milestone_10_points',s.referral_milestone_10_points,
    'benefits',s.benefits,
    'redemption_enabled',s.redemption_enabled,
    'point_value_try',s.point_value_try,
    'minimum_redeem_points',s.minimum_redeem_points,
    'max_redeem_percent',s.max_redeem_percent,
    'referral_checkout_discount_enabled',s.referral_checkout_discount_enabled,
    'referral_checkout_discount_mode',s.referral_checkout_discount_mode,
    'referral_rental_invitee_discount',s.referral_rental_invitee_discount,
    'referral_sale_invitee_discount',s.referral_sale_invitee_discount,
    'referral_tour_invitee_discount',s.referral_tour_invitee_discount,
    'allow_campaign_referral_stack',s.allow_campaign_referral_stack,
    'allow_campaign_loyalty_stack',s.allow_campaign_loyalty_stack,
    'allow_referral_loyalty_stack',s.allow_referral_loyalty_stack,
    'tour_points_per_100_try',s.tour_points_per_100_try,
    'sale_points_per_1000_try',s.sale_points_per_1000_try,
    'updated_at',s.updated_at
  ) into v_settings
  from public.loyalty_program_settings s where s.id=true;

  return jsonb_build_object('ok',true,'customers',v_customers,'settings',v_settings);
end;
$$;
revoke all on function public.service_customer_admin_list_v173(uuid,integer) from public,anon,authenticated;
grant execute on function public.service_customer_admin_list_v173(uuid,integer) to service_role;

create or replace function public.service_customer_admin_detail_v173(
  p_actor uuid,
  p_user_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path=public,private,auth,pg_catalog
as $$
declare
  v_profile jsonb;
  v_loyalty jsonb;
  v_preferences jsonb;
  v_consents jsonb;
  v_documents jsonb;
  v_referrals jsonb;
  v_rewards jsonb;
  v_payments jsonb;
  v_bookings jsonb;
begin
  if not private.can_actor_manage_operations(p_actor) then
    raise exception using errcode='42501',message='ADMIN_OPERATIONS_REQUIRED';
  end if;

  select jsonb_build_object(
    'user_id',p.user_id,'email',p.email,'full_name',p.full_name,'phone',p.phone,
    'birth_date',p.birth_date,'address_line',p.address_line,'district',p.district,'city',p.city,
    'country',p.country,'postal_code',p.postal_code,'avatar_url',p.avatar_url,
    'preferred_locale',p.preferred_locale,'preferred_branch_id',p.preferred_branch_id,
    'marketing_consent',p.marketing_consent,'status',p.status,'created_at',p.created_at,'updated_at',p.updated_at
  ) into v_profile
  from public.customer_profiles p where p.user_id=p_user_id;
  if v_profile is null then raise exception using errcode='P0002',message='CUSTOMER_NOT_FOUND'; end if;

  select jsonb_build_object(
    'user_id',l.user_id,'points_balance',l.points_balance,'lifetime_points',l.lifetime_points,
    'completed_rentals',l.completed_rentals,'lifetime_spend',l.lifetime_spend,'tier',l.tier,
    'successful_referrals',l.successful_referrals,'referral_points_earned',l.referral_points_earned
  ) into v_loyalty from public.customer_loyalty_accounts l where l.user_id=p_user_id;

  select jsonb_build_object(
    'user_id',e.user_id,'monthly_spend_target',e.monthly_spend_target,'preferred_currency',e.preferred_currency,
    'spend_alert_enabled',e.spend_alert_enabled,'spend_alert_threshold_percent',e.spend_alert_threshold_percent,
    'document_expiry_reminder_days',e.document_expiry_reminder_days,'quick_checkout_enabled',e.quick_checkout_enabled,
    'preferred_payment_method_id',e.preferred_payment_method_id,'created_at',e.created_at,'updated_at',e.updated_at
  ) into v_preferences from public.customer_experience_preferences e where e.user_id=p_user_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'user_id',c.user_id,'terms_version',c.terms_version,'accepted_at',c.accepted_at,'revoked_at',c.revoked_at,'accepted_via',c.accepted_via
  ) order by c.accepted_at desc),'[]'::jsonb) into v_consents
  from public.customer_vault_consents c where c.user_id=p_user_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',d.id,'user_id',d.user_id,'document_type',d.document_type,'original_name',d.original_name,
    'mime_type',d.mime_type,'file_size',d.file_size,'expiry_date',d.expiry_date,
    'verification_status',d.verification_status,'verified_at',d.verified_at,
    'rejection_reason',d.rejection_reason,'created_at',d.created_at,'updated_at',d.updated_at
  ) order by d.created_at desc),'[]'::jsonb) into v_documents
  from public.customer_documents d where d.user_id=p_user_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',r.id,'inviter_user_id',r.inviter_user_id,'invitee_user_id',r.invitee_user_id,'referral_code',r.referral_code,
    'status',r.status,'qualified_booking_id',r.qualified_booking_id,'inviter_points_awarded',r.inviter_points_awarded,
    'invitee_points_awarded',r.invitee_points_awarded,'claimed_at',r.claimed_at,'rewarded_at',r.rewarded_at,
    'created_at',r.created_at,'source_campaign_id',r.source_campaign_id,'landing_path',r.landing_path,
    'instant_discount_booking_id',r.instant_discount_booking_id,'instant_discount_amount',r.instant_discount_amount,
    'instant_discount_used_at',r.instant_discount_used_at
  ) order by r.created_at desc),'[]'::jsonb) into v_referrals
  from public.customer_referrals r where r.inviter_user_id=p_user_id or r.invitee_user_id=p_user_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',rw.id,'referral_id',rw.referral_id,'booking_id',rw.booking_id,'reward_type',rw.reward_type,
    'inviter_points',rw.inviter_points,'invitee_points',rw.invitee_points,'rewarded_at',rw.rewarded_at
  ) order by rw.rewarded_at desc),'[]'::jsonb) into v_rewards
  from public.customer_referral_rewards rw
  join public.customer_referrals r on r.id=rw.referral_id
  where r.inviter_user_id=p_user_id or r.invitee_user_id=p_user_id;

  -- Deliberately exposes only display-safe card metadata, never provider tokens or CVV/card number.
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',m.id,'provider',m.provider,'brand',m.brand,'last4',m.last4,'expiry_month',m.expiry_month,
    'expiry_year',m.expiry_year,'label',m.label,'is_default',m.is_default,'status',m.status
  ) order by m.is_default desc,m.created_at desc),'[]'::jsonb) into v_payments
  from public.customer_payment_methods m where m.user_id=p_user_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',b.id,'reference',b.reference,'booking_type',b.booking_type,'item_name',b.item_name,
    'total_price',b.total_price,'amount_paid',b.amount_paid,'discount_amount',b.discount_amount,
    'currency',b.currency,'status',b.status,'payment_status',b.payment_status,'created_at',b.created_at
  ) order by b.created_at desc),'[]'::jsonb) into v_bookings
  from public.bookings b where b.customer_user_id=p_user_id and b.deleted_at is null;

  return jsonb_build_object(
    'ok',true,'profile',v_profile,'loyalty',v_loyalty,'preferences',v_preferences,
    'consents',v_consents,'documents',v_documents,'referrals',v_referrals,'referralRewards',v_rewards,
    'paymentMethods',v_payments,'bookings',v_bookings
  );
end;
$$;
revoke all on function public.service_customer_admin_detail_v173(uuid,uuid) from public,anon,authenticated;
grant execute on function public.service_customer_admin_detail_v173(uuid,uuid) to service_role;

create or replace function public.service_set_customer_status_v173(
  p_actor uuid,
  p_user_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path=public,private,auth,pg_catalog
as $$
declare
  v_before public.customer_profiles%rowtype;
  v_after public.customer_profiles%rowtype;
  v_actor_email text;
  v_status text:=upper(btrim(coalesce(p_status,'')));
begin
  if not private.can_actor_manage_operations(p_actor) then raise exception using errcode='42501',message='ADMIN_OPERATIONS_REQUIRED'; end if;
  if v_status not in ('ACTIVE','BLOCKED','DELETED') then raise exception using errcode='22023',message='INVALID_CUSTOMER_STATUS'; end if;
  select * into v_before from public.customer_profiles where user_id=p_user_id for update;
  if not found then raise exception using errcode='P0002',message='CUSTOMER_NOT_FOUND'; end if;
  update public.customer_profiles set status=v_status,updated_at=now() where user_id=p_user_id returning * into v_after;
  select email into v_actor_email from auth.users where id=p_actor;
  insert into public.audit_logs(actor_user_id,actor_email,action,entity_type,entity_id,before_data,after_data,event_meta)
  values(p_actor,v_actor_email,'CUSTOMER_STATUS_UPDATED_V173','customer',p_user_id::text,
    jsonb_build_object('status',v_before.status),jsonb_build_object('status',v_after.status),jsonb_build_object('gateway','customer-admin-v173'));
  return jsonb_build_object('ok',true,'user_id',p_user_id,'status',v_after.status);
end;
$$;
revoke all on function public.service_set_customer_status_v173(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.service_set_customer_status_v173(uuid,uuid,text) to service_role;

create or replace function public.service_link_booking_customer_v173(
  p_actor uuid,
  p_booking_reference text,
  p_customer_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path=public,private,auth,pg_catalog
as $$
declare
  v_booking_before public.bookings%rowtype;
  v_booking_after public.bookings%rowtype;
  v_customer public.customer_profiles%rowtype;
  v_actor_email text;
  v_reference text:=left(btrim(coalesce(p_booking_reference,'')),100);
begin
  if not private.can_actor_manage_operations(p_actor) then raise exception using errcode='42501',message='ADMIN_OPERATIONS_REQUIRED'; end if;
  if v_reference='' then raise exception using errcode='22023',message='BOOKING_REFERENCE_REQUIRED'; end if;
  select * into v_customer from public.customer_profiles where user_id=p_customer_user_id and status='ACTIVE';
  if not found then raise exception using errcode='P0002',message='CUSTOMER_NOT_FOUND_OR_INACTIVE'; end if;
  select * into v_booking_before from public.bookings where reference=v_reference and deleted_at is null for update;
  if not found then raise exception using errcode='P0002',message='BOOKING_NOT_FOUND'; end if;
  update public.bookings set customer_user_id=p_customer_user_id,customer_linked_at=now(),
    customer_name=coalesce(nullif(v_customer.full_name,''),customer_name),
    customer_email=coalesce(nullif(v_customer.email,''),customer_email),
    customer_phone=coalesce(nullif(v_customer.phone,''),customer_phone),updated_at=now()
  where id=v_booking_before.id returning * into v_booking_after;
  select email into v_actor_email from auth.users where id=p_actor;
  insert into public.audit_logs(actor_user_id,actor_email,action,entity_type,entity_id,before_data,after_data,event_meta)
  values(p_actor,v_actor_email,'CUSTOMER_BOOKING_LINKED_V173','booking',v_booking_after.reference,
    jsonb_build_object('customer_user_id',v_booking_before.customer_user_id),
    jsonb_build_object('customer_user_id',v_booking_after.customer_user_id),jsonb_build_object('gateway','customer-admin-v173'));
  return jsonb_build_object('ok',true,'bookingReference',v_booking_after.reference,'customerUserId',v_booking_after.customer_user_id,'loyaltyPointsAwarded',v_booking_after.loyalty_points_awarded);
end;
$$;
revoke all on function public.service_link_booking_customer_v173(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.service_link_booking_customer_v173(uuid,text,uuid) to service_role;

create or replace function public.service_review_customer_document_v173(
  p_actor uuid,
  p_document_id uuid,
  p_status text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public,private,auth,pg_catalog
as $$
declare
  v_before public.customer_documents%rowtype;
  v_after public.customer_documents%rowtype;
  v_actor_email text;
  v_status text:=upper(btrim(coalesce(p_status,'')));
  v_reason text:=nullif(left(btrim(coalesce(p_reason,'')),500),'');
begin
  if not private.can_actor_manage_operations(p_actor) then raise exception using errcode='42501',message='ADMIN_OPERATIONS_REQUIRED'; end if;
  if v_status not in ('VERIFIED','REJECTED','EXPIRED','PENDING') then raise exception using errcode='22023',message='INVALID_DOCUMENT_STATUS'; end if;
  if v_status='REJECTED' and v_reason is null then raise exception using errcode='22023',message='REJECTION_REASON_REQUIRED'; end if;
  select * into v_before from public.customer_documents where id=p_document_id for update;
  if not found then raise exception using errcode='P0002',message='DOCUMENT_NOT_FOUND'; end if;
  update public.customer_documents set verification_status=v_status,
    verified_at=case when v_status='VERIFIED' then now() else null end,
    verified_by=case when v_status='VERIFIED' then p_actor else null end,
    rejection_reason=case when v_status='REJECTED' then v_reason else null end,
    updated_at=now()
  where id=p_document_id returning * into v_after;
  select email into v_actor_email from auth.users where id=p_actor;
  insert into public.audit_logs(actor_user_id,actor_email,action,entity_type,entity_id,before_data,after_data,event_meta)
  values(p_actor,v_actor_email,'CUSTOMER_DOCUMENT_REVIEWED_V173','customer_document',p_document_id::text,
    jsonb_build_object('status',v_before.verification_status,'reason',v_before.rejection_reason),
    jsonb_build_object('status',v_after.verification_status,'reason',v_after.rejection_reason),
    jsonb_build_object('customer_user_id',v_after.user_id,'gateway','customer-admin-v173'));
  return jsonb_build_object('ok',true,'id',v_after.id,'user_id',v_after.user_id,'status',v_after.verification_status);
end;
$$;
revoke all on function public.service_review_customer_document_v173(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.service_review_customer_document_v173(uuid,uuid,text,text) to service_role;

create or replace function public.service_save_loyalty_settings_v173(
  p_actor uuid,
  p_settings jsonb
)
returns jsonb
language plpgsql
security definer
set search_path=public,private,auth,pg_catalog
as $$
declare
  v_before public.loyalty_program_settings%rowtype;
  v_after public.loyalty_program_settings%rowtype;
  v_actor_email text;
  v_mode text;
begin
  if not private.can_actor_manage_operations(p_actor) then raise exception using errcode='42501',message='ADMIN_OPERATIONS_REQUIRED'; end if;
  if p_settings is null or jsonb_typeof(p_settings)<>'object' then raise exception using errcode='22023',message='LOYALTY_SETTINGS_REQUIRED'; end if;
  select * into v_before from public.loyalty_program_settings where id=true for update;
  if not found then raise exception using errcode='P0002',message='LOYALTY_SETTINGS_NOT_FOUND'; end if;

  v_mode:=upper(coalesce(nullif(btrim(p_settings->>'referral_checkout_discount_mode'),''),v_before.referral_checkout_discount_mode));
  if v_mode not in ('FIXED_AMOUNT','PERCENT') then raise exception using errcode='22023',message='INVALID_REFERRAL_DISCOUNT_MODE'; end if;

  update public.loyalty_program_settings set
    enabled=coalesce((p_settings->>'enabled')::boolean,v_before.enabled),
    points_per_rental_day=coalesce((p_settings->>'points_per_rental_day')::integer,v_before.points_per_rental_day),
    minimum_points_per_rental=coalesce((p_settings->>'minimum_points_per_rental')::integer,v_before.minimum_points_per_rental),
    silver_threshold=coalesce((p_settings->>'silver_threshold')::integer,v_before.silver_threshold),
    gold_threshold=coalesce((p_settings->>'gold_threshold')::integer,v_before.gold_threshold),
    platinum_threshold=coalesce((p_settings->>'platinum_threshold')::integer,v_before.platinum_threshold),
    referral_rental_inviter_points=coalesce((p_settings->>'referral_rental_inviter_points')::integer,v_before.referral_rental_inviter_points),
    referral_rental_invitee_points=coalesce((p_settings->>'referral_rental_invitee_points')::integer,v_before.referral_rental_invitee_points),
    referral_sale_inviter_points=coalesce((p_settings->>'referral_sale_inviter_points')::integer,v_before.referral_sale_inviter_points),
    referral_sale_invitee_points=coalesce((p_settings->>'referral_sale_invitee_points')::integer,v_before.referral_sale_invitee_points),
    referral_tour_inviter_points=coalesce((p_settings->>'referral_tour_inviter_points')::integer,v_before.referral_tour_inviter_points),
    referral_tour_invitee_points=coalesce((p_settings->>'referral_tour_invitee_points')::integer,v_before.referral_tour_invitee_points),
    referral_milestone_3_points=coalesce((p_settings->>'referral_milestone_3_points')::integer,v_before.referral_milestone_3_points),
    referral_milestone_5_points=coalesce((p_settings->>'referral_milestone_5_points')::integer,v_before.referral_milestone_5_points),
    referral_milestone_10_points=coalesce((p_settings->>'referral_milestone_10_points')::integer,v_before.referral_milestone_10_points),
    benefits=case when p_settings ? 'benefits' and jsonb_typeof(p_settings->'benefits')='object' then p_settings->'benefits' else v_before.benefits end,
    redemption_enabled=coalesce((p_settings->>'redemption_enabled')::boolean,v_before.redemption_enabled),
    point_value_try=coalesce((p_settings->>'point_value_try')::numeric,v_before.point_value_try),
    minimum_redeem_points=coalesce((p_settings->>'minimum_redeem_points')::integer,v_before.minimum_redeem_points),
    max_redeem_percent=coalesce((p_settings->>'max_redeem_percent')::numeric,v_before.max_redeem_percent),
    referral_checkout_discount_enabled=coalesce((p_settings->>'referral_checkout_discount_enabled')::boolean,v_before.referral_checkout_discount_enabled),
    referral_checkout_discount_mode=v_mode,
    referral_rental_invitee_discount=coalesce((p_settings->>'referral_rental_invitee_discount')::numeric,v_before.referral_rental_invitee_discount),
    referral_sale_invitee_discount=coalesce((p_settings->>'referral_sale_invitee_discount')::numeric,v_before.referral_sale_invitee_discount),
    referral_tour_invitee_discount=coalesce((p_settings->>'referral_tour_invitee_discount')::numeric,v_before.referral_tour_invitee_discount),
    allow_campaign_referral_stack=coalesce((p_settings->>'allow_campaign_referral_stack')::boolean,v_before.allow_campaign_referral_stack),
    allow_campaign_loyalty_stack=coalesce((p_settings->>'allow_campaign_loyalty_stack')::boolean,v_before.allow_campaign_loyalty_stack),
    allow_referral_loyalty_stack=coalesce((p_settings->>'allow_referral_loyalty_stack')::boolean,v_before.allow_referral_loyalty_stack),
    tour_points_per_100_try=coalesce((p_settings->>'tour_points_per_100_try')::integer,v_before.tour_points_per_100_try),
    sale_points_per_1000_try=coalesce((p_settings->>'sale_points_per_1000_try')::integer,v_before.sale_points_per_1000_try),
    updated_at=now(),updated_by=p_actor
  where id=true returning * into v_after;

  if v_after.points_per_rental_day<1 or v_after.points_per_rental_day>100000
     or v_after.minimum_points_per_rental<0 or v_after.minimum_points_per_rental>1000000
     or v_after.silver_threshold<0 or v_after.gold_threshold<v_after.silver_threshold or v_after.platinum_threshold<v_after.gold_threshold
     or v_after.point_value_try<0 or v_after.point_value_try>1000
     or v_after.minimum_redeem_points<0 or v_after.minimum_redeem_points>100000000
     or v_after.max_redeem_percent<0 or v_after.max_redeem_percent>100
     or v_after.referral_rental_invitee_discount<0 or v_after.referral_sale_invitee_discount<0 or v_after.referral_tour_invitee_discount<0
     or v_after.tour_points_per_100_try<0 or v_after.tour_points_per_100_try>100000
     or v_after.sale_points_per_1000_try<0 or v_after.sale_points_per_1000_try>100000 then
    raise exception using errcode='23514',message='LOYALTY_SETTINGS_OUT_OF_RANGE';
  end if;

  select email into v_actor_email from auth.users where id=p_actor;
  insert into public.audit_logs(actor_user_id,actor_email,action,entity_type,entity_id,before_data,after_data,event_meta)
  values(p_actor,v_actor_email,'LOYALTY_SETTINGS_UPDATED_V173','loyalty_program_settings','global',
    to_jsonb(v_before)-'updated_by',to_jsonb(v_after)-'updated_by',jsonb_build_object('gateway','customer-admin-v173'));

  return jsonb_build_object('ok',true,'settings',to_jsonb(v_after)-'id'-'updated_by');
end;
$$;
revoke all on function public.service_save_loyalty_settings_v173(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.service_save_loyalty_settings_v173(uuid,jsonb) to service_role;

comment on function public.service_customer_admin_list_v173(uuid,integer) is 'V173 service-role-only customer CRM list and loyalty settings snapshot.';
comment on function public.service_customer_admin_detail_v173(uuid,uuid) is 'V173 service-role-only customer detail snapshot with safe payment metadata and no storage path exposure.';
comment on function public.service_save_loyalty_settings_v173(uuid,jsonb) is 'V173 service-role-only full loyalty and referral engine configuration update with audit trail.';
