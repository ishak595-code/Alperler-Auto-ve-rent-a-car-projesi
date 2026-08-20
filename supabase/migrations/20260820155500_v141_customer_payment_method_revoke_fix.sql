create or replace function public.remove_customer_payment_method(p_method_id uuid) returns jsonb
language plpgsql security definer set search_path=public,private,pg_temp as $$
declare v_uid uuid:=auth.uid();
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists(select 1 from public.customer_payment_methods where id=p_method_id and user_id=v_uid and status='ACTIVE') then raise exception 'PAYMENT_METHOD_NOT_FOUND'; end if;
  update public.customer_payment_methods set status='REVOKED',is_default=false,updated_at=now() where id=p_method_id and user_id=v_uid;
  delete from private.customer_payment_tokens where user_id=v_uid and id=p_method_id;
  update public.customer_experience_preferences set preferred_payment_method_id=null,updated_at=now() where user_id=v_uid and preferred_payment_method_id=p_method_id;
  return jsonb_build_object('ok',true,'id',p_method_id);
end; $$;
revoke all on function public.remove_customer_payment_method(uuid) from public,anon;
grant execute on function public.remove_customer_payment_method(uuid) to authenticated;
