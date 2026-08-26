begin;

-- V185.1: the central Super Admin metadata write path is now
-- same-origin BFF -> media-control-admin-v185 -> service-only RPCs.
-- Keep admin read, public read, branch member policies and Storage upload RLS.

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='catalog_media'
      and policyname='catalog_media_admin_read'
  ) then
    raise exception 'V1851_ADMIN_READ_POLICY_REQUIRED';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='catalog_media'
      and policyname='catalog_media_public_read'
  ) then
    raise exception 'V1851_PUBLIC_READ_POLICY_REQUIRED';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='catalog_media'
      and policyname='catalog_media_branch_member_insert_v1716'
  ) or not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='catalog_media'
      and policyname='catalog_media_branch_member_update_v1716'
  ) or not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='catalog_media'
      and policyname='catalog_media_branch_member_delete_v1716'
  ) or not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='catalog_media'
      and policyname='catalog_media_branch_member_read_v1716'
  ) then
    raise exception 'V1851_BRANCH_MEDIA_POLICIES_REQUIRED';
  end if;
end $$;

drop policy if exists catalog_media_admin_insert on public.catalog_media;
drop policy if exists catalog_media_admin_update on public.catalog_media;
drop policy if exists catalog_media_admin_delete on public.catalog_media;

commit;
