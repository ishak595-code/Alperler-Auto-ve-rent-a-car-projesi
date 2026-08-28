begin;

-- Supabase Data API grants and RLS are separate authorization layers.
-- Remove legacy anonymous privileges that are not part of the customer-facing
-- application contract. Public configuration/catalogue SELECT grants remain intact.
revoke select, insert, update, delete, truncate, references, trigger on table public.customer_profiles from anon;
revoke select, insert, update, delete, truncate, references, trigger on table public.customer_loyalty_accounts from anon;
revoke select, insert, update, delete, truncate, references, trigger on table public.customer_experience_preferences from anon;
revoke insert, update, delete, truncate, references, trigger on table public.loyalty_program_settings from anon;
revoke insert, update, delete, truncate, references, trigger on table public.navigation_settings from anon;
revoke insert, update, delete, truncate, references, trigger on table public.navigation_items from anon;
revoke select, insert, update, delete, truncate, references, trigger on table public.vehicle_operations from anon;
revoke insert, update, delete, truncate, references, trigger on table public.footer_settings from anon;

-- Branch subscription browser reads are intentionally protected by the existing
-- owner/finance RLS policies. Explicit Data API privileges make that contract
-- reachable without broadening row visibility.
grant select on table public.branch_subscription_plans to anon, authenticated;
grant update on table public.branch_subscription_plans to authenticated;
grant select, update on table public.branch_subscriptions to authenticated;
grant select on table public.branch_subscription_invoices to authenticated;

commit;
