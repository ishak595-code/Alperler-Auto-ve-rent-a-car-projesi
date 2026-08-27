begin;

create or replace function public.service_enqueue_owned_storage_cleanup_v198(
  p_actor uuid,
  p_entity_type text,
  p_entity_id text,
  p_object_path text
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private, auth
as $$
declare
  v_type text := upper(btrim(coalesce(p_entity_type,'')));
  v_entity_text text := btrim(coalesce(p_entity_id,''));
  v_entity_uuid uuid;
  v_path text := btrim(coalesce(p_object_path,''));
  v_prefix text;
  v_job uuid;
  v_actor_email text;
begin
  if p_actor is null or not private.can_actor_manage_content_v174(p_actor) then
    raise exception using errcode='42501', message='CONTENT_PERMISSION_REQUIRED';
  end if;
  if v_path='' or length(v_path)>1000 or position('..' in v_path)>0 then
    raise exception using errcode='22023', message='INVALID_STORAGE_OBJECT';
  end if;

  if v_type in ('VEHICLE','TOUR','BLOG') then
    begin
      v_entity_uuid := v_entity_text::uuid;
    exception when invalid_text_representation then
      raise exception using errcode='22023', message='INVALID_MEDIA_OWNER';
    end;
    perform private.assert_central_media_owner_v185(v_type,v_entity_uuid);
    v_prefix := lower(v_type)||'/'||v_entity_uuid::text||'/';
    if v_type='BLOG' then v_prefix := 'blog/'||v_entity_uuid::text||'/'; end if;
    perform private.assert_catalog_storage_object_v185(p_actor,v_path,v_prefix);
  elsif v_type='ADMIN' then
    perform private.assert_catalog_storage_object_v185(p_actor,v_path,'admin/');
  else
    raise exception using errcode='22023', message='INVALID_MEDIA_OWNER';
  end if;

  v_job := private.enqueue_media_cleanup_v198('catalog-media',v_path,'UPLOAD_ROLLBACK_'||v_type,nullif(v_entity_text,''));
  if v_job is null then
    raise exception using errcode='22023', message='INVALID_STORAGE_OBJECT';
  end if;

  select lower(coalesce(a.email,u.email)) into v_actor_email
  from public.admin_users a left join auth.users u on u.id=a.user_id
  where a.user_id=p_actor limit 1;

  insert into public.audit_logs(actor_user_id,actor_email,action,entity_type,entity_id,after_data,event_meta)
  values(
    p_actor,v_actor_email,'media_cleanup_enqueued_v198','media_cleanup_job',v_job::text,
    jsonb_build_object('storage_bucket','catalog-media','object_path',v_path,'source_type','UPLOAD_ROLLBACK_'||v_type,'source_id',nullif(v_entity_text,'')),
    jsonb_build_object('gateway','media-control-admin-v185')
  );

  return jsonb_build_object('jobId',v_job,'storageBucket','catalog-media','objectPath',v_path);
end;
$$;

revoke all on function public.service_enqueue_owned_storage_cleanup_v198(uuid,text,text,text) from public, anon, authenticated;
grant execute on function public.service_enqueue_owned_storage_cleanup_v198(uuid,text,text,text) to service_role;

commit;
