-- V38: database-enforced role based access control.
-- owner/admin: full administrative access
-- editor: catalog/content/media/homepage/campaign access
-- support: bookings/messages/partner requests/subscriber operations
-- granular permissions can extend a role via admin_users.permissions, e.g. {"team.manage": true}.

create or replace function private.has_permission(p_permission text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.admin_users au
    where au.user_id = auth.uid()
      and au.is_active = true
      and coalesce(au.permissions, '{}'::jsonb) @> jsonb_build_object(p_permission, true)
  );
$$;

create or replace function private.can_manage_content()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.admin_users au
    where au.user_id = auth.uid() and au.is_active = true
      and (au.role in ('owner','admin','editor') or coalesce(au.permissions,'{}'::jsonb) @> '{"content.manage":true}'::jsonb)
  );
$$;

create or replace function private.can_manage_operations()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.admin_users au
    where au.user_id = auth.uid() and au.is_active = true
      and (au.role in ('owner','admin','support') or coalesce(au.permissions,'{}'::jsonb) @> '{"operations.manage":true}'::jsonb)
  );
$$;

create or replace function private.can_manage_team()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.admin_users au
    where au.user_id = auth.uid() and au.is_active = true
      and (au.role in ('owner','admin') or coalesce(au.permissions,'{}'::jsonb) @> '{"team.manage":true}'::jsonb)
  );
$$;

create or replace function private.can_manage_settings()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.admin_users au
    where au.user_id = auth.uid() and au.is_active = true
      and (au.role in ('owner','admin') or coalesce(au.permissions,'{}'::jsonb) @> '{"settings.manage":true}'::jsonb)
  );
$$;

create or replace function private.can_view_finance()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.admin_users au
    where au.user_id = auth.uid() and au.is_active = true
      and (au.role in ('owner','admin') or coalesce(au.permissions,'{}'::jsonb) @> '{"finance.read":true}'::jsonb)
  );
$$;

revoke all on function private.has_permission(text) from public;
revoke all on function private.can_manage_content() from public;
revoke all on function private.can_manage_operations() from public;
revoke all on function private.can_manage_team() from public;
revoke all on function private.can_manage_settings() from public;
revoke all on function private.can_view_finance() from public;

-- Catalog / content
alter policy vehicles_admin_insert on public.vehicles with check (private.can_manage_content());
alter policy vehicles_admin_update on public.vehicles using (private.can_manage_content()) with check (private.can_manage_content());
alter policy vehicles_admin_delete on public.vehicles using (private.can_manage_content());
alter policy vehicles_public_read on public.vehicles using ((is_active = true and publication_status = 'PUBLISHED') or private.can_manage_content());

alter policy tours_admin_insert on public.tours with check (private.can_manage_content());
alter policy tours_admin_update on public.tours using (private.can_manage_content()) with check (private.can_manage_content());
alter policy tours_admin_delete on public.tours using (private.can_manage_content());
alter policy tours_public_read on public.tours using ((is_active = true and publication_status = 'PUBLISHED') or private.can_manage_content());

alter policy blog_admin_insert on public.blog_posts with check (private.can_manage_content());
alter policy blog_admin_update on public.blog_posts using (private.can_manage_content()) with check (private.can_manage_content());
alter policy blog_admin_delete on public.blog_posts using (private.can_manage_content());
alter policy blog_public_read on public.blog_posts using ((status = 'PUBLISHED') or private.can_manage_content());

alter policy faqs_admin_insert on public.faqs with check (private.can_manage_content());
alter policy faqs_admin_update on public.faqs using (private.can_manage_content()) with check (private.can_manage_content());
alter policy faqs_admin_delete on public.faqs using (private.can_manage_content());
alter policy faqs_public_read on public.faqs using ((is_active = true) or private.can_manage_content());

alter policy campaigns_admin_insert on public.campaigns with check (private.can_manage_content());
alter policy campaigns_admin_update on public.campaigns using (private.can_manage_content()) with check (private.can_manage_content());
alter policy campaigns_admin_delete on public.campaigns using (private.can_manage_content());
alter policy campaigns_public_read on public.campaigns using (((is_active = true) and publication_status = 'PUBLISHED' and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now())) or private.can_manage_content());

alter policy catalog_media_admin_insert on public.catalog_media with check (private.can_manage_content());
alter policy catalog_media_admin_update on public.catalog_media using (private.can_manage_content()) with check (private.can_manage_content());
alter policy catalog_media_admin_delete on public.catalog_media using (private.can_manage_content());
alter policy catalog_media_public_read on public.catalog_media using ((is_active = true) or private.can_manage_content());

