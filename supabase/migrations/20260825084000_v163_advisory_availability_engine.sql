-- V163 follow-up: customer submissions remain PENDING requests, while confirmed
-- inventory is protected by the existing APPROVED overlap exclusion constraint.
-- This function performs authoritative branch-timezone evaluation without creating
-- orphan checkout holds for a request that still requires admin approval.

create or replace function public.evaluate_rental_request(
  p_vehicle_identifier text,
  p_start_local timestamp without time zone,
  p_end_local timestamp without time zone
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog, private
as $$
declare
  v_vehicle public.vehicles%rowtype;
  v_timezone text := 'Europe/Istanbul';
  v_start_at timestamptz;
  v_end_at timestamptz;
  v_available boolean;
  v_alternatives jsonb := '[]'::jsonb;
begin
  if p_start_local is null or p_end_local is null or p_end_local <= p_start_local then
    raise exception using errcode = '22023', message = 'INVALID_RENTAL_DATES';
  end if;

  select v.* into v_vehicle
  from public.vehicles v
  where v.category = 'RENTAL'
    and v.is_active = true
    and v.publication_status = 'PUBLISHED'
    and coalesce(v.availability_status, 'AVAILABLE') not in ('MAINTENANCE','SOLD','UNAVAILABLE','ARCHIVED')
    and (
      v.id::text = btrim(coalesce(p_vehicle_identifier, ''))
      or v.stock_code = btrim(coalesce(p_vehicle_identifier, ''))
    )
  order by case when v.id::text = btrim(coalesce(p_vehicle_identifier, '')) then 0 else 1 end
  limit 1;

  if v_vehicle.id is null then
    raise exception using errcode = '22023', message = 'INVALID_RENTAL_VEHICLE';
  end if;

  if v_vehicle.branch_id is not null then
    select b.timezone into v_timezone
    from public.branches b
    where b.id = v_vehicle.branch_id;
  end if;
  v_timezone := coalesce(v_timezone, 'Europe/Istanbul');

  if not private.is_valid_timezone(v_timezone) then
    raise exception using errcode = '22023', message = 'INVALID_BRANCH_TIMEZONE';
  end if;

  v_start_at := p_start_local at time zone v_timezone;
  v_end_at := p_end_local at time zone v_timezone;

  if v_end_at <= v_start_at
     or v_start_at < now() - interval '5 minutes'
     or v_end_at > now() + interval '3660 days' then
    raise exception using errcode = '22023', message = 'INVALID_RENTAL_DATES';
  end if;

  v_available := not exists (
    select 1
    from public.bookings b
    where b.vehicle_id = v_vehicle.id
      and b.booking_type = 'RENTAL'
      and b.status = 'APPROVED'
      and b.deleted_at is null
      and b.start_at < v_end_at
      and b.end_at > v_start_at
  );

  select coalesce(jsonb_agg(candidate order by candidate->>'brand', candidate->>'model'), '[]'::jsonb)
  into v_alternatives
  from (
    select jsonb_build_object(
      'vehicleId', alt.id,
      'stockCode', alt.stock_code,
      'brand', alt.brand,
      'model', alt.model,
      'branchId', alt.branch_id
    ) as candidate
    from public.vehicles alt
    where alt.id <> v_vehicle.id
      and alt.category = 'RENTAL'
      and alt.is_active = true
      and alt.publication_status = 'PUBLISHED'
      and coalesce(alt.availability_status, 'AVAILABLE') not in ('MAINTENANCE','SOLD','UNAVAILABLE','ARCHIVED')
      and (v_vehicle.branch_id is null or alt.branch_id = v_vehicle.branch_id)
      and not exists (
        select 1
        from public.bookings b
        where b.vehicle_id = alt.id
          and b.booking_type = 'RENTAL'
          and b.status = 'APPROVED'
          and b.deleted_at is null
          and b.start_at < v_end_at
          and b.end_at > v_start_at
      )
    order by alt.brand, alt.model, alt.id
    limit 5
  ) alternatives;

  return jsonb_build_object(
    'vehicleId', v_vehicle.id,
    'startAt', v_start_at,
    'endAt', v_end_at,
    'branchTimezone', v_timezone,
    'available', v_available,
    'alternatives', v_alternatives
  );
end;
$$;

revoke all on function public.evaluate_rental_request(text,timestamp without time zone,timestamp without time zone)
  from public, anon, authenticated;
grant execute on function public.evaluate_rental_request(text,timestamp without time zone,timestamp without time zone)
  to service_role;

comment on function public.evaluate_rental_request(text,timestamp without time zone,timestamp without time zone) is
  'Resolves branch-local rental wall clock values to timestamptz and reports conflicts against confirmed APPROVED bookings. PENDING customer requests are advisory and do not lock inventory.';
