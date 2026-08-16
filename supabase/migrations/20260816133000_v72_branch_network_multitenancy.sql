-- V72 - Alperler Auto branch network, franchise isolation, central pricing and publication governance.

alter table public.branches
  add column if not exists slug text,
  add column if not exists network_type text not null default 'OWNED',
  add column if not exists partner_request_id uuid references public.branch_partner_requests(id) on delete set null,
  add column if not exists public_status text not null default 'ACTIVE',
  add column if not exists territory_label text,
  add column if not exists public_description text,
  add column if not exists hero_image text,
  add column if not exists customer_guarantee_enabled boolean not null default true,
  add column if not exists central_pricing_required boolean not null default true,
  add column if not exists listing_requires_approval boolean not null default true,
  add column if not exists brand_profile jsonb not null default '{}'::jsonb,
  add column if not exists service_rules jsonb not null default '{}'::jsonb;

alter table public.branches drop constraint if exists branches_network_type_check;
alter table public.branches add constraint branches_network_type_check
  check (network_type in ('OWNED','FRANCHISE','PARTNER'));
alter table public.branches drop constraint if exists branches_public_status_check;
alter table public.branches add constraint branches_public_status_check
  check (public_status in ('DRAFT','ACTIVE','SUSPENDED','CLOSED'));
create unique index if not exists branches_slug_uidx on public.branches(slug) where slug is not null;
create unique index if not exists branches_partner_request_uidx on public.branches(partner_request_id) where partner_request_id is not null;
create index if not exists branches_network_public_idx on public.branches(network_type, public_status, city, district);

update public.branches
set slug = coalesce(slug,
  trim(both '-' from lower(regexp_replace(
    translate(coalesce(city,'') || '-' || coalesce(district,'') || '-' || coalesce(code,id::text),
      'ÇĞİÖŞÜçğıöşü','CGIOSUcgiosu'),
    '[^a-zA-Z0-9]+','-','g')))
)
where slug is null;

alter table public.branch_partner_requests
  add column if not exists provisioned_branch_id uuid references public.branches(id) on delete set null,
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references auth.users(id) on delete set null,
  add column if not exists provisioned_at timestamptz,
  add column if not exists provisioned_by uuid references auth.users(id) on delete set null;
create unique index if not exists branch_partner_requests_provisioned_branch_uidx
  on public.branch_partner_requests(provisioned_branch_id) where provisioned_branch_id is not null;

create table if not exists public.branch_memberships (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'BRANCH_EDITOR' check (role in ('BRANCH_OWNER','BRANCH_MANAGER','BRANCH_EDITOR')),
  is_active boolean not null default true,
  invited_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(branch_id,user_id)
);
create index if not exists branch_memberships_user_active_idx on public.branch_memberships(user_id,is_active,branch_id);
alter table public.branch_memberships enable row level security;

