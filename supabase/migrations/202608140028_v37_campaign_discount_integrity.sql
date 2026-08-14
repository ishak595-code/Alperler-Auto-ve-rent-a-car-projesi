create or replace function public.set_campaign_discount_percent()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.old_price is not null and new.old_price < 0 then
    raise exception 'old_price cannot be negative';
  end if;
  if new.new_price is not null and new.new_price < 0 then
    raise exception 'new_price cannot be negative';
  end if;

  if new.old_price is not null
     and new.new_price is not null
     and new.old_price > 0
     and new.old_price > new.new_price then
    new.discount_percent := greatest(1, least(99, round(((new.old_price - new.new_price) / new.old_price) * 100)));
  else
    new.discount_percent := null;
  end if;

  if new.starts_at is not null and new.ends_at is not null and new.ends_at <= new.starts_at then
    raise exception 'campaign ends_at must be after starts_at';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_campaign_discount_integrity on public.campaigns;
create trigger trg_campaign_discount_integrity
before insert or update of old_price, new_price, starts_at, ends_at
on public.campaigns
for each row
execute function public.set_campaign_discount_percent();

update public.campaigns
set updated_at = updated_at
where true;
