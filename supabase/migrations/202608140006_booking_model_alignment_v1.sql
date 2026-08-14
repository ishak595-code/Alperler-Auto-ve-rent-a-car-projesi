alter table public.bookings
  add column legacy_item_id text,
  add column image text,
  add column days integer check (days is null or days between 1 and 3650),
  add column rental_duration text,
  add column external_payment_reference text,
  add column deleted_at timestamptz,
  add column deleted_by uuid references auth.users(id) on delete set null;

create index bookings_not_deleted_created_idx on public.bookings (created_at desc) where deleted_at is null;
create index bookings_deleted_by_idx on public.bookings (deleted_by) where deleted_by is not null;
create index bookings_external_payment_ref_idx on public.bookings (external_payment_reference) where external_payment_reference is not null;