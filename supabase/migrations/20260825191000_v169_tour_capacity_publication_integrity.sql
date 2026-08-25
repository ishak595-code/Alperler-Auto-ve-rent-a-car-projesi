-- V169 Tour Showcase + Capacity Integrity
-- APPROVED tour bookings consume seats. PENDING requests never block capacity.
-- Published tours must contain the customer-facing fields rendered by the V169 showcase/detail.

create index if not exists bookings_tour_approved_day_v169_idx
  on public.bookings (tour_id, start_at)
  where booking_type='TOUR' and status='APPROVED' and deleted_at is null;

create or replace function private.tour_approved_people_v169(
  p_tour_id uuid,
  p_tour_day date,
  p_exclude_booking uuid default null
)
returns integer
language sql
stable
security definer
set search_path=public,pg_catalog,private
as $$
  select coalesce(sum(coalesce(b.person_count,0)),0)::integer
  from public.bookings b
  where b.booking_type='TOUR'
    and b.tour_id=p_tour_id
    and b.status='APPROVED'
    and b.deleted_at is null
    and b.start_at is not null
    and (b.start_at at time zone 'Europe/Istanbul')::date=p_tour_day
    and (p_exclude_booking is null or b.id<>p_exclude_booking);
$$;

revoke all on function private.tour_approved_people_v169(uuid,date,uuid) from public,anon,authenticated;
grant execute on function private.tour_approved_people_v169(uuid,date,uuid) to service_role;

create or replace function public.tour_availability_v169(
  p_tour_identifier text,
  p_tour_date date
)
returns jsonb
language plpgsql
stable
security definer
set search_path=public,pg_catalog,private
as $$
declare
  v_tour public.tours%rowtype;
  v_approved integer:=0;
  v_pending integer:=0;
  v_remaining integer:=0;
begin
  if p_tour_date is null then
    raise exception using errcode='22023',message='TOUR_DATE_REQUIRED';
  end if;

  select t.* into v_tour
  from public.tours t
  where (t.id::text=btrim(coalesce(p_tour_identifier,'')) or t.seo_slug=btrim(coalesce(p_tour_identifier,'')))
  limit 1;

  if v_tour.id is null then
    raise exception using errcode='P0002',message='TOUR_NOT_FOUND';
  end if;

  v_approved:=private.tour_approved_people_v169(v_tour.id,p_tour_date,null);
  select coalesce(sum(coalesce(b.person_count,0)),0)::integer into v_pending
  from public.bookings b
  where b.booking_type='TOUR'
    and b.tour_id=v_tour.id
    and b.status='PENDING'
    and b.deleted_at is null
    and b.start_at is not null
    and (b.start_at at time zone 'Europe/Istanbul')::date=p_tour_date;

  v_remaining:=greatest(coalesce(v_tour.capacity,0)-v_approved,0);

  return jsonb_build_object(
    'tourId',v_tour.id,
    'date',p_tour_date,
    'publicationStatus',v_tour.publication_status,
    'isActive',v_tour.is_active,
    'capacity',coalesce(v_tour.capacity,0),
    'approvedPeople',v_approved,
    'pendingPeople',v_pending,
    'remainingSeats',v_remaining,
    'available',v_tour.publication_status='PUBLISHED' and v_tour.is_active is true and v_remaining>0,
    'pendingBlocksCapacity',false
  );
end;
$$;

revoke all on function public.tour_availability_v169(text,date) from public;
grant execute on function public.tour_availability_v169(text,date) to anon,authenticated,service_role;
comment on function public.tour_availability_v169(text,date) is
'V169 public seat availability. Only APPROVED bookings consume tour capacity; PENDING requests are informational.';

create or replace function public.enforce_tour_publication_integrity_v169()
returns trigger
language plpgsql
set search_path=public,pg_catalog
as $$
begin
  if new.publication_status not in ('PUBLISHED','SCHEDULED') then return new; end if;

  if coalesce(trim(new.duration),'')='' then
    raise exception using errcode='23514',message='TOUR_PUBLICATION_BLOCKED:DURATION_REQUIRED';
  end if;
  if coalesce(new.capacity,0)<1 or new.capacity>1000 then
    raise exception using errcode='23514',message='TOUR_PUBLICATION_BLOCKED:CAPACITY_REQUIRED';
  end if;
  if coalesce(trim(new.meeting_point),'')='' then
    raise exception using errcode='23514',message='TOUR_PUBLICATION_BLOCKED:MEETING_POINT_REQUIRED';
  end if;
  if coalesce(upper(trim(new.currency)),'TRY')<>'TRY' then
    raise exception using errcode='23514',message='TOUR_PUBLICATION_BLOCKED:CURRENCY_MUST_BE_TRY';
  end if;
  if jsonb_typeof(coalesce(new.itinerary,'[]'::jsonb))<>'array' or jsonb_array_length(coalesce(new.itinerary,'[]'::jsonb))<1 then
    raise exception using errcode='23514',message='TOUR_PUBLICATION_BLOCKED:ITINERARY_REQUIRED';
  end if;
  if jsonb_typeof(coalesce(new.included_items,'[]'::jsonb))<>'array' or jsonb_array_length(coalesce(new.included_items,'[]'::jsonb))<1 then
    raise exception using errcode='23514',message='TOUR_PUBLICATION_BLOCKED:INCLUDED_ITEMS_REQUIRED';
  end if;
  if jsonb_typeof(coalesce(new.excluded_items,'[]'::jsonb))<>'array' or jsonb_array_length(coalesce(new.excluded_items,'[]'::jsonb))<1 then
    raise exception using errcode='23514',message='TOUR_PUBLICATION_BLOCKED:EXCLUDED_ITEMS_REQUIRED';
  end if;
  return new;
