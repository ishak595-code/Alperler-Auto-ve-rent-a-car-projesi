# V208 Repository Governance

V208 hardens repository execution without changing product behavior.

## Canonical runtime ownership

The database remains the single source of truth. Public catalogue reads flow through canonical services. For tours, `CarService -> CatalogService` owns the public list source. `TourPublicDataV170Service` remains only as a compatibility adapter for the active V170 showcase and is forbidden from issuing Supabase/PostgREST requests itself.

Version suffixes are provenance markers, not deletion signals. A V-numbered file may remain active when a route, workflow or canonical owner still references it. Cleanup requires ownership proof before deletion.

## CI concurrency

The repository has many independent security and regression workflows. V208 adds two layers:

1. Native GitHub Actions concurrency on the most expensive current certification workflows, scoped by workflow and PR/ref so unrelated workflows never cancel each other.
2. A repository-level stale-run governor. On a same-repository pull request update, it cancels only queued/in-progress runs that belong to the same PR and an older head SHA. Fork pull requests are explicitly skipped.

The governor never cancels the current SHA and never uses `pull_request_target`.

## Required merge discipline

- Build and validate on the exact final PR head.
- Do not merge while any required final-head gate is red or still running.
- After merge, verify the squash/main SHA, main push CI and deployment status.
- Never weaken a gate merely to obtain green CI.

## Security boundaries

- Browser code must not expose service-role or provider secrets.
- Public Data API reads use explicit projections and RLS.
- Customer data remains owner-scoped.
- Branch/admin/finance mutations use authenticated RLS, RPC, Edge Functions or same-origin BFF boundaries according to sensitivity.
- `pull_request_target` and workflow `write-all` are prohibited by the V208 governance contract.

## Platform controls outside repository code

Two controls cannot be truthfully implemented by source code alone with the currently connected APIs:

- GitHub reports `main` branch protection as disabled. Repository branch protection/ruleset must be enabled at the GitHub platform layer when a write-capable administration API is available.
- Supabase Auth leaked-password protection remains a project Auth setting. It must be enabled at the Supabase platform layer when the connected management surface exposes that mutation.

These items must not be represented as fixed until the platforms themselves report them enabled.
