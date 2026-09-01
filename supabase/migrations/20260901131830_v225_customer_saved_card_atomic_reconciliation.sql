create or replace function public.service_set_default_customer_payment_method_v225(p_user_id uuid,p_method_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if p_user_id is null or p_method_id is null then raise exception 'INVALID_PAYMENT_METHOD'; end if;
  if not exists(select 1 from public.customer_payment_methods where id=p_method_id and user_id=p_user_id and status='ACTIVE') then raise exception 'PAYMENT_METHOD_NOT_FOUND'; end if;
  update public.customer_payment_methods set is_default=false,updated_at=now() where user_id=p_user_id and status='ACTIVE' and is_default;
  update public.customer_payment_methods set is_default=true,updated_at=now() where id=p_method_id and user_id=p_user_id and status='ACTIVE';
  update public.customer_experience_preferences set preferred_payment_method_id=p_method_id,updated_at=now() where user_id=p_user_id;
  return jsonb_build_object('ok',true,'id',p_method_id);
end
$$;

create or replace function public.service_reconcile_customer_payment_methods_v225(p_user_id uuid,p_provider text,p_environment text,p_active_refs text[])
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_provider text:=upper(btrim(coalesce(p_provider,'')));
  v_environment text:=lower(btrim(coalesce(p_environment,'')));
  v_refs text[]:=coalesce(p_active_refs,array[]::text[]);
  v_revoked integer:=0;
begin
  if p_user_id is null or v_provider not in ('IYZICO','PAYTR') or v_environment not in ('sandbox','live') then raise exception 'INVALID_PAYMENT_METHOD_OWNER'; end if;

  with stale as (
    select t.id
    from private.customer_payment_tokens t
    join public.customer_payment_methods m on m.id=t.id and m.user_id=t.user_id
    where t.user_id=p_user_id and t.provider=v_provider and t.provider_environment=v_environment and m.status='ACTIVE'
      and (t.provider_payment_method_ref is null or not (t.provider_payment_method_ref=any(v_refs)))
  ), revoked as (
    update public.customer_payment_methods m set status='REVOKED',is_default=false,updated_at=now()
    where m.id in (select id from stale)
    returning m.id
  )
  select count(*) into v_revoked from revoked;

  delete from private.customer_payment_tokens t
  where t.user_id=p_user_id and t.provider=v_provider and t.provider_environment=v_environment
    and (t.provider_payment_method_ref is null or not (t.provider_payment_method_ref=any(v_refs)));

  update public.customer_experience_preferences e set preferred_payment_method_id=null,updated_at=now()
  where e.user_id=p_user_id and e.preferred_payment_method_id is not null
    and not exists(select 1 from public.customer_payment_methods m where m.id=e.preferred_payment_method_id and m.user_id=p_user_id and m.status='ACTIVE');

  if not exists(select 1 from public.customer_payment_methods where user_id=p_user_id and status='ACTIVE' and is_default) then
    update public.customer_payment_methods set is_default=true,updated_at=now()
    where id=(select id from public.customer_payment_methods where user_id=p_user_id and status='ACTIVE' order by created_at asc limit 1);
  end if;

  return jsonb_build_object('ok',true,'revoked',v_revoked);
end
$$;

revoke all on function public.service_set_default_customer_payment_method_v225(uuid,uuid) from public,anon,authenticated;
revoke all on function public.service_reconcile_customer_payment_methods_v225(uuid,text,text,text[]) from public,anon,authenticated;
grant execute on function public.service_set_default_customer_payment_method_v225(uuid,uuid) to service_role;
grant execute on function public.service_reconcile_customer_payment_methods_v225(uuid,text,text,text[]) to service_role;
