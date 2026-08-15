create extension if not exists btree_gist with schema extensions;

alter table public.bookings
  add column if not exists rental_hours integer;

alter table public.bookings
  drop constraint if exists bookings_rental_hours_check;
alter table public.bookings
  add constraint bookings_rental_hours_check
  check (rental_hours is null or (rental_hours between 1 and 23));

alter table public.bookings
  drop constraint if exists bookings_approved_rental_time_check;
alter table public.bookings
  add constraint bookings_approved_rental_time_check
  check (
    booking_type <> 'RENTAL'
    or status <> 'APPROVED'
    or deleted_at is not null
    or (vehicle_id is not null and start_at is not null and end_at is not null and end_at > start_at)
  );

alter table public.bookings
  drop constraint if exists bookings_no_approved_rental_overlap;
alter table public.bookings
  add constraint bookings_no_approved_rental_overlap
  exclude using gist (
    vehicle_id with =,
    tstzrange(start_at, end_at, '[)') with &&
  )
  where (
    booking_type = 'RENTAL'
    and status = 'APPROVED'
    and deleted_at is null
    and vehicle_id is not null
    and start_at is not null
    and end_at is not null
  );
