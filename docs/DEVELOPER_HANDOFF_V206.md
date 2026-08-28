# V206 Developer Handoff Map

This is the operational ownership map for a developer receiving the repository without prior project history.

## 1. What this system is

Alperler Rent A Car is not only a marketing website. The repository contains:

- customer catalogue and booking flows
- rental, sale and tour detail experiences
- campaigns and homepage merchandising
- customer account/document flows
- branch marketplace and branch portal
- admin content, operations, finance, team and settings hubs
- same-origin server APIs/BFF routes
- Supabase database migrations, Auth integration, Realtime flows and Edge Functions
- PWA, accessibility, security and deployment guards

Treat the repository as one integrated production application.

## 2. Entry points

Frontend bootstrap:

- `index.tsx`
- `src/app.component.ts`
- `src/app.routes.ts`

Customer shell:

- `src/components/main-layout.component.ts`
- `src/components/navbar.component.ts`
- `src/components/customer-mobile-dock.component.ts`
- customer prefooter/footer components

Server/API entry points:

- `server.ts` for the Node/Express development/runtime path
- `api/` for same-origin deployment functions and BFF operations

Supabase:

- `supabase/migrations/`
- `supabase/functions/`
- `supabase/functions/deployment-manifest.v186.json`

## 3. Canonical public routes

| Route | Stable owner | Active implementation/detail |
| --- | --- | --- |
| `/` | `MainLayoutComponent` | `HomeV71Component` |
| `/search` | route component | `SearchComponent` |
| `/campaigns` | route component | `CampaignsComponent` |
| `/fleet` | `FleetComponent` | `RentalShowcaseV167Component` |
| `/fleet/:id` | `RentalDetailShellComponent` | `CarDetailComponent` |
| `/sales` | `SalesResultsComponent` | `SalesShowcaseV168Component` |
| `/sales/:id` | `SaleDetailShellComponent` | `SaleCarDetailComponent` |
| `/tours` | `ToursComponent` | `TourShowcaseV170Component` |
| `/tour/:id` | `TourDetailShellComponent` | `TourDetailComponent` |
| `/branches` | route component | `BranchesComponent` |
| `/branches/:slug` | route component | `BranchDetailComponent` |
| `/branch-partner` | route component | `BranchPartnerV171Component` |
| `/branch-plans` | route component | `BranchPlansV171Component` |
| `/blog` | route component | `BlogListComponent` |
| `/blog/:id` | route component | `BlogDetailComponent` |
| `/list-your-car` | `ListYourCarComponent` | `ListYourCarV172Component` |
| `/account` | `AccountShellComponent` | `AccountDashboardV150Component` |

Read `docs/CANONICAL_RUNTIME_ARCHITECTURE_V203.md` for detailed catalogue ownership and cleanup rules.

## 4. Homepage ownership

`HomeV71Component` owns the hero, copy and quick planner. It does not own hardcoded catalogue inventory.

`HomepageLayoutService` reads section order/placement from Supabase. `DynamicHomeSectionComponent` renders section content.

Business sources:

- vehicles and tours: `CarService`
- campaigns: `CampaignService`
- branches: `BranchService`
- realtime invalidation/refresh: `PublicContentRealtimeService`

The database tables `homepage_sections` and `homepage_placements` are the merchandising source of truth. Admin changes should flow through the existing homepage settings UI rather than a parallel JSON file.

## 5. Detail ownership

`src/pages/catalog-detail-shells.component.ts` is an ownership boundary only. It maps stable URLs to the current canonical detail components.

Do not put a second detail implementation behind the same route.

Rental detail:

- `CarDetailComponent`
- one fixed quick-action owner
- live vehicle facts/media

Sale detail:

- `SaleCarDetailComponent`
- canonical `İLAN BİLGİLERİ`
- connected expertise/tramer truth area
- phone, enquiry and WhatsApp actions

Tour detail:

- `TourDetailComponent`
- normal map/location content
- reservation form opens only from the explicit booking action
- V170 business services remain valid even though historical V170 detail renderers were removed

## 6. Admin ownership

Admin routing is intentionally consolidated.

Settings hub:

- `AdminSiteSettingsHubComponent`
- general settings, homepage, navigation, footer, legal, SEO, FAQ and WhatsApp settings

Content hub:

- `AdminContentHubComponent`
- rental, sale, tour, campaign, blog and benefits sections
- rental/sale/tour editing converges on `AdminCatalogWorkspaceComponent`

Operations hub:

- `AdminOperationsHubComponent`
- reservations, vehicle requests, branch requests, messages, newsletter and branches

