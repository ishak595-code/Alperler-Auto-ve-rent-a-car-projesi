-- V170.1 large-group database alignment
-- Tour reservations are demand records, not hard-capacity allocations.
-- Preserve the historical <=100 guard for non-tour records while allowing large tour groups.

alter table public.bookings
  drop constraint if exists bookings_person_count_check;

alter table public.bookings
  add constraint bookings_person_count_check
  check (
    person_count is null
    or (
      booking_type = 'TOUR'
      and person_count between 1 and 1000000000
    )
    or (
      booking_type <> 'TOUR'
      and person_count between 1 and 100
    )
  );

comment on constraint bookings_person_count_check on public.bookings is
'V170.1: TOUR person_count supports flexible large-group demand up to integer-safe operational ceiling; non-TOUR records retain the historical 1..100 guard.';