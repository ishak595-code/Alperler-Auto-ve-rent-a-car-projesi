-- V243: hard-separate the super-admin runtime from customer profile/session state.
-- The fallback RPC derives its actor from the authenticated JWT and never accepts
-- a caller-supplied user id, so an authenticated customer cannot impersonate an admin.

create or replace function public.service_admin_operations_snapshot_self_v243()
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_catalog
as $$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null then
    raise exception 'UNAUTHORIZED';
  end if;

  return public.service_admin_operations_snapshot_v178(v_actor);
end;
$$;

revoke all on function public.service_admin_operations_snapshot_self_v243() from public;
revoke all on function public.service_admin_operations_snapshot_self_v243() from anon;
grant execute on function public.service_admin_operations_snapshot_self_v243() to authenticated;

comment on function public.service_admin_operations_snapshot_self_v243() is
  'V243 self-scoped super-admin operations snapshot. Actor is always auth.uid(); no caller-supplied actor is accepted.';
