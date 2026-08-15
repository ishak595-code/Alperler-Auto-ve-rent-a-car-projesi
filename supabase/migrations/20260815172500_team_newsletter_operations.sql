-- V57: real Alperler team assignments and durable newsletter operations.

create table if not exists public.newsletter_campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subject text not null,
  body_text text not null,
  body_html text,
  audience_type text not null default 'ALL' check (audience_type in ('ALL','SINGLE','FILTERED')),
  audience_filter jsonb not null default '{}'::jsonb,
  status text not null default 'DRAFT' check (status in ('DRAFT','SCHEDULED','SENDING','SENT','PARTIAL','FAILED','CANCELLED')),
  scheduled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  total_recipients integer not null default 0,
  sent_count integer not null default 0,
  failed_count integer not null default 0,
  skipped_count integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.newsletter_deliveries (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.newsletter_campaigns(id) on delete cascade,
  subscriber_id uuid references public.subscribers(id) on delete set null,
  email text not null,
  status text not null default 'PENDING' check (status in ('PENDING','PROCESSING','SENT','DELIVERED','SKIPPED','FAILED')),
  provider text,
  provider_message_id text,
  attempt_count integer not null default 0,
  last_error text,
  sent_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  unique(campaign_id,email)
);

create index if not exists newsletter_campaigns_status_created_idx on public.newsletter_campaigns(status,created_at desc);
create index if not exists newsletter_deliveries_campaign_status_idx on public.newsletter_deliveries(campaign_id,status,created_at);
create index if not exists newsletter_deliveries_email_idx on public.newsletter_deliveries(lower(email));
create index if not exists subscribers_status_created_idx on public.subscribers(status,created_at desc);
create unique index if not exists subscribers_email_normalized_unique on public.subscribers(lower(email));

alter table public.newsletter_campaigns enable row level security;
alter table public.newsletter_deliveries enable row level security;

drop policy if exists newsletter_campaigns_admin_all on public.newsletter_campaigns;
create policy newsletter_campaigns_admin_all on public.newsletter_campaigns
for all to authenticated using (private.is_admin()) with check (private.is_admin());

drop policy if exists newsletter_deliveries_admin_all on public.newsletter_deliveries;
create policy newsletter_deliveries_admin_all on public.newsletter_deliveries
for all to authenticated using (private.is_admin()) with check (private.is_admin());

insert into public.newsletter_campaigns (
  id,title,subject,body_text,audience_type,status,total_recipients,sent_count,failed_count,skipped_count,metadata,created_by
) values (
  'eeeeeeee-0000-4000-8000-000000000001'::uuid,
  'Sistem | Bülten Hoş Geldiniz',
  'Alperler Auto bültenine hoş geldiniz',
  'Aboneliğiniz başarıyla alındı. Kampanyalar, yeni araçlar, tur fırsatları ve önemli duyurular için sizi bilgilendireceğiz.',
  'FILTERED','DRAFT',0,0,0,0,
  jsonb_build_object('system',true,'event','newsletter_subscribed'),
  (select id from auth.users where lower(email)=lower('ishak595@gmail.com') limit 1)
) on conflict (id) do nothing;

