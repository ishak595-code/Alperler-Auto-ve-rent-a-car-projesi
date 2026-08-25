-- V171.7 Central branch operator identity verification
-- Only central settings/team authority may change the verified business identity shown to customers.

update public.branches b
set province_code=coalesce(b.province_code,r.province_code),
    district_code=coalesce(b.district_code,r.district_code),
    operator_display_name=coalesce(nullif(btrim(b.operator_display_name),''),nullif(btrim(r.current_business),''),nullif(btrim(b.name),'')),
    operator_legal_name=coalesce(nullif(btrim(b.operator_legal_name),''),nullif(btrim(r.current_business),''),nullif(btrim(b.name),''))
from public.branch_partner_requests r
where b.partner_request_id=r.id
  and (b.province_code is null or b.district_code is null or coalesce(btrim(b.operator_display_name),'')='' or coalesce(btrim(b.operator_legal_name),'')='');

create or replace function public.admin_set_branch_operator_verification_v1717(
  p_branch_id uuid,
  p_display_name text,
  p_legal_name text,
  p_verified boolean,
  p_relationship text default 'INDEPENDENT_PARTNER'
)
returns jsonb
language plpgsql
security definer
set search_path=public,private,auth,pg_catalog
as $$
declare
  v_actor uuid:=auth.uid();
  v_display text:=nullif(btrim(coalesce(p_display_name,'')),'');
  v_legal text:=nullif(btrim(coalesce(p_legal_name,'')),'');
  v_relationship text:=upper(btrim(coalesce(p_relationship,'INDEPENDENT_PARTNER')));
  b public.branches%rowtype;
begin
  if v_actor is null or not (private.can_manage_settings() or private.can_manage_team()) then
    raise exception using errcode='42501',message='BRANCH_IDENTITY_ADMIN_REQUIRED';
  end if;
  if v_display is null or v_legal is null then
    raise exception using errcode='22023',message='BRANCH_OPERATOR_NAMES_REQUIRED';
  end if;
  if v_relationship not in ('OWNED','INDEPENDENT_PARTNER','LICENSED_PARTNER') then
    raise exception using errcode='22023',message='INVALID_OPERATOR_RELATIONSHIP';
  end if;

  update public.branches
  set operator_display_name=left(v_display,180),
      operator_legal_name=left(v_legal,240),
      operator_relationship=v_relationship,
      operator_identity_verified_at=case when p_verified then now() else null end,
      operator_identity_verified_by=case when p_verified then v_actor else null end,
      updated_at=now()
  where id=p_branch_id
  returning * into b;
  if not found then raise exception using errcode='P0002',message='BRANCH_NOT_FOUND'; end if;

  return jsonb_build_object(
    'ok',true,'branchId',b.id,'displayName',b.operator_display_name,'legalName',b.operator_legal_name,
    'relationship',b.operator_relationship,'verified',b.operator_identity_verified_at is not null,
    'verifiedAt',b.operator_identity_verified_at,'verifiedBy',b.operator_identity_verified_by
  );
end;
$$;
revoke all on function public.admin_set_branch_operator_verification_v1717(uuid,text,text,boolean,text) from public,anon;
grant execute on function public.admin_set_branch_operator_verification_v1717(uuid,text,text,boolean,text) to authenticated;

comment on function public.admin_set_branch_operator_verification_v1717(uuid,text,text,boolean,text) is
'V171.7 central-only operator identity verification. Branch members cannot self-verify or rename the verified operator identity.';
