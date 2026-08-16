alter table public.bookings
  add column if not exists start_date timestamptz generated always as (start_at) stored,
  add column if not exists end_date timestamptz generated always as (end_at) stored;

comment on column public.bookings.start_date is 'Compatibility alias generated from start_at for branch portal and legacy clients.';
comment on column public.bookings.end_date is 'Compatibility alias generated from end_at for branch portal and legacy clients.';