alter policy homepage_sections_admin_insert on public.homepage_sections with check (private.can_manage_content());
alter policy homepage_sections_admin_update on public.homepage_sections using (private.can_manage_content()) with check (private.can_manage_content());
alter policy homepage_sections_admin_delete on public.homepage_sections using (private.can_manage_content());
alter policy homepage_sections_public_read on public.homepage_sections using ((is_enabled = true) or private.can_manage_content());

alter policy homepage_placements_admin_insert on public.homepage_placements with check (private.can_manage_content());
alter policy homepage_placements_admin_update on public.homepage_placements using (private.can_manage_content()) with check (private.can_manage_content());
alter policy homepage_placements_admin_delete on public.homepage_placements using (private.can_manage_content());
alter policy homepage_placements_public_read on public.homepage_placements using (((is_active = true) and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now())) or private.can_manage_content());

alter policy media_admin_insert on public.media_assets with check (private.can_manage_content());
alter policy media_admin_update on public.media_assets using (private.can_manage_content()) with check (private.can_manage_content());
alter policy media_admin_delete on public.media_assets using (private.can_manage_content());
alter policy media_public_read on public.media_assets using ((is_public = true) or private.can_manage_content());

-- Team / branches / user management
alter policy branches_admin_insert on public.branches with check (private.can_manage_team());
alter policy branches_admin_update on public.branches using (private.can_manage_team()) with check (private.can_manage_team());
alter policy branches_admin_delete on public.branches using (private.can_manage_team());
alter policy branches_public_read on public.branches using ((is_active = true) or private.can_manage_team());

alter policy admin_users_self_read on public.admin_users using ((user_id = (select auth.uid())) or private.can_manage_team());
alter policy admin_user_branches_admin_all on public.admin_user_branches using (private.can_manage_team()) with check (private.can_manage_team());
alter policy staff_profiles_admin_all on public.staff_profiles using (private.can_manage_team()) with check (private.can_manage_team());
alter policy staff_branch_assignments_admin_all on public.staff_branch_assignments using (private.can_manage_team()) with check (private.can_manage_team());
alter policy vehicle_staff_assignments_admin_all on public.vehicle_staff_assignments using (private.can_manage_team()) with check (private.can_manage_team());
alter policy tour_staff_assignments_admin_all on public.tour_staff_assignments using (private.can_manage_team()) with check (private.can_manage_team());

-- Operations
alter policy bookings_admin_read on public.bookings using (private.can_manage_operations());
alter policy bookings_admin_update on public.bookings using (private.can_manage_operations()) with check (private.can_manage_operations());
alter policy bookings_admin_delete on public.bookings using (private.can_manage_operations());

alter policy contact_admin_read on public.contact_messages using (private.can_manage_operations());
alter policy contact_admin_update on public.contact_messages using (private.can_manage_operations()) with check (private.can_manage_operations());
alter policy contact_admin_delete on public.contact_messages using (private.can_manage_operations());

alter policy partner_admin_read on public.partner_requests using (private.can_manage_operations());
alter policy partner_admin_update on public.partner_requests using (private.can_manage_operations()) with check (private.can_manage_operations());
alter policy partner_admin_delete on public.partner_requests using (private.can_manage_operations());

alter policy subscribers_admin_read on public.subscribers using (private.can_manage_operations());
alter policy subscribers_admin_update on public.subscribers using (private.can_manage_operations()) with check (private.can_manage_operations());
alter policy notifications_admin_read on public.notification_deliveries using (private.can_manage_operations());

-- Settings / finance / audit
alter policy site_config_admin_insert on public.site_config with check (private.can_manage_settings());
alter policy site_config_admin_update on public.site_config using (private.can_manage_settings()) with check (private.can_manage_settings());
alter policy site_config_admin_delete on public.site_config using (private.can_manage_settings());
alter policy site_config_public_read on public.site_config using ((is_public = true) or private.can_manage_settings());
alter policy payments_admin_read on public.payment_transactions using (private.can_view_finance());
alter policy audit_admin_read on public.audit_logs using (private.can_view_finance());

-- Storage objects for the unified catalog gallery.
drop policy if exists catalog_media_objects_admin_insert on storage.objects;
create policy catalog_media_objects_admin_insert on storage.objects for insert to authenticated
with check (bucket_id = 'catalog-media' and private.can_manage_content());
drop policy if exists catalog_media_objects_admin_update on storage.objects;
create policy catalog_media_objects_admin_update on storage.objects for update to authenticated
using (bucket_id = 'catalog-media' and private.can_manage_content())
with check (bucket_id = 'catalog-media' and private.can_manage_content());
drop policy if exists catalog_media_objects_admin_delete on storage.objects;
create policy catalog_media_objects_admin_delete on storage.objects for delete to authenticated
using (bucket_id = 'catalog-media' and private.can_manage_content());
