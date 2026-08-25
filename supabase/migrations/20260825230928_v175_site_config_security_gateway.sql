-- V175 Site Configuration Security Gateway
-- All privileged site_settings writes move behind the authenticated V174 Edge gateway and service_role-only RPC.

create or replace function public.service_save_site_config_v175(
  p_actor uuid,
  p_value jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, auth, pg_temp
as $$
declare
  v_before jsonb;
  v_after jsonb;
begin
  if p_actor is null or not private.can_actor_manage_settings_v174(p_actor) then
    raise exception 'SETTINGS_PERMISSION_REQUIRED';
  end if;

  if p_value is null or jsonb_typeof(p_value) <> 'object' then
    raise exception 'SITE_CONFIG_OBJECT_REQUIRED';
  end if;

  if pg_column_size(p_value) > 220000 then
    raise exception 'SITE_CONFIG_PAYLOAD_TOO_LARGE';
  end if;

  select value into v_before
  from public.site_config
  where key = 'site_settings'
  for update;

  insert into public.site_config(key,value,is_public,updated_at)
  values ('site_settings',p_value,true,now())
  on conflict (key) do update
    set value=excluded.value,
        is_public=true,
        updated_at=now()
  returning value into v_after;

  insert into public.audit_logs(
    actor_user_id, action, entity_type, entity_id,
    before_data, after_data, event_meta
  ) values (
    p_actor,
    'SITE_CONFIG_UPDATED_V175',
    'SITE_CONFIG',
    'site_settings',
    v_before,
    v_after,
    jsonb_build_object('gateway','site-content-admin-gateway-v174','version','V175')
  );

  return jsonb_build_object('ok',true,'value',v_after);
end;
$$;

revoke all on function public.service_save_site_config_v175(uuid,jsonb) from public, anon, authenticated;
grant execute on function public.service_save_site_config_v175(uuid,jsonb) to service_role;
