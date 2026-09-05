-- V246: keep uploaded showcase media at source resolution and raise the storage ceiling.
-- Runtime upload clients use resumable TUS for large files, so this limit is safe for high-resolution originals.
update storage.buckets
set file_size_limit = 209715200
where id = 'catalog-media';
