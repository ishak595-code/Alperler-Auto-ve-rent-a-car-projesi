# V217 Production Verification

Verified against production before merge:

- Public catalog views run under anon role and preserve expected visible content: 7 rentals, 4 sale vehicles, 13 tours, 15 blog posts, 3 live campaigns and 2 public branches.
- `public_vehicle_facets_v217` returns live rental and sale brands, years, fuels, transmissions, body types, colors and numeric price/km bounds.
- `public_tour_facets_v217` returns live duration, location and price bounds.
- Global indexed search resolves `Audi` and exact vehicle/stock number `ALP-S-001` without downloading the catalog.
- Public views are `security_invoker` and explicit public-view grants are SELECT only.

Final application certification still requires branch CI, customer-route regression tests and exact production deployment verification after merge.
