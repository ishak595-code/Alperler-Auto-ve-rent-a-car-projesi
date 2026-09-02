drop policy if exists branch_subscription_plans_anon_read_v207 on public.branch_subscription_plans;
create policy branch_subscription_plans_anon_read_v207 on public.branch_subscription_plans
for select to anon
using (
  is_active = true
  and coalesce(entitlements->>'adminGrantOnly','false') <> 'true'
);

drop policy if exists branch_subscription_plans_authenticated_read_v207 on public.branch_subscription_plans;
create policy branch_subscription_plans_authenticated_read_v207 on public.branch_subscription_plans
for select to authenticated
using (
  (
    is_active = true
    and coalesce(entitlements->>'adminGrantOnly','false') <> 'true'
  )
  or private.can_manage_finance()
);

comment on policy branch_subscription_plans_anon_read_v207 on public.branch_subscription_plans is 'Public package discovery excludes owner-only discretionary plans.';
comment on policy branch_subscription_plans_authenticated_read_v207 on public.branch_subscription_plans is 'Normal signed-in users see only public plans; finance admins retain management visibility for discretionary plans.';
