-- V173 customer document signing bridge.
-- Returns the private storage path only to service_role after an operations permission check.

create or replace function public.service_customer_document_path_v173(
  p_actor uuid,
  p_document_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path=public,private,pg_catalog
as $$
declare
  v_row public.customer_documents%rowtype;
begin
  if not private.can_actor_manage_operations(p_actor) then
    raise exception using errcode='42501',message='ADMIN_OPERATIONS_REQUIRED';
  end if;
  select * into v_row from public.customer_documents where id=p_document_id;
  if not found then raise exception using errcode='P0002',message='DOCUMENT_NOT_FOUND'; end if;
  return jsonb_build_object(
    'ok',true,
    'id',v_row.id,
    'user_id',v_row.user_id,
    'storage_path',v_row.storage_path,
    'original_name',v_row.original_name,
    'mime_type',v_row.mime_type
  );
end;
$$;
revoke all on function public.service_customer_document_path_v173(uuid,uuid) from public,anon,authenticated;
grant execute on function public.service_customer_document_path_v173(uuid,uuid) to service_role;
