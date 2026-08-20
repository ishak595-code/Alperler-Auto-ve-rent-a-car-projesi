alter table public.loyalty_program_settings
  add column if not exists referral_inviter_points integer not null default 500 check (referral_inviter_points >= 0 and referral_inviter_points <= 1000000),
  add column if not exists referral_invitee_points integer not null default 250 check (referral_invitee_points >= 0 and referral_invitee_points <= 1000000),
  add column if not exists referral_milestone_3_points integer not null default 300 check (referral_milestone_3_points >= 0 and referral_milestone_3_points <= 1000000),
  add column if not exists referral_milestone_5_points integer not null default 500 check (referral_milestone_5_points >= 0 and referral_milestone_5_points <= 1000000),
  add column if not exists referral_milestone_10_points integer not null default 1000 check (referral_milestone_10_points >= 0 and referral_milestone_10_points <= 1000000);

alter table public.customer_loyalty_accounts
  add column if not exists successful_referrals integer not null default 0 check (successful_referrals >= 0),
  add column if not exists referral_points_earned integer not null default 0 check (referral_points_earned >= 0);

create table if not exists public.customer_referral_codes (
  user_id uuid primary key references public.customer_profiles(user_id) on delete cascade,
  code text not null unique check (code ~ '^[A-Z0-9]{8,16}$'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customer_referrals (
  id uuid primary key default gen_random_uuid(),
  inviter_user_id uuid not null references public.customer_profiles(user_id) on delete cascade,
  invitee_user_id uuid not null unique references public.customer_profiles(user_id) on delete cascade,
  referral_code text not null,
  status text not null default 'REGISTERED' check (status in ('REGISTERED','REWARDED','VOID')),
  qualified_booking_id uuid references public.bookings(id) on delete set null,
  inviter_points_awarded integer not null default 0 check (inviter_points_awarded >= 0),
  invitee_points_awarded integer not null default 0 check (invitee_points_awarded >= 0),
  claimed_at timestamptz not null default now(),
  rewarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (inviter_user_id <> invitee_user_id)
);
create index if not exists customer_referrals_inviter_idx on public.customer_referrals(inviter_user_id, created_at desc);
create index if not exists customer_referrals_status_idx on public.customer_referrals(status, created_at desc);

alter table public.customer_loyalty_ledger add column if not exists referral_id uuid references public.customer_referrals(id) on delete set null;
create unique index if not exists customer_loyalty_referral_reason_uidx on public.customer_loyalty_ledger(referral_id, user_id, reason) where referral_id is not null;

alter table public.customer_referral_codes enable row level security;
alter table public.customer_referrals enable row level security;

drop policy if exists customer_referral_codes_self_read on public.customer_referral_codes;
create policy customer_referral_codes_self_read on public.customer_referral_codes for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists customer_referral_codes_admin_read on public.customer_referral_codes;
create policy customer_referral_codes_admin_read on public.customer_referral_codes for select to authenticated using ((select private.can_manage_operations()));

drop policy if exists customer_referrals_participant_read on public.customer_referrals;
create policy customer_referrals_participant_read on public.customer_referrals for select to authenticated using ((select auth.uid()) in (inviter_user_id, invitee_user_id));
drop policy if exists customer_referrals_admin_read on public.customer_referrals;
create policy customer_referrals_admin_read on public.customer_referrals for select to authenticated using ((select private.can_manage_operations()));

revoke insert, update, delete on public.customer_referral_codes from authenticated;
revoke insert, update, delete on public.customer_referrals from authenticated;
grant select on public.customer_referral_codes, public.customer_referrals to authenticated;

grant update (avatar_url) on public.customer_profiles to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('customer-avatars','customer-avatars',true,2097152,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=true,file_size_limit=2097152,allowed_mime_types=array['image/jpeg','image/png','image/webp'];

drop policy if exists customer_avatar_insert_own on storage.objects;
create policy customer_avatar_insert_own on storage.objects for insert to authenticated with check (
  bucket_id='customer-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text
);
drop policy if exists customer_avatar_update_own on storage.objects;
create policy customer_avatar_update_own on storage.objects for update to authenticated using (
  bucket_id='customer-avatars' and owner_id=(select auth.uid())::text
) with check (
  bucket_id='customer-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text
);
drop policy if exists customer_avatar_delete_own on storage.objects;
create policy customer_avatar_delete_own on storage.objects for delete to authenticated using (
  bucket_id='customer-avatars' and owner_id=(select auth.uid())::text
);

create or replace function private.loyalty_tier_for_points(p_points integer) returns text
language sql stable security definer set search_path=public,private,pg_temp as $$
  select case
    when p_points >= s.platinum_threshold then 'PLATINUM'
    when p_points >= s.gold_threshold then 'GOLD'
    when p_points >= s.silver_threshold then 'SILVER'
    else 'MEMBER'
  end
  from public.loyalty_program_settings s where s.id=true
$$;
revoke all on function private.loyalty_tier_for_points(integer) from public,anon,authenticated;

create or replace function private.credit_referral_points(
  p_user_id uuid, p_points integer, p_reason text, p_referral_id uuid
) returns boolean
language plpgsql security definer set search_path=public,private,pg_temp as $$
declare v_inserted uuid; v_lifetime integer;
begin
  if p_points <= 0 then return false; end if;
  insert into public.customer_loyalty_ledger(user_id,referral_id,direction,points,reason,source)
  values(p_user_id,p_referral_id,'EARN',p_points,p_reason,'SYSTEM')
  on conflict do nothing returning id into v_inserted;
  if v_inserted is null then return false; end if;

  insert into public.customer_loyalty_accounts(user_id,points_balance,lifetime_points,referral_points_earned)
  values(p_user_id,p_points,p_points,p_points)
  on conflict(user_id) do update set
    points_balance=customer_loyalty_accounts.points_balance+excluded.points_balance,
    lifetime_points=customer_loyalty_accounts.lifetime_points+excluded.lifetime_points,
    referral_points_earned=customer_loyalty_accounts.referral_points_earned+excluded.referral_points_earned,
    updated_at=now()
  returning lifetime_points into v_lifetime;

  update public.customer_loyalty_accounts set tier=private.loyalty_tier_for_points(v_lifetime),updated_at=now() where user_id=p_user_id;
  return true;
end; $$;
revoke all on function private.credit_referral_points(uuid,integer,text,uuid) from public,anon,authenticated;

create or replace function public.get_or_create_customer_referral_code() returns text
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_uid uuid := auth.uid(); v_code text; v_try integer := 0;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select code into v_code from public.customer_referral_codes where user_id=v_uid and is_active;
  if v_code is not null then return v_code; end if;
  loop
    v_try := v_try + 1;
    v_code := upper(substr(encode(gen_random_bytes(8),'hex'),1,10));
    begin
      insert into public.customer_referral_codes(user_id,code) values(v_uid,v_code);
      return v_code;
    exception when unique_violation then
      if v_try >= 8 then raise exception 'REFERRAL_CODE_CREATE_FAILED'; end if;
    end;
  end loop;
end; $$;
revoke all on function public.get_or_create_customer_referral_code() from public,anon;
grant execute on function public.get_or_create_customer_referral_code() to authenticated;

create or replace function public.claim_customer_referral(p_code text) returns jsonb
language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare v_uid uuid := auth.uid(); v_inviter uuid; v_existing public.customer_referrals; v_created_at timestamptz;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_code is null or upper(trim(p_code)) !~ '^[A-Z0-9]{8,16}$' then raise exception 'INVALID_REFERRAL_CODE'; end if;
  select created_at into v_created_at from public.customer_profiles where user_id=v_uid and status='ACTIVE';
  if v_created_at is null then raise exception 'CUSTOMER_PROFILE_REQUIRED'; end if;
  if v_created_at < now() - interval '14 days' then raise exception 'REFERRAL_WINDOW_EXPIRED'; end if;
  if exists(select 1 from public.bookings where customer_user_id=v_uid and status='COMPLETED' and deleted_at is null) then raise exception 'EXISTING_CUSTOMER_NOT_ELIGIBLE'; end if;
  select user_id into v_inviter from public.customer_referral_codes where code=upper(trim(p_code)) and is_active;
  if v_inviter is null then raise exception 'REFERRAL_CODE_NOT_FOUND'; end if;
  if v_inviter=v_uid then raise exception 'SELF_REFERRAL_NOT_ALLOWED'; end if;
  select * into v_existing from public.customer_referrals where invitee_user_id=v_uid;
  if found then return jsonb_build_object('ok',true,'status',v_existing.status,'alreadyClaimed',true); end if;
  insert into public.customer_referrals(inviter_user_id,invitee_user_id,referral_code)
  values(v_inviter,v_uid,upper(trim(p_code))) returning * into v_existing;
  return jsonb_build_object('ok',true,'status',v_existing.status,'alreadyClaimed',false);
end; $$;
revoke all on function public.claim_customer_referral(text) from public,anon;
grant execute on function public.claim_customer_referral(text) to authenticated;

create or replace function private.reward_referral_on_first_rental() returns trigger
language plpgsql security definer set search_path=public,private,pg_temp as $$
declare v_ref public.customer_referrals; v_settings public.loyalty_program_settings; v_count integer; v_bonus integer;
begin
  if new.booking_type <> 'RENTAL' or new.status <> 'COMPLETED' or new.customer_user_id is null or new.deleted_at is not null then return new; end if;
  select * into v_ref from public.customer_referrals where invitee_user_id=new.customer_user_id and status='REGISTERED' for update skip locked;
  if not found then return new; end if;
  select * into v_settings from public.loyalty_program_settings where id=true;
  if not found or not v_settings.enabled then return new; end if;

  perform private.credit_referral_points(v_ref.inviter_user_id,v_settings.referral_inviter_points,'REFERRAL_FIRST_RENTAL_INVITER',v_ref.id);
  perform private.credit_referral_points(v_ref.invitee_user_id,v_settings.referral_invitee_points,'REFERRAL_FIRST_RENTAL_INVITEE',v_ref.id);

  update public.customer_referrals set status='REWARDED',qualified_booking_id=new.id,
    inviter_points_awarded=v_settings.referral_inviter_points,invitee_points_awarded=v_settings.referral_invitee_points,
    rewarded_at=now(),updated_at=now() where id=v_ref.id;

  update public.customer_loyalty_accounts set successful_referrals=successful_referrals+1,updated_at=now()
    where user_id=v_ref.inviter_user_id returning successful_referrals into v_count;

  v_bonus := case v_count when 3 then v_settings.referral_milestone_3_points when 5 then v_settings.referral_milestone_5_points when 10 then v_settings.referral_milestone_10_points else 0 end;
  if v_bonus > 0 then perform private.credit_referral_points(v_ref.inviter_user_id,v_bonus,'REFERRAL_MILESTONE_'||v_count::text,v_ref.id); end if;
  return new;
end; $$;
revoke all on function private.reward_referral_on_first_rental() from public,anon,authenticated;
drop trigger if exists bookings_referral_reward on public.bookings;
create trigger bookings_referral_reward after insert or update of status,customer_user_id on public.bookings
for each row execute function private.reward_referral_on_first_rental();

create or replace function public.customer_referral_summary() returns jsonb
language sql stable security definer set search_path=public,pg_temp as $$
  select jsonb_build_object(
    'code', c.code,
    'registered', count(r.id),
    'rewarded', count(r.id) filter (where r.status='REWARDED'),
    'pending', count(r.id) filter (where r.status='REGISTERED'),
    'pointsEarned', coalesce(a.referral_points_earned,0),
    'successfulReferrals', coalesce(a.successful_referrals,0)
  )
  from public.customer_referral_codes c
  left join public.customer_referrals r on r.inviter_user_id=c.user_id
  left join public.customer_loyalty_accounts a on a.user_id=c.user_id
  where c.user_id=auth.uid() and c.is_active
  group by c.code,a.referral_points_earned,a.successful_referrals
$$;
revoke all on function public.customer_referral_summary() from public,anon;
grant execute on function public.customer_referral_summary() to authenticated;