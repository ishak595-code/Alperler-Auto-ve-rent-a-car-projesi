-- Keep the repository migration ledger aligned with the live V219.2 schema.
-- The application stores presentation-safe favorite metadata with each entity.

alter table public.customer_favorites
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.customer_favorites
  drop constraint if exists customer_favorites_metadata_object_check;

alter table public.customer_favorites
  add constraint customer_favorites_metadata_object_check
  check (jsonb_typeof(metadata) = 'object');
