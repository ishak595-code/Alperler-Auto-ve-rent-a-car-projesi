-- V237 immutable product contract for the discretionary complimentary START plan.
-- START stays available to the entitlement engine so an assigned branch can operate,
-- but the plan itself is always free, admin-granted and limited to one active listing.

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.branch_subscription_plans'::regclass
      and conname = 'branch_start_complimentary_semantics_v237_ck'
  ) then
    alter table public.branch_subscription_plans
      add constraint branch_start_complimentary_semantics_v237_ck
      check (
        code <> 'START'
        or (
          monthly_fee = 0
          and entitlements @> '{"listingLimit":1,"adminGrantOnly":true}'::jsonb
        )
      ) not valid;
  end if;
end $$;

alter table public.branch_subscription_plans
  validate constraint branch_start_complimentary_semantics_v237_ck;
