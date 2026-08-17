-- V82 hardening: trigger functions must not be directly callable through the public API.
-- Existing triggers remain attached; authenticated/service roles keep their explicit grants.
REVOKE EXECUTE ON FUNCTION public.assign_booking_fulfillment_branch() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enforce_branch_activation() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enforce_branch_tour_governance() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enforce_branch_vehicle_governance() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.protect_branch_governance_fields() FROM PUBLIC;
