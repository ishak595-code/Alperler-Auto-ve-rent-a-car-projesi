-- V168.1 Structured Tramer Truth
-- Distinguishes unknown, declared and independently verified tramer states.
-- Existing free-text tramer remains for human-readable detail, while publication
-- decisions use the structured status/provenance contract.

update public.vehicles
set metadata = jsonb_set(
  coalesce(metadata, '{}'::jsonb),
  '{tramerStatus}',
  to_jsonb(
    case
      when coalesce(trim(metadata->>'tramerStatus'),'') in ('UNKNOWN','DECLARED_CLEAN','DECLARED_RECORD','VERIFIED_CLEAN','VERIFIED_RECORD')
        then trim(metadata->>'tramerStatus')
      when coalesce(trim(metadata->>'tramer'),'') = '' then 'UNKNOWN'
      when metadata->>'tramer' ~* '(doğrulanmadı|belirtilmedi|bilinmiyor|unknown)' then 'UNKNOWN'
      when metadata->>'tramer' ~* '(kayıt[[:space:]]*yok|tramer[[:space:]]*yok|temiz)' then 'DECLARED_CLEAN'
      else 'DECLARED_RECORD'
    end
  ),
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
begin
  if new.category <> 'SALE' then
    return new;
  end if;

  new.metadata := coalesce(new.metadata, '{}'::jsonb);
  v_status := upper(trim(coalesce(new.metadata->>'tramerStatus','')));
  v_text := trim(coalesce(new.metadata->>'tramer',''));

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

  if v_status = 'UNKNOWN' then
    if v_text = '' then
      new.metadata := jsonb_set(new.metadata,'{tramer}',to_jsonb('Belirtilmedi / doğrulanmadı'::text),true);
    end if;
  elsif v_status = 'DECLARED_CLEAN' then
    if v_text = '' then
      new.metadata := jsonb_set(new.metadata,'{tramer}',to_jsonb('Beyan: tramer kaydı yok'::text),true);
    end if;
  elsif v_status = 'VERIFIED_CLEAN' then
    if v_text = '' then
      new.metadata := jsonb_set(new.metadata,'{tramer}',to_jsonb('Doğrulandı: tramer kaydı yok'::text),true);
    end if;
  elsif v_status in ('DECLARED_RECORD','VERIFIED_RECORD') and v_text = '' then
    raise exception using errcode='23514', message='VEHICLE_PUBLICATION_BLOCKED:SALE_TRAMER_DETAIL_REQUIRED';
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

  return new;
end;
$$;

comment on function public.enforce_sale_tramer_truth_v1681() is
'V168.1 structured tramer contract. UNKNOWN is explicit uncertainty, DECLARED_* is business/owner declaration, VERIFIED_* requires source name, HTTPS source URL and verification timestamp.';

drop trigger if exists sale_tramer_truth_gate_v1681 on public.vehicles;
create trigger sale_tramer_truth_gate_v1681
before insert or update of category, publication_status, metadata
on public.vehicles
for each row execute function public.enforce_sale_tramer_truth_v1681();
