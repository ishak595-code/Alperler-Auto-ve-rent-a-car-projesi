# V208.1 Runtime Ownership Audit

This audit prevents repository cleanup from relying on filenames, version suffixes or guesswork.

It builds a static import graph across `src/**/*.ts`, including static imports, re-exports and literal dynamic imports. A service under `src/services/**/*.service.ts` with zero inbound imports from the runtime source tree is reported as an orphan candidate.

An orphan candidate is not deleted solely because the audit prints it. Before deletion, verify that the file is not a route owner, dynamic import target, provider token implementation, compatibility boundary or CI-enforced runtime contract. If unique behavior remains, move that behavior to the canonical owner first.

The audit also reports unresolved relative TypeScript imports so cleanup cannot silently leave broken graph edges.

Version suffixes remain provenance markers, not deletion signals.
