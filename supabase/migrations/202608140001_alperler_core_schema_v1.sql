create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  role text not null default 'admin' check (role in ('owner','admin','editor','support')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index admin_users_email_lower_uidx on public.admin_users (lower(email));

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users au
    where au.user_id = auth.uid()
      and au.is_active = true
  );
$$;

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  stock_code text unique,
  category text not null check (category in ('RENTAL','SALE')),
  brand text not null,
  model text not null,
  model_year integer check (model_year between 1950 and 2100),
  price numeric(14,2) not null default 0 check (price >= 0),
  currency text not null default 'TRY' check (currency in ('TRY','EUR','USD','CHF')),
  rental_price_daily numeric(14,2) check (rental_price_daily is null or rental_price_daily >= 0),
  mileage_km integer check (mileage_km is null or mileage_km >= 0),
  fuel_type text,
  transmission text,
  body_type text,
  color text,
  engine text,
  seats smallint check (seats is null or seats between 1 and 100),
  doors smallint check (doors is null or doors between 1 and 20),
  location text,
  description text,
  features jsonb not null default '[]'::jsonb,
  images jsonb not null default '[]'::jsonb,
  cover_image text,
  is_featured boolean not null default false,
  is_active boolean not null default true,
  availability_status text not null default 'AVAILABLE' check (availability_status in ('AVAILABLE','RESERVED','RENTED','SOLD','MAINTENANCE','HIDDEN')),
  seo_slug text unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index vehicles_category_active_idx on public.vehicles (category, is_active, availability_status);
create index vehicles_brand_model_idx on public.vehicles (brand, model);
create index vehicles_price_idx on public.vehicles (price);
create index vehicles_created_at_idx on public.vehicles (created_at desc);

