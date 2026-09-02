create or replace function private.is_super_admin_v237()
returns boolean
language sql
stable
security definer
set search_path = 'pg_catalog','public'
as $$
  select exists(
    select 1
    from public.admin_users au
    where au.user_id = auth.uid()
      and au.is_active = true
      and au.role = 'owner'
  );
$$;

revoke all on function private.is_super_admin_v237() from public, anon;
grant execute on function private.is_super_admin_v237() to authenticated;

create or replace function private.can_mutate_branch_subscription_v237(
  p_plan_id uuid,
  p_is_complimentary boolean,
  p_price_override numeric,
  p_status text
)
returns boolean
language sql
stable
security definer
set search_path = 'pg_catalog','public','private'
as $$
  select private.can_manage_finance()
    and (
      private.is_super_admin_v237()
      or (
        coalesce(p_is_complimentary,false) = false
        and upper(coalesce(p_status,'')) <> 'EXEMPT'
        and (p_price_override is null or p_price_override > 0)
        and exists(
          select 1
          from public.branch_subscription_plans p
          where p.id = p_plan_id
            and coalesce(p.entitlements->>'adminGrantOnly','false') <> 'true'
            and p.monthly_fee > 0
        )
      )
    );
$$;

revoke all on function private.can_mutate_branch_subscription_v237(uuid,boolean,numeric,text) from public, anon;
grant execute on function private.can_mutate_branch_subscription_v237(uuid,boolean,numeric,text) to authenticated;

drop policy if exists branch_subscriptions_finance_insert on public.branch_subscriptions;
create policy branch_subscriptions_finance_insert on public.branch_subscriptions
for insert to authenticated
with check (
  private.can_mutate_branch_subscription_v237(plan_id,is_complimentary,price_override,status)
);

drop policy if exists branch_subscriptions_finance_update on public.branch_subscriptions;
create policy branch_subscriptions_finance_update on public.branch_subscriptions
for update to authenticated
using (
  private.can_mutate_branch_subscription_v237(plan_id,is_complimentary,price_override,status)
)
with check (
  private.can_mutate_branch_subscription_v237(plan_id,is_complimentary,price_override,status)
);

drop policy if exists branch_subscriptions_finance_delete on public.branch_subscriptions;
create policy branch_subscriptions_finance_delete on public.branch_subscriptions
for delete to authenticated
using (
  private.can_mutate_branch_subscription_v237(plan_id,is_complimentary,price_override,status)
);

drop policy if exists branch_subscription_plans_finance_insert on public.branch_subscription_plans;
create policy branch_subscription_plans_finance_insert on public.branch_subscription_plans
for insert to authenticated
with check (
  private.can_manage_finance()
  and (
    private.is_super_admin_v237()
    or (
      coalesce(entitlements->>'adminGrantOnly','false') <> 'true'
      and monthly_fee > 0
    )
  )
);

drop policy if exists branch_subscription_plans_finance_update on public.branch_subscription_plans;
create policy branch_subscription_plans_finance_update on public.branch_subscription_plans
for update to authenticated
using (
  private.can_manage_finance()
  and (
    private.is_super_admin_v237()
    or (
      coalesce(entitlements->>'adminGrantOnly','false') <> 'true'
      and monthly_fee > 0
    )
  )
)
with check (
  private.can_manage_finance()
  and (
    private.is_super_admin_v237()
    or (
      coalesce(entitlements->>'adminGrantOnly','false') <> 'true'
      and monthly_fee > 0
    )
  )
);

drop policy if exists branch_subscription_plans_finance_delete on public.branch_subscription_plans;
create policy branch_subscription_plans_finance_delete on public.branch_subscription_plans
for delete to authenticated
using (
  private.can_manage_finance()
  and (
    private.is_super_admin_v237()
    or (
      coalesce(entitlements->>'adminGrantOnly','false') <> 'true'
      and monthly_fee > 0
    )
  )
);

comment on function private.is_super_admin_v237() is 'V237 owner-role check. Only the owner/Super Admin may grant or mutate discretionary free branch access.';
comment on function private.can_mutate_branch_subscription_v237(uuid,boolean,numeric,text) is 'Allows finance admins to manage paid subscriptions while reserving adminGrantOnly, complimentary, zero-price and EXEMPT access for the owner/Super Admin.';
