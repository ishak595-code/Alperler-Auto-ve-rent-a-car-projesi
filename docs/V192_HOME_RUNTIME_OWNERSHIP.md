# V192 Home Runtime Ownership and Progressive Hydration

## Engineering rule

V192 follows the patch ban: fix the owning layer, do not hide failures with frontend copies of products, campaigns, homepage sections or duplicate services.

## Root causes verified

1. Public catalog reads had two transport paths. The browser tried `/api/catalog` first and then repeated the same read against Supabase when the first path failed. Public content now has one canonical read owner: Supabase REST under RLS. Admin mutations continue to use protected mutation gateways where required.
2. `CarService` used to start a full vehicle, tour, blog, FAQ, site-config and media hydration as soon as the customer shell instantiated it. This competed with first paint.
3. `site_config` was coupled to heavy catalog reconciliation. It is now a separate lifecycle so a branding/config change does not force a full catalog reload.
4. `HomeV71Component` contained a static seven-section fallback and a hard-coded external hero fallback. Production already owns homepage sections in `homepage_sections`, so the frontend fallback masked data/config failures. Those copies are removed.
5. Several customer and admin routes were statically imported from `app.routes.ts`, increasing the initial JavaScript graph even when the user only opened `/`.
6. Below-the-fold homepage sections, prefooter, footer and feedback code were eligible for deferred rendering rather than competing with the hero.

## Canonical startup order

The public refresh coordinator now hydrates customer-visible data in priority order:

1. `site_config`
2. `homepage_sections` and `homepage_placements`
3. public branch directory
4. campaigns
5. full catalog, tours, blog, FAQ and media hydration

Normal connections use short staggered offsets. `saveData`, 2G and slow-2G connections use wider offsets. The coordinator still owns online/offline/visibility lifecycle, overlap prevention, retry, jitter and periodic reconciliation.

## Progressive rendering

`HomeV71Component` renders the hero and planner immediately from the lightweight shell and live config signal. Managed sections come only from `HomepageLayoutService`.

Each managed section uses Angular defer semantics:

- instantiate when it approaches the viewport
- prefetch code while the browser is idle
- show a neutral loading placeholder using the real section title from the database
- never manufacture product, campaign, tour, branch or blog records in the component

The customer prefooter and footer follow the same viewport/idle pattern. The feedback panel is deferred until idle instead of joining the first-paint path.

## Route ownership

The root landing route stays `HomeV71Component` inside `MainLayoutComponent`. Other customer pages and admin hubs use `loadComponent` so they are not included in the root route's eager component graph.

## Production data contract verified during V192 work

Production contains seven enabled managed homepage sections:

- campaigns
- rental_featured
- sale_featured
- tour_featured
- branches
- partner
- blog_featured

These are database records, not a frontend fallback contract. If they are removed or disabled in admin, the frontend must reflect that state rather than recreating them.

## Regression gate

`scripts/check-home-runtime-v192.mjs` fails when any of the following reappears:

- gateway-first public catalog reads followed by direct fallback
- full catalog hydration from `CarService` constructor
- `site_config` coupled back into the heavy catalog refresh
- static managed homepage section copies
- hard-coded Unsplash hero fallback in the homepage
- removal of viewport/idle progressive rendering
- eager static customer/admin page imports in `app.routes.ts`
- loss of staged startup ordering or constrained-network handling

V187 orchestration invariants were updated only where V192 intentionally supersedes the old static fallback requirement. Domain separation and single lifecycle-scheduler ownership remain enforced.
