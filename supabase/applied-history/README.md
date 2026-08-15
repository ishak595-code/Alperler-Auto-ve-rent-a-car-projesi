# Applied production migration history

This directory is an audit and disaster-recovery archive. SQL files here have already been represented in the production Supabase migration history and MUST NOT be treated as pending migrations.

## Rules

- Active, automatically applicable migrations belong only in `supabase/migrations/`.
- Files under `supabase/applied-history/` are archival source SQL. Do not run them blindly against production.
- Some iterative development migrations were applied to production with Supabase-generated remote version numbers that differ from the source filename timestamps kept here.
- Before any recovery or rebuild, compare this archive, `supabase/migrations/`, and the production `supabase_migrations.schema_migrations` ledger.
- Production project for this repository: `alperler-auto-production` (`hrztrgjvgdnaurejnsgs`). Never use the unrelated legacy Supabase project as a migration target.

## Why V40 is archived here

The V40 production SQL was applied during iterative hardening while its source lived on the historical `feature/v40-media-admin-production` branch. Later application code was reworked and merged through newer branches, so those SQL files were not present on current `main`. The exact Git blobs are preserved here without placing them back into the active migration queue.

The archive preserves provenance and recovery material without creating a double-apply risk.
