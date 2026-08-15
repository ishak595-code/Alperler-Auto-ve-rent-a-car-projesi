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
    'pageviews', (select count(*) from public.visitor_events where event_type='page_view' and created_at >= now() - make_interval(days => greatest(1,least(p_days,365)))),
    'clicks', (select count(*) from public.visitor_events where event_type='click' and created_at >= now() - make_interval(days => greatest(1,least(p_days,365)))),
    'errors', (select count(*) from public.visitor_events where event_type in ('js_error','unhandled_rejection') and created_at >= now() - make_interval(days => greatest(1,least(p_days,365)))),
    'formStarts', (select count(*) from public.visitor_events where event_type='form_start' and created_at >= now() - make_interval(days => greatest(1,least(p_days,365)))),
    'formSubmits', (select count(*) from public.visitor_events where event_type='form_submit' and funnel_step='success' and created_at >= now() - make_interval(days => greatest(1,least(p_days,365)))),
    'formAbandons', (select count(*) from public.visitor_events where event_type='form_abandon' and created_at >= now() - make_interval(days => greatest(1,least(p_days,365)))),
    'liveNow', (select count(*) from public.visitor_sessions where last_seen_at >= now() - interval '5 minutes'),
    'avgMaxScroll', (select coalesce(round(avg(max_scroll_depth),1),0) from public.visitor_sessions where started_at >= now() - make_interval(days => greatest(1,least(p_days,365))))
  ) else null end;
$$;
revoke all on function public.analytics_overview(integer) from public, anon;
grant execute on function public.analytics_overview(integer) to authenticated;
