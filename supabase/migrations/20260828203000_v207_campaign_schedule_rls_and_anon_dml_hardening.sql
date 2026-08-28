begin;

-- Publication timing is a database concern. A scheduled campaign becomes
-- readable exactly when its start time is reached, without a client-side
-- status rewrite or a cron job mutating publication_status.
drop policy if exists campaigns_public_read on public.campaigns;
create policy campaigns_public_read
on public.campaigns
for select
to anon
using (
  is_active = true
  and (
    publication_status = 'PUBLISHED'
    or (
      publication_status = 'SCHEDULED'
      and starts_at is not null
      and starts_at <= now()
    )
  )
  and (starts_at is null or starts_at <= now())
  and (ends_at is null or ends_at > now())
);

drop policy if exists campaigns_authenticated_read on public.campaigns;
create policy campaigns_authenticated_read
on public.campaigns
for select
to authenticated
using (
  (
    is_active = true
    and (
      publication_status = 'PUBLISHED'
      or (
        publication_status = 'SCHEDULED'
        and starts_at is not null
        and starts_at <= now()
      )
    )
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at > now())
  )
  or private.can_manage_content()
);

-- These tables have no anonymous write policies. Keeping anonymous DML
-- table grants therefore adds attack surface without enabling a valid flow.
-- Authenticated grants are intentionally untouched because branch/admin
-- workflows still use RLS-protected direct table operations in production.
revoke insert, update, delete on table public.vehicles from anon;
revoke insert, update, delete on table public.tours from anon;
revoke insert, update, delete on table public.blog_posts from anon;
revoke insert, update, delete on table public.campaigns from anon;
revoke insert, update, delete on table public.branches from anon;
revoke insert, update, delete on table public.homepage_sections from anon;
revoke insert, update, delete on table public.homepage_placements from anon;
revoke insert, update, delete on table public.site_config from anon;
revoke insert, update, delete on table public.faqs from anon;
revoke insert, update, delete on table public.bookings from anon;
revoke insert, update, delete on table public.branch_pricing_rules from anon;
revoke insert, update, delete on table public.network_policy_rules from anon;
revoke insert, update, delete on table public.branch_setup_checklist from anon;
revoke insert, update, delete on table public.branch_memberships from anon;
revoke insert, update, delete on table public.branch_policy_acceptances from anon;
revoke insert, update, delete on table public.catalog_media from anon;

commit;
