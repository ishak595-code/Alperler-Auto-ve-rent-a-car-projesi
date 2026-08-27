# V196 Dependency Governance

V196 keeps routine dependency maintenance automated without allowing isolated major-version drift into production.

## Rules

- npm semantic-major version updates are not opened automatically. Framework/runtime majors are coordinated migrations with their own regression phase.
- Angular runtime and build packages must remain on one major version.
- `tailwindcss` and `@tailwindcss/postcss` must use the same exact version and are grouped together for patch/minor maintenance.
- `@types/node` stays on major 22 while CI/runtime targets Node 22.
- PDFKit 0.x minor updates are not automatic because upstream 0.x minors may contain documented breaking changes. Patch maintenance remains eligible.
- `actions/checkout`, `actions/setup-node` and `actions/upload-artifact` are grouped for GitHub Actions maintenance.

## Current production posture

The application remains on the already-tested dependency set unless a coordinated migration passes the full CI/security suite. Dependency freshness must not override runtime compatibility or production stability.
