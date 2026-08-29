# Alperler Architecture Constitution V208.2

This document is a permanent engineering contract for the production application. It is not a temporary release checklist. New work must preserve these invariants unless a later reviewed architecture decision explicitly replaces them and updates the corresponding CI guard.

## 1. Canonical data flow

Customer and admin UI must follow:

`UI / page -> domain service -> API, BFF, RPC or publishable Supabase service -> authorization/RLS -> database`

Database responses flow back through typed contracts and domain models before reaching presentation code.

Pages and components do not own PostgREST URLs, Supabase project configuration, Auth endpoints or Edge Function URLs. The V208.2 architecture guard enforces this boundary for `src/pages` and `src/components`.

## 2. Database is the source of truth

Production inventory, rentals, sales, tours, blog, branches, campaigns, valuation requests, reservations, customer data, wallet/loyalty data, subscriptions, navigation, footer and site settings must not have competing production JSON, mocks or browser storage sources.

A domain may expose multiple projections of the same source, but not multiple authoritative sources.

## 3. Access models

### Public

`UI -> canonical public service -> publishable Data API/BFF -> explicit SELECT projection -> RLS -> DB`

Public reads request only fields needed by the screen. `select=*` is forbidden by the V207 database-source contract.

### Customer

`UI -> customer service -> customer JWT -> explicit projection/RPC/Edge Function -> owner-scoped RLS -> DB`

Authentication is not authorization. Ownership and business predicates are rechecked at the database or server boundary.

### Branch

`Branch portal -> branch service -> branch identity/authorization -> BFF/RPC/controlled RLS -> DB`

Branch financial, subscription and privileged operations prefer same-origin server authorization.

### Admin

`Admin UI -> admin service -> admin JWT -> same-origin BFF -> Edge Function/RPC -> authorization -> DB`

Admin pages do not directly own Supabase URLs or privileged database queries.

### Payment, wallet and secret-bearing operations

`Browser -> same-origin BFF -> server secret/provider -> transactional business logic -> DB`

Service-role keys, provider secrets, webhook secrets and private merchant credentials never enter browser source or public responses. Wallet balances are not client-controlled state. Financial mutations must be auditable and idempotent.

## 4. Layered database security

Security is cumulative:

`GRANT + RLS + explicit columns + server authorization + validation + business rules`

