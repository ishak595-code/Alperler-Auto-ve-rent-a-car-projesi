# Supabase Production Migration Ledger

Project: `alperler-auto-production` (`hrztrgjvgdnaurejnsgs`)

Last audited: 2026-08-15

This file records the relationship between the live Supabase migration history and the canonical GitHub migration set. The live project was hardened iteratively during V36-V40, so some early live migration names were applied as smaller operational steps and were later consolidated into larger idempotent repository migrations. Do not delete or rewrite `supabase_migrations.schema_migrations` by hand.

## Canonical repository sequence

The source of truth for rebuilding a fresh environment is the ordered SQL set under `supabase/migrations/`.

Important consolidated mappings:

- live `alperler_core_schema_v1` -> repo `202608140001_alperler_core_schema_v1.sql`
- live `alperler_rls_policies_v1` -> repo `202608140002_alperler_rls_policies_v1.sql`
- live `alperler_storage_v1`, `harden_security_functions_v1`, `performance_hardening_v1` -> consolidated repo `202608140003_storage_security_performance_v1.sql`
- live gateway/rate-limit and booking/branch alignment steps -> repo V36 migrations `202608140004` through `202608140016`
- live `catalog_media_homepage_staff_v1` -> repo `202608140017_catalog_media_homepage_staff_v1.sql`
- live `admin_owner_protection_v1` -> repo `202608140018_admin_owner_protection_v1.sql`
- live campaign/media hardening -> repo `202608140019` through `202608140021`
- live V37/V38/V39 provenance, publication, media and RBAC work -> corresponding repo migrations `202608140022` onward
- live V40 inventory/homepage/media/booking hardening -> repo V40 migrations `202608150001` onward

## Historical live-only operational records

The live migration ledger also contains short-lived QA/operational steps such as temporary HTTP-extension enable/disable migrations. These are historical deployment records and are not an instruction to reproduce temporary QA state in a fresh environment. The final intended state is represented by the canonical repository migrations.

Observed examples:

- `qa_enable_http_extension`
- `qa_disable_http_extension`
- `qa_enable_http_extension_2`

## Current V40 production checks

At the 2026-08-15 audit:

- 11 vehicles existed, all active/published and assigned to a branch
- 13 tours existed, all active/published and assigned to a branch
- 43 active catalog-media rows existed
- no orphan catalog-media parent was found
- no entity had multiple active cover rows
- no active homepage placement referenced a missing entity
- five database-driven homepage sections existed
- one active branch existed
- zero Supabase Auth users, zero admin users and zero staff profiles existed, so owner bootstrap had not yet been performed
- Supabase security advisor returned no security lints

## Reconciliation rule

If a production database change is made outside a GitHub migration because of an emergency:

1. capture the final intended SQL state,
2. add an idempotent reconciliation migration to GitHub,
3. run CI/security checks,
4. document the live migration name here if its identifier differs from the repository file,
5. never modify migration history merely to make names look identical.
