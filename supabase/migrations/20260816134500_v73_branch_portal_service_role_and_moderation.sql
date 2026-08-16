-- V73 - Service-role safe central moderation and branch portal protections.

create or replace function public.enforce_branch_vehicle_governance()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_price numeric;
  v_class text;
  v_is_central boolean;
  v_branch_active boolean;
begin
  if new.branch_id is null or new.listing_origin <> 'BRANCH' then return new; end if;
  v_is_central := (auth.role() = 'service_role') or private.is_admin();
  select (is_active and public_status='ACTIVE') into v_branch_active from public.branches where id=new.branch_id;
  if coalesce(v_branch_active,false)=false and not v_is_central then raise exception 'BRANCH_NOT_ACTIVE'; end if;
  if not v_is_central and not public.can_manage_branch(new.branch_id) then raise exception 'BRANCH_ACCESS_DENIED'; end if;
  v_price := case when new.category='RENTAL' then coalesce(new.rental_price_daily,new.price) else new.price end;
  v_class := coalesce(new.body_type,'*');
  if not public.branch_listing_price_ok(new.branch_id,new.category,v_class,new.currency,v_price) then raise exception 'BRANCH_PRICE_OUTSIDE_CENTRAL_RULE'; end if;
  if not v_is_central then
    new.submitted_by := auth.uid();
    new.approved_by := null;
    new.approved_at := null;
    new.rejection_reason := null;
    new.published_at := null;
    new.scheduled_at := null;
    new.publication_status := case when new.publication_status='DRAFT' then 'DRAFT' else 'PENDING_REVIEW' end;
    new.is_featured := false;
  end if;
  return new;
end;
$$;

create or replace function public.enforce_branch_tour_governance()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_is_central boolean;
  v_branch_active boolean;
begin
  if new.branch_id is null or new.listing_origin <> 'BRANCH' then return new; end if;
  v_is_central := (auth.role() = 'service_role') or private.is_admin();
  select (is_active and public_status='ACTIVE') into v_branch_active from public.branches where id=new.branch_id;
  if coalesce(v_branch_active,false)=false and not v_is_central then raise exception 'BRANCH_NOT_ACTIVE'; end if;
  if not v_is_central and not public.can_manage_branch(new.branch_id) then raise exception 'BRANCH_ACCESS_DENIED'; end if;
  if not public.branch_listing_price_ok(new.branch_id,'TOUR','*',new.currency,new.price_per_person) then raise exception 'BRANCH_PRICE_OUTSIDE_CENTRAL_RULE'; end if;
  if not v_is_central then
    new.submitted_by := auth.uid();
    new.approved_by := null;
    new.approved_at := null;
    new.rejection_reason := null;
    new.published_at := null;
    new.scheduled_at := null;
    new.publication_status := case when new.publication_status='DRAFT' then 'DRAFT' else 'PENDING_REVIEW' end;
    new.is_featured := false;
  end if;
  return new;
end;
$$;

create or replace function public.branch_required_policy_count(p_branch_id uuid)
returns table(required_count integer, accepted_count integer)
language sql
stable
security definer
set search_path = public
as $$
  select
    count(*) filter (where r.is_required and r.is_active)::integer as required_count,
    count(*) filter (where r.is_required and r.is_active and a.id is not null)::integer as accepted_count
  from public.network_policy_rules r
  left join public.branch_policy_acceptances a
    on a.policy_rule_id=r.id and a.branch_id=p_branch_id;
$$;
revoke all on function public.branch_required_policy_count(uuid) from public;
grant execute on function public.branch_required_policy_count(uuid) to authenticated;

create or replace function public.protect_branch_governance_fields()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_central boolean;
begin
  v_central := (auth.role()='service_role') or private.can_manage_team();
  if v_central then return new; end if;
  if public.can_manage_branch(old.id) then
    new.network_type := old.network_type;
    new.public_status := old.public_status;
    new.is_active := old.is_active;
    new.partner_request_id := old.partner_request_id;
    new.customer_guarantee_enabled := old.customer_guarantee_enabled;
    new.central_pricing_required := old.central_pricing_required;
    new.listing_requires_approval := old.listing_requires_approval;
    new.brand_profile := old.brand_profile;
    new.service_rules := old.service_rules;
  end if;
  return new;
end;
$$;

drop trigger if exists branches_governance_protection_trg on public.branches;
create trigger branches_governance_protection_trg
before update on public.branches
for each row execute function public.protect_branch_governance_fields();

drop policy if exists branches_branch_member_update on public.branches;
create policy branches_branch_member_update on public.branches for update to authenticated
using (public.can_manage_branch(id))
with check (public.can_manage_branch(id));

create index if not exists bookings_branch_vehicle_idx on public.bookings(vehicle_id,fulfillment_branch_id,created_at desc);
