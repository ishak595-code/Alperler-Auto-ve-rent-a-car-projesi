-- V237 hardens branch listing usage visibility to the caller's existing RLS scope.
-- The RPC no longer bypasses RLS through SECURITY DEFINER.

create or replace function public.my_branch_listing_usage_v237()
returns table(
  branch_id uuid,
  listing_limit integer,
  published_count bigint,
  draft_count bigint,
  pending_review_count bigint,
  rejected_count bigint,
  remaining_slots bigint,
  quota_reached boolean
)
language sql
stable
security invoker
set search_path = ''
as $$
  with my_branches as (
    select distinct m.branch_id
    from public.branch_memberships m
    where m.user_id = auth.uid()
      and m.is_active = true
  ), scoped as (
    select
      mb.branch_id,
      case
        when b.network_type = 'OWNED' then 2147483647
        else greatest(0, coalesce(nullif(p.entitlements->>'listingLimit','')::integer, 0))
      end as listing_limit
    from my_branches mb
    join public.branches b on b.id = mb.branch_id
    left join public.branch_subscriptions s on s.branch_id = mb.branch_id
    left join public.branch_subscription_plans p on p.id = s.plan_id and p.is_active = true
  ), usage as (
    select
      s.branch_id,
      s.listing_limit,
      (
        select count(*)
        from public.vehicles v
        where v.branch_id = s.branch_id
          and v.listing_origin = 'BRANCH'
          and v.publication_status = 'PUBLISHED'
      ) + (
        select count(*)
        from public.tours t
        where t.branch_id = s.branch_id
          and t.listing_origin = 'BRANCH'
          and t.publication_status = 'PUBLISHED'
      ) as published_count,
      (
        select count(*)
        from public.vehicles v
        where v.branch_id = s.branch_id
          and v.listing_origin = 'BRANCH'
          and v.publication_status = 'DRAFT'
      ) + (
        select count(*)
        from public.tours t
        where t.branch_id = s.branch_id
          and t.listing_origin = 'BRANCH'
          and t.publication_status = 'DRAFT'
      ) as draft_count,
      (
        select count(*)
        from public.vehicles v
        where v.branch_id = s.branch_id
          and v.listing_origin = 'BRANCH'
          and v.publication_status = 'PENDING_REVIEW'
      ) + (
        select count(*)
        from public.tours t
        where t.branch_id = s.branch_id
          and t.listing_origin = 'BRANCH'
          and t.publication_status = 'PENDING_REVIEW'
      ) as pending_review_count,
      (
        select count(*)
        from public.vehicles v
        where v.branch_id = s.branch_id
          and v.listing_origin = 'BRANCH'
          and v.publication_status = 'REJECTED'
      ) + (
        select count(*)
        from public.tours t
        where t.branch_id = s.branch_id
          and t.listing_origin = 'BRANCH'
          and t.publication_status = 'REJECTED'
      ) as rejected_count
    from scoped s
  )
  select
    u.branch_id,
    u.listing_limit,
    u.published_count,
    u.draft_count,
    u.pending_review_count,
    u.rejected_count,
    greatest(coalesce(u.listing_limit, 0)::bigint - u.published_count, 0::bigint) as remaining_slots,
    coalesce(u.listing_limit, 0) < 1 or u.published_count >= coalesce(u.listing_limit, 0) as quota_reached
  from usage u
  order by u.branch_id;
$$;

revoke all on function public.my_branch_listing_usage_v237() from public, anon;
grant execute on function public.my_branch_listing_usage_v237() to authenticated;

comment on function public.my_branch_listing_usage_v237() is
  'RLS-scoped branch vehicle+tour listing usage for the signed-in member. SECURITY INVOKER intentionally preserves branch membership, subscription, vehicle and tour read policies.';
