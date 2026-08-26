# V186 Launch Verification Ledger

This file records the repository-side launch contract. Production observations must be re-checked immediately before merge and after deployment.

- Canonical domain target: `https://alperlerrentaacar.com`
- Current source-of-truth branch after approval: `main`
- Supabase project: `alperler-auto-prod` (`hrztrgjvgdnaurejnsgs`)
- Edge deployment contract: `supabase/functions/deployment-manifest.v186.json`
- Portability invariant: `node scripts/check-portability-v186.mjs`
- Recovery procedure: `docs/PRODUCTION_RECOVERY_RUNBOOK_V186.md`
- Vercel serverless function budget: must remain within repository gate (currently 12/12)

Production cutover order for V186:

1. All PR workflows green on the exact head SHA.
2. Apply `v186_analytics_newsletter_admin_gateway` migration.
3. Verify service RPC permissions and read-only snapshots.
4. Deploy `analytics-admin-v186` and `newsletter-admin-read-v186` with `verify_jwt=true`.
5. Deploy the tested `newsletter-admin` source so production no longer carries stale/dead-domain email markup.
6. Verify replacement paths without destructive analytics purge or real newsletter campaign send.
7. Apply `v1861_analytics_newsletter_legacy_cutover`.
8. Verify old authenticated analytics RPC execution and direct newsletter table grants/policies are removed.
9. Re-run Supabase advisors.
10. Merge exact head, wait for Vercel success, then smoke-test the public domain and same-origin routes.
