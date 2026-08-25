const fs = require('node:fs');

function read(path) { return fs.readFileSync(path, 'utf8'); }
function write(path, value) { fs.writeFileSync(path, value); }
function replaceOnce(source, needle, replacement, label) {
  if (!source.includes(needle)) throw new Error(`Missing ${label}`);
  const next = source.replace(needle, replacement);
  if (next === source) throw new Error(`Failed ${label}`);
  return next;
}

// 1) Client: a customer creates only a PENDING request. The client never reserves
// inventory and never blocks submission because another booking is approved.
{
  const path = 'src/services/booking.service.ts';
  let source = read(path);
  source = source.replace(/interface PublicAvailabilityAlternative[^\n]*\ninterface AvailabilityApiResponse[^\n]*\n/, '');
  source = source.replace(/\n  private readonly publicAlternatives=signal<PublicAvailabilityAlternative\[\]>\(\[\]\);/, '');
  source = source.replace(/\n  readonly availabilityAlternatives=this\.publicAlternatives\.asReadonly\(\);/, '');
  source = replaceOnce(
    source,
    '    const normalized=this.normalizeInput(input);const idempotencyKey=crypto.randomUUID();this.publicAlternatives.set([]);\n    if(normalized.type==="RENTAL"){const availability=await this.evaluateRentalAvailability(normalized);normalized.startDate=availability.startAt;normalized.endDate=availability.endAt;}',
    '    const normalized=this.normalizeInput(input);const idempotencyKey=crypto.randomUUID();\n    if(normalized.type==="RENTAL"){normalized.startDate=this.wallClockValue(normalized.startDate||"");normalized.endDate=this.wallClockValue(normalized.endDate||"");}',
    'non-blocking customer booking create',
  );
  const methods = /\n  private async evaluateRentalAvailability[\s\S]*?\n\n  private async refreshAdminRecords/;
  if (!methods.test(source)) throw new Error('Missing availability client methods');
  source = source.replace(methods, `
  private wallClockValue(value:string):string{const raw=value.trim();const dateOnly=/^(\\d{4})-(\\d{2})-(\\d{2})$/.exec(raw);if(dateOnly)return\`${'${dateOnly[1]}'}-${'${dateOnly[2]}'}-${'${dateOnly[3]}'}T00:00:00\`;const local=/^(\\d{4})-(\\d{2})-(\\d{2})T(\\d{2}):(\\d{2})(?::(\\d{2}))?/.exec(raw);if(local)return\`${'${local[1]}'}-${'${local[2]}'}-${'${local[3]}'}T${'${local[4]}'}:${'${local[5]}'}:${'${local[6]||"00"}'}\`;const date=new Date(raw);if(Number.isNaN(date.getTime()))throw new Error("INVALID_RENTAL_DATES:Kiralama tarihi geçerli değil.");const pad=(part:number)=>String(part).padStart(2,"0");return\`${'${date.getFullYear()}'}-${'${pad(date.getMonth()+1)}'}-${'${pad(date.getDate())}'}T${'${pad(date.getHours())}'}:${'${pad(date.getMinutes())}'}:${'${pad(date.getSeconds())}'}\`;}

  private async refreshAdminRecords`);
  write(path, source);
}

// 2) Server: server canonicalizes branch wall-clock time, calculates price, but
// does not reject a PENDING request because an APPROVED booking already exists.
{
  const path = 'supabase/functions/booking-gateway/index.ts';
  let source = read(path);
  source = replaceOnce(
    source,
    '  if (await hasApprovedOverlap(vehicle.id, start, end)) throw new Error("VEHICLE_UNAVAILABLE");\n\n  const duration = rentalDuration(body?.rentalDuration);',
    '  // Customer submissions are requests, not inventory reservations. Existing APPROVED\n  // bookings are recorded as an availability conflict, but they never prevent a PENDING request.\n  const duration = rentalDuration(body?.rentalDuration);',
    'remove PENDING overlap rejection',
  );

  const marker = 'async function authoritativeRental(\n';
  if (!source.includes(marker)) throw new Error('Missing authoritativeRental marker');
  const helper = `function rentalWallClock(value: unknown): string {
  const raw = clean(value, 64);
  const match = /^(\\d{4})-(\\d{2})-(\\d{2})(?:T(\\d{2}):(\\d{2})(?::(\\d{2}))?)?$/.exec(raw);
  if (!match) throw new Error("INVALID_RENTAL_DATES");
  const hh = match[4] || "00";
  const mm = match[5] || "00";
  const ss = match[6] || "00";
  const probe = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(hh), Number(mm), Number(ss)));
  if (probe.getUTCFullYear() !== Number(match[1]) || probe.getUTCMonth() !== Number(match[2]) - 1 || probe.getUTCDate() !== Number(match[3]) || Number(hh) > 23 || Number(mm) > 59 || Number(ss) > 59) throw new Error("INVALID_RENTAL_DATES");
  return \`${'${match[1]}'}-${'${match[2]}'}-${'${match[3]}'}T${'${hh}'}:${'${mm}'}:${'${ss}'}\`;
}

async function evaluateRentalRequest(identifier: string, startValue: unknown, endValue: unknown): Promise<any> {
  const response = await db("rpc/evaluate_rental_request", {
    method: "POST",
    body: JSON.stringify({
      p_vehicle_identifier: identifier,
      p_start_local: rentalWallClock(startValue),
      p_end_local: rentalWallClock(endValue),
    }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.startAt || !payload?.endAt) {
    const raw = String(payload?.message || payload?.details || "");
    if (raw.includes("INVALID_BRANCH_TIMEZONE")) throw new Error("INVALID_BRANCH_TIMEZONE");
    if (raw.includes("INVALID_RENTAL_VEHICLE")) throw new Error("INVALID_RENTAL_VEHICLE");
    throw new Error("INVALID_RENTAL_DATES");
  }
  return payload;
}

`;
  source = source.replace(marker, helper + marker);

  source = replaceOnce(
    source,
    '    let startAt = dateValue(body?.startDate);\n    let endAt = dateValue(body?.endDate);',
    '    let startAt = type === "RENTAL" ? null : dateValue(body?.startDate);\n    let endAt = type === "RENTAL" ? null : dateValue(body?.endDate);',
    'rental date initialization',
  );
  source = replaceOnce(
    source,
    '      const vehicle = await getRentalVehicle(itemId);\n      vehicleId = String(vehicle.id);\n      if (!startAt || !endAt) {\n        throw new Error(\n          rentalDurationValue === "hourly" ? "INVALID_HOURLY_RENTAL" : "INVALID_RENTAL_DATES",\n        );\n      }\n\n      const withDriver = Boolean(body?.withDriver);',
    '      const vehicle = await getRentalVehicle(itemId);\n      vehicleId = String(vehicle.id);\n      const evaluation = await evaluateRentalRequest(itemId, body?.startDate, body?.endDate);\n      startAt = String(evaluation.startAt);\n      endAt = String(evaluation.endAt);\n\n      const withDriver = Boolean(body?.withDriver);',
    'server branch-timezone evaluation',
  );
  source = replaceOnce(
    source,
    '        server_calculated: true,\n        resolved_vehicle_id: vehicleId,',
    '        server_calculated: true,\n        resolved_vehicle_id: vehicleId,\n        availability: {\n          status: evaluation.available === true ? "AVAILABLE_AT_REQUEST" : "CONFLICT_AT_REQUEST",\n          alternativeCount: Array.isArray(evaluation.alternatives) ? evaluation.alternatives.length : 0,\n          checkedAt: new Date().toISOString(),\n        },',
    'request availability metadata',
  );
  write(path, source);
}

