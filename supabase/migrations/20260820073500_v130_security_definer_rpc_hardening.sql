-- V130: close direct RPC execution paths on internal SECURITY DEFINER helpers.
-- Trigger execution remains intact; service-role server functions keep explicit access.

REVOKE EXECUTE ON FUNCTION public.restore_catalog_media_projection() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_sync_catalog_owner_media() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_catalog_owner_media(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_catalog_owner_media(uuid, uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.assign_booking_fulfillment_branch() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_branch_activation() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_branch_tour_governance() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_branch_vehicle_governance() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_branch_governance_fields() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.provision_branch_partner_request(text, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.provision_branch_partner_request(text, uuid, text) TO service_role;

ALTER FUNCTION public.branch_id_from_storage_name(text) SET search_path = public, pg_temp;
