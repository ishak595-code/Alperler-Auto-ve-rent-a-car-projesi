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

-- The previous combined anon/authenticated plan policy called the private
-- finance helper for anonymous traffic. Keep the helper private by separating
-- the two policy responsibilities instead of granting anon EXECUTE on it.
drop policy if exists branch_subscription_plans_public_read on public.branch_subscription_plans;
drop policy if exists branch_subscription_plans_anon_read_v207 on public.branch_subscription_plans;
drop policy if exists branch_subscription_plans_authenticated_read_v207 on public.branch_subscription_plans;

create policy branch_subscription_plans_anon_read_v207
on public.branch_subscription_plans
for select
to anon
using (is_active = true);

create policy branch_subscription_plans_authenticated_read_v207
on public.branch_subscription_plans
for select
to authenticated
using (is_active = true or private.can_manage_finance());

-- Branch subscription browser reads remain protected by owner/finance RLS.
-- Explicit Data API privileges make that contract reachable without broadening
-- row visibility.
grant select on table public.branch_subscription_plans to anon, authenticated;
grant update on table public.branch_subscription_plans to authenticated;
grant select, update on table public.branch_subscriptions to authenticated;
grant select on table public.branch_subscription_invoices to authenticated;

commit;
