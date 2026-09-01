create table if not exists private.customer_payment_method_tokens (
  payment_method_id uuid primary key references public.customer_payment_methods(id) on delete cascade,
  user_id uuid not null references public.customer_profiles(user_id) on delete cascade,
  provider text not null check (provider in ('PAYTR','IYZICO')),
  provider_scope text not null check (provider_scope in ('SANDBOX','LIVE')),
  provider_user_key text not null,
  provider_card_token text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider, provider_scope, provider_card_token)
);

alter table public.customer_payment_methods
  add column if not exists provider_scope text not null default 'LIVE';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.customer_payment_methods'::regclass
      and conname='customer_payment_methods_provider_scope_check'
  ) then
    alter table public.customer_payment_methods
      add constraint customer_payment_methods_provider_scope_check
      check (provider_scope in ('SANDBOX','LIVE'));
  end if;
end $$;

create unique index if not exists customer_payment_methods_one_default_active_uidx
  on public.customer_payment_methods(user_id)
  where status='ACTIVE' and is_default=true;

create index if not exists customer_payment_methods_user_scope_idx
  on public.customer_payment_methods(user_id, provider, provider_scope, status, created_at desc);

revoke all on private.customer_payment_method_tokens from public, anon, authenticated;

create or replace function public.service_customer_wallet_identity_v225(
  p_user_id uuid,
  p_provider text,
  p_scope text
) returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_catalog
as $$
declare
  v_provider text := upper(coalesce(p_provider,''));
  v_scope text := upper(coalesce(p_scope,''));
  v_key text;
begin
  if p_user_id is null then raise exception 'CUSTOMER_REQUIRED'; end if;
  if v_provider not in ('PAYTR','IYZICO') then raise exception 'INVALID_PAYMENT_PROVIDER'; end if;
  if v_scope not in ('SANDBOX','LIVE') then raise exception 'INVALID_PROVIDER_SCOPE'; end if;

  select t.provider_user_key into v_key
  from private.customer_payment_method_tokens t
  join public.customer_payment_methods m on m.id=t.payment_method_id
  where t.user_id=p_user_id
    and t.provider=v_provider
    and t.provider_scope=v_scope
    and m.status='ACTIVE'
  order by m.is_default desc, m.created_at asc
  limit 1;

  return jsonb_build_object('providerUserKey', v_key);
end;
$$;

create or replace function public.service_save_customer_payment_method_v225(
  p_user_id uuid,
  p_provider text,
  p_scope text,
  p_provider_user_key text,
  p_provider_card_token text,
  p_brand text,
  p_last4 text,
  p_expiry_month smallint,
  p_expiry_year smallint,
  p_label text
) returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_catalog
as $$
declare
  v_provider text := upper(coalesce(p_provider,''));
  v_scope text := upper(coalesce(p_scope,''));
  v_method public.customer_payment_methods%rowtype;
  v_default boolean;
begin
  if p_user_id is null then raise exception 'CUSTOMER_REQUIRED'; end if;
  if v_provider not in ('PAYTR','IYZICO') then raise exception 'INVALID_PAYMENT_PROVIDER'; end if;
  if v_scope not in ('SANDBOX','LIVE') then raise exception 'INVALID_PROVIDER_SCOPE'; end if;
  if nullif(trim(coalesce(p_provider_user_key,'')),'') is null then raise exception 'PROVIDER_USER_KEY_REQUIRED'; end if;
  if nullif(trim(coalesce(p_provider_card_token,'')),'') is null then raise exception 'PROVIDER_CARD_TOKEN_REQUIRED'; end if;
  if coalesce(p_last4,'') !~ '^[0-9]{4}$' then raise exception 'INVALID_CARD_LAST4'; end if;
  if p_expiry_month is not null and (p_expiry_month < 1 or p_expiry_month > 12) then raise exception 'INVALID_CARD_EXPIRY_MONTH'; end if;
  if p_expiry_year is not null and (p_expiry_year < extract(year from now())::int or p_expiry_year > extract(year from now())::int + 30) then raise exception 'INVALID_CARD_EXPIRY_YEAR'; end if;
  if (select count(*) from public.customer_payment_methods where user_id=p_user_id and status='ACTIVE') >= 10 then raise exception 'PAYMENT_METHOD_LIMIT_REACHED'; end if;

  select m.* into v_method
  from public.customer_payment_methods m
  join private.customer_payment_method_tokens t on t.payment_method_id=m.id
  where t.user_id=p_user_id and t.provider=v_provider and t.provider_scope=v_scope
    and t.provider_card_token=p_provider_card_token
  limit 1;

  if found then
    update public.customer_payment_methods
       set brand=nullif(trim(coalesce(p_brand,'')),''),
           last4=p_last4,
           expiry_month=p_expiry_month,
           expiry_year=p_expiry_year,
           label=nullif(left(trim(coalesce(p_label,'')),80),''),
           provider_scope=v_scope,
           status='ACTIVE',
           updated_at=now()
     where id=v_method.id
     returning * into v_method;
    update private.customer_payment_method_tokens
       set provider_user_key=p_provider_user_key,updated_at=now()
     where payment_method_id=v_method.id;
  else
    select not exists(select 1 from public.customer_payment_methods where user_id=p_user_id and status='ACTIVE') into v_default;
    insert into public.customer_payment_methods(user_id,provider,provider_scope,brand,last4,expiry_month,expiry_year,label,is_default,status)
    values(p_user_id,v_provider,v_scope,nullif(trim(coalesce(p_brand,'')),''),p_last4,p_expiry_month,p_expiry_year,nullif(left(trim(coalesce(p_label,'')),80),''),v_default,'ACTIVE')
    returning * into v_method;
    insert into private.customer_payment_method_tokens(payment_method_id,user_id,provider,provider_scope,provider_user_key,provider_card_token)
    values(v_method.id,p_user_id,v_provider,v_scope,p_provider_user_key,p_provider_card_token);
  end if;

  return jsonb_build_object('id',v_method.id,'isDefault',v_method.is_default);
