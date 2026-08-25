-- V168.1 Structured Tramer + Part Expertise Truth
-- Models unknown, declared and independently verified tramer states, explicit TRY
-- amounts, and Sahibinden-style part status selection without inventing clean data.

update public.vehicles
set metadata = jsonb_set(
  jsonb_set(
    coalesce(metadata, '{}'::jsonb),
    '{tramerStatus}',
    to_jsonb(
      case
        when upper(coalesce(trim(metadata->>'tramerStatus'),'')) in ('UNKNOWN','DECLARED_CLEAN','DECLARED_RECORD','VERIFIED_CLEAN','VERIFIED_RECORD')
          then upper(trim(metadata->>'tramerStatus'))
        when coalesce(trim(metadata->>'tramer'),'') = '' then 'UNKNOWN'
        when metadata->>'tramer' ~* '(doğrulanmadı|belirtilmedi|bilinmiyor|unknown)' then 'UNKNOWN'
        when metadata->>'tramer' ~* '(kayıt[[:space:]]*yok|tramer[[:space:]]*yok|temiz)' then 'DECLARED_CLEAN'
        else 'DECLARED_RECORD'
      end
    ),
    true
  ),
  '{tramerCurrency}',
  to_jsonb('TRY'::text),
  true
)
where category='SALE';

create or replace function public.enforce_sale_tramer_truth_v1681()
returns trigger
language plpgsql
set search_path=public,pg_catalog
as $$
declare
  v_status text := '';
  v_text text := '';
  v_source_name text := '';
  v_source_url text := '';
  v_verified_at text := '';
  v_currency text := 'TRY';
  v_amount numeric := null;
  v_expertise jsonb := '{}'::jsonb;
  v_key text;
  v_value text;
  v_original integer := 0;
  v_local_painted integer := 0;
  v_painted integer := 0;
  v_changed integer := 0;
  v_known integer := 0;
  v_summary text := '';
  v_old_status text := '';
