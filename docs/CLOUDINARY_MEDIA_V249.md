# V249 — Cloudinary media hosting (env-gated, Supabase fallback)

**TR özet:** Fotoğraf/video dosyaları artık (isteğe bağlı) doğrudan tarayıcıdan Cloudinary'ye yüklenir ve
Cloudinary CDN'inden sunulur; böylece Supabase egress kotası tüketilmez. Üç ortam değişkeni ayarlanmadıkça
site birebir bugünkü gibi Supabase Storage ile çalışır. Veritabanı migration'ı yazıldı ama **uygulanmadı**
(Supabase 402 kota) — kota sıfırlandıktan sonra aşağıdaki sırayla uygulayın.

## Order of operations (after the Supabase quota resets, ~2026-10-18)

1. Apply `supabase/migrations/20260926110000_v249_cloudinary_media_hosting.sql` (SQL editor or `supabase db push`).
2. (Optional but recommended) redeploy Edge Function `media-control-admin-v185` — its drain now only touches
   `catalog-media` jobs; the old version merely bumps `attempts` on Cloudinary jobs (harmless).
3. Set on Vercel (Production + Preview), then redeploy so `runtime-env.js` is rebuilt:

   | Variable | Visibility | Purpose |
   |---|---|---|
   | `CLOUDINARY_CLOUD_NAME` | public (runtime-env.js) | delivery URLs + enables admin Cloudinary uploads |
   | `CLOUDINARY_API_KEY` | server-only | signed upload / signed destroy |
   | `CLOUDINARY_API_SECRET` | server-only | signature (never sent to the browser) |
   | `SUPABASE_SERVICE_ROLE_KEY` | server-only (already used by other APIs) | admin verification + cleanup queue |

4. Upload a test photo and video from Admin → catalog media. Rows appear as `storage_bucket='cloudinary'`.
5. Migrate existing files in batches (one-time Supabase egress ≈ bucket size):

   ```bash
   node scripts/migrate-media-to-cloudinary.mjs                      # dry-run
   node scripts/migrate-media-to-cloudinary.mjs --apply --limit=25   # batch
   node scripts/migrate-media-to-cloudinary.mjs --apply --delete-source --limit=25  # also delete Supabase copies
   node scripts/migrate-media-to-cloudinary.mjs --rollback=<report>.json --apply    # revert (source not deleted)
   ```

Keep `CLOUDINARY_CLOUD_NAME` set as long as Cloudinary rows exist (the DB projection also stores the cloud
name per row in `metadata.cloudinary.cloudName`, so vehicle/tour `images`/`cover_image` keep working).

## How it works

- `POST /api/partner?op=cloudinary` (no new Vercel function; Hobby budget 12/12). Verifies the Supabase JWT +
  active `admin_users` row (owner/admin or `content.manage`/`settings.manage`), exactly like
  `media-control-admin-v185`. Actions: `SIGN_UPLOAD`, `DESTROY` (only unreferenced assets), `DRAIN_CLEANUP`.
  Returns `503 CLOUDINARY_NOT_CONFIGURED` when any variable is missing → frontend falls back to Supabase.
- Browser uploads straight to `api.cloudinary.com` (bypasses the 4.5 MB Vercel body limit): single request
  ≤ 6 MB, otherwise 6 MB chunks with `X-Unique-Upload-Id` + `Content-Range`. The server chooses and signs the
  `public_id`: `alperler/catalog/<vehicle|tour|blog>/<entityId>/<uuid>` or `alperler/admin/<type>/<id>/<purpose>/<uuid>`.
- Existing browser WebP compression (long edge ≤ 1920 px) is kept. Free-plan caps: 10 MB/image, 100 MB/video,
  with translated messages (`mediaUpload.*` in all 9 languages).
- Delivery (fixed widths only — 480/768/1080/1440/1920, never 16 breakpoints):
  - image `https://res.cloudinary.com/<cloud>/image/upload/f_auto,q_auto,w_<n>/<public_id>`
  - video `https://res.cloudinary.com/<cloud>/video/upload/q_auto,vc_auto/<public_id>.mp4`
- Deletion: removing a Cloudinary row fires the DB delete trigger → `media_cleanup_jobs_v198`
  (`storage_bucket='cloudinary'`, `resource_type`) → drained by `DRAIN_CLEANUP` (signed destroy) right after
  the admin removes the item, and whenever Admin → "cleanup" runs.
- If the variables are set before the migration is applied, the create RPC answers `INVALID_MEDIA_STORAGE`;
  the frontend destroys the just-uploaded Cloudinary asset and silently uses Supabase Storage.
- CSP already allows `https:` for `img-src`, `media-src`, `connect-src` (vercel.json, public/_headers, server.ts);
  `npm run cloudinary:v249` guards that.

## Not moved (intentionally)

- Campaign covers (the v199 cover-binding trigger parses Supabase paths) and branch-portal uploads stay on
  Supabase Storage. Branch hero media rows are skipped by the migration script.
- Admin homepage/settings images already stored as Supabase URLs inside `site_config` are not rewritten by the
  script; re-upload them from Admin to move them.
