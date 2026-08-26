begin;

-- V181: move privileged branch moderation and operator identity administration
-- behind the trusted Edge/service boundary. Actor authorization is explicit and
-- re-checked inside PostgreSQL. Browser roles cannot execute these RPCs.

create or replace function public.service_branch_moderation_snapshot_v181(
  p_actor uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, auth, pg_catalog
as $$
declare
  v_vehicles jsonb;
  v_tours jsonb;
begin
  if p_actor is null or not private.can_actor_manage_content_v174(p_actor) then
    raise exception using errcode='42501', message='CONTENT_PERMISSION_REQUIRED';
  end if;

  select coalesce(jsonb_agg(q.payload order by q.sort_at asc nulls last), '[]'::jsonb)
  into v_vehicles
  from (
    select
      coalesce(v.submitted_for_review_at, v.updated_at) as sort_at,
      jsonb_build_object(
        'id', v.id,
        'brand', v.brand,
        'model', v.model,
        'category', v.category,
        'rental_price_daily', v.rental_price_daily,
        'price', v.price,
        'currency', v.currency,
        'branch_id', v.branch_id,
        'stock_code', v.stock_code,
        'model_year', v.model_year,
        'fuel_type', v.fuel_type,
        'transmission', v.transmission,
        'body_type', v.body_type,
        'submitted_for_review_at', v.submitted_for_review_at,
        'updated_at', v.updated_at,
        'review_note', v.review_note,
        'cover_image', v.cover_image,
        'images', coalesce(v.images, '[]'::jsonb),
        'branch', jsonb_build_object(
          'id', b.id,
          'name', b.name,
          'operator_display_name', b.operator_display_name,
          'city', b.city,
          'district', b.district
        )
      ) as payload
    from public.vehicles v
    join public.branches b on b.id=v.branch_id
    where v.listing_origin='BRANCH'
      and v.publication_status='PENDING_REVIEW'
  ) q;

  select coalesce(jsonb_agg(q.payload order by q.sort_at asc nulls last), '[]'::jsonb)
  into v_tours
  from (
    select
      coalesce(t.submitted_for_review_at, t.updated_at) as sort_at,
      jsonb_build_object(
        'id', t.id,
        'title', t.title,
        'category', t.category,
        'price_per_person', t.price_per_person,
        'currency', t.currency,
        'branch_id', t.branch_id,
        'duration', t.duration,
        'meeting_point', t.meeting_point,
        'capacity', t.capacity,
        'itinerary', coalesce(t.itinerary, '[]'::jsonb),
        'submitted_for_review_at', t.submitted_for_review_at,
        'updated_at', t.updated_at,
        'review_note', t.review_note,
        'cover_image', t.cover_image,
        'images', coalesce(t.images, '[]'::jsonb),
        'branch', jsonb_build_object(
          'id', b.id,
          'name', b.name,
          'operator_display_name', b.operator_display_name,
          'city', b.city,
          'district', b.district
        )
      ) as payload
    from public.tours t
    join public.branches b on b.id=t.branch_id
    where t.listing_origin='BRANCH'
      and t.publication_status='PENDING_REVIEW'
  ) q;

  return jsonb_build_object('vehicles',v_vehicles,'tours',v_tours);
end;
$$;

create or replace function public.service_review_branch_listing_v181(
  p_actor uuid,
  p_kind text,
  p_id uuid,
  p_action text,
  p_note text default null,
  p_request_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, auth, pg_catalog
as $$
declare
  v_kind text:=upper(btrim(coalesce(p_kind,'')));
  v_status text;
  v_before jsonb;
  v_after jsonb;
  v_actor_email text;
begin
  if p_actor is null or not private.can_actor_manage_content_v174(p_actor) then
    raise exception using errcode='42501', message='CONTENT_PERMISSION_REQUIRED';
  end if;

  v_status:=case upper(btrim(coalesce(p_action,'')))
    when 'APPROVE' then 'PUBLISHED'
    when 'REJECT' then 'REJECTED'
    when 'SUSPEND' then 'SUSPENDED'
    else null end;
  if v_status is null then
    raise exception using errcode='22023',message='INVALID_REVIEW_ACTION';
  end if;
  if v_status='REJECTED' and nullif(btrim(coalesce(p_note,'')),'') is null then
    raise exception using errcode='22023',message='REVIEW_NOTE_REQUIRED';
  end if;

  if v_kind='VEHICLE' then
    select jsonb_build_object('publication_status',v.publication_status,'review_note',v.review_note)
      into v_before
    from public.vehicles v
    where v.id=p_id and v.listing_origin='BRANCH'
    for update;
    if v_before is null then raise exception using errcode='P0002',message='BRANCH_VEHICLE_NOT_FOUND'; end if;

    update public.vehicles
      set publication_status=v_status,
          published_at=case when v_status='PUBLISHED' then now() else published_at end,
          reviewed_at=now(),
          reviewed_by=p_actor,
          review_note=left(nullif(btrim(coalesce(p_note,'')),''),2000),
          updated_at=now()
      where id=p_id and listing_origin='BRANCH';
  elsif v_kind='TOUR' then
    select jsonb_build_object('publication_status',t.publication_status,'review_note',t.review_note)
      into v_before
    from public.tours t
    where t.id=p_id and t.listing_origin='BRANCH'
    for update;
    if v_before is null then raise exception using errcode='P0002',message='BRANCH_TOUR_NOT_FOUND'; end if;

    update public.tours
      set publication_status=v_status,
          published_at=case when v_status='PUBLISHED' then now() else published_at end,
          reviewed_at=now(),
          reviewed_by=p_actor,
          review_note=left(nullif(btrim(coalesce(p_note,'')),''),2000),
          updated_at=now()
      where id=p_id and listing_origin='BRANCH';
  else
    raise exception using errcode='22023',message='INVALID_LISTING_KIND';
  end if;

  v_after:=jsonb_build_object('publication_status',v_status,'review_note',left(nullif(btrim(coalesce(p_note,'')),''),2000));
  select lower(coalesce(au.email,u.email)) into v_actor_email
  from public.admin_users au left join auth.users u on u.id=au.user_id
  where au.user_id=p_actor limit 1;

  insert into public.audit_logs(
    actor_user_id,actor_email,action,entity_type,entity_id,before_data,after_data,request_id,event_meta
  ) values(
    p_actor,v_actor_email,'branch_listing_reviewed_v181',lower(v_kind),p_id::text,v_before,v_after,
    left(nullif(btrim(coalesce(p_request_id,'')),''),80),
    jsonb_build_object('gateway','branch-network-admin-v181','reviewAction',upper(btrim(coalesce(p_action,''))))
  );

  return jsonb_build_object('ok',true,'kind',v_kind,'id',p_id,'status',v_status,'reviewedBy',p_actor,'reviewedAt',now());
end;
$$;

create or replace function public.service_branch_identity_snapshot_v181(
  p_actor uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_catalog
as $$
declare
  v_rows jsonb;
begin
  if p_actor is null or not (
    private.can_actor_manage_settings_v174(p_actor)
    or private.can_actor_manage_team_v178(p_actor)
  ) then
    raise exception using errcode='42501', message='BRANCH_IDENTITY_ADMIN_REQUIRED';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',b.id,
    'name',b.name,
    'code',b.code,
    'city',b.city,
    'district',b.district,
    'network_type',b.network_type,
    'public_status',b.public_status,
    'operator_display_name',b.operator_display_name,
    'operator_legal_name',b.operator_legal_name,
    'operator_relationship',b.operator_relationship,
    'operator_identity_verified_at',b.operator_identity_verified_at,
    'operator_identity_verified_by',b.operator_identity_verified_by,
    'partner_request_id',b.partner_request_id,
    'province_code',b.province_code,
    'district_code',b.district_code
  ) order by b.network_type,b.city,b.district,b.name), '[]'::jsonb)
  into v_rows
  from public.branches b;

  return v_rows;
