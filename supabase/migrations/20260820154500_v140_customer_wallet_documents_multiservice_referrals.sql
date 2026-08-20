alter table public.loyalty_program_settings
  add column if not exists referral_rental_inviter_points integer not null default 500 check (referral_rental_inviter_points between 0 and 1000000),
  add column if not exists referral_rental_invitee_points integer not null default 250 check (referral_rental_invitee_points between 0 and 1000000),
  add column if not exists referral_sale_inviter_points integer not null default 1500 check (referral_sale_inviter_points between 0 and 1000000),
  add column if not exists referral_sale_invitee_points integer not null default 750 check (referral_sale_invitee_points between 0 and 1000000),
  add column if not exists referral_tour_inviter_points integer not null default 300 check (referral_tour_inviter_points between 0 and 1000000),
  add column if not exists referral_tour_invitee_points integer not null default 150 check (referral_tour_invitee_points between 0 and 1000000);

create table if not exists public.customer_referral_rewards (
  id uuid primary key default gen_random_uuid(),
  referral_id uuid not null references public.customer_referrals(id) on delete cascade,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  reward_type text not null check (reward_type in ('RENTAL','VEHICLE_PURCHASE','TOUR')),
  inviter_points integer not null default 0 check (inviter_points >= 0),
  invitee_points integer not null default 0 check (invitee_points >= 0),
  rewarded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(referral_id,reward_type)
);
create index if not exists customer_referral_rewards_booking_idx on public.customer_referral_rewards(booking_id);
create index if not exists customer_referral_rewards_referral_idx on public.customer_referral_rewards(referral_id,created_at desc);
alter table public.customer_referral_rewards enable row level security;
create policy customer_referral_rewards_read on public.customer_referral_rewards for select to authenticated using (
  exists(select 1 from public.customer_referrals r where r.id=referral_id and ((select auth.uid()) in (r.inviter_user_id,r.invitee_user_id) or (select private.can_manage_operations())))
);
revoke insert,update,delete on public.customer_referral_rewards from authenticated;
grant select on public.customer_referral_rewards to authenticated;

create or replace function private.reward_referral_on_qualifying_transaction() returns trigger
language plpgsql security definer set search_path=public,private,pg_temp as $$
declare
  v_ref public.customer_referrals;
  v_settings public.loyalty_program_settings;
  v_reward_type text;
  v_inviter_points integer := 0;
  v_invitee_points integer := 0;
  v_inviter_reason text;
  v_invitee_reason text;
  v_reward_id uuid;
  v_first_qualification boolean := false;
  v_count integer;
  v_bonus integer := 0;
