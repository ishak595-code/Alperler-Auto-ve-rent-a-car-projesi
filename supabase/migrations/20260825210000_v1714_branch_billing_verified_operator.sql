-- V171.4 Verified branch operator + real recurring invoice lifecycle
-- Keeps branch identity, entitlement, billing and payment settlement authoritative in Postgres.

alter table public.branches
  add column if not exists operator_identity_verified_at timestamptz,
  add column if not exists operator_identity_verified_by uuid references auth.users(id) on delete set null;

update public.branches
set operator_display_name=coalesce(nullif(btrim(operator_display_name),''),nullif(btrim(name),'')),
    operator_legal_name=coalesce(nullif(btrim(operator_legal_name),''),nullif(btrim(name),'')),
    operator_identity_verified_at=coalesce(operator_identity_verified_at,now())
where network_type='OWNED';

create or replace function public.enforce_branch_partner_business_name_v1714()
returns trigger
language plpgsql
set search_path=public,pg_catalog
as $$
begin
  new.current_business:=nullif(btrim(coalesce(new.current_business,'')),'');
  if new.current_business is null then
    raise exception using errcode='23514',message='BRANCH_BUSINESS_NAME_REQUIRED';
  end if;
  return new;
end;
$$;

drop trigger if exists branch_partner_business_name_v1714 on public.branch_partner_requests;
create trigger branch_partner_business_name_v1714
before insert or update of current_business,status on public.branch_partner_requests
for each row execute function public.enforce_branch_partner_business_name_v1714();

create or replace function public.enforce_branch_operator_verification_v1714()
returns trigger
language plpgsql
set search_path=public,pg_catalog
as $$
begin
  if new.is_active is true and new.public_status='ACTIVE' then
    if coalesce(btrim(new.operator_display_name),'')='' then
      raise exception using errcode='23514',message='BRANCH_PUBLICATION_BLOCKED:OPERATOR_IDENTITY_REQUIRED';
    end if;
    if new.network_type<>'OWNED' and new.operator_identity_verified_at is null then
      raise exception using errcode='23514',message='BRANCH_PUBLICATION_BLOCKED:OPERATOR_VERIFICATION_REQUIRED';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists branches_operator_verification_v1714 on public.branches;
create trigger branches_operator_verification_v1714
before insert or update of public_status,is_active,operator_display_name,operator_identity_verified_at,network_type
on public.branches
for each row execute function public.enforce_branch_operator_verification_v1714();

