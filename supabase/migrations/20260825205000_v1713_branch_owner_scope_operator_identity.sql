-- V171.3 Branch Owner Scope + Verified Operator Identity
-- Branch members may maintain operational profile fields, but cannot bypass central network,
-- publication, pricing, guarantee, geography or verified operator identity controls.

drop policy if exists branches_branch_member_update on public.branches;
create policy branches_branch_member_update on public.branches
for update to authenticated
using (can_manage_branch(id))
with check (can_manage_branch(id) and public.can_operate_branch_subscription(id));

create or replace function public.enforce_branch_member_scope_v1713()
returns trigger
language plpgsql
set search_path=public,private,pg_catalog
as $$
begin
  if private.can_manage_team() or private.can_manage_settings() then return new; end if;
  if not can_manage_branch(old.id) then return new; end if;

  if new.id is distinct from old.id
     or new.code is distinct from old.code
     or new.branch_type is distinct from old.branch_type
     or new.network_type is distinct from old.network_type
     or new.partner_request_id is distinct from old.partner_request_id
     or new.public_status is distinct from old.public_status
     or new.is_active is distinct from old.is_active
     or new.sort_order is distinct from old.sort_order
     or new.customer_guarantee_enabled is distinct from old.customer_guarantee_enabled
     or new.central_pricing_required is distinct from old.central_pricing_required
     or new.listing_requires_approval is distinct from old.listing_requires_approval
     or new.service_rules is distinct from old.service_rules
     or new.province_code is distinct from old.province_code
     or new.district_code is distinct from old.district_code
     or new.city is distinct from old.city
     or new.district is distinct from old.district
     or new.operator_display_name is distinct from old.operator_display_name
     or new.operator_legal_name is distinct from old.operator_legal_name
     or new.operator_relationship is distinct from old.operator_relationship
     or new.platform_disclaimer is distinct from old.platform_disclaimer
  then
    raise exception using errcode='42501',message='BRANCH_CENTRAL_FIELD_CHANGE_REQUIRES_ADMIN';
  end if;

  return new;
end;
$$;

drop trigger if exists branches_member_scope_v1713 on public.branches;
create trigger branches_member_scope_v1713
before update on public.branches
for each row execute function public.enforce_branch_member_scope_v1713();

create or replace function public.enforce_branch_operator_identity_v1713()
returns trigger
language plpgsql
set search_path=public,pg_catalog
as $$
begin
  if new.is_active is true and new.public_status='ACTIVE' then
    if coalesce(btrim(new.operator_display_name),'')='' then
      raise exception using errcode='23514',message='BRANCH_PUBLICATION_BLOCKED:OPERATOR_IDENTITY_REQUIRED';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists branches_operator_identity_v1713 on public.branches;
create trigger branches_operator_identity_v1713
before insert or update of public_status,is_active,operator_display_name
on public.branches
for each row execute function public.enforce_branch_operator_identity_v1713();

comment on function public.enforce_branch_member_scope_v1713() is
'V171.3: branch owners can maintain operational profile fields but central governance, geography and verified operator identity require admin authority.';
