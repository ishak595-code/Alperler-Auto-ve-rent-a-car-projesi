-- V174.1 Site Content Write Revocation
-- V174 gateway is production active. Public/authenticated SELECT stays intact for customer-facing reads and realtime.

revoke insert, update, delete on table public.footer_settings from authenticated;
revoke insert, update, delete on table public.homepage_sections from authenticated;
revoke insert, update, delete on table public.homepage_placements from authenticated;

drop policy if exists footer_settings_admin_insert on public.footer_settings;
drop policy if exists footer_settings_admin_update on public.footer_settings;
drop policy if exists footer_settings_admin_delete on public.footer_settings;

drop policy if exists homepage_sections_admin_insert on public.homepage_sections;
drop policy if exists homepage_sections_admin_update on public.homepage_sections;
drop policy if exists homepage_sections_admin_delete on public.homepage_sections;

drop policy if exists homepage_placements_admin_insert on public.homepage_placements;
drop policy if exists homepage_placements_admin_update on public.homepage_placements;
drop policy if exists homepage_placements_admin_delete on public.homepage_placements;

-- Backend service role remains the only mutation path through service-only V174 RPCs.
grant select on table public.footer_settings to authenticated;
grant select on table public.homepage_sections to authenticated;
grant select on table public.homepage_placements to authenticated;
grant all on table public.footer_settings to service_role;
grant all on table public.homepage_sections to service_role;
grant all on table public.homepage_placements to service_role;

-- Cover the actor foreign keys introduced by V174 so updates/deletes on auth.users
-- do not require avoidable sequential scans of the dynamic content tables.
create index if not exists footer_links_updated_by_v1741_idx
  on public.footer_links(updated_by);

create index if not exists prefooter_settings_updated_by_v1741_idx
  on public.prefooter_settings(updated_by);
