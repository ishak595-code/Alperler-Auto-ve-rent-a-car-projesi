# V213 Prestige Discovery and Personalization

V213 extends the V208.2 Architecture Constitution. It does not create parallel data owners.

## Homepage showcase ownership

Homepage content sections use two explicit modes:

- `PLACEMENT`: manual curation. `homepage_placements` is the source of truth. Every valid active placement is rendered in placement order. `max_items` is not a cap in this mode. If a placement is removed, the remaining cards reflow. If no valid placements remain, the section collapses rather than silently substituting unrelated content.
- `LATEST`: automatic curation. The canonical entity source owns ordering and `max_items` is the automatic limit. Stored placements are not used by the public renderer.

Rental and sale placements are validated against their own category-specific catalog source. Tour, blog and campaign placements are likewise validated against their matching domain source. Cross-domain or stale placements cannot cause random fallback content.

V213 production migration explicitly makes active vehicle, tour, blog and campaign showcase sections `PLACEMENT`, matching the business requirement that the admin can select as many records as desired.

## Search ownership

The existing desktop Hero search remains the only Hero search control. V213 does not add a second desktop search surface.

`GlobalSearchService` is the canonical public discovery owner. It indexes only public runtime data obtained from canonical services and covers:

- rental vehicles
- sale vehicles
- tours
- published campaigns
- blog posts
- active branches
- FAQs
- enabled homepage sections
- active public navigation/service pages

The `/search` page reads the Hero `q` query parameter immediately and delegates ranking to `GlobalSearchService`. It does not own a second vehicle inventory implementation.

Mobile hamburger navigation receives one data-driven `/search` entry. Desktop Hero search remains unchanged.

## Mobile Quick Planning hierarchy

On phone-class screens the Hero value proposition remains first. Quick Planning is placed immediately after the Hero heading/copy and before secondary trust badges. No second planner is created and desktop Hero/search geometry is not replaced.

## Favorite ownership

Guest favorites remain a device preference in the existing `CarService` local state. V213 adds `CustomerFavoritesSyncService` behind that existing owner instead of replacing the UI contract.

When a customer signs in:

1. account favorites are read using the signed-in customer bearer token;
2. device and account vehicle favorites are unioned once;
3. missing local favorites are inserted into the account;
4. later add/remove operations are synchronized;
5. the existing local signal remains the immediate UI source, preserving current heart buttons and counts.

`public.customer_favorites` is protected by explicit authenticated-only SELECT/INSERT/DELETE grants plus owner-only RLS. Anonymous table privileges are zero. No `service_role` or privileged secret is used in browser code.

The customer account renders a unified Favorites section containing rental and sale vehicles, so sale favorites are no longer hidden behind the historical rental-only `?favs=true` view.

## Permanent regression controls

`npm run prestige-discovery:v213` is part of `verify:handoff` and enforces:

- exactly one canonical Hero search input;
- global search ownership and required public domains;
- PLACEMENT/LATEST separation;
- manual selection count as effective showcase count;
- zero-selection manual collapse;
- section-domain placement validation;
- mobile Quick Planning hierarchy;
- account favorites sync with explicit customer ownership filters;
- RLS/grant requirements and zero anonymous favorites privileges;
- mobile hamburger global search entry.

The dedicated V213 GitHub workflow runs the invariant and frontend TypeScript check on relevant pull requests and main pushes.
