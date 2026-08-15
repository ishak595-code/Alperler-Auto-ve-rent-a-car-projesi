begin;

create table if not exists public.system_events (
  id bigint generated always as identity primary key,
  severity text not null check (severity in ('INFO','WARN','ERROR','CRITICAL')),
  source text not null check (char_length(source) between 2 and 80),
  code text not null check (char_length(code) between 2 and 120),
  message text not null check (char_length(message) between 1 and 500),
  route text,
  fingerprint text not null unique check (char_length(fingerprint) between 16 and 128),
  occurrence_count integer not null default 1 check (occurrence_count > 0),
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  auto_recovered boolean not null default false,
  recovery_action text,
  release_sha text,
  client_family text,
  details jsonb not null default '{}'::jsonb,
  constraint system_events_route_length check (route is null or char_length(route) <= 300),
  constraint system_events_recovery_length check (recovery_action is null or char_length(recovery_action) <= 200),
  constraint system_events_release_length check (release_sha is null or char_length(release_sha) <= 80),
  constraint system_events_client_family_length check (client_family is null or char_length(client_family) <= 80)
);

create index if not exists system_events_unresolved_last_seen_idx on public.system_events (last_seen desc) where resolved_at is null;
create index if not exists system_events_severity_last_seen_idx on public.system_events (severity, last_seen desc);
create index if not exists system_events_source_last_seen_idx on public.system_events (source, last_seen desc);

alter table public.system_events enable row level security;

drop policy if exists system_events_admin_read on public.system_events;
create policy system_events_admin_read on public.system_events for select to authenticated
  using (private.can_manage_operations() or private.can_manage_settings());

drop policy if exists system_events_admin_update on public.system_events;
create policy system_events_admin_update on public.system_events for update to authenticated
  using (private.can_manage_operations() or private.can_manage_settings())
  with check (private.can_manage_operations() or private.can_manage_settings());

create or replace function public.record_system_event(
  p_severity text,
  p_source text,
  p_code text,
  p_message text,
  p_route text,
  p_fingerprint text,
  p_auto_recovered boolean default false,
  p_recovery_action text default null,
  p_release_sha text default null,
  p_client_family text default null,
  p_details jsonb default '{}'::jsonb
)
returns bigint
language plpgsql
security definer
set search_path = 'pg_catalog', 'public', 'pg_temp'
as $$
declare
  v_id bigint;
  v_severity text := upper(left(coalesce(p_severity, 'ERROR'), 16));
  v_source text := left(coalesce(nullif(btrim(p_source), ''), 'client'), 80);
  v_code text := left(coalesce(nullif(btrim(p_code), ''), 'UNKNOWN_ERROR'), 120);
  v_message text := left(coalesce(nullif(btrim(p_message), ''), 'Unknown system error'), 500);
  v_route text := nullif(left(coalesce(p_route, ''), 300), '');
  v_fingerprint text := left(coalesce(nullif(btrim(p_fingerprint), ''), md5(v_source || ':' || v_code || ':' || v_message)), 128);
  v_recovery text := nullif(left(coalesce(p_recovery_action, ''), 200), '');
  v_release text := nullif(left(coalesce(p_release_sha, ''), 80), '');
  v_client text := nullif(left(coalesce(p_client_family, ''), 80), '');
  v_details jsonb := case when p_details is null or jsonb_typeof(p_details) <> 'object' then '{}'::jsonb else p_details end;
begin
  if v_severity not in ('INFO','WARN','ERROR','CRITICAL') then v_severity := 'ERROR'; end if;

  insert into public.system_events (
    severity, source, code, message, route, fingerprint,
    auto_recovered, recovery_action, release_sha, client_family, details
  ) values (
    v_severity, v_source, v_code, v_message, v_route, v_fingerprint,
    coalesce(p_auto_recovered, false), v_recovery, v_release, v_client, v_details
  )
  on conflict (fingerprint) do update
  set severity = excluded.severity,
      source = excluded.source,
      code = excluded.code,
      message = excluded.message,
      route = coalesce(excluded.route, public.system_events.route),
      occurrence_count = public.system_events.occurrence_count + 1,
      last_seen = now(),
      auto_recovered = excluded.auto_recovered or public.system_events.auto_recovered,
      recovery_action = coalesce(excluded.recovery_action, public.system_events.recovery_action),
      release_sha = coalesce(excluded.release_sha, public.system_events.release_sha),
      client_family = coalesce(excluded.client_family, public.system_events.client_family),
      details = public.system_events.details || excluded.details,
      resolved_at = null,
      resolved_by = null
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.record_system_event(text,text,text,text,text,text,boolean,text,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.record_system_event(text,text,text,text,text,text,boolean,text,text,text,jsonb) to service_role;

insert into public.site_config (key, value, is_public, updated_at)
values (
  'runtime_controls',
  jsonb_build_object(
    'maintenanceMode', false,
    'readOnlyMode', false,
    'allowBookings', true,
    'allowAppointments', true,
    'allowContact', true,
    'allowPartnerRequests', true,
    'maintenanceTitle', 'Kısa bir bakım çalışması yapıyoruz',
    'maintenanceMessage', 'Hizmeti daha iyi hale getirmek için kısa süreli bakım yapıyoruz. Lütfen biraz sonra tekrar deneyin.',
    'statusMessage', '',
    'updatedByAdmin', false
  ),
  true,
  now()
)
on conflict (key) do nothing;

-- Service-role-only decision point used by public transactional Edge Functions.
-- The UI may be bypassed, so maintenance/read-only rules must also be enforced
-- on the server. Unknown operation names fail closed.
create or replace function public.runtime_operation_allowed(p_operation text)
returns boolean
language plpgsql
stable
security definer
set search_path = 'pg_catalog', 'public'
as $$
declare
  v jsonb;
  op text := upper(left(coalesce(p_operation, ''), 40));
begin
  select value into v from public.site_config where key = 'runtime_controls' limit 1;
  if v is null then return true; end if;
  if coalesce((v->>'maintenanceMode')::boolean, false) then return false; end if;

  if op = 'BOOKING' then
    if coalesce((v->>'readOnlyMode')::boolean, false) then return false; end if;
    return coalesce((v->>'allowBookings')::boolean, true);
  elsif op = 'APPOINTMENT' then
    if coalesce((v->>'readOnlyMode')::boolean, false) then return false; end if;
    return coalesce((v->>'allowAppointments')::boolean, true);
  elsif op = 'PARTNER_REQUEST' then
    if coalesce((v->>'readOnlyMode')::boolean, false) then return false; end if;
    return coalesce((v->>'allowPartnerRequests')::boolean, true);
  elsif op = 'CONTACT' then
    return coalesce((v->>'allowContact')::boolean, true);
  end if;

  return false;
end;
$$;

revoke all on function public.runtime_operation_allowed(text) from public, anon, authenticated;
grant execute on function public.runtime_operation_allowed(text) to service_role;

commit;
