-- V171.2 Branch Monetization + Review Gate + Operator Disclosure
-- Three dynamic subscription tiers, branch-level billing ledger, branch-owner edit review,
-- and explicit operator identity for marketplace transparency.

alter table public.branches
  add column if not exists operator_display_name text,
  add column if not exists operator_legal_name text,
  add column if not exists operator_relationship text not null default 'INDEPENDENT_PARTNER',
  add column if not exists platform_disclaimer text not null default 'İlan ve araç operasyonu belirtilen şube veya işletme tarafından yürütülür. Alperler Auto platform ve rezervasyon altyapısı sağlar. Tüketicinin kanuni hakları saklıdır.';

alter table public.branches
  drop constraint if exists branches_operator_relationship_check;
alter table public.branches
  add constraint branches_operator_relationship_check
  check (operator_relationship in ('OWNED','INDEPENDENT_PARTNER','LICENSED_PARTNER'));

update public.branches
set operator_display_name = coalesce(nullif(btrim(operator_display_name),''), nullif(btrim(name),'')),
    operator_relationship = case when network_type='OWNED' then 'OWNED' else operator_relationship end
where operator_display_name is null or btrim(operator_display_name)='';

create table if not exists public.branch_subscription_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  short_description text not null default '',
  monthly_fee numeric(12,2) not null default 0 check (monthly_fee >= 0),
  currency text not null default 'TRY',
  billing_interval text not null default 'MONTHLY' check (billing_interval in ('MONTHLY','YEARLY')),
  entitlements jsonb not null default '{}'::jsonb,
  sales_copy jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.branch_subscription_plans(code,name,short_description,monthly_fee,currency,billing_interval,entitlements,sales_copy,sort_order)
values
  ('START','Başlangıç','Web sitesi olmayan veya dijital kanala yeni geçen yerel işletmeler için temel şube görünürlüğü.',0,'TRY','MONTHLY',
   '{"verifiedBadge":false,"localSearch":true,"centralTraffic":false,"campaignSupport":false,"priorityPlacement":false,"maintenance":true,"listingLimit":10}'::jsonb,
   '{"headline":"Dijital vitrininizi bugün açın","benefits":["İl ve ilçe aramalarında bulunabilir şube profili","Kiralık ve satılık araç ilan altyapısı","Merkezi teknik bakım ve güvenli yayın akışı"]}'::jsonb,10),
  ('PRO','Profesyonel','Doğrulanmış şube, merkezi trafik ve büyüme araçları isteyen işletmeler için ana paket.',2000,'TRY','MONTHLY',
   '{"verifiedBadge":true,"localSearch":true,"centralTraffic":true,"campaignSupport":true,"priorityPlacement":false,"maintenance":true,"listingLimit":100}'::jsonb,
   '{"headline":"Şubenizi doğrulanmış yerel satış kanalına dönüştürün","benefits":["Doğrulanmış şube rozeti ve güven sinyalleri","İl ve ilçe bazlı müşteri trafiği","Merkezi kampanya ve reklam desteği","Bakım, güvenlik ve yayın altyapısı"]}'::jsonb,20),
  ('GROWTH','Büyüme','Daha yüksek görünürlük, kampanya desteği ve öncelikli büyüme araçları isteyen şubeler için.',4500,'TRY','MONTHLY',
   '{"verifiedBadge":true,"localSearch":true,"centralTraffic":true,"campaignSupport":true,"priorityPlacement":true,"maintenance":true,"listingLimit":1000}'::jsonb,
   '{"headline":"Bölgenizde görünürlüğü ve talebi büyütün","benefits":["Profesyonel paketin tüm hakları","Öncelikli vitrin ve kampanya alanları","Gelişmiş trafik ve performans görünürlüğü","Merkezi büyüme desteği"]}'::jsonb,30)
on conflict (code) do nothing;

