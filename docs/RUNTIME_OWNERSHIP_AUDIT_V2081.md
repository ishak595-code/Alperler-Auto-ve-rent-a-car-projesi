# V208.1 Runtime Ownership Audit

This audit prevents repository cleanup from relying on filenames, version suffixes or guesswork.

It builds a static browser-runtime import graph across `src/**/*.{ts,tsx,mts,cts}` plus the root Angular bootstrap entrypoint `index.tsx`. It follows static imports, re-exports and literal dynamic imports. A service under `src/services/**/*.service.ts` with zero inbound imports from that browser-runtime graph is reported as an orphan candidate.

An orphan candidate is not deleted solely because the audit prints it. Before deletion, verify that the file is not a route owner, bootstrap import, dynamic import target, provider token implementation, compatibility boundary or CI-enforced runtime contract. If unique behavior remains, move that behavior to the canonical owner first.

V208.1 used that process to classify four initial candidates:

- `pwa-runtime.service.ts` is active and retained because root `index.tsx` imports and executes `startPwaRuntime()`.
- `live-content-sync.service.ts` was unused and superseded by the active `PublicContentRefreshCoordinatorService`.
- `tour-availability.service.ts` was unused and superseded by the active `TourDemandV170Service` on the tour detail runtime.
- `accessibility-runtime.service.ts` was never bootstrapped or injected; current accessibility behavior is enforced at component/native-control ownership plus the TalkBack/a11y regression gates.

The three proven dead services were removed. The audit is now part of `npm run verify:handoff`, so future zero-owner service files fail certification instead of silently accumulating.

The audit also reports unresolved relative TypeScript imports so cleanup cannot silently leave broken graph edges.

Version suffixes remain provenance markers, not deletion signals.
