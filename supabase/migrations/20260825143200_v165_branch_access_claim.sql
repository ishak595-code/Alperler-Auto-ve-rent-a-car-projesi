-- V165 branch-owner identity and provisioning trust boundary.
-- Branch memberships are never granted to an unverified Auth identity.

create or replace function public.provision_branch_partner_request(
  p_reference text,
  p_actor uuid,
  p_branch_name text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_catalog
as $$
declare
  req public.branch_partner_requests%rowtype;
  b public.branches%rowtype;
  v_name text;
  v_code text;
  v_slug text;
  v_services jsonb := '[]'::jsonb;
begin
  if not private.can_actor_manage_operations(p_actor) then
    raise exception 'ADMIN_REQUIRED';
  end if;

  select * into req
  from public.branch_partner_requests
  where reference = p_reference
  for update;

  if not found then raise exception 'BRANCH_PARTNER_NOT_FOUND'; end if;
  if req.status <> 'APPROVED' then raise exception 'BRANCH_PARTNER_NOT_APPROVED'; end if;

  if req.provisioned_branch_id is not null then
    select * into b from public.branches where id = req.provisioned_branch_id;
    return jsonb_build_object('branchId',b.id,'code',b.code,'slug',b.slug,'name',b.name,'alreadyProvisioned',true);
  end if;

  v_name := coalesce(nullif(trim(p_branch_name), ''), 'Alperler Auto - ' || req.district);
  v_code := 'ALP-' || upper(substr(md5(req.reference), 1, 8));
  v_slug := trim(both '-' from lower(regexp_replace(
    translate(req.city || '-' || req.district || '-' || substr(md5(req.reference),1,6),
      'ÇĞİÖŞÜçğıöşü','CGIOSUcgiosu'),
    '[^a-zA-Z0-9]+','-','g'
  )));

  if req.services @> '["RENTAL"]'::jsonb then v_services := v_services || '["RENTAL","PICKUP","RETURN"]'::jsonb; end if;
  if req.services @> '["SALES"]'::jsonb then v_services := v_services || '["SALES"]'::jsonb; end if;
  if req.services @> '["TOUR_TRANSFER"]'::jsonb then v_services := v_services || '["TOUR","TRANSFER"]'::jsonb; end if;

  insert into public.branches(
    name,code,slug,branch_type,network_type,partner_request_id,district,city,country,
    phone,whatsapp,email,services,is_active,public_status,territory_label,
    customer_guarantee_enabled,central_pricing_required,listing_requires_approval,sort_order
  )
  values(
    v_name,v_code,v_slug,'BRANCH','FRANCHISE',req.id,req.district,req.city,'Türkiye',
    req.phone,req.phone,req.email,v_services,false,'DRAFT',
    coalesce(req.operating_area,req.city || ' / ' || req.district),
    true,true,true,500
  )
  returning * into b;

  insert into public.branch_setup_checklist(branch_id,checklist_key,label,is_required,sort_order)
  values
    (b.id,'AGREEMENT','Sözleşme ve ticari koşullar',true,10),
    (b.id,'IDENTITY','Yetkili kimlik ve işletme doğrulaması',true,20),
    (b.id,'ADDRESS','Şube adresi ve iletişim doğrulaması',true,30),
    (b.id,'BRAND_STANDARDS','Marka standartları kabulü',true,40),
    (b.id,'PRICING','Merkezi fiyat kuralları yapılandırması',true,50),
    (b.id,'SAFETY','Araç güvenliği ve belge kontrolü',true,60),
    (b.id,'CUSTOMER_GUARANTEE','Müşteri güvence standardı kabulü',true,70),
    (b.id,'PAYOUT','Ödeme ve mutabakat ayarları',true,80),
    (b.id,'FIRST_LISTING_AUDIT','İlk ilan kalite kontrolü',true,90)
  on conflict(branch_id,checklist_key) do nothing;

  update public.branch_partner_requests
  set provisioned_branch_id=b.id,
      provisioned_at=now(),
      provisioned_by=p_actor,
      updated_at=now()
  where id=req.id;

  return jsonb_build_object('branchId',b.id,'code',b.code,'slug',b.slug,'name',b.name,'alreadyProvisioned',false);
end;
$$;
revoke all on function public.provision_branch_partner_request(text,uuid,text) from public, anon, authenticated;
grant execute on function public.provision_branch_partner_request(text,uuid,text) to service_role;

create or replace function public.link_branch_owner_by_email(
  p_branch_id uuid,
  p_email text,
  p_partner_request_id uuid default null,
  p_actor uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, private, pg_catalog
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_user_id uuid;
  v_user_exists boolean := false;
  v_invite_id uuid;
  v_identity_state text;
begin
  if not private.can_actor_manage_operations(p_actor) then
    raise exception using errcode = '42501', message = 'ADMIN_REQUIRED';
  end if;
  if p_branch_id is null or v_email = '' or position('@' in v_email) < 2 then
    raise exception using errcode = '22023', message = 'INVALID_BRANCH_OWNER_EMAIL';
  end if;
  if not exists (select 1 from public.branches where id = p_branch_id) then
    raise exception using errcode = '23503', message = 'BRANCH_NOT_FOUND';
  end if;

  select exists(
    select 1 from auth.users u where lower(btrim(u.email::text)) = v_email
  ) into v_user_exists;

  select u.id
    into v_user_id
  from auth.users u
  where lower(btrim(u.email::text)) = v_email
    and u.email_confirmed_at is not null
  order by u.created_at asc
  limit 1;

  v_identity_state := case
    when v_user_id is not null then 'CONFIRMED'
    when v_user_exists then 'UNVERIFIED'
    else 'MISSING'
  end;

  insert into public.branch_access_invites(
    branch_id,partner_request_id,email,auth_user_id,role,status,invited_by,
    invited_at,linked_at,metadata
  )
  values(
    p_branch_id,p_partner_request_id,v_email,v_user_id,'BRANCH_OWNER',
    case when v_user_id is null then 'PENDING' else 'LINKED' end,
    p_actor,now(),case when v_user_id is null then null else now() end,
    jsonb_build_object('source','BRANCH_PARTNER_PROVISION','version','V165')
  )
  on conflict (branch_id,email)
  where status in ('PENDING','SENT','LINKED','ACCEPTED')
  do update set
    partner_request_id=coalesce(excluded.partner_request_id,public.branch_access_invites.partner_request_id),
    auth_user_id=case when excluded.auth_user_id is not null then excluded.auth_user_id else public.branch_access_invites.auth_user_id end,
    invited_by=coalesce(excluded.invited_by,public.branch_access_invites.invited_by),
    invited_at=coalesce(public.branch_access_invites.invited_at,now()),
    linked_at=case when excluded.auth_user_id is not null then coalesce(public.branch_access_invites.linked_at,now()) else public.branch_access_invites.linked_at end,
    status=case when excluded.auth_user_id is not null then 'LINKED' else public.branch_access_invites.status end,
    metadata=coalesce(public.branch_access_invites.metadata,'{}'::jsonb) || jsonb_build_object('identityState',v_identity_state,'version','V165'),
    updated_at=now()
  returning id into v_invite_id;

  if v_user_id is not null then
    insert into public.branch_memberships(branch_id,user_id,role,is_active,invited_email)
    values(p_branch_id,v_user_id,'BRANCH_OWNER',true,v_email)
    on conflict(branch_id,user_id) do update set
      role='BRANCH_OWNER',is_active=true,invited_email=v_email,updated_at=now();
  end if;

  return jsonb_build_object(
    'inviteId',v_invite_id,
    'branchId',p_branch_id,
    'email',v_email,
    'userId',v_user_id,
    'identityState',v_identity_state,
    'membershipLinked',v_user_id is not null
  );
end;
$$;
revoke all on function public.link_branch_owner_by_email(uuid,text,uuid,uuid) from public, anon, authenticated;
grant execute on function public.link_branch_owner_by_email(uuid,text,uuid,uuid) to service_role;

create or replace function public.claim_branch_access_by_identity(p_user_id uuid,p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_catalog
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_auth_email text;
  v_claimed integer := 0;
  v_memberships integer := 0;
begin
  if p_user_id is null or v_email = '' then
    raise exception using errcode = '22023', message = 'INVALID_BRANCH_IDENTITY';
  end if;

  select lower(btrim(u.email::text))
    into v_auth_email
  from auth.users u
  where u.id = p_user_id
    and u.email_confirmed_at is not null;

  if v_auth_email is null then
    raise exception using errcode = '42501', message = 'EMAIL_VERIFICATION_REQUIRED';
  end if;
  if v_auth_email <> v_email then
    raise exception using errcode = '42501', message = 'BRANCH_IDENTITY_EMAIL_MISMATCH';
  end if;

  insert into public.branch_memberships(branch_id,user_id,role,is_active,invited_email)
  select bai.branch_id,p_user_id,bai.role,true,v_email
  from public.branch_access_invites bai
  where bai.email = v_email
    and bai.status in ('PENDING','SENT','LINKED','ACCEPTED')
  on conflict(branch_id,user_id) do update set
    role=excluded.role,is_active=true,invited_email=excluded.invited_email,updated_at=now();

  update public.branch_access_invites
  set auth_user_id=p_user_id,
      status='ACCEPTED',
      linked_at=coalesce(linked_at,now()),
      accepted_at=coalesce(accepted_at,now()),
      last_error=null,
      metadata=coalesce(metadata,'{}'::jsonb) || jsonb_build_object('claimedByVerifiedIdentity',true,'version','V165'),
      updated_at=now()
  where email=v_email
    and status in ('PENDING','SENT','LINKED','ACCEPTED');

  get diagnostics v_claimed = row_count;

  select count(*)::integer into v_memberships
  from public.branch_memberships bm
  where bm.user_id=p_user_id
    and bm.is_active=true;

  return jsonb_build_object(
    'ok',true,
    'claimedInvites',v_claimed,
    'activeMemberships',v_memberships,
    'authorized',v_memberships > 0
  );
end;
$$;
revoke all on function public.claim_branch_access_by_identity(uuid,text) from public, anon, authenticated;
grant execute on function public.claim_branch_access_by_identity(uuid,text) to service_role;

comment on function public.link_branch_owner_by_email(uuid,text,uuid,uuid) is 'V165 service-only branch owner linker. Membership is created only for a confirmed Auth email.';
comment on function public.claim_branch_access_by_identity(uuid,text) is 'V165 service-only verified identity claim used by branch-access-v165.';