create table if not exists public.branch_subscriptions (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null unique references public.branches(id) on delete cascade,
  plan_id uuid not null references public.branch_subscription_plans(id),
  status text not null default 'TRIALING' check (status in ('TRIALING','ACTIVE','PAST_DUE','PAUSED','CANCELED','EXEMPT')),
  price_override numeric(12,2) check (price_override is null or price_override >= 0),
  is_complimentary boolean not null default false,
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz,
  grace_ends_at timestamptz,
  auto_renew boolean not null default true,
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists branch_subscriptions_status_period_idx
  on public.branch_subscriptions(status,current_period_end);
create index if not exists branch_subscriptions_plan_idx
  on public.branch_subscriptions(plan_id);

create table if not exists public.branch_subscription_invoices (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.branch_subscriptions(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  invoice_number text not null unique default ('ALP-BR-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,12))),
  status text not null default 'OPEN' check (status in ('DRAFT','OPEN','PAID','OVERDUE','VOID','REFUNDED')),
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'TRY',
  period_start timestamptz not null,
  period_end timestamptz not null,
  issued_at timestamptz not null default now(),
  due_at timestamptz not null,
  paid_at timestamptz,
  payment_reference text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (period_end > period_start)
);

create index if not exists branch_subscription_invoices_branch_due_idx
  on public.branch_subscription_invoices(branch_id,status,due_at desc);
create index if not exists branch_subscription_invoices_subscription_idx
  on public.branch_subscription_invoices(subscription_id,period_start desc);

create table if not exists public.branch_subscription_payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.branch_subscription_invoices(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  provider text not null default 'MANUAL',
  provider_reference text,
  status text not null default 'PENDING' check (status in ('PENDING','SUCCEEDED','FAILED','REFUNDED','CANCELED')),
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'TRY',
  paid_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists branch_subscription_payments_provider_ref_uniq
  on public.branch_subscription_payments(provider,provider_reference)
  where provider_reference is not null;
create index if not exists branch_subscription_payments_branch_idx
  on public.branch_subscription_payments(branch_id,created_at desc);

alter table public.branch_subscription_plans enable row level security;
alter table public.branch_subscriptions enable row level security;
alter table public.branch_subscription_invoices enable row level security;
alter table public.branch_subscription_payments enable row level security;

drop policy if exists branch_subscription_plans_public_read on public.branch_subscription_plans;
create policy branch_subscription_plans_public_read on public.branch_subscription_plans
for select to anon,authenticated using (is_active=true or private.can_manage_finance());

drop policy if exists branch_subscription_plans_finance_write on public.branch_subscription_plans;
create policy branch_subscription_plans_finance_write on public.branch_subscription_plans
for all to authenticated using (private.can_manage_finance()) with check (private.can_manage_finance());

drop policy if exists branch_subscriptions_owner_read on public.branch_subscriptions;
create policy branch_subscriptions_owner_read on public.branch_subscriptions
for select to authenticated using (private.can_manage_finance() or can_manage_branch(branch_id));

drop policy if exists branch_subscriptions_finance_write on public.branch_subscriptions;
create policy branch_subscriptions_finance_write on public.branch_subscriptions
for all to authenticated using (private.can_manage_finance()) with check (private.can_manage_finance());

drop policy if exists branch_subscription_invoices_owner_read on public.branch_subscription_invoices;
create policy branch_subscription_invoices_owner_read on public.branch_subscription_invoices
for select to authenticated using (private.can_manage_finance() or can_manage_branch(branch_id));

drop policy if exists branch_subscription_invoices_finance_write on public.branch_subscription_invoices;
create policy branch_subscription_invoices_finance_write on public.branch_subscription_invoices
for all to authenticated using (private.can_manage_finance()) with check (private.can_manage_finance());

drop policy if exists branch_subscription_payments_owner_read on public.branch_subscription_payments;
create policy branch_subscription_payments_owner_read on public.branch_subscription_payments
for select to authenticated using (private.can_manage_finance() or can_manage_branch(branch_id));

drop policy if exists branch_subscription_payments_finance_write on public.branch_subscription_payments;
create policy branch_subscription_payments_finance_write on public.branch_subscription_payments
for all to authenticated using (private.can_manage_finance()) with check (private.can_manage_finance());

create or replace function public.can_operate_branch_subscription(p_branch_id uuid)
returns boolean
language sql
stable
security definer
set search_path=public,private,pg_catalog
as $$
  select
    private.can_manage_content()
    or private.can_manage_finance()
    or exists (
      select 1
      from public.branch_subscriptions s
      join public.branch_subscription_plans p on p.id=s.plan_id
      where s.branch_id=p_branch_id
        and p.is_active=true
        and (
          s.is_complimentary=true
          or coalesce(s.price_override,p.monthly_fee)=0
          or s.status in ('ACTIVE','TRIALING','EXEMPT')
          or (s.status='PAST_DUE' and s.grace_ends_at is not null and s.grace_ends_at>now())
        )
        and (
          s.status='EXEMPT'
          or s.current_period_end is null
          or s.current_period_end>now()
          or (s.grace_ends_at is not null and s.grace_ends_at>now())
          or coalesce(s.price_override,p.monthly_fee)=0
        )
    );
$$;
revoke all on function public.can_operate_branch_subscription(uuid) from public,anon;
grant execute on function public.can_operate_branch_subscription(uuid) to authenticated,service_role;

create or replace function public.bootstrap_branch_subscription_v1712()
returns trigger
language plpgsql
security definer
set search_path=public,pg_catalog
as $$
declare v_plan uuid;
begin
  if new.network_type='OWNED' then
    select id into v_plan from public.branch_subscription_plans where code='START' limit 1;
    insert into public.branch_subscriptions(branch_id,plan_id,status,is_complimentary,current_period_end)
    values(new.id,v_plan,'EXEMPT',true,null)
    on conflict(branch_id) do nothing;
  else
    select id into v_plan from public.branch_subscription_plans where code='PRO' limit 1;
    insert into public.branch_subscriptions(branch_id,plan_id,status,is_complimentary,current_period_end,grace_ends_at)
    values(new.id,v_plan,'TRIALING',false,now()+interval '14 days',now()+interval '17 days')
    on conflict(branch_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists branches_bootstrap_subscription_v1712 on public.branches;
create trigger branches_bootstrap_subscription_v1712
after insert on public.branches
for each row execute function public.bootstrap_branch_subscription_v1712();

insert into public.branch_subscriptions(branch_id,plan_id,status,is_complimentary,current_period_end)
select b.id,p.id,'EXEMPT',true,null
from public.branches b
join public.branch_subscription_plans p on p.code='START'
where b.network_type='OWNED'
on conflict(branch_id) do nothing;

insert into public.branch_subscriptions(branch_id,plan_id,status,is_complimentary,current_period_end,grace_ends_at)
select b.id,p.id,'TRIALING',false,now()+interval '14 days',now()+interval '17 days'
from public.branches b
join public.branch_subscription_plans p on p.code='PRO'
where b.network_type<>'OWNED'
on conflict(branch_id) do nothing;

-- A branch member may create/update their own listings only while the subscription entitlement is valid.
drop policy if exists vehicles_branch_member_insert on public.vehicles;
create policy vehicles_branch_member_insert on public.vehicles
for insert to authenticated
with check (
  branch_id is not null
  and listing_origin='BRANCH'
  and can_manage_branch(branch_id)
  and public.can_operate_branch_subscription(branch_id)
);

drop policy if exists vehicles_branch_member_update on public.vehicles;
create policy vehicles_branch_member_update on public.vehicles
for update to authenticated
using (
  branch_id is not null and listing_origin='BRANCH' and can_manage_branch(branch_id)
)
with check (
  branch_id is not null
  and listing_origin='BRANCH'
  and can_manage_branch(branch_id)
  and public.can_operate_branch_subscription(branch_id)
);

drop policy if exists tours_branch_member_insert on public.tours;
create policy tours_branch_member_insert on public.tours
for insert to authenticated
with check (
  branch_id is not null
  and listing_origin='BRANCH'
  and can_manage_branch(branch_id)
  and public.can_operate_branch_subscription(branch_id)
);

drop policy if exists tours_branch_member_update on public.tours;
create policy tours_branch_member_update on public.tours
for update to authenticated
using (
  branch_id is not null and listing_origin='BRANCH' and can_manage_branch(branch_id)
)
with check (
  branch_id is not null
  and listing_origin='BRANCH'
  and can_manage_branch(branch_id)
  and public.can_operate_branch_subscription(branch_id)
);

alter table public.vehicles
  add column if not exists submitted_for_review_at timestamptz,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists review_note text;

alter table public.tours
  add column if not exists submitted_for_review_at timestamptz,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists review_note text;

create index if not exists vehicles_branch_review_queue_idx
  on public.vehicles(branch_id,publication_status,submitted_for_review_at desc)
  where listing_origin='BRANCH';
create index if not exists tours_branch_review_queue_idx
  on public.tours(branch_id,publication_status,submitted_for_review_at desc)
  where listing_origin='BRANCH';

create or replace function public.enforce_branch_listing_review_v1712()
returns trigger
language plpgsql
set search_path=public,private,pg_catalog
as $$
begin
  if new.branch_id is null or new.listing_origin<>'BRANCH' then return new; end if;
  if private.can_manage_content() then return new; end if;
  if not can_manage_branch(new.branch_id) then
    raise exception using errcode='42501',message='BRANCH_LISTING_PERMISSION_REQUIRED';
  end if;
  if not public.can_operate_branch_subscription(new.branch_id) then
    raise exception using errcode='42501',message='BRANCH_SUBSCRIPTION_REQUIRED';
  end if;

  -- Every branch-owner creation or edit returns to the Super Admin review queue.
  new.publication_status:='PENDING_REVIEW';
  new.published_at:=null;
  new.scheduled_at:=null;
  new.submitted_for_review_at:=now();
  new.reviewed_at:=null;
  new.reviewed_by:=null;
  new.review_note:=null;
  return new;
end;
$$;

drop trigger if exists vehicles_branch_review_gate_v1712 on public.vehicles;
create trigger vehicles_branch_review_gate_v1712
before insert or update on public.vehicles
for each row execute function public.enforce_branch_listing_review_v1712();

drop trigger if exists tours_branch_review_gate_v1712 on public.tours;
create trigger tours_branch_review_gate_v1712
before insert or update on public.tours
for each row execute function public.enforce_branch_listing_review_v1712();

create or replace function public.admin_review_branch_listing_v1712(
  p_kind text,
  p_id uuid,
  p_action text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public,private,auth,pg_catalog
as $$
declare
  v_actor uuid:=auth.uid();
  v_status text;
begin
  if v_actor is null or not private.can_manage_content() then
    raise exception using errcode='42501',message='CONTENT_PERMISSION_REQUIRED';
  end if;
  v_status:=case upper(btrim(coalesce(p_action,'')))
    when 'APPROVE' then 'PUBLISHED'
    when 'REJECT' then 'REJECTED'
    when 'SUSPEND' then 'SUSPENDED'
    else null end;
  if v_status is null then raise exception using errcode='22023',message='INVALID_REVIEW_ACTION'; end if;

  if upper(btrim(coalesce(p_kind,'')))='VEHICLE' then
    update public.vehicles
      set publication_status=v_status,
          published_at=case when v_status='PUBLISHED' then now() else published_at end,
          reviewed_at=now(),reviewed_by=v_actor,review_note=left(nullif(btrim(coalesce(p_note,'')),''),2000)
      where id=p_id and listing_origin='BRANCH';
    if not found then raise exception using errcode='P0002',message='BRANCH_VEHICLE_NOT_FOUND'; end if;
  elsif upper(btrim(coalesce(p_kind,'')))='TOUR' then
    update public.tours
      set publication_status=v_status,
          published_at=case when v_status='PUBLISHED' then now() else published_at end,
          reviewed_at=now(),reviewed_by=v_actor,review_note=left(nullif(btrim(coalesce(p_note,'')),''),2000)
      where id=p_id and listing_origin='BRANCH';
    if not found then raise exception using errcode='P0002',message='BRANCH_TOUR_NOT_FOUND'; end if;
  else
    raise exception using errcode='22023',message='INVALID_LISTING_KIND';
  end if;
  return jsonb_build_object('ok',true,'kind',upper(p_kind),'id',p_id,'status',v_status,'reviewedBy',v_actor,'reviewedAt',now());
end;
$$;
revoke all on function public.admin_review_branch_listing_v1712(text,uuid,text,text) from public,anon;
grant execute on function public.admin_review_branch_listing_v1712(text,uuid,text,text) to authenticated,service_role;

comment on table public.branch_subscription_plans is 'V171.2 dynamic Super Admin-managed branch subscription plans. Seeded with three tiers; any tier price can be changed to zero.';
comment on function public.enforce_branch_listing_review_v1712() is 'V171.2: branch-owner listing create/update always re-enters PENDING_REVIEW; only content admins may publish.';
comment on column public.branches.operator_display_name is 'Public-facing legal/operator identity shown on listings and branch detail to distinguish the local operator from the Alperler Auto platform.';
