-- Explicit deny policies document the service-only access model and make the
-- RLS boundary visible to database tooling. Table grants are already revoked.

drop policy if exists branch_partner_requests_anon_deny on public.branch_partner_requests;
create policy branch_partner_requests_anon_deny
on public.branch_partner_requests
as restrictive
for all
to anon
using (false)
with check (false);

drop policy if exists branch_partner_requests_authenticated_deny on public.branch_partner_requests;
create policy branch_partner_requests_authenticated_deny
on public.branch_partner_requests
as restrictive
for all
to authenticated
using (false)
with check (false);
