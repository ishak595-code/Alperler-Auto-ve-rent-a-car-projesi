update public.tours
set short_description = left(btrim(regexp_replace(description, '\s+', ' ', 'g')), 220),
    updated_at = now()
where publication_status in ('PUBLISHED','SCHEDULED')
  and is_active = true
  and (short_description is null or btrim(short_description) = '')
  and description is not null
  and length(btrim(description)) >= 40;

alter table public.tours
  drop constraint if exists tours_public_short_description_check;

alter table public.tours
  add constraint tours_public_short_description_check
  check (
    publication_status not in ('PUBLISHED','SCHEDULED')
    or (
      short_description is not null
      and length(btrim(short_description)) >= 40
      and length(btrim(short_description)) <= 240
    )
  );
