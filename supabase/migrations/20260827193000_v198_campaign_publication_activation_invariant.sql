begin;

create or replace function private.normalize_campaign_publication_activation_v198()
returns trigger
language plpgsql
set search_path = pg_catalog, public, private
as $$
begin
  if new.publication_status = 'PUBLISHED' then
    new.is_active := true;
  elsif new.publication_status = 'ARCHIVED' then
    new.is_active := false;
  else
    new.is_active := coalesce(new.is_active, false);
  end if;
  return new;
end;
$$;

revoke all on function private.normalize_campaign_publication_activation_v198() from public, anon, authenticated;

drop trigger if exists campaigns_publication_activation_v198 on public.campaigns;
create trigger campaigns_publication_activation_v198
before insert or update of publication_status, is_active
on public.campaigns
for each row
execute function private.normalize_campaign_publication_activation_v198();

update public.campaigns
set is_active = case
  when publication_status = 'PUBLISHED' then true
  when publication_status = 'ARCHIVED' then false
  else is_active
end
where (publication_status = 'PUBLISHED' and is_active is distinct from true)
   or (publication_status = 'ARCHIVED' and is_active is distinct from false);

alter table public.campaigns
  drop constraint if exists campaigns_publication_activation_v198_check;
alter table public.campaigns
  add constraint campaigns_publication_activation_v198_check
  check (
    (publication_status <> 'PUBLISHED' or is_active = true)
    and (publication_status <> 'ARCHIVED' or is_active = false)
  ) not valid;
alter table public.campaigns validate constraint campaigns_publication_activation_v198_check;

commit;
