# V208.3 Server-Only Boundary Contract

## Purpose

This contract prevents internal database tables and privileged RPCs from becoming browser-accessible over time. It extends V208.2 deny-by-default ownership; it does not add a second data path.

## Canonical rule

Server-only tables have no direct `anon` or `authenticated` table privileges. Browser clients reach the owning business workflow only through the existing authorized BFF / Edge Function / service owner.

The current server-only set is:

- `private.partner_request_vehicle_identity`
- `private.vehicle_registry`
- `public.commercial_offer_quotes`
- `public.media_cleanup_jobs_v198`
- `public.newsletter_campaigns`
- `public.newsletter_deliveries`
- `public.subscribers`
- `public.system_events`

RLS enabled with no client policy is intentional for these tables. Adding permissive RLS policies merely to silence an advisor INFO finding is forbidden because it would widen the attack surface.

## Privileged RPC rule

The following `SECURITY DEFINER` routines are legacy server-facing transaction/read boundaries, not browser APIs. Their EXECUTE ACL must remain denied to `anon` and `authenticated` and available to `service_role`/database administration roles only:

- `reserve_booking_commercial_offer`
- `service_newsletter_admin_snapshot_v186`
- `service_attach_partner_request_identity_v172`
- `service_partner_request_admin_snapshot_v172`
- `service_upsert_partner_request_identity_v172`
- `ingest_system_event`
- `service_set_system_event_resolved_v176`
- `service_system_health_snapshot_v176`
- `service_search_vehicle_registry_v177`
- `service_upsert_vehicle_registry_v177`

New privileged browser-accessible RPCs are not an acceptable shortcut. Sensitive reads and writes stay behind the existing authorized server owner.

## Browser rule

Browser source under `src/` must not name a server-only table or invoke one of the privileged RPCs above. If a customer/admin feature needs that capability, it uses the domain service and same-origin BFF that owns the operation.

## Migration rule

Any migration after the V208.2 baseline that grants `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `REFERENCES`, `TRIGGER`, or `ALL` on a server-only table to `anon` or `authenticated` fails repository governance.

Any later migration that grants EXECUTE on one of the listed privileged RPCs to `anon` or `authenticated` also fails.

A deliberate reclassification must update this contract and its executable tests in the same reviewed architectural change; silently widening access is forbidden.

## Production verification

`supabase/tests/v2083_server_only_boundary.sql` is the executable live-database contract. It verifies table grants and RPC ACLs. Advisor `RLS Enabled No Policy` notices for these tables are therefore classified as intentional deny-by-default INFO, not defects to be fixed with permissive policies.
