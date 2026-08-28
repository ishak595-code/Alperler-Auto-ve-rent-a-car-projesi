# V203 Canonical Runtime Architecture

This document is the source-of-truth map for the Alperler Auto customer catalogue and content administration runtime.

## Rule: one public owner per detail route

| Route | Runtime shell | Canonical customer component | Public data source |
| --- | --- | --- | --- |
| `/fleet/:id` | `RentalDetailShellComponent` | `CarDetailComponent` | `PublicDetailDataService` + owner-scoped catalogue media |
| `/sales/:id` | `SaleDetailShellComponent` | `SaleCarDetailComponent` | `PublicDetailDataService` + owner-scoped catalogue media |
| `/tour/:id` | `TourDetailShellComponent` | `TourDetailComponent` | `PublicDetailDataService`, `TourDemandV170Service`, `TourBookingV170Service` |
| `/blog/:id` | direct route | `BlogDetailComponent` | canonical published blog detail source + owner-scoped blog media |

`catalog-detail-shells.component.ts` is only an ownership boundary. It must never swap a canonical public component for historical V167/V168/V169/V170 presentation components.

Historical duplicate detail renderers were removed in V203. Their reusable business technology remains in services, migrations and Edge Functions where still required.

## Canonical public list and entry owners

Stable routes have one active list/entry implementation:

- `/fleet` -> `FleetComponent` -> `RentalShowcaseV167Component`
- `/sales` -> `SalesResultsComponent` -> `SalesShowcaseV168Component`
- `/tours` -> `ToursComponent` -> `TourShowcaseV170Component`
- `/list-your-car` -> `ListYourCarComponent` -> `ListYourCarV172Component`
- `/branch-partner` -> `BranchPartnerV171Component`
- `/account` -> `AccountShellComponent` -> `AccountDashboardV150Component`

These versioned components are active runtime components and must not be removed merely because their filenames contain a version. Their active card components and live-data services remain part of production.

V203 removed superseded or route-less list/entry implementations after proving that the canonical route no longer depended on them. This includes the old vehicle valuation V2 page, tour showcase V169, the V164 branch-partner screen/wrapper, route-less rental/tour results screens and the orphaned external sales results template.

Versioned services/Edge Functions/migrations such as V166/V167/V168/V169/V170 remain valid when they implement current business rules.

## Admin ownership

Public catalogue content is edited from one workspace:

- `/admin/cars` -> `AdminCatalogWorkspaceComponent mode="RENTAL"`
- `/admin/sales` -> `AdminCatalogWorkspaceComponent mode="SALE"`
- `/admin/tours` -> `AdminCatalogWorkspaceComponent mode="TOUR"`
- `/admin/campaigns` -> `AdminCampaignsV167Component`
- `/admin/blog` -> `AdminBlogComponent`
- `/admin/homepage` -> `AdminSiteSettingsHubComponent` homepage section

Legacy `/admin/catalog-editor` and `/admin/media` routes redirect to `/admin/cars`; historical duplicate editor/studio screens are not runtime owners.

## Homepage data flow

`HomeV71Component` renders admin-managed hero/planner copy and enabled `HomepageLayoutService.sections()`.

`DynamicHomeSectionComponent` renders the actual entity data:

- rental/sale vehicles -> `CarService.getCars()` / `CarService.getSaleCars()`
- tours -> `CarService.getTours()`
- blog -> `CarService.getBlogPosts()`
- campaigns -> `CampaignService.publicCampaigns()` + real campaign social proof
- branches -> `BranchService.branches()`

Section order/entity placement comes from `HomepageLayoutService`, which reads `homepage_sections` and `homepage_placements` from Supabase and refreshes through realtime notifications. Catalogue entity arrays must not be hardcoded into the homepage component.

## Customer detail UI contract

### Sale

The hero contains listing number, title, price and optional real interaction proof. Year, mileage, fuel, transmission and body type belong in **İlan Bilgileri** and must not be duplicated as a hero summary row. Tramer/expertise data is shown in one connected truth panel. Phone, sales enquiry and WhatsApp are three persistent actions.

### Rental

Customer facts, technical data and rental conditions come from the canonical vehicle record. Campaign proof is real campaign data. A single fixed quick-action owner provides phone, WhatsApp and reservation.

### Tour

Map/location belongs to normal tour content. Date/person/contact data is opened only from the explicit reservation action. Flexible demand and large group behavior is provided by V170 services/Edge Functions, not by a second V170 detail renderer.

## Responsive action ownership

`src/premium-responsive.css` is the final cross-device geometry owner for the canonical detail action bars:

- `app-car-detail .fixed-actions`
- `app-sale-car-detail .bottom-actions`
- `app-tour-detail .action-bar`

Business colors/actions stay inside their components. Shared geometry, safe-area padding, zero inter-button gaps and phone/tablet/desktop sizing are owned by this one responsive layer.

## Repository collision prevention

`scripts/check-v203-canonical-runtime-integrity.mjs` is a structural guard, not a visual smoke test. It must fail CI if:

- a removed legacy renderer or old entry screen returns;
- a stable public route points back to a superseded implementation;
- detail ownership splits into parallel renderers again;
- public list wrappers stop targeting the active canonical showcase;
- the customer account shell stops targeting the active V150 dashboard;
- homepage data falls back to hardcoded catalogue entities;
- admin rental, sale or tour editing splits away from `AdminCatalogWorkspaceComponent`.

## Safe cleanup rule

Before deleting a file:

1. prove it is not an active route/import owner;
2. identify any unique business behavior;
3. move reusable behavior to the canonical component/service if it still belongs in production;
4. retarget CI contracts away from the historical file;
5. delete the duplicate;
6. run lint, API TypeScript, accessibility/PWA guards and production build.

Never delete a file simply because its name contains an old version number. Never keep a duplicate renderer merely because a CI grep references it.
