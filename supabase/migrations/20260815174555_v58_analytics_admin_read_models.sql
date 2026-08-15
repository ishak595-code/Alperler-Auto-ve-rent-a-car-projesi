create or replace function public.analytics_live_sessions(p_limit integer default 100)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select case when private.can_view_analytics() then coalesce(jsonb_agg(to_jsonb(x) order by x.last_seen_at desc),'[]'::jsonb) else null end
  from (
    select
      s.id as session_id,
      s.visitor_id,
      s.started_at,
      s.last_seen_at,
      s.ended_at,
      s.landing_path,
      s.exit_path,
      s.referrer,
      s.locale,
      s.timezone,
      s.device_type,
      s.device_model,
      s.os_name,
      s.os_version,
      s.browser_name,
      s.browser_version,
      s.screen_width,
      s.screen_height,
      s.viewport_width,
      s.viewport_height,
      s.event_count,
      s.pageview_count,
      s.click_count,
      s.error_count,
      s.form_start_count,
      s.form_submit_count,
      s.form_abandon_count,
      s.max_scroll_depth,
      c.ip_address::text as ip_address,
      c.country_code,
      c.country_region,
      c.city,
      c.postal_code,
      c.latitude,
      c.longitude,
      c.edge_timezone,
      c.user_agent,
      coalesce(
        (select b.customer_name from public.visitor_identity_links l join public.bookings b on l.entity_type='BOOKING' and l.entity_id=b.id where l.session_id=s.id order by l.created_at desc limit 1),
        (select p.customer_name from public.visitor_identity_links l join public.partner_requests p on l.entity_type='PARTNER_REQUEST' and l.entity_id=p.id where l.session_id=s.id order by l.created_at desc limit 1),
        (select m.name from public.visitor_identity_links l join public.contact_messages m on l.entity_type='CONTACT' and l.entity_id=m.id where l.session_id=s.id order by l.created_at desc limit 1)
      ) as known_name,
      coalesce(
        (select b.customer_phone from public.visitor_identity_links l join public.bookings b on l.entity_type='BOOKING' and l.entity_id=b.id where l.session_id=s.id order by l.created_at desc limit 1),
        (select p.customer_phone from public.visitor_identity_links l join public.partner_requests p on l.entity_type='PARTNER_REQUEST' and l.entity_id=p.id where l.session_id=s.id order by l.created_at desc limit 1),
        (select m.phone from public.visitor_identity_links l join public.contact_messages m on l.entity_type='CONTACT' and l.entity_id=m.id where l.session_id=s.id order by l.created_at desc limit 1)
      ) as known_phone,
      coalesce(
        (select b.customer_email from public.visitor_identity_links l join public.bookings b on l.entity_type='BOOKING' and l.entity_id=b.id where l.session_id=s.id order by l.created_at desc limit 1),
        (select p.customer_email from public.visitor_identity_links l join public.partner_requests p on l.entity_type='PARTNER_REQUEST' and l.entity_id=p.id where l.session_id=s.id order by l.created_at desc limit 1),
        (select m.email from public.visitor_identity_links l join public.contact_messages m on l.entity_type='CONTACT' and l.entity_id=m.id where l.session_id=s.id order by l.created_at desc limit 1),
        (select n.email from public.visitor_identity_links l join public.subscribers n on l.entity_type='SUBSCRIBER' and l.entity_id=n.id where l.session_id=s.id order by l.created_at desc limit 1)
      ) as known_email,
      (select l.reference from public.visitor_identity_links l where l.session_id=s.id order by l.created_at desc limit 1) as customer_reference
    from public.visitor_sessions s
    left join public.visitor_security_context c on c.session_id=s.id
    order by s.last_seen_at desc
    limit greatest(1,least(p_limit,500))
  ) x;
$$;
revoke all on function public.analytics_live_sessions(integer) from public, anon;
grant execute on function public.analytics_live_sessions(integer) to authenticated;

create or replace function public.analytics_top_pages(p_days integer default 7, p_limit integer default 20)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select case when private.can_view_analytics() then coalesce(jsonb_agg(to_jsonb(x) order by x.views desc),'[]'::jsonb) else null end
  from (
    select path, count(*)::bigint as views, count(distinct session_id)::bigint as sessions
    from public.visitor_events
    where event_type='page_view' and created_at >= now() - make_interval(days => greatest(1,least(p_days,365)))
    group by path
    order by views desc
    limit greatest(1,least(p_limit,100))
  ) x;
