-- V74 - Branch portal media isolation. Branch users may upload only into their own branch folder.

create or replace function public.branch_id_from_storage_name(p_name text)
returns uuid
language plpgsql
immutable
as $$
declare
  candidate text;
begin
  if split_part(p_name,'/',1) <> 'branches' then return null; end if;
  candidate := split_part(p_name,'/',2);
  if candidate ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return candidate::uuid;
  end if;
  return null;
end;
$$;
revoke all on function public.branch_id_from_storage_name(text) from public;
grant execute on function public.branch_id_from_storage_name(text) to authenticated;

drop policy if exists vehicle_media_branch_insert on storage.objects;
create policy vehicle_media_branch_insert on storage.objects
for insert to authenticated
with check (
  bucket_id='vehicle-media'
  and public.branch_id_from_storage_name(name) is not null
  and public.can_manage_branch(public.branch_id_from_storage_name(name))
);

drop policy if exists vehicle_media_branch_update on storage.objects;
create policy vehicle_media_branch_update on storage.objects
for update to authenticated
using (
  bucket_id='vehicle-media'
  and public.branch_id_from_storage_name(name) is not null
  and public.can_manage_branch(public.branch_id_from_storage_name(name))
)
with check (
  bucket_id='vehicle-media'
  and public.branch_id_from_storage_name(name) is not null
  and public.can_manage_branch(public.branch_id_from_storage_name(name))
);

drop policy if exists vehicle_media_branch_delete on storage.objects;
create policy vehicle_media_branch_delete on storage.objects
for delete to authenticated
using (
  bucket_id='vehicle-media'
  and public.branch_id_from_storage_name(name) is not null
  and public.can_manage_branch(public.branch_id_from_storage_name(name))
);
