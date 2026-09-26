# V252 — provider-agnostic media storage (Cloudflare R2 preferred)

## Provider selection

`MEDIA_PROVIDER` = `auto` (default) | `r2` | `cloudinary` | `supabase`

| env present | auto resolves to |
|---|---|
| all five `R2_*` valid | **r2** |
| else all three `CLOUDINARY_*` | cloudinary |
| else | supabase (legacy Storage uploads) |

An explicit provider whose env is incomplete falls back in the same order; `supabase` always wins when set.
Resolution lives in `api/_lib/media-provider.ts` (API) and `scripts/media-provider-env.mjs` (runtime-env.js);
the browser reads `MEDIA_PROVIDER` + `R2_PUBLIC_BASE_URL` from `runtime-env.js`. Every upload path falls back to
Supabase Storage when the provider endpoint answers `MEDIA_PROVIDER_NOT_CONFIGURED`.

## Env vars (Vercel Production + Preview; changes need `vercel deploy --prod`)

| name | exposure | value |
|---|---|---|
| `MEDIA_PROVIDER` | public | optional, default `auto` |
| `R2_ACCOUNT_ID` | server | 32-hex Cloudflare account id |
| `R2_ACCESS_KEY_ID` | server | R2 API token access key (Object Read & Write, bucket-scoped) |
| `R2_SECRET_ACCESS_KEY` | server | R2 API token secret |
| `R2_BUCKET` | server | `alperler-media` (= `bucket_name` in `workers/media/wrangler.toml`) |
| `R2_PUBLIC_BASE_URL` | public | media Worker origin, e.g. `https://alperler-media.<sub>.workers.dev` (later a custom domain) |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | name public, rest server | fallback provider (V249) |
| `SUPABASE_SERVICE_ROLE_KEY` | server | DB registration, cleanup drain, migration |

## Upload flow (R2)

1. Browser compresses and generates fixed WebP widths 480/768/1080/1440/1920 (JPEG when the browser cannot encode
   WebP) + `orig.<ext>`; videos upload `video.<mp4|webm>` + a poster frame at the same widths.
2. `POST /api/partner?op=media-upload` `{action:"SIGN_UPLOAD", target, kind, files}` — verifies the Supabase JWT
   (content admin, ops admin, or branch manager via `can_upload_media_v252`), validates names/types/sizes
   (variant ≤ 8 MB, original ≤ 25 MB, video ≤ 50 MB), picks a random stem under the owner prefix and returns
   15-minute presigned PUT URLs bound to content-type + content-length.
3. Browser PUTs straight to R2 (bucket CORS), then registers the row (`storage_bucket='r2'`,
   `object_path=<stem>`, `metadata.r2={publicBaseUrl,widths,variantExt,…}`).
4. Delivery: `<R2_PUBLIC_BASE_URL>/<stem>/w1440.webp`; `srcset` from the sibling widths (`appResponsiveImg`).
5. Deletes enqueue `media_cleanup_jobs_v198` (bucket `r2`); `DRAIN_CLEANUP` deletes every object under the stem.

Key prefixes: `alperler/catalog/<vehicle|tour|blog>/<id>/…`, `alperler/branch/<id>/…`,
`alperler/admin/<entity>/<id>/<purpose>/…`, `alperler/ops/inspection/<vehicleId>/…`.

Long videos: keep uploads short/compressed (≤ 50 MB); for long footage use an unlisted YouTube link.

## Stays on Supabase Storage

Customer avatars and the private `customer-documents` / `partner-uploads` buckets (customer-owned or sensitive,
signed URLs, RLS by user).

## Migration of existing media

```bash
npm i --no-save sharp            # R2 target needs sharp for the fixed widths; ffmpeg for video posters
node scripts/migrate-media.mjs                      # dry-run (default), active provider (R2 preferred)
node scripts/migrate-media.mjs --apply              # copy + rewrite rows (sources kept)
node scripts/migrate-media.mjs --apply --delete-source
node scripts/migrate-media.mjs --provider=cloudinary   # or scripts/migrate-media-to-cloudinary.mjs
```

Covers `catalog_media` (incl. branch rows), `media_assets`, and URL rewrites in `campaigns`, `homepage_sections`,
`site_config`, `branches`, `blog_posts`, `vehicle_inspections`, `vehicles`, `tours`. Needs Supabase REST (not during a
402 quota block).

## Custom domain later

See `workers/media/README.md`: attach the domain to the Worker, set `R2_PUBLIC_BASE_URL`, redeploy, then run
`select public.service_rebase_r2_media_v252('<old base>', '<new base>');` (service_role).
