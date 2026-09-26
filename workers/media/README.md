# alperler-media Worker (V252)

Read-only public delivery for the Cloudflare R2 media bucket. **Not deployed by CI** and excluded from
Vercel (`.vercelignore`). The Vercel API never proxies media bytes: browsers upload straight to R2 with
15-minute presigned PUT URLs from `/api/partner?op=media-upload`, and everyone reads through this Worker.

- `GET`/`HEAD`/`OPTIONS` only, and only for keys that follow the upload contract
  `alperler/<catalog|branch|admin|ops>/…/<stem>/(w480|w768|w1080|w1440|w1920).(webp|jpg) | orig.* | video.(mp4|webm)`.
- `Cache-Control: public, max-age=31536000, immutable` (every upload gets a fresh random stem, so objects never change),
  strong ETag, 304s, byte ranges for video seeking, `Access-Control-Allow-Origin: *`.
- The Cache API is a no-op on `*.workers.dev`; once a custom domain is attached the edge cache kicks in automatically.
  R2 egress is free either way — only Class B reads are counted (10 M/month free).

## First deploy

```bash
# 0. Cloudflare account with R2 enabled (needs a card on file; the free tier covers 10 GB + 1 M writes + 10 M reads / month).
npx wrangler@latest login

# 1. Bucket (name must match wrangler.toml bucket_name and the R2_BUCKET env var)
npx wrangler@latest r2 bucket create alperler-media

# 2. Worker → https://alperler-media.<your-subdomain>.workers.dev
cd workers/media && npx wrangler@latest deploy

# 3. Browser PUT CORS on the bucket (edit the placeholder origin in r2-cors.json first)
npx wrangler@latest r2 bucket cors set alperler-media --file r2-cors.json

# 4. R2 API token: Dashboard → R2 → Manage R2 API Tokens → Create
#    Permissions: "Object Read & Write", scoped to bucket alperler-media only.
#    Copy the Access Key ID + Secret Access Key (shown once) and the Account ID.
```

Smoke test: `curl -I https://alperler-media.<sub>.workers.dev/alperler/catalog/x/y/w480.webp` → `404` with CORS headers;
`curl -X PUT …` → `405`.

## Custom domain later

Workers → alperler-media → Settings → Domains & Routes → add e.g. `media.<your-domain>`. Then:

1. Set `R2_PUBLIC_BASE_URL=https://media.<your-domain>` in Vercel and `vercel deploy --prod`.
2. Rewrite stored absolute URLs once (service_role, idempotent):
   `select public.service_rebase_r2_media_v252('https://alperler-media.<sub>.workers.dev', 'https://media.<your-domain>');`
3. Add the new site origin to `r2-cors.json` if the site origin changed, re-run step 3.

Keep the workers.dev route enabled for a while so cached pages keep working.
