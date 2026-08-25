-- V163.2 reservation integration contract.
-- Customer submissions remain PENDING requests. This function is read-only and
-- resolves the customer-selected wall clock against the selected pickup branch
-- IANA timezone, while preserving the V163 manual approval model.

create or replace function public.evaluate_rental_request_v2(
  p_vehicle_identifier text,
  p_start_local timestamp without time zone,
  p_end_local timestamp without time zone,
  p_pickup_branch_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog, private
as $$
declare
  v_vehicle public.vehicles%rowtype;
  v_timezone text := 'Europe/Istanbul';
  v_resolved_pickup_branch_id uuid;
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
    and coalesce(v.availability_status,'AVAILABLE') not in ('MAINTENANCE','SOLD','UNAVAILABLE','ARCHIVED')
    and (
      v.id::text = btrim(coalesce(p_vehicle_identifier,''))
      or v.stock_code = btrim(coalesce(p_vehicle_identifier,''))
    )
  order by case when v.id::text = btrim(coalesce(p_vehicle_identifier,'')) then 0 else 1 end
  limit 1;

  if v_vehicle.id is null then
    raise exception using errcode = '22023', message = 'INVALID_RENTAL_VEHICLE';
  end if;

  if p_pickup_branch_id is not null then
    select b.id, b.timezone
      into v_resolved_pickup_branch_id, v_timezone
    from public.branches b
    where b.id = p_pickup_branch_id
      and b.is_active = true
      and b.public_status = 'ACTIVE'
      and b.is_pickup_point = true
    limit 1;

    if v_resolved_pickup_branch_id is null then
      raise exception using errcode = '22023', message = 'INVALID_PICKUP_BRANCH';
    end if;
  elsif v_vehicle.branch_id is not null then
    select b.id, b.timezone
      into v_resolved_pickup_branch_id, v_timezone
    from public.branches b
    where b.id = v_vehicle.branch_id
    limit 1;
  end if;

  v_timezone := coalesce(v_timezone,'Europe/Istanbul');
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

  v_available := not private.rental_has_approved_overlap(
    v_vehicle.id,
    v_start_at,
    v_end_at,
    null
  );

  if not v_available then
    select coalesce(jsonb_agg(jsonb_build_object(
      'vehicleId', c.vehicle_id,
      'stockCode', c.stock_code,
      'brand', c.brand,
      'model', c.model,
      'coverImage', c.cover_image,
      'branchId', c.branch_id,
      'dailyPrice', c.rental_price_daily,
      'hourlyPrice', c.rental_price_hourly,
      'bodyType', c.body_type,
      'seats', c.seats,
      'score', c.score,
      'reason', c.reason
    ) order by c.score desc), '[]'::jsonb)
      into v_alternatives
    from private.rental_alternative_candidates(
      v_vehicle.id,
      v_start_at,
      v_end_at,
      coalesce(v_vehicle.hourly_rental_enabled,false),
      false,
      5
    ) c;
  end if;

  return jsonb_build_object(
    'vehicleId', v_vehicle.id,
    'pickupBranchId', v_resolved_pickup_branch_id,
    'startAt', v_start_at,
    'endAt', v_end_at,
    'branchTimezone', v_timezone,
    'available', v_available,
    'alternatives', v_alternatives
  );
end;
$$;

revoke all on function public.evaluate_rental_request_v2(text,timestamp without time zone,timestamp without time zone,uuid)
  from public, anon, authenticated;
grant execute on function public.evaluate_rental_request_v2(text,timestamp without time zone,timestamp without time zone,uuid)
  to service_role;

comment on function public.evaluate_rental_request_v2(text,timestamp without time zone,timestamp without time zone,uuid) is
  'Read-only rental request evaluation. Resolves wall-clock time using the selected active pickup branch timezone; inventory blocking still happens only on atomic admin approval.';