begin
  if new.status <> 'COMPLETED' or new.customer_user_id is null or new.deleted_at is not null then return new; end if;

  if new.booking_type='RENTAL' then
    v_reward_type := 'RENTAL';
    v_inviter_reason := 'REFERRAL_RENTAL_INVITER';
    v_invitee_reason := 'REFERRAL_RENTAL_INVITEE';
  elsif new.booking_type='SALE_INQUIRY' then
    v_reward_type := 'VEHICLE_PURCHASE';
    v_inviter_reason := 'REFERRAL_VEHICLE_PURCHASE_INVITER';
    v_invitee_reason := 'REFERRAL_VEHICLE_PURCHASE_INVITEE';
  elsif new.booking_type='TOUR' then
    v_reward_type := 'TOUR';
    v_inviter_reason := 'REFERRAL_TOUR_INVITER';
    v_invitee_reason := 'REFERRAL_TOUR_INVITEE';
  else
    return new;
  end if;

  select * into v_ref from public.customer_referrals
  where invitee_user_id=new.customer_user_id and status in ('REGISTERED','REWARDED')
  for update;
  if not found then return new; end if;

  select * into v_settings from public.loyalty_program_settings where id=true;
  if not found or not v_settings.enabled then return new; end if;

  if v_reward_type='RENTAL' then
    v_inviter_points := v_settings.referral_rental_inviter_points;
    v_invitee_points := v_settings.referral_rental_invitee_points;
  elsif v_reward_type='VEHICLE_PURCHASE' then
    v_inviter_points := v_settings.referral_sale_inviter_points;
    v_invitee_points := v_settings.referral_sale_invitee_points;
  else
    v_inviter_points := v_settings.referral_tour_inviter_points;
    v_invitee_points := v_settings.referral_tour_invitee_points;
  end if;

  insert into public.customer_referral_rewards(referral_id,booking_id,reward_type,inviter_points,invitee_points)
  values(v_ref.id,new.id,v_reward_type,v_inviter_points,v_invitee_points)
  on conflict(referral_id,reward_type) do nothing
  returning id into v_reward_id;
  if v_reward_id is null then return new; end if;

  perform private.credit_referral_points(v_ref.inviter_user_id,v_inviter_points,v_inviter_reason,v_ref.id);
  perform private.credit_referral_points(v_ref.invitee_user_id,v_invitee_points,v_invitee_reason,v_ref.id);

  v_first_qualification := v_ref.status='REGISTERED';
  update public.customer_referrals set
    status='REWARDED',
    qualified_booking_id=coalesce(qualified_booking_id,new.id),
    inviter_points_awarded=inviter_points_awarded+v_inviter_points,
    invitee_points_awarded=invitee_points_awarded+v_invitee_points,
    rewarded_at=coalesce(rewarded_at,now()),
    updated_at=now()
  where id=v_ref.id;

  if v_first_qualification then
    update public.customer_loyalty_accounts set successful_referrals=successful_referrals+1,updated_at=now()
    where user_id=v_ref.inviter_user_id returning successful_referrals into v_count;
    v_bonus := case v_count
      when 3 then v_settings.referral_milestone_3_points
      when 5 then v_settings.referral_milestone_5_points
      when 10 then v_settings.referral_milestone_10_points
      else 0 end;
    if v_bonus>0 then
      perform private.credit_referral_points(v_ref.inviter_user_id,v_bonus,'REFERRAL_MILESTONE_'||v_count::text,v_ref.id);
    end if;
  end if;
  return new;
end; $$;
revoke all on function private.reward_referral_on_qualifying_transaction() from public,anon,authenticated;
drop trigger if exists bookings_referral_reward on public.bookings;
drop trigger if exists bookings_referral_qualifying_reward on public.bookings;
create trigger bookings_referral_qualifying_reward after insert or update of status,customer_user_id,booking_type on public.bookings
for each row execute function private.reward_referral_on_qualifying_transaction();

create or replace function public.customer_referral_summary() returns jsonb
language sql stable security invoker set search_path=public,pg_temp as $$
  select jsonb_build_object(
    'code', c.code,
    'registered', (select count(*) from public.customer_referrals r where r.inviter_user_id=c.user_id),
    'rewarded', (select count(*) from public.customer_referrals r where r.inviter_user_id=c.user_id and r.status='REWARDED'),
    'pending', (select count(*) from public.customer_referrals r where r.inviter_user_id=c.user_id and r.status='REGISTERED'),
    'rentalRewards', (select count(*) from public.customer_referral_rewards rw join public.customer_referrals r on r.id=rw.referral_id where r.inviter_user_id=c.user_id and rw.reward_type='RENTAL'),
    'saleRewards', (select count(*) from public.customer_referral_rewards rw join public.customer_referrals r on r.id=rw.referral_id where r.inviter_user_id=c.user_id and rw.reward_type='VEHICLE_PURCHASE'),
    'tourRewards', (select count(*) from public.customer_referral_rewards rw join public.customer_referrals r on r.id=rw.referral_id where r.inviter_user_id=c.user_id and rw.reward_type='TOUR'),
    'pointsEarned', coalesce(a.referral_points_earned,0),
    'successfulReferrals', coalesce(a.successful_referrals,0)
  )
  from public.customer_referral_codes c
  left join public.customer_loyalty_accounts a on a.user_id=c.user_id
  where c.user_id=auth.uid() and c.is_active
