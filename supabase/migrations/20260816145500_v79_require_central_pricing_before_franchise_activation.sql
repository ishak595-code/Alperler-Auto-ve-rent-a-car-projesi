create or replace function public.enforce_branch_activation()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  missing_count integer;
  required_policies integer;
  accepted_policies integer;
  pricing_rule_count integer;
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

    select count(*)::integer into pricing_rule_count
    from public.branch_pricing_rules p
    where p.is_active=true
      and (p.branch_id is null or p.branch_id=new.id)
      and (p.min_price is not null or p.max_price is not null or p.recommended_price is not null);

    if coalesce(pricing_rule_count,0)=0 then
      raise exception 'BRANCH_SETUP_INCOMPLETE';
    end if;
  end if;
  return new;
end;
$function$;
