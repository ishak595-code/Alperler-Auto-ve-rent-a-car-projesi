-- V237 branch subscription usage visibility.
-- Exposes only the signed-in member's own branch publication usage and keeps
-- listingLimit semantics aligned with the publication enforcement trigger.

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
security definer
set search_path = ''
as $$
  with my_branches as (
    select distinct m.branch_id
    from public.branch_memberships m
    where m.user_id = auth.uid()
      and m.is_active = true
  ), usage as (
    select
      mb.branch_id,
      private.branch_listing_limit_v237(mb.branch_id) as listing_limit,
      (
        select count(*)
        from public.vehicles v
        where v.branch_id = mb.branch_id
          and v.listing_origin = 'BRANCH'
          and v.publication_status = 'PUBLISHED'
      ) + (
        select count(*)
        from public.tours t
        where t.branch_id = mb.branch_id
          and t.listing_origin = 'BRANCH'
          and t.publication_status = 'PUBLISHED'
      ) as published_count,
      (
        select count(*)
        from public.vehicles v
        where v.branch_id = mb.branch_id
          and v.listing_origin = 'BRANCH'
          and v.publication_status = 'DRAFT'
      ) + (
        select count(*)
        from public.tours t
        where t.branch_id = mb.branch_id
          and t.listing_origin = 'BRANCH'
          and t.publication_status = 'DRAFT'
      ) as draft_count,
      (
        select count(*)
        from public.vehicles v
        where v.branch_id = mb.branch_id
          and v.listing_origin = 'BRANCH'
          and v.publication_status = 'PENDING_REVIEW'
      ) + (
        select count(*)
        from public.tours t
        where t.branch_id = mb.branch_id
          and t.listing_origin = 'BRANCH'
          and t.publication_status = 'PENDING_REVIEW'
      ) as pending_review_count,
      (
        select count(*)
        from public.vehicles v
        where v.branch_id = mb.branch_id
          and v.listing_origin = 'BRANCH'
          and v.publication_status = 'REJECTED'
      ) + (
        select count(*)
        from public.tours t
        where t.branch_id = mb.branch_id
          and t.listing_origin = 'BRANCH'
          and t.publication_status = 'REJECTED'
      ) as rejected_count
    from my_branches mb
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
  'Returns member-scoped branch vehicle+tour listing usage. Only PUBLISHED rows consume listingLimit; DRAFT, PENDING_REVIEW and REJECTED are reported separately.';