end;
$$;

create or replace function public.service_customer_payment_method_token_v225(
  p_user_id uuid,
  p_method_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_catalog
as $$
declare v_row record;
begin
  select m.id,m.provider,m.provider_scope,t.provider_user_key,t.provider_card_token
  into v_row
  from public.customer_payment_methods m
  join private.customer_payment_method_tokens t on t.payment_method_id=m.id
  where m.id=p_method_id and m.user_id=p_user_id and m.status='ACTIVE';
  if not found then raise exception 'PAYMENT_METHOD_NOT_FOUND'; end if;
  return jsonb_build_object(
    'id',v_row.id,
    'provider',v_row.provider,
    'providerScope',v_row.provider_scope,
    'providerUserKey',v_row.provider_user_key,
    'providerCardToken',v_row.provider_card_token
  );
end;
$$;

create or replace function public.service_set_default_customer_payment_method_v225(
  p_user_id uuid,
  p_method_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if not exists(select 1 from public.customer_payment_methods where id=p_method_id and user_id=p_user_id and status='ACTIVE') then
    raise exception 'PAYMENT_METHOD_NOT_FOUND';
  end if;
  update public.customer_payment_methods set is_default=false,updated_at=now()
   where user_id=p_user_id and status='ACTIVE' and is_default=true and id<>p_method_id;
  update public.customer_payment_methods set is_default=true,updated_at=now()
   where id=p_method_id and user_id=p_user_id and status='ACTIVE';
  return jsonb_build_object('ok',true,'id',p_method_id);
end;
$$;

create or replace function public.service_revoke_customer_payment_method_v225(
  p_user_id uuid,
  p_method_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_catalog
as $$
declare v_was_default boolean; v_next uuid;
begin
  select is_default into v_was_default from public.customer_payment_methods
   where id=p_method_id and user_id=p_user_id and status='ACTIVE' for update;
  if not found then raise exception 'PAYMENT_METHOD_NOT_FOUND'; end if;

  delete from private.customer_payment_method_tokens where payment_method_id=p_method_id and user_id=p_user_id;
  update public.customer_payment_methods set status='REVOKED',is_default=false,updated_at=now()
   where id=p_method_id and user_id=p_user_id;

  if v_was_default then
    select id into v_next from public.customer_payment_methods
     where user_id=p_user_id and status='ACTIVE' order by created_at asc limit 1;
    if v_next is not null then update public.customer_payment_methods set is_default=true,updated_at=now() where id=v_next; end if;
  end if;
  return jsonb_build_object('ok',true);
end;
$$;

revoke all on function public.service_customer_wallet_identity_v225(uuid,text,text) from public, anon, authenticated;
revoke all on function public.service_save_customer_payment_method_v225(uuid,text,text,text,text,text,text,smallint,smallint,text) from public, anon, authenticated;
revoke all on function public.service_customer_payment_method_token_v225(uuid,uuid) from public, anon, authenticated;
revoke all on function public.service_set_default_customer_payment_method_v225(uuid,uuid) from public, anon, authenticated;
revoke all on function public.service_revoke_customer_payment_method_v225(uuid,uuid) from public, anon, authenticated;

grant execute on function public.service_customer_wallet_identity_v225(uuid,text,text) to service_role;
grant execute on function public.service_save_customer_payment_method_v225(uuid,text,text,text,text,text,text,smallint,smallint,text) to service_role;
grant execute on function public.service_customer_payment_method_token_v225(uuid,uuid) to service_role;
grant execute on function public.service_set_default_customer_payment_method_v225(uuid,uuid) to service_role;
grant execute on function public.service_revoke_customer_payment_method_v225(uuid,uuid) to service_role;
