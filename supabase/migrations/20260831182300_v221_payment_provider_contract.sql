alter table public.payment_settings
  drop constraint if exists payment_settings_provider_check;

alter table public.payment_settings
  add constraint payment_settings_provider_check
  check (provider = any (array['PAYTR'::text, 'NONE'::text]));

create or replace function public.service_save_payment_settings_v182(
  p_actor uuid,
  p_provider text,
  p_card_enabled boolean,
  p_eft_enabled boolean,
  p_office_enabled boolean,
  p_deposit_mode text,
  p_deposit_value numeric,
  p_currency text,
  p_bank_name text,
  p_iban text,
  p_account_holder text,
  p_customer_note text,
  p_test_mode boolean
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'private', 'auth', 'pg_catalog'
as $function$
declare
  v_provider text := upper(btrim(coalesce(p_provider,'')));
  v_deposit_mode text := upper(btrim(coalesce(p_deposit_mode,'')));
  v_currency text := upper(btrim(coalesce(p_currency,'')));
  v_before jsonb;
  v_after jsonb;
  v_actor_email text;
begin
  if p_actor is null or not private.can_actor_manage_settings_v174(p_actor) then
    raise exception using errcode='42501', message='SETTINGS_PERMISSION_REQUIRED';
  end if;

  if v_provider not in ('PAYTR','NONE') then
    raise exception using errcode='22023', message='INVALID_PAYMENT_PROVIDER';
  end if;
  if v_deposit_mode not in ('NONE','FIXED','PERCENT') then
    raise exception using errcode='22023', message='INVALID_DEPOSIT_MODE';
  end if;
  if coalesce(p_deposit_value,0) < 0 or (v_deposit_mode='PERCENT' and coalesce(p_deposit_value,0) > 100) then
    raise exception using errcode='22023', message='INVALID_DEPOSIT_VALUE';
  end if;
  if v_currency not in ('TRY','EUR','USD','CHF') then
    raise exception using errcode='22023', message='INVALID_PAYMENT_CURRENCY';
  end if;
  if v_provider='PAYTR' and coalesce(p_card_enabled,false) and v_currency <> 'TRY' then
    raise exception using errcode='22023', message='PAYTR_CARD_REQUIRES_TRY';
  end if;
  if v_provider='NONE' and coalesce(p_card_enabled,false) then
    raise exception using errcode='22023', message='CARD_PROVIDER_REQUIRED';
  end if;

  select jsonb_build_object(
    'provider',provider,
    'card_enabled',card_enabled,
    'eft_enabled',eft_enabled,
    'office_enabled',office_enabled,
    'deposit_mode',deposit_mode,
    'deposit_value',deposit_value,
    'currency',currency,
    'test_mode',test_mode
  )
  into v_before
  from public.payment_settings
  where config_key='main';

  insert into public.payment_settings(
    config_key,provider,card_enabled,eft_enabled,office_enabled,deposit_mode,deposit_value,currency,
    bank_name,iban,account_holder,customer_note,test_mode,updated_by,updated_at
  )
  values(
    'main',v_provider,coalesce(p_card_enabled,false),coalesce(p_eft_enabled,true),coalesce(p_office_enabled,true),
    v_deposit_mode,coalesce(p_deposit_value,0),v_currency,
    left(nullif(btrim(coalesce(p_bank_name,'')),''),160),
    left(nullif(upper(regexp_replace(coalesce(p_iban,''),'\s+','','g')),''),80),
    left(nullif(btrim(coalesce(p_account_holder,'')),''),180),
    left(nullif(btrim(coalesce(p_customer_note,'')),''),1000),
    coalesce(p_test_mode,true),p_actor,now()
  )
  on conflict (config_key) do update set
    provider=excluded.provider,
    card_enabled=excluded.card_enabled,
    eft_enabled=excluded.eft_enabled,
    office_enabled=excluded.office_enabled,
    deposit_mode=excluded.deposit_mode,
    deposit_value=excluded.deposit_value,
    currency=excluded.currency,
    bank_name=excluded.bank_name,
    iban=excluded.iban,
    account_holder=excluded.account_holder,
    customer_note=excluded.customer_note,
    test_mode=excluded.test_mode,
    updated_by=excluded.updated_by,
    updated_at=excluded.updated_at;

  select to_jsonb(p) into v_after from public.payment_settings p where p.config_key='main';
  select lower(coalesce(au.email,u.email)) into v_actor_email
  from public.admin_users au
  left join auth.users u on u.id=au.user_id
  where au.user_id=p_actor
  limit 1;

  insert into public.audit_logs(actor_user_id,actor_email,action,entity_type,entity_id,before_data,after_data,event_meta)
  values(
    p_actor,v_actor_email,'payment_settings_updated_v221','payment_settings','main',coalesce(v_before,'{}'::jsonb),
    jsonb_build_object(
      'provider',v_after->'provider',
      'card_enabled',v_after->'card_enabled',
      'eft_enabled',v_after->'eft_enabled',
      'office_enabled',v_after->'office_enabled',
      'deposit_mode',v_after->'deposit_mode',
      'deposit_value',v_after->'deposit_value',
      'currency',v_after->'currency',
      'test_mode',v_after->'test_mode'
    ),
    jsonb_build_object('gateway','admin-core-v221')
  );

  return v_after;
end;
$function$;
