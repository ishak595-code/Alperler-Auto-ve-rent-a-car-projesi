create or replace function public.campaign_social_proof()
returns table (
  campaign_id uuid,
  page_views_total bigint,
  unique_viewers_total bigint,
  recent_viewers_24h bigint,
  active_viewers_15m bigint,
  last_viewed_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id as campaign_id,
    count(ve.id)::bigint as page_views_total,
    count(distinct ve.visitor_id)::bigint as unique_viewers_total,
    count(distinct ve.visitor_id) filter (where ve.created_at >= now() - interval '24 hours')::bigint as recent_viewers_24h,
    count(distinct ve.visitor_id) filter (where ve.created_at >= now() - interval '15 minutes')::bigint as active_viewers_15m,
    max(ve.created_at) as last_viewed_at
  from public.campaigns c
  left join public.visitor_events ve
    on ve.event_type = 'page_view'
   and ve.path = c.cta_url
  where c.is_active = true
    and c.publication_status = 'PUBLISHED'
  group by c.id;
$$;

revoke all on function public.campaign_social_proof() from public;
grant execute on function public.campaign_social_proof() to anon, authenticated;

comment on function public.campaign_social_proof() is
  'Returns aggregate, non-identifying campaign interest metrics from real page_view analytics. No visitor identifiers are exposed.';
