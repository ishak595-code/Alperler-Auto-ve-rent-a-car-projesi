# Alperler Auto production migration ledger

Production Supabase project: `alperler-auto-production`
Project ref: `hrztrgjvgdnaurejnsgs`
Region: `eu-central-1`
Ledger reconciled: 2026-08-15

The authoritative applied-state is the production Supabase migration ledger. Repository SQL is split deliberately:

- `supabase/migrations/`: active/version-controlled migration source used for normal forward development.
- `supabase/applied-history/`: archival SQL that production already received during iterative development but whose original source branch was not part of the final application merge history.

## Archived V40 production sequence

The exact source SQL from historical V40 is preserved in `supabase/applied-history/v40/`.

Production records include the following applied migration names, in order:

1. `v40_inventory_truth_and_initial_branch_v2`
2. `v40_homepage_placement_integrity`
3. `v40_vehicle_sourced_gallery_expansion`
4. `v40_owner_inventory_confirmation_cleanup`
5. `v40_catalog_media_free_plan_max_limits`
6. `v40_dynamic_catalog_media_policy`
7. `v40_tour_sourced_gallery_expansion_batch1`
8. `v40_lock_homepage_integrity_trigger_rpc`
9. `v40_zeynel_bey_official_source_location`
10. `v40_tour_sourced_gallery_expansion_batch2`
11. `v40_catalog_media_cover_sync`
12. `v40_catalog_media_capacity_and_single_cover`
13. `v40_booking_hour_precision_and_overlap_guard_schema`
14. `v40_catalog_media_policy_public_read`
15. `v40_passat_secondary_media_exact_match`
16. `v40_sale_vehicle_description_quality`
17. `v40_vehicle_cover_color_alignment`
18. `v40_vehicle_filter_projection_bridge`
19. `v40_amarok_cover_color_alignment`
20. `v40_second_branch_draft`
21. `v40_yesiltas_verified_nearby_media`
22. `v40_zeynel_media_verification_guard`

The first archived filename is `202608150001_v40_inventory_truth_and_initial_branch.sql` while the production migration was finalized as `v40_inventory_truth_and_initial_branch_v2`. This difference is intentional and documented rather than hidden.

## Later production milestones

Production also records the merged hardening chain after V40, including:

- V41 catalog quality, audit and media hardening
- V43 truthful tour media
- V48 verified media expansion
- V50 vehicle media accuracy
- V51 Oremar/tour media scope
- V52 publication quality and trigger consolidation
- V53 catalog-media integrity RPC hardening
- V58 visitor analytics foundation, ingestion, admin read models, conversion accuracy, RPC hardening, event idempotency and automatic retention

The V58 analytics retention job is maintained in production and is part of the live schema contract.

## Recovery procedure

1. Never replay `applied-history` on an existing production project.
2. Export or inspect the production Supabase migration ledger before recovery.
3. Reconstruct a fresh environment in chronological order using an explicitly reviewed recovery plan, not by bulk-running every SQL file.
4. Validate RLS, functions, triggers, indexes, storage policies and Edge Functions before importing customer data.
5. Run security/performance advisors and application CI before promotion.

This ledger is documentation, not an executable migration.
