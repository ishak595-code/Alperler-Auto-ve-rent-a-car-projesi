alter table public.customer_payment_methods add column if not exists provider_environment text not null default 'live';
alter table private.customer_payment_tokens add column if not exists provider_environment text not null default 'live';

alter table public.customer_payment_methods drop constraint if exists customer_payment_methods_provider_environment_check;
alter table public.customer_payment_methods add constraint customer_payment_methods_provider_environment_check check (provider_environment in ('sandbox','live'));
alter table private.customer_payment_tokens drop constraint if exists customer_payment_tokens_provider_environment_check;
alter table private.customer_payment_tokens add constraint customer_payment_tokens_provider_environment_check check (provider_environment in ('sandbox','live'));

create unique index if not exists customer_payment_tokens_provider_method_uidx
on private.customer_payment_tokens(provider,provider_environment,provider_payment_method_ref)
where provider_payment_method_ref is not null;

create index if not exists customer_payment_methods_user_provider_env_idx
on public.customer_payment_methods(user_id,provider,provider_environment,status,created_at desc);

create or replace function public.service_sync_customer_payment_method_v225(
  p_user_id uuid,
  p_provider text,
  p_environment text,
  p_provider_customer_ref text,
  p_provider_payment_method_ref text,
  p_brand text,
  p_last4 text,
  p_expiry_month integer,
  p_expiry_year integer,
  p_label text,
  p_provider_fingerprint text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_provider text := upper(btrim(coalesce(p_provider,'')));
  v_environment text := lower(btrim(coalesce(p_environment,'')));
  v_method_id uuid;
  v_make_default boolean;
begin
  if p_user_id is null or v_provider not in ('IYZICO','PAYTR') or v_environment not in ('sandbox','live') then raise exception 'INVALID_PAYMENT_METHOD_OWNER'; end if;
  if nullif(btrim(coalesce(p_provider_payment_method_ref,'')),'') is null then raise exception 'PAYMENT_METHOD_TOKEN_REQUIRED'; end if;
  if p_last4 is null or p_last4 !~ '^[0-9]{4}$' then raise exception 'PAYMENT_METHOD_LAST4_REQUIRED'; end if;

  select t.id into v_method_id
  from private.customer_payment_tokens t
  where t.user_id=p_user_id and t.provider=v_provider and t.provider_environment=v_environment and t.provider_payment_method_ref=p_provider_payment_method_ref
  limit 1;

  if v_method_id is null then
    v_make_default := not exists(select 1 from public.customer_payment_methods m where m.user_id=p_user_id and m.status='ACTIVE');
    insert into public.customer_payment_methods(user_id,provider,provider_environment,brand,last4,expiry_month,expiry_year,label,is_default,status)
    values(p_user_id,v_provider,v_environment,nullif(btrim(coalesce(p_brand,'')),''),p_last4,p_expiry_month,p_expiry_year,nullif(btrim(coalesce(p_label,'')),''),v_make_default,'ACTIVE')
    returning id into v_method_id;
    insert into private.customer_payment_tokens(id,user_id,provider,provider_environment,provider_customer_ref,provider_payment_method_ref,provider_fingerprint)
    values(v_method_id,p_user_id,v_provider,v_environment,nullif(btrim(coalesce(p_provider_customer_ref,'')),''),p_provider_payment_method_ref,nullif(btrim(coalesce(p_provider_fingerprint,'')),''));
  else
    update public.customer_payment_methods
    set brand=nullif(btrim(coalesce(p_brand,'')),''),last4=p_last4,expiry_month=p_expiry_month,expiry_year=p_expiry_year,label=nullif(btrim(coalesce(p_label,'')),''),status='ACTIVE',updated_at=now()
    where id=v_method_id and user_id=p_user_id;
    update private.customer_payment_tokens
    set provider_customer_ref=nullif(btrim(coalesce(p_provider_customer_ref,'')),''),provider_fingerprint=nullif(btrim(coalesce(p_provider_fingerprint,'')),''),updated_at=now()
    where id=v_method_id and user_id=p_user_id;
  end if;
  return v_method_id;
end
$$;

create or replace function public.service_customer_payment_method_token_v225(p_user_id uuid,p_method_id uuid)
returns jsonb
language sql
security definer
set search_path = pg_catalog, public, private
as $$
  select jsonb_build_object('id',t.id,'provider',t.provider,'environment',t.provider_environment,'providerCustomerRef',t.provider_customer_ref,'providerPaymentMethodRef',t.provider_payment_method_ref)
  from private.customer_payment_tokens t
  join public.customer_payment_methods m on m.id=t.id and m.user_id=t.user_id
  where t.user_id=p_user_id and t.id=p_method_id and m.status='ACTIVE'
  limit 1
$$;

create or replace function public.service_revoke_customer_payment_method_v225(p_user_id uuid,p_method_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if p_user_id is null or p_method_id is null then raise exception 'INVALID_PAYMENT_METHOD'; end if;
  if not exists(select 1 from public.customer_payment_methods where id=p_method_id and user_id=p_user_id and status='ACTIVE') then raise exception 'PAYMENT_METHOD_NOT_FOUND'; end if;
  update public.customer_payment_methods set status='REVOKED',is_default=false,updated_at=now() where id=p_method_id and user_id=p_user_id;
  delete from private.customer_payment_tokens where id=p_method_id and user_id=p_user_id;
  update public.customer_experience_preferences set preferred_payment_method_id=null,updated_at=now() where user_id=p_user_id and preferred_payment_method_id=p_method_id;
  if not exists(select 1 from public.customer_payment_methods where user_id=p_user_id and status='ACTIVE' and is_default) then
    update public.customer_payment_methods set is_default=true,updated_at=now()
    where id=(select id from public.customer_payment_methods where user_id=p_user_id and status='ACTIVE' order by created_at asc limit 1);
  end if;
  return jsonb_build_object('ok',true,'id',p_method_id);
end
$$;

revoke all on function public.service_sync_customer_payment_method_v225(uuid,text,text,text,text,text,text,integer,integer,text,text) from public,anon,authenticated;
revoke all on function public.service_customer_payment_method_token_v225(uuid,uuid) from public,anon,authenticated;
revoke all on function public.service_revoke_customer_payment_method_v225(uuid,uuid) from public,anon,authenticated;
grant execute on function public.service_sync_customer_payment_method_v225(uuid,text,text,text,text,text,text,integer,integer,text,text) to service_role;
grant execute on function public.service_customer_payment_method_token_v225(uuid,uuid) to service_role;
grant execute on function public.service_revoke_customer_payment_method_v225(uuid,uuid) to service_role;
