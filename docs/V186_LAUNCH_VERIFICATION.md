# V186 Launch Verification Ledger

This file records the repository-side launch contract. Production observations must be re-checked immediately before merge and after deployment.

- Custom domain status: not assumed by the repository. A real custom domain is configured only after it is registered and connected.
- Current test/live-preview origin: the HTTPS Vercel deployment/request origin.
- Current source-of-truth branch after approval: `main`
- Supabase project: `alperler-auto-prod` (`hrztrgjvgdnaurejnsgs`)
- Edge deployment contract: `supabase/functions/deployment-manifest.v186.json`
- Portability invariant: `node scripts/check-portability-v186.mjs`
- Recovery procedure: `docs/PRODUCTION_RECOVERY_RUNBOOK_V186.md`
- Vercel serverless function budget: must remain within repository gate (currently 12/12)

Production/test cutover order for V186:

1. All PR workflows green on the exact head SHA.
2. Apply `v186_analytics_newsletter_admin_gateway` migration.
3. Verify service RPC permissions and read-only snapshots.
4. Deploy `analytics-admin-v186` and `newsletter-admin-read-v186` with `verify_jwt=true`.
5. Deploy the tested `newsletter-admin` source so production no longer carries stale/dead-domain email markup.
6. Verify replacement paths without destructive analytics purge or real newsletter campaign send.
7. Apply `v1861_analytics_newsletter_legacy_cutover`.
8. Verify old authenticated analytics RPC execution and direct newsletter table grants/policies are removed.
9. Re-run Supabase advisors.
10. Merge exact head, wait for Vercel success, then smoke-test the actual Vercel deployment origin and same-origin routes.
11. Do not set `PUBLIC_APP_URL`, `PUBLIC_SITE_URL`, payment domain allowlists, DNS or custom-domain Auth redirects until a real domain is registered and serving HTTPS.
12. When a custom domain is eventually purchased, follow the domain-cutover section in `PRODUCTION_RECOVERY_RUNBOOK_V186.md` without changing application architecture.
