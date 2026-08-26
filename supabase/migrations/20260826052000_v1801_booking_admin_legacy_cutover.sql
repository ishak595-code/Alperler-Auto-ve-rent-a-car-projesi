begin;

-- V180.1: booking-admin-actions v3 is live and calls the explicit-actor,
-- service-role-only V180 functions. Remove the legacy user-JWT SECURITY
-- DEFINER entry points so a browser session can no longer invoke them.

revoke all on function public.admin_approve_booking(uuid,text) from public, anon, authenticated, service_role;
revoke all on function public.admin_offer_booking_alternative(uuid,text) from public, anon, authenticated, service_role;

drop function if exists public.admin_approve_booking(uuid,text);
drop function if exists public.admin_offer_booking_alternative(uuid,text);

commit;
