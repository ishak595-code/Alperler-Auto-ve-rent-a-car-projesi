-- V71 branch/partner application foundation and homepage conversion hardening.

create table if not exists public.branch_partner_requests (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default (('BRN-' || to_char(now(),'YYYYMMDD')) || '-' || upper(substr(encode(gen_random_bytes(6),'hex'),1,8))),
  idempotency_key text not null unique,
  full_name text not null,
  phone text not null,
  email text,
  city text not null,
  district text not null,
  operating_area text,
  current_business text,
  experience_years integer not null default 0 check (experience_years between 0 and 60),
  office_status text not null default 'PLAN' check (office_status in ('OWN','RENT','PLAN','NONE')),
  current_fleet_size integer not null default 0 check (current_fleet_size between 0 and 5000),
  planned_fleet_size integer not null default 1 check (planned_fleet_size between 1 and 5000),
  services jsonb not null default '[]'::jsonb,
  listing_model text not null default 'OWN_FLEET' check (listing_model in ('OWN_FLEET','REGIONAL_NETWORK','BOTH')),
  budget_range text not null default 'DISCUSS' check (budget_range in ('DISCUSS','UNDER_100K','100K_250K','250K_500K','500K_PLUS')),
  notes text,
  status text not null default 'NEW' check (status in ('NEW','REVIEWING','CONTACTED','DUE_DILIGENCE','APPROVED','REJECTED','CLOSED')),
  internal_notes text,
  source_path text not null default '/branch-partner',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submitted_at timestamptz not null default now()
);

create index if not exists branch_partner_requests_status_created_idx on public.branch_partner_requests(status, created_at desc);
create index if not exists branch_partner_requests_location_idx on public.branch_partner_requests(city, district);

alter table public.branch_partner_requests enable row level security;

update public.homepage_sections
set is_enabled=true,
    title='Şubelerimiz ve İş Ortaklığı',
    sort_order=35,
    max_items=3,
    settings=coalesce(settings,'{}'::jsonb) || jsonb_build_object('showPartnerCta',true,'partnerRoute','/branch-partner'),
    updated_at=now()
where section_key='branches';

insert into public.homepage_sections(section_key,title,section_type,is_enabled,sort_order,max_items,settings,updated_at)
select 'branches','Şubelerimiz ve İş Ortaklığı','CUSTOM',true,35,3,jsonb_build_object('showPartnerCta',true,'partnerRoute','/branch-partner'),now()
where not exists (select 1 from public.homepage_sections where section_key='branches');

update public.campaigns
set metadata = coalesce(metadata,'{}'::jsonb) || case slug
  when '7-gun-kirala-6-gun-ode-renault-megane' then jsonb_build_object(
    'actionPrompt','7 günlük planınız varsa bir günlük bedeli cebinizde bırakın.',
    'conditionLine','Kesintisiz 7 günlük kiralama ve araç müsaitliği koşuluyla.'
  )
  when 'gelin-arabasi-ozel-gun-paketi' then jsonb_build_object(
    'actionPrompt','Araç, şoför ve süslemeyi ayrı ayrı aramak yerine tek planla ilerleyin.',
    'conditionLine','Paket kapsamı ve araç seçimi tarih uygunluğuna göre netleştirilir.'
  )
  when 'cilo-daglari-buzullar-uzman-tur-deneyimi' then jsonb_build_object(
    'actionPrompt','Ulaşım ve rota planını bize bırakın, siz deneyime odaklanın.',
    'conditionLine','Tur tarihi hava, güvenlik ve rota koşullarına göre kesinleşir.'
  )
  else '{}'::jsonb end,
  updated_at=now()
where slug in ('7-gun-kirala-6-gun-ode-renault-megane','gelin-arabasi-ozel-gun-paketi','cilo-daglari-buzullar-uzman-tur-deneyimi');

update public.site_config
set value=jsonb_set(
  coalesce(value,'{}'::jsonb),
  '{homeContent}',
  coalesce(value->'homeContent','{}'::jsonb) || jsonb_build_object(
    'bookingTitle','Tarihini Seç, Sana Uyan Aracı Gör',
    'bookingSubtitle','Hizmet, teslim noktası ve tarih. Gereksiz form yok; önce uygun seçenekleri görün.',
    'campaignBannerTitle','Gerçek Avantajı Gör, Kararını Kolaylaştır',
    'campaignBannerSubtitle','Fiyat farkını, pakete dahil olanları ve geçerlilik süresini aynı kartta görün. Size uyan fırsatı tek dokunuşla açın.'
  ),
  true
), updated_at=now()
where key='site_settings';