// 3) DB: if a request arrives after the car is already approved for someone else,
// seed ranked alternatives immediately. Pending requests still remain Pending.
{
  const path = 'supabase/migrations/20260825071000_v163_pending_approval_and_alternatives.sql';
  let source = read(path);
  if (!source.includes('booking_seed_alternatives_after_pending_insert')) {
    const anchor = "create or replace function private.generate_booking_alternatives()";
    if (!source.includes(anchor)) throw new Error('Missing alternatives trigger anchor');
    const sql = `create or replace function private.seed_pending_booking_alternatives()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog, private
as $$
declare
  v_approved_id uuid;
  v_candidate record;
  v_rank integer := 0;
begin
  if new.booking_type <> 'RENTAL' or new.status <> 'PENDING' or new.vehicle_id is null or new.start_at is null or new.end_at is null then
    return new;
  end if;

  select b.id into v_approved_id
  from public.bookings b
  where b.id <> new.id
    and b.vehicle_id = new.vehicle_id
    and b.booking_type = 'RENTAL'
    and b.status = 'APPROVED'
    and b.deleted_at is null
    and b.start_at < new.end_at
    and b.end_at > new.start_at
  order by b.updated_at desc, b.created_at desc
  limit 1;

  if v_approved_id is null then
    return new;
  end if;

  for v_candidate in
    select * from private.rental_alternative_candidates(
      new.vehicle_id,
      new.start_at,
      new.end_at,
      new.rental_duration = 'hourly',
      coalesce(new.with_driver,false),
      5
    )
  loop
    v_rank := v_rank + 1;
    insert into public.booking_alternative_offers(
      booking_id, approved_booking_id, original_vehicle_id, alternative_vehicle_id,
      status, rank, score, reason, expires_at, updated_at
    ) values (
      new.id, v_approved_id, new.vehicle_id, v_candidate.vehicle_id,
      'OPEN', v_rank, v_candidate.score, v_candidate.reason,
      greatest(new.start_at, now() + interval '1 day'), now()
    )
    on conflict (booking_id, alternative_vehicle_id)
    do update set
      approved_booking_id = excluded.approved_booking_id,
      status = case when public.booking_alternative_offers.status = 'ACCEPTED' then 'ACCEPTED' else 'OPEN' end,
      rank = excluded.rank,
      score = excluded.score,
      reason = excluded.reason,
      expires_at = excluded.expires_at,
      updated_at = now();
  end loop;

  update public.bookings b
  set metadata = coalesce(b.metadata,'{}'::jsonb) || jsonb_build_object(
    'availability',
    coalesce(b.metadata->'availability','{}'::jsonb) || jsonb_build_object(
      'status','ORIGINAL_VEHICLE_BOOKED',
      'approvedBookingId',v_approved_id,
      'alternativeCount',v_rank,
      'updatedAt',now()
    )
  ), updated_at = now()
  where b.id = new.id;

  return new;
end;
$$;

revoke all on function private.seed_pending_booking_alternatives() from public, anon, authenticated;

drop trigger if exists booking_seed_alternatives_after_pending_insert on public.bookings;
create trigger booking_seed_alternatives_after_pending_insert
after insert on public.bookings
for each row
when (new.booking_type = 'RENTAL' and new.status = 'PENDING')
execute function private.seed_pending_booking_alternatives();

`;
    source = source.replace(anchor, sql + anchor);
  }
  write(path, source);
}

console.log('V163 pending-request architecture finalized.');