$$;
revoke all on function public.customer_referral_summary() from public,anon;
grant execute on function public.customer_referral_summary() to authenticated;

create table if not exists public.customer_vault_terms (
  version text primary key,
  title text not null,
  body text not null,
  is_active boolean not null default false,
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
create unique index if not exists customer_vault_terms_one_active_uidx on public.customer_vault_terms((is_active)) where is_active;
alter table public.customer_vault_terms enable row level security;
create policy customer_vault_terms_read on public.customer_vault_terms for select to authenticated using (is_active or (select private.can_manage_operations()));
create policy customer_vault_terms_admin_write on public.customer_vault_terms for all to authenticated using ((select private.can_manage_settings())) with check ((select private.can_manage_settings()));
grant select,insert,update,delete on public.customer_vault_terms to authenticated;

create table if not exists public.customer_vault_consents (
  user_id uuid not null references public.customer_profiles(user_id) on delete cascade,
  terms_version text not null references public.customer_vault_terms(version) on delete restrict,
  accepted_at timestamptz not null default now(),
  revoked_at timestamptz,
  accepted_via text not null default 'WEB_ACCOUNT',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(user_id,terms_version)
);
alter table public.customer_vault_consents enable row level security;
create policy customer_vault_consents_read on public.customer_vault_consents for select to authenticated using ((select auth.uid())=user_id or (select private.can_manage_operations()));
revoke insert,update,delete on public.customer_vault_consents from authenticated;
grant select on public.customer_vault_consents to authenticated;

create or replace function private.has_active_vault_consent(p_user_id uuid) returns boolean
language sql stable security definer set search_path=public,private,pg_temp as $$
  select exists(
    select 1 from public.customer_vault_consents c
    join public.customer_vault_terms t on t.version=c.terms_version
    where c.user_id=p_user_id and c.revoked_at is null and t.is_active
  )
$$;
revoke all on function private.has_active_vault_consent(uuid) from public,anon,authenticated;

create or replace function public.accept_customer_vault_terms() returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_uid uuid:=auth.uid(); v_version text;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select version into v_version from public.customer_vault_terms where is_active order by published_at desc limit 1;
  if v_version is null then raise exception 'VAULT_TERMS_NOT_AVAILABLE'; end if;
  insert into public.customer_vault_consents(user_id,terms_version,accepted_at,revoked_at,accepted_via,updated_at)
  values(v_uid,v_version,now(),null,'WEB_ACCOUNT',now())
  on conflict(user_id,terms_version) do update set accepted_at=now(),revoked_at=null,accepted_via='WEB_ACCOUNT',updated_at=now();
  return jsonb_build_object('ok',true,'version',v_version,'acceptedAt',now());
end; $$;
revoke all on function public.accept_customer_vault_terms() from public,anon;
grant execute on function public.accept_customer_vault_terms() to authenticated;

create or replace function public.revoke_customer_vault_terms() returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_uid uuid:=auth.uid();
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  update public.customer_vault_consents set revoked_at=now(),updated_at=now() where user_id=v_uid and revoked_at is null;
  return jsonb_build_object('ok',true,'revokedAt',now());
end; $$;
revoke all on function public.revoke_customer_vault_terms() from public,anon;
grant execute on function public.revoke_customer_vault_terms() to authenticated;

create table if not exists public.customer_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.customer_profiles(user_id) on delete cascade,
  document_type text not null check (document_type in ('IDENTITY_FRONT','IDENTITY_BACK','DRIVING_LICENSE_FRONT','DRIVING_LICENSE_BACK','PASSPORT','ADDRESS_DOCUMENT','OTHER')),
  storage_path text not null unique,
  original_name text not null,
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp','application/pdf')),
  file_size bigint not null check (file_size>0 and file_size<=10485760),
  expiry_date date,
  verification_status text not null default 'PENDING' check (verification_status in ('PENDING','VERIFIED','REJECTED','EXPIRED')),
  verified_at timestamptz,
  verified_by uuid references auth.users(id) on delete set null,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (split_part(storage_path,'/',1)=user_id::text)
);
create index if not exists customer_documents_user_idx on public.customer_documents(user_id,created_at desc);
create index if not exists customer_documents_status_idx on public.customer_documents(verification_status,created_at desc);
create index if not exists customer_documents_verified_by_idx on public.customer_documents(verified_by) where verified_by is not null;
alter table public.customer_documents enable row level security;
create policy customer_documents_read on public.customer_documents for select to authenticated using ((select auth.uid())=user_id or (select private.can_manage_operations()));
create policy customer_documents_insert_own on public.customer_documents for insert to authenticated with check (
  (select auth.uid())=user_id and verification_status='PENDING' and verified_at is null and verified_by is null and rejection_reason is null and private.has_active_vault_consent((select auth.uid()))
);
create policy customer_documents_delete_own on public.customer_documents for delete to authenticated using ((select auth.uid())=user_id);
revoke update on public.customer_documents from authenticated;
grant select,insert,delete on public.customer_documents to authenticated;

