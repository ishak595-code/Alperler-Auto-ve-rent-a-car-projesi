create table if not exists public.payment_settings (
  config_key text primary key default 'main' check (config_key = 'main'),
  provider text not null default 'PAYTR' check (provider in ('PAYTR','GENERIC_HOSTED','NONE')),
  card_enabled boolean not null default false,
  eft_enabled boolean not null default true,
  office_enabled boolean not null default true,
  deposit_mode text not null default 'NONE' check (deposit_mode in ('NONE','FIXED','PERCENT')),
  deposit_value numeric not null default 0 check (deposit_value >= 0),
  currency text not null default 'TRY' check (currency in ('TRY','EUR','USD','CHF')),
  bank_name text,
  iban text,
  account_holder text,
  customer_note text,
  test_mode boolean not null default true,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);
alter table public.payment_settings enable row level security;
drop policy if exists payment_settings_public_read on public.payment_settings;
create policy payment_settings_public_read on public.payment_settings for select to anon, authenticated using (true);
drop policy if exists payment_settings_admin_write on public.payment_settings;
create policy payment_settings_admin_write on public.payment_settings for all to authenticated using (private.can_manage_settings()) with check (private.can_manage_settings());
insert into public.payment_settings(config_key, provider, card_enabled, eft_enabled, office_enabled, deposit_mode, deposit_value, currency, customer_note, test_mode)
values ('main','PAYTR',false,true,true,'NONE',0,'TRY','Kartla online ödeme, sağlayıcı hesabı doğrulandıktan sonra aktif edilir. Havale/EFT ve ofiste ödeme seçenekleri işletme tercihine göre kullanılabilir.',true)
on conflict (config_key) do nothing;

create table if not exists public.vehicle_operations (
  vehicle_id uuid primary key references public.vehicles(id) on delete cascade,
  operational_status text not null default 'READY' check (operational_status in ('READY','RESERVED','RENTED','CLEANING','MAINTENANCE','INSPECTION_HOLD','OUT_OF_SERVICE')),
  odometer_km integer check (odometer_km is null or odometer_km >= 0),
  fuel_percent smallint check (fuel_percent is null or fuel_percent between 0 and 100),
  cleanliness_status text not null default 'UNKNOWN' check (cleanliness_status in ('UNKNOWN','CLEAN','NEEDS_CLEANING','DEEP_CLEANING')),
  last_inspection_at timestamptz,
  last_service_at timestamptz,
  next_service_at timestamptz,
  next_service_km integer check (next_service_km is null or next_service_km >= 0),
  insurance_expires_at date,
  periodic_inspection_expires_at date,
  damage_notes text,
  internal_notes text,
  gps_provider text,
  gps_device_id text,
  gps_status text not null default 'NOT_CONFIGURED' check (gps_status in ('NOT_CONFIGURED','CONNECTED','OFFLINE','ERROR')),
  gps_last_sync_at timestamptz,
  last_known_latitude numeric check (last_known_latitude is null or last_known_latitude between -90 and 90),
  last_known_longitude numeric check (last_known_longitude is null or last_known_longitude between -180 and 180),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.vehicle_operations enable row level security;
drop policy if exists vehicle_operations_admin_read on public.vehicle_operations;
create policy vehicle_operations_admin_read on public.vehicle_operations for select to authenticated using (private.can_manage_operations() or private.can_manage_settings());
drop policy if exists vehicle_operations_admin_write on public.vehicle_operations;
create policy vehicle_operations_admin_write on public.vehicle_operations for all to authenticated using (private.can_manage_operations() or private.can_manage_settings()) with check (private.can_manage_operations() or private.can_manage_settings());
create index if not exists vehicle_operations_status_idx on public.vehicle_operations(operational_status);
create index if not exists vehicle_operations_next_service_idx on public.vehicle_operations(next_service_at) where next_service_at is not null;

create table if not exists public.vehicle_inspections (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null,
  inspection_type text not null check (inspection_type in ('PRE_RENTAL','HANDOVER','RETURN','ROUTINE')),
  odometer_km integer check (odometer_km is null or odometer_km >= 0),
  fuel_percent smallint check (fuel_percent is null or fuel_percent between 0 and 100),
  cleanliness_status text check (cleanliness_status is null or cleanliness_status in ('CLEAN','NEEDS_CLEANING','DEEP_CLEANING')),
  exterior_status text check (exterior_status is null or exterior_status in ('OK','DAMAGE_NOTED','REQUIRES_SERVICE')),
  interior_status text check (interior_status is null or interior_status in ('OK','DAMAGE_NOTED','REQUIRES_CLEANING')),
  damage_notes text,
  checklist jsonb not null default '{}'::jsonb,
  photo_paths jsonb not null default '[]'::jsonb,
  completed_by uuid references auth.users(id),
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table public.vehicle_inspections enable row level security;
drop policy if exists vehicle_inspections_admin_read on public.vehicle_inspections;
create policy vehicle_inspections_admin_read on public.vehicle_inspections for select to authenticated using (private.can_manage_operations() or private.can_manage_settings());
drop policy if exists vehicle_inspections_admin_write on public.vehicle_inspections;
create policy vehicle_inspections_admin_write on public.vehicle_inspections for all to authenticated using (private.can_manage_operations() or private.can_manage_settings()) with check (private.can_manage_operations() or private.can_manage_settings());
create index if not exists vehicle_inspections_vehicle_completed_idx on public.vehicle_inspections(vehicle_id, completed_at desc);
create index if not exists vehicle_inspections_booking_idx on public.vehicle_inspections(booking_id) where booking_id is not null;

insert into public.vehicle_operations(vehicle_id, operational_status, odometer_km)
select id,
  case availability_status when 'RENTED' then 'RENTED' when 'RESERVED' then 'RESERVED' when 'MAINTENANCE' then 'MAINTENANCE' when 'HIDDEN' then 'OUT_OF_SERVICE' else 'READY' end,
  mileage_km
from public.vehicles where category='RENTAL'
on conflict (vehicle_id) do nothing;
