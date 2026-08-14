create table public.api_rate_limits (
  key_hash text not null,
  scope text not null,
  window_start timestamptz not null,
  request_count integer not null default 1 check (request_count > 0),
  updated_at timestamptz not null default now(),
  primary key (key_hash, scope, window_start)
);

alter table public.api_rate_limits enable row level security;
create index api_rate_limits_cleanup_idx on public.api_rate_limits (window_start);

create or replace function private.consume_rate_limit(
  p_key_hash text,
  p_scope text,
  p_window_seconds integer,
  p_limit integer
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_window timestamptz;
  v_count integer;
begin
  if p_window_seconds < 1 or p_limit < 1 then
    return false;
  end if;
  v_window := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  insert into public.api_rate_limits(key_hash, scope, window_start, request_count, updated_at)
  values (p_key_hash, p_scope, v_window, 1, now())
  on conflict (key_hash, scope, window_start)
  do update set request_count = public.api_rate_limits.request_count + 1, updated_at = now()
  returning request_count into v_count;
  return v_count <= p_limit;
end;
$$;
revoke all on function private.consume_rate_limit(text,text,integer,integer) from public, anon, authenticated;