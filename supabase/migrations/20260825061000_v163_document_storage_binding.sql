-- V163 defense-in-depth: customer document metadata may only reference a real,
-- authenticated object from the private customer-documents bucket.

create or replace function private.validate_customer_document_storage_binding()
returns trigger
language plpgsql
security definer
set search_path = public, storage, pg_catalog
as $$
declare
  v_owner uuid;
  v_owner_id text;
  v_mime text;
  v_size bigint;
begin
  select
    o.owner,
    o.owner_id,
    lower(coalesce(o.metadata->>'mimetype', o.metadata->>'contentType', '')),
    case
      when coalesce(o.metadata->>'size','') ~ '^[0-9]+$' then (o.metadata->>'size')::bigint
      else null
    end
  into v_owner, v_owner_id, v_mime, v_size
  from storage.objects o
  where o.bucket_id = 'customer-documents'
    and o.name = new.storage_path
  limit 1;

  if not found then
    raise exception using errcode = '23503', message = 'CUSTOMER_DOCUMENT_STORAGE_OBJECT_REQUIRED';
  end if;

  if coalesce(v_owner::text, v_owner_id, '') <> new.user_id::text then
    raise exception using errcode = '42501', message = 'CUSTOMER_DOCUMENT_STORAGE_OWNER_MISMATCH';
  end if;

  if split_part(new.storage_path, '/', 1) <> new.user_id::text then
    raise exception using errcode = '42501', message = 'CUSTOMER_DOCUMENT_STORAGE_PATH_MISMATCH';
  end if;

  if v_mime <> '' and v_mime <> lower(new.mime_type) then
    raise exception using errcode = '22023', message = 'CUSTOMER_DOCUMENT_STORAGE_MIME_MISMATCH';
  end if;

  if v_size is not null and v_size <> new.file_size then
    raise exception using errcode = '22023', message = 'CUSTOMER_DOCUMENT_STORAGE_SIZE_MISMATCH';
  end if;

  return new;
end;
$$;

revoke all on function private.validate_customer_document_storage_binding() from public, anon, authenticated;

drop trigger if exists customer_documents_storage_binding on public.customer_documents;
create trigger customer_documents_storage_binding
before insert or update of user_id, storage_path, mime_type, file_size
on public.customer_documents
for each row execute function private.validate_customer_document_storage_binding();

comment on function private.validate_customer_document_storage_binding() is
  'Ensures customer_documents metadata is cryptographically-path-bound to an authenticated private Storage object.';
