-- v2.18 production parity: preserve the verified referral identity trigger function
-- with a row type that matches public.partner_identity_snapshots exactly.
-- This migration version already exists in production. Keeping the SQL in source
-- prevents migration-ledger drift between the repository and the deployed database.

begin;

create or replace function private.enforce_verified_referral_identity()
returns trigger
language plpgsql
set search_path to 'pg_catalog', 'public', 'private', 'extensions'
as $function$
declare
  v_identity public.partner_identity_snapshots%rowtype;
begin
  if new.affiliate_id is null then
    return new;
  end if;

  -- Staff-managed affiliate attribution must only reference verified bank-matched records.
  new.status := 'verified';
  new.identity_snapshot_id := private.ensure_partner_identity_snapshot(new.affiliate_id);

  select *
    into v_identity
    from public.partner_identity_snapshots
   where id = new.identity_snapshot_id;

  if v_identity.id is null or v_identity.bank_match_status <> 'verified' then
    raise exception 'Verified partner identity is required for affiliate referral attribution.';
  end if;

  new.partner_name_snapshot := v_identity.partner_name;
  new.partner_iban_snapshot := v_identity.bank_iban;
  new.identity_verified_at := v_identity.verified_at;
  return new;
end;
$function$;

commit;
