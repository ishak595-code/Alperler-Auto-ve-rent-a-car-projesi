-- V176.1 System Health Legacy Cutover
-- V176 frontend and gateway are production-live. Remove obsolete browser access.

revoke select, update on table public.system_events from authenticated;

drop policy if exists system_events_admin_read on public.system_events;
drop policy if exists system_events_admin_resolve on public.system_events;

-- Replaced by service_run_safe_repair_v176 through the authenticated Edge gateway.
drop function if exists public.admin_repair_system_defaults();

-- Service-role remains the sole privileged System Health data path.
grant all on table public.system_events to service_role;