Team hub:

- `AdminTeamHubComponent`
- team, assignments and audit

Specialized pages remain separate where they have real domain ownership, such as finance, telematics, branch subscriptions and customer detail.

## 7. Authentication boundaries

There are separate customer/admin/branch-portal concerns. Do not collapse these services without understanding their session contracts.

Key services include:

- `AuthService`
- `CustomerAuthService`
- `BranchPortalAuthService`
- `AdminAccessService`
- `ProfileAdminBridgeService`

Admin route guards use authenticated identity plus area authorization. Customer routes use the customer auth service. Branch portal routes additionally enforce subscription/operating state.

## 8. Data and server boundaries

Browser-visible code may use public Supabase connection details but must never contain service-role or provider secrets.

Privileged operations use:

- same-origin APIs under `api/`
- Supabase Edge Functions
- database RPC/security policies where appropriate

The V186 portability guard explicitly rejects browser references to service-role secrets and hardcoded temporary deployment hosts.

## 9. Supabase migration discipline

Treat `supabase/migrations/` as immutable applied history.

When changing schema, RLS, grants, functions or indexes:

1. create a new migration;
2. do not edit an already-deployed migration to make production look clean;
3. run database/security checks;
4. run Supabase advisors after DDL;
5. update runtime TypeScript if database shape changes.

Unused-index advisor findings alone are not sufficient evidence to remove an index from a young/low-traffic production system. Prove query irrelevance first.

## 10. Edge Functions

`supabase/functions/deployment-manifest.v186.json` is the deployment inventory. The portability guard checks source directories against that manifest and validates retired security-sensitive functions.

If a function is introduced, retired or changes JWT requirements, change source, manifest and corresponding guard together.

## 11. Visual ownership

Read `docs/DESIGN_SYSTEM_3D_V206.md` before editing global CSS.

The effective customer palette is graphite/black, premium red, warm gold and off-white. Runtime values can be overridden through admin-managed theme settings via `ThemeService`.

The CSS order in `angular.json` is intentional. `device-experience.css` is the final device-policy layer and must remain last unless ownership is deliberately migrated.

## 12. Responsive ownership

Current device policy:

- phone portrait: mobile customer dock
- short coarse landscape phone: still a phone
- tablets: no customer dock
- desktop: no customer dock
- mobile homepage: planner before trust proof

`playwright.v205.config.ts` contains the device matrix for Android phone, iPhone WebKit, landscape phone, iPad Mini WebKit, Android tablet and desktop Chromium.

## 13. PWA and offline

PWA runtime is coordinated by `src/services/pwa-runtime.service.ts` and `public/service-worker.js`.

Business/API traffic stays network-authoritative. Do not cache dynamic privileged API responses as if they were static assets. The install flow is browser-owned rather than a custom duplicate installer.

## 14. Deployment portability

The repository intentionally does not trust a hardcoded temporary Vercel host. Public origin is resolved from the actual request with platform/environment fallbacks.

For a clean-room move to another account or host, follow `docs/DEPLOYMENT_PORTABILITY_V206.md`.

## 15. Quality gates

Primary local command:

```bash
npm run verify:handoff
```

Important structural guards:

- `scripts/check-portability-v186.mjs`
- `scripts/check-v203-canonical-runtime-integrity.mjs`
- `scripts/check-v205-responsive-prestige.mjs`
- `scripts/check-v206-handoff.mjs`
- premium design, PWA, accessibility, media and security guards

GitHub Actions adds browser regressions, CodeQL and domain-specific release checks.

## 16. Where to start when debugging

Use this order:

1. identify the exact route from `src/app.routes.ts`;
2. identify the stable wrapper and canonical implementation;
3. identify the service used by that component;
4. identify whether the service reads same-origin API, Supabase REST/RPC or Edge Function;
5. inspect the relevant database migration/policy history;
6. reproduce with the smallest relevant guard/test;
7. fix the canonical owner, not a duplicate renderer;
8. run `npm run verify:handoff` and the affected browser workflow.

## 17. Do not do these things

- do not delete active V150/V167/V168/V170/V171/V172 files because they look old;
- do not add a second global theme engine;
- do not add an arbitrary CSS override layer after `device-experience.css`;
- do not hardcode production inventory or homepage entity arrays;
- do not put secrets in Angular source;
- do not pin a temporary deployment hostname;
- do not bypass route guards to make an admin page load;
- do not rewrite deployed migrations;
- do not suppress a failing CI check without proving that the contract itself is obsolete and updating it to the new correct invariant.
