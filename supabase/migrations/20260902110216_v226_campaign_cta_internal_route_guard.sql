-- V226: campaigns may only fall back to safe customer-facing internal routes.
alter table public.campaigns
  drop constraint if exists campaigns_cta_internal_route_v226_check;

alter table public.campaigns
  add constraint campaigns_cta_internal_route_v226_check
  check (
    cta_url is null
    or (
      length(cta_url) <= 800
      and cta_url = btrim(cta_url)
      and cta_url ~ '^/[A-Za-z0-9_./?#=&%-]*$'
      and cta_url !~ '^//'
      and cta_url !~ '^/admin'
      and cta_url !~ '^/branch-portal'
    )
  );
