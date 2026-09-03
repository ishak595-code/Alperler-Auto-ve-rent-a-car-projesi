# V244 Hosting Handoff and Clean Reconnect

This repository is the application source of truth. The web application must not depend on one Vercel project ID, one Vercel deployment URL or a committed `.vercel` directory.

## What lives in the repository

- Angular frontend source and production build configuration
- all same-origin API entrypoints under `api/`
- provider-neutral Node/Express runtime in `server.ts`
- Docker runtime in `Dockerfile`
- Supabase database migration history
- Supabase Edge Function source
- Edge Function deployment manifest
- PWA assets and service worker
- Vercel routing configuration as an optional hosting adapter
- environment variable names in `.env.example`
- regression and portability checks

Secret values are intentionally not stored in Git. They belong in the target host environment or Supabase Vault.

## Backend boundary

The application backend is Supabase, not Vercel. Supabase owns PostgreSQL, Auth, Storage and Edge Functions. Vercel or another web host owns only the web frontend and the same-origin BFF/API adapter.

Moving the web host does not require moving production data when the same Supabase project is retained.

## Generic Node deployment

A host that supports a persistent Node process can run the repository without Vercel Functions:

```bash
npm ci
npm run build
npm start
```

Required runtime: Node 22 or newer.

The health endpoint is:

```text
/health
```

Expected response is HTTP 200 with `ok: true`.

## Container deployment

The repository contains a complete `Dockerfile`:

```bash
docker build -t alperler-rent-a-car .
docker run --rm -p 3000:3000 --env-file .env alperler-rent-a-car
```

This path serves the Angular build and the same-origin API from the same container.

## Clean Vercel reconnect

When creating a fresh Vercel project:

1. Import `ishak595-code/Alperler-Auto-ve-rent-a-car-projesi`.
2. Use branch `main` for production.
3. Do not upload or restore an old `.vercel/project.json`.
4. Keep Node 22.
5. Use the repository `vercel.json`. It already defines `npm run build`, `dist`, security headers, SPA routing and API aliases.
6. Add environment variables from `.env.example` in Vercel Project Settings. Never paste secrets into source files.
7. Set `SUPABASE_PROJECT_URL` and `SUPABASE_PUBLISHABLE_KEY` to the intended Supabase project.
8. Set `SUPABASE_SERVICE_ROLE_KEY` only as a server-side environment secret. Never expose it to browser variables.
9. Set `APP_PUBLIC_ORIGIN` only after the final HTTPS domain is known. If browser and API share one origin, `APP_ALLOWED_ORIGINS` can stay blank.
10. Configure payment/SMTP/provider credentials only when those integrations are enabled.
11. Deploy the exact green `main` commit.

A clean first deployment must not depend on an old Vercel project or deployment URL.

## Required post-deploy API smoke checks

These checks do not create production reservations or payments:

- `/` returns HTTP 200.
- `/api/integrations/status` returns JSON, not an HTML error page or `FUNCTION_INVOCATION_FAILED`.
- `/api/partner?op=admin-core&view=operations` without an admin token returns an authentication error, not a function crash.
- `/api/bookings` GET without an admin token returns an authentication error, not a function crash.
- `/api/contact` with an unsupported GET returns the application method error, not a platform function error.
- `/robots.txt` returns text.
- `/sitemap.xml` returns XML.
- `/manifest.json`, `/service-worker.js` and `/offline.html` resolve.

After admin login, additionally verify:

- Kontrol Merkezi summary loads from the production Supabase snapshot.
- Rezervasyonlar opens and reads the production `bookings` source.
- Araç Değerleme Stüdyosu reads vehicle valuation requests.
- Bayilik Başvuruları reads `branch_partner_requests` and permits authorized review actions.
- Mesajlar reads contact/feedback records.
- Admin settings save to `site_config` and a fresh public read reflects the saved value.

## Customer smoke checks

- customer login and account restore work;
- text profile fields save independently of avatar upload;
- JPEG/PNG/WebP avatar upload writes to `customer-avatars` under the authenticated user's folder;
- a failed avatar upload does not discard an otherwise valid profile edit;
- referral/account sections load independently.

## Reservation verification

Do not create fake production bookings merely to test transport. Use a real controlled test request or dedicated test entity. A successful rental request must be written by `booking-gateway-v166`, receive a booking reference, and appear in Admin > Operasyonlar > Rezervasyonlar.

The browser must never bypass server-side pricing, availability, campaign, loyalty or booking validation by writing directly to the `bookings` table.

## Application/admin coverage

The admin operations center includes both major application streams:

- vehicle valuation/list-your-car requests
- branch/franchise partnership applications

The branch application panel owns review status, commercial/tax details, due-diligence acceptance, internal notes, approval and controlled branch provisioning.

## Certification before handoff

Run:

```bash
npm ci
npm run portability:host:v244
npm run verify:handoff
```

The V244 check verifies API entrypoint coverage, Node route parity, Vercel alias parity, environment contract, Docker runtime, Supabase Edge Function source/manifest references and admin application routing.

Do not declare the repository ready to reconnect until the relevant pull-request workflows are green.