create or replace function public.admin_review_customer_document(p_document_id uuid,p_status text,p_reason text default null) returns jsonb
language plpgsql security definer set search_path=public,private,pg_temp as $$
declare v_uid uuid:=auth.uid(); v_row public.customer_documents;
begin
  if v_uid is null or not private.can_manage_operations() then raise exception 'FORBIDDEN'; end if;
  if p_status not in ('VERIFIED','REJECTED','EXPIRED','PENDING') then raise exception 'INVALID_DOCUMENT_STATUS'; end if;
  update public.customer_documents set verification_status=p_status,
    verified_at=case when p_status='VERIFIED' then now() else null end,
    verified_by=case when p_status='VERIFIED' then v_uid else null end,
    rejection_reason=case when p_status='REJECTED' then nullif(trim(coalesce(p_reason,'')),'') else null end,
    updated_at=now()
  where id=p_document_id returning * into v_row;
  if not found then raise exception 'DOCUMENT_NOT_FOUND'; end if;
  return jsonb_build_object('ok',true,'id',v_row.id,'status',v_row.verification_status);
end; $$;
revoke all on function public.admin_review_customer_document(uuid,text,text) from public,anon;
grant execute on function public.admin_review_customer_document(uuid,text,text) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('customer-documents','customer-documents',false,10485760,array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict(id) do update set public=false,file_size_limit=10485760,allowed_mime_types=array['image/jpeg','image/png','image/webp','application/pdf'];

drop policy if exists customer_documents_storage_insert on storage.objects;
create policy customer_documents_storage_insert on storage.objects for insert to authenticated with check (
  bucket_id='customer-documents' and (storage.foldername(name))[1]=(select auth.uid())::text and private.has_active_vault_consent((select auth.uid()))
);
drop policy if exists customer_documents_storage_read on storage.objects;
create policy customer_documents_storage_read on storage.objects for select to authenticated using (
  bucket_id='customer-documents' and ((storage.foldername(name))[1]=(select auth.uid())::text or (select private.can_manage_operations()))
);
drop policy if exists customer_documents_storage_delete on storage.objects;
create policy customer_documents_storage_delete on storage.objects for delete to authenticated using (
  bucket_id='customer-documents' and ((storage.foldername(name))[1]=(select auth.uid())::text or (select private.can_manage_operations()))
);

create table if not exists public.customer_experience_preferences (
  user_id uuid primary key references public.customer_profiles(user_id) on delete cascade,
  monthly_spend_target numeric(14,2) check (monthly_spend_target is null or monthly_spend_target between 0 and 1000000000),
  preferred_currency text not null default 'TRY' check (preferred_currency in ('TRY','EUR','USD','CHF')),
  spend_alert_enabled boolean not null default false,
  spend_alert_threshold_percent integer not null default 80 check (spend_alert_threshold_percent between 50 and 100),
  document_expiry_reminder_days integer not null default 30 check (document_expiry_reminder_days between 1 and 365),
  quick_checkout_enabled boolean not null default true,
  preferred_payment_method_id uuid references public.customer_payment_methods(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists customer_experience_preferred_payment_idx on public.customer_experience_preferences(preferred_payment_method_id) where preferred_payment_method_id is not null;
alter table public.customer_experience_preferences enable row level security;
create policy customer_experience_preferences_read on public.customer_experience_preferences for select to authenticated using ((select auth.uid())=user_id or (select private.can_manage_operations()));
create policy customer_experience_preferences_insert on public.customer_experience_preferences for insert to authenticated with check ((select auth.uid())=user_id);
create policy customer_experience_preferences_update on public.customer_experience_preferences for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
grant select,insert,update on public.customer_experience_preferences to authenticated;

create or replace function private.validate_customer_preferred_payment_method() returns trigger
language plpgsql security definer set search_path=public,private,pg_temp as $$
begin
  if new.preferred_payment_method_id is not null and not exists(
    select 1 from public.customer_payment_methods p where p.id=new.preferred_payment_method_id and p.user_id=new.user_id and p.status='ACTIVE'
  ) then raise exception 'PAYMENT_METHOD_NOT_OWNED'; end if;
  return new;
end; $$;
revoke all on function private.validate_customer_preferred_payment_method() from public,anon,authenticated;
drop trigger if exists customer_experience_validate_payment on public.customer_experience_preferences;
create trigger customer_experience_validate_payment before insert or update of preferred_payment_method_id,user_id on public.customer_experience_preferences
for each row execute function private.validate_customer_preferred_payment_method();

create or replace function public.customer_spending_summary() returns jsonb
language sql stable security invoker set search_path=public,pg_temp as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'currency',currency,
    'monthSpend',month_spend,
    'yearSpend',year_spend,
    'lifetimeSpend',lifetime_spend,
    'discountSavings',discount_savings,
    'rentalSpend',rental_spend,
    'vehiclePurchaseSpend',sale_spend,
    'tourSpend',tour_spend,
    'completedTransactions',completed_transactions
  ) order by currency),'[]'::jsonb)
  from (
    select currency,
      coalesce(sum(coalesce(nullif(amount_paid,0),total_price,0)) filter (where created_at>=date_trunc('month',now())),0) as month_spend,
      coalesce(sum(coalesce(nullif(amount_paid,0),total_price,0)) filter (where created_at>=date_trunc('year',now())),0) as year_spend,
      coalesce(sum(coalesce(nullif(amount_paid,0),total_price,0)),0) as lifetime_spend,
      coalesce(sum(discount_amount),0) as discount_savings,
      coalesce(sum(coalesce(nullif(amount_paid,0),total_price,0)) filter (where booking_type='RENTAL'),0) as rental_spend,
      coalesce(sum(coalesce(nullif(amount_paid,0),total_price,0)) filter (where booking_type='SALE_INQUIRY'),0) as sale_spend,
      coalesce(sum(coalesce(nullif(amount_paid,0),total_price,0)) filter (where booking_type='TOUR'),0) as tour_spend,
      count(*) as completed_transactions
    from public.bookings
    where customer_user_id=auth.uid() and status='COMPLETED' and deleted_at is null
    group by currency
  ) s