end;
$$;

create or replace function public.service_set_branch_operator_verification_v181(
  p_actor uuid,
  p_branch_id uuid,
  p_display_name text,
  p_legal_name text,
  p_verified boolean,
  p_relationship text default 'INDEPENDENT_PARTNER',
  p_request_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, auth, pg_catalog
as $$
declare
  v_display text:=nullif(btrim(coalesce(p_display_name,'')),'');
  v_legal text:=nullif(btrim(coalesce(p_legal_name,'')),'');
  v_relationship text:=upper(btrim(coalesce(p_relationship,'INDEPENDENT_PARTNER')));
  v_before jsonb;
  v_after jsonb;
  v_actor_email text;
  b public.branches%rowtype;
begin
  if p_actor is null or not (
    private.can_actor_manage_settings_v174(p_actor)
    or private.can_actor_manage_team_v178(p_actor)
  ) then
    raise exception using errcode='42501',message='BRANCH_IDENTITY_ADMIN_REQUIRED';
  end if;
  if v_display is null or v_legal is null then
    raise exception using errcode='22023',message='BRANCH_OPERATOR_NAMES_REQUIRED';
  end if;
  if v_relationship not in ('OWNED','INDEPENDENT_PARTNER','LICENSED_PARTNER') then
    raise exception using errcode='22023',message='INVALID_OPERATOR_RELATIONSHIP';
  end if;

  select jsonb_build_object(
    'operator_display_name',operator_display_name,
    'operator_legal_name',operator_legal_name,
    'operator_relationship',operator_relationship,
    'operator_identity_verified_at',operator_identity_verified_at,
    'operator_identity_verified_by',operator_identity_verified_by
  ) into v_before
  from public.branches where id=p_branch_id for update;
  if v_before is null then raise exception using errcode='P0002',message='BRANCH_NOT_FOUND'; end if;

  update public.branches
  set operator_display_name=left(v_display,180),
      operator_legal_name=left(v_legal,240),
      operator_relationship=v_relationship,
      operator_identity_verified_at=case when p_verified then now() else null end,
      operator_identity_verified_by=case when p_verified then p_actor else null end,
      updated_at=now()
  where id=p_branch_id
  returning * into b;

  v_after:=jsonb_build_object(
    'operator_display_name',b.operator_display_name,
    'operator_legal_name',b.operator_legal_name,
    'operator_relationship',b.operator_relationship,
    'operator_identity_verified_at',b.operator_identity_verified_at,
    'operator_identity_verified_by',b.operator_identity_verified_by
  );
  select lower(coalesce(au.email,u.email)) into v_actor_email
  from public.admin_users au left join auth.users u on u.id=au.user_id
  where au.user_id=p_actor limit 1;

  insert into public.audit_logs(
    actor_user_id,actor_email,action,entity_type,entity_id,before_data,after_data,request_id,event_meta
  ) values(
    p_actor,v_actor_email,'branch_operator_identity_updated_v181','branch',p_branch_id::text,v_before,v_after,
    left(nullif(btrim(coalesce(p_request_id,'')),''),80),
    jsonb_build_object('gateway','branch-network-admin-v181','verified',p_verified)
  );

  return jsonb_build_object(
    'ok',true,'branchId',b.id,'displayName',b.operator_display_name,'legalName',b.operator_legal_name,
    'relationship',b.operator_relationship,'verified',b.operator_identity_verified_at is not null,
    'verifiedAt',b.operator_identity_verified_at,'verifiedBy',b.operator_identity_verified_by
  );
end;
$$;

revoke all on function public.service_branch_moderation_snapshot_v181(uuid) from public, anon, authenticated;
revoke all on function public.service_review_branch_listing_v181(uuid,text,uuid,text,text,text) from public, anon, authenticated;
revoke all on function public.service_branch_identity_snapshot_v181(uuid) from public, anon, authenticated;
revoke all on function public.service_set_branch_operator_verification_v181(uuid,uuid,text,text,boolean,text,text) from public, anon, authenticated;

grant execute on function public.service_branch_moderation_snapshot_v181(uuid) to service_role;
grant execute on function public.service_review_branch_listing_v181(uuid,text,uuid,text,text,text) to service_role;
grant execute on function public.service_branch_identity_snapshot_v181(uuid) to service_role;
grant execute on function public.service_set_branch_operator_verification_v181(uuid,uuid,text,text,boolean,text,text) to service_role;

commit;