create table public.tours (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  seo_slug text unique,
  category text,
  short_description text,
  description text,
  price_per_person numeric(14,2) not null default 0 check (price_per_person >= 0),
  currency text not null default 'TRY' check (currency in ('TRY','EUR','USD','CHF')),
  duration text,
  capacity integer check (capacity is null or capacity > 0),
  meeting_point text,
  itinerary jsonb not null default '[]'::jsonb,
  included_items jsonb not null default '[]'::jsonb,
  excluded_items jsonb not null default '[]'::jsonb,
  images jsonb not null default '[]'::jsonb,
  cover_image text,
  is_featured boolean not null default false,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tours_active_idx on public.tours (is_active, created_at desc);
create index tours_price_idx on public.tours (price_per_person);

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique,
  branch_type text not null default 'BRANCH' check (branch_type in ('BRANCH','DELIVERY_POINT','AIRPORT','HOTEL_DELIVERY')),
  address_line text,
  district text,
  city text,
  country text not null default 'Türkiye',
  latitude numeric(9,6),
  longitude numeric(9,6),
  phone text,
  whatsapp text,
  email text,
  opening_hours jsonb not null default '{}'::jsonb,
  services jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index branches_active_sort_idx on public.branches (is_active, sort_order, name);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default ('RES-' || to_char(now(),'YYYYMMDD') || '-' || upper(substr(encode(gen_random_bytes(6),'hex'),1,8))),
  idempotency_key text unique,
  booking_type text not null check (booking_type in ('RENTAL','TOUR','SALE_INQUIRY','APPOINTMENT')),
  vehicle_id uuid references public.vehicles(id) on delete set null,
  tour_id uuid references public.tours(id) on delete set null,
  item_name text not null,
  customer_name text not null,
  customer_email text,
  customer_phone text not null,
  start_at timestamptz,
  end_at timestamptz,
  pickup_branch_id uuid references public.branches(id) on delete set null,
  dropoff_branch_id uuid references public.branches(id) on delete set null,
  pickup_location text,
  dropoff_location text,
  person_count integer check (person_count is null or person_count between 1 and 100),
  with_driver boolean not null default false,
  base_price numeric(14,2) check (base_price is null or base_price >= 0),
  total_price numeric(14,2) check (total_price is null or total_price >= 0),
  currency text not null default 'TRY' check (currency in ('TRY','EUR','USD','CHF')),
  payment_method text not null default 'NONE' check (payment_method in ('NONE','CARD','EFT','OFFICE')),
  payment_status text not null default 'NOT_REQUIRED' check (payment_status in ('NOT_REQUIRED','PENDING','PAID','FAILED','REFUNDED','CANCELLED')),
  status text not null default 'PENDING' check (status in ('PENDING','APPROVED','REJECTED','COMPLETED','CANCELLED')),
  source text not null default 'WEB' check (source in ('WEB','ADMIN','PHONE','WHATSAPP')),
  notes text,
  customer_locale text default 'tr',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index bookings_created_at_idx on public.bookings (created_at desc);
create index bookings_status_type_idx on public.bookings (status, booking_type, created_at desc);
create index bookings_customer_email_idx on public.bookings (lower(customer_email)) where customer_email is not null;
create index bookings_customer_phone_idx on public.bookings (customer_phone);
create index bookings_vehicle_idx on public.bookings (vehicle_id, start_at, end_at) where vehicle_id is not null;
create index bookings_tour_idx on public.bookings (tour_id, start_at) where tour_id is not null;

create table public.partner_requests (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default ('VAL-' || to_char(now(),'YYYYMMDD') || '-' || upper(substr(encode(gen_random_bytes(6),'hex'),1,8))),
  customer_name text not null,
  customer_email text,
  customer_phone text not null,
  vehicle_brand text,
  vehicle_model text,
  model_year integer,
  mileage_km integer,
  asking_price numeric(14,2),
  currency text not null default 'TRY' check (currency in ('TRY','EUR','USD','CHF')),
  description text,
  media_paths jsonb not null default '[]'::jsonb,
  status text not null default 'NEW' check (status in ('NEW','REVIEWING','CONTACTED','OFFERED','ACCEPTED','REJECTED','CLOSED')),
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index partner_requests_status_created_idx on public.partner_requests (status, created_at desc);

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default ('MSG-' || to_char(now(),'YYYYMMDD') || '-' || upper(substr(encode(gen_random_bytes(6),'hex'),1,8))),
  name text not null,
  email text not null,
  phone text,
  subject text,
  message text not null,
  status text not null default 'NEW' check (status in ('NEW','READ','REPLIED','ARCHIVED','SPAM')),
  source text not null default 'WEB',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index contact_messages_status_created_idx on public.contact_messages (status, created_at desc);

create table public.subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  locale text not null default 'tr',
  status text not null default 'ACTIVE' check (status in ('ACTIVE','UNSUBSCRIBED','BOUNCED')),
  consent_at timestamptz not null default now(),
  unsubscribe_token uuid not null default gen_random_uuid(),
  source text not null default 'WEB',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index subscribers_email_lower_uidx on public.subscribers (lower(email));

create table public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete restrict,
  provider text not null,
  provider_reference text,
  idempotency_key text unique,
  amount numeric(14,2) not null check (amount >= 0),
  currency text not null check (currency in ('TRY','EUR','USD','CHF')),
  status text not null check (status in ('CREATED','PENDING','AUTHORIZED','PAID','FAILED','CANCELLED','REFUNDED','PARTIALLY_REFUNDED')),
  request_snapshot jsonb not null default '{}'::jsonb,
  response_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index payment_provider_reference_uidx on public.payment_transactions (provider, provider_reference) where provider_reference is not null;
create index payment_booking_idx on public.payment_transactions (booking_id, created_at desc);

create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete cascade,
  contact_message_id uuid references public.contact_messages(id) on delete cascade,
  event_key text not null,
  channel text not null check (channel in ('EMAIL','SMS','WHATSAPP','PUSH','ADMIN_EMAIL')),
  recipient text,
  provider text,
  provider_message_id text,
  status text not null default 'PENDING' check (status in ('PENDING','PROCESSING','SENT','DELIVERED','FAILED','SKIPPED')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_error text,
  sent_at timestamptz,
  delivered_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_parent_chk check (booking_id is not null or contact_message_id is not null)
);
create unique index notification_event_channel_uidx on public.notification_deliveries (coalesce(booking_id::text,''), coalesce(contact_message_id::text,''), event_key, channel);
create index notification_status_idx on public.notification_deliveries (status, created_at);

create table public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  excerpt text,
  content text not null,
  cover_image text,
  author_name text,
  status text not null default 'DRAFT' check (status in ('DRAFT','PUBLISHED','ARCHIVED')),
  published_at timestamptz,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index blog_posts_public_idx on public.blog_posts (status, published_at desc);

create table public.faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  category text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index faqs_active_sort_idx on public.faqs (is_active, sort_order);

create table public.site_config (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  is_public boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_email text,
  action text not null,
  entity_type text not null,
  entity_id text,
  before_data jsonb,
  after_data jsonb,
  ip_hash text,
  user_agent text,
  created_at timestamptz not null default now()
);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id, created_at desc);
create index audit_logs_actor_idx on public.audit_logs (actor_user_id, created_at desc);

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  bucket text not null,
  object_path text not null,
  media_type text,
  owner_user_id uuid references auth.users(id) on delete set null,
  entity_type text,
  entity_id text,
  alt_text text,
  is_public boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(bucket, object_path)
);

create trigger admin_users_updated_at before update on public.admin_users for each row execute function public.set_updated_at();
create trigger vehicles_updated_at before update on public.vehicles for each row execute function public.set_updated_at();
create trigger tours_updated_at before update on public.tours for each row execute function public.set_updated_at();
create trigger branches_updated_at before update on public.branches for each row execute function public.set_updated_at();
create trigger bookings_updated_at before update on public.bookings for each row execute function public.set_updated_at();
create trigger partner_requests_updated_at before update on public.partner_requests for each row execute function public.set_updated_at();
create trigger contact_messages_updated_at before update on public.contact_messages for each row execute function public.set_updated_at();
create trigger subscribers_updated_at before update on public.subscribers for each row execute function public.set_updated_at();
create trigger payment_transactions_updated_at before update on public.payment_transactions for each row execute function public.set_updated_at();
create trigger notification_deliveries_updated_at before update on public.notification_deliveries for each row execute function public.set_updated_at();
create trigger blog_posts_updated_at before update on public.blog_posts for each row execute function public.set_updated_at();
create trigger faqs_updated_at before update on public.faqs for each row execute function public.set_updated_at();