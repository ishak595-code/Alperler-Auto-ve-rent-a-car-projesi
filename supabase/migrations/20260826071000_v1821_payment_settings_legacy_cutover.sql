begin;

-- V182.1: V182 admin-core is now the canonical payment settings write path.
-- Preserve public/customer SELECT, but remove direct browser mutation rights.

drop policy if exists payment_settings_admin_write on public.payment_settings;

revoke insert, update, delete on table public.payment_settings from anon, authenticated;

grant select on table public.payment_settings to anon, authenticated;

commit;
