revoke insert, delete on public.customer_profiles from authenticated;
revoke update on public.customer_profiles from authenticated;
grant update (full_name, phone, birth_date, address_line, district, city, country, postal_code, preferred_locale, preferred_branch_id, marketing_consent, updated_at) on public.customer_profiles to authenticated;

revoke insert, update, delete on public.customer_loyalty_accounts from authenticated;
revoke insert, update, delete on public.customer_loyalty_ledger from authenticated;
revoke insert, update, delete on public.customer_payment_methods from authenticated;
