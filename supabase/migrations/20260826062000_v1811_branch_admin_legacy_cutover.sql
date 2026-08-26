begin;

-- V181.1: remove the legacy browser-callable SECURITY DEFINER entry points
-- only after V181 same-origin BFF + Edge + service-only RPCs are live.

revoke all on function public.admin_review_branch_listing_v1712(text,uuid,text,text) from public, anon, authenticated, service_role;
revoke all on function public.admin_set_branch_operator_verification_v1717(uuid,text,text,boolean,text) from public, anon, authenticated, service_role;

drop function if exists public.admin_review_branch_listing_v1712(text,uuid,text,text);
drop function if exists public.admin_set_branch_operator_verification_v1717(uuid,text,text,boolean,text);

commit;
