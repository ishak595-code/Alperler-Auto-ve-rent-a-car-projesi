-- V219.2 customer favorites schema contract.
-- Applied to production before merge to restore the metadata field consumed by
-- CustomerFavoritesV217Service. Keep this migration idempotent for clean restores.

alter table public.customer_favorites
  add column if not exists metadata jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.customer_favorites'::regclass
      and conname = 'customer_favorites_metadata_object_check'
  ) then
    alter table public.customer_favorites
      add constraint customer_favorites_metadata_object_check
      check (jsonb_typeof(metadata) = 'object');
  end if;
end
$$;
