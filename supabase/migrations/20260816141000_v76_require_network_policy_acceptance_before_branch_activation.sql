-- V76 - A franchise cannot become public until all active required network policies are accepted.

create or replace function public.enforce_branch_activation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  missing_count integer;
  required_policies integer;
  accepted_policies integer;
begin
  if new.network_type <> 'OWNED' and new.public_status='ACTIVE' and (tg_op='INSERT' or old.public_status is distinct from 'ACTIVE' or old.is_active is distinct from true) then
    if nullif(trim(coalesce(new.address_line,'')),'') is null or nullif(trim(coalesce(new.phone,'')),'') is null then
      raise exception 'BRANCH_ADDRESS_PHONE_REQUIRED';
    end if;

    select count(*) into missing_count
    from public.branch_setup_checklist c
    where c.branch_id=new.id and c.is_required=true and c.completed_at is null;
    if missing_count > 0 then raise exception 'BRANCH_SETUP_INCOMPLETE'; end if;

    select
      count(*) filter (where r.is_required and r.is_active)::integer,
      count(*) filter (where r.is_required and r.is_active and a.id is not null)::integer
    into required_policies,accepted_policies
    from public.network_policy_rules r
    left join public.branch_policy_acceptances a
      on a.policy_rule_id=r.id and a.branch_id=new.id;

    if coalesce(accepted_policies,0) < coalesce(required_policies,0) then
      raise exception 'BRANCH_REQUIRED_POLICIES_NOT_ACCEPTED';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists branches_activation_guard_trg on public.branches;
create trigger branches_activation_guard_trg
before insert or update on public.branches
for each row execute function public.enforce_branch_activation();
