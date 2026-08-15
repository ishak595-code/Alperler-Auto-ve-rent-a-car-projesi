create or replace function public.validate_homepage_placement_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_section_type text;
  v_category text;
begin
  select section_type, coalesce(settings->>'category','')
    into v_section_type, v_category
  from public.homepage_sections
  where section_key = new.section_key;

  if v_section_type is null then
    raise exception 'UNKNOWN_HOMEPAGE_SECTION';
  end if;

  if v_section_type = 'VEHICLES' and new.entity_type <> 'VEHICLE' then
    raise exception 'HOMEPAGE_SECTION_REQUIRES_VEHICLE';
  elsif v_section_type = 'TOURS' and new.entity_type <> 'TOUR' then
    raise exception 'HOMEPAGE_SECTION_REQUIRES_TOUR';
  elsif v_section_type = 'BLOG' and new.entity_type <> 'BLOG' then
    raise exception 'HOMEPAGE_SECTION_REQUIRES_BLOG';
  elsif v_section_type = 'CAMPAIGN' and new.entity_type <> 'CAMPAIGN' then
    raise exception 'HOMEPAGE_SECTION_REQUIRES_CAMPAIGN';
  end if;

  if new.entity_type = 'VEHICLE' and v_category in ('RENTAL','SALE') then
    if not exists (
      select 1 from public.vehicles v
      where v.id = new.entity_id and v.category = v_category
    ) then
      raise exception 'HOMEPAGE_VEHICLE_CATEGORY_MISMATCH';
    end if;
  end if;

  if new.entity_type = 'TOUR' and not exists (select 1 from public.tours where id = new.entity_id) then
    raise exception 'HOMEPAGE_TOUR_NOT_FOUND';
  end if;
  if new.entity_type = 'BLOG' and not exists (select 1 from public.blog_posts where id = new.entity_id) then
    raise exception 'HOMEPAGE_BLOG_NOT_FOUND';
  end if;
  if new.entity_type = 'CAMPAIGN' and not exists (select 1 from public.campaigns where id = new.entity_id) then
    raise exception 'HOMEPAGE_CAMPAIGN_NOT_FOUND';
  end if;

  return new;
end;
$$;

revoke all on function public.validate_homepage_placement_integrity() from public;

drop trigger if exists trg_homepage_placement_integrity on public.homepage_placements;
create trigger trg_homepage_placement_integrity
before insert or update of section_key, entity_type, entity_id
on public.homepage_placements
for each row execute function public.validate_homepage_placement_integrity();
