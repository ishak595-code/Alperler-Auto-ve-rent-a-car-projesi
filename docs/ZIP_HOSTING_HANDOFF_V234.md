# V234 ZIP and Non-Vercel Hosting Handoff

This document records the source-of-truth boundary for moving Alperler Rent A Car away from Vercel or handing the repository to another developer as a ZIP archive.

## What is versioned in Git

The repository contains the application source required to reconstruct the verified runtime:

- Angular customer and admin applications
- portable Node/Express runtime in `server.ts`
- same-origin API handlers under `api/`
- Supabase migrations under `supabase/migrations/`
- Supabase Edge Function source and deployment manifest under `supabase/functions/`
- PWA assets and service-worker source
- database/source/security/architecture verification scripts
- `.env.example` as the environment-variable contract
- Vercel configuration as one deployment adapter, not the only runtime
- Playwright release regressions for Android, iPhone/WebKit, landscape phone, tablet and desktop

Vercel is therefore a deployment target. It is not the source of truth for application code.

## What must never be stored in the ZIP or Git history

Production secrets and private runtime data are intentionally excluded:

- `SUPABASE_SERVICE_ROLE_KEY`
- payment provider merchant keys and salts
- SMTP and provider secrets
- private webhook secrets
- production customer/reservation/payment rows
- private uploaded documents

This is a security requirement, not a missing-source defect.

If the new host continues using the existing Supabase project, the live database and Storage content remain in Supabase. Configure the new host with the same authorized environment values through its secret manager.

If Supabase itself is also being moved, perform a dedicated database/Storage backup and restore. Do not commit a production database dump containing personal data to the repository.

## Node-capable host deployment

Use Node.js 22 or newer.

```bash
npm ci
npm run verify:handoff
npm run build
npm start
```

The target platform should run `npm run build` during deployment and `npm start` for the web process. The runtime listens on `PORT` and binds to `0.0.0.0`.

After start, verify:

```text
GET /health
```

Expected application identity:

```json
{"ok":true,"runtime":"node","service":"alperler-web"}
```

A static-file-only host is not sufficient for the full production application because customer/admin flows rely on same-origin `/api/*` handlers. Use a Node-capable host, a compatible serverless host, or reproduce those handlers with equivalent routing.

## Environment transfer

Copy `.env.example` and populate real values only in the target host's secret/environment settings.

At minimum, confirm the intended values for:

- `SUPABASE_PROJECT_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- public production origin variables after the real HTTPS domain is attached
- payment/provider secrets or the admin-managed Vault configuration
- mail/SMS/webhook credentials when those integrations are enabled

Do not copy values from screenshots or documentation. Use the authoritative provider/Supabase secret stores.

## V234 non-Vercel parity closure

The portable runtime now reproduces deployment behavior that was previously easy to miss when moving away from Vercel:

- `/api/contact-admin` maps to the protected contact admin gateway
- payment and partner API aliases remain same-origin
- `/catalog-media/*` resolves to the configured Supabase Storage project instead of relying on a Vercel-only rewrite
- PWA manifest, runtime environment, offline and service-worker cache/header behavior is preserved
- admin, branch-portal, tracking, checkout and API surfaces retain noindex/no-store protection
- security headers are kept aligned with the production deployment policy
- AI crawler blocking and social-preview routing remain available from the portable runtime

`SUPABASE_PROJECT_URL` is authoritative for portable catalog-media routing. This avoids pinning a future non-Vercel deployment to the current Vercel rewrite.

## Feedback/admin ownership

Customer feedback uses the same production management chain on every supported host:

1. customer opens the full-screen feedback modal;
2. submission goes to same-origin `/api/contact`;
3. the protected contact gateway persists to `contact_messages`;
4. `/admin/feedback` resolves to Operations > Messages;
5. the admin message screen reads the same source and manages status/internal notes through `/api/contact-admin` and the authenticated `contact-admin` Edge Function.

The customer and admin sides must not be split into separate mock/local stores.

## Certification before moving hosts

Run:

```bash
npm run verify:handoff
```

Then require the GitHub release workflow to pass the real browser matrix. A host move is not considered certified if only TypeScript/build succeeds but the Android/iPhone/tablet/desktop browser matrix is red.

After deployment, verify at least:

- `/`
- `/fleet`
- `/sales`
- `/tours`
- `/campaigns`
- `/branches`
- `/blog`
- `/contact`
- `/admin/login`
- `/health`
- one `/catalog-media/...` object
- feedback open/close behavior
- `/admin/feedback` with an authorized operations admin

Do not create a real payment or fake production reservation merely for a hosting smoke test.
