-- V225: reconcile the unfinished V224 branch profile/finance work with the current schema.
-- Subscription remains the platform revenue model. No per-transaction commission is introduced.

alter table public.finance_transactions
  add column if not exists branch_id uuid references public.branches(id) on delete set null;

update public.finance_transactions ft
set branch_id = b.fulfillment_branch_id
from public.bookings b
where ft.booking_id = b.id
  and ft.branch_id is null
  and b.fulfillment_branch_id is not null;

create index if not exists finance_transactions_branch_period_idx
  on public.finance_transactions(branch_id, occurred_at desc)
  where branch_id is not null;

create table if not exists private.branch_finance_profiles (
  branch_id uuid primary key references public.branches(id) on delete cascade,
  billing_model text not null default 'SUBSCRIPTION' check (billing_model = 'SUBSCRIPTION'),
  bank_name text,
  iban text,
  account_holder text,
  legal_name text,
  tax_number text,
  tax_office text,
  preferred_provider text not null default 'NONE' check (preferred_provider in ('PAYTR','IYZICO','NONE')),
  paytr_submerchant_ref text,
  iyzico_submerchant_ref text,
  payout_status text not null default 'NOT_CONNECTED' check (payout_status in ('NOT_CONNECTED','REVIEW_REQUIRED','PENDING_PROVIDER','ACTIVE','REJECTED','PAUSED')),
  payout_enabled boolean not null default false,
  provider_verified_at timestamptz,
  provider_verified_by uuid,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists private.booking_party_checks (
  booking_id uuid primary key references public.bookings(id) on delete cascade,
  booking_customer_user_id uuid,
  payer_account_user_id uuid,
  payer_match_status text not null default 'UNVERIFIED' check (payer_match_status in ('UNVERIFIED','ACCOUNT_MATCHED','OFFLINE_MATCHED','REJECTED')),
  payer_verified_at timestamptz,
  payer_verified_by uuid,
  signer_match_status text not null default 'UNVERIFIED' check (signer_match_status in ('UNVERIFIED','VERIFIED','REJECTED')),
  signer_verified_at timestamptz,
  signer_verified_by uuid,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table private.branch_finance_profiles enable row level security;
alter table private.booking_party_checks enable row level security;
revoke all on private.branch_finance_profiles from public, anon, authenticated;
revoke all on private.booking_party_checks from public, anon, authenticated;
grant select, insert, update, delete on private.branch_finance_profiles to service_role;
grant select, insert, update, delete on private.booking_party_checks to service_role;

create or replace function private.normalize_phone_v225(p_value text)
returns text language sql immutable set search_path = pg_catalog as $$
  select case when char_length(regexp_replace(coalesce(p_value,''), '[^0-9]', '', 'g')) >= 10
    then right(regexp_replace(coalesce(p_value,''), '[^0-9]', '', 'g'), 10)
    else regexp_replace(coalesce(p_value,''), '[^0-9]', '', 'g') end;
$$;

create or replace function private.normalize_name_v225(p_value text)
returns text language sql immutable set search_path = pg_catalog as $$
  select lower(regexp_replace(btrim(coalesce(p_value,'')), '[[:space:]]+', ' ', 'g'));
$$;

create or replace function private.can_branch_finance_v225(p_branch_id uuid, p_write boolean default false)
returns boolean language sql stable security definer set search_path = pg_catalog, public, private as $$
  select (case when p_write then private.can_manage_finance() else private.can_read_finance() end)
    or exists (
      select 1 from public.branch_memberships bm
      where bm.branch_id=p_branch_id and bm.user_id=auth.uid() and bm.is_active=true
        and bm.role in ('BRANCH_OWNER','BRANCH_MANAGER')
        and (not p_write or private.can_operate_branch_subscription_v189(p_branch_id))
    );
$$;

create or replace function public.service_update_branch_profile_v225(
  p_branch_id uuid,p_address text,p_phone text,p_whatsapp text,p_email text,p_territory_label text,
  p_public_description text,p_working_hours jsonb,p_instagram_url text default null,p_facebook_url text default null,
  p_tiktok_url text default null,p_youtube_url text default null,p_x_url text default null
) returns jsonb language plpgsql security definer set search_path = pg_catalog, public, private as $$
declare b public.branches%rowtype; socials jsonb; url_value text; hour_row jsonb;
begin
  if not private.can_manage_branch(p_branch_id) or not private.can_operate_branch_subscription_v189(p_branch_id) then raise exception 'BRANCH_PROFILE_ACCESS_REQUIRED'; end if;
  if char_length(btrim(coalesce(p_address,'')))<5 then raise exception 'BRANCH_ADDRESS_REQUIRED'; end if;
  if char_length(private.normalize_phone_v225(p_phone))<10 then raise exception 'BRANCH_PHONE_REQUIRED'; end if;
  if p_email is not null and btrim(p_email)<>'' and btrim(p_email)!~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'INVALID_BRANCH_EMAIL'; end if;
  if p_working_hours is not null and jsonb_typeof(p_working_hours)<>'array' then raise exception 'INVALID_WORKING_HOURS'; end if;
  if jsonb_array_length(coalesce(p_working_hours,'[]'::jsonb))>14 then raise exception 'TOO_MANY_WORKING_HOURS'; end if;
  for hour_row in select value from jsonb_array_elements(coalesce(p_working_hours,'[]'::jsonb)) loop
    if jsonb_typeof(hour_row)<>'object' or char_length(btrim(coalesce(hour_row->>'label','')))=0 or char_length(btrim(coalesce(hour_row->>'value','')))=0 or char_length(hour_row->>'label')>80 or char_length(hour_row->>'value')>120 then raise exception 'INVALID_WORKING_HOURS'; end if;
  end loop;
  foreach url_value in array array[p_instagram_url,p_facebook_url,p_tiktok_url,p_youtube_url,p_x_url] loop
    if nullif(btrim(coalesce(url_value,'')),'') is not null and btrim(url_value)!~* '^https://[^[:space:]]+$' then raise exception 'SOCIAL_URL_MUST_BE_HTTPS'; end if;
  end loop;
  select * into b from public.branches where id=p_branch_id for update;
  if not found then raise exception 'BRANCH_NOT_FOUND'; end if;
  socials := (coalesce(b.brand_profile,'{}'::jsonb)-'instagramUrl'-'facebookUrl'-'tiktokUrl'-'youtubeUrl'-'xUrl') || jsonb_strip_nulls(jsonb_build_object(
    'instagramUrl',nullif(left(btrim(coalesce(p_instagram_url,'')),500),''),'facebookUrl',nullif(left(btrim(coalesce(p_facebook_url,'')),500),''),'tiktokUrl',nullif(left(btrim(coalesce(p_tiktok_url,'')),500),''),'youtubeUrl',nullif(left(btrim(coalesce(p_youtube_url,'')),500),''),'xUrl',nullif(left(btrim(coalesce(p_x_url,'')),500),'')
  ));
  update public.branches set address_line=left(btrim(p_address),240),phone=left(btrim(p_phone),40),whatsapp=nullif(left(btrim(coalesce(p_whatsapp,'')),40),''),email=nullif(left(lower(btrim(coalesce(p_email,''))),160),''),territory_label=nullif(left(btrim(coalesce(p_territory_label,'')),240),''),public_description=nullif(left(btrim(coalesce(p_public_description,'')),4000),''),opening_hours=coalesce(p_working_hours,'[]'::jsonb),brand_profile=socials,updated_at=now() where id=p_branch_id returning * into b;
  return jsonb_build_object('ok',true,'branch',jsonb_build_object('id',b.id,'addressLabel',b.address_line,'phone',b.phone,'whatsapp',b.whatsapp,'email',b.email,'territoryLabel',b.territory_label,'publicDescription',b.public_description,'workingHours',b.opening_hours,'brandProfile',b.brand_profile));
end; $$;

create or replace function public.service_branch_finance_snapshot_v225(p_branch_id uuid,p_from timestamptz default null,p_to timestamptz default null)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public, private as $$
declare from_at timestamptz:=coalesce(p_from,date_trunc('month',now())); to_at timestamptz:=coalesce(p_to,now()+interval '1 day'); profile private.branch_finance_profiles%rowtype; subscription_row public.branch_subscriptions%rowtype;
begin
  if not private.can_branch_finance_v225(p_branch_id,false) then raise exception 'BRANCH_FINANCE_READ_REQUIRED'; end if;
  if to_at<=from_at or to_at>from_at+interval '2 years' then raise exception 'INVALID_FINANCE_PERIOD'; end if;
  select * into profile from private.branch_finance_profiles where branch_id=p_branch_id;
  select * into subscription_row from public.branch_subscriptions where branch_id=p_branch_id order by updated_at desc limit 1;
  return jsonb_build_object('ok',true,'branchId',p_branch_id,'billingModel','SUBSCRIPTION','subscription',case when subscription_row.id is null then null else jsonb_build_object('status',subscription_row.status,'planId',subscription_row.plan_id,'currentPeriodEnd',subscription_row.current_period_end) end,'financeProfile',jsonb_build_object('bankName',profile.bank_name,'iban',profile.iban,'accountHolder',profile.account_holder,'legalName',profile.legal_name,'taxNumber',profile.tax_number,'taxOffice',profile.tax_office,'preferredProvider',coalesce(profile.preferred_provider,'NONE'),'payoutStatus',coalesce(profile.payout_status,'NOT_CONNECTED'),'payoutEnabled',coalesce(profile.payout_enabled,false)),'summary',jsonb_build_object(
    'income',coalesce((select sum(ft.net_amount) from public.finance_transactions ft where ft.branch_id=p_branch_id and ft.status<>'VOID' and ft.direction='INCOME' and ft.occurred_at>=from_at and ft.occurred_at<to_at),0),
    'expense',coalesce((select sum(ft.net_amount) from public.finance_transactions ft where ft.branch_id=p_branch_id and ft.status<>'VOID' and ft.direction='EXPENSE' and ft.occurred_at>=from_at and ft.occurred_at<to_at),0),
    'outstanding',coalesce((select sum(greatest(coalesce(b.total_price,0)-coalesce(b.amount_paid,0),0)) from public.bookings b where b.fulfillment_branch_id=p_branch_id and b.deleted_at is null and b.status not in ('REJECTED','CANCELLED')),0),
    'bookingCount',(select count(*) from public.bookings b where b.fulfillment_branch_id=p_branch_id and b.deleted_at is null and b.created_at>=from_at and b.created_at<to_at)
  ),'transactions',coalesce((select jsonb_agg(to_jsonb(q) order by q.occurred_at desc) from (select ft.id,ft.occurred_at,ft.direction,ft.category,ft.payment_method,ft.gross_amount,ft.discount_amount,ft.net_amount,ft.currency,ft.counterparty_name,ft.reference,ft.description,ft.source,ft.receipt_number,ft.invoice_number,ft.status from public.finance_transactions ft where ft.branch_id=p_branch_id and ft.status<>'VOID' and ft.occurred_at>=from_at and ft.occurred_at<to_at order by ft.occurred_at desc limit 1000) q),'[]'::jsonb),'bookings',coalesce((select jsonb_agg(jsonb_build_object('reference',b.reference,'itemName',b.item_name,'customerName',b.customer_name,'customerPhone',b.customer_phone,'totalPrice',b.total_price,'amountPaid',b.amount_paid,'currency',b.currency,'paymentMethod',b.payment_method,'paymentStatus',b.payment_status,'status',b.status,'startAt',b.start_at,'payerMatchStatus',coalesce(pc.payer_match_status,'UNVERIFIED'),'signerMatchStatus',coalesce(pc.signer_match_status,'UNVERIFIED')) order by b.created_at desc) from (select * from public.bookings where fulfillment_branch_id=p_branch_id and deleted_at is null order by created_at desc limit 250) b left join private.booking_party_checks pc on pc.booking_id=b.id),'[]'::jsonb));
end; $$;

create or replace function public.service_branch_save_finance_profile_v225(p_branch_id uuid,p_bank_name text,p_iban text,p_account_holder text,p_legal_name text,p_tax_number text,p_tax_office text,p_preferred_provider text)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public, private as $$
declare normalized_iban text:=upper(regexp_replace(coalesce(p_iban,''),'[[:space:]]','','g')); provider text:=upper(btrim(coalesce(p_preferred_provider,'NONE'))); row private.branch_finance_profiles%rowtype;
begin
  if not private.can_branch_finance_v225(p_branch_id,true) then raise exception 'BRANCH_FINANCE_MANAGE_REQUIRED'; end if;
  if provider not in ('PAYTR','IYZICO','NONE') then raise exception 'INVALID_PAYOUT_PROVIDER'; end if;
  if normalized_iban<>'' and normalized_iban!~'^[A-Z]{2}[0-9A-Z]{13,32}$' then raise exception 'INVALID_IBAN'; end if;
  if normalized_iban<>'' and nullif(btrim(coalesce(p_account_holder,'')),'') is null then raise exception 'ACCOUNT_HOLDER_REQUIRED'; end if;
  insert into private.branch_finance_profiles(branch_id,bank_name,iban,account_holder,legal_name,tax_number,tax_office,preferred_provider,payout_status,payout_enabled,updated_at) values(p_branch_id,nullif(left(btrim(coalesce(p_bank_name,'')),160),''),nullif(normalized_iban,''),nullif(left(btrim(coalesce(p_account_holder,'')),180),''),nullif(left(btrim(coalesce(p_legal_name,'')),220),''),nullif(left(btrim(coalesce(p_tax_number,'')),80),''),nullif(left(btrim(coalesce(p_tax_office,'')),160),''),provider,'REVIEW_REQUIRED',false,now()) on conflict(branch_id) do update set bank_name=excluded.bank_name,iban=excluded.iban,account_holder=excluded.account_holder,legal_name=excluded.legal_name,tax_number=excluded.tax_number,tax_office=excluded.tax_office,preferred_provider=excluded.preferred_provider,payout_status='REVIEW_REQUIRED',payout_enabled=false,provider_verified_at=null,provider_verified_by=null,updated_at=now() returning * into row;
  return jsonb_build_object('ok',true,'financeProfile',jsonb_build_object('bankName',row.bank_name,'iban',row.iban,'accountHolder',row.account_holder,'legalName',row.legal_name,'taxNumber',row.tax_number,'taxOffice',row.tax_office,'preferredProvider',row.preferred_provider,'payoutStatus',row.payout_status,'payoutEnabled',row.payout_enabled));
end; $$;

create or replace function public.service_branch_add_expense_v225(p_branch_id uuid,p_amount numeric,p_category text,p_currency text,p_occurred_at timestamptz,p_counterparty_name text,p_reference text,p_description text,p_receipt_number text,p_invoice_number text,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public, private as $$
declare category_value text:=upper(btrim(coalesce(p_category,''))); currency_value text:=upper(btrim(coalesce(p_currency,'TRY'))); external text; existing public.finance_transactions%rowtype; created public.finance_transactions%rowtype;
begin
  if not private.can_branch_finance_v225(p_branch_id,true) then raise exception 'BRANCH_FINANCE_MANAGE_REQUIRED'; end if;
  if p_amount is null or p_amount<=0 or p_amount>100000000 then raise exception 'INVALID_AMOUNT'; end if;
  if category_value not in ('MAINTENANCE','FUEL','CLEANING','INSURANCE','TAX','ADVERTISING','SALARY','OFFICE','SERVICE','OTHER') then raise exception 'INVALID_EXPENSE_CATEGORY'; end if;
  if currency_value not in ('TRY','EUR','USD','CHF') then raise exception 'INVALID_CURRENCY'; end if;
  if char_length(btrim(coalesce(p_idempotency_key,'')))<8 then raise exception 'INVALID_IDEMPOTENCY_KEY'; end if;
  external:='BRANCH:'||p_branch_id::text||':'||left(btrim(p_idempotency_key),120);
  select * into existing from public.finance_transactions where source='MANUAL' and external_reference=external and status<>'VOID' limit 1;
  if found then return jsonb_build_object('ok',true,'duplicate',true,'transaction',to_jsonb(existing)); end if;
  insert into public.finance_transactions(occurred_at,direction,category,branch_id,payment_method,gross_amount,discount_amount,tax_amount,net_amount,currency,counterparty_name,reference,description,source,external_reference,receipt_number,invoice_number,status,created_by,metadata) values(coalesce(p_occurred_at,now()),'EXPENSE',category_value,p_branch_id,null,round(p_amount,2),0,0,round(p_amount,2),currency_value,nullif(left(btrim(coalesce(p_counterparty_name,'')),200),''),nullif(left(btrim(coalesce(p_reference,'')),160),''),nullif(left(btrim(coalesce(p_description,'')),1500),''),'MANUAL',external,nullif(left(btrim(coalesce(p_receipt_number,'')),120),''),nullif(left(btrim(coalesce(p_invoice_number,'')),120),''),'POSTED',auth.uid(),jsonb_build_object('branchRecorded',true,'recordedBy',auth.uid())) returning * into created;
  return jsonb_build_object('ok',true,'duplicate',false,'transaction',to_jsonb(created));
end; $$;

create or replace function public.service_branch_void_expense_v225(p_branch_id uuid,p_transaction_id uuid,p_reason text)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public, private as $$
declare row public.finance_transactions%rowtype;
begin
  if not private.can_branch_finance_v225(p_branch_id,true) then raise exception 'BRANCH_FINANCE_MANAGE_REQUIRED'; end if;
  select * into row from public.finance_transactions where id=p_transaction_id and branch_id=p_branch_id and direction='EXPENSE' and source='MANUAL' and payment_transaction_id is null and status='POSTED' for update;
  if not found then raise exception 'BRANCH_EXPENSE_NOT_FOUND'; end if;
  update public.finance_transactions set status='VOID',metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('voidedBy',auth.uid(),'voidReason',left(btrim(coalesce(p_reason,'')),500)),updated_at=now() where id=row.id returning * into row;
  return jsonb_build_object('ok',true,'transaction',to_jsonb(row));
end; $$;

create or replace function public.service_branch_record_offline_payment_v225(p_branch_id uuid,p_booking_reference text,p_amount numeric,p_method text,p_payer_name text,p_payer_phone text,p_external_reference text,p_note text,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public, private as $$
declare b public.bookings%rowtype; tx public.payment_transactions%rowtype; finance_row public.finance_transactions%rowtype; method_value text:=upper(btrim(coalesce(p_method,''))); ext text; idem text; due numeric;
begin
  if not private.can_branch_finance_v225(p_branch_id,true) then raise exception 'BRANCH_FINANCE_MANAGE_REQUIRED'; end if;
  if method_value not in ('OFFICE','EFT') then raise exception 'INVALID_PAYMENT_METHOD'; end if;
  if p_amount is null or p_amount<=0 or p_amount>100000000 then raise exception 'INVALID_AMOUNT'; end if;
  if char_length(btrim(coalesce(p_idempotency_key,'')))<8 then raise exception 'INVALID_IDEMPOTENCY_KEY'; end if;
  select * into b from public.bookings where reference=btrim(coalesce(p_booking_reference,'')) and deleted_at is null and fulfillment_branch_id=p_branch_id for update;
  if not found then raise exception 'BRANCH_BOOKING_NOT_FOUND'; end if;
  if b.status in ('REJECTED','CANCELLED') then raise exception 'BOOKING_NOT_PAYABLE'; end if;
  if coalesce(b.total_price,0)<=0 then raise exception 'BOOKING_TOTAL_REQUIRED'; end if;
  if private.normalize_name_v225(p_payer_name)<>private.normalize_name_v225(b.customer_name) or private.normalize_phone_v225(p_payer_phone)<>private.normalize_phone_v225(b.customer_phone) then
    insert into private.booking_party_checks(booking_id,booking_customer_user_id,payer_match_status,payer_verified_at,payer_verified_by,metadata,updated_at) values(b.id,b.customer_user_id,'REJECTED',now(),auth.uid(),jsonb_build_object('channel',method_value,'reason','PAYER_IDENTITY_MISMATCH'),now()) on conflict(booking_id) do update set payer_match_status='REJECTED',payer_verified_at=now(),payer_verified_by=auth.uid(),metadata=private.booking_party_checks.metadata||excluded.metadata,updated_at=now();
    raise exception 'PAYER_IDENTITY_MISMATCH';
  end if;
  if upper(coalesce(b.payment_method,'NONE')) not in (method_value,'NONE') then raise exception 'PAYMENT_METHOD_MISMATCH'; end if;
  due:=greatest(coalesce(b.total_price,0)-coalesce(b.amount_paid,0),0);
  if due<=0.009 then raise exception 'PAYMENT_ALREADY_SETTLED'; end if;
  if p_amount>due+0.01 then raise exception 'PAYMENT_EXCEEDS_OUTSTANDING'; end if;
  idem:='branch-offline:'||p_branch_id::text||':'||btrim(p_idempotency_key);
  select * into tx from public.payment_transactions where idempotency_key=idem limit 1;
  if found then
    if tx.booking_id<>b.id or abs(tx.amount-p_amount)>0.01 or lower(tx.provider)<>lower(method_value) then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
    select * into finance_row from public.finance_transactions where payment_transaction_id=tx.id and status<>'VOID' limit 1;
    return jsonb_build_object('ok',true,'duplicate',true,'payment',to_jsonb(tx),'finance',to_jsonb(finance_row));
  end if;
  insert into private.booking_party_checks(booking_id,booking_customer_user_id,payer_match_status,payer_verified_at,payer_verified_by,metadata,updated_at) values(b.id,b.customer_user_id,'OFFLINE_MATCHED',now(),auth.uid(),jsonb_build_object('channel',method_value),now()) on conflict(booking_id) do update set booking_customer_user_id=excluded.booking_customer_user_id,payer_match_status='OFFLINE_MATCHED',payer_verified_at=now(),payer_verified_by=auth.uid(),metadata=private.booking_party_checks.metadata||excluded.metadata,updated_at=now();
  if upper(coalesce(b.payment_method,'NONE'))='NONE' then update public.bookings set payment_method=method_value,updated_at=now() where id=b.id; end if;
  ext:=nullif(left(btrim(coalesce(p_external_reference,'')),200),'');
  if ext is null then ext:=method_value||'-'||b.reference||'-'||substr(replace(btrim(p_idempotency_key),'-',''),1,16); end if;
  if exists(select 1 from public.payment_transactions p where lower(p.provider)=lower(method_value) and p.provider_reference=ext) then raise exception 'PAYMENT_REFERENCE_CONFLICT'; end if;
  insert into public.payment_transactions(booking_id,provider,provider_reference,idempotency_key,amount,currency,status,request_snapshot,response_snapshot) values(b.id,lower(method_value),ext,idem,round(p_amount,2),b.currency,'PAID',jsonb_build_object('branchId',p_branch_id,'recordedBy',auth.uid(),'method',method_value,'identityMatch','OFFLINE_MATCHED','note',nullif(left(btrim(coalesce(p_note,'')),1000),'')),jsonb_build_object('source','BRANCH_CONFIRMED','recordedAt',now())) returning * into tx;
  select * into finance_row from public.finance_transactions where payment_transaction_id=tx.id and status<>'VOID' limit 1;
  return jsonb_build_object('ok',true,'duplicate',false,'payment',to_jsonb(tx),'finance',to_jsonb(finance_row));
end; $$;

create or replace function public.service_record_card_payer_match_v225(p_booking_id uuid,p_user_id uuid)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public, private as $$
declare b public.bookings%rowtype;
begin
  if auth.role()<>'service_role' then raise exception 'SERVICE_ROLE_REQUIRED'; end if;
  select * into b from public.bookings where id=p_booking_id and deleted_at is null;
  if not found then raise exception 'BOOKING_NOT_FOUND'; end if;
  if b.customer_user_id is null or b.customer_user_id<>p_user_id then raise exception 'BOOKING_PAYER_ACCOUNT_MISMATCH'; end if;
  insert into private.booking_party_checks(booking_id,booking_customer_user_id,payer_account_user_id,payer_match_status,payer_verified_at,payer_verified_by,metadata,updated_at) values(b.id,b.customer_user_id,p_user_id,'ACCOUNT_MATCHED',now(),p_user_id,jsonb_build_object('channel','CARD','scope','ACCOUNT_IDENTITY_ONLY'),now()) on conflict(booking_id) do update set booking_customer_user_id=excluded.booking_customer_user_id,payer_account_user_id=excluded.payer_account_user_id,payer_match_status='ACCOUNT_MATCHED',payer_verified_at=now(),payer_verified_by=p_user_id,metadata=private.booking_party_checks.metadata||excluded.metadata,updated_at=now();
  return jsonb_build_object('ok',true,'bookingId',b.id,'payerMatchStatus','ACCOUNT_MATCHED');
end; $$;

create or replace function public.service_branch_confirm_signer_v225(p_branch_id uuid,p_booking_reference text,p_matches boolean,p_note text default null)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public, private as $$
declare b public.bookings%rowtype; status_value text;
begin
  if not private.can_branch_finance_v225(p_branch_id,true) then raise exception 'BRANCH_OPERATION_ACCESS_REQUIRED'; end if;
  select * into b from public.bookings where reference=btrim(coalesce(p_booking_reference,'')) and fulfillment_branch_id=p_branch_id and deleted_at is null for update;
  if not found then raise exception 'BRANCH_BOOKING_NOT_FOUND'; end if;
  status_value:=case when p_matches then 'VERIFIED' else 'REJECTED' end;
  insert into private.booking_party_checks(booking_id,booking_customer_user_id,signer_match_status,signer_verified_at,signer_verified_by,metadata,updated_at) values(b.id,b.customer_user_id,status_value,now(),auth.uid(),jsonb_build_object('signerNote',nullif(left(btrim(coalesce(p_note,'')),500),'')),now()) on conflict(booking_id) do update set booking_customer_user_id=excluded.booking_customer_user_id,signer_match_status=status_value,signer_verified_at=now(),signer_verified_by=auth.uid(),metadata=private.booking_party_checks.metadata||excluded.metadata,updated_at=now();
  return jsonb_build_object('ok',true,'bookingId',b.id,'reference',b.reference,'signerMatchStatus',status_value);
end; $$;

create or replace function private.sync_paid_payment_to_finance()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
declare b public.bookings%rowtype; finance_category text; finance_source text; actual_method text; paid_total numeric:=0; actor_id uuid:=null;
begin
  if new.status<>'PAID' or (tg_op='UPDATE' and old.status='PAID') then return new; end if;
  select * into b from public.bookings where id=new.booking_id;
  if not found then return new; end if;
  finance_category:=case b.booking_type when 'RENTAL' then 'RENTAL' when 'TOUR' then 'TOUR' when 'SALE_INQUIRY' then 'VEHICLE_SALE' else 'SERVICE' end;
  finance_source:=case lower(coalesce(new.provider,'')) when 'paytr' then 'PAYTR' when 'iyzico' then 'IYZICO' when 'office' then 'OFFICE' when 'eft' then 'EFT' else 'AUTOMATIC' end;
  actual_method:=case lower(coalesce(new.provider,'')) when 'office' then 'OFFICE' when 'eft' then 'EFT' else coalesce(b.payment_method,'CARD') end;
  begin actor_id:=nullif(new.request_snapshot->>'recordedByActor','')::uuid; exception when others then actor_id:=null; end;
  insert into public.finance_transactions(direction,category,branch_id,booking_id,payment_transaction_id,vehicle_id,tour_id,campaign_id,payment_method,gross_amount,discount_amount,tax_amount,net_amount,currency,counterparty_name,reference,description,source,external_reference,status,metadata,created_by) values('INCOME',finance_category,b.fulfillment_branch_id,b.id,new.id,b.vehicle_id,b.tour_id,b.campaign_id,actual_method,new.amount,0,0,new.amount,new.currency,b.customer_name,b.reference,b.item_name,finance_source,new.provider_reference,'POSTED',jsonb_build_object('booking_type',b.booking_type,'provider',new.provider,'commercial_discount_snapshot',coalesce(b.discount_amount,0)),actor_id) on conflict do nothing;
  select coalesce(sum(pt.amount),0) into paid_total from public.payment_transactions pt where pt.booking_id=b.id and pt.status='PAID';
  update public.bookings set amount_paid=paid_total,payment_recorded_at=now(),payment_status=case when coalesce(total_price,0)>0 and paid_total>=greatest(total_price-0.01,0) then 'PAID' when paid_total>0 then 'PENDING' else payment_status end,updated_at=now() where id=b.id;
  return new;
end; $$;

create or replace function public.service_admin_branch_finance_snapshot_v225(p_actor uuid,p_branch_id uuid default null)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public, private as $$
declare allowed boolean;
begin
  select exists(select 1 from public.admin_users a where a.user_id=p_actor and a.is_active=true and (lower(a.role) in ('owner','admin') or coalesce(a.permissions->>'finance.read','false')='true' or coalesce(a.permissions->>'finance.manage','false')='true')) into allowed;
  if not allowed then raise exception 'FINANCE_ADMIN_REQUIRED'; end if;
  return jsonb_build_object('ok',true,'billingModel','SUBSCRIPTION','branches',coalesce((select jsonb_agg(jsonb_build_object('branchId',b.id,'branchName',b.name,'city',b.city,'networkType',b.network_type,'bankName',fp.bank_name,'iban',fp.iban,'accountHolder',fp.account_holder,'legalName',fp.legal_name,'taxNumber',fp.tax_number,'taxOffice',fp.tax_office,'preferredProvider',coalesce(fp.preferred_provider,'NONE'),'payoutStatus',coalesce(fp.payout_status,'NOT_CONNECTED'),'payoutEnabled',coalesce(fp.payout_enabled,false),'paytrSubmerchantRef',fp.paytr_submerchant_ref,'iyzicoSubmerchantRef',fp.iyzico_submerchant_ref,'subscriptionStatus',bs.status,'income',coalesce((select sum(ft.net_amount) from public.finance_transactions ft where ft.branch_id=b.id and ft.status<>'VOID' and ft.direction='INCOME'),0),'expense',coalesce((select sum(ft.net_amount) from public.finance_transactions ft where ft.branch_id=b.id and ft.status<>'VOID' and ft.direction='EXPENSE'),0),'outstanding',coalesce((select sum(greatest(coalesce(bk.total_price,0)-coalesce(bk.amount_paid,0),0)) from public.bookings bk where bk.fulfillment_branch_id=b.id and bk.deleted_at is null and bk.status not in ('REJECTED','CANCELLED')),0)) order by b.name) from public.branches b left join private.branch_finance_profiles fp on fp.branch_id=b.id left join lateral (select s.status from public.branch_subscriptions s where s.branch_id=b.id order by s.updated_at desc limit 1) bs on true where p_branch_id is null or b.id=p_branch_id),'[]'::jsonb));
end; $$;

create or replace function public.service_admin_update_branch_payout_v225(p_actor uuid,p_branch_id uuid,p_provider text,p_paytr_submerchant_ref text,p_iyzico_submerchant_ref text,p_status text,p_enabled boolean)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public, private as $$
declare allowed boolean; provider text:=upper(btrim(coalesce(p_provider,'NONE'))); status_value text:=upper(btrim(coalesce(p_status,'NOT_CONNECTED'))); row private.branch_finance_profiles%rowtype;
begin
  select exists(select 1 from public.admin_users a where a.user_id=p_actor and a.is_active=true and (lower(a.role) in ('owner','admin') or coalesce(a.permissions->>'finance.manage','false')='true')) into allowed;
  if not allowed then raise exception 'FINANCE_ADMIN_REQUIRED'; end if;
  if provider not in ('PAYTR','IYZICO','NONE') then raise exception 'INVALID_PAYOUT_PROVIDER'; end if;
  if status_value not in ('NOT_CONNECTED','REVIEW_REQUIRED','PENDING_PROVIDER','ACTIVE','REJECTED','PAUSED') then raise exception 'INVALID_PAYOUT_STATUS'; end if;
  if p_enabled and status_value<>'ACTIVE' then raise exception 'PAYOUT_PROVIDER_NOT_ACTIVE'; end if;
  if p_enabled and provider='PAYTR' and nullif(btrim(coalesce(p_paytr_submerchant_ref,'')),'') is null then raise exception 'PAYTR_SUBMERCHANT_REQUIRED'; end if;
  if p_enabled and provider='IYZICO' and nullif(btrim(coalesce(p_iyzico_submerchant_ref,'')),'') is null then raise exception 'IYZICO_SUBMERCHANT_REQUIRED'; end if;
  if p_enabled and provider='NONE' then raise exception 'PAYOUT_PROVIDER_REQUIRED'; end if;
  insert into private.branch_finance_profiles(branch_id,preferred_provider,paytr_submerchant_ref,iyzico_submerchant_ref,payout_status,payout_enabled,provider_verified_at,provider_verified_by,updated_at) values(p_branch_id,provider,nullif(left(btrim(coalesce(p_paytr_submerchant_ref,'')),200),''),nullif(left(btrim(coalesce(p_iyzico_submerchant_ref,'')),200),''),status_value,p_enabled,case when status_value='ACTIVE' then now() else null end,case when status_value='ACTIVE' then p_actor else null end,now()) on conflict(branch_id) do update set preferred_provider=excluded.preferred_provider,paytr_submerchant_ref=excluded.paytr_submerchant_ref,iyzico_submerchant_ref=excluded.iyzico_submerchant_ref,payout_status=excluded.payout_status,payout_enabled=excluded.payout_enabled,provider_verified_at=excluded.provider_verified_at,provider_verified_by=excluded.provider_verified_by,updated_at=now() returning * into row;
  return jsonb_build_object('ok',true,'branchId',row.branch_id,'preferredProvider',row.preferred_provider,'payoutStatus',row.payout_status,'payoutEnabled',row.payout_enabled,'paytrSubmerchantRef',row.paytr_submerchant_ref,'iyzicoSubmerchantRef',row.iyzico_submerchant_ref);
end; $$;

-- Phase 1 is additive so current production remains compatible until the server-side admin writer and branch RPC client are deployed.
revoke all on function public.service_update_branch_profile_v225(uuid,text,text,text,text,text,text,jsonb,text,text,text,text,text) from public,anon;
grant execute on function public.service_update_branch_profile_v225(uuid,text,text,text,text,text,text,jsonb,text,text,text,text,text) to authenticated;
revoke all on function public.service_branch_finance_snapshot_v225(uuid,timestamptz,timestamptz) from public,anon;
grant execute on function public.service_branch_finance_snapshot_v225(uuid,timestamptz,timestamptz) to authenticated;
revoke all on function public.service_branch_save_finance_profile_v225(uuid,text,text,text,text,text,text,text) from public,anon;
grant execute on function public.service_branch_save_finance_profile_v225(uuid,text,text,text,text,text,text,text) to authenticated;
revoke all on function public.service_branch_add_expense_v225(uuid,numeric,text,text,timestamptz,text,text,text,text,text,text) from public,anon;
grant execute on function public.service_branch_add_expense_v225(uuid,numeric,text,text,timestamptz,text,text,text,text,text,text) to authenticated;
revoke all on function public.service_branch_void_expense_v225(uuid,uuid,text) from public,anon;
grant execute on function public.service_branch_void_expense_v225(uuid,uuid,text) to authenticated;
revoke all on function public.service_branch_record_offline_payment_v225(uuid,text,numeric,text,text,text,text,text,text) from public,anon;
grant execute on function public.service_branch_record_offline_payment_v225(uuid,text,numeric,text,text,text,text,text,text) to authenticated;
revoke all on function public.service_branch_confirm_signer_v225(uuid,text,boolean,text) from public,anon;
grant execute on function public.service_branch_confirm_signer_v225(uuid,text,boolean,text) to authenticated;
revoke all on function public.service_record_card_payer_match_v225(uuid,uuid) from public,anon,authenticated;
grant execute on function public.service_record_card_payer_match_v225(uuid,uuid) to service_role;
revoke all on function public.service_admin_branch_finance_snapshot_v225(uuid,uuid) from public,anon,authenticated;
grant execute on function public.service_admin_branch_finance_snapshot_v225(uuid,uuid) to service_role;
revoke all on function public.service_admin_update_branch_payout_v225(uuid,uuid,text,text,text,text,boolean) from public,anon,authenticated;
grant execute on function public.service_admin_update_branch_payout_v225(uuid,uuid,text,text,text,text,boolean) to service_role;