with owner_user as (
  select id from auth.users where lower(email)=lower('ishak595@gmail.com') limit 1
), business as (
  select value->>'phone' phone, value->>'email' business_email from public.site_config where key='site_settings' limit 1
)
insert into public.staff_profiles (id,auth_user_id,display_name,email,phone,job_title,department,is_active,metadata,created_by)
select * from (
  select 'a1000000-0000-4000-8000-000000000001'::uuid,(select id from owner_user),'İshak Alper','ishak595@gmail.com',(select phone from business),'Genel Müdür / İşletme Yöneticisi','MANAGEMENT',true,jsonb_build_object('rank',1,'canDrive',false,'responsibilities',jsonb_build_array('Genel yönetim','Yayın onayı','Finansal ve operasyonel gözetim','Ekip ve yetki yönetimi'),'publicTeam',true,'contactSource','site_settings','sharedBusinessEmail',(select business_email from business)),(select id from owner_user)
  union all
  select 'a1000000-0000-4000-8000-000000000002'::uuid,null,'Ferhat Alper',null,(select phone from business),'Filo, Teslimat ve Şoför Sorumlusu','FLEET',true,jsonb_build_object('rank',2,'canDrive',true,'responsibilities',jsonb_build_array('Kiralık filo takibi','Araç teslim/iade','Transfer şoförlüğü','Bakım koordinasyonu'),'publicTeam',true,'contactSource','site_settings','sharedBusinessEmail',(select business_email from business)),(select id from owner_user)
  union all
  select 'a1000000-0000-4000-8000-000000000003'::uuid,null,'İmran Alper',null,(select phone from business),'Tur, Transfer ve Şoför Operasyonları','TOURS',true,jsonb_build_object('rank',3,'canDrive',true,'responsibilities',jsonb_build_array('Tur şoförlüğü','VIP transfer','Rota operasyonu','Tur saha koordinasyonu'),'publicTeam',true,'contactSource','site_settings','sharedBusinessEmail',(select business_email from business)),(select id from owner_user)
  union all
  select 'a1000000-0000-4000-8000-000000000004'::uuid,null,'Selim Alper',null,(select phone from business),'Satış, Teslimat ve Müşteri Operasyonları','SALES',true,jsonb_build_object('rank',4,'canDrive',true,'responsibilities',jsonb_build_array('Satılık araç operasyonu','Müşteri karşılama','Araç teslimatı','Yedek şoförlük'),'publicTeam',true,'contactSource','site_settings','sharedBusinessEmail',(select business_email from business)),(select id from owner_user)
) seed(id,auth_user_id,display_name,email,phone,job_title,department,is_active,metadata,created_by)
on conflict (id) do update set auth_user_id=excluded.auth_user_id,display_name=excluded.display_name,email=excluded.email,phone=excluded.phone,job_title=excluded.job_title,department=excluded.department,is_active=true,metadata=excluded.metadata,updated_at=now();

insert into public.staff_branch_assignments(staff_id,branch_id,is_primary)
select s.id,b.id,true
from public.staff_profiles s cross join public.branches b
where s.id in ('a1000000-0000-4000-8000-000000000001'::uuid,'a1000000-0000-4000-8000-000000000002'::uuid,'a1000000-0000-4000-8000-000000000003'::uuid,'a1000000-0000-4000-8000-000000000004'::uuid)
  and b.code='YUKSEKOVA'
on conflict (staff_id,branch_id) do update set is_primary=true;

insert into public.vehicle_staff_assignments(vehicle_id,staff_id,responsibility)
select id,'a1000000-0000-4000-8000-000000000001'::uuid,'RESPONSIBLE' from public.vehicles where is_active=true on conflict do nothing;
insert into public.vehicle_staff_assignments(vehicle_id,staff_id,responsibility)
select id,'a1000000-0000-4000-8000-000000000002'::uuid,'FLEET' from public.vehicles where is_active=true and category='RENTAL' on conflict do nothing;
insert into public.vehicle_staff_assignments(vehicle_id,staff_id,responsibility)
select id,'a1000000-0000-4000-8000-000000000002'::uuid,'DELIVERY' from public.vehicles where is_active=true and category='RENTAL' on conflict do nothing;
insert into public.vehicle_staff_assignments(vehicle_id,staff_id,responsibility)
select id,'a1000000-0000-4000-8000-000000000002'::uuid,'MAINTENANCE' from public.vehicles where is_active=true and category='RENTAL' on conflict do nothing;
insert into public.vehicle_staff_assignments(vehicle_id,staff_id,responsibility)
select id,'a1000000-0000-4000-8000-000000000004'::uuid,'SALES' from public.vehicles where is_active=true and category='SALE' on conflict do nothing;
insert into public.vehicle_staff_assignments(vehicle_id,staff_id,responsibility)
select id,'a1000000-0000-4000-8000-000000000004'::uuid,'DELIVERY' from public.vehicles where is_active=true and category='SALE' on conflict do nothing;

insert into public.tour_staff_assignments(tour_id,staff_id,responsibility)
select id,'a1000000-0000-4000-8000-000000000001'::uuid,'COORDINATOR' from public.tours where is_active=true on conflict do nothing;
insert into public.tour_staff_assignments(tour_id,staff_id,responsibility)
select id,'a1000000-0000-4000-8000-000000000003'::uuid,'DRIVER' from public.tours where is_active=true on conflict do nothing;
insert into public.tour_staff_assignments(tour_id,staff_id,responsibility)
select id,'a1000000-0000-4000-8000-000000000002'::uuid,'DRIVER' from public.tours where is_active=true on conflict do nothing;
insert into public.tour_staff_assignments(tour_id,staff_id,responsibility)
select id,'a1000000-0000-4000-8000-000000000004'::uuid,'CONTENT' from public.tours where is_active=true on conflict do nothing;
