-- V226: Storage upsert requires SELECT visibility for the authenticated owner.
drop policy if exists customer_avatar_select_own on storage.objects;

create policy customer_avatar_select_own
on storage.objects
for select
to authenticated
using (
  bucket_id = 'customer-avatars'
  and owner_id = (select auth.uid())::text
);
