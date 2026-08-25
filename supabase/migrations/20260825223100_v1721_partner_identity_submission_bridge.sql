-- V172.1 Service-only bridge for customer-submitted private vehicle identifiers.
-- The Edge Function already owns abuse prevention, idempotency and request validation.
-- Sensitive values never enter public.partner_requests.

create or replace function public.service_attach_partner_request_identity_v172(
  p_partner_request_id uuid,
  p_license_plate text default null,
  p_vin text default null,
  p_registration_reference text default null,
  p_ownership_confirmed boolean default false
)
returns void
language plpgsql
security definer
set search_path=public,private,pg_catalog
as $$
declare
  plate text:=nullif(upper(regexp_replace(coalesce(p_license_plate,''),'[^A-Za-z0-9]','','g')),'');
  vin_value text:=nullif(upper(regexp_replace(coalesce(p_vin,''),'[^A-HJ-NPR-Z0-9]','','g')),'');
  reg_ref text:=nullif(left(btrim(coalesce(p_registration_reference,'')),80),'');
begin
  if not exists(select 1 from public.partner_requests where id=p_partner_request_id) then
    raise exception using errcode='P0002',message='PARTNER_REQUEST_NOT_FOUND';
  end if;
  if plate is not null and char_length(plate) not between 5 and 12 then raise exception using errcode='23514',message='INVALID_LICENSE_PLATE'; end if;
  if vin_value is not null and char_length(vin_value)<>17 then raise exception using errcode='23514',message='INVALID_VIN'; end if;
  if plate is null and vin_value is null and reg_ref is null and not coalesce(p_ownership_confirmed,false) then return; end if;

  insert into private.partner_request_vehicle_identity(partner_request_id,license_plate,vin,registration_reference,ownership_confirmed,updated_by)
  values(p_partner_request_id,plate,vin_value,reg_ref,coalesce(p_ownership_confirmed,false),null)
  on conflict(partner_request_id) do update set
    license_plate=excluded.license_plate,
    vin=excluded.vin,
    registration_reference=excluded.registration_reference,
    ownership_confirmed=excluded.ownership_confirmed,
    updated_at=now(),
    updated_by=null;

  insert into public.audit_logs(action,entity_type,entity_id,event_meta)
  select 'PARTNER_VEHICLE_IDENTITY_SUBMITTED','partner_request',r.reference,
         jsonb_build_object('source','partner_request_gateway_v172','plate_set',plate is not null,'vin_set',vin_value is not null,'registration_reference_set',reg_ref is not null,'ownership_confirmed',coalesce(p_ownership_confirmed,false))
  from public.partner_requests r where r.id=p_partner_request_id;
end;
$$;
revoke all on function public.service_attach_partner_request_identity_v172(uuid,text,text,text,boolean) from public,anon,authenticated;
grant execute on function public.service_attach_partner_request_identity_v172(uuid,text,text,text,boolean) to service_role;

comment on function public.service_attach_partner_request_identity_v172(uuid,text,text,text,boolean) is
'V172.1 service-role-only bridge used by the hardened partner Edge Function. Sensitive identity values remain in private schema.';