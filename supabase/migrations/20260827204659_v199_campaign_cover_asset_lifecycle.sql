create or replace function private.cleanup_campaign_cover_assets_v199()
returns trigger
language plpgsql
security definer
set search_path = 'pg_catalog', 'public', 'private'
as $$
declare
  v_keep_path text;
begin
  if tg_op = 'UPDATE' and new.cover_image is not distinct from old.cover_image then
    return new;
  end if;

  if tg_op = 'UPDATE' and nullif(btrim(coalesce(new.cover_image, '')), '') is not null then
    v_keep_path := split_part(new.cover_image, '/storage/v1/object/public/catalog-media/', 2);
    v_keep_path := nullif(split_part(v_keep_path, '?', 1), '');
  end if;

  delete from public.media_assets
  where bucket = 'catalog-media'
    and upper(coalesce(entity_type, '')) = 'CAMPAIGN'
    and entity_id = old.id::text
    and coalesce(metadata ->> 'purpose', '') = 'cover'
    and (v_keep_path is null or object_path <> v_keep_path);

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function private.cleanup_campaign_cover_assets_v199() from public, anon, authenticated;

drop trigger if exists campaigns_cover_asset_lifecycle_v199 on public.campaigns;
create trigger campaigns_cover_asset_lifecycle_v199
after update of cover_image or delete on public.campaigns
for each row execute function private.cleanup_campaign_cover_assets_v199();

-- Reconcile any previously registered campaign cover assets that are no longer canonical.
delete from public.media_assets a
using public.campaigns c
where a.bucket = 'catalog-media'
  and upper(coalesce(a.entity_type, '')) = 'CAMPAIGN'
  and a.entity_id = c.id::text
  and coalesce(a.metadata ->> 'purpose', '') = 'cover'
  and a.object_path <> nullif(split_part(split_part(c.cover_image, '/storage/v1/object/public/catalog-media/', 2), '?', 1), '');
