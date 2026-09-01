do $$
begin
  if to_regclass('private.customer_payment_method_tokens') is not null then
    insert into private.customer_payment_tokens(
      id,user_id,provider,provider_environment,provider_customer_ref,provider_payment_method_ref,provider_fingerprint,created_at,updated_at
    )
    select
      l.payment_method_id,
      l.user_id,
      upper(l.provider),
      case when upper(l.provider_scope)='SANDBOX' then 'sandbox' else 'live' end,
      l.provider_user_key,
      l.provider_card_token,
      null,
      l.created_at,
      l.updated_at
    from private.customer_payment_method_tokens l
    on conflict (id) do update
      set provider=excluded.provider,
          provider_environment=excluded.provider_environment,
          provider_customer_ref=excluded.provider_customer_ref,
          provider_payment_method_ref=excluded.provider_payment_method_ref,
          updated_at=greatest(private.customer_payment_tokens.updated_at,excluded.updated_at);
  end if;
end $$;

update public.customer_payment_methods
set provider_environment=case when upper(provider_scope)='SANDBOX' then 'sandbox' else 'live' end
where provider_scope is not null
  and provider_environment is distinct from case when upper(provider_scope)='SANDBOX' then 'sandbox' else 'live' end;

create or replace function public.service_customer_payment_method_token_v225(p_user_id uuid,p_method_id uuid)
returns jsonb
language sql
security definer
set search_path = pg_catalog, public, private
as $$
  select jsonb_build_object(
    'id',t.id,
    'provider',t.provider,
    'environment',t.provider_environment,
    'providerCustomerRef',t.provider_customer_ref,
    'providerPaymentMethodRef',t.provider_payment_method_ref
  )
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

  update public.customer_payment_methods
  set status='REVOKED',is_default=false,updated_at=now()
  where id=p_method_id and user_id=p_user_id;

  delete from private.customer_payment_tokens where id=p_method_id and user_id=p_user_id;

  update public.customer_experience_preferences
  set preferred_payment_method_id=null,updated_at=now()
  where user_id=p_user_id and preferred_payment_method_id=p_method_id;

  if not exists(select 1 from public.customer_payment_methods where user_id=p_user_id and status='ACTIVE' and is_default) then
    update public.customer_payment_methods set is_default=true,updated_at=now()
    where id=(select id from public.customer_payment_methods where user_id=p_user_id and status='ACTIVE' order by created_at asc limit 1);
  end if;

  return jsonb_build_object('ok',true,'id',p_method_id);
end
$$;

revoke all on function public.service_customer_payment_method_token_v225(uuid,uuid) from public,anon,authenticated;
revoke all on function public.service_revoke_customer_payment_method_v225(uuid,uuid) from public,anon,authenticated;
grant execute on function public.service_customer_payment_method_token_v225(uuid,uuid) to service_role;
grant execute on function public.service_revoke_customer_payment_method_v225(uuid,uuid) to service_role;

drop function if exists public.service_customer_wallet_identity_v225(uuid,text,text);
drop function if exists public.service_save_customer_payment_method_v225(uuid,text,text,text,text,text,text,smallint,smallint,text);
drop table if exists private.customer_payment_method_tokens;

alter table public.customer_payment_methods drop column if exists provider_scope;
