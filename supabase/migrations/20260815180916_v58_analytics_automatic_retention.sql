create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

create or replace function private.purge_visitor_analytics_maintenance(p_event_days integer default 180, p_raw_ip_days integer default 30)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_sessions bigint;
  v_ips bigint;
  v_receipts bigint;
begin
  update public.visitor_security_context
     set ip_address = null
   where ip_address is not null
     and last_seen_at < now() - make_interval(days => greatest(1, least(p_raw_ip_days,365)));
  get diagnostics v_ips = row_count;

  delete from private.analytics_event_receipts
   where received_at < now() - interval '7 days';
  get diagnostics v_receipts = row_count;

  delete from public.visitor_sessions
   where last_seen_at < now() - make_interval(days => greatest(7, least(p_event_days,730)));
  get diagnostics v_sessions = row_count;

  return jsonb_build_object(
    'anonymizedIpRows',v_ips,
    'deletedSessions',v_sessions,
    'deletedIdempotencyReceipts',v_receipts
  );
end;
$$;
revoke all on function private.purge_visitor_analytics_maintenance(integer,integer) from public, anon, authenticated;

select cron.schedule(
  'v58-analytics-retention',
  '17 3 * * *',
  $$select private.purge_visitor_analytics_maintenance(180,30);$$
);
