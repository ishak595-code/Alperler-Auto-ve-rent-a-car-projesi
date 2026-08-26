begin;

create or replace function private.can_actor_view_analytics_v186(p_actor uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select p_actor is not null and exists (
    select 1
    from public.admin_users au
    where au.user_id = p_actor
      and au.is_active = true
      and (
        au.role in ('owner','admin')
        or coalesce(au.permissions, '{}'::jsonb) @> '{"analytics.read":true}'::jsonb
        or coalesce(au.permissions, '{}'::jsonb) @> '{"analytics.manage":true}'::jsonb
      )
  );
$$;

create or replace function private.can_actor_manage_analytics_v186(p_actor uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select p_actor is not null and exists (
    select 1
    from public.admin_users au
    where au.user_id = p_actor
      and au.is_active = true
      and (
        au.role in ('owner','admin')
        or coalesce(au.permissions, '{}'::jsonb) @> '{"analytics.manage":true}'::jsonb
      )
  );
$$;

revoke all on function private.can_actor_view_analytics_v186(uuid) from public, anon, authenticated;
revoke all on function private.can_actor_manage_analytics_v186(uuid) from public, anon, authenticated;
grant execute on function private.can_actor_view_analytics_v186(uuid) to service_role;
grant execute on function private.can_actor_manage_analytics_v186(uuid) to service_role;

create or replace function public.service_analytics_query_v186(
  p_actor uuid,
  p_view text,
  p_days integer default 7,
  p_limit integer default 100,
  p_session_id uuid default null,
  p_event_days integer default 180,
  p_raw_ip_days integer default 30
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_view text := upper(trim(coalesce(p_view, '')));
  v_result jsonb;
begin
  if v_view = 'PURGE' then
    if not private.can_actor_manage_analytics_v186(p_actor) then
      raise exception 'ANALYTICS_MANAGE_PERMISSION_REQUIRED';
    end if;
  else
    if not private.can_actor_view_analytics_v186(p_actor) then
      raise exception 'ANALYTICS_READ_PERMISSION_REQUIRED';
    end if;
  end if;

  perform set_config('request.jwt.claim.sub', p_actor::text, true);

  case v_view
    when 'OVERVIEW' then
      v_result := public.analytics_overview(greatest(1, least(coalesce(p_days, 7), 365)));
    when 'LIVE_SESSIONS' then
      v_result := public.analytics_live_sessions(greatest(1, least(coalesce(p_limit, 100), 500)));
    when 'TOP_PAGES' then
      v_result := public.analytics_top_pages(greatest(1, least(coalesce(p_days, 7), 365)), greatest(1, least(coalesce(p_limit, 20), 100)));
    when 'INTERACTIONS' then
      v_result := public.analytics_interactions(greatest(1, least(coalesce(p_days, 7), 365)), greatest(1, least(coalesce(p_limit, 30), 100)));
    when 'FUNNELS' then
      v_result := public.analytics_funnels(greatest(1, least(coalesce(p_days, 7), 365)));
    when 'DEVICE_BREAKDOWN' then
      v_result := public.analytics_device_breakdown(greatest(1, least(coalesce(p_days, 7), 365)));
    when 'TIMELINE' then
      if p_session_id is null then raise exception 'ANALYTICS_SESSION_REQUIRED'; end if;
      v_result := public.analytics_session_timeline(p_session_id, greatest(1, least(coalesce(p_limit, 300), 1000)));
    when 'PURGE' then
      v_result := public.purge_visitor_analytics(greatest(7, least(coalesce(p_event_days, 180), 730)), greatest(1, least(coalesce(p_raw_ip_days, 30), 365)));
      insert into public.audit_logs(actor_user_id, action, entity_type, entity_id, after_data)
      values (p_actor, 'analytics_retention_purged_v186', 'analytics', p_actor::text, jsonb_build_object(
        'eventDays', greatest(7, least(coalesce(p_event_days, 180), 730)),
        'rawIpDays', greatest(1, least(coalesce(p_raw_ip_days, 30), 365)),
        'result', v_result
      ));
    else
      raise exception 'UNKNOWN_ANALYTICS_VIEW';
  end case;

  return coalesce(v_result, '{}'::jsonb);
end;
$$;

revoke all on function public.service_analytics_query_v186(uuid,text,integer,integer,uuid,integer,integer) from public, anon, authenticated;
grant execute on function public.service_analytics_query_v186(uuid,text,integer,integer,uuid,integer,integer) to service_role;

create or replace function public.service_newsletter_admin_snapshot_v186(
  p_actor uuid,
  p_view text,
  p_limit integer default 500
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_view text := upper(trim(coalesce(p_view, '')));
  v_limit integer := greatest(1, least(coalesce(p_limit, 500), 2000));
  v_result jsonb;
begin
  if not private.can_actor_manage_operations(p_actor) then
    raise exception 'OPERATIONS_PERMISSION_REQUIRED';
  end if;

  case v_view
    when 'SUBSCRIBERS' then
      select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc), '[]'::jsonb)
      into v_result
      from (
        select id,email,locale,status,source,consent_at,created_at,updated_at
        from public.subscribers
        order by created_at desc
        limit v_limit
      ) x;
    when 'CAMPAIGNS' then
      select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc), '[]'::jsonb)
      into v_result
      from (
        select id,title,subject,status,audience_type,total_recipients,sent_count,failed_count,skipped_count,created_at,completed_at,metadata
        from public.newsletter_campaigns
        order by created_at desc
        limit least(v_limit, 500)
      ) x;
    else
      raise exception 'UNKNOWN_NEWSLETTER_VIEW';
  end case;

  return coalesce(v_result, '[]'::jsonb);
end;
$$;

revoke all on function public.service_newsletter_admin_snapshot_v186(uuid,text,integer) from public, anon, authenticated;
grant execute on function public.service_newsletter_admin_snapshot_v186(uuid,text,integer) to service_role;

commit;
