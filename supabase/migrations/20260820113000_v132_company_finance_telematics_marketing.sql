-- V132: Alperler Rent A Car finance, telematics and marketing foundations.
-- Idempotent by design so an environment that already received the production
-- DDL can safely adopt this migration file without recreating data.

create extension if not exists pgcrypto;
create schema if not exists private;

alter table public.bookings add column if not exists campaign_id uuid references public.campaigns(id) on delete set null;
alter table public.bookings add column if not exists discount_amount numeric not null default 0 check (discount_amount >= 0);
alter table public.bookings add column if not exists amount_paid numeric not null default 0 check (amount_paid >= 0);
alter table public.bookings add column if not exists payment_recorded_at timestamptz;

create table if not exists public.finance_transactions (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  direction text not null check (direction in ('INCOME','EXPENSE')),
  category text not null check (category in ('RENTAL','VEHICLE_SALE','TOUR','DEPOSIT','SERVICE','REFUND','MAINTENANCE','FUEL','CLEANING','INSURANCE','TAX','ADVERTISING','SALARY','OFFICE','OTHER')),
  booking_id uuid references public.bookings(id) on delete set null,
  payment_transaction_id uuid references public.payment_transactions(id) on delete set null,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  tour_id uuid references public.tours(id) on delete set null,
  campaign_id uuid references public.campaigns(id) on delete set null,
  payment_method text,
  gross_amount numeric not null check (gross_amount >= 0),
  discount_amount numeric not null default 0 check (discount_amount >= 0),
  tax_amount numeric not null default 0 check (tax_amount >= 0),
  net_amount numeric not null check (net_amount >= 0),
  currency text not null default 'TRY' check (currency in ('TRY','EUR','USD','CHF')),
  counterparty_name text,
  reference text,
  description text,
  source text not null default 'MANUAL' check (source in ('AUTOMATIC','MANUAL','PAYTR','EFT','OFFICE','IMPORT')),
  external_reference text,
  receipt_number text,
  invoice_number text,
  status text not null default 'POSTED' check (status in ('PENDING','POSTED','VOID')),
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists finance_transactions_booking_idx on public.finance_transactions(booking_id);
create index if not exists finance_transactions_category_idx on public.finance_transactions(direction,category,occurred_at desc);
create index if not exists finance_transactions_period_idx on public.finance_transactions(occurred_at desc);
create index if not exists finance_transactions_vehicle_idx on public.finance_transactions(vehicle_id);
create unique index if not exists finance_transactions_external_uidx on public.finance_transactions(source,external_reference) where external_reference is not null and status <> 'VOID';
create unique index if not exists finance_transactions_payment_tx_uidx on public.finance_transactions(payment_transaction_id) where payment_transaction_id is not null and status <> 'VOID';

create table if not exists public.vehicle_telematics_devices (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null unique references public.vehicles(id) on delete cascade,
  provider text not null default 'NOT_CONFIGURED',
  external_vehicle_id text,
  device_id text,
  capabilities jsonb not null default '{}'::jsonb,
  connection_status text not null default 'NOT_CONFIGURED' check (connection_status in ('NOT_CONFIGURED','CONNECTED','OFFLINE','ERROR','SUSPENDED')),
  last_seen_at timestamptz,
  latitude numeric check (latitude is null or latitude between -90 and 90),
  longitude numeric check (longitude is null or longitude between -180 and 180),
  speed_kph numeric check (speed_kph is null or speed_kph >= 0),
  ignition_on boolean,
  odometer_km integer check (odometer_km is null or odometer_km >= 0),
  heading_degrees numeric check (heading_degrees is null or heading_degrees between 0 and 360),
  battery_voltage numeric,
  last_location_accuracy_m numeric,
  geofence_enabled boolean not null default false,
  geofence_center_lat numeric,
  geofence_center_lon numeric,
  geofence_radius_m integer check (geofence_radius_m is null or geofence_radius_m >= 50),
  metadata jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists vehicle_telematics_status_idx on public.vehicle_telematics_devices(connection_status,last_seen_at desc);

create table if not exists public.vehicle_telematics_events (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  device_id uuid references public.vehicle_telematics_devices(id) on delete cascade,
  event_type text not null,
  occurred_at timestamptz not null default now(),
  latitude numeric,
  longitude numeric,
  speed_kph numeric,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists vehicle_telematics_events_vehicle_idx on public.vehicle_telematics_events(vehicle_id,occurred_at desc);

create table if not exists public.vehicle_remote_commands (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  device_id uuid references public.vehicle_telematics_devices(id) on delete set null,
  command_type text not null check (command_type in ('LOCK','UNLOCK','HORN','IMMOBILIZE_NEXT_STOP','CLEAR_IMMOBILIZER')),
  status text not null default 'REQUESTED' check (status in ('REQUESTED','SAFETY_BLOCKED','QUEUED','SENT','ACKNOWLEDGED','FAILED','REJECTED','EXPIRED')),
  reason text not null,
  requested_by uuid not null references auth.users(id) on delete restrict,
  requested_at timestamptz not null default now(),
  safety_snapshot jsonb not null default '{}'::jsonb,
  provider_command_id text,
  provider_response jsonb not null default '{}'::jsonb,
  acknowledged_at timestamptz,
  executed_at timestamptz,
  expires_at timestamptz not null default (now() + interval '10 minutes'),
  error_message text,
  idempotency_key text not null default gen_random_uuid()::text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists vehicle_remote_commands_idempotency_uidx on public.vehicle_remote_commands(idempotency_key);
create index if not exists vehicle_remote_commands_vehicle_idx on public.vehicle_remote_commands(vehicle_id,requested_at desc);

create table if not exists public.marketing_integrations (
  id uuid primary key default gen_random_uuid(),
  provider text not null unique check (provider in ('GOOGLE_ADS','META_ADS')),
  status text not null default 'NOT_CONNECTED' check (status in ('NOT_CONNECTED','CONNECTED','ERROR','SUSPENDED')),
  account_id text,
  manager_account_id text,
  display_name text,
  configuration jsonb not null default '{}'::jsonb,
  last_sync_at timestamptz,
  last_error text,
  connected_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('GOOGLE_ADS','META_ADS')),
  target_type text not null check (target_type in ('VEHICLE','TOUR','CAMPAIGN','SITE')),
  target_id uuid,
  name text not null,
  objective text not null default 'TRAFFIC',
  status text not null default 'DRAFT' check (status in ('DRAFT','READY','PUBLISHING','ACTIVE','PAUSED','COMPLETED','ERROR')),
  daily_budget numeric check (daily_budget is null or daily_budget >= 0),
  total_budget numeric check (total_budget is null or total_budget >= 0),
  currency text not null default 'TRY' check (currency in ('TRY','EUR','USD','CHF')),
  starts_at timestamptz,
  ends_at timestamptz,
  audience jsonb not null default '{}'::jsonb,
  creative jsonb not null default '{}'::jsonb,
  external_campaign_id text,
  external_ad_group_id text,
  external_ad_id text,
  metrics jsonb not null default '{}'::jsonb,
  last_sync_at timestamptz,
  last_error text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);
create index if not exists marketing_campaigns_status_idx on public.marketing_campaigns(provider,status,created_at desc);
create index if not exists marketing_campaigns_target_idx on public.marketing_campaigns(target_type,target_id);

create table if not exists public.marketing_audit_events (
  id uuid primary key default gen_random_uuid(),
  marketing_campaign_id uuid references public.marketing_campaigns(id) on delete cascade,
  provider text not null,
  action text not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists marketing_audit_events_campaign_idx on public.marketing_audit_events(marketing_campaign_id,created_at desc);

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.can_manage_finance()
returns boolean language sql stable security definer set search_path='pg_catalog','public' as $$
  select exists(select 1 from public.admin_users au where au.user_id=(select auth.uid()) and au.is_active=true and (au.role in ('owner','admin') or coalesce(au.permissions,'{}'::jsonb) @> '{"finance.manage":true}'::jsonb));
$$;
create or replace function private.can_read_finance()
returns boolean language sql stable security definer set search_path='pg_catalog','public' as $$
  select exists(select 1 from public.admin_users au where au.user_id=(select auth.uid()) and au.is_active=true and (au.role in ('owner','admin') or coalesce(au.permissions,'{}'::jsonb) @> '{"finance.read":true}'::jsonb or coalesce(au.permissions,'{}'::jsonb) @> '{"finance.manage":true}'::jsonb));
$$;
create or replace function private.can_manage_marketing()
returns boolean language sql stable security definer set search_path='pg_catalog','public' as $$
  select exists(select 1 from public.admin_users au where au.user_id=(select auth.uid()) and au.is_active=true and (au.role in ('owner','admin') or coalesce(au.permissions,'{}'::jsonb) @> '{"marketing.manage":true}'::jsonb));
$$;
create or replace function private.can_manage_telematics()
returns boolean language sql stable security definer set search_path='pg_catalog','public' as $$
  select exists(select 1 from public.admin_users au where au.user_id=(select auth.uid()) and au.is_active=true and (au.role in ('owner','admin') or coalesce(au.permissions,'{}'::jsonb) @> '{"telematics.manage":true}'::jsonb));
$$;
create or replace function private.can_read_telematics()
returns boolean language sql stable security definer set search_path='pg_catalog','public' as $$
  select exists(select 1 from public.admin_users au where au.user_id=(select auth.uid()) and au.is_active=true and (au.role in ('owner','admin','support') or coalesce(au.permissions,'{}'::jsonb) @> '{"operations.manage":true}'::jsonb or coalesce(au.permissions,'{}'::jsonb) @> '{"telematics.read":true}'::jsonb or coalesce(au.permissions,'{}'::jsonb) @> '{"telematics.manage":true}'::jsonb));
$$;

revoke all on function private.can_manage_finance() from public, anon;
revoke all on function private.can_read_finance() from public, anon;
revoke all on function private.can_manage_marketing() from public, anon;
revoke all on function private.can_manage_telematics() from public, anon;
revoke all on function private.can_read_telematics() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.can_manage_finance() to authenticated;
grant execute on function private.can_read_finance() to authenticated;
grant execute on function private.can_manage_marketing() to authenticated;
grant execute on function private.can_manage_telematics() to authenticated;
grant execute on function private.can_read_telematics() to authenticated;

create or replace function private.sync_paid_payment_to_finance()
returns trigger
language plpgsql
security definer
set search_path='pg_catalog','public'
as $$
declare
  b public.bookings%rowtype;
  finance_category text;
  finance_source text;
begin
  if new.status <> 'PAID' or (tg_op='UPDATE' and old.status='PAID') then return new; end if;
  select * into b from public.bookings where id=new.booking_id;
  if not found then return new; end if;
  finance_category := case b.booking_type when 'RENTAL' then 'RENTAL' when 'TOUR' then 'TOUR' when 'SALE_INQUIRY' then 'VEHICLE_SALE' else 'SERVICE' end;
  finance_source := case lower(coalesce(new.provider,'')) when 'paytr' then 'PAYTR' when 'office' then 'OFFICE' when 'eft' then 'EFT' else 'AUTOMATIC' end;
  insert into public.finance_transactions(direction,category,booking_id,payment_transaction_id,vehicle_id,tour_id,campaign_id,payment_method,gross_amount,discount_amount,net_amount,currency,counterparty_name,reference,description,source,external_reference,status,metadata)
  values('INCOME',finance_category,b.id,new.id,b.vehicle_id,b.tour_id,b.campaign_id,b.payment_method,new.amount,b.discount_amount,new.amount,new.currency,b.customer_name,b.reference,b.item_name,finance_source,new.provider_reference,'POSTED',jsonb_build_object('booking_type',b.booking_type,'provider',new.provider))
  on conflict do nothing;
  update public.bookings
     set amount_paid=(select coalesce(sum(pt.amount),0) from public.payment_transactions pt where pt.booking_id=b.id and pt.status='PAID'),
         payment_recorded_at=now(), updated_at=now()
   where id=b.id;
  return new;
end;
$$;
revoke all on function private.sync_paid_payment_to_finance() from public, anon, authenticated;

alter table public.finance_transactions enable row level security;
alter table public.vehicle_telematics_devices enable row level security;
alter table public.vehicle_telematics_events enable row level security;
alter table public.vehicle_remote_commands enable row level security;
alter table public.marketing_integrations enable row level security;
alter table public.marketing_campaigns enable row level security;
alter table public.marketing_audit_events enable row level security;

drop policy if exists finance_transactions_read on public.finance_transactions;
create policy finance_transactions_read on public.finance_transactions for select to authenticated using (private.can_read_finance());
drop policy if exists finance_transactions_write on public.finance_transactions;
create policy finance_transactions_write on public.finance_transactions for insert to authenticated with check (private.can_manage_finance() and (created_by is null or created_by=(select auth.uid())));
drop policy if exists finance_transactions_update on public.finance_transactions;
create policy finance_transactions_update on public.finance_transactions for update to authenticated using (private.can_manage_finance()) with check (private.can_manage_finance());

drop policy if exists vehicle_telematics_read on public.vehicle_telematics_devices;
create policy vehicle_telematics_read on public.vehicle_telematics_devices for select to authenticated using (private.can_read_telematics());
drop policy if exists vehicle_telematics_write on public.vehicle_telematics_devices;
create policy vehicle_telematics_write on public.vehicle_telematics_devices for insert to authenticated with check (private.can_manage_telematics());
drop policy if exists vehicle_telematics_update on public.vehicle_telematics_devices;
create policy vehicle_telematics_update on public.vehicle_telematics_devices for update to authenticated using (private.can_manage_telematics()) with check (private.can_manage_telematics());
drop policy if exists vehicle_telematics_events_read on public.vehicle_telematics_events;
create policy vehicle_telematics_events_read on public.vehicle_telematics_events for select to authenticated using (private.can_read_telematics());
drop policy if exists vehicle_remote_commands_read on public.vehicle_remote_commands;
create policy vehicle_remote_commands_read on public.vehicle_remote_commands for select to authenticated using (private.can_read_telematics());
drop policy if exists vehicle_remote_commands_insert on public.vehicle_remote_commands;
create policy vehicle_remote_commands_insert on public.vehicle_remote_commands for insert to authenticated with check (private.can_manage_telematics() and requested_by=(select auth.uid()));
drop policy if exists vehicle_remote_commands_update on public.vehicle_remote_commands;
create policy vehicle_remote_commands_update on public.vehicle_remote_commands for update to authenticated using (private.can_manage_telematics()) with check (private.can_manage_telematics());

drop policy if exists marketing_integrations_all on public.marketing_integrations;
create policy marketing_integrations_all on public.marketing_integrations for all to authenticated using (private.can_manage_marketing()) with check (private.can_manage_marketing());
drop policy if exists marketing_campaigns_all on public.marketing_campaigns;
create policy marketing_campaigns_all on public.marketing_campaigns for all to authenticated using (private.can_manage_marketing()) with check (private.can_manage_marketing());
drop policy if exists marketing_audit_events_all on public.marketing_audit_events;
create policy marketing_audit_events_all on public.marketing_audit_events for all to authenticated using (private.can_manage_marketing()) with check (private.can_manage_marketing());

drop trigger if exists finance_transactions_touch_updated_at on public.finance_transactions;
create trigger finance_transactions_touch_updated_at before update on public.finance_transactions for each row execute function private.touch_updated_at();
drop trigger if exists vehicle_telematics_devices_touch_updated_at on public.vehicle_telematics_devices;
create trigger vehicle_telematics_devices_touch_updated_at before update on public.vehicle_telematics_devices for each row execute function private.touch_updated_at();
drop trigger if exists marketing_integrations_touch_updated_at on public.marketing_integrations;
create trigger marketing_integrations_touch_updated_at before update on public.marketing_integrations for each row execute function private.touch_updated_at();
drop trigger if exists marketing_campaigns_touch_updated_at on public.marketing_campaigns;
create trigger marketing_campaigns_touch_updated_at before update on public.marketing_campaigns for each row execute function private.touch_updated_at();
drop trigger if exists payment_transactions_finance_sync on public.payment_transactions;
create trigger payment_transactions_finance_sync after insert or update of status,amount,currency on public.payment_transactions for each row execute function private.sync_paid_payment_to_finance();

insert into public.marketing_integrations(provider,status,display_name,configuration)
values ('GOOGLE_ADS','NOT_CONNECTED','Google Ads','{}'::jsonb),('META_ADS','NOT_CONNECTED','Meta Ads','{}'::jsonb)
on conflict(provider) do nothing;

insert into public.vehicle_telematics_devices(vehicle_id)
select v.id from public.vehicles v where v.category='RENTAL' and v.is_active=true
on conflict(vehicle_id) do nothing;