create or replace function public.provision_branch_partner_request(
  p_reference text,
  p_actor uuid,
  p_branch_name text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public,private,pg_catalog
as $$
declare
  req public.branch_partner_requests%rowtype;
  b public.branches%rowtype;
  v_name text;
  v_operator text;
  v_code text;
  v_slug text;
  v_services jsonb := '[]'::jsonb;
begin
  if not private.can_actor_manage_operations(p_actor) then raise exception 'ADMIN_REQUIRED'; end if;
  select * into req from public.branch_partner_requests where reference=p_reference for update;
  if not found then raise exception 'BRANCH_PARTNER_NOT_FOUND'; end if;
  if req.status<>'APPROVED' then raise exception 'BRANCH_PARTNER_NOT_APPROVED'; end if;
  v_operator:=nullif(btrim(coalesce(req.current_business,'')),'');
  if v_operator is null then raise exception 'BRANCH_BUSINESS_NAME_REQUIRED'; end if;

  if req.provisioned_branch_id is not null then
    select * into b from public.branches where id=req.provisioned_branch_id;
    return jsonb_build_object('branchId',b.id,'code',b.code,'slug',b.slug,'name',b.name,'operatorName',b.operator_display_name,'alreadyProvisioned',true);
  end if;

  v_name:=coalesce(nullif(btrim(p_branch_name),''),v_operator||' - '||req.district);
  v_code:='ALP-'||upper(substr(md5(req.reference),1,8));
  v_slug:=trim(both '-' from lower(regexp_replace(
    translate(req.city||'-'||req.district||'-'||substr(md5(req.reference),1,6),'ÇĞİÖŞÜçğıöşü','CGIOSUcgiosu'),
    '[^a-zA-Z0-9]+','-','g')));

  if req.services @> '["RENTAL"]'::jsonb then v_services:=v_services||'["RENTAL","PICKUP","RETURN"]'::jsonb; end if;
  if req.services @> '["SALES"]'::jsonb then v_services:=v_services||'["SALES"]'::jsonb; end if;
  if req.services @> '["TOUR_TRANSFER"]'::jsonb then v_services:=v_services||'["TOUR","TRANSFER"]'::jsonb; end if;

  insert into public.branches(
    name,code,slug,branch_type,network_type,partner_request_id,district,city,country,
    province_code,district_code,phone,whatsapp,email,services,is_active,public_status,territory_label,
    customer_guarantee_enabled,central_pricing_required,listing_requires_approval,sort_order,
    operator_display_name,operator_legal_name,operator_relationship
  ) values(
    v_name,v_code,v_slug,'BRANCH','FRANCHISE',req.id,req.district,req.city,'Türkiye',
    req.province_code,req.district_code,req.phone,req.phone,req.email,v_services,false,'DRAFT',
    coalesce(req.operating_area,req.city||' / '||req.district),true,true,true,500,
    v_operator,v_operator,'INDEPENDENT_PARTNER'
  ) returning * into b;

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

  update public.branch_partner_requests
  set provisioned_branch_id=b.id,provisioned_at=now(),provisioned_by=p_actor,updated_at=now()
  where id=req.id;

  return jsonb_build_object('branchId',b.id,'code',b.code,'slug',b.slug,'name',b.name,'operatorName',b.operator_display_name,'alreadyProvisioned',false);
end;
$$;

create or replace function public.my_branch_subscription_entitlements_v1714()
returns table(
  branch_id uuid,
  branch_name text,
  status text,
  plan_code text,
  plan_name text,
  effective_price numeric,
  currency text,
  current_period_end timestamptz,
  grace_ends_at timestamptz,
  can_operate boolean
)
language sql
stable
security definer
set search_path=public,auth,pg_catalog
as $$
  select s.branch_id,b.name,s.status,p.code,p.name,
         case when s.is_complimentary then 0 else coalesce(s.price_override,p.monthly_fee) end,
         p.currency,s.current_period_end,s.grace_ends_at,
         public.can_operate_branch_subscription(s.branch_id)
  from public.branch_subscriptions s
  join public.branch_subscription_plans p on p.id=s.plan_id
  join public.branches b on b.id=s.branch_id
  join public.branch_memberships m on m.branch_id=s.branch_id
  where m.user_id=auth.uid() and m.is_active=true
  order by b.name;
$$;
revoke all on function public.my_branch_subscription_entitlements_v1714() from public,anon;
grant execute on function public.my_branch_subscription_entitlements_v1714() to authenticated;

create unique index if not exists branch_subscription_invoice_period_uniq
  on public.branch_subscription_invoices(subscription_id,period_start);

create or replace function public.generate_branch_subscription_invoices_v1714()
returns jsonb
language plpgsql
security definer
set search_path=public,pg_catalog
as $$
declare
  r record;
  v_amount numeric(12,2);
  v_created integer:=0;
  v_overdue integer:=0;
begin
  update public.branch_subscription_invoices
  set status='OVERDUE',updated_at=now()
  where status='OPEN' and due_at<now();
  get diagnostics v_overdue=row_count;

  update public.branch_subscriptions s
  set status='PAST_DUE',
      grace_ends_at=coalesce(s.grace_ends_at,s.current_period_end+interval '3 days'),
      updated_at=now()
  where s.status in ('ACTIVE','TRIALING')
    and s.current_period_end is not null
    and s.current_period_end<=now()
    and exists(select 1 from public.branch_subscription_invoices i where i.subscription_id=s.id and i.status in ('OPEN','OVERDUE'));

  for r in
    select s.*,p.monthly_fee,p.currency,p.billing_interval,p.is_active as plan_active
    from public.branch_subscriptions s
    join public.branch_subscription_plans p on p.id=s.plan_id
    where s.status in ('ACTIVE','TRIALING','PAST_DUE')
      and s.current_period_end is not null
      and s.current_period_end<=now()+interval '7 days'
      and p.is_active=true
  loop
    v_amount:=case when r.is_complimentary then 0 else coalesce(r.price_override,r.monthly_fee) end;
    if v_amount<=0 then continue; end if;
    insert into public.branch_subscription_invoices(
      subscription_id,branch_id,status,amount,currency,period_start,period_end,issued_at,due_at,metadata
    ) values(
      r.id,r.branch_id,'OPEN',v_amount,r.currency,r.current_period_end,
      case when r.billing_interval='YEARLY' then r.current_period_end+interval '1 year' else r.current_period_end+interval '1 month' end,
      now(),r.current_period_end,jsonb_build_object('generator','V171.4','planId',r.plan_id)
    ) on conflict(subscription_id,period_start) do nothing;
    if found then v_created:=v_created+1; end if;
  end loop;

  return jsonb_build_object('ok',true,'created',v_created,'markedOverdue',v_overdue,'ranAt',now());
end;
$$;
revoke all on function public.generate_branch_subscription_invoices_v1714() from public,anon,authenticated;
grant execute on function public.generate_branch_subscription_invoices_v1714() to service_role;

create or replace function public.finalize_branch_subscription_payment_v1714(
  p_provider text,
  p_provider_reference text,
  p_received_amount numeric
)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_catalog
as $$
declare
  pay public.branch_subscription_payments%rowtype;
  inv public.branch_subscription_invoices%rowtype;
  sub public.branch_subscriptions%rowtype;
begin
  select * into pay from public.branch_subscription_payments
  where provider=p_provider and provider_reference=p_provider_reference for update;
  if not found then raise exception 'BRANCH_PAYMENT_NOT_FOUND'; end if;
  select * into inv from public.branch_subscription_invoices where id=pay.invoice_id for update;
  select * into sub from public.branch_subscriptions where id=inv.subscription_id for update;
  if pay.status='SUCCEEDED' and inv.status='PAID' then
    return jsonb_build_object('ok',true,'idempotent',true,'invoiceId',inv.id,'subscriptionId',sub.id);
  end if;
  if round(p_received_amount::numeric,2)<>round(pay.amount::numeric,2)
     or round(pay.amount::numeric,2)<>round(inv.amount::numeric,2) then
    raise exception 'BRANCH_PAYMENT_AMOUNT_MISMATCH';
  end if;

  update public.branch_subscription_payments
  set status='SUCCEEDED',paid_at=coalesce(paid_at,now()),metadata=metadata||jsonb_build_object('settledAt',now())
  where id=pay.id;
  update public.branch_subscription_invoices
  set status='PAID',paid_at=coalesce(paid_at,now()),payment_reference=p_provider_reference,updated_at=now()
  where id=inv.id;
  update public.branch_subscriptions
  set status='ACTIVE',current_period_start=inv.period_start,current_period_end=inv.period_end,
      grace_ends_at=null,provider=p_provider,updated_at=now()
  where id=sub.id;

  return jsonb_build_object('ok',true,'idempotent',false,'invoiceId',inv.id,'subscriptionId',sub.id,'periodEnd',inv.period_end);
end;
$$;
revoke all on function public.finalize_branch_subscription_payment_v1714(text,text,numeric) from public,anon,authenticated;
grant execute on function public.finalize_branch_subscription_payment_v1714(text,text,numeric) to service_role;

do $$
declare v_job bigint;
begin
  if exists(select 1 from pg_extension where extname='pg_cron') then
    for v_job in select jobid from cron.job where jobname='v1714-branch-billing-daily' loop
      perform cron.unschedule(v_job);
    end loop;
    perform cron.schedule('v1714-branch-billing-daily','17 2 * * *','select public.generate_branch_subscription_invoices_v1714();');
  end if;
end $$;

comment on function public.my_branch_subscription_entitlements_v1714() is 'Authenticated branch member entitlement snapshot used by the portal paywall. Scoped to auth.uid memberships.';
comment on function public.generate_branch_subscription_invoices_v1714() is 'Idempotent daily branch subscription invoice generator and overdue state reconciler.';
comment on function public.finalize_branch_subscription_payment_v1714(text,text,numeric) is 'Service-role-only atomic branch invoice settlement.';
