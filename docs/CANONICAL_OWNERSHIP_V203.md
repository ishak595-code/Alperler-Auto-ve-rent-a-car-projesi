# Alperler Rent A Car — Canonical Ownership V203

This document is the source-of-truth map for the current customer UI, admin writers and data paths. New development must extend these owners instead of introducing parallel renderers or writers.

## 1. Customer routes and renderers

| Customer surface | Route owner | Canonical renderer/list | Data owner |
| --- | --- | --- | --- |
| Homepage | `HomeV71Component` | `DynamicHomeSectionComponent` | `HomepageLayoutService` + `CarService` + `CampaignService` + `BranchService` |
| Rental list | `/fleet` | `FleetComponent` → `RentalShowcaseV167Component` | live `CarService` catalog |
| Rental detail | `/fleet/:id` | `RentalDetailShellComponent` → `CarDetailComponent` | `PublicDetailDataService` |
| Sale list | `/sales` | `SalesResultsComponent` → `SalesShowcaseV168Component` | live `CarService` catalog |
| Sale detail | `/sales/:id` | `SaleDetailShellComponent` → `SaleCarDetailComponent` | `PublicDetailDataService` |
| Tours list | `/tours` | `ToursComponent` → `TourShowcaseV170Component` | live tour catalog |
| Tour detail | `/tour/:id` | `TourDetailShellComponent` → `TourDetailComponent` | `PublicDetailDataService` + V170 demand/booking services |
| Blog list/detail | `/blog`, `/blog/:id` | current blog components | canonical published blog DB source |
| Campaign context | detail shells | `CatalogCampaignContextComponent` | `CampaignService` targeted campaign/proof data |

`CatalogDetailShellsComponent` is the only public detail ownership bridge. Historical V167/V168/V169/V170 detail renderer files were removed in V203 and must not return.

## 2. Homepage data ownership

Public homepage order and placement are not hardcoded in `HomeV71Component`.

- `HomepageLayoutService` reads `homepage_sections` and `homepage_placements` directly from the public Supabase REST read path with `cache: no-store`.
- `HomeV71Component` renders `homepageLayout.sections()` progressively.
- `DynamicHomeSectionComponent` resolves the content inside those sections from live services:
  - rental/sale vehicles → `CarService.getCars()` / `CarService.getSaleCars()`
  - tours → `CarService.getTours()`
  - blog → `CarService.getBlogPosts()`
  - campaigns → `CampaignService.publicCampaigns()`
  - branches → `BranchService.branches()`
- Section placements filter and order those live entities; they do not create a second copy of catalog data.

Static duplicate homepage inventory arrays or fallback catalogue sections are forbidden by `scripts/check-home-runtime-v192.mjs`.

## 3. Homepage admin ownership

The homepage admin writes the same layout model that the public homepage reads.

`AdminHomepageComponent`
→ `HomepageAdminService`
→ `/api/partner?op=site-content-admin`
→ `site-content-admin-gateway-v174`
→ service-role RPCs such as:

- `service_upsert_homepage_section_v174`
- `service_delete_homepage_section_v174`
- `service_reorder_homepage_sections_v174`
- `service_upsert_homepage_placement_v174`
- `service_delete_homepage_placement_v174`
- `service_reorder_homepage_placements_v174`

The public side then reads the resulting `homepage_sections` / `homepage_placements` records. There is no separate hidden homepage configuration store.

## 4. Catalog admin ownership

The active content hub must use one catalog writer surface:

`AdminContentHubComponent`
→ `AdminCatalogWorkspaceComponent`
→ `CatalogAdminEditorService` / owned media services
→ `/api/partner?op=catalog-admin` and media-control gateway
→ Supabase catalogue tables/RPCs.

Visible workspaces are separated by entity (`RENTAL`, `SALE`, `TOUR`) but the implementation is one canonical technical workspace. Media belongs to the edited entity.

Historical parallel catalog, sale and tour admin editors were removed in V203 and must not return.

## 5. Customer detail ownership rules

### Rental

- `CarDetailComponent` is the only rental detail renderer.
- One fixed action owner is allowed.
- Campaign social proof comes from real campaign proof data.
- DB/admin fields are rendered from the canonical detail mapping, not from a second static vehicle object.

### Sale

- `SaleCarDetailComponent` is the only sale detail renderer.
- Year, mileage, fuel, transmission, body, color, seats, doors and other listing facts live in `İLAN BİLGİLERİ`.
- Do not duplicate those facts in a second summary row above the price.
- Expertise/tramer data remains in the same detail page but is presented as connected information, not an unrelated second card system.
- The bottom action bar owns exactly `Ara / Satış Talebi / WhatsApp` and remains in the DOM after every action.

### Tour

- `TourDetailComponent` is the only tour detail renderer.
- Map/location stays in the tour content.
- Date/person/contact fields open only after the explicit reservation action.
- V170 flexible-demand services remain the booking technology; recommended capacity must not become a hard customer limit.

## 6. Responsive contract

`src/premium-responsive.css` is part of the Angular global style chain in `angular.json`.

Rental and sale bottom action bars use one segmented control contract:

- no inter-button gaps;
- safe-area support;
- usable at 320/360/390/430 px phones;
- centered bounded layout for tablets/desktops;
- focus-visible and touch feedback;
- labels remain readable on very narrow screens.

`tests/v203/responsive.spec.ts` opens canonical detail pages at phone, tablet and desktop widths and fails on horizontal overflow, action-bar overflow or gaps.

## 7. Files intentionally removed in V203

Public duplicates:

- `src/pages/rental-detail-v167.component.ts`
- `src/pages/sale-detail-v168.component.ts`
- `src/pages/sale-detail-v1681.component.ts`
- `src/pages/tour-detail-v169.component.ts`
- `src/pages/tour-detail-v170.component.ts`
- `src/pages/rental-results.component.ts`
- `src/pages/tour-results.component.ts`
- `src/pages/tour-showcase-v169.component.ts`
- orphan `src/pages/sales-results.component.html`

Admin duplicates:

- `src/pages/admin/admin-catalog-editor.component.ts`
- `src/pages/admin/admin-sale-integrity-v168.component.ts`
- `src/pages/admin/admin-sale-integrity-v1681.component.ts`
- `src/pages/admin/admin-tour-integrity-v169.component.ts`
- `src/pages/admin/admin-tour-studio-v170.component.ts`

Compatibility wrappers that are still routed are not duplicates and must not be removed merely because a versioned implementation exists behind them.

## 8. Change rule for future engineers

Before introducing a new component/service for an existing surface:

1. Trace the current route/import owner.
2. Extend the canonical component/service when the responsibility is the same.
3. Create a new owner only when the responsibility is genuinely new.
4. Remove the superseded owner in the same change after route/import/workflow checks prove it is unused.
5. Add or update a regression guard so the old parallel path cannot return.
6. Require lint, API TypeScript, accessibility, PWA, production build and the relevant browser regression before merge.

The objective is one public owner, one admin writer and one authoritative data path per responsibility.