RLS is not a substitute for least-privilege GRANTs. V208.2 removes stale anonymous write/table-maintenance privileges from legacy tables and future migrations are forbidden from reintroducing anonymous `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `REFERENCES` or `TRIGGER` grants without replacing this constitution through review.

Anonymous access should normally be SELECT-only on explicitly public data. Public form submissions use controlled BFF/Edge Function contracts rather than broad anonymous table writes.

## 5. Public and privileged data contracts

Public DTOs contain only customer-visible data. Internal notes, provider identifiers, audit internals, private payment configuration, staff metadata and similar privileged fields do not leak into public contracts.

List and detail projections are separate. List cards request compact card fields. Detail screens request their additional fields only when needed.

## 6. Domain ownership

Every business capability has an owner. Examples:

- Rentals own rental availability and pricing behavior.
- Sales own sale listing behavior.
- Tours own tour demand and booking behavior.
- Campaigns own campaign timing, placements and eligibility.
- Branches own branch/network behavior.
- Reservations own reservation state transitions.
- Payments own payment processing and idempotency.
- Customer account owns customer profile behavior.
- Loyalty/wallet owns ledger and benefit rules.
- Site-content services own navigation, footer and configurable content.

Unrelated domains must not mutate each other's state through convenience shortcuts.

## 7. Runtime ownership and dead code

V208.1 maintains a static runtime import graph. A `.service.ts` file with zero runtime owner fails certification until it is either proven to have a valid bootstrap owner or removed.

Files are never retained merely because they may be useful later. Git is history.

However, versioned filenames are not evidence of dead code. This repository currently has active canonical V150/V167/V168/V170/V171/V172 implementations. A V-numbered file may be renamed or deleted only after route ownership, import ownership, unique business behavior and CI references have been proven and safely retargeted.

## 8. Migration discipline and rollback

Production schema changes are migration-first:

`migration -> review -> validation -> deployment -> production verification`

Do not use Dashboard SQL as the normal development path. Git migration history and production schema must remain aligned.

Prefer expand-and-contract changes:

1. add new compatible structure,
2. migrate/backfill,
3. switch application ownership,
4. observe,
5. remove obsolete structure in a later migration.

Avoid destructive migrations that make deployment rollback impossible.

## 9. Database integrity

Business invariants should exist at the strongest practical layer, including foreign keys, unique constraints, non-negative numeric constraints, valid date ordering and controlled state transitions.

Canonical states use one representation per domain. Do not create case/spelling variants such as `ACTIVE`, `active`, `Live` for the same state.

## 10. Type and runtime validation

Database-generated types or equivalent schema contracts are the foundation. Domain/UI DTOs may refine them but must not silently drift from production schema.

TypeScript is compile-time protection, not runtime validation. External input and sensitive actions validate IDs, email, phone, dates, prices, enums, payload sizes and business-specific constraints before mutation.

## 11. Error and success contracts

Raw Postgres, PostgREST or provider errors are never customer-facing UI text.

Logs preserve technical context such as request ID, operation, service, actor where permitted, error code and timestamp. UI messages explain what the user can understand or do next.

Success messages state the actual result, for example that a reservation request was received or profile information was updated, rather than a generic `Success`.

## 12. UI data states

Data-driven screens design and test at least:

- loading,
- success,
- empty,
- error,
- offline.

Retryable failures expose a retry action. Skeletons reserve stable dimensions and must not create avoidable layout shift.

## 13. Performance and media

Production targets Core Web Vitals at the 75th percentile:

- LCP <= 2.5 s
- INP <= 200 ms
- CLS <= 0.1

Images use appropriate dimensions, responsive sources and efficient formats where supported. Below-the-fold media may lazy load. The LCP/hero asset is not blindly lazy loaded. Width and height/aspect ratio are reserved to prevent layout shift.

Large datasets require bounded queries and pagination. Do not fetch an unbounded production table into a browser list.

## 14. Accessibility

Target WCAG 2.2 AA. Certification covers semantic controls, labels, keyboard navigation, visible focus, screen-reader naming, modal focus behavior, color contrast, touch targets, form errors, image alternatives and reduced-motion behavior.

Existing TalkBack/date/button and responsive browser gates remain mandatory.

## 15. Responsive and browser support

Critical customer paths are tested across representative Android, Apple mobile, tablet and desktop viewports using Chromium and WebKit in CI. Responsive layouts must remain usable around 360, 390, 430 px, tablet and desktop widths.

## 16. Design system

Reusable buttons, form controls, cards, badges, dialogs, sheets, toasts, skeletons, empty/error states and spacing/token conventions should converge on shared primitives. Premium quality comes from consistency, not arbitrary effects or duplicated styles.

## 17. SEO and indexability

Public indexable pages require stable canonical routes, correct HTTP behavior, unique titles and descriptions, logical headings, internal linking and meaningful media alt text.

The application maintains `robots.txt`, sitemap behavior, canonicalization and error/redirect handling. Appropriate pages may expose valid JSON-LD such as Organization, BreadcrumbList, Article and Product/Offer only when the data is truthful.

## 18. Auditability and observability

Critical admin and financial changes are auditable. Audit reads use a privileged server contract and expose only fields required by the admin UI. Browser UI does not receive internal IP hash, user-agent, request metadata or other audit internals unless a reviewed feature explicitly requires them.

Production diagnostics use structured server/application logging and request IDs rather than relying on ad-hoc console output as the observability system.

## 19. CI/CD is a release boundary

The exact commit being merged must pass the applicable gates. A previous green commit does not certify a newer commit.

Certification includes relevant lint/type checks, source/database contracts, migration/security checks, accessibility, build, customer/admin/branch regressions, dependency/security checks and browser device tests.

No gate is weakened, suppressed or allowlisted merely to make a pull request green.

V208/V208.1 stale-run governance prevents obsolete PR commits from consuming expensive CI capacity.

## 20. Deployment verification

After merge:

1. verify the deployed Vercel SHA/status matches the approved main SHA,
2. verify main push CI has zero queued, in-progress and failed runs,
3. smoke critical production data/API paths,
4. rerun Supabase security checks after DDL/privilege changes,
5. preserve a rollback path.

## 21. Platform controls outside repository mutation

Two controls remain platform-admin settings and must not be simulated in source code:

- GitHub `main` branch protection/ruleset must ultimately enforce required checks at the platform level.
- Supabase Auth leaked-password protection should be enabled at the project Auth configuration level.

Until connected administration APIs can mutate these settings, CI and application-side checks provide defense in depth but are not described as substitutes for the platform setting itself.

## 22. Governing principle

UI does not own the database. Services request only the data they need. Database and server boundaries enforce authorization. Sensitive operations stay server-side. CI certifies the exact release. Every permanent fix should add an invariant that prevents the same class of regression from silently returning.
