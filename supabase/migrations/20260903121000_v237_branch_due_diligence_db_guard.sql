-- V237 database-level branch due-diligence guard.
-- Edge validation remains the first line of defense, while these triggers ensure
-- privileged/service-role calls cannot approve or provision a new partner branch
-- without the same authoritative commercial verification fields.

create or replace function private.branch_partner_due_diligence_ready_v237(p_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.branch_partner_requests r
    where r.id = p_request_id
      and coalesce(length(btrim(r.current_business)), 0) >= 2
      and r.business_type in ('SOLE_PROPRIETORSHIP','LIMITED','JOINT_STOCK','COOPERATIVE','OTHER')
      and coalesce(length(btrim(r.tax_office)), 0) >= 2
      and r.tax_number ~ '^[0-9]{10,11}$'
      and coalesce(length(btrim(r.business_address)), 0) >= 10
      and r.accuracy_accepted_at is not null
      and r.privacy_accepted_at is not null
      and r.due_diligence_consent_at is not null
  );
$$;

revoke all on function private.branch_partner_due_diligence_ready_v237(uuid) from public, anon, authenticated;
grant execute on function private.branch_partner_due_diligence_ready_v237(uuid) to service_role;

create or replace function private.enforce_branch_partner_approval_due_diligence_v237()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'APPROVED'
     and (tg_op = 'INSERT' or old.status is distinct from 'APPROVED')
     and not private.branch_partner_due_diligence_ready_v237(new.id) then
    -- BEFORE INSERT/UPDATE cannot query the not-yet-written NEW row through the helper,
    -- so validate NEW directly when required.
    if coalesce(length(btrim(new.current_business)), 0) < 2
       or new.business_type not in ('SOLE_PROPRIETORSHIP','LIMITED','JOINT_STOCK','COOPERATIVE','OTHER')
       or coalesce(length(btrim(new.tax_office)), 0) < 2
       or new.tax_number is null or new.tax_number !~ '^[0-9]{10,11}$'
       or coalesce(length(btrim(new.business_address)), 0) < 10
       or new.accuracy_accepted_at is null
       or new.privacy_accepted_at is null
       or new.due_diligence_consent_at is null then
      raise exception using errcode='23514', message='BRANCH_DUE_DILIGENCE_REQUIRED';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists branch_partner_approval_due_diligence_v237 on public.branch_partner_requests;
create trigger branch_partner_approval_due_diligence_v237
before insert or update of status on public.branch_partner_requests
for each row execute function private.enforce_branch_partner_approval_due_diligence_v237();

create or replace function private.enforce_branch_provision_due_diligence_v237()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.partner_request_id is not null
     and not exists (
       select 1
       from public.branch_partner_requests r
       where r.id = new.partner_request_id
         and r.status = 'APPROVED'
         and coalesce(length(btrim(r.current_business)), 0) >= 2
         and r.business_type in ('SOLE_PROPRIETORSHIP','LIMITED','JOINT_STOCK','COOPERATIVE','OTHER')
         and coalesce(length(btrim(r.tax_office)), 0) >= 2
         and r.tax_number ~ '^[0-9]{10,11}$'
         and coalesce(length(btrim(r.business_address)), 0) >= 10
         and r.accuracy_accepted_at is not null
         and r.privacy_accepted_at is not null
         and r.due_diligence_consent_at is not null
     ) then
    raise exception using errcode='23514', message='BRANCH_DUE_DILIGENCE_REQUIRED';
  end if;
  return new;
end;
$$;

drop trigger if exists branch_provision_due_diligence_v237 on public.branches;
create trigger branch_provision_due_diligence_v237
before insert or update of partner_request_id on public.branches
for each row execute function private.enforce_branch_provision_due_diligence_v237();

comment on function private.branch_partner_due_diligence_ready_v237(uuid) is
  'Canonical server-side commercial due-diligence readiness predicate for branch partner onboarding.';
comment on function private.enforce_branch_partner_approval_due_diligence_v237() is
  'Blocks transitions into APPROVED unless commercial identity, tax, address and recorded consents are complete. Existing already-approved legacy records are not retroactively rewritten.';
comment on function private.enforce_branch_provision_due_diligence_v237() is
  'Blocks creation or reassignment of a partner branch unless its approved request satisfies V237 commercial due diligence.';
