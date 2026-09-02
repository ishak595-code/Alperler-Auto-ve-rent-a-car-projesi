# Alperler Rent A Car

Production-grade Angular customer experience, administration platform, branch network and Supabase backend for Alperler Rent A Car.

This file is the canonical starting point for a new developer. Do not begin by guessing which versioned component is newest. Version numbers in filenames are historical release identifiers, not an instruction to replace or delete a component.

## Start here

Prerequisites:

- Node.js 22
- npm with the committed `package-lock.json`
- a Supabase project configured from the repository migrations and Edge Function manifest
- deployment environment variables based on `.env.example`

Local verification:

```bash
npm ci
npm run verify:handoff
```

Development server:

```bash
npm run dev
```

Production build:

```bash
npm run build
```

Never commit real secrets. `.env.example` documents variable names only. Production secrets belong in the deployment platform and Supabase project settings.

## Architecture in one minute

The application uses Angular 21, TypeScript 5.9, Express/Vercel same-origin APIs and Supabase for database, Auth, Realtime, Storage-oriented metadata and Edge Functions.

Primary folders:

| Path | Ownership |
| --- | --- |
| `src/` | Angular customer, account, branch portal and admin runtime |
| `src/pages/` | Route-level page owners and canonical stable wrappers |
| `src/components/` | Shared UI and route shell components |
| `src/services/` | Business, data, auth, layout and integration services |
| `api/` | Same-origin server/BFF endpoints used by browser clients |
| `supabase/migrations/` | Database schema and security history. Add migrations, do not rewrite deployed history |
| `supabase/functions/` | Edge Function sources |
| `supabase/functions/deployment-manifest.v186.json` | Edge deployment inventory and JWT policy baseline |
| `scripts/` | Structural, security, accessibility, portability and design guards |
| `.github/workflows/` | CI quality gates |
| `docs/` | Architecture, recovery, design and handoff documentation |

For the detailed ownership map read `docs/DEVELOPER_HANDOFF_V206.md` and `docs/CANONICAL_RUNTIME_ARCHITECTURE_V203.md` before changing routes or deleting versioned files.

## Canonical public runtime

Important route owners:

- `/` -> `MainLayoutComponent` + `HomeV71Component`
- `/fleet` -> `FleetComponent` -> active `RentalShowcaseV167Component`
- `/fleet/:id` -> `RentalDetailShellComponent` -> `CarDetailComponent`
- `/sales` -> `SalesResultsComponent` -> active `SalesShowcaseV168Component`
- `/sales/:id` -> `SaleDetailShellComponent` -> `SaleCarDetailComponent`
- `/tours` -> `ToursComponent` -> active `TourCatalogV217Component`
- `/tour/:id` -> `TourDetailShellComponent` -> `TourDetailComponent`
- `/blog/:id` -> `BlogDetailComponent`
- `/list-your-car` -> `ListYourCarComponent` -> active `ListYourCarV172Component`
- `/branch-partner` -> active `BranchPartnerV171Component`
- `/account` -> `AccountShellComponent` -> active `AccountDashboardV150Component`

The stable wrapper is the public contract. A versioned component can still be the active production implementation. Never delete a file only because its name contains a historical release suffix. Confirm the canonical route owner and its current imports before removing or reviving any component.

## Homepage and live content

`HomeV71Component` owns the hero and quick planner. `HomepageLayoutService` owns section order and placements from Supabase. `DynamicHomeSectionComponent` renders live catalogue entities.

Live entity ownership:

- homepage rental, sale, tour, blog, campaign and branch catalogue rows -> `ScalablePublicCatalogV217Service`
- campaign social-proof refresh and campaign interaction helpers -> `CampaignService`
- homepage ordering and placement resolution -> `HomepageLayoutService`
- realtime refresh -> `PublicContentRealtimeService`

Do not hardcode catalogue arrays into the homepage. Admin-managed data must remain the source of truth.

## Premium visual system

The effective production identity is graphite black, premium red, warm gold and off-white. The default palette is intentionally restrained to preserve an automotive showroom feel.

Canonical visual layers are loaded in this order:

1. `src/tailwind.css`
2. `src/base-shell.css`
3. `src/mobile-target-fixes.css`
4. `src/runtime-stability.css`
5. `src/premium-design-system.css`
6. `src/prestige-palette-defaults.css`
7. `src/premium-responsive.css`
8. `src/v193-cinematic-3d.css`
9. `src/device-experience.css`

`ThemeService` can override the palette from admin-managed `site_settings`. Repository colors are safe initial-paint fallbacks, not a second competing theme engine.

The historical variables `--alper-blue` and `--alper-blue-light` are compatibility names. In the current prestige palette they represent the primary red interaction accent. Do not rename them globally without a controlled migration.

The 3D layer is CSS-based. Desktop receives perspective, material depth and restrained hover lift. Touch devices flatten expensive 3D transforms and blur. Reduced-motion users receive effectively static transitions. Do not introduce a parallel WebGL/Three.js scene without proving measurable benefit, accessibility compatibility and mobile performance.

Read `docs/DESIGN_SYSTEM_3D_V206.md` before changing brand colors, hero depth, card shadows or responsive presentation.

## Responsive device contract

Phone, tablet and desktop are intentionally different experiences.

- phone portrait -> customer bottom dock enabled
- short coarse landscape phone -> phone experience remains enabled
- iPad Mini and other tablets -> no customer bottom dock
- desktop -> no customer bottom dock and full desktop navigation
- phone homepage -> quick planner appears before trust proof so customers reach conversion sooner
- touch/mobile 3D -> flattened for performance and stability

`src/device-experience.css` is the final cross-device experience layer. Do not add an arbitrary stylesheet after it to override device policy.

## Admin ownership

Admin routes are grouped through hub components rather than duplicated feature screens:

- site/settings/homepage/navigation/footer/legal/SEO -> `AdminSiteSettingsHubComponent`
- rental/sale/tour/campaign/blog content -> `AdminContentHubComponent`
- reservations/requests/messages/newsletter/branches -> `AdminOperationsHubComponent`
- team/assignments/audit -> `AdminTeamHubComponent`

Rental, sale and tour catalogue editing converges on `AdminCatalogWorkspaceComponent`. Do not recreate the deleted legacy catalogue editors.

## Deployment and portability

The repository must not depend on one hardcoded Vercel deployment hostname or an unowned custom domain. Public origin resolution is request-authoritative with deployment fallbacks. Browser admin/data traffic that requires secrets uses same-origin BFF endpoints rather than embedding privileged Supabase credentials.

Before moving the project to another Vercel account, domain or compatible host, follow `docs/DEPLOYMENT_PORTABILITY_V206.md` and the existing recovery runbook in `docs/PRODUCTION_RECOVERY_RUNBOOK_V186.md`.

## Quality gates

`npm run verify:handoff` is the local static production handoff gate. It checks:

- V206 developer/handoff contract
- V186 deployment portability
- V203 canonical runtime ownership
- V205 responsive prestige contract
- premium design-system invariants
- PWA installability
- accessibility controls
- vehicle media truth
- Vercel function budget
- production security hardening
- frontend and API TypeScript
- production build

Pull requests additionally run the repository GitHub Actions suite, including browser/device regressions and CodeQL where applicable.

Do not merge a red or still-running production-affecting PR merely because the change looks small.

## Non-negotiable engineering rules

1. One canonical public owner per route.
2. No duplicate renderer or admin editor as a shortcut.
3. No real secret, service-role key or provider token in browser code or Git history.
4. No hardcoded temporary deployment hostname.
5. No rewriting applied Supabase migrations. Add a new migration.
6. Admin-entered content remains authoritative.
7. Maintain safe-area handling and phone/tablet/desktop separation.
8. Preserve accessibility labels, keyboard behavior and reduced-motion handling.
9. Preserve production bundle budgets in `angular.json`.
10. Run `npm run verify:handoff` before handing the repository to another developer.

## Documentation map

- `docs/DEVELOPER_HANDOFF_V206.md` - where every major subsystem lives and how to take ownership
- `docs/DESIGN_SYSTEM_3D_V206.md` - colors, theme ownership, 3D and responsive visual rules
- `docs/DEPLOYMENT_PORTABILITY_V206.md` - clean-room deployment and migration procedure
- `docs/PLATFORM_HARDENING_V206.md` - platform settings that cannot be enforced from application source alone
- `docs/CANONICAL_RUNTIME_ARCHITECTURE_V203.md` - canonical route and renderer ownership
- `docs/PRODUCTION_RECOVERY_RUNBOOK_V186.md` - recovery and production portability runbook
- `CONTRIBUTING.md` - change discipline and pull-request expectations

## Platform-level certification

Application code and CI cannot substitute for account-level controls. Before declaring a new production environment fully certified, verify the items in `docs/PLATFORM_HARDENING_V206.md`, especially GitHub `main` protection/rules and Supabase Auth leaked-password protection when the project plan supports it.
