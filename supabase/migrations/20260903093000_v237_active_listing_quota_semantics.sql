create or replace function private.enforce_branch_listing_limit_v237()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_branch_id uuid;
  v_limit integer;
  v_existing bigint;
  v_old_counted boolean := false;
  v_new_counted boolean := false;
begin
  -- Subscription plans define listingLimit as an "aktif ilan" limit.
  -- Drafts and review queue entries must never consume a live-publication slot.
  v_new_counted := new.branch_id is not null
    and new.listing_origin = 'BRANCH'
    and new.publication_status = 'PUBLISHED';

  if tg_op = 'UPDATE' then
    v_old_counted := old.branch_id is not null
      and old.listing_origin = 'BRANCH'
      and old.publication_status = 'PUBLISHED';

    if v_old_counted and v_new_counted and old.branch_id = new.branch_id then
      return new;
    end if;
  end if;

  if not v_new_counted then
    return new;
  end if;

  v_branch_id := new.branch_id;

  -- Serialize publication-slot consumption for the branch so concurrent
  -- approvals cannot both pass the same quota check.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_branch_id::text, 237));

  v_limit := private.branch_listing_limit_v237(v_branch_id);
  if v_limit is null or v_limit < 1 then
    raise exception using errcode='42501', message='BRANCH_LISTING_LIMIT_UNAVAILABLE';
  end if;

  select
    (select count(*) from public.vehicles v
      where v.branch_id = v_branch_id
        and v.listing_origin = 'BRANCH'
        and v.publication_status = 'PUBLISHED')
    +
    (select count(*) from public.tours t
      where t.branch_id = v_branch_id
        and t.listing_origin = 'BRANCH'
        and t.publication_status = 'PUBLISHED')
  into v_existing;

  if v_existing >= v_limit then
    raise exception using errcode='23514', message='BRANCH_ACTIVE_LISTING_LIMIT_REACHED';
  end if;

  return new;
end;
$$;

comment on function private.enforce_branch_listing_limit_v237() is
  'Enforces the subscription listingLimit across PUBLISHED branch vehicles and tours only. Draft and review states do not consume active listing quota; publication is serialized per branch.';