$$;
revoke all on function public.analytics_top_pages(integer,integer) from public, anon;
grant execute on function public.analytics_top_pages(integer,integer) to authenticated;

create or replace function public.analytics_interactions(p_days integer default 7, p_limit integer default 30)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select case when private.can_view_analytics() then coalesce(jsonb_agg(to_jsonb(x) order by x.interactions desc),'[]'::jsonb) else null end
  from (
    select coalesce(nullif(element_label,''),nullif(element_key,''),'Bilinmeyen etkileşim') as label,
           element_key,
           path,
           count(*)::bigint as interactions,
           count(*) filter (where event_type='rage_click')::bigint as rage_clicks
    from public.visitor_events
    where event_type in ('click','rage_click') and created_at >= now() - make_interval(days => greatest(1,least(p_days,365)))
    group by label, element_key, path
    order by interactions desc
    limit greatest(1,least(p_limit,100))
  ) x;
$$;
revoke all on function public.analytics_interactions(integer,integer) from public, anon;
grant execute on function public.analytics_interactions(integer,integer) to authenticated;

create or replace function public.analytics_funnels(p_days integer default 7)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select case when private.can_view_analytics() then coalesce(jsonb_agg(to_jsonb(x) order by x.funnel_name, x.events desc),'[]'::jsonb) else null end
  from (
    select coalesce(nullif(funnel_name,''),'Genel Form') as funnel_name,
           coalesce(nullif(funnel_step,''),event_type) as funnel_step,
           event_type,
           count(*)::bigint as events,
           count(distinct session_id)::bigint as sessions
    from public.visitor_events
    where event_type in ('form_start','form_submit','form_abandon')
      and created_at >= now() - make_interval(days => greatest(1,least(p_days,365)))
    group by funnel_name, funnel_step, event_type
  ) x;
$$;
revoke all on function public.analytics_funnels(integer) from public, anon;
grant execute on function public.analytics_funnels(integer) to authenticated;

create or replace function public.analytics_device_breakdown(p_days integer default 7)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select case when private.can_view_analytics() then jsonb_build_object(
    'devices', coalesce((select jsonb_agg(to_jsonb(d) order by d.sessions desc) from (select device_type as label,count(*)::bigint sessions from public.visitor_sessions where started_at >= now()-make_interval(days=>greatest(1,least(p_days,365))) group by device_type) d),'[]'::jsonb),
    'browsers', coalesce((select jsonb_agg(to_jsonb(b) order by b.sessions desc) from (select coalesce(nullif(browser_name,''),'Bilinmiyor') as label,count(*)::bigint sessions from public.visitor_sessions where started_at >= now()-make_interval(days=>greatest(1,least(p_days,365))) group by browser_name) b),'[]'::jsonb),
    'countries', coalesce((select jsonb_agg(to_jsonb(c) order by c.sessions desc) from (select coalesce(nullif(sc.country_code,''),'--') as label,count(*)::bigint sessions from public.visitor_sessions s left join public.visitor_security_context sc on sc.session_id=s.id where s.started_at >= now()-make_interval(days=>greatest(1,least(p_days,365))) group by sc.country_code) c),'[]'::jsonb)
  ) else null end;
$$;
revoke all on function public.analytics_device_breakdown(integer) from public, anon;
grant execute on function public.analytics_device_breakdown(integer) to authenticated;

create or replace function public.analytics_session_timeline(p_session_id uuid, p_limit integer default 300)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select case when private.can_view_analytics() then coalesce(jsonb_agg(to_jsonb(x) order by x.created_at asc),'[]'::jsonb) else null end
  from (
    select id,event_type,path,page_title,element_key,element_label,element_role,scroll_depth,funnel_name,funnel_step,error_message,metadata,created_at
    from public.visitor_events
    where session_id=p_session_id
    order by created_at desc
    limit greatest(1,least(p_limit,1000))
  ) x;
$$;
revoke all on function public.analytics_session_timeline(uuid,integer) from public, anon;
grant execute on function public.analytics_session_timeline(uuid,integer) to authenticated;
