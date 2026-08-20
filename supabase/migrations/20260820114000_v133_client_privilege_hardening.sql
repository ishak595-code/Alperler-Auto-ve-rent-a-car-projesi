-- V133: browser roles do not need low-level table capabilities such as
-- TRUNCATE, REFERENCES or TRIGGER. Sensitive finance/telematics/marketing
-- records are server-function managed and therefore receive no direct browser
-- table grants at all.

do $$
declare r record;
begin
  for r in
    select schemaname, tablename
    from pg_tables
    where schemaname = 'public'
  loop
    execute format(
      'revoke truncate, references, trigger on table %I.%I from anon, authenticated',
      r.schemaname,
      r.tablename
    );
  end loop;
end $$;

revoke all on table public.finance_transactions from anon, authenticated;
revoke all on table public.vehicle_telematics_devices from anon, authenticated;
revoke all on table public.vehicle_telematics_events from anon, authenticated;
revoke all on table public.vehicle_remote_commands from anon, authenticated;
revoke all on table public.marketing_integrations from anon, authenticated;
revoke all on table public.marketing_campaigns from anon, authenticated;
revoke all on table public.marketing_audit_events from anon, authenticated;

grant all on table public.finance_transactions to service_role;
grant all on table public.vehicle_telematics_devices to service_role;
grant all on table public.vehicle_telematics_events to service_role;
grant all on table public.vehicle_remote_commands to service_role;
grant all on table public.marketing_integrations to service_role;
grant all on table public.marketing_campaigns to service_role;
grant all on table public.marketing_audit_events to service_role;
