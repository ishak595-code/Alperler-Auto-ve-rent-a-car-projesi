create table if not exists private.analytics_event_receipts (
  event_id uuid primary key,
  session_id uuid not null,
  received_at timestamptz not null default now()
);
create index if not exists analytics_event_receipts_received_idx on private.analytics_event_receipts(received_at);
revoke all on private.analytics_event_receipts from public, anon, authenticated;

create or replace function public.ingest_analytics_batch(
  p_session_id uuid,
  p_visitor_id uuid,
  p_network_hash text,
  p_ip_address inet,
  p_geo jsonb,
  p_headers jsonb,
  p_context jsonb,
  p_events jsonb
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_item jsonb;
  v_count integer := 0;
  v_inserted integer := 0;
  v_event_id uuid;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'forbidden';
  end if;
  if jsonb_typeof(p_events) <> 'array' or jsonb_array_length(p_events) < 1 or jsonb_array_length(p_events) > 25 then
    raise exception 'invalid event batch';
  end if;

  for v_item in select value from jsonb_array_elements(p_events)
  loop
    begin
      v_event_id := (v_item->>'id')::uuid;
    exception when others then
      raise exception 'invalid analytics event id';
    end;

    insert into private.analytics_event_receipts(event_id,session_id)
    values(v_event_id,p_session_id)
    on conflict(event_id) do nothing;
    get diagnostics v_inserted = row_count;

    if v_inserted = 1 then
      perform public.ingest_analytics_event(
        p_session_id,
        p_visitor_id,
        p_network_hash,
        p_ip_address,
        p_geo,
        p_headers,
        coalesce(v_item->>'type',''),
        coalesce(v_item->>'path','/'),
        nullif(v_item->>'pageTitle',''),
        p_context,
        coalesce(v_item->'event','{}'::jsonb)
      );
      v_count := v_count + 1;
    end if;
  end loop;
  return v_count;
end;
$$;
revoke all on function public.ingest_analytics_batch(uuid,uuid,text,inet,jsonb,jsonb,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.ingest_analytics_batch(uuid,uuid,text,inet,jsonb,jsonb,jsonb,jsonb) to service_role;

create or replace function private.purge_visitor_analytics_internal(p_event_days integer default 180, p_raw_ip_days integer default 30)
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
  if not private.can_manage_analytics() then raise exception 'forbidden'; end if;
  update public.visitor_security_context
     set ip_address = null
   where ip_address is not null and last_seen_at < now() - make_interval(days => greatest(1,least(p_raw_ip_days,365)));
  get diagnostics v_ips = row_count;
  delete from private.analytics_event_receipts
   where received_at < now() - interval '7 days';
  get diagnostics v_receipts = row_count;
  delete from public.visitor_sessions
   where last_seen_at < now() - make_interval(days => greatest(7,least(p_event_days,730)));
  get diagnostics v_sessions = row_count;
  return jsonb_build_object('anonymizedIpRows',v_ips,'deletedSessions',v_sessions,'deletedEventsCascade',0,'deletedIdempotencyReceipts',v_receipts);
end;
$$;
