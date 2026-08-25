-- V175.1 Site Config Write Revocation
-- V175 gateway is live in production. Public/authenticated reads remain intact;
-- all privileged site_config mutations now flow through service_save_site_config_v175.

revoke insert, update, delete on table public.site_config from authenticated;

drop policy if exists site_config_admin_insert on public.site_config;
drop policy if exists site_config_admin_update on public.site_config;
drop policy if exists site_config_admin_delete on public.site_config;

-- Preserve customer-facing/public configuration reads and backend service mutations.
grant select on table public.site_config to anon;
grant select on table public.site_config to authenticated;
grant all on table public.site_config to service_role;
