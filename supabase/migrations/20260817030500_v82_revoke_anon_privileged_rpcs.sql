-- V82 hardening: anonymous storefront visitors do not need privileged branch governance RPCs.
REVOKE EXECUTE ON FUNCTION public.can_manage_branch(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.assign_booking_fulfillment_branch() FROM anon;
REVOKE EXECUTE ON FUNCTION public.branch_listing_price_ok(uuid,text,text,text,numeric) FROM anon;
REVOKE EXECUTE ON FUNCTION public.branch_required_policy_count(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.enforce_branch_activation() FROM anon;
REVOKE EXECUTE ON FUNCTION public.enforce_branch_tour_governance() FROM anon;
REVOKE EXECUTE ON FUNCTION public.enforce_branch_vehicle_governance() FROM anon;
REVOKE EXECUTE ON FUNCTION public.protect_branch_governance_fields() FROM anon;
REVOKE EXECUTE ON FUNCTION public.provision_branch_partner_request(text,uuid,text) FROM anon;
