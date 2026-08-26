begin;

-- V177.1: remove the legacy browser-executable branch lifecycle and vehicle
-- registry RPCs only after the V177 service gateway has been deployed and the
-- frontend cutover has reached production.
--
-- Historical migrations remain immutable. This migration is the auditable,
-- portable cutover that makes a fresh database converge to the hardened state.

do $$
begin
  if to_regprocedure('public.service_set_branch_lifecycle_v177(uuid,uuid,text,text)') is null
     or to_regprocedure('public.service_search_vehicle_registry_v177(uuid,text,uuid,timestamp with time zone,timestamp with time zone,integer)') is null
     or to_regprocedure('public.service_upsert_vehicle_registry_v177(uuid,uuid,text,text,text)') is null then
    raise exception 'V177_SERVICE_GATEWAY_REQUIRED';
  end if;
end
$$;

revoke all on function public.admin_set_branch_lifecycle_v1718(uuid, text, text)
  from public, anon, authenticated;
revoke all on function public.admin_search_vehicle_registry_v1718(text, uuid, timestamp with time zone, timestamp with time zone, integer)
  from public, anon, authenticated;
revoke all on function public.admin_upsert_vehicle_registry_v1718(uuid, text, text, text)
  from public, anon, authenticated;

drop function if exists public.admin_set_branch_lifecycle_v1718(uuid, text, text);
drop function if exists public.admin_search_vehicle_registry_v1718(text, uuid, timestamp with time zone, timestamp with time zone, integer);
drop function if exists public.admin_upsert_vehicle_registry_v1718(uuid, text, text, text);

commit;
