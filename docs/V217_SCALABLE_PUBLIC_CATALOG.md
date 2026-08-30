# V217 Scalable Public Catalog

V217 removes customer-facing full-catalog hydration from search, homepage, rental, sale, tour and blog discovery paths.

## Runtime contract

- Public list routes fetch bounded pages, 24 records by default and never more than 48 per request.
- Filter facets are computed server-side and return compact distinct values and numeric bounds.
- Homepage placement mode fetches only configured entity identifiers.
- Homepage latest mode fetches only each section's configured maximum item count.
- Global search runs in PostgreSQL through indexed server-side search and supports exact stock/vehicle number lookup.
- Visible-page campaign lookups are bounded to the vehicle IDs currently rendered.
- Public catalog views use `security_invoker = true`; base-table RLS remains authoritative.
- Public route code must not call `refreshCloudCatalog`, `ensureVehicleCloudInventory`, `getCars`, `getSaleCars`, `getTours` or `getBlogPosts`.

## Scale properties

The database may contain hundreds of thousands of catalog rows without requiring the browser to download the entire dataset. Pagination is bounded and the UI loads additional records on demand.

## CI protection

`scripts/check-v217-scalable-public-catalog.mjs` is executed by the database-source workflow and fails if a protected public route reintroduces full-catalog hydration or if required V217 security/view contracts disappear.
