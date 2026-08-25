-- V165: remove the anonymous SECURITY DEFINER analytics bypass.
-- Raw visitor analytics stay private. Public clients read only a sanitized aggregate cache.

create table if not exists public.campaign_social_proof_cache (
  campaign_id uuid primary key references public.campaigns(id) on delete cascade,
  page_views_total bigint not null default 0 check (page_views_total >= 0),
  unique_viewers_total bigint not null default 0 check (unique_viewers_total >= 0),
  recent_viewers_24h bigint not null default 0 check (recent_viewers_24h >= 0),
  active_viewers_15m bigint not null default 0 check (active_viewers_15m >= 0),
  last_viewed_at timestamptz,
  refreshed_at timestamptz not null default now()
);

alter table public.campaign_social_proof_cache enable row level security;
revoke all on public.campaign_social_proof_cache from anon, authenticated, service_role;
grant select on public.campaign_social_proof_cache to anon, authenticated;
grant select, insert, update, delete on public.campaign_social_proof_cache to service_role;

drop policy if exists campaign_social_proof_cache_public_read on public.campaign_social_proof_cache;
create policy campaign_social_proof_cache_public_read
on public.campaign_social_proof_cache
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.campaigns c
    where c.id = campaign_social_proof_cache.campaign_id
      and c.is_active = true
      and c.publication_status = 'PUBLISHED'
  )
);

create index if not exists visitor_events_campaign_pageview_idx
  on public.visitor_events(path, created_at desc, visitor_id)
  where event_type = 'page_view';

create or replace function private.refresh_campaign_social_proof_cache(p_campaign_id uuid default null)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
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
   and ve.path = c.cta_url
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
$$;
revoke all on function private.refresh_campaign_social_proof_cache(uuid) from public, anon, authenticated;
grant execute on function private.refresh_campaign_social_proof_cache(uuid) to service_role;

create or replace function private.refresh_campaign_social_proof_after_event()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_campaign_id uuid;
begin
  if new.event_type <> 'page_view' then
    return new;
  end if;

  for v_campaign_id in
    select c.id
    from public.campaigns c
    where c.is_active = true
      and c.publication_status = 'PUBLISHED'
      and c.cta_url = new.path
  loop
    perform private.refresh_campaign_social_proof_cache(v_campaign_id);
  end loop;
  return new;
end;
$$;
revoke all on function private.refresh_campaign_social_proof_after_event() from public, anon, authenticated, service_role;

drop trigger if exists visitor_events_campaign_social_proof_refresh on public.visitor_events;
create trigger visitor_events_campaign_social_proof_refresh
after insert on public.visitor_events
for each row
when (new.event_type = 'page_view')
execute function private.refresh_campaign_social_proof_after_event();

create or replace function public.campaign_social_proof()
returns table(
  campaign_id uuid,
  page_views_total bigint,
  unique_viewers_total bigint,
  recent_viewers_24h bigint,
  active_viewers_15m bigint,
  last_viewed_at timestamptz
)
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  select
    cache.campaign_id,
    cache.page_views_total,
    cache.unique_viewers_total,
    cache.recent_viewers_24h,
    cache.active_viewers_15m,
    cache.last_viewed_at
  from public.campaign_social_proof_cache cache
  order by cache.campaign_id;
$$;
revoke all on function public.campaign_social_proof() from public, anon, authenticated, service_role;
grant execute on function public.campaign_social_proof() to anon, authenticated, service_role;

select private.refresh_campaign_social_proof_cache(null);

do $$
declare
  v_job_id bigint;
begin
  for v_job_id in
    select jobid
    from cron.job
    where jobname = 'v165-campaign-social-proof-refresh'
  loop
    perform cron.unschedule(v_job_id);
  end loop;
end;
$$;

select cron.schedule(
  'v165-campaign-social-proof-refresh',
  '*/5 * * * *',
  $cron$select private.refresh_campaign_social_proof_cache(null);$cron$
);

comment on table public.campaign_social_proof_cache is 'Sanitized public campaign analytics aggregates. Raw visitor analytics remain inaccessible to public clients.';
comment on function public.campaign_social_proof() is 'SECURITY INVOKER compatibility RPC over sanitized campaign_social_proof_cache. It never reads raw visitor_events.';
