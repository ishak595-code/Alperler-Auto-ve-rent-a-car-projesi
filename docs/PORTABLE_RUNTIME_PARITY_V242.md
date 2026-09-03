# V242 Portable Runtime Parity

V242 closes the remaining gap between the production Vercel adapter and the repository's generic Node/Express runtime.

## Source of truth

The repository is the application source of truth. Vercel is one deployment adapter. A Node-capable host must be able to reconstruct the same application behavior from the tracked source without copying production secrets into Git or a ZIP archive.

## Portable startup

Use Node.js 22 or newer:

```bash
npm ci
npm run verify:handoff
npm start
```

`server.ts` listens on `PORT` and binds to `0.0.0.0`. It loads local/host environment values through `dotenv/config` when the host does not inject them automatically.

## Environment boundary

Use `.env.example` as the contract. Store real values only in the target host's secret manager or Supabase secret stores. Never commit production secrets or private customer/payment data.

The portable runtime requires the same authoritative Supabase project configuration as the Vercel deployment, including `SUPABASE_PROJECT_URL`. `/catalog-media/*` is routed from that environment value instead of pinning the generic runtime to a Vercel-only rewrite.

## Security and cache parity

The generic Node runtime keeps the production security boundary aligned with `vercel.json`:

- HSTS, frame denial, MIME sniffing protection and referrer policy
- cross-domain policy denial, DNS prefetch hardening, COOP and origin-agent isolation
- the production Permissions-Policy and Content-Security-Policy
- noindex/no-store treatment for admin, branch portal, tracking, booking checkout and API surfaces
- no-cache handling for runtime environment, manifest, offline document and service worker assets
- catalog media cache semantics
- AI crawler blocking and social-preview routing

## Feedback and API ownership

Feedback stays synchronously mounted to prevent first-open lazy-load races, remains a true `100dvh` modal, locks background scrolling and submits only through same-origin `/api/contact`. Admin contact access remains protected through the existing same-origin API chain.

## Certification

V242 adds two mandatory checks:

- `npm run portability:runtime:v242` checks source-level parity and prevents configuration drift.
- `npm run portability:smoke:v242` boots the built app through the generic Node runtime and verifies `/health`, protected admin routing and `/catalog-media/*` behavior without Vercel.

Both are part of the handoff verification and release-readiness workflow. Device/browser release tests remain mandatory before merge.

## Legacy PR cleanup

PR #215 contained an earlier V234 implementation of these portability changes but diverged from later V237-V241 work. V242 ports only the still-relevant missing behavior onto current `main`; the stale branch must not be merged after V242 lands.