$$;
revoke all on function public.customer_spending_summary() from public,anon;
grant execute on function public.customer_spending_summary() to authenticated;

create or replace function public.set_default_customer_payment_method(p_method_id uuid) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_uid uuid:=auth.uid();
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists(select 1 from public.customer_payment_methods where id=p_method_id and user_id=v_uid and status='ACTIVE') then raise exception 'PAYMENT_METHOD_NOT_FOUND'; end if;
  update public.customer_payment_methods set is_default=false,updated_at=now() where user_id=v_uid and is_default;
  update public.customer_payment_methods set is_default=true,updated_at=now() where id=p_method_id and user_id=v_uid;
  insert into public.customer_experience_preferences(user_id,preferred_payment_method_id) values(v_uid,p_method_id)
  on conflict(user_id) do update set preferred_payment_method_id=excluded.preferred_payment_method_id,updated_at=now();
  return jsonb_build_object('ok',true,'id',p_method_id);
end; $$;
revoke all on function public.set_default_customer_payment_method(uuid) from public,anon;
grant execute on function public.set_default_customer_payment_method(uuid) to authenticated;

create or replace function public.remove_customer_payment_method(p_method_id uuid) returns jsonb
language plpgsql security definer set search_path=public,private,pg_temp as $$
declare v_uid uuid:=auth.uid();
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists(select 1 from public.customer_payment_methods where id=p_method_id and user_id=v_uid and status='ACTIVE') then raise exception 'PAYMENT_METHOD_NOT_FOUND'; end if;
  update public.customer_payment_methods set status='REMOVED',is_default=false,updated_at=now() where id=p_method_id and user_id=v_uid;
  delete from private.customer_payment_tokens where user_id=v_uid and id=p_method_id;
  update public.customer_experience_preferences set preferred_payment_method_id=null,updated_at=now() where user_id=v_uid and preferred_payment_method_id=p_method_id;
  return jsonb_build_object('ok',true,'id',p_method_id);
