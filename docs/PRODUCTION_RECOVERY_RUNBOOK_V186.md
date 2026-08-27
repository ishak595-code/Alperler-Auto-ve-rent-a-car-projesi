# Alperler Rent A Car — Production Recovery Runbook V186

Baseline date: 2026-08-26

## Source of truth

The GitHub `main` branch is the authoritative application and infrastructure source. PostgreSQL changes must exist under `supabase/migrations/` and Supabase Edge Function source must exist under `supabase/functions/`. Do not create production-only SQL, policies, RPCs, or Edge code.

No custom production domain is assumed in source control. Until a real domain is registered and connected, the active Vercel deployment/request origin is authoritative for browser-visible URLs, robots, sitemap, social previews and same-origin payment security. Keep `PUBLIC_APP_URL`, `PUBLIC_SITE_URL` and `PAYMENT_ALLOWED_ORIGINS` blank in the repository template. When a real custom domain is later connected and serving HTTPS, set the hosting domain and the relevant platform/provider allowlists together without changing application code.

## Secrets

Never commit production credentials. Populate secrets only in the hosting provider and Supabase project settings. `.env.example` documents names, not secret values. Browser code may use the Supabase publishable key; it must never receive the service-role key or provider secrets.

## Database recovery

1. Provision the target Supabase/Postgres project.
2. Apply the committed migrations in repository order. Do not reconstruct schema manually from the production dashboard.
3. Confirm RLS, grants, constraints, triggers, and service-only RPC execution privileges after migration.
4. Restore business data from an approved database backup/export when performing disaster recovery. Repository migrations restore schema and security logic; they do not replace production data backups.
5. Run Supabase Security Advisor and Performance Advisor and record remaining intentional warnings before traffic cutover.

## Edge Function recovery

`supabase/functions/deployment-manifest.v186.json` is the deployment contract for function slugs and `verifyJwt` values. Deploy each source directory with the matching `verifyJwt` setting. A manifest value of `false` is intentional only for public/custom-auth gateway or webhook designs whose source performs its own security checks.

Retired functions are retained as HTTP 410 tombstones so old URLs cannot resurrect privileged behavior:

- `bootstrap-owner-once`
- `owner-bootstrap-once`
- `v109-vehicle-media-import`
- `v124-tour-media-import`

Never restore historical bootstrap or migration behavior into these slugs.

## Web application recovery

1. Configure server environment values from `.env.example`. Leave custom-origin fields blank unless the target hostname is already registered and serving HTTPS.
2. Install the exact lockfile dependency graph with `npm ci`.
3. Run `node scripts/check-portability-v186.mjs`.
4. Run dependency audit, lint, API TypeScript checks, Vercel function-budget check, and production build.
5. Deploy the tested Git commit only.
6. Verify the deployment status for that exact commit and then smoke-test the actual deployment origin, booking flows, admin login, public newsletter subscription, catalog, media, and same-origin admin gateways.

## Vercel test/pre-domain mode

1. Use the deployment URL supplied by Vercel as the active test origin.
2. Do not invent or reserve a fake canonical domain in source code or `.env.example`.
3. `VERCEL_URL` and `VERCEL_PROJECT_PRODUCTION_URL` are runtime fallbacks. Request-facing SEO endpoints prefer the actual HTTPS request origin.
4. Payment same-origin validation accepts the actual request origin and the Vercel deployment/production origins without requiring a custom domain.
5. Keep DNS/TLS and custom-domain Auth configuration out of the critical path until a domain is actually purchased.

## Future custom-domain cutover

1. Register the chosen domain first.
2. Add it to the production hosting project.
3. Configure the DNS records exactly as the hosting provider reports for that project; do not copy generic DNS values from another project.
4. Wait for the hosting provider to show the domain as configured and TLS certificate active.
5. Only then set `PUBLIC_APP_URL`, `PUBLIC_SITE_URL` and any additional `PAYMENT_ALLOWED_ORIGINS` values where required, and redeploy.
6. In Supabase Auth, set the Site URL to the canonical HTTPS origin and retain only intentional redirect URLs.
7. Verify both apex and `www` behavior and choose one canonical redirect direction.
8. Re-test CORS/origin-protected admin gateways, payment return URLs, robots, sitemap and social previews after the final hostname is active.

## Security launch checklist

- No browser service-role key or provider secret.
- No dead or unowned domain references.
- All privileged central admin traffic uses same-origin APIs and hardened Edge/service boundaries.
- Legacy privileged write paths are revoked only after replacement paths are live and verified.
- Owner bootstrap functions remain retired.
- GitHub branch/ruleset protection and repository visibility are reviewed at the account level.
- Supabase leaked-password protection and MFA/session policy are reviewed in Auth settings.
- Managed hosting WAF/bot controls are enabled where the account/plan supports them.
- Backups and restore procedures are verified outside the source repository.

## Do not call the system globally “secure” or “complete” solely because CI is green

CI proves repository contracts. Launch readiness also requires successful deployment, live endpoint verification and review of platform-level security settings that are not represented in source code. DNS/TLS and custom-domain Auth redirect verification become required only after a real custom domain is registered and connected.
