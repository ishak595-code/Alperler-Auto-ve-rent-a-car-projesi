-- V130b: internal branch governance helpers are not public RPC endpoints.
-- SECURITY DEFINER trigger functions continue to call them as the database owner.
REVOKE EXECUTE ON FUNCTION public.branch_listing_price_ok(uuid, text, text, text, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.branch_listing_price_ok(uuid, text, text, text, numeric) TO service_role;

REVOKE EXECUTE ON FUNCTION public.branch_required_policy_count(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.branch_required_policy_count(uuid) TO service_role;
