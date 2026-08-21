revoke execute on function public.claim_customer_referral_context(text, uuid, text) from anon;
revoke execute on function public.claim_customer_referral_context(text, uuid, text) from public;
grant execute on function public.claim_customer_referral_context(text, uuid, text) to authenticated;
grant execute on function public.claim_customer_referral_context(text, uuid, text) to service_role;
