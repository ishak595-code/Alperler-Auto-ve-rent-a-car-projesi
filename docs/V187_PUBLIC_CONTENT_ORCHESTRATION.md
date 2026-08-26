# V187 Public Content Orchestration

## Goal

V187 removes independent periodic fallback polling from the public catalog, campaigns, branch directory and homepage layout domains without collapsing those domains into one monolithic service.

The architecture keeps domain ownership separate and centralizes only browser lifecycle scheduling.

## Domain boundaries

The following services remain independently responsible for their own state, validation and transport semantics:

- `CarService`: public vehicles, tours, blog, FAQ, site configuration and catalog media hydration.
- `CampaignService`: published campaigns, campaign clock and public social proof.
- `BranchService`: public active branch directory and pickup/return branch projection.
- `HomepageLayoutService`: enabled homepage sections, placements and time-window evaluation.

`PublicContentRefreshCoordinatorService` does not own or cache business records. It only decides when each public domain should reconcile its own state.

## Scheduling contract

- One recursive browser `setTimeout` scheduler owns periodic fallback reconciliation.
- Catalog, campaign and homepage layout reconciliation use a 60 second cadence.
- Public branch directory reconciliation uses a 5 minute cadence to avoid unnecessary branch API load.
- Cadences receive small client-side jitter to reduce synchronized request spikes as traffic grows.
- A failed domain uses bounded exponential retry while other domains continue through `Promise.allSettled`.
- A refresh cycle cannot overlap itself.
- Hidden tabs pause scheduled polling.
- Offline browsers pause scheduled polling.
- Returning to a visible tab forces immediate reconciliation.
- Returning online forces immediate reconciliation.

## Realtime remains primary

Supabase Realtime remains event-driven and domain services retain their short debounce timers for database change bursts. Those timers are not periodic polling. They isolate refresh behavior by domain and prevent a burst of database events from creating repeated network requests.

The periodic coordinator is a recovery and reconciliation layer for missed events, stale browser sessions and transient realtime disconnects.

For future high-scale deployments, the public realtime contract should be able to migrate from Postgres Changes toward Supabase Broadcast without changing the public methods exposed by the four domain services.

## Multi-branch isolation invariant

The global coordinator is PUBLIC ONLY.

It may refresh the public active branch directory, but it must never load or cache:

- branch owner/operator private records
- branch portal sessions
- branch-specific private inventory drafts
- customer documents
- reservations not intended for public display
- branch finance, subscription, settlement or audit data
- admin-only lifecycle or moderation state

Authentication alone is not tenant isolation. Any future branch-specific private coordinator must be scoped by authenticated branch identity and enforced by server-side authorization/RLS. Private branch data must never be placed in a shared global browser cache.

## Customer versus admin lifecycle

`AppComponent` lazily instantiates the public coordinator on customer-facing routes. Admin and branch portal routes stop periodic public fallback polling. Lazy construction avoids eagerly loading all four public domains for a user who opens a private operations surface directly.

## Seven dynamic homepage sections

The homepage keeps these seven managed fallback sections until database-defined sections are available:

1. campaigns
2. rental_featured
3. sale_featured
4. tour_featured
5. branches
6. partner
7. blog_featured

Rendering components remain transport-free. They consume service signals and do not own polling, Supabase URLs or direct REST reads.

## CI invariant

`scripts/check-public-content-orchestration-v187.mjs` rejects regressions that:

- reintroduce independent periodic polling or lifecycle listeners into the four public domain services
- introduce more than one coordinator scheduling timer
- move private/admin data into the global public coordinator
- remove visibility, online/offline, overlap or retry protections
- move network/timer ownership into dynamic homepage rendering components
- remove one of the seven managed homepage fallback sections
- disable event-driven public Realtime as the primary freshness mechanism
