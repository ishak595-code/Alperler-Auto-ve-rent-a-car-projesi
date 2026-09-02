# V206 Deployment and Portability Runbook

This runbook is for moving the repository to another developer, GitHub account, Vercel account, deployment host or fresh Supabase environment without introducing hidden hostname or credential coupling.

It complements `docs/PRODUCTION_RECOVERY_RUNBOOK_V186.md`.

## 1. Clean-room prerequisites

Required locally:

- Node.js 22
- npm
- Git
- access to the target deployment platform
- access to the intended Supabase project

Install from the lockfile:

```bash
npm ci
```

Do not begin by running `npm update`. Reproduce the verified dependency graph first.

## 2. Environment contract

Start from:

```bash
cp .env.example .env
```

Populate values outside Git history.

Important separation:

Public/browser-safe:

- `SUPABASE_PROJECT_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- public origin values when an actual verified production domain exists

Server-only:

- `SUPABASE_SERVICE_ROLE_KEY`
- payment merchant keys/salts
- SMTP credentials
- provider API secrets
- Twilio credentials
- webhook secrets

Never prefix server secrets with browser-public environment conventions.

## 3. Production origin policy

The repository must remain portable between deployment hosts.

Rules:

- do not hardcode a temporary `*.vercel.app` URL in source or docs;
- do not commit an unowned custom domain;
- keep `PUBLIC_APP_URL`, `PUBLIC_SITE_URL` and `PAYMENT_ALLOWED_ORIGINS` blank in the template;
- populate production origin settings only after the actual HTTPS domain is attached and serving this application;
- same-origin runtime request resolution remains authoritative where implemented.

`api/_lib/public-origin.ts` resolves public origin using the request and deployment fallbacks. SEO endpoints and payment-origin checks rely on this portability contract.

## 4. Supabase database provisioning

For a fresh Supabase project:

1. create/select the target project;
2. apply repository migrations in order;
3. verify RLS/grants/functions after migration;
4. generate/check TypeScript types if schema changes are introduced;
5. configure Auth redirect/site URLs for the final domain;
6. configure required Edge Function secrets;
7. deploy Edge Functions according to the manifest;
8. run security/performance advisors.

Do not manually recreate tables from memory. The migration history is the source of truth.

## 5. Edge Function deployment

The intended source inventory is:

`supabase/functions/deployment-manifest.v186.json`

The manifest records function slugs and JWT expectations. `scripts/check-portability-v186.mjs` verifies source/manifest parity and retired security-sensitive functions.

When deploying to a new Supabase project:

- preserve `verifyJwt` intent;
- configure function secrets in the target project, not source files;
- verify same-origin/BFF expectations;
- test both authenticated and unauthenticated failure paths where relevant.

## 6. Auth configuration

After moving domains, verify:

- Site URL points to the final production origin;
- allowed redirect URLs include the real account/auth callback flows;
- email provider settings are correct;
- password strength settings are intentional;
- leaked-password protection is enabled when the plan supports it;
- MFA/passkey settings are changed only through an explicit product/security decision.

Do not assume database migrations configure hosted Auth project settings.

## 7. Deployment platform configuration

For Vercel or a compatible serverless host:

- production build command: `npm run build`
- Node runtime: 22
- copy all required environment variables from the secure environment, not from Git history;
- preserve same-origin `/api/*` behavior;
- preserve SPA routing/rewrites from `vercel.json` or implement equivalent host routing;
- preserve PWA static asset headers/service-worker scope behavior;
- preserve hashed production assets.

For a generic Node/Express host, VPS, container platform or a hosting service that can run a persistent Node process, the repository contains the portable runtime in `server.ts`:

```bash
npm ci
npm run build
npm start
```

The host must provide Node.js 22, the required environment variables and a `PORT` value when its platform requires one. `server.ts` serves the built Angular application, the SPA fallback and the same-origin `/api/*` routes, so these application APIs are not dependent on Vercel Functions when deployed through this runtime.

A ZIP/source export should contain the repository source, `package-lock.json`, `server.ts`, `api/`, `supabase/migrations/`, `supabase/functions/`, `.env.example` and the documentation. It must not contain a real `.env`, `.vercel/project.json`, service-role key or provider credentials. If the new host keeps using the existing Supabase project, live database/Auth/Storage data stays in Supabase and does not need to be embedded in the ZIP. If the backend is also being moved, migrate database data, Auth configuration and Storage separately using the Supabase recovery/migration procedure.

If moving away from Vercel, reproduce the behavioral contract, not Vercel-specific implementation details blindly.

## 8. PWA contract after move

Verify:

- `/manifest.json` is served with the correct content type;
- `/service-worker.js` is not stale-cached and can own root scope;
- `/offline.html` remains available and noindexed;
- hashed JS/CSS assets are served correctly;
- API and business data remain network-authoritative;
- installed mode safe areas work on Android/iOS-like standalone displays.

Run:

```bash
npm run pwa:installability
```

Then wait for/execute the browser PWA regression workflow.

## 9. Design assets after move

Repository-owned fallbacks under `public/brand/` must deploy with the application.

Admin-configured remote media remains authoritative when configured. Do not replace configured hero/logo content with repository fallbacks simply because the application moved hosts.

The visual CSS stack is host-independent and is documented in `docs/DESIGN_SYSTEM_3D_V206.md`.

## 10. Local certification before deployment

Run:

```bash
npm run verify:handoff
```

This must pass before considering the source tree portable.

## 11. Production smoke checklist

After deployment, verify at minimum:

Public navigation:

- `/`
- `/fleet`
- `/sales`
- `/tours`
- `/campaigns`
- `/branches`
- `/blog`
- `/list-your-car`
- `/contact`
- `/about`

Device behavior:

- Android phone portrait
- iPhone/WebKit portrait
- short landscape phone
- iPad Mini/tablet
- desktop 1440px

Critical behavior:

- homepage planner visible and early on phone;
- tablet/desktop do not show the phone bottom dock;
- catalogue lists load live content;
- one rental, sale, tour and blog detail resolves;
- images/media resolve;
- feedback opens on the first interaction as a stable full-screen dialog and closes by its close control and Escape;
- admin login preserves intended return URL;
- customer login/account route works;
- PWA assets resolve;
- no horizontal overflow;
- no unexpected 404 shell on canonical routes.

Avoid submitting real production reservations/payment requests merely for a smoke test unless a dedicated test entity/process exists.

## 12. Database/live-data verification

Confirm the target project contains expected published/active content and that frontend services point to that target project.

Check:

- homepage sections/placements;
- navigation items;
- vehicles;
- tours;
- campaigns;
- branches;
- blog content;
- site configuration;
- relevant realtime/public access policies.

Do not seed fake production content just to make UI tests pass.

## 13. Security certification

Before production sign-off:

- run repository security gates;
- run CodeQL through GitHub Actions;
- run Supabase Security Advisor;
- review Auth leaked-password protection;
- verify service-role key is server-only;
- verify payment/provider secrets are server-only;
- verify `main` is protected/ruleset-controlled in GitHub;
- verify no temporary deployment host is hardcoded.

See `docs/PLATFORM_HARDENING_V206.md` for account-level items.

## 14. Rollback

A source rollback should use a known green commit or deployment, not manual production edits.

Database rollback requires special care. Do not reverse a production migration by deleting migration history. Add a forward corrective migration when appropriate.

For a failed deployment move:

1. preserve the database;
2. restore the last known green application deployment;
3. restore environment configuration;
4. inspect logs and failing quality gate;
5. fix in a new branch/PR;
6. redeploy from a green commit.

## 15. Handoff package

A developer receiving the project should receive access to:

- this Git repository;
- target deployment project;
- target Supabase project;
- DNS/domain account where applicable;
- payment/provider dashboards where applicable;
- secure secret-transfer channel.

Secrets must not be embedded into a ZIP of the repository or pasted into documentation.

The code repository itself should be sufficient to understand architecture. Operational credentials are a separate access-management concern.
