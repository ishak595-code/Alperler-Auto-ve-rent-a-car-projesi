begin;

-- Customer/admin RPCs remain callable only by the authenticated roles that
-- perform their own auth.uid()/RBAC checks. Anonymous EXECUTE grants add no
-- valid business capability and are removed.
alter function public.admin_set_customer_status(uuid, text)
  set search_path = pg_catalog, public, private, auth;
revoke execute on function public.admin_set_customer_status(uuid, text) from public, anon;
grant execute on function public.admin_set_customer_status(uuid, text) to authenticated, service_role;

alter function public.customer_cancel_booking(text)
  set search_path = pg_catalog, public;
revoke execute on function public.customer_cancel_booking(text) from public, anon;
grant execute on function public.customer_cancel_booking(text) to authenticated, service_role;

-- This SECURITY DEFINER RPC intentionally exposes aggregate campaign social
-- proof to guests while keeping raw visitor analytics private. Keep the public
-- contract, but pin object resolution to trusted schemas.
alter function public.campaign_social_proof()
  set search_path = pg_catalog, public;
grant execute on function public.campaign_social_proof() to anon, authenticated, service_role;

-- Trigger functions are implementation details. Browser roles never need to
-- invoke them directly. Restrict direct EXECUTE while preserving normal trigger
-- execution and service-role maintenance access.
alter function public.sync_vehicle_hourly_fields()
  set search_path = pg_catalog, public;

revoke execute on function public.normalize_sale_vehicle_unknown_fields() from public, anon, authenticated;
revoke execute on function public.sanitize_catalog_owner_metadata() from public, anon, authenticated;
revoke execute on function public.set_campaign_discount_percent() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.sync_targeted_campaign_cover() from public, anon, authenticated;
revoke execute on function public.sync_vehicle_filter_projection() from public, anon, authenticated;
revoke execute on function public.sync_vehicle_hourly_fields() from public, anon, authenticated;

grant execute on function public.normalize_sale_vehicle_unknown_fields() to service_role;
grant execute on function public.sanitize_catalog_owner_metadata() to service_role;
grant execute on function public.set_campaign_discount_percent() to service_role;
grant execute on function public.set_updated_at() to service_role;
grant execute on function public.sync_targeted_campaign_cover() to service_role;
grant execute on function public.sync_vehicle_filter_projection() to service_role;
grant execute on function public.sync_vehicle_hourly_fields() to service_role;

comment on function public.admin_set_customer_status(uuid, text) is
  'Authenticated admin RPC. Authorization is enforced internally through auth.uid() and operations RBAC; anonymous EXECUTE is intentionally revoked.';
comment on function public.customer_cancel_booking(text) is
  'Authenticated customer self-cancellation RPC. Ownership is enforced internally; anonymous EXECUTE is intentionally revoked.';
comment on function public.campaign_social_proof() is
  'Public aggregate-only campaign social proof RPC. Raw analytics remain inaccessible to browser roles.';
comment on function public.sync_vehicle_hourly_fields() is
  'Vehicle trigger implementation. Direct browser EXECUTE is revoked and search_path is fixed.';

commit;
