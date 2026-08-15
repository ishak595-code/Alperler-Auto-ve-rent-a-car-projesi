insert into public.site_config (key, value, updated_at)
values (
  'catalog_media_policy',
  jsonb_build_object(
    'maxFileBytes', 52428800,
    'maxItemsPerEntity', 30,
    'maxBatchFiles', 20,
    'acceptedMimeTypes', jsonb_build_array(
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/avif',
      'video/mp4',
      'video/webm'
    ),
    'preserveOriginalQuality', true,
    'resumableThresholdBytes', 6291456,
    'tusChunkBytes', 6291456
  ),
  now()
)
on conflict (key) do update
set value = excluded.value,
    updated_at = now();
