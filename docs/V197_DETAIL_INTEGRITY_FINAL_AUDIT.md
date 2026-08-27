# V197 Detail Integrity Final Audit

V197 closes the final public catalogue detail ownership gaps without changing blog copy or inventing static catalogue fallbacks.

## Production audit baseline

- 7 published rental vehicles, 4 published sale vehicles, 13 published tours and 15 published blog posts had complete basic text and cover media at audit time.
- The three currently active published campaigns all had valid UUID targets. Their legacy numeric `cta_url` values were stale secondary routes, not the canonical target source.
- Vehicle detail pages were downloading the entire vehicle catalogue and did not hydrate the selected vehicle from the central `catalog_media` ownership layer.
- Tour detail was loading every published tour and all tour media before selecting one tour.
- Blog detail depended on a global catalogue signal, so a direct route could transiently render a false not-found state after V192 progressive hydration.

## Root fixes

- Vehicle and tour details query one published record by canonical UUID, with legacy slug/stock-code lookup only for non-UUID routes.
- `PublicCatalogMediaService` can load media for one vehicle or one tour and remains the media URL/hydration owner.
- Blog detail directly hydrates the routed published post and separates loading from genuine not-found state. Existing blog title, excerpt and content values are not modified.
- Targeted campaigns use `target_type + target_id` as the only canonical entity route. A database trigger clears `cta_url` for VEHICLE and TOUR targets and a constraint requires a target id.
- PWA cache generation rotates to V197 so previously installed web experiences activate the new runtime rather than retaining the V194 static cache namespace.

## Non-goals

- No blog copy rewrite.
- No static vehicle, campaign, tour or blog fallback data.
- No new parallel public API or duplicate domain service.
- No removal of intentional database indexes solely because Supabase currently reports them unused.