create or replace function public.can_manage_branch(p_branch_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select private.is_admin() or exists (
    select 1 from public.branch_memberships bm
    where bm.branch_id = p_branch_id
      and bm.user_id = auth.uid()
      and bm.is_active = true
  );
$$;
revoke all on function public.can_manage_branch(uuid) from public;
grant execute on function public.can_manage_branch(uuid) to authenticated;

create table if not exists public.network_policy_rules (
  id uuid primary key default gen_random_uuid(),
  rule_key text not null,
  version integer not null default 1 check (version > 0),
  category text not null check (category in ('BRAND','SAFETY','CUSTOMER_GUARANTEE','PRICING','OPERATIONS','DATA_QUALITY')),
  title text not null,
  summary text,
  content text not null,
  is_required boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(rule_key,version)
);
alter table public.network_policy_rules enable row level security;

create table if not exists public.branch_policy_acceptances (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  policy_rule_id uuid not null references public.network_policy_rules(id) on delete restrict,
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  unique(branch_id,policy_rule_id)
);
alter table public.branch_policy_acceptances enable row level security;

create table if not exists public.branch_pricing_rules (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references public.branches(id) on delete cascade,
  category text not null check (category in ('RENTAL','SALE','TOUR')),
  vehicle_class text not null default '*',
  min_price numeric(14,2),
  max_price numeric(14,2),
  recommended_price numeric(14,2),
  currency text not null default 'TRY' check (currency in ('TRY','EUR','USD','CHF')),
  enforce_min boolean not null default true,
  enforce_max boolean not null default false,
  is_active boolean not null default true,
  valid_from timestamptz,
  valid_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (min_price is null or min_price >= 0),
  check (max_price is null or max_price >= 0),
  check (recommended_price is null or recommended_price >= 0),
  check (min_price is null or max_price is null or min_price <= max_price)
);
create unique index if not exists branch_pricing_rules_scope_uidx
  on public.branch_pricing_rules(coalesce(branch_id,'00000000-0000-0000-0000-000000000000'::uuid),category,vehicle_class,currency)
  where is_active = true;
create index if not exists branch_pricing_rules_lookup_idx on public.branch_pricing_rules(branch_id,category,vehicle_class,is_active);
alter table public.branch_pricing_rules enable row level security;

create table if not exists public.branch_setup_checklist (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  checklist_key text not null,
  label text not null,
  is_required boolean not null default true,
  completed_at timestamptz,
  completed_by uuid references auth.users(id) on delete set null,
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(branch_id,checklist_key)
);
alter table public.branch_setup_checklist enable row level security;

insert into public.network_policy_rules(rule_key,version,category,title,summary,content,is_required,is_active)
values
('BRAND_IDENTITY',1,'BRAND','Alperler Auto marka standardı','Şube, merkezi marka kimliğini ve müşteri iletişim standardını korur.','Logo, ilan dili, müşteri iletişimi, görsel kalite ve marka sunumu merkez tarafından belirlenen Alperler Auto standardıyla uyumlu olmalıdır.',true,true),
('VEHICLE_SAFETY',1,'SAFETY','Araç güvenliği ve belge doğrulaması','Yayındaki araçların kimliği, temel belgeleri ve güvenlik durumu doğrulanır.','Kiralık veya satılık araç yayına alınmadan önce araç kimliği, sahiplik veya kullanım yetkisi, zorunlu belgeler ve operasyon için gerekli güvenlik kontrolleri doğrulanmalıdır.',true,true),
('CUSTOMER_GUARANTEE',1,'CUSTOMER_GUARANTEE','Müşteri güvence standardı','Müşteriye ilan, fiyat ve hizmet koşulları açık biçimde gösterilir.','Şube müşteriye ilanla çelişen gizli ücret uygulayamaz. Rezervasyon, teslim, iade, iptal ve satış görüşmesi koşulları merkezi müşteri standardına uygun ve kayıtlı yürütülür.',true,true),
('PRICE_DISCIPLINE',1,'PRICING','Merkezi fiyat disiplini','Şube ilanları merkez tarafından tanımlanan fiyat sınırları içinde kalır.','Merkez tarafından aktif bir fiyat kuralı tanımlanmışsa şube bu alt veya üst sınırları aşamaz. Kampanya ve istisnalar merkez onayına tabidir.',true,true),
('DATA_ACCURACY',1,'DATA_QUALITY','İlan doğruluğu','Araç bilgisi ve görseller gerçek aracı doğru biçimde temsil eder.','Marka, model, yıl, kilometre, fiyat, donanım, hasar veya ekspertiz bilgisi ile kullanılan görseller yanıltıcı olamaz. Şube kaynaklı yeni ilanlar merkez yayın kontrolünden geçer.',true,true)
on conflict (rule_key,version) do update set
  category=excluded.category,title=excluded.title,summary=excluded.summary,content=excluded.content,is_required=excluded.is_required,is_active=excluded.is_active,updated_at=now();

alter table public.vehicles drop constraint if exists vehicles_publication_status_check;
alter table public.vehicles add constraint vehicles_publication_status_check
  check (publication_status in ('DRAFT','PENDING_REVIEW','SCHEDULED','PUBLISHED','REJECTED','SUSPENDED','ARCHIVED'));
alter table public.vehicles
  add column if not exists listing_origin text not null default 'CENTRAL',
  add column if not exists submitted_by uuid references auth.users(id) on delete set null,
  add column if not exists approved_by uuid references auth.users(id) on delete set null,
  add column if not exists approved_at timestamptz,
  add column if not exists rejection_reason text;
alter table public.vehicles drop constraint if exists vehicles_listing_origin_check;
alter table public.vehicles add constraint vehicles_listing_origin_check check (listing_origin in ('CENTRAL','BRANCH'));
create index if not exists vehicles_branch_publication_idx on public.vehicles(branch_id,publication_status,is_active,category,updated_at desc);

alter table public.tours drop constraint if exists tours_publication_status_check;
alter table public.tours add constraint tours_publication_status_check
  check (publication_status in ('DRAFT','PENDING_REVIEW','SCHEDULED','PUBLISHED','REJECTED','SUSPENDED','ARCHIVED'));
alter table public.tours
  add column if not exists listing_origin text not null default 'CENTRAL',
  add column if not exists submitted_by uuid references auth.users(id) on delete set null,
  add column if not exists approved_by uuid references auth.users(id) on delete set null,
  add column if not exists approved_at timestamptz,
  add column if not exists rejection_reason text;
alter table public.tours drop constraint if exists tours_listing_origin_check;
alter table public.tours add constraint tours_listing_origin_check check (listing_origin in ('CENTRAL','BRANCH'));
create index if not exists tours_branch_publication_idx on public.tours(branch_id,publication_status,is_active,updated_at desc);

alter table public.bookings
  add column if not exists fulfillment_branch_id uuid references public.branches(id) on delete set null;
create index if not exists bookings_fulfillment_branch_idx on public.bookings(fulfillment_branch_id,status,created_at desc);

create or replace function public.branch_listing_price_ok(
  p_branch_id uuid,
  p_category text,
  p_vehicle_class text,
  p_currency text,
  p_price numeric
) returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  r public.branch_pricing_rules%rowtype;
begin
  if p_branch_id is null or p_price is null then return true; end if;
  select * into r
  from public.branch_pricing_rules bpr
  where bpr.is_active = true
    and bpr.category = p_category
    and bpr.currency = p_currency
    and (bpr.branch_id = p_branch_id or bpr.branch_id is null)
    and (bpr.vehicle_class = coalesce(nullif(p_vehicle_class,''),'*') or bpr.vehicle_class='*')
    and (bpr.valid_from is null or bpr.valid_from <= now())
    and (bpr.valid_until is null or bpr.valid_until >= now())
  order by (bpr.branch_id is not null) desc,
           (bpr.vehicle_class <> '*') desc
  limit 1;
  if not found then return true; end if;
  if r.enforce_min and r.min_price is not null and p_price < r.min_price then return false; end if;
  if r.enforce_max and r.max_price is not null and p_price > r.max_price then return false; end if;
  return true;
end;
$$;
revoke all on function public.branch_listing_price_ok(uuid,text,text,text,numeric) from public;
grant execute on function public.branch_listing_price_ok(uuid,text,text,text,numeric) to authenticated;

create or replace function public.enforce_branch_vehicle_governance()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_price numeric;
  v_class text;
  v_is_admin boolean;
  v_branch_active boolean;
begin
  if new.branch_id is null or new.listing_origin <> 'BRANCH' then return new; end if;
  v_is_admin := private.is_admin();
  select (is_active and public_status='ACTIVE') into v_branch_active from public.branches where id=new.branch_id;
  if coalesce(v_branch_active,false)=false and not v_is_admin then raise exception 'BRANCH_NOT_ACTIVE'; end if;
  if not v_is_admin and not public.can_manage_branch(new.branch_id) then raise exception 'BRANCH_ACCESS_DENIED'; end if;
  v_price := case when new.category='RENTAL' then coalesce(new.rental_price_daily,new.price) else new.price end;
  v_class := coalesce(new.body_type,'*');
  if not public.branch_listing_price_ok(new.branch_id,new.category,v_class,new.currency,v_price) then raise exception 'BRANCH_PRICE_OUTSIDE_CENTRAL_RULE'; end if;
  if not v_is_admin then
    new.submitted_by := auth.uid();
    new.approved_by := null;
    new.approved_at := null;
    new.rejection_reason := null;
    new.published_at := null;
    new.scheduled_at := null;
    new.publication_status := case when new.publication_status='DRAFT' then 'DRAFT' else 'PENDING_REVIEW' end;
    new.is_featured := false;
  end if;
  return new;
end;
$$;

drop trigger if exists vehicles_branch_governance_trg on public.vehicles;
create trigger vehicles_branch_governance_trg before insert or update on public.vehicles for each row execute function public.enforce_branch_vehicle_governance();

create or replace function public.enforce_branch_tour_governance()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_is_admin boolean;
  v_branch_active boolean;
begin
  if new.branch_id is null or new.listing_origin <> 'BRANCH' then return new; end if;
  v_is_admin := private.is_admin();
  select (is_active and public_status='ACTIVE') into v_branch_active from public.branches where id=new.branch_id;
  if coalesce(v_branch_active,false)=false and not v_is_admin then raise exception 'BRANCH_NOT_ACTIVE'; end if;
  if not v_is_admin and not public.can_manage_branch(new.branch_id) then raise exception 'BRANCH_ACCESS_DENIED'; end if;
  if not public.branch_listing_price_ok(new.branch_id,'TOUR','*',new.currency,new.price_per_person) then raise exception 'BRANCH_PRICE_OUTSIDE_CENTRAL_RULE'; end if;
  if not v_is_admin then
    new.submitted_by := auth.uid();
    new.approved_by := null;
    new.approved_at := null;
    new.rejection_reason := null;
    new.published_at := null;
    new.scheduled_at := null;
    new.publication_status := case when new.publication_status='DRAFT' then 'DRAFT' else 'PENDING_REVIEW' end;
    new.is_featured := false;
  end if;
  return new;
end;
$$;

drop trigger if exists tours_branch_governance_trg on public.tours;
create trigger tours_branch_governance_trg before insert or update on public.tours for each row execute function public.enforce_branch_tour_governance();

create or replace function public.enforce_branch_activation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  missing_count integer;
begin
  if new.network_type <> 'OWNED' and new.public_status='ACTIVE' and (tg_op='INSERT' or old.public_status is distinct from 'ACTIVE') then
    if nullif(trim(coalesce(new.address_line,'')),'') is null or nullif(trim(coalesce(new.phone,'')),'') is null then raise exception 'BRANCH_ADDRESS_PHONE_REQUIRED'; end if;
    select count(*) into missing_count from public.branch_setup_checklist c where c.branch_id=new.id and c.is_required=true and c.completed_at is null;
    if missing_count > 0 then raise exception 'BRANCH_SETUP_INCOMPLETE'; end if;
  end if;
  return new;
end;
$$;

drop trigger if exists branches_activation_guard_trg on public.branches;
create trigger branches_activation_guard_trg before insert or update on public.branches for each row execute function public.enforce_branch_activation();

create or replace function public.provision_branch_partner_request(
  p_reference text,
  p_actor uuid,
  p_branch_name text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  req public.branch_partner_requests%rowtype;
  b public.branches%rowtype;
  v_name text;
  v_code text;
  v_slug text;
  v_services jsonb := '[]'::jsonb;
begin
  if not exists(select 1 from public.admin_users a where a.user_id=p_actor and a.is_active=true) then raise exception 'ADMIN_REQUIRED'; end if;
  select * into req from public.branch_partner_requests where reference=p_reference for update;
  if not found then raise exception 'BRANCH_PARTNER_NOT_FOUND'; end if;
  if req.status <> 'APPROVED' then raise exception 'BRANCH_PARTNER_NOT_APPROVED'; end if;
  if req.provisioned_branch_id is not null then
    select * into b from public.branches where id=req.provisioned_branch_id;
    return jsonb_build_object('branchId',b.id,'code',b.code,'slug',b.slug,'name',b.name,'alreadyProvisioned',true);
  end if;
  v_name := coalesce(nullif(trim(p_branch_name),''),'Alperler Auto - ' || req.district);
  v_code := 'ALP-' || upper(substr(md5(req.reference),1,8));
  v_slug := trim(both '-' from lower(regexp_replace(translate(req.city || '-' || req.district || '-' || substr(md5(req.reference),1,6),'ÇĞİÖŞÜçğıöşü','CGIOSUcgiosu'),'[^a-zA-Z0-9]+','-','g')));
  if req.services @> '["RENTAL"]'::jsonb then v_services := v_services || '["RENTAL","PICKUP","RETURN"]'::jsonb; end if;
  if req.services @> '["SALES"]'::jsonb then v_services := v_services || '["SALES"]'::jsonb; end if;
  if req.services @> '["TOUR_TRANSFER"]'::jsonb then v_services := v_services || '["TOUR","TRANSFER"]'::jsonb; end if;

  insert into public.branches(name,code,slug,branch_type,network_type,partner_request_id,district,city,country,phone,whatsapp,email,services,is_active,public_status,territory_label,customer_guarantee_enabled,central_pricing_required,listing_requires_approval,sort_order)
  values(v_name,v_code,v_slug,'BRANCH','FRANCHISE',req.id,req.district,req.city,'Türkiye',req.phone,req.phone,req.email,v_services,false,'DRAFT',coalesce(req.operating_area,req.city || ' / ' || req.district),true,true,true,500)
  returning * into b;

  insert into public.branch_setup_checklist(branch_id,checklist_key,label,is_required,sort_order)
  values
    (b.id,'AGREEMENT','Sözleşme ve ticari koşullar',true,10),
    (b.id,'IDENTITY','Yetkili kimlik ve işletme doğrulaması',true,20),
    (b.id,'ADDRESS','Şube adresi ve iletişim doğrulaması',true,30),
    (b.id,'BRAND_STANDARDS','Marka standartları kabulü',true,40),
    (b.id,'PRICING','Merkezi fiyat kuralları yapılandırması',true,50),
    (b.id,'SAFETY','Araç güvenliği ve belge kontrolü',true,60),
    (b.id,'CUSTOMER_GUARANTEE','Müşteri güvence standardı kabulü',true,70),
    (b.id,'PAYOUT','Ödeme ve mutabakat ayarları',true,80),
    (b.id,'FIRST_LISTING_AUDIT','İlk ilan kalite kontrolü',true,90)
  on conflict(branch_id,checklist_key) do nothing;

  update public.branch_partner_requests set provisioned_branch_id=b.id, provisioned_at=now(), provisioned_by=p_actor, updated_at=now() where id=req.id;
  return jsonb_build_object('branchId',b.id,'code',b.code,'slug',b.slug,'name',b.name,'alreadyProvisioned',false);
end;
$$;
revoke all on function public.provision_branch_partner_request(text,uuid,text) from public;
grant execute on function public.provision_branch_partner_request(text,uuid,text) to service_role;

drop policy if exists branch_memberships_self_read on public.branch_memberships;
create policy branch_memberships_self_read on public.branch_memberships for select to authenticated using (user_id=auth.uid() or private.can_manage_team());
drop policy if exists branch_memberships_admin_write on public.branch_memberships;
create policy branch_memberships_admin_write on public.branch_memberships for all to authenticated using (private.can_manage_team()) with check (private.can_manage_team());

drop policy if exists network_policy_rules_read on public.network_policy_rules;
create policy network_policy_rules_read on public.network_policy_rules for select using (is_active=true or private.is_admin());
drop policy if exists network_policy_rules_admin_write on public.network_policy_rules;
create policy network_policy_rules_admin_write on public.network_policy_rules for all to authenticated using (private.can_manage_team()) with check (private.can_manage_team());

drop policy if exists branch_policy_acceptances_branch_read on public.branch_policy_acceptances;
create policy branch_policy_acceptances_branch_read on public.branch_policy_acceptances for select to authenticated using (public.can_manage_branch(branch_id) or private.can_manage_team());
drop policy if exists branch_policy_acceptances_branch_insert on public.branch_policy_acceptances;
create policy branch_policy_acceptances_branch_insert on public.branch_policy_acceptances for insert to authenticated with check (public.can_manage_branch(branch_id) and (accepted_by is null or accepted_by=auth.uid()));

drop policy if exists branch_pricing_rules_branch_read on public.branch_pricing_rules;
create policy branch_pricing_rules_branch_read on public.branch_pricing_rules for select to authenticated using (branch_id is null or public.can_manage_branch(branch_id) or private.can_manage_team());
drop policy if exists branch_pricing_rules_admin_write on public.branch_pricing_rules;
create policy branch_pricing_rules_admin_write on public.branch_pricing_rules for all to authenticated using (private.can_manage_team()) with check (private.can_manage_team());

drop policy if exists branch_setup_checklist_branch_read on public.branch_setup_checklist;
create policy branch_setup_checklist_branch_read on public.branch_setup_checklist for select to authenticated using (public.can_manage_branch(branch_id) or private.can_manage_team());
drop policy if exists branch_setup_checklist_admin_write on public.branch_setup_checklist;
create policy branch_setup_checklist_admin_write on public.branch_setup_checklist for all to authenticated using (private.can_manage_team()) with check (private.can_manage_team());

drop policy if exists branches_public_read on public.branches;
create policy branches_public_read on public.branches for select using ((is_active=true and public_status='ACTIVE') or private.can_manage_team() or public.can_manage_branch(id));

drop policy if exists vehicles_public_read on public.vehicles;
create policy vehicles_public_read on public.vehicles for select using (
  ((is_active=true) and (publication_status='PUBLISHED' or (publication_status='SCHEDULED' and scheduled_at is not null and scheduled_at<=now())) and (branch_id is null or exists(select 1 from public.branches b where b.id=branch_id and b.is_active=true and b.public_status='ACTIVE')))
  or private.can_manage_content()
  or (branch_id is not null and public.can_manage_branch(branch_id))
);
drop policy if exists vehicles_branch_member_insert on public.vehicles;
create policy vehicles_branch_member_insert on public.vehicles for insert to authenticated with check (branch_id is not null and listing_origin='BRANCH' and public.can_manage_branch(branch_id));
drop policy if exists vehicles_branch_member_update on public.vehicles;
create policy vehicles_branch_member_update on public.vehicles for update to authenticated using (branch_id is not null and listing_origin='BRANCH' and public.can_manage_branch(branch_id)) with check (branch_id is not null and listing_origin='BRANCH' and public.can_manage_branch(branch_id));

drop policy if exists tours_public_read on public.tours;
create policy tours_public_read on public.tours for select using (
  ((is_active=true) and (publication_status='PUBLISHED' or (publication_status='SCHEDULED' and scheduled_at is not null and scheduled_at<=now())) and (branch_id is null or exists(select 1 from public.branches b where b.id=branch_id and b.is_active=true and b.public_status='ACTIVE')))
  or private.can_manage_content()
  or (branch_id is not null and public.can_manage_branch(branch_id))
);
drop policy if exists tours_branch_member_insert on public.tours;
create policy tours_branch_member_insert on public.tours for insert to authenticated with check (branch_id is not null and listing_origin='BRANCH' and public.can_manage_branch(branch_id));
drop policy if exists tours_branch_member_update on public.tours;
create policy tours_branch_member_update on public.tours for update to authenticated using (branch_id is not null and listing_origin='BRANCH' and public.can_manage_branch(branch_id)) with check (branch_id is not null and listing_origin='BRANCH' and public.can_manage_branch(branch_id));

drop policy if exists bookings_branch_member_read on public.bookings;
create policy bookings_branch_member_read on public.bookings for select to authenticated using (fulfillment_branch_id is not null and public.can_manage_branch(fulfillment_branch_id));

drop trigger if exists branch_memberships_updated_at_trg on public.branch_memberships;
create trigger branch_memberships_updated_at_trg before update on public.branch_memberships for each row execute function public.set_updated_at();
drop trigger if exists network_policy_rules_updated_at_trg on public.network_policy_rules;
create trigger network_policy_rules_updated_at_trg before update on public.network_policy_rules for each row execute function public.set_updated_at();
drop trigger if exists branch_pricing_rules_updated_at_trg on public.branch_pricing_rules;
create trigger branch_pricing_rules_updated_at_trg before update on public.branch_pricing_rules for each row execute function public.set_updated_at();
drop trigger if exists branch_setup_checklist_updated_at_trg on public.branch_setup_checklist;
create trigger branch_setup_checklist_updated_at_trg before update on public.branch_setup_checklist for each row execute function public.set_updated_at();