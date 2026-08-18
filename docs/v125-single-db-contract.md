# V125 catalogue contract

- `vehicles` and `tours` are the canonical business-data tables.
- `catalog_media` + Supabase Storage are the canonical media source.
- Vehicle/tour facts endpoints never write cover/gallery columns.
- Database triggers project active Storage images into `cover_image` and `images`.
- Canonical columns are removed from `metadata` to prevent duplicate/stale truth.
- Browser catalogue cache, static mock catalogue data, external vehicle/tour media authoring, and Vercel media proxying are not permitted.
