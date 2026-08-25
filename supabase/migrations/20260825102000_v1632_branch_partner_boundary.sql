-- V163.2: branch-partner applications are owned by the service-role gateway.
-- Browser clients use the same-origin Vercel BFF and never receive direct
-- PostgREST privileges over personally identifiable application records.

alter table public.branch_partner_requests enable row level security;

revoke all on table public.branch_partner_requests from anon, authenticated;
grant all on table public.branch_partner_requests to service_role;

comment on table public.branch_partner_requests is
  'Private branch/franchise partnership applications. Direct anon/authenticated table access is denied; public submission and admin review run through the rate-limited branch-partner gateway.';
