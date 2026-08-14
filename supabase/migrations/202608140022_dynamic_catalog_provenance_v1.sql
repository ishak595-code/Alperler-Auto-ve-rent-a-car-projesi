-- V37: first-class catalog provenance, branch ownership and verified tour location fields.
-- Existing legacy seed records are conservatively marked DEMO until the business verifies the physical asset.

alter table public.vehicles
  add column if not exists record_origin text not null default 'REAL',
  add column if not exists data_quality_status text not null default 'UNVERIFIED',
  add column if not exists spec_source_url text,
  add column if not exists spec_source_name text,
  add column if not exists actual_vehicle_verified boolean not null default false,
  add column if not exists branch_id uuid references public.branches(id) on delete set null;

alter table public.tours
  add column if not exists record_origin text not null default 'REAL',
  add column if not exists data_quality_status text not null default 'UNVERIFIED',
  add column if not exists source_url text,
  add column if not exists source_name text,
  add column if not exists location_name text,
  add column if not exists latitude numeric(9,6),
  add column if not exists longitude numeric(9,6),
  add column if not exists map_url text,
  add column if not exists branch_id uuid references public.branches(id) on delete set null;

alter table public.vehicles drop constraint if exists vehicles_record_origin_check;
alter table public.vehicles add constraint vehicles_record_origin_check
  check (record_origin in ('REAL','DEMO'));
alter table public.vehicles drop constraint if exists vehicles_data_quality_status_check;
alter table public.vehicles add constraint vehicles_data_quality_status_check
  check (data_quality_status in ('UNVERIFIED','RESEARCHED','BUSINESS_VERIFIED'));

alter table public.tours drop constraint if exists tours_record_origin_check;
alter table public.tours add constraint tours_record_origin_check
  check (record_origin in ('REAL','DEMO'));
alter table public.tours drop constraint if exists tours_data_quality_status_check;
alter table public.tours add constraint tours_data_quality_status_check
  check (data_quality_status in ('UNVERIFIED','RESEARCHED','BUSINESS_VERIFIED'));
alter table public.tours drop constraint if exists tours_latitude_check;
alter table public.tours add constraint tours_latitude_check
  check (latitude is null or latitude between -90 and 90);
alter table public.tours drop constraint if exists tours_longitude_check;
alter table public.tours add constraint tours_longitude_check
  check (longitude is null or longitude between -180 and 180);

create index if not exists idx_vehicles_origin_quality on public.vehicles(record_origin, data_quality_status);
create index if not exists idx_vehicles_branch_id on public.vehicles(branch_id);
create index if not exists idx_tours_origin_quality on public.tours(record_origin, data_quality_status);
create index if not exists idx_tours_branch_id on public.tours(branch_id);

update public.vehicles
set record_origin = 'DEMO',
    data_quality_status = case
      when coalesce(metadata->>'coverMediaSourceUrl','') <> '' then 'RESEARCHED'
      else 'UNVERIFIED'
    end,
    spec_source_url = nullif(metadata->>'specSourceUrl',''),
    spec_source_name = nullif(metadata->>'specSourceName',''),
    actual_vehicle_verified = false
where stock_code like 'LEGACY-%'
   or coalesce((metadata->>'demoDataReady')::boolean, false) = true;

update public.tours
set record_origin = 'DEMO',
    data_quality_status = case
      when coalesce(metadata->>'coverMediaSourceUrl','') <> ''
        or coalesce(metadata->>'verifiedLocation','') <> '' then 'RESEARCHED'
      else 'UNVERIFIED'
    end,
    source_url = nullif(metadata->>'coverMediaSourceUrl',''),
    source_name = nullif(metadata->>'coverMediaAttribution',''),
    location_name = coalesce(nullif(metadata->>'verifiedLocation',''), meeting_point),
    map_url = nullif(metadata->>'mapIframeUrl','')
where coalesce((metadata->>'demoDataReady')::boolean, false) = true;
