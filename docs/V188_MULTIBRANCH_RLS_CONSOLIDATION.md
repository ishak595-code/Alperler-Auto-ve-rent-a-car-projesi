# V188 Multi-Branch RLS Policy Consolidation

## Purpose

V188 removes redundant permissive RLS policy evaluation while preserving the exact effective authorization union that production currently exposes.

PostgreSQL combines permissive policies for the same role/action with OR semantics. The production schema accumulated multiple authenticated SELECT policies as public, customer, branch and central-admin capabilities were added over time. That is functionally valid, but it creates avoidable policy evaluation work as the branch network and traffic grow.

V188 consolidates those OR branches into one authenticated SELECT policy per affected table. Where an `ALL` admin policy overlaps SELECT, V188 replaces it with explicit INSERT, UPDATE and DELETE policies so write authorization no longer creates a second SELECT path.

## Non-negotiable invariants

V188 must not:

- grant an authenticated user access to a row they could not already read
- hide a row from a user who could already read it
- weaken branch ownership checks
- weaken branch lifecycle or subscription checks
- expose inactive branches to the public
- expose unpublished vehicles or tours to normal customers
- expose inactive media or unpublished content to normal customers
- weaken customer self-ownership checks
- alter anonymous public-read semantics except to separate an existing mixed-role policy into equivalent anon/authenticated policies
- create any new `FOR ALL` policy

## Multi-branch core

The most important consolidated tables are:

- `branches`
- `vehicles`
- `tours`
- `catalog_media`
- `bookings`
- `branch_memberships`
- `branch_pricing_rules`
- `branch_setup_checklist`

For these tables, authenticated access remains the OR union of central administration, owning branch scope, public publication rules and customer self scope where applicable.

### Branches

Authenticated SELECT remains true when any of these is true:

1. the actor can manage the central team
2. the actor can manage that branch
3. the branch is active and publicly ACTIVE

Authenticated UPDATE remains true when either central team management is allowed or the actor manages the branch and the branch lifecycle permits operation. The write check still additionally requires an operable branch subscription for branch-member writes.

### Vehicles and tours

Authenticated SELECT remains true when any of these is true:

1. central content management is allowed
2. the actor manages the owning branch
3. the listing satisfies the public publication projection

The public projection still requires active content, PUBLISHED or due SCHEDULED status, and an active/public owning branch when branch-bound.

### Catalog media

Authenticated SELECT remains true for active public media, central content managers, or the scoped owner of branch/catalog media.

### Bookings

Authenticated SELECT remains true for central operations staff, the assigned fulfillment branch operator, or the owning customer when the booking is not deleted.

## Broader policy cleanup

The same equivalent-union consolidation is applied to content, customer and operations tables flagged by the Supabase multiple-permissive-policy advisor. Tables with `ALL` write policies are split into explicit writes when the `ALL` policy was the only reason SELECT overlapped another read policy.

## Explicitly not included

### Unused indexes

V188 does not drop indexes merely because the performance advisor currently reports them unused. The production project is young and low observation time is not sufficient evidence that an index is unnecessary. Foreign-key, lifecycle, audit, future branch-routing and operational indexes may be intentionally cold until those flows receive traffic.

Index removal requires workload evidence, query plans and a separate rollback-safe change.

### SECURITY DEFINER warnings

V188 does not revoke authenticated execution from public SECURITY DEFINER functions blindly. Several are intentional customer or branch self-service RPCs, and some helpers are referenced by RLS policies. Each must be audited by function body, caller contract and direct-RPC necessity before hardening. This remains a separate security phase.

### Realtime transport

V188 does not change Supabase Realtime. Realtime scale evolution is deliberately separated from RLS semantic changes so rollback and fault attribution stay clean.

## Rollout order

1. Run the V188 static policy-consolidation guard.
2. Run all repository security and regression gates.
3. Confirm the PR head is immutable and green.
4. Apply the committed V188 migration to production.
5. Verify target policy counts and names in `pg_policies`.
6. Run Supabase Security Advisor and Performance Advisor again.
7. Confirm the multiple permissive warnings targeted by V188 are gone.
8. Run public catalog/branch smoke checks and authenticated customer/admin regression paths.
9. Merge the exact tested source head only after production verification.

## Source of truth

Migration:

`supabase/migrations/20260826223000_v188_multibranch_rls_policy_consolidation.sql`

Static guard:

`scripts/check-v188-rls-policy-consolidation.mjs`
