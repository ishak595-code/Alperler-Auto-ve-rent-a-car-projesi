create or replace function private.can_view_analytics()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.admin_users au
    where au.user_id = auth.uid()
      and au.is_active = true
      and (
        au.role in ('owner','admin')
        or coalesce(au.permissions, '{}'::jsonb) @> '{"analytics.read":true}'::jsonb
      )
  );
$$;

create or replace function private.can_manage_analytics()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.admin_users au
    where au.user_id = auth.uid()
      and au.is_active = true
      and (
        au.role in ('owner','admin')
        or coalesce(au.permissions, '{}'::jsonb) @> '{"analytics.manage":true}'::jsonb
      )
  );
$$;

revoke all on function private.can_view_analytics() from public;
revoke all on function private.can_manage_analytics() from public;
grant execute on function private.can_view_analytics() to authenticated;
grant execute on function private.can_manage_analytics() to authenticated;

create table public.visitor_sessions (
  id uuid primary key,
  visitor_id uuid not null,
  network_hash text,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  ended_at timestamptz,
  landing_path text not null default '/',
  exit_path text not null default '/',
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  locale text,
  timezone text,
  device_type text not null default 'unknown' check (device_type in ('mobile','tablet','desktop','unknown')),
  device_model text,
  os_name text,
  os_version text,
  browser_name text,
  browser_version text,
  screen_width integer,
  screen_height integer,
  viewport_width integer,
  viewport_height integer,
  consent_version text not null default 'v1',
  consented_at timestamptz,
  dnt boolean not null default false,
  event_count integer not null default 0 check (event_count >= 0),
  pageview_count integer not null default 0 check (pageview_count >= 0),
  click_count integer not null default 0 check (click_count >= 0),
  error_count integer not null default 0 check (error_count >= 0),
  form_start_count integer not null default 0 check (form_start_count >= 0),
  form_submit_count integer not null default 0 check (form_submit_count >= 0),
  form_abandon_count integer not null default 0 check (form_abandon_count >= 0),
  max_scroll_depth smallint not null default 0 check (max_scroll_depth between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.visitor_security_context (
  session_id uuid primary key references public.visitor_sessions(id) on delete cascade,
  ip_address inet,
  country_code text,
  country_region text,
  city text,
  postal_code text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  edge_timezone text,
  user_agent text,
  accept_language text,
  host text,
  forwarded_proto text,
  vercel_region_trace text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table public.visitor_events (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.visitor_sessions(id) on delete cascade,
  visitor_id uuid not null,
  event_type text not null check (event_type in ('session_start','page_view','click','rage_click','scroll_depth','form_start','form_submit','form_abandon','js_error','unhandled_rejection','session_end')),
  path text not null default '/',
  page_title text,
  element_key text,
  element_label text,
  element_role text,
  scroll_depth smallint check (scroll_depth is null or scroll_depth between 0 and 100),
  funnel_name text,
  funnel_step text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.visitor_identity_links (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.visitor_sessions(id) on delete cascade,
  entity_type text not null check (entity_type in ('BOOKING','CONTACT','PARTNER_REQUEST','SUBSCRIBER')),
  entity_id uuid,
  reference text,
  created_at timestamptz not null default now(),
  unique(session_id, entity_type, entity_id)
);

create index visitor_sessions_started_at_idx on public.visitor_sessions(started_at desc);
create index visitor_sessions_last_seen_at_idx on public.visitor_sessions(last_seen_at desc);
create index visitor_sessions_visitor_id_idx on public.visitor_sessions(visitor_id, started_at desc);
create index visitor_sessions_network_hash_idx on public.visitor_sessions(network_hash, started_at desc) where network_hash is not null;
create index visitor_security_ip_idx on public.visitor_security_context(ip_address) where ip_address is not null;
create index visitor_security_country_city_idx on public.visitor_security_context(country_code, city);
create index visitor_events_session_created_idx on public.visitor_events(session_id, created_at asc);
create index visitor_events_created_at_idx on public.visitor_events(created_at desc);
create index visitor_events_type_created_idx on public.visitor_events(event_type, created_at desc);
create index visitor_events_path_created_idx on public.visitor_events(path, created_at desc);
create index visitor_identity_links_entity_idx on public.visitor_identity_links(entity_type, entity_id);

alter table public.visitor_sessions enable row level security;
alter table public.visitor_security_context enable row level security;
alter table public.visitor_events enable row level security;
alter table public.visitor_identity_links enable row level security;

create policy visitor_sessions_admin_read on public.visitor_sessions for select to authenticated using (private.can_view_analytics());
create policy visitor_security_admin_read on public.visitor_security_context for select to authenticated using (private.can_view_analytics());
create policy visitor_events_admin_read on public.visitor_events for select to authenticated using (private.can_view_analytics());
create policy visitor_identity_links_admin_read on public.visitor_identity_links for select to authenticated using (private.can_view_analytics());

revoke all on public.visitor_sessions from anon;
revoke all on public.visitor_security_context from anon;
revoke all on public.visitor_events from anon;
revoke all on public.visitor_identity_links from anon;
grant select on public.visitor_sessions to authenticated;
grant select on public.visitor_security_context to authenticated;
grant select on public.visitor_events to authenticated;
grant select on public.visitor_identity_links to authenticated;

create or replace function public.ingest_analytics_event(
  p_session_id uuid,
  p_visitor_id uuid,
  p_network_hash text,
  p_ip_address inet,
  p_geo jsonb,
  p_headers jsonb,
  p_event_type text,
  p_path text,
  p_page_title text,
  p_context jsonb,
  p_event jsonb
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_scroll smallint := greatest(0, least(100, coalesce(nullif(p_event->>'scrollDepth','')::smallint, 0)));
  v_now timestamptz := now();
  v_consent boolean := coalesce((p_context->>'analyticsConsent')::boolean, false);
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'forbidden';
  end if;
  if not v_consent then
    raise exception 'analytics consent required';
  end if;
  if p_event_type not in ('session_start','page_view','click','rage_click','scroll_depth','form_start','form_submit','form_abandon','js_error','unhandled_rejection','session_end') then
    raise exception 'invalid event type';
  end if;

  insert into public.visitor_sessions (
    id, visitor_id, network_hash, started_at, last_seen_at, landing_path, exit_path,
    referrer, utm_source, utm_medium, utm_campaign, locale, timezone,
    device_type, device_model, os_name, os_version, browser_name, browser_version,
    screen_width, screen_height, viewport_width, viewport_height, consent_version,
    consented_at, dnt, event_count, pageview_count, click_count, error_count,
    form_start_count, form_submit_count, form_abandon_count, max_scroll_depth, created_at, updated_at
  ) values (
    p_session_id, p_visitor_id, nullif(left(coalesce(p_network_hash,''),128),''), v_now, v_now,
    left(coalesce(nullif(p_context->>'landingPath',''), p_path, '/'),500), left(coalesce(p_path,'/'),500),
    left(nullif(p_context->>'referrer',''),1000), left(nullif(p_context->>'utmSource',''),200),
    left(nullif(p_context->>'utmMedium',''),200), left(nullif(p_context->>'utmCampaign',''),200),
    left(nullif(p_context->>'locale',''),40), left(nullif(p_context->>'timezone',''),100),
    case when p_context->>'deviceType' in ('mobile','tablet','desktop') then p_context->>'deviceType' else 'unknown' end,
    left(nullif(p_context->>'deviceModel',''),120), left(nullif(p_context->>'osName',''),80),
    left(nullif(p_context->>'osVersion',''),80), left(nullif(p_context->>'browserName',''),80),
    left(nullif(p_context->>'browserVersion',''),80),
    nullif(p_context->>'screenWidth','')::integer, nullif(p_context->>'screenHeight','')::integer,
    nullif(p_context->>'viewportWidth','')::integer, nullif(p_context->>'viewportHeight','')::integer,
    left(coalesce(nullif(p_context->>'consentVersion',''),'v1'),40), v_now,
    coalesce((p_context->>'dnt')::boolean,false), 1,
    case when p_event_type='page_view' then 1 else 0 end,
    case when p_event_type in ('click','rage_click') then 1 else 0 end,
    case when p_event_type in ('js_error','unhandled_rejection') then 1 else 0 end,
    case when p_event_type='form_start' then 1 else 0 end,
    case when p_event_type='form_submit' then 1 else 0 end,
    case when p_event_type='form_abandon' then 1 else 0 end,
    case when p_event_type='scroll_depth' then v_scroll else 0 end,
    v_now, v_now
  ) on conflict (id) do update set
    last_seen_at = v_now,
    ended_at = case when p_event_type='session_end' then v_now else visitor_sessions.ended_at end,
    exit_path = left(coalesce(p_path, visitor_sessions.exit_path),500),
    event_count = visitor_sessions.event_count + 1,
    pageview_count = visitor_sessions.pageview_count + case when p_event_type='page_view' then 1 else 0 end,
    click_count = visitor_sessions.click_count + case when p_event_type in ('click','rage_click') then 1 else 0 end,
    error_count = visitor_sessions.error_count + case when p_event_type in ('js_error','unhandled_rejection') then 1 else 0 end,
    form_start_count = visitor_sessions.form_start_count + case when p_event_type='form_start' then 1 else 0 end,
    form_submit_count = visitor_sessions.form_submit_count + case when p_event_type='form_submit' then 1 else 0 end,
    form_abandon_count = visitor_sessions.form_abandon_count + case when p_event_type='form_abandon' then 1 else 0 end,
    max_scroll_depth = greatest(visitor_sessions.max_scroll_depth, case when p_event_type='scroll_depth' then v_scroll else 0 end),
    updated_at = v_now;

  insert into public.visitor_security_context (
    session_id, ip_address, country_code, country_region, city, postal_code,
    latitude, longitude, edge_timezone, user_agent, accept_language, host,
    forwarded_proto, vercel_region_trace, first_seen_at, last_seen_at
  ) values (
    p_session_id, p_ip_address, left(nullif(p_geo->>'country',''),8), left(nullif(p_geo->>'region',''),80),
    left(nullif(p_geo->>'city',''),160), left(nullif(p_geo->>'postalCode',''),40),
    nullif(p_geo->>'latitude','')::numeric, nullif(p_geo->>'longitude','')::numeric,
    left(nullif(p_geo->>'timezone',''),100), left(nullif(p_headers->>'userAgent',''),1000),
    left(nullif(p_headers->>'acceptLanguage',''),300), left(nullif(p_headers->>'host',''),255),
    left(nullif(p_headers->>'forwardedProto',''),20), left(nullif(p_headers->>'vercelId',''),200), v_now, v_now
  ) on conflict (session_id) do update set
    ip_address=excluded.ip_address, country_code=excluded.country_code, country_region=excluded.country_region,
    city=excluded.city, postal_code=excluded.postal_code, latitude=excluded.latitude, longitude=excluded.longitude,
    edge_timezone=excluded.edge_timezone, user_agent=excluded.user_agent, accept_language=excluded.accept_language,
    host=excluded.host, forwarded_proto=excluded.forwarded_proto, vercel_region_trace=excluded.vercel_region_trace,
    last_seen_at=v_now;

  insert into public.visitor_events (
    session_id, visitor_id, event_type, path, page_title, element_key, element_label,
    element_role, scroll_depth, funnel_name, funnel_step, error_message, metadata, created_at
  ) values (
    p_session_id, p_visitor_id, p_event_type, left(coalesce(p_path,'/'),500), left(nullif(p_page_title,''),300),
    left(nullif(p_event->>'elementKey',''),200), left(nullif(p_event->>'elementLabel',''),300),
    left(nullif(p_event->>'elementRole',''),80), case when p_event_type='scroll_depth' then v_scroll else null end,
    left(nullif(p_event->>'funnelName',''),120), left(nullif(p_event->>'funnelStep',''),120),
    left(nullif(p_event->>'errorMessage',''),1000), coalesce(p_event->'metadata','{}'::jsonb), v_now
  );
end;
$$;

revoke all on function public.ingest_analytics_event(uuid,uuid,text,inet,jsonb,jsonb,text,text,text,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.ingest_analytics_event(uuid,uuid,text,inet,jsonb,jsonb,text,text,text,jsonb,jsonb) to service_role;

create or replace function public.analytics_overview(p_days integer default 7)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select case when private.can_view_analytics() then jsonb_build_object(
    'sessions', (select count(*) from public.visitor_sessions where started_at >= now() - make_interval(days => greatest(1,least(p_days,365)))),
    'visitors', (select count(distinct visitor_id) from public.visitor_sessions where started_at >= now() - make_interval(days => greatest(1,least(p_days,365)))),
    'pageviews', (select coalesce(sum(pageview_count),0) from public.visitor_sessions where started_at >= now() - make_interval(days => greatest(1,least(p_days,365)))),
    'clicks', (select coalesce(sum(click_count),0) from public.visitor_sessions where started_at >= now() - make_interval(days => greatest(1,least(p_days,365)))),
    'errors', (select coalesce(sum(error_count),0) from public.visitor_sessions where started_at >= now() - make_interval(days => greatest(1,least(p_days,365)))),
    'formStarts', (select coalesce(sum(form_start_count),0) from public.visitor_sessions where started_at >= now() - make_interval(days => greatest(1,least(p_days,365)))),
    'formSubmits', (select coalesce(sum(form_submit_count),0) from public.visitor_sessions where started_at >= now() - make_interval(days => greatest(1,least(p_days,365)))),
    'formAbandons', (select coalesce(sum(form_abandon_count),0) from public.visitor_sessions where started_at >= now() - make_interval(days => greatest(1,least(p_days,365)))),
    'liveNow', (select count(*) from public.visitor_sessions where last_seen_at >= now() - interval '5 minutes'),
    'avgMaxScroll', (select coalesce(round(avg(max_scroll_depth),1),0) from public.visitor_sessions where started_at >= now() - make_interval(days => greatest(1,least(p_days,365))))
  ) else null end;
$$;

revoke all on function public.analytics_overview(integer) from public, anon;
grant execute on function public.analytics_overview(integer) to authenticated;

create or replace function public.purge_visitor_analytics(p_event_days integer default 180, p_raw_ip_days integer default 30)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_events bigint;
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
  v_events := 0;
  return jsonb_build_object('anonymizedIpRows',v_ips,'deletedSessions',v_sessions,'deletedEventsCascade',v_events);
end;
$$;

revoke all on function public.purge_visitor_analytics(integer,integer) from public, anon;
grant execute on function public.purge_visitor_analytics(integer,integer) to authenticated;
