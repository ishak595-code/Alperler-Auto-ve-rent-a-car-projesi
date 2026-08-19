create or replace function public.sync_targeted_campaign_cover()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  resolved_cover text;
begin
  resolved_cover := null;

  if new.target_type = 'VEHICLE' and new.target_id is not null then
    select cover_image
      into resolved_cover
      from public.vehicles
     where id = new.target_id
     limit 1;
  elsif new.target_type = 'TOUR' and new.target_id is not null then
    select cover_image
      into resolved_cover
      from public.tours
     where id = new.target_id
     limit 1;
  end if;

  if nullif(btrim(coalesce(resolved_cover, '')), '') is not null then
    new.cover_image := resolved_cover;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_targeted_campaign_cover on public.campaigns;
create trigger trg_sync_targeted_campaign_cover
before insert or update of target_type, target_id, cover_image on public.campaigns
for each row
execute function public.sync_targeted_campaign_cover();
