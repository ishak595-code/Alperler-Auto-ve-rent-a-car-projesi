create or replace function private.upsert_payment_provider_vault_secret_v221(
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
  if p_name is null or p_name not like 'alperler.payment.%' then
    raise exception using errcode='22023', message='INVALID_PAYMENT_SECRET_NAME';
  end if;
  if length(v_secret) < 3 or length(v_secret) > 4096 then
    raise exception using errcode='22023', message='INVALID_PAYMENT_SECRET_VALUE';
  end if;

  select id into v_id
  from vault.secrets
  where name=p_name
  order by updated_at desc nulls last, created_at desc
  limit 1;

  if v_id is null then
    perform vault.create_secret(v_secret, p_name, left(coalesce(p_description,''),500), null);
  else
    perform vault.update_secret(v_id, v_secret, p_name, left(coalesce(p_description,''),500), null);
  end if;
end;
$$;

revoke all on function private.upsert_payment_provider_vault_secret_v221(text,text,text) from public, anon, authenticated;

create or replace function public.service_payment_provider_secret_status_v221(p_actor uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, private, auth, vault, pg_catalog
as $$
declare
  v_paytr_id boolean;
  v_paytr_key boolean;
  v_paytr_salt boolean;
  v_sandbox_key boolean;
  v_sandbox_secret boolean;
  v_live_key boolean;
  v_live_secret boolean;
  v_paytr_updated timestamptz;
  v_sandbox_updated timestamptz;
  v_live_updated timestamptz;
begin
  if p_actor is null or not private.can_actor_manage_settings_v174(p_actor) then
    raise exception using errcode='42501', message='SETTINGS_PERMISSION_REQUIRED';
  end if;

  select
    bool_or(name='alperler.payment.paytr.merchant_id'),
    bool_or(name='alperler.payment.paytr.merchant_key'),
    bool_or(name='alperler.payment.paytr.merchant_salt'),
    max(updated_at) filter (where name like 'alperler.payment.paytr.%'),
    bool_or(name='alperler.payment.iyzico.sandbox.api_key'),
    bool_or(name='alperler.payment.iyzico.sandbox.secret_key'),
    max(updated_at) filter (where name like 'alperler.payment.iyzico.sandbox.%'),
    bool_or(name='alperler.payment.iyzico.live.api_key'),
    bool_or(name='alperler.payment.iyzico.live.secret_key'),
    max(updated_at) filter (where name like 'alperler.payment.iyzico.live.%')
  into
    v_paytr_id,v_paytr_key,v_paytr_salt,v_paytr_updated,
    v_sandbox_key,v_sandbox_secret,v_sandbox_updated,
    v_live_key,v_live_secret,v_live_updated
  from vault.secrets
  where name in (
    'alperler.payment.paytr.merchant_id',
    'alperler.payment.paytr.merchant_key',
    'alperler.payment.paytr.merchant_salt',
    'alperler.payment.iyzico.sandbox.api_key',
    'alperler.payment.iyzico.sandbox.secret_key',
    'alperler.payment.iyzico.live.api_key',
    'alperler.payment.iyzico.live.secret_key'
  );

  return jsonb_build_object(
    'paytr', jsonb_build_object(
      'merchantIdSet',coalesce(v_paytr_id,false),
      'merchantKeySet',coalesce(v_paytr_key,false),
      'merchantSaltSet',coalesce(v_paytr_salt,false),
      'configured',coalesce(v_paytr_id,false) and coalesce(v_paytr_key,false) and coalesce(v_paytr_salt,false),
      'updatedAt',v_paytr_updated
    ),
    'iyzico', jsonb_build_object(
      'sandbox',jsonb_build_object(
        'apiKeySet',coalesce(v_sandbox_key,false),
        'secretKeySet',coalesce(v_sandbox_secret,false),
        'configured',coalesce(v_sandbox_key,false) and coalesce(v_sandbox_secret,false),
        'updatedAt',v_sandbox_updated
      ),
      'live',jsonb_build_object(
        'apiKeySet',coalesce(v_live_key,false),
        'secretKeySet',coalesce(v_live_secret,false),
        'configured',coalesce(v_live_key,false) and coalesce(v_live_secret,false),
        'updatedAt',v_live_updated
      )
    )
  );
end;
$$;

revoke all on function public.service_payment_provider_secret_status_v221(uuid) from public, anon, authenticated;
grant execute on function public.service_payment_provider_secret_status_v221(uuid) to service_role;

create or replace function public.service_set_payment_provider_secrets_v221(
  p_actor uuid,
  p_provider text,
  p_scope text,
  p_payload jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public, private, auth, vault, pg_catalog
as $$
declare
  v_provider text := upper(btrim(coalesce(p_provider,'')));
  v_scope text := lower(btrim(coalesce(p_scope,'')));
  v_actor_email text;
  v_before jsonb;
  v_after jsonb;
  v_a text;
  v_b text;
  v_c text;
begin
  if p_actor is null or not private.can_actor_manage_settings_v174(p_actor) then
    raise exception using errcode='42501', message='SETTINGS_PERMISSION_REQUIRED';
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception using errcode='22023', message='INVALID_PAYMENT_SECRET_PAYLOAD';
  end if;

  v_before := public.service_payment_provider_secret_status_v221(p_actor);

  if v_provider='PAYTR' then
    v_a := btrim(coalesce(p_payload->>'merchantId',''));
    v_b := btrim(coalesce(p_payload->>'merchantKey',''));
    v_c := btrim(coalesce(p_payload->>'merchantSalt',''));
    if length(v_a)<1 or length(v_b)<3 or length(v_c)<3 then
      raise exception using errcode='22023', message='PAYTR_SECRET_SET_INCOMPLETE';
    end if;
    perform private.upsert_payment_provider_vault_secret_v221('alperler.payment.paytr.merchant_id',v_a,'PayTR merchant id');
    perform private.upsert_payment_provider_vault_secret_v221('alperler.payment.paytr.merchant_key',v_b,'PayTR merchant key');
    perform private.upsert_payment_provider_vault_secret_v221('alperler.payment.paytr.merchant_salt',v_c,'PayTR merchant salt');
    v_scope := 'default';
  elsif v_provider='IYZICO' then
    if v_scope not in ('sandbox','live') then
      raise exception using errcode='22023', message='IYZICO_SECRET_SCOPE_REQUIRED';
    end if;
    v_a := btrim(coalesce(p_payload->>'apiKey',''));
    v_b := btrim(coalesce(p_payload->>'secretKey',''));
    if length(v_a)<3 or length(v_b)<3 then
      raise exception using errcode='22023', message='IYZICO_SECRET_SET_INCOMPLETE';
    end if;
    perform private.upsert_payment_provider_vault_secret_v221('alperler.payment.iyzico.'||v_scope||'.api_key',v_a,'iyzico '||v_scope||' api key');
    perform private.upsert_payment_provider_vault_secret_v221('alperler.payment.iyzico.'||v_scope||'.secret_key',v_b,'iyzico '||v_scope||' secret key');
  else
    raise exception using errcode='22023', message='INVALID_PAYMENT_PROVIDER';
  end if;

  v_after := public.service_payment_provider_secret_status_v221(p_actor);
  select lower(coalesce(au.email,u.email)) into v_actor_email
  from public.admin_users au left join auth.users u on u.id=au.user_id
  where au.user_id=p_actor limit 1;

  insert into public.audit_logs(actor_user_id,actor_email,action,entity_type,entity_id,before_data,after_data,event_meta)
  values(
    p_actor,v_actor_email,'payment_provider_secret_rotated_v221','payment_provider_secret',lower(v_provider)||':'||v_scope,
    jsonb_build_object('provider',v_provider,'scope',v_scope,'status',v_before),
    jsonb_build_object('provider',v_provider,'scope',v_scope,'status',v_after),
    jsonb_build_object('gateway','admin-core-v221','secret_values_logged',false)
  );

  return v_after;
end;
$$;

revoke all on function public.service_set_payment_provider_secrets_v221(uuid,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.service_set_payment_provider_secrets_v221(uuid,text,text,jsonb) to service_role;

create or replace function public.service_clear_payment_provider_secrets_v221(
  p_actor uuid,
  p_provider text,
  p_scope text
) returns jsonb
language plpgsql
security definer
set search_path = public, private, auth, vault, pg_catalog
as $$
declare
  v_provider text := upper(btrim(coalesce(p_provider,'')));
  v_scope text := lower(btrim(coalesce(p_scope,'')));
  v_actor_email text;
  v_before jsonb;
  v_after jsonb;
begin
  if p_actor is null or not private.can_actor_manage_settings_v174(p_actor) then
    raise exception using errcode='42501', message='SETTINGS_PERMISSION_REQUIRED';
  end if;

  v_before := public.service_payment_provider_secret_status_v221(p_actor);

  if v_provider='PAYTR' then
    delete from vault.secrets where name in (
      'alperler.payment.paytr.merchant_id',
      'alperler.payment.paytr.merchant_key',
      'alperler.payment.paytr.merchant_salt'
    );
    v_scope := 'default';
  elsif v_provider='IYZICO' and v_scope='sandbox' then
    delete from vault.secrets where name in (
      'alperler.payment.iyzico.sandbox.api_key',
      'alperler.payment.iyzico.sandbox.secret_key'
    );
  elsif v_provider='IYZICO' and v_scope='live' then
    delete from vault.secrets where name in (
      'alperler.payment.iyzico.live.api_key',
      'alperler.payment.iyzico.live.secret_key'
    );
  elsif v_provider='IYZICO' and v_scope='all' then
    delete from vault.secrets where name like 'alperler.payment.iyzico.%';
  else
    raise exception using errcode='22023', message='INVALID_PAYMENT_SECRET_CLEAR_SCOPE';
  end if;

  v_after := public.service_payment_provider_secret_status_v221(p_actor);
  select lower(coalesce(au.email,u.email)) into v_actor_email
  from public.admin_users au left join auth.users u on u.id=au.user_id
  where au.user_id=p_actor limit 1;

  insert into public.audit_logs(actor_user_id,actor_email,action,entity_type,entity_id,before_data,after_data,event_meta)
  values(
    p_actor,v_actor_email,'payment_provider_secret_cleared_v221','payment_provider_secret',lower(v_provider)||':'||v_scope,
    jsonb_build_object('provider',v_provider,'scope',v_scope,'status',v_before),
    jsonb_build_object('provider',v_provider,'scope',v_scope,'status',v_after),
    jsonb_build_object('gateway','admin-core-v221','secret_values_logged',false)
  );

  return v_after;
end;
$$;

revoke all on function public.service_clear_payment_provider_secrets_v221(uuid,text,text) from public, anon, authenticated;
grant execute on function public.service_clear_payment_provider_secrets_v221(uuid,text,text) to service_role;

create or replace function public.service_payment_provider_credentials_v221(
  p_provider text,
  p_test_mode boolean
) returns jsonb
language plpgsql
security definer
set search_path = public, vault, pg_catalog
as $$
declare
  v_provider text := upper(btrim(coalesce(p_provider,'')));
  v_scope text := case when coalesce(p_test_mode,true) then 'sandbox' else 'live' end;
  v_a text;
  v_b text;
  v_c text;
begin
  if v_provider='PAYTR' then
    select decrypted_secret into v_a from vault.decrypted_secrets where name='alperler.payment.paytr.merchant_id' order by updated_at desc nulls last limit 1;
    select decrypted_secret into v_b from vault.decrypted_secrets where name='alperler.payment.paytr.merchant_key' order by updated_at desc nulls last limit 1;
    select decrypted_secret into v_c from vault.decrypted_secrets where name='alperler.payment.paytr.merchant_salt' order by updated_at desc nulls last limit 1;
    return jsonb_build_object('provider','PAYTR','merchantId',v_a,'merchantKey',v_b,'merchantSalt',v_c,'configured',coalesce(length(v_a)>0,false) and coalesce(length(v_b)>0,false) and coalesce(length(v_c)>0,false));
  elsif v_provider='IYZICO' then
    select decrypted_secret into v_a from vault.decrypted_secrets where name='alperler.payment.iyzico.'||v_scope||'.api_key' order by updated_at desc nulls last limit 1;
    select decrypted_secret into v_b from vault.decrypted_secrets where name='alperler.payment.iyzico.'||v_scope||'.secret_key' order by updated_at desc nulls last limit 1;
    return jsonb_build_object('provider','IYZICO','scope',v_scope,'apiKey',v_a,'secretKey',v_b,'configured',coalesce(length(v_a)>0,false) and coalesce(length(v_b)>0,false));
  end if;
  return jsonb_build_object('provider','NONE','configured',false);
end;
$$;

revoke all on function public.service_payment_provider_credentials_v221(text,boolean) from public, anon, authenticated;
grant execute on function public.service_payment_provider_credentials_v221(text,boolean) to service_role;