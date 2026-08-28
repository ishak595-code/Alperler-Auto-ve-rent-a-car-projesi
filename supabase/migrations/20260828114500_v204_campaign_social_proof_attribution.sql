create or replace function private.refresh_campaign_social_proof_cache(p_campaign_id uuid default null::uuid)
returns integer
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  v_rows integer := 0;
begin
  insert into public.campaign_social_proof_cache(
    campaign_id,
    page_views_total,
    unique_viewers_total,
    recent_viewers_24h,
    active_viewers_15m,
    last_viewed_at,
    refreshed_at
  )
  select
    c.id,
    count(ve.id)::bigint,
    count(distinct ve.visitor_id)::bigint,
    count(distinct ve.visitor_id) filter (where ve.created_at >= now() - interval '24 hours')::bigint,
    count(distinct ve.visitor_id) filter (where ve.created_at >= now() - interval '15 minutes')::bigint,
    max(ve.created_at),
    now()
  from public.campaigns c
  left join public.visitor_events ve
    on ve.event_type = 'page_view'
   and ve.path ~ ('[?&]campaign=' || c.id::text || '(&|$)')
  where c.is_active = true
    and c.publication_status = 'PUBLISHED'
    and (p_campaign_id is null or c.id = p_campaign_id)
  group by c.id
  on conflict (campaign_id) do update set
    page_views_total = excluded.page_views_total,
    unique_viewers_total = excluded.unique_viewers_total,
    recent_viewers_24h = excluded.recent_viewers_24h,
    active_viewers_15m = excluded.active_viewers_15m,
    last_viewed_at = excluded.last_viewed_at,
    refreshed_at = excluded.refreshed_at;

  get diagnostics v_rows = row_count;

  if p_campaign_id is null then
    delete from public.campaign_social_proof_cache cache
    where not exists (
      select 1
      from public.campaigns c
      where c.id = cache.campaign_id
        and c.is_active = true
        and c.publication_status = 'PUBLISHED'
    );
  else
    delete from public.campaign_social_proof_cache cache
    where cache.campaign_id = p_campaign_id
      and not exists (
        select 1
        from public.campaigns c
        where c.id = cache.campaign_id
          and c.is_active = true
          and c.publication_status = 'PUBLISHED'
      );
  end if;

  return v_rows;
end;
$function$;

revoke all on function private.refresh_campaign_social_proof_cache(uuid) from public;
revoke all on function private.refresh_campaign_social_proof_cache(uuid) from anon;
revoke all on function private.refresh_campaign_social_proof_cache(uuid) from authenticated;

select private.refresh_campaign_social_proof_cache(null);