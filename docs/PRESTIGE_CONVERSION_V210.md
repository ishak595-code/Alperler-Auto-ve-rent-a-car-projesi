# V210 Prestige Conversion

V210 closes three conversion-focused items from the production master plan without adding new runtime owners.

## Automatic latest-three blog preview

`CatalogService` remains the canonical blog source and already orders published posts by `published_at DESC`. `HomepageLayoutService` now treats a section with `settings.selectionMode = LATEST` as automatic: stored placements are intentionally ignored for runtime ordering. Production `blog_featured` is set to `max_items = 3` and `selectionMode = LATEST`.

This means a newly published post can enter the homepage preview automatically without an admin having to reorder old placements.

## Primary mobile reservation action

The existing `CustomerMobileDockComponent` remains the only customer bottom dock. Production navigation replaces the central search slot with `appointment / Rezervasyon / /appointment`, marks it `metadata.primary = true`, and keeps the dock at five active items. The component gives this canonical item a premium primary visual treatment; no second sticky bar is introduced.

The existing Admin Navigation screen remains the management surface for the dock.

## Database-managed closing CTA

Production receives a `closing_cta` homepage section using the existing `CUSTOM + PROMO` renderer. It uses an owned Supabase catalog-media image, full width, a dark premium theme, and routes the primary CTA to `/appointment`.

The existing homepage admin owns its title, description, background/cover media, CTA label/route, theme, width, order and visibility. No hardcoded homepage-only content owner is created.

## Verification

`npm run prestige-conversion:v210` enforces the ownership and source-order contracts. It is part of `npm run verify:handoff` and has its own exact-head workflow.
