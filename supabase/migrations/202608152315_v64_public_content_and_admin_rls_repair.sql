begin;

-- Public content policies must not invoke private admin helpers for anonymous
-- visitors. Authenticated admin policies may use the helper functions.
grant usage on schema private to authenticated;
grant execute on function private.can_manage_content() to authenticated;
grant execute on function private.can_manage_settings() to authenticated;
grant execute on function private.can_manage_team() to authenticated;

-- Anonymous users only need read access to these customer-facing resources.
revoke insert, update, delete, truncate, references, trigger on table public.campaigns from anon;
revoke insert, update, delete, truncate, references, trigger on table public.homepage_sections from anon;
revoke insert, update, delete, truncate, references, trigger on table public.homepage_placements from anon;
revoke insert, update, delete, truncate, references, trigger on table public.site_config from anon;
revoke insert, update, delete, truncate, references, trigger on table public.admin_users from anon;

drop policy if exists campaigns_public_read on public.campaigns;
drop policy if exists campaigns_authenticated_read on public.campaigns;
create policy campaigns_public_read
on public.campaigns for select to anon
using (
  is_active = true
  and publication_status = 'PUBLISHED'
  and (starts_at is null or starts_at <= now())
  and (ends_at is null or ends_at > now())
);
create policy campaigns_authenticated_read
on public.campaigns for select to authenticated
using (
  (
    is_active = true
    and publication_status = 'PUBLISHED'
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at > now())
  )
  or private.can_manage_content()
);

drop policy if exists campaigns_admin_insert on public.campaigns;
drop policy if exists campaigns_admin_update on public.campaigns;
drop policy if exists campaigns_admin_delete on public.campaigns;
create policy campaigns_admin_insert
on public.campaigns for insert to authenticated
with check (private.can_manage_content());
create policy campaigns_admin_update
on public.campaigns for update to authenticated
using (private.can_manage_content())
with check (private.can_manage_content());
create policy campaigns_admin_delete
on public.campaigns for delete to authenticated
using (private.can_manage_content());

drop policy if exists homepage_sections_public_read on public.homepage_sections;
drop policy if exists homepage_sections_authenticated_read on public.homepage_sections;
create policy homepage_sections_public_read
on public.homepage_sections for select to anon
using (is_enabled = true);
create policy homepage_sections_authenticated_read
on public.homepage_sections for select to authenticated
using (is_enabled = true or private.can_manage_content());

drop policy if exists homepage_placements_public_read on public.homepage_placements;
drop policy if exists homepage_placements_authenticated_read on public.homepage_placements;
create policy homepage_placements_public_read
on public.homepage_placements for select to anon
using (
  is_active = true
  and (starts_at is null or starts_at <= now())
  and (ends_at is null or ends_at > now())
);
create policy homepage_placements_authenticated_read
on public.homepage_placements for select to authenticated
using (
  (
    is_active = true
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at > now())
  )
  or private.can_manage_content()
);

drop policy if exists site_config_public_read on public.site_config;
drop policy if exists site_config_authenticated_read on public.site_config;
create policy site_config_public_read
on public.site_config for select to anon
using (is_public = true);
create policy site_config_authenticated_read
on public.site_config for select to authenticated
using (is_public = true or private.can_manage_settings());

drop policy if exists admin_users_self_read on public.admin_users;
drop policy if exists admin_users_team_read on public.admin_users;
create policy admin_users_self_read
on public.admin_users for select to authenticated
using (user_id = auth.uid());
create policy admin_users_team_read
on public.admin_users for select to authenticated
using (private.can_manage_team());

commit;
