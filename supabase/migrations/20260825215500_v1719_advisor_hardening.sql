-- V171.9 Advisor hardening
-- Removes unintended trigger/helper RPC exposure, covers V171 foreign keys,
-- drops a duplicate vehicle index, and removes redundant SELECT work from subscription RLS.

-- Trigger-only bootstrap must not be callable through PostgREST RPC.
revoke all on function public.bootstrap_branch_subscription_v1712() from public, anon, authenticated;

-- Strict lifecycle helper is an internal primitive used by the audited lifecycle RPC.
-- It does not need to be directly exposed to signed-in clients.
revoke all on function public.branch_has_operational_subscription_v1718(uuid) from public, anon, authenticated;
grant execute on function public.branch_has_operational_subscription_v1718(uuid) to service_role;

-- Cover V171 foreign keys reported by the production performance advisor.
create index if not exists vehicle_registry_updated_by_v1719_idx
  on private.vehicle_registry(updated_by)
  where updated_by is not null;

create index if not exists branch_subscription_payments_invoice_id_v1719_idx
  on public.branch_subscription_payments(invoice_id);

create index if not exists branches_operator_identity_verified_by_v1719_idx
  on public.branches(operator_identity_verified_by)
  where operator_identity_verified_by is not null;

create index if not exists branches_status_changed_by_v1719_idx
  on public.branches(status_changed_by)
  where status_changed_by is not null;

create index if not exists tours_reviewed_by_v1719_idx
  on public.tours(reviewed_by)
  where reviewed_by is not null;

create index if not exists vehicles_reviewed_by_v1719_idx
  on public.vehicles(reviewed_by)
  where reviewed_by is not null;

-- V171.8 added a created_at index that duplicates the pre-existing canonical index.
drop index if exists public.vehicles_created_at_v1718_idx;

-- Finance SELECT access already exists in each read policy. Replace FOR ALL writer
-- policies with action-specific write policies so SELECT evaluates only one permissive policy.
drop policy if exists branch_subscription_plans_finance_write on public.branch_subscription_plans;
create policy branch_subscription_plans_finance_insert on public.branch_subscription_plans
for insert to authenticated with check (private.can_manage_finance());
create policy branch_subscription_plans_finance_update on public.branch_subscription_plans
for update to authenticated using (private.can_manage_finance()) with check (private.can_manage_finance());
create policy branch_subscription_plans_finance_delete on public.branch_subscription_plans
for delete to authenticated using (private.can_manage_finance());

drop policy if exists branch_subscriptions_finance_write on public.branch_subscriptions;
create policy branch_subscriptions_finance_insert on public.branch_subscriptions
for insert to authenticated with check (private.can_manage_finance());
create policy branch_subscriptions_finance_update on public.branch_subscriptions
for update to authenticated using (private.can_manage_finance()) with check (private.can_manage_finance());
create policy branch_subscriptions_finance_delete on public.branch_subscriptions
for delete to authenticated using (private.can_manage_finance());

drop policy if exists branch_subscription_invoices_finance_write on public.branch_subscription_invoices;
create policy branch_subscription_invoices_finance_insert on public.branch_subscription_invoices
for insert to authenticated with check (private.can_manage_finance());
create policy branch_subscription_invoices_finance_update on public.branch_subscription_invoices
for update to authenticated using (private.can_manage_finance()) with check (private.can_manage_finance());
create policy branch_subscription_invoices_finance_delete on public.branch_subscription_invoices
for delete to authenticated using (private.can_manage_finance());

drop policy if exists branch_subscription_payments_finance_write on public.branch_subscription_payments;
create policy branch_subscription_payments_finance_insert on public.branch_subscription_payments
for insert to authenticated with check (private.can_manage_finance());
create policy branch_subscription_payments_finance_update on public.branch_subscription_payments
for update to authenticated using (private.can_manage_finance()) with check (private.can_manage_finance());
create policy branch_subscription_payments_finance_delete on public.branch_subscription_payments
for delete to authenticated using (private.can_manage_finance());

comment on function public.bootstrap_branch_subscription_v1712() is
'V171.9 trigger-only subscription bootstrap. Direct public/authenticated RPC execution revoked.';
comment on function public.branch_has_operational_subscription_v1718(uuid) is
'V171.9 internal strict activation entitlement helper. Direct client execution revoked; lifecycle RPC remains authoritative.';