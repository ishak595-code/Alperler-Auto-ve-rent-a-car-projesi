# Production Source of Truth

Last audited: 2026-08-15

## Canonical workflow

GitHub is the canonical source for this project.

1. Application, API, Supabase Edge Function and migration changes are written to a GitHub feature branch first.
2. GitHub Actions quality and security gates must pass on that exact commit.
3. Database DDL/data corrections that belong to the product are represented by versioned SQL migrations under `supabase/migrations/` before the work is considered complete.
4. Supabase production is a runtime target, not a separate source-code branch. Any emergency production database correction must immediately be reconciled back into a versioned GitHub migration.
5. Vercel is a deployment target connected to GitHub. Do not maintain Vercel-only source changes. A deploy is accepted only when it can be traced to a Git commit.
6. Secrets stay in provider environment/secret stores. They are never committed to GitHub.

## Current production architecture

- Frontend: Angular
- Public/server API: `api/`
- Database/Auth/Storage: Supabase project `alperler-auto-production`
- Edge Functions: `supabase/functions/`
- Database migrations: `supabase/migrations/`
- Deployment: GitHub-triggered Vercel deployment

## Media rules

The canonical vehicle/tour media path is the public Supabase Storage bucket `catalog-media` plus `public.catalog_media` metadata.

Current production policy:

- images: JPEG, PNG, WebP, AVIF
- video: MP4, WebM
- maximum object size: 50 MiB
- one active cover per vehicle/tour/blog entity
- every active media row belongs to exactly one parent
- sourced external media keeps source URL, source name, license, attribution and alt text

Legacy `vehicle-media` and `tour-media` buckets are image-only and must not be used by the modern admin media uploader.

## Admin bootstrap

Production may legitimately start with zero `auth.users` and zero `admin_users`. The first owner is created through the Admin Login > İlk Yönetici Kurulumu flow. The authenticated and email-confirmed primary owner then claims the owner row through the `claim-owner` Edge Function. Direct inserts into `auth.users` are not part of the supported setup path.

After owner bootstrap, the owner can invite admins/editors/support users, create staff profiles, create branches and assign people to branches, vehicles and tours through the admin panel.

## Release rule

Never merge a production-hardening PR only because the UI looks correct. Before merge verify, at minimum:

- GitHub quality gate success
- GitHub booking/integration security gate success
- Supabase security advisor has no unresolved security lints
- catalog media has no orphan parents or duplicate active covers
- homepage placements reference valid published entities
- production schema contains all migration-backed columns/constraints needed by the current code

