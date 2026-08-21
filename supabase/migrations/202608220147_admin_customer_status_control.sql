create or replace function public.admin_set_customer_status(p_user_id uuid, p_status text)
returns jsonb
language plpgsql
security definer
set search_path = public, private, auth
as $$
declare
  v_actor uuid := auth.uid();
  v_actor_email text;
  v_before public.customer_profiles%rowtype;
  v_after public.customer_profiles%rowtype;
begin
  if v_actor is null or not private.can_manage_operations() then
    raise exception 'FORBIDDEN';
  end if;

  if p_status not in ('ACTIVE','BLOCKED','DELETED') then
    raise exception 'INVALID_CUSTOMER_STATUS';
  end if;

  select * into v_before from public.customer_profiles where user_id = p_user_id;
  if not found then raise exception 'CUSTOMER_NOT_FOUND'; end if;

  update public.customer_profiles
     set status = p_status, updated_at = now()
   where user_id = p_user_id
   returning * into v_after;

  select email into v_actor_email from auth.users where id = v_actor;
  insert into public.audit_logs(actor_user_id, actor_email, action, entity_type, entity_id, before_data, after_data)
  values (
    v_actor,
    v_actor_email,
    'customer_status_updated',
    'customer',
    p_user_id::text,
    jsonb_build_object('status', v_before.status),
    jsonb_build_object('status', v_after.status)
  );

  return jsonb_build_object('ok', true, 'user_id', p_user_id, 'status', v_after.status);
end;
$$;

revoke all on function public.admin_set_customer_status(uuid,text) from public;
grant execute on function public.admin_set_customer_status(uuid,text) to authenticated;
