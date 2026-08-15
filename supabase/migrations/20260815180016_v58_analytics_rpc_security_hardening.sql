alter function public.analytics_overview(integer) security invoker;
alter function public.analytics_live_sessions(integer) security invoker;
alter function public.analytics_top_pages(integer,integer) security invoker;
alter function public.analytics_interactions(integer,integer) security invoker;
alter function public.analytics_funnels(integer) security invoker;
alter function public.analytics_device_breakdown(integer) security invoker;
alter function public.analytics_session_timeline(uuid,integer) security invoker;

create or replace function private.purge_visitor_analytics_internal(p_event_days integer default 180, p_raw_ip_days integer default 30)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_sessions bigint;
  v_ips bigint;
begin
  if not private.can_manage_analytics() then raise exception 'forbidden'; end if;
  update public.visitor_security_context
     set ip_address = null
   where ip_address is not null and last_seen_at < now() - make_interval(days => greatest(1,least(p_raw_ip_days,365)));
  get diagnostics v_ips = row_count;
  delete from public.visitor_sessions
   where last_seen_at < now() - make_interval(days => greatest(7,least(p_event_days,730)));
  get diagnostics v_sessions = row_count;
  return jsonb_build_object('anonymizedIpRows',v_ips,'deletedSessions',v_sessions,'deletedEventsCascade',0);
end;
$$;
revoke all on function private.purge_visitor_analytics_internal(integer,integer) from public;
grant execute on function private.purge_visitor_analytics_internal(integer,integer) to authenticated;

create or replace function public.purge_visitor_analytics(p_event_days integer default 180, p_raw_ip_days integer default 30)
returns jsonb
language sql
security invoker
set search_path = pg_catalog, public
as $$
  select private.purge_visitor_analytics_internal(p_event_days,p_raw_ip_days);
$$;
revoke all on function public.purge_visitor_analytics(integer,integer) from public, anon;
grant execute on function public.purge_visitor_analytics(integer,integer) to authenticated;
