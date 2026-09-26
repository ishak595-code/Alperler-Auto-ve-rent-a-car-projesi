-- V253: media upload abuse guard (per-user signing rate limit, daily byte quota, R2 bucket growth
-- guard, Cloudinary monthly cap). Only the Vercel signing API (service_role) can call the RPCs.

create schema if not exists private;

create table if not exists private.media_upload_events_v253 (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  provider text not null check (provider in ('r2', 'cloudinary')),
  bytes bigint not null check (bytes >= 0),
  files integer not null default 1 check (files >= 0),
  created_at timestamptz not null default now()
);
create index if not exists media_upload_events_v253_user_time on private.media_upload_events_v253 (user_id, created_at desc);
create index if not exists media_upload_events_v253_provider_time on private.media_upload_events_v253 (provider, created_at desc);
alter table private.media_upload_events_v253 enable row level security;

create table if not exists private.media_storage_usage_v253 (
  provider text primary key check (provider in ('r2', 'cloudinary')),
  bytes bigint not null default 0,
  objects integer not null default 0,
  complete boolean not null default true,
  measured_at timestamptz not null default now()
);
alter table private.media_storage_usage_v253 enable row level security;

revoke all on private.media_upload_events_v253, private.media_storage_usage_v253 from public, anon, authenticated;

-- Returns whether the bucket measurement is older than an hour (the API then re-lists R2 once).
create or replace function public.media_storage_status_v253(p_provider text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'bytes', coalesce(u.bytes, 0),
    'measured_at', u.measured_at,
    'stale', u.measured_at is null or u.measured_at < now() - interval '1 hour'
  )
  from (select 1) one
  left join private.media_storage_usage_v253 u on u.provider = p_provider;
$$;

create or replace function public.media_storage_measure_v253(p_provider text, p_bytes bigint, p_objects integer, p_complete boolean)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  insert into private.media_storage_usage_v253 (provider, bytes, objects, complete, measured_at)
  values (p_provider, greatest(p_bytes, 0), greatest(p_objects, 0), coalesce(p_complete, true), now())
  on conflict (provider) do update
    set bytes = excluded.bytes, objects = excluded.objects, complete = excluded.complete, measured_at = excluded.measured_at;
$$;

create or replace function public.media_upload_reserve_v253(
  p_user uuid,
  p_provider text,
  p_bytes bigint,
  p_files integer,
  p_hourly_limit integer default 60,
  p_daily_bytes bigint default 3000000000,
  p_storage_limit bigint default 9000000000,
  p_monthly_bytes bigint default 5000000000
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_hour_count integer;
  v_day_bytes bigint;
  v_usage private.media_storage_usage_v253%rowtype;
  v_pending bigint;
  v_month_bytes bigint;
begin
  if p_user is null or p_provider not in ('r2', 'cloudinary') or p_bytes is null or p_bytes < 0 then
    return jsonb_build_object('ok', false, 'code', 'INVALID_MEDIA_RESERVATION');
  end if;

  -- Serialise reservations per user so parallel requests cannot race past the limits.
  perform pg_advisory_xact_lock(hashtextextended('media_upload_v253:' || p_user::text, 0));

  select count(*) into v_hour_count
  from private.media_upload_events_v253
  where user_id = p_user and created_at > now() - interval '1 hour';
  if v_hour_count >= p_hourly_limit then
    return jsonb_build_object('ok', false, 'code', 'MEDIA_UPLOAD_RATE_LIMITED', 'retryAfterSeconds', 900);
  end if;

  select coalesce(sum(bytes), 0) into v_day_bytes
  from private.media_upload_events_v253
  where user_id = p_user and created_at > now() - interval '1 day';
  if v_day_bytes + p_bytes > p_daily_bytes then
    return jsonb_build_object('ok', false, 'code', 'MEDIA_DAILY_QUOTA', 'retryAfterSeconds', 3600);
  end if;

  if p_provider = 'r2' then
    select * into v_usage from private.media_storage_usage_v253 where provider = 'r2';
    -- Everything signed since the last measurement counts as stored (pessimistic).
    select coalesce(sum(bytes), 0) into v_pending
    from private.media_upload_events_v253
    where provider = 'r2' and created_at >= coalesce(v_usage.measured_at, now() - interval '2 hours');
    if coalesce(v_usage.bytes, 0) + v_pending + p_bytes > p_storage_limit then
      return jsonb_build_object('ok', false, 'code', 'MEDIA_STORAGE_FULL');
    end if;
  else
    select coalesce(sum(bytes), 0) into v_month_bytes
    from private.media_upload_events_v253
    where provider = 'cloudinary' and created_at >= date_trunc('month', now());
    if v_month_bytes + p_bytes > p_monthly_bytes then
      return jsonb_build_object('ok', false, 'code', 'CLOUDINARY_MONTHLY_QUOTA');
    end if;
  end if;

  insert into private.media_upload_events_v253 (user_id, provider, bytes, files)
  values (p_user, p_provider, p_bytes, greatest(coalesce(p_files, 1), 0));

  -- Cheap retention (the table stays tiny: at most 60 rows per user per hour).
  delete from private.media_upload_events_v253 where created_at < now() - interval '40 days';

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.media_storage_status_v253(text) from public, anon, authenticated;
revoke all on function public.media_storage_measure_v253(text, bigint, integer, boolean) from public, anon, authenticated;
revoke all on function public.media_upload_reserve_v253(uuid, text, bigint, integer, integer, bigint, bigint, bigint) from public, anon, authenticated;
grant execute on function public.media_storage_status_v253(text) to service_role;
grant execute on function public.media_storage_measure_v253(text, bigint, integer, boolean) to service_role;
grant execute on function public.media_upload_reserve_v253(uuid, text, bigint, integer, integer, bigint, bigint, bigint) to service_role;
grant usage on schema private to service_role;
grant select, insert, update, delete on private.media_upload_events_v253, private.media_storage_usage_v253 to service_role;
