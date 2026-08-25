-- V163 follow-up: PostgreSQL standard strings do not need a doubled backslash
-- for a regex literal dot. Recreate the constraint with the canonical pattern.
alter table public.customer_documents drop constraint if exists customer_documents_storage_path_v163_chk;
alter table public.customer_documents
  add constraint customer_documents_storage_path_v163_chk
  check (storage_path ~ ('^' || user_id::text || '/[0-9a-fA-F-]{36}\.(jpg|png|webp|pdf)$'));