end;
$$;

drop trigger if exists tours_publication_integrity_v169 on public.tours;
create trigger tours_publication_integrity_v169
before insert or update of publication_status,duration,capacity,meeting_point,currency,itinerary,included_items,excluded_items
on public.tours
for each row execute function public.enforce_tour_publication_integrity_v169();

create or replace function public.admin_approve_booking(p_booking_id uuid,p_request_id text default null::text)
returns jsonb
language plpgsql
security definer
set search_path=public,auth,pg_catalog,private
as $$
declare
  v_booking public.bookings%rowtype;
  v_actor uuid:=auth.uid();
  v_actor_email text;
  v_conflicts integer:=0;
  v_offers integer:=0;
  v_tour_capacity integer:=0;
  v_tour_approved integer:=0;
  v_tour_remaining integer:=0;
  v_tour_day date;
  v_tour_active boolean:=false;
  v_tour_publication text:='';
begin
  if v_actor is null or not private.can_manage_operations() then raise exception using errcode='42501',message='FORBIDDEN'; end if;
  select b.* into v_booking from public.bookings b where b.id=p_booking_id and b.deleted_at is null for update;
  if v_booking.id is null then raise exception using errcode='P0002',message='BOOKING_NOT_FOUND'; end if;
  if v_booking.status='APPROVED' then return jsonb_build_object('bookingId',v_booking.id,'reference',v_booking.reference,'alreadyApproved',true,'conflictCount',0,'alternativeOfferCount',0); end if;

  if v_booking.booking_type='RENTAL' then
    if v_booking.vehicle_id is null or v_booking.start_at is null or v_booking.end_at is null or v_booking.end_at<=v_booking.start_at then raise exception using errcode='22023',message='INVALID_RENTAL_DATES'; end if;
    perform pg_advisory_xact_lock(hashtextextended(v_booking.vehicle_id::text,163));
    if private.rental_has_approved_overlap(v_booking.vehicle_id,v_booking.start_at,v_booking.end_at,v_booking.id) then raise exception using errcode='23P01',message='VEHICLE_UNAVAILABLE'; end if;
  elsif v_booking.booking_type='TOUR' then
    if v_booking.tour_id is null or v_booking.start_at is null or coalesce(v_booking.person_count,0)<1 then raise exception using errcode='22023',message='INVALID_TOUR_BOOKING'; end if;
    v_tour_day:=(v_booking.start_at at time zone 'Europe/Istanbul')::date;
    perform pg_advisory_xact_lock(hashtextextended(v_booking.tour_id::text||'|'||v_tour_day::text,169));
    select coalesce(t.capacity,0),t.is_active,coalesce(t.publication_status,'') into v_tour_capacity,v_tour_active,v_tour_publication
    from public.tours t where t.id=v_booking.tour_id for share;
    if v_tour_capacity<1 or v_tour_active is not true or v_tour_publication<>'PUBLISHED' then raise exception using errcode='22023',message='INVALID_TOUR'; end if;
    v_tour_approved:=private.tour_approved_people_v169(v_booking.tour_id,v_tour_day,v_booking.id);
    if v_tour_approved+v_booking.person_count>v_tour_capacity then raise exception using errcode='23514',message='TOUR_CAPACITY_EXCEEDED'; end if;
    v_tour_remaining:=greatest(v_tour_capacity-v_tour_approved-v_booking.person_count,0);
  end if;

  update public.bookings set status='APPROVED',updated_at=now() where id=v_booking.id;

  if v_booking.booking_type='RENTAL' then
    select count(*) into v_conflicts from public.bookings b where b.id<>v_booking.id and b.vehicle_id=v_booking.vehicle_id and b.booking_type='RENTAL' and b.status='PENDING' and b.deleted_at is null and b.start_at<v_booking.end_at and b.end_at>v_booking.start_at;
    select count(*) into v_offers from public.booking_alternative_offers o where o.approved_booking_id=v_booking.id and o.status in ('OPEN','OFFERED','ACCEPTED');
  elsif v_booking.booking_type='TOUR' then
    select count(*) into v_conflicts from public.bookings b
    where b.id<>v_booking.id and b.tour_id=v_booking.tour_id and b.booking_type='TOUR' and b.status='PENDING' and b.deleted_at is null and b.start_at is not null and (b.start_at at time zone 'Europe/Istanbul')::date=v_tour_day;
  end if;

  select lower(u.email) into v_actor_email from auth.users u where u.id=v_actor;
  insert into public.audit_logs(actor_user_id,actor_email,action,entity_type,entity_id,before_data,after_data,request_id,event_meta)
  values(v_actor,v_actor_email,'booking_approved_atomic','booking',v_booking.reference,jsonb_build_object('status',v_booking.status),jsonb_build_object('status','APPROVED'),left(nullif(btrim(coalesce(p_request_id,'')),''),80),jsonb_build_object('conflictCount',v_conflicts,'alternativeOfferCount',v_offers,'tourRemainingSeats',case when v_booking.booking_type='TOUR' then v_tour_remaining else null end));

  return jsonb_build_object('bookingId',v_booking.id,'reference',v_booking.reference,'alreadyApproved',false,'conflictCount',v_conflicts,'alternativeOfferCount',v_offers,'tourRemainingSeats',case when v_booking.booking_type='TOUR' then v_tour_remaining else null end);
exception when exclusion_violation then raise exception using errcode='23P01',message='VEHICLE_UNAVAILABLE';
end;
$$;

comment on function public.admin_approve_booking(uuid,text) is
'V169 atomic approval. RENTAL uses approved overlap; TOUR uses approved seat totals for the selected local day. PENDING never consumes inventory.';
