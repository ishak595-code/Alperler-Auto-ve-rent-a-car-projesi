create or replace function public.service_rollback_campaign_media_asset_v200(
  p_actor uuid,
  p_campaign_id uuid,
  p_object_path text
)
returns jsonb
language plpgsql
security definer
set search_path = 'pg_catalog', 'public', 'private', 'auth'
as $$
declare
  v_path text := btrim(coalesce(p_object_path, ''));
  v_asset public.media_assets%rowtype;
  v_cover text;
  v_actor_email text;
begin
  if p_actor is null or not private.can_actor_manage_content_v174(p_actor) then
    raise exception using errcode='42501', message='CONTENT_PERMISSION_REQUIRED';
  end if;
  if p_campaign_id is null or v_path='' or length(v_path)>1000 or position('..' in v_path)>0 or left(v_path,6)<>'admin/' then
    raise exception using errcode='22023', message='INVALID_MEDIA_ASSET_STORAGE';
  end if;

  select * into v_asset
  from public.media_assets a
  where a.bucket='catalog-media'
    and a.object_path=v_path
    and a.owner_user_id=p_actor
    and upper(coalesce(a.entity_type,''))='CAMPAIGN'
    and coalesce(a.entity_id,'')=p_campaign_id::text
  for update;

  if not found then
    return jsonb_build_object('removed',false,'reason','NOT_FOUND','objectPath',v_path);
  end if;

  select c.cover_image into v_cover
  from public.campaigns c
  where c.id=p_campaign_id;

  if v_cover is not null and right(v_cover, length(v_path))=v_path then
    return jsonb_build_object('removed',false,'reason','STILL_REFERENCED','objectPath',v_path);
  end if;

  delete from public.media_assets where id=v_asset.id;

  select lower(coalesce(a.email,u.email)) into v_actor_email
  from public.admin_users a
  left join auth.users u on u.id=a.user_id
  where a.user_id=p_actor
  limit 1;

  insert into public.audit_logs(actor_user_id,actor_email,action,entity_type,entity_id,before_data,event_meta)
  values(
    p_actor,v_actor_email,'campaign_media_rollback_v200','media_asset',v_asset.id::text,
    jsonb_build_object('bucket',v_asset.bucket,'object_path',v_asset.object_path,'entity_type',v_asset.entity_type,'entity_id',v_asset.entity_id),
    jsonb_build_object('gateway','media-control-admin-v185','campaign_id',p_campaign_id)
  );

  return jsonb_build_object('removed',true,'reason','UNREFERENCED_UPLOAD_ROLLBACK','objectPath',v_path);
end;
$$;

revoke all on function public.service_rollback_campaign_media_asset_v200(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.service_rollback_campaign_media_asset_v200(uuid,uuid,text) to service_role;
