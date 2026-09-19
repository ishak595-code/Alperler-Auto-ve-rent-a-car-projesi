-- V320: Fix catalog media URL generation to use portable same-origin paths
-- instead of hardcoded Supabase project URLs.
--
-- PROBLEM: The sync trigger was generating full Supabase URLs like:
--   https://hrztrgjvgdnaurejnsgs.supabase.co/storage/v1/object/public/catalog-media/...
-- These URLs bypass the Node.js /catalog-media/ proxy and break deployment portability.
--
-- SOLUTION: Generate relative paths like /catalog-media/... that are served
-- through the application's same-origin proxy (configured in server.ts and vercel.json).
-- This maintains portability and ensures proper CDN/cache behavior.

create or replace function private.catalog_media_public_url(
  p_storage_bucket text,
  p_object_path text,
  p_external_url text
)
returns text
language sql
immutable
set search_path = pg_catalog
as $$
  select case
    when nullif(p_external_url, '') is not null then p_external_url
    when p_storage_bucket = 'catalog-media' and nullif(p_object_path, '') is not null
      -- Use same-origin portable path instead of hardcoded Supabase URL
      then '/catalog-media/' || p_object_path
    when nullif(p_storage_bucket, '') is not null and nullif(p_object_path, '') is not null
      -- Fallback for non-catalog-media buckets (should not happen in production)
      then 'https://hrztrgjvgdnaurejnsgs.supabase.co/storage/v1/object/public/'
        || p_storage_bucket || '/' || p_object_path
    else null
  end;
$$;

-- Resync all existing media records to update URLs from Supabase to same-origin paths
do $$
declare r record;
begin
  -- Update vehicles with catalog media
  for r in select distinct vehicle_id from public.catalog_media where vehicle_id is not null loop
    perform private.sync_catalog_media_parent(r.vehicle_id, null, null);
  end loop;
  
  -- Update tours with catalog media
  for r in select distinct tour_id from public.catalog_media where tour_id is not null loop
    perform private.sync_catalog_media_parent(null, r.tour_id, null);
  end loop;
  
  -- Update blog posts with catalog media
  for r in select distinct blog_post_id from public.catalog_media where blog_post_id is not null loop
    perform private.sync_catalog_media_parent(null, null, r.blog_post_id);
  end loop;
end $$;
