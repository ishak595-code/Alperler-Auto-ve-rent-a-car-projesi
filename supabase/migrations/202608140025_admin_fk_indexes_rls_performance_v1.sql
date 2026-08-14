-- V38: remove avoidable admin-side FK scans and duplicate permissive SELECT policies.

create index if not exists admin_user_branches_branch_idx
  on public.admin_user_branches(branch_id);
create index if not exists admin_users_invited_by_idx
  on public.admin_users(invited_by) where invited_by is not null;
create index if not exists admin_users_primary_branch_idx
  on public.admin_users(primary_branch_id) where primary_branch_id is not null;
create index if not exists campaigns_created_by_idx
  on public.campaigns(created_by) where created_by is not null;
create index if not exists catalog_media_created_by_idx
  on public.catalog_media(created_by) where created_by is not null;
create index if not exists homepage_placements_created_by_idx
  on public.homepage_placements(created_by) where created_by is not null;
create index if not exists homepage_sections_updated_by_idx
  on public.homepage_sections(updated_by) where updated_by is not null;
create index if not exists staff_branch_assignments_branch_idx
  on public.staff_branch_assignments(branch_id);
create index if not exists staff_profiles_created_by_idx
  on public.staff_profiles(created_by) where created_by is not null;
create index if not exists tour_staff_assignments_staff_idx
  on public.tour_staff_assignments(staff_id);
create index if not exists vehicle_staff_assignments_staff_idx
  on public.vehicle_staff_assignments(staff_id);

-- Public/admin SELECT access is already fully covered by the *_public_read policies.
-- Replace FOR ALL admin policies with write-only policies to avoid evaluating two
-- permissive SELECT policies on every homepage query.
drop policy if exists homepage_sections_admin_all on public.homepage_sections;
drop policy if exists homepage_sections_admin_insert on public.homepage_sections;
drop policy if exists homepage_sections_admin_update on public.homepage_sections;
drop policy if exists homepage_sections_admin_delete on public.homepage_sections;
create policy homepage_sections_admin_insert on public.homepage_sections
  for insert to authenticated with check (private.is_admin());
create policy homepage_sections_admin_update on public.homepage_sections
  for update to authenticated using (private.is_admin()) with check (private.is_admin());
create policy homepage_sections_admin_delete on public.homepage_sections
  for delete to authenticated using (private.is_admin());

drop policy if exists homepage_placements_admin_all on public.homepage_placements;
drop policy if exists homepage_placements_admin_insert on public.homepage_placements;
drop policy if exists homepage_placements_admin_update on public.homepage_placements;
drop policy if exists homepage_placements_admin_delete on public.homepage_placements;
create policy homepage_placements_admin_insert on public.homepage_placements
  for insert to authenticated with check (private.is_admin());
create policy homepage_placements_admin_update on public.homepage_placements
  for update to authenticated using (private.is_admin()) with check (private.is_admin());
create policy homepage_placements_admin_delete on public.homepage_placements
  for delete to authenticated using (private.is_admin());