begin
  if new.category <> 'SALE' then return new; end if;

  new.metadata := coalesce(new.metadata, '{}'::jsonb);
  v_status := upper(trim(coalesce(new.metadata->>'tramerStatus','')));
  v_text := trim(coalesce(new.metadata->>'tramer',''));
  v_currency := upper(trim(coalesce(new.metadata->>'tramerCurrency','TRY')));
  v_old_status := case when tg_op='UPDATE' then upper(trim(coalesce(old.metadata->>'tramerStatus',''))) else '' end;

  if v_status = '' then
    if new.publication_status in ('PUBLISHED','SCHEDULED') then
      raise exception using errcode='23514', message='VEHICLE_PUBLICATION_BLOCKED:SALE_TRAMER_STATUS_REQUIRED';
    end if;
    v_status := 'UNKNOWN';
    new.metadata := jsonb_set(new.metadata,'{tramerStatus}',to_jsonb(v_status),true);
  end if;

  if v_status not in ('UNKNOWN','DECLARED_CLEAN','DECLARED_RECORD','VERIFIED_CLEAN','VERIFIED_RECORD') then
    raise exception using errcode='23514', message='VEHICLE_PUBLICATION_BLOCKED:SALE_TRAMER_STATUS_INVALID';
  end if;

  -- New publication decisions need at least an explicit declaration. Existing live
  -- UNKNOWN rows are grandfathered until their tramer status or publication state changes.
  if new.publication_status in ('PUBLISHED','SCHEDULED') and v_status='UNKNOWN' then
    if tg_op='INSERT' or old.publication_status not in ('PUBLISHED','SCHEDULED') or v_old_status <> v_status then
      raise exception using errcode='23514', message='VEHICLE_PUBLICATION_BLOCKED:SALE_TRAMER_DECLARATION_REQUIRED';
    end if;
  end if;

  if v_currency <> 'TRY' then
    raise exception using errcode='23514', message='VEHICLE_PUBLICATION_BLOCKED:SALE_TRAMER_CURRENCY_MUST_BE_TRY';
  end if;
  new.metadata := jsonb_set(new.metadata,'{tramerCurrency}',to_jsonb('TRY'::text),true);

  begin
    if nullif(trim(coalesce(new.metadata->>'tramerAmount','')),'') is not null then
      v_amount := (new.metadata->>'tramerAmount')::numeric;
    end if;
  exception when others then
    raise exception using errcode='23514', message='VEHICLE_PUBLICATION_BLOCKED:SALE_TRAMER_AMOUNT_INVALID';
  end;
  if v_amount is not null and v_amount < 0 then
    raise exception using errcode='23514', message='VEHICLE_PUBLICATION_BLOCKED:SALE_TRAMER_AMOUNT_INVALID';
  end if;

  if v_status = 'UNKNOWN' then
    if v_text = '' then new.metadata := jsonb_set(new.metadata,'{tramer}',to_jsonb('Belirtilmedi / doğrulanmadı'::text),true); end if;
    new.metadata := new.metadata - 'tramerAmount';
  elsif v_status in ('DECLARED_CLEAN','VERIFIED_CLEAN') then
    new.metadata := jsonb_set(new.metadata,'{tramerAmount}',to_jsonb(0::numeric),true);
    if v_text = '' then
      new.metadata := jsonb_set(new.metadata,'{tramer}',to_jsonb(case when v_status='VERIFIED_CLEAN' then 'Doğrulandı: tramer kaydı yok' else 'Beyan: tramer kaydı yok' end),true);
    end if;
  else
    if v_text = '' then
      raise exception using errcode='23514', message='VEHICLE_PUBLICATION_BLOCKED:SALE_TRAMER_DETAIL_REQUIRED';
    end if;
    if v_amount is null or v_amount <= 0 then
      raise exception using errcode='23514', message='VEHICLE_PUBLICATION_BLOCKED:SALE_TRAMER_AMOUNT_REQUIRED';
    end if;
  end if;

  if v_status in ('VERIFIED_CLEAN','VERIFIED_RECORD') then
    v_source_name := trim(coalesce(new.metadata->>'tramerSourceName',''));
    v_source_url := trim(coalesce(new.metadata->>'tramerSourceUrl',''));
    v_verified_at := trim(coalesce(new.metadata->>'tramerVerifiedAt',''));
    if v_source_name = '' or v_source_url !~ '^https://' or v_verified_at = '' then
      raise exception using errcode='23514', message='VEHICLE_PUBLICATION_BLOCKED:SALE_TRAMER_VERIFICATION_PROVENANCE_REQUIRED';
    end if;
  else
    new.metadata := new.metadata - array['tramerSourceName','tramerSourceUrl','tramerVerifiedAt']::text[];
  end if;

  v_expertise := coalesce(new.metadata->'damageExpertise','{}'::jsonb);
  if jsonb_typeof(v_expertise) <> 'object' then
    raise exception using errcode='23514', message='VEHICLE_PUBLICATION_BLOCKED:SALE_EXPERTISE_INVALID';
  end if;

  for v_key,v_value in select key,value #>> '{}' from jsonb_each(v_expertise) loop
    if v_key not in ('hood','frontBumper','rearBumper','roof','trunk','frontLeftDoor','frontRightDoor','rearLeftDoor','rearRightDoor','frontLeftFender','frontRightFender','rearLeftFender','rearRightFender') then
      raise exception using errcode='23514', message='VEHICLE_PUBLICATION_BLOCKED:SALE_EXPERTISE_PART_INVALID';
    end if;
    if v_value not in ('original','local_painted','painted','changed') then
      raise exception using errcode='23514', message='VEHICLE_PUBLICATION_BLOCKED:SALE_EXPERTISE_STATUS_INVALID';
    end if;
    v_known := v_known + 1;
    if v_value='original' then v_original:=v_original+1;
    elsif v_value='local_painted' then v_local_painted:=v_local_painted+1;
    elsif v_value='painted' then v_painted:=v_painted+1;
    elsif v_value='changed' then v_changed:=v_changed+1;
    end if;
  end loop;

  if coalesce((new.metadata->>'isDamageFree')::boolean,false) and (v_local_painted+v_painted+v_changed)>0 then
    raise exception using errcode='23514', message='VEHICLE_PUBLICATION_BLOCKED:SALE_DAMAGE_FREE_EXPERTISE_CONFLICT';
  end if;

  if v_known = 0 then
    v_summary := 'Parça bazlı ekspertiz bilgisi girilmedi';
  else
    v_summary := concat_ws(' · ',
      case when v_original>0 then v_original||' orijinal' end,
      case when v_local_painted>0 then v_local_painted||' lokal boyalı' end,
      case when v_painted>0 then v_painted||' boyalı' end,
      case when v_changed>0 then v_changed||' değişen' end,
      case when v_known<13 then (13-v_known)||' bilgi yok' end
    );
  end if;
  new.metadata := jsonb_set(new.metadata,'{expertiseSummary}',to_jsonb(v_summary),true);
  return new;
end;
$$;

comment on function public.enforce_sale_tramer_truth_v1681() is
'V168.1 sale truth contract: structured tramer declaration/verification, TRY amount, 13 part statuses (unknown by omission, original, local_painted, painted, changed) and derived expertise summary.';

drop trigger if exists sale_tramer_truth_gate_v1681 on public.vehicles;
create trigger sale_tramer_truth_gate_v1681
before insert or update of category, publication_status, metadata
on public.vehicles
for each row execute function public.enforce_sale_tramer_truth_v1681();
