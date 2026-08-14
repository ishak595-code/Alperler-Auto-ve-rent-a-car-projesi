-- V39 production completion
-- Makes scheduled catalog publication effective at read time and hardens cover media consistency.

-- Scheduled records become publicly readable when their scheduled_at timestamp is reached.
drop policy if exists vehicles_public_read on public.vehicles;
create policy vehicles_public_read
on public.vehicles
for select
to public
using (
  (
    is_active = true
    and (
      publication_status = 'PUBLISHED'
      or (
        publication_status = 'SCHEDULED'
        and scheduled_at is not null
        and scheduled_at <= now()
      )
    )
  )
  or private.can_manage_content()
);

drop policy if exists tours_public_read on public.tours;
create policy tours_public_read
on public.tours
for select
to public
using (
  (
    is_active = true
    and (
      publication_status = 'PUBLISHED'
      or (
        publication_status = 'SCHEDULED'
        and scheduled_at is not null
        and scheduled_at <= now()
      )
    )
  )
  or private.can_manage_content()
);

-- A scheduled record without a date is not a valid state.
alter table public.vehicles
  drop constraint if exists vehicles_scheduled_at_required_check;
alter table public.vehicles
  add constraint vehicles_scheduled_at_required_check
  check (publication_status <> 'SCHEDULED' or scheduled_at is not null)
  not valid;
alter table public.vehicles validate constraint vehicles_scheduled_at_required_check;

alter table public.tours
  drop constraint if exists tours_scheduled_at_required_check;
alter table public.tours
  add constraint tours_scheduled_at_required_check
  check (publication_status <> 'SCHEDULED' or scheduled_at is not null)
  not valid;
alter table public.tours validate constraint tours_scheduled_at_required_check;

-- Existing imported media where the parent cover URL already points at the media item
-- should also be marked as the cover item. The existing parent sync trigger keeps JSON
-- image arrays and cover_image fields aligned after these updates.
update public.catalog_media cm
set is_cover = true,
    sort_order = 1,
    updated_at = now()
where cm.is_active = true
  and cm.kind = 'IMAGE'
  and cm.external_url is not null
  and cm.is_cover = false
  and (
    exists (
      select 1 from public.vehicles v
      where v.id = cm.vehicle_id and v.cover_image = cm.external_url
    )
    or exists (
      select 1 from public.tours t
      where t.id = cm.tour_id and t.cover_image = cm.external_url
    )
    or exists (
      select 1 from public.blog_posts b
      where b.id = cm.blog_post_id and b.cover_image = cm.external_url
    )
  );

-- At most one active image can be the cover for each catalog parent.
create unique index if not exists catalog_media_vehicle_one_cover_idx
  on public.catalog_media (vehicle_id)
  where vehicle_id is not null and is_active = true and is_cover = true and kind = 'IMAGE';

create unique index if not exists catalog_media_tour_one_cover_idx
  on public.catalog_media (tour_id)
  where tour_id is not null and is_active = true and is_cover = true and kind = 'IMAGE';

create unique index if not exists catalog_media_blog_one_cover_idx
  on public.catalog_media (blog_post_id)
  where blog_post_id is not null and is_active = true and is_cover = true and kind = 'IMAGE';
