drop policy if exists admin_users_self_read on public.admin_users;
create policy admin_users_self_read on public.admin_users
for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists branch_memberships_self_read on public.branch_memberships;
create policy branch_memberships_self_read on public.branch_memberships
for select to authenticated
using ((user_id = (select auth.uid())) or private.can_manage_team());

drop policy if exists branch_policy_acceptances_branch_insert on public.branch_policy_acceptances;
create policy branch_policy_acceptances_branch_insert on public.branch_policy_acceptances
for insert to authenticated
with check (can_manage_branch(branch_id) and (accepted_by is null or accepted_by = (select auth.uid())));

create index if not exists finance_transactions_campaign_id_idx on public.finance_transactions(campaign_id);
create index if not exists finance_transactions_created_by_idx on public.finance_transactions(created_by);
create index if not exists finance_transactions_tour_id_idx on public.finance_transactions(tour_id);
create index if not exists marketing_audit_events_actor_user_id_idx on public.marketing_audit_events(actor_user_id);
create index if not exists marketing_campaigns_created_by_idx on public.marketing_campaigns(created_by);
create index if not exists marketing_integrations_connected_by_idx on public.marketing_integrations(connected_by);
create index if not exists payment_settings_updated_by_idx on public.payment_settings(updated_by);
create index if not exists vehicle_inspections_completed_by_idx on public.vehicle_inspections(completed_by);
create index if not exists vehicle_operations_updated_by_idx on public.vehicle_operations(updated_by);
create index if not exists vehicle_remote_commands_device_id_idx on public.vehicle_remote_commands(device_id);
create index if not exists vehicle_remote_commands_requested_by_idx on public.vehicle_remote_commands(requested_by);
create index if not exists vehicle_telematics_devices_updated_by_idx on public.vehicle_telematics_devices(updated_by);
create index if not exists vehicle_telematics_events_device_id_idx on public.vehicle_telematics_events(device_id);
