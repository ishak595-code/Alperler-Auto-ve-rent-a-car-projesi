begin;

create or replace function private.normalize_campaign_target_route_v197()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.target_type in ('VEHICLE', 'TOUR') and new.target_id is not null then
    new.cta_url := null;
  end if;
  return new;
end;
$$;

revoke all on function private.normalize_campaign_target_route_v197() from public, anon, authenticated;

drop trigger if exists campaigns_target_route_v197 on public.campaigns;
create trigger campaigns_target_route_v197
before insert or update of target_type, target_id, cta_url
on public.campaigns
for each row
execute function private.normalize_campaign_target_route_v197();

update public.campaigns
set cta_url = null,
    updated_at = now()
where target_type in ('VEHICLE', 'TOUR')
  and target_id is not null
  and cta_url is not null;

alter table public.campaigns
  drop constraint if exists campaigns_target_reference_v197_ck;

alter table public.campaigns
  add constraint campaigns_target_reference_v197_ck
  check (target_type not in ('VEHICLE', 'TOUR') or target_id is not null)
  not valid;

alter table public.campaigns
  validate constraint campaigns_target_reference_v197_ck;

commit;
