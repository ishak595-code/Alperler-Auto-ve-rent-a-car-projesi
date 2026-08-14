insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('vehicle-media','vehicle-media',true,15728640,array['image/jpeg','image/png','image/webp','image/avif']),
  ('tour-media','tour-media',true,15728640,array['image/jpeg','image/png','image/webp','image/avif']),
  ('partner-uploads','partner-uploads',false,52428800,array['image/jpeg','image/png','image/webp','application/pdf','video/mp4'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy public_vehicle_tour_media_read on storage.objects for select to anon, authenticated using (bucket_id in ('vehicle-media','tour-media'));
create policy admin_vehicle_tour_media_insert on storage.objects for insert to authenticated with check (bucket_id in ('vehicle-media','tour-media') and public.is_admin());
create policy admin_vehicle_tour_media_update on storage.objects for update to authenticated using (bucket_id in ('vehicle-media','tour-media') and public.is_admin()) with check (bucket_id in ('vehicle-media','tour-media') and public.is_admin());
create policy admin_vehicle_tour_media_delete on storage.objects for delete to authenticated using (bucket_id in ('vehicle-media','tour-media') and public.is_admin());
create policy admin_partner_upload_read on storage.objects for select to authenticated using (bucket_id = 'partner-uploads' and public.is_admin());
create policy admin_partner_upload_delete on storage.objects for delete to authenticated using (bucket_id = 'partner-uploads' and public.is_admin());

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.is_admin()
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
  );
$$;
revoke all on function private.is_admin() from public;
revoke all on function private.is_admin() from anon;
grant execute on function private.is_admin() to authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

alter policy admin_users_self_read on public.admin_users using (user_id = (select auth.uid()) or private.is_admin());
alter policy vehicles_public_read on public.vehicles using (is_active = true or private.is_admin());
alter policy vehicles_admin_insert on public.vehicles with check (private.is_admin());
alter policy vehicles_admin_update on public.vehicles using (private.is_admin()) with check (private.is_admin());
alter policy vehicles_admin_delete on public.vehicles using (private.is_admin());
alter policy tours_public_read on public.tours using (is_active = true or private.is_admin());
alter policy tours_admin_insert on public.tours with check (private.is_admin());
alter policy tours_admin_update on public.tours using (private.is_admin()) with check (private.is_admin());
alter policy tours_admin_delete on public.tours using (private.is_admin());
alter policy branches_public_read on public.branches using (is_active = true or private.is_admin());
alter policy branches_admin_insert on public.branches with check (private.is_admin());
alter policy branches_admin_update on public.branches using (private.is_admin()) with check (private.is_admin());
alter policy branches_admin_delete on public.branches using (private.is_admin());
alter policy bookings_admin_read on public.bookings using (private.is_admin());
alter policy bookings_admin_update on public.bookings using (private.is_admin()) with check (private.is_admin());
alter policy bookings_admin_delete on public.bookings using (private.is_admin());
alter policy partner_admin_read on public.partner_requests using (private.is_admin());
alter policy partner_admin_update on public.partner_requests using (private.is_admin()) with check (private.is_admin());
alter policy partner_admin_delete on public.partner_requests using (private.is_admin());
alter policy contact_admin_read on public.contact_messages using (private.is_admin());
alter policy contact_admin_update on public.contact_messages using (private.is_admin()) with check (private.is_admin());
alter policy contact_admin_delete on public.contact_messages using (private.is_admin());
alter policy subscribers_admin_read on public.subscribers using (private.is_admin());
alter policy subscribers_admin_update on public.subscribers using (private.is_admin()) with check (private.is_admin());
alter policy payments_admin_read on public.payment_transactions using (private.is_admin());
alter policy notifications_admin_read on public.notification_deliveries using (private.is_admin());
alter policy blog_public_read on public.blog_posts using (status = 'PUBLISHED' or private.is_admin());
alter policy blog_admin_insert on public.blog_posts with check (private.is_admin());
alter policy blog_admin_update on public.blog_posts using (private.is_admin()) with check (private.is_admin());
alter policy blog_admin_delete on public.blog_posts using (private.is_admin());
alter policy faqs_public_read on public.faqs using (is_active = true or private.is_admin());
alter policy faqs_admin_insert on public.faqs with check (private.is_admin());
alter policy faqs_admin_update on public.faqs using (private.is_admin()) with check (private.is_admin());
alter policy faqs_admin_delete on public.faqs using (private.is_admin());
alter policy site_config_public_read on public.site_config using (is_public = true or private.is_admin());
alter policy site_config_admin_insert on public.site_config with check (private.is_admin());
alter policy site_config_admin_update on public.site_config using (private.is_admin()) with check (private.is_admin());
alter policy site_config_admin_delete on public.site_config using (private.is_admin());
alter policy audit_admin_read on public.audit_logs using (private.is_admin());
alter policy media_public_read on public.media_assets using (is_public = true or private.is_admin());
alter policy media_admin_insert on public.media_assets with check (private.is_admin());
alter policy media_admin_update on public.media_assets using (private.is_admin()) with check (private.is_admin());
alter policy media_admin_delete on public.media_assets using (private.is_admin());
alter policy admin_vehicle_tour_media_insert on storage.objects with check (bucket_id in ('vehicle-media','tour-media') and private.is_admin());
alter policy admin_vehicle_tour_media_update on storage.objects using (bucket_id in ('vehicle-media','tour-media') and private.is_admin()) with check (bucket_id in ('vehicle-media','tour-media') and private.is_admin());
alter policy admin_vehicle_tour_media_delete on storage.objects using (bucket_id in ('vehicle-media','tour-media') and private.is_admin());
alter policy admin_partner_upload_read on storage.objects using (bucket_id = 'partner-uploads' and private.is_admin());
alter policy admin_partner_upload_delete on storage.objects using (bucket_id = 'partner-uploads' and private.is_admin());
drop function public.is_admin();

create index bookings_pickup_branch_idx on public.bookings (pickup_branch_id) where pickup_branch_id is not null;
create index bookings_dropoff_branch_idx on public.bookings (dropoff_branch_id) where dropoff_branch_id is not null;
create index media_assets_owner_user_idx on public.media_assets (owner_user_id) where owner_user_id is not null;
create index notification_booking_idx on public.notification_deliveries (booking_id) where booking_id is not null;
create index notification_contact_message_idx on public.notification_deliveries (contact_message_id) where contact_message_id is not null;