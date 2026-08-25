-- V167 Rental Showcase and campaign package integrity.
-- Campaign-required extras are authoritative database rules, not browser hints.

alter table public.campaigns
  add column if not exists required_extra_ids text[] not null default '{}'::text[];

create or replace function private.v167_validate_campaign_required_extras()
returns trigger
language plpgsql
security definer
set search_path=public,private,pg_catalog
as $$
declare
  v_required text[] := '{}'::text[];
  v_selected text[] := '{}'::text[];
  v_metadata jsonb := '{}'::jsonb;
  v_invalid text;
begin
  select coalesce(c.required_extra_ids,'{}'::text[]) into v_required
  from public.campaigns c
  where c.id=new.campaign_id;

  if coalesce(array_length(v_required,1),0)=0 then return new; end if;

  select coalesce(b.metadata,'{}'::jsonb) into v_metadata
  from public.bookings b
  where b.id=new.booking_id;

  if jsonb_typeof(v_metadata->'selected_extra_ids')='array' then
    select coalesce(array_agg(distinct value),'{}'::text[])
      into v_selected
    from jsonb_array_elements_text(v_metadata->'selected_extra_ids') as x(value)
    where value ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$';
  end if;

  select required into v_invalid
  from unnest(v_required) as x(required)
  where required !~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$'
     or not (required=any(v_selected))
  limit 1;

  if v_invalid is not null then
    raise exception 'CAMPAIGN_REQUIRED_EXTRAS_MISSING:%',v_invalid;
  end if;
  return new;
end;
$$;
revoke all on function private.v167_validate_campaign_required_extras() from public,anon,authenticated,service_role;

drop trigger if exists campaign_redemptions_required_extras_v167 on public.campaign_redemptions;
create trigger campaign_redemptions_required_extras_v167
before insert on public.campaign_redemptions
for each row execute function private.v167_validate_campaign_required_extras();

-- Normalize the existing 7-day Megane offer to one free day at order level.
update public.campaigns
set discount_method='FIXED_AMOUNT',
    discount_value=2800,
    discount_scope='ORDER',
    minimum_rental_days=7,
    required_extra_ids='{}'::text[],
    metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object(
      'pricingVersion','V167',
      'requiredExtraIds','[]'::jsonb,
      'pricingContract','ONE_FREE_RENTAL_DAY'
    ),
    updated_at=now()
where slug='7-gun-kirala-6-gun-ode-renault-megane';

-- Normalize the wedding package: normal car + driver is 8,000 TRY,
-- the package grants a 1,500 TRY order discount only when driver is selected.
update public.campaigns
set discount_method='FIXED_AMOUNT',
    discount_value=1500,
    discount_scope='ORDER',
    minimum_rental_days=1,
    required_extra_ids=array['driver']::text[],
    metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object(
      'pricingVersion','V167',
      'requiredExtraIds',jsonb_build_array('driver'),
      'pricingContract','WEDDING_DRIVER_PACKAGE'
    ),
    updated_at=now()
where slug='gelin-arabasi-ozel-gun-paketi';

comment on column public.campaigns.required_extra_ids is
'V167 authoritative extra-service prerequisites. A campaign redemption is rejected unless the booking selected all required extras.';
