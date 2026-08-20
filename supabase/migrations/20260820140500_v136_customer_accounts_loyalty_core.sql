create table if not exists public.loyalty_program_settings (
  id boolean primary key default true check (id), enabled boolean not null default true,
  points_per_rental_day integer not null default 100 check (points_per_rental_day > 0 and points_per_rental_day <= 100000),
  minimum_points_per_rental integer not null default 100 check (minimum_points_per_rental >= 0 and minimum_points_per_rental <= 1000000),
  silver_threshold integer not null default 1000 check (silver_threshold >= 0),
  gold_threshold integer not null default 3000 check (gold_threshold >= silver_threshold),
  platinum_threshold integer not null default 7000 check (platinum_threshold >= gold_threshold),
  benefits jsonb not null default '{"MEMBER":["Üyelere özel kiralama geçmişi ve puan takibi"],"SILVER":["Öncelikli müşteri desteği"],"GOLD":["Şubede öncelikli işlem"],"PLATINUM":["En yüksek sadakat seviyesi ve öncelikli hizmet"]}'::jsonb,
  updated_at timestamptz not null default now(), updated_by uuid references auth.users(id) on delete set null
);
insert into public.loyalty_program_settings(id) values (true) on conflict (id) do nothing;

create table if not exists public.customer_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade, email text, full_name text, phone text, birth_date date,
  address_line text, district text, city text, country text not null default 'TR', postal_code text, avatar_url text,
  preferred_locale text not null default 'tr', preferred_branch_id uuid references public.branches(id) on delete set null,
  marketing_consent boolean not null default false, status text not null default 'ACTIVE' check (status in ('ACTIVE','BLOCKED','DELETED')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index if not exists customer_profiles_email_ci_uidx on public.customer_profiles (lower(email)) where email is not null and status <> 'DELETED';
create index if not exists customer_profiles_phone_idx on public.customer_profiles(phone) where phone is not null;
create index if not exists customer_profiles_preferred_branch_idx on public.customer_profiles(preferred_branch_id);

create table if not exists public.customer_loyalty_accounts (
  user_id uuid primary key references public.customer_profiles(user_id) on delete cascade,
  points_balance integer not null default 0 check (points_balance >= 0), lifetime_points integer not null default 0 check (lifetime_points >= 0),
  completed_rentals integer not null default 0 check (completed_rentals >= 0), lifetime_spend numeric(14,2) not null default 0 check (lifetime_spend >= 0),
  tier text not null default 'MEMBER' check (tier in ('MEMBER','SILVER','GOLD','PLATINUM')), updated_at timestamptz not null default now()
);

alter table public.bookings add column if not exists customer_user_id uuid references public.customer_profiles(user_id) on delete set null;
alter table public.bookings add column if not exists customer_linked_at timestamptz;
alter table public.bookings add column if not exists loyalty_points_awarded integer not null default 0 check (loyalty_points_awarded >= 0);
create index if not exists bookings_customer_user_idx on public.bookings(customer_user_id, created_at desc) where customer_user_id is not null and deleted_at is null;

create table if not exists public.customer_loyalty_ledger (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.customer_profiles(user_id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null, direction text not null check (direction in ('EARN','REDEEM','ADJUST','EXPIRE')),
  points integer not null check (points > 0), reason text not null, source text not null default 'SYSTEM' check (source in ('SYSTEM','WEB','BRANCH','ADMIN')),
  created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now()
);
create unique index if not exists customer_loyalty_booking_earn_uidx on public.customer_loyalty_ledger(booking_id) where booking_id is not null and direction='EARN';
create index if not exists customer_loyalty_ledger_user_created_idx on public.customer_loyalty_ledger(user_id, created_at desc);

create table if not exists public.customer_payment_methods (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.customer_profiles(user_id) on delete cascade,
  provider text not null default 'PAYTR', brand text, last4 text check (last4 is null or last4 ~ '^[0-9]{4}$'),
  expiry_month smallint check (expiry_month is null or expiry_month between 1 and 12), expiry_year smallint check (expiry_year is null or expiry_year between 2020 and 2200),
  label text, is_default boolean not null default false, status text not null default 'ACTIVE' check (status in ('ACTIVE','REVOKED')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists customer_payment_methods_user_idx on public.customer_payment_methods(user_id, created_at desc);
create unique index if not exists customer_payment_methods_one_default_uidx on public.customer_payment_methods(user_id) where is_default and status='ACTIVE';

create table if not exists private.customer_payment_tokens (
  id uuid primary key references public.customer_payment_methods(id) on delete cascade, user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null, provider_customer_ref text, provider_payment_method_ref text, provider_fingerprint text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
revoke all on private.customer_payment_tokens from anon, authenticated;

alter table public.customer_profiles enable row level security;
alter table public.customer_loyalty_accounts enable row level security;
alter table public.customer_loyalty_ledger enable row level security;
alter table public.customer_payment_methods enable row level security;
alter table public.loyalty_program_settings enable row level security;

drop policy if exists customer_profiles_self_read on public.customer_profiles;
create policy customer_profiles_self_read on public.customer_profiles for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists customer_profiles_self_update on public.customer_profiles;
create policy customer_profiles_self_update on public.customer_profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists customer_profiles_admin_read on public.customer_profiles;
create policy customer_profiles_admin_read on public.customer_profiles for select to authenticated using ((select private.can_manage_operations()));

drop policy if exists customer_loyalty_accounts_self_read on public.customer_loyalty_accounts;
create policy customer_loyalty_accounts_self_read on public.customer_loyalty_accounts for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists customer_loyalty_accounts_admin_read on public.customer_loyalty_accounts;
create policy customer_loyalty_accounts_admin_read on public.customer_loyalty_accounts for select to authenticated using ((select private.can_manage_operations()));

drop policy if exists customer_loyalty_ledger_self_read on public.customer_loyalty_ledger;
create policy customer_loyalty_ledger_self_read on public.customer_loyalty_ledger for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists customer_loyalty_ledger_admin_read on public.customer_loyalty_ledger;
create policy customer_loyalty_ledger_admin_read on public.customer_loyalty_ledger for select to authenticated using ((select private.can_manage_operations()));

drop policy if exists customer_payment_methods_self_read on public.customer_payment_methods;
create policy customer_payment_methods_self_read on public.customer_payment_methods for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists customer_payment_methods_admin_read on public.customer_payment_methods;
create policy customer_payment_methods_admin_read on public.customer_payment_methods for select to authenticated using ((select private.can_manage_operations()));

drop policy if exists loyalty_program_settings_public_read on public.loyalty_program_settings;
create policy loyalty_program_settings_public_read on public.loyalty_program_settings for select to anon, authenticated using (true);
drop policy if exists loyalty_program_settings_admin_write on public.loyalty_program_settings;
create policy loyalty_program_settings_admin_write on public.loyalty_program_settings for all to authenticated using ((select private.can_manage_settings())) with check ((select private.can_manage_settings()));

drop policy if exists bookings_customer_self_read on public.bookings;
create policy bookings_customer_self_read on public.bookings for select to authenticated using (customer_user_id = (select auth.uid()) and deleted_at is null);

create or replace function public.ensure_customer_profile() returns public.customer_profiles language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare v_uid uuid := auth.uid(); v_email text := lower(nullif(auth.jwt()->>'email','')); v_name text; v_avatar text; v_row public.customer_profiles;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', '')::text,
         coalesce(raw_user_meta_data->>'avatar_url', raw_user_meta_data->>'picture', '')::text
    into v_name, v_avatar from auth.users where id = v_uid;
  insert into public.customer_profiles(user_id,email,full_name,avatar_url)
  values (v_uid,v_email,nullif(left(v_name,160),''),nullif(left(v_avatar,2048),''))
  on conflict (user_id) do update set email=coalesce(excluded.email,public.customer_profiles.email),
    full_name=coalesce(nullif(public.customer_profiles.full_name,''),excluded.full_name),
    avatar_url=coalesce(nullif(public.customer_profiles.avatar_url,''),excluded.avatar_url), updated_at=now()
  returning * into v_row;
  insert into public.customer_loyalty_accounts(user_id) values (v_uid) on conflict (user_id) do nothing;
  if v_email is not null then update public.bookings set customer_user_id=v_uid, customer_linked_at=coalesce(customer_linked_at,now())
    where customer_user_id is null and deleted_at is null and lower(customer_email)=v_email; end if;
  return v_row;
end; $$;
revoke all on function public.ensure_customer_profile() from public, anon;
grant execute on function public.ensure_customer_profile() to authenticated;

create or replace function private.award_customer_booking_loyalty() returns trigger language plpgsql security definer set search_path = public, private, pg_temp as $$
declare v_settings public.loyalty_program_settings; v_days integer; v_points integer; v_inserted uuid; v_new_lifetime integer; v_tier text;
begin
  if new.booking_type <> 'RENTAL' or new.status <> 'COMPLETED' or new.customer_user_id is null or new.deleted_at is not null then return new; end if;
  select * into v_settings from public.loyalty_program_settings where id=true; if not found or not v_settings.enabled then return new; end if;
  v_days := coalesce(new.days, case when new.start_at is not null and new.end_at is not null and new.end_at > new.start_at then greatest(1,ceil(extract(epoch from (new.end_at-new.start_at))/86400.0)::int) end,1);
  v_points := greatest(v_settings.minimum_points_per_rental, v_days*v_settings.points_per_rental_day);
  insert into public.customer_loyalty_ledger(user_id,booking_id,direction,points,reason,source)
    values(new.customer_user_id,new.id,'EARN',v_points,'COMPLETED_RENTAL','SYSTEM') on conflict do nothing returning id into v_inserted;
  if v_inserted is null then return new; end if;
  insert into public.customer_loyalty_accounts(user_id,points_balance,lifetime_points,completed_rentals,lifetime_spend)
    values(new.customer_user_id,v_points,v_points,1,coalesce(new.total_price,0))
    on conflict(user_id) do update set points_balance=customer_loyalty_accounts.points_balance+excluded.points_balance,
      lifetime_points=customer_loyalty_accounts.lifetime_points+excluded.lifetime_points,
      completed_rentals=customer_loyalty_accounts.completed_rentals+1,
      lifetime_spend=customer_loyalty_accounts.lifetime_spend+excluded.lifetime_spend,updated_at=now()
    returning lifetime_points into v_new_lifetime;
  v_tier := case when v_new_lifetime>=v_settings.platinum_threshold then 'PLATINUM' when v_new_lifetime>=v_settings.gold_threshold then 'GOLD'
    when v_new_lifetime>=v_settings.silver_threshold then 'SILVER' else 'MEMBER' end;
  update public.customer_loyalty_accounts set tier=v_tier,updated_at=now() where user_id=new.customer_user_id;
  update public.bookings set loyalty_points_awarded=v_points where id=new.id and loyalty_points_awarded=0;
  return new;
end; $$;
drop trigger if exists bookings_customer_loyalty_award on public.bookings;
create trigger bookings_customer_loyalty_award after insert or update of status,customer_user_id on public.bookings for each row execute function private.award_customer_booking_loyalty();

create or replace function public.admin_link_booking_customer(p_booking_reference text,p_customer_user_id uuid) returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$
declare v_booking public.bookings; v_customer public.customer_profiles;
begin
  if not private.can_manage_operations() then raise exception 'FORBIDDEN'; end if;
  select * into v_customer from public.customer_profiles where user_id=p_customer_user_id and status='ACTIVE'; if not found then raise exception 'CUSTOMER_NOT_FOUND'; end if;
  update public.bookings set customer_user_id=p_customer_user_id,customer_linked_at=now(),
    customer_name=coalesce(nullif(v_customer.full_name,''),customer_name), customer_email=coalesce(nullif(v_customer.email,''),customer_email),
    customer_phone=coalesce(nullif(v_customer.phone,''),customer_phone),updated_at=now()
    where reference=p_booking_reference and deleted_at is null returning * into v_booking;
  if not found then raise exception 'BOOKING_NOT_FOUND'; end if;
  return jsonb_build_object('ok',true,'bookingReference',v_booking.reference,'customerUserId',v_booking.customer_user_id,'loyaltyPointsAwarded',v_booking.loyalty_points_awarded);
end; $$;
revoke all on function public.admin_link_booking_customer(text,uuid) from public,anon;
grant execute on function public.admin_link_booking_customer(text,uuid) to authenticated;
