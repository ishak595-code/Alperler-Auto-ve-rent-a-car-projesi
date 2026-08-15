-- Supabase Free projects allow a global maximum file size of 50 MB.
-- Keep original media quality and rely on TUS resumable upload for large files.

update storage.buckets
set file_size_limit = 52428800,
    allowed_mime_types = array[
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/avif',
      'video/mp4',
      'video/webm'
    ]::text[]
where id = 'catalog-media';
