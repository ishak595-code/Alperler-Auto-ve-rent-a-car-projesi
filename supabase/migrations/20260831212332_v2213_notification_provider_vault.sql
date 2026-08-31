create or replace function private.can_actor_manage_notification_provider_v2213(p_actor uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select exists(
    select 1
    from public.admin_users au
    where au.user_id = p_actor
      and au.is_active = true
      and (
        lower(coalesce(au.role,'')) in ('owner','admin')
        or coalesce(au.permissions,'{}'::jsonb) @> '{"finance.manage":true}'::jsonb
        or coalesce(au.permissions,'{}'::jsonb) @> '{"settings.manage":true}'::jsonb
      )
  );
$$;

revoke all on function private.can_actor_manage_notification_provider_v2213(uuid) from public, anon, authenticated;

create or replace function private.upsert_notification_vault_secret_v2213(
  p_name text,
  p_secret text,
  p_description text
) returns void
language plpgsql
security definer
set search_path = vault, pg_catalog
as $$
declare
  v_id uuid;
  v_secret text := btrim(coalesce(p_secret,''));
begin
  if p_name is null or p_name not like 'alperler.notification.%' then
    raise exception using errcode='22023', message='INVALID_NOTIFICATION_SECRET_NAME';
  end if;
  if length(v_secret) < 2 or length(v_secret) > 4096 then
    raise exception using errcode='22023', message='INVALID_NOTIFICATION_SECRET_VALUE';
  end if;

  select id into v_id
  from vault.secrets
  where name = p_name
  order by updated_at desc nulls last, created_at desc
  limit 1;

  if v_id is null then
    perform vault.create_secret(v_secret, p_name, left(coalesce(p_description,''),500), null);
  else
    perform vault.update_secret(v_id, v_secret, p_name, left(coalesce(p_description,''),500), null);
  end if;
end;
$$;

revoke all on function private.upsert_notification_vault_secret_v2213(text,text,text) from public, anon, authenticated;

create or replace function public.service_notification_provider_secret_status_v2213(p_actor uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, private, vault, pg_catalog
as $$
declare
  v_resend_key boolean;
  v_resend_from boolean;
  v_resend_admin boolean;
  v_resend_updated timestamptz;
  v_twilio_sid boolean;
  v_twilio_token boolean;
  v_twilio_from boolean;
  v_twilio_messaging boolean;
  v_twilio_updated timestamptz;
begin
  if p_actor is null or not private.can_actor_manage_notification_provider_v2213(p_actor) then
    raise exception using errcode='42501', message='FINANCE_ADMIN_REQUIRED';
  end if;

  select
    bool_or(name='alperler.notification.resend.api_key'),
    bool_or(name='alperler.notification.resend.mail_from'),
    bool_or(name='alperler.notification.resend.admin_to'),
    max(updated_at) filter (where name like 'alperler.notification.resend.%'),
    bool_or(name='alperler.notification.twilio.account_sid'),
    bool_or(name='alperler.notification.twilio.auth_token'),
    bool_or(name='alperler.notification.twilio.from'),
    bool_or(name='alperler.notification.twilio.messaging_service_sid'),
    max(updated_at) filter (where name like 'alperler.notification.twilio.%')
  into
    v_resend_key,v_resend_from,v_resend_admin,v_resend_updated,
    v_twilio_sid,v_twilio_token,v_twilio_from,v_twilio_messaging,v_twilio_updated
  from vault.secrets
  where name like 'alperler.notification.%';

  return jsonb_build_object(
    'resend', jsonb_build_object(
      'apiKeySet',coalesce(v_resend_key,false),
      'mailFromSet',coalesce(v_resend_from,false),
      'adminToSet',coalesce(v_resend_admin,false),
      'configured',coalesce(v_resend_key,false) and coalesce(v_resend_from,false),
      'updatedAt',v_resend_updated
    ),
    'twilio', jsonb_build_object(
      'accountSidSet',coalesce(v_twilio_sid,false),
      'authTokenSet',coalesce(v_twilio_token,false),
      'fromSet',coalesce(v_twilio_from,false),
      'messagingServiceSidSet',coalesce(v_twilio_messaging,false),
      'configured',coalesce(v_twilio_sid,false) and coalesce(v_twilio_token,false) and (coalesce(v_twilio_from,false) or coalesce(v_twilio_messaging,false)),
      'updatedAt',v_twilio_updated
    )
  );
end;
$$;

revoke all on function public.service_notification_provider_secret_status_v2213(uuid) from public, anon, authenticated;
grant execute on function public.service_notification_provider_secret_status_v2213(uuid) to service_role;

create or replace function public.service_set_notification_provider_secrets_v2213(
  p_actor uuid,
  p_provider text,
  p_payload jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public, private, auth, vault, pg_catalog
as $$
declare
  v_provider text := upper(btrim(coalesce(p_provider,'')));
  v_actor_email text;
  v_before jsonb;
  v_after jsonb;
  v_a text;
  v_b text;
  v_c text;
  v_d text;
begin
  if p_actor is null or not private.can_actor_manage_notification_provider_v2213(p_actor) then
    raise exception using errcode='42501', message='FINANCE_ADMIN_REQUIRED';
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception using errcode='22023', message='INVALID_NOTIFICATION_SECRET_PAYLOAD';
  end if;

  v_before := public.service_notification_provider_secret_status_v2213(p_actor);

  if v_provider='RESEND' then
    v_a := btrim(coalesce(p_payload->>'apiKey',''));
    v_b := btrim(coalesce(p_payload->>'mailFrom',''));
    v_c := btrim(coalesce(p_payload->>'adminTo',''));
    if length(v_a)<8 or length(v_b)<3 or position('@' in v_b)=0 then
      raise exception using errcode='22023', message='RESEND_SECRET_SET_INCOMPLETE';
    end if;
    if length(v_c)>0 and position('@' in v_c)=0 then
      raise exception using errcode='22023', message='INVALID_ADMIN_EMAIL';
    end if;
    perform private.upsert_notification_vault_secret_v2213('alperler.notification.resend.api_key',v_a,'Resend API key');
    perform private.upsert_notification_vault_secret_v2213('alperler.notification.resend.mail_from',v_b,'Verified Resend sender');
    if length(v_c)>0 then
      perform private.upsert_notification_vault_secret_v2213('alperler.notification.resend.admin_to',v_c,'Admin notification recipient');
    else
      delete from vault.secrets where name='alperler.notification.resend.admin_to';
    end if;
  elsif v_provider='TWILIO' then
    v_a := btrim(coalesce(p_payload->>'accountSid',''));
    v_b := btrim(coalesce(p_payload->>'authToken',''));
    v_c := btrim(coalesce(p_payload->>'from',''));
    v_d := btrim(coalesce(p_payload->>'messagingServiceSid',''));
    if length(v_a)<8 or length(v_b)<8 or (length(v_c)<3 and length(v_d)<8) then
      raise exception using errcode='22023', message='TWILIO_SECRET_SET_INCOMPLETE';
    end if;
    perform private.upsert_notification_vault_secret_v2213('alperler.notification.twilio.account_sid',v_a,'Twilio account SID');
    perform private.upsert_notification_vault_secret_v2213('alperler.notification.twilio.auth_token',v_b,'Twilio auth token');
    if length(v_c)>=3 then
      perform private.upsert_notification_vault_secret_v2213('alperler.notification.twilio.from',v_c,'Twilio sender number');
    else
      delete from vault.secrets where name='alperler.notification.twilio.from';
    end if;
    if length(v_d)>=8 then
      perform private.upsert_notification_vault_secret_v2213('alperler.notification.twilio.messaging_service_sid',v_d,'Twilio Messaging Service SID');
    else
      delete from vault.secrets where name='alperler.notification.twilio.messaging_service_sid';
    end if;
  else
    raise exception using errcode='22023', message='INVALID_NOTIFICATION_PROVIDER';
  end if;

  v_after := public.service_notification_provider_secret_status_v2213(p_actor);
  select lower(coalesce(au.email,u.email)) into v_actor_email
  from public.admin_users au left join auth.users u on u.id=au.user_id
  where au.user_id=p_actor limit 1;

  insert into public.audit_logs(actor_user_id,actor_email,action,entity_type,entity_id,before_data,after_data,event_meta)
  values(
    p_actor,v_actor_email,'notification_provider_secret_rotated_v2213','notification_provider_secret',lower(v_provider),
    jsonb_build_object('provider',v_provider,'status',v_before),
    jsonb_build_object('provider',v_provider,'status',v_after),
    jsonb_build_object('gateway','finance-admin-v2213','secret_values_logged',false)
  );

  return v_after;
end;
$$;

revoke all on function public.service_set_notification_provider_secrets_v2213(uuid,text,jsonb) from public, anon, authenticated;
grant execute on function public.service_set_notification_provider_secrets_v2213(uuid,text,jsonb) to service_role;

create or replace function public.service_clear_notification_provider_secrets_v2213(
  p_actor uuid,
  p_provider text
) returns jsonb
language plpgsql
security definer
set search_path = public, private, auth, vault, pg_catalog
as $$
declare
  v_provider text := upper(btrim(coalesce(p_provider,'')));
  v_actor_email text;
  v_before jsonb;
  v_after jsonb;
begin
  if p_actor is null or not private.can_actor_manage_notification_provider_v2213(p_actor) then
    raise exception using errcode='42501', message='FINANCE_ADMIN_REQUIRED';
  end if;
  v_before := public.service_notification_provider_secret_status_v2213(p_actor);

  if v_provider='RESEND' then
    delete from vault.secrets where name like 'alperler.notification.resend.%';
  elsif v_provider='TWILIO' then
    delete from vault.secrets where name like 'alperler.notification.twilio.%';
  else
    raise exception using errcode='22023', message='INVALID_NOTIFICATION_PROVIDER';
  end if;

  v_after := public.service_notification_provider_secret_status_v2213(p_actor);
  select lower(coalesce(au.email,u.email)) into v_actor_email
  from public.admin_users au left join auth.users u on u.id=au.user_id
  where au.user_id=p_actor limit 1;

  insert into public.audit_logs(actor_user_id,actor_email,action,entity_type,entity_id,before_data,after_data,event_meta)
  values(
    p_actor,v_actor_email,'notification_provider_secret_cleared_v2213','notification_provider_secret',lower(v_provider),
    jsonb_build_object('provider',v_provider,'status',v_before),
    jsonb_build_object('provider',v_provider,'status',v_after),
    jsonb_build_object('gateway','finance-admin-v2213','secret_values_logged',false)
  );
  return v_after;
end;
$$;

revoke all on function public.service_clear_notification_provider_secrets_v2213(uuid,text) from public, anon, authenticated;
grant execute on function public.service_clear_notification_provider_secrets_v2213(uuid,text) to service_role;

create or replace function public.service_notification_provider_credentials_v2213(p_provider text)
returns jsonb
language plpgsql
security definer
set search_path = public, vault, pg_catalog
as $$
declare
  v_provider text := upper(btrim(coalesce(p_provider,'')));
  v_a text;
  v_b text;
  v_c text;
  v_d text;
begin
  if v_provider='RESEND' then
    select decrypted_secret into v_a from vault.decrypted_secrets where name='alperler.notification.resend.api_key' order by updated_at desc nulls last limit 1;
    select decrypted_secret into v_b from vault.decrypted_secrets where name='alperler.notification.resend.mail_from' order by updated_at desc nulls last limit 1;
    select decrypted_secret into v_c from vault.decrypted_secrets where name='alperler.notification.resend.admin_to' order by updated_at desc nulls last limit 1;
    return jsonb_build_object('provider','RESEND','apiKey',v_a,'mailFrom',v_b,'adminTo',v_c,'configured',coalesce(length(v_a)>0,false) and coalesce(length(v_b)>0,false));
  elsif v_provider='TWILIO' then
    select decrypted_secret into v_a from vault.decrypted_secrets where name='alperler.notification.twilio.account_sid' order by updated_at desc nulls last limit 1;
    select decrypted_secret into v_b from vault.decrypted_secrets where name='alperler.notification.twilio.auth_token' order by updated_at desc nulls last limit 1;
    select decrypted_secret into v_c from vault.decrypted_secrets where name='alperler.notification.twilio.from' order by updated_at desc nulls last limit 1;
    select decrypted_secret into v_d from vault.decrypted_secrets where name='alperler.notification.twilio.messaging_service_sid' order by updated_at desc nulls last limit 1;
    return jsonb_build_object('provider','TWILIO','accountSid',v_a,'authToken',v_b,'from',v_c,'messagingServiceSid',v_d,'configured',coalesce(length(v_a)>0,false) and coalesce(length(v_b)>0,false) and (coalesce(length(v_c)>0,false) or coalesce(length(v_d)>0,false)));
  end if;
  return jsonb_build_object('provider','NONE','configured',false);
end;
$$;

revoke all on function public.service_notification_provider_credentials_v2213(text) from public, anon, authenticated;
grant execute on function public.service_notification_provider_credentials_v2213(text) to service_role;
