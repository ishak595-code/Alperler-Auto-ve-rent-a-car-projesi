# Alperler Rent A Car Production Architecture V164

This document is the canonical engineering map for the production system. It exists so a future developer can locate data ownership, security boundaries and deployment units without reverse-engineering the application.

## 1. Source of truth

The GitHub repository is the source of truth for application code, database migrations, Edge Functions, Vercel configuration and release gates. Supabase PostgreSQL is the source of truth for live business data. Browser/session storage is never the source of truth for bookings, applications, vehicles, customers, branch membership or admin permissions.

Production business records must survive browser refreshes, device changes and deployments because they are persisted in Supabase.

## 2. Customer and reservation flow

Customer UI -> same-origin Vercel `/api/bookings` boundary -> Supabase `booking-gateway` -> PostgreSQL `bookings`.

A customer rental submission is stored as `PENDING`. `PENDING` is a request and does not exclusively block inventory. An authorized admin approves through the atomic admin booking action. Only `APPROVED` rental rows participate in the database overlap exclusion that blocks the vehicle. This prevents two admins from approving overlapping rentals at the same time while allowing multiple customers to request the same period before review.

Canonical reservation timestamps are `timestamptz`. Pickup branch IANA timezone is the wall-clock interpretation boundary. Branch timezone belongs to `branches.timezone`, not to the customer's phone timezone.

Key files:
- `src/services/booking.service.ts`
- `src/pages/booking-checkout.component.ts`
- `api/bookings.ts`
- `supabase/functions/booking-gateway/index.ts`
- `supabase/functions/booking-admin-actions/index.ts`
- V163 reservation migrations under `supabase/migrations/`

## 3. Vehicles and public catalog

`vehicles` is the canonical inventory table. Rental and sale listings are differentiated by category and remain linked to `branch_id`. Public catalog projection is database-backed. A branch-created listing remains owned by its branch and follows publication moderation and central pricing rules.

Public branch pages are under `/branches/:slug` and load branch-specific rental vehicles, sale vehicles and tours through the branch network API. Do not duplicate branch inventory into static frontend arrays.

Key files:
- `src/services/car.service.ts`
- `src/pages/branch-detail.component.ts`
- `api/branch-network.ts`
- `src/services/branch-portal.service.ts`

## 4. Branch application lifecycle

Public `/branch-partner` -> same-origin `/api/partner?op=branch-partner` -> `branch-partner-v164` -> `branch_partner_requests`.

Province and district are canonical codes, not free text. The form reads the persisted Türkiye directory through `/api/partner?op=geo-directory`. The directory is stored in `geo_provinces` and `geo_districts` and synchronized from the pinned Open Admin Data Türkiye administrative dataset with validation and checksum metadata.

Application states:
`NEW -> REVIEWING/CONTACTED/DUE_DILIGENCE -> APPROVED or REJECTED/CLOSED`.

Approval alone does not create public branch rights. Provisioning uses the existing `provision_branch_partner_request` server RPC, then V164 links the approved applicant email to an `auth.users` UUID and a `branch_memberships` `BRANCH_OWNER` row. If the user does not yet exist, Supabase Auth sends an invitation to `/branch-portal/login`. Invite delivery/link state is persisted in `branch_access_invites`.

No admin or branch permission is derived solely from an email string. Runtime authorization resolves authenticated UUID membership/RBAC.

Key files:
- `src/pages/branch-partner-v164.component.ts`
- `src/services/branch-partner.service.ts`
- `src/services/geo-directory.service.ts`
- `api/partner.ts`
- `supabase/functions/branch-partner-v164/index.ts`
- `supabase/functions/geo-directory/index.ts`
- `20260825132000_v164_branch_geography_access.sql`
- `20260825132100_v164_geo_sync_rpc.sql`

## 5. Branch portal and tenancy

Authenticated branch users use `/branch-portal`. `branch_memberships` binds an auth UUID to a branch and a role. RLS and `can_manage_branch`-style database helpers are the security boundary; hiding UI is not authorization.

A branch user can work only with its permitted branch. Branch vehicles carry `branch_id`. Branch bookings are routed by `fulfillment_branch_id`. Branch pricing, policy acceptance and setup checklist are branch-scoped database records.

The portal supports rental and sale vehicle submission. New branch listings use draft/review publication states and must satisfy central moderation/price rules before becoming public.

Key files:
- `src/pages/branch-portal-login.component.ts`
- `src/pages/branch-portal.component.ts`
- `src/services/branch-portal-auth.service.ts`
- `src/services/branch-portal.service.ts`
- V72-V79 branch multitenancy migrations

## 6. Admin architecture

Admin routes use Angular guards for UX and server/database RBAC for actual authorization. Canonical admin identity is `auth.users.id` -> `admin_users.user_id`. Email is profile/contact metadata, not the permission key.

Admin modules manage catalog, reservations, customers, branch applications, branches, network rules, pricing, team and audit data. Changes that affect live business state must persist to Supabase, not component-local state.

## 7. Customer document vault

Customer identity and driving documents use the private `customer-documents` Storage bucket. Metadata is stored in `customer_documents`. Server-side upload validation checks allowed MIME/size/path and file signatures. Signed URLs are short-lived. Do not make customer document buckets public.

## 8. Security boundaries

- Same-origin Vercel BFF protects browser-facing mutation routes.
- Supabase RLS protects table-level data access.
- Service-role keys exist only on server/Edge runtime.
- Public submissions use rate limits and idempotency.
- Admin/branch operations verify authenticated UUID and RBAC/membership.
- CSP, HSTS, no-store critical routes, request correlation IDs and body limits are release requirements.
- PWA cache must never become authoritative for live availability, prices, bookings, auth or admin data.

## 9. Migration and portability rule

Every schema/function/policy/index change must be represented by a uniquely named SQL file under `supabase/migrations/`. Do not perform undocumented production-only DDL. Edge Function source must live under `supabase/functions/`. Vercel runtime configuration lives in `vercel.json`.

To move the system to another environment:
1. clone the repository;
2. create a Supabase project;
3. apply migrations in order;
4. deploy Edge Functions from `supabase/functions`;
5. configure environment variables/secrets;
6. deploy the Angular/Vercel application;
7. run all GitHub release gates;
8. verify RLS/advisors and smoke-test booking, branch application, admin and portal flows.

## 10. Release invariants

A release must not merge if it breaks any of these:
- TalkBack/VoiceOver date controls and accessible dialogs;
- PWA runtime/offline behavior;
- TypeScript/API/Deno checks;
- booking security and atomic approval;
- customer document isolation;
- UUID admin/branch authorization;
- database-backed branch application/geography;
- production build.
