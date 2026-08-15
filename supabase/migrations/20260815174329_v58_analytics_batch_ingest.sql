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
set search_path = pg_catalog, public
as $$
declare
  v_item jsonb;
  v_count integer := 0;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'forbidden';
  end if;
  if jsonb_typeof(p_events) <> 'array' or jsonb_array_length(p_events) < 1 or jsonb_array_length(p_events) > 25 then
    raise exception 'invalid event batch';
  end if;
  for v_item in select value from jsonb_array_elements(p_events)
  loop
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
  end loop;
  return v_count;
end;
$$;
revoke all on function public.ingest_analytics_batch(uuid,uuid,text,inet,jsonb,jsonb,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.ingest_analytics_batch(uuid,uuid,text,inet,jsonb,jsonb,jsonb,jsonb) to service_role;

create or replace function public.link_visitor_identity(
  p_session_id uuid,
  p_entity_type text,
  p_entity_id uuid,
  p_reference text default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'forbidden'; end if;
  if p_entity_type not in ('BOOKING','CONTACT','PARTNER_REQUEST','SUBSCRIBER') then raise exception 'invalid entity type'; end if;
  if not exists(select 1 from public.visitor_sessions where id=p_session_id) then return; end if;
  insert into public.visitor_identity_links(session_id, entity_type, entity_id, reference)
  values(p_session_id,p_entity_type,p_entity_id,left(nullif(p_reference,''),120))
  on conflict(session_id,entity_type,entity_id) do update set reference=excluded.reference;
end;
$$;
revoke all on function public.link_visitor_identity(uuid,text,uuid,text) from public, anon, authenticated;
grant execute on function public.link_visitor_identity(uuid,text,uuid,text) to service_role;
