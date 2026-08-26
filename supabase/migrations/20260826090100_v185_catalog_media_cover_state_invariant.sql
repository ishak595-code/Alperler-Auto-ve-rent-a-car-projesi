begin;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname='catalog_media_cover_active_image_check'
      and conrelid='public.catalog_media'::regclass
  ) then
    alter table public.catalog_media
      add constraint catalog_media_cover_active_image_check
      check (is_cover is not true or (is_active is true and kind='IMAGE'));
  end if;
end $$;

commit;