end; $$;
revoke all on function public.remove_customer_payment_method(uuid) from public,anon;
grant execute on function public.remove_customer_payment_method(uuid) to authenticated;

create or replace function private.protect_customer_vault_terms() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if (old.title is distinct from new.title or old.body is distinct from new.body) and exists(select 1 from public.customer_vault_consents where terms_version=old.version) then
    raise exception 'PUBLISHED_TERMS_IMMUTABLE_CREATE_NEW_VERSION';
  end if;
  return new;
end; $$;
revoke all on function private.protect_customer_vault_terms() from public,anon,authenticated;
drop trigger if exists customer_vault_terms_protect on public.customer_vault_terms;
create trigger customer_vault_terms_protect before update on public.customer_vault_terms for each row execute function private.protect_customer_vault_terms();

insert into public.customer_vault_terms(version,title,body,is_active)
values('2026-08-v1','Alperler Dijital Cüzdan ve Belge Saklama Onayı',$$Bu özellik isteğe bağlıdır ve işlemlerinizi hızlandırmak için sunulur.

1. Yüklediğim kimlik, ehliyet, pasaport, adres veya diğer belgelerin bana ait olduğunu ya da bunları paylaşmaya yetkili olduğumu ve bilgilerin doğru olduğunu beyan ederim.
2. Belgelerimin araç kiralama, araç satın alma/satış işlemleri, tur hizmetleri, rezervasyon doğrulaması, dolandırıcılığın önlenmesi, müşteri desteği ve ilgili sözleşmesel veya yasal yükümlülüklerin yürütülmesi amacıyla yetkili Alperler personeli tarafından gerektiğinde görüntülenebileceğini kabul ederim.
3. Dijital cüzdana belge kaydetmek zorunlu değildir. Belgelerimi profilimden kaldırabilirim. Ancak devam eden bir işlem veya mevzuattan doğan saklama yükümlülüğü kapsamında ayrıca tutulması gereken işlem kayıtları bu kolaylık kasasından farklı olabilir.
4. Kartla ödeme kolaylığı etkinleştirildiğinde tam kart numarası ve CVV Alperler veritabanında saklanmaz. Ödeme kuruluşunun oluşturduğu güvenli token ve kartın marka/son dört hane gibi sınırlı bilgileri kullanılabilir.
5. Dijital cüzdan onayımı gelecekteki kullanım için geri çekebilirim. Geri çekme, daha önce hukuka uygun şekilde yürütülmüş işlemleri geriye dönük olarak geçersiz kılmaz.
6. Hesabımın güvenliğini korumak, güncel olmayan belgeleri yenilemek ve yetkisiz erişim şüphesi halinde Alperler'e bildirim yapmak benim sorumluluğumdadır.
7. Bu onay, sitedeki yürürlükteki gizlilik/kişisel veri aydınlatma metinleri ve hizmet koşullarıyla birlikte değerlendirilir.$$ ,true)
on conflict(version) do nothing;