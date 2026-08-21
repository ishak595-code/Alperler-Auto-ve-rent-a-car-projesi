create or replace function private.refresh_vehicle_booking_blocks(p_vehicle_id uuid)
returns void
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_blocks jsonb;
begin
  if p_vehicle_id is null then return; end if;

  select coalesce(
    jsonb_agg(jsonb_build_object('start', b.start_at, 'end', b.end_at) order by b.start_at),
    '[]'::jsonb
  ) into v_blocks
  from public.bookings b
  where b.vehicle_id = p_vehicle_id
    and b.booking_type = 'RENTAL'
    and b.deleted_at is null
    and b.status = 'APPROVED'
    and b.start_at is not null
    and b.end_at is not null
    and b.end_at > b.start_at;

  update public.vehicles v
  set metadata = jsonb_set(coalesce(v.metadata, '{}'::jsonb), '{bookedDates}', v_blocks, true),
      updated_at = now()
  where v.id = p_vehicle_id and v.category = 'RENTAL';
end;
$$;

create or replace function private.sync_vehicle_booking_blocks()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    perform private.refresh_vehicle_booking_blocks(old.vehicle_id);
    return old;
  end if;
  if tg_op = 'UPDATE' and old.vehicle_id is distinct from new.vehicle_id then
    perform private.refresh_vehicle_booking_blocks(old.vehicle_id);
  end if;
  perform private.refresh_vehicle_booking_blocks(new.vehicle_id);
  return new;
end;
$$;

drop trigger if exists trg_sync_vehicle_booking_blocks on public.bookings;
create trigger trg_sync_vehicle_booking_blocks
after insert or update of status, start_at, end_at, vehicle_id, deleted_at or delete
on public.bookings
for each row execute function private.sync_vehicle_booking_blocks();

do $$
declare r record;
begin
  for r in select id from public.vehicles where category='RENTAL' loop
    perform private.refresh_vehicle_booking_blocks(r.id);
  end loop;
end $$;

revoke all on function private.refresh_vehicle_booking_blocks(uuid) from public, anon, authenticated;
revoke all on function private.sync_vehicle_booking_blocks() from public, anon, authenticated;
