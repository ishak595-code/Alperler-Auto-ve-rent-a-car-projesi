# Domain launch checklist (V256)

Run these in order on the day the custom domain is attached. `https://ALAN-ADI` below means the final HTTPS origin, for example `https://www.example.com.tr`, with no trailing slash. Nothing here can be prepared earlier, because every step needs the real domain.

## Already domain-proof (no action)

- **R2 photos and videos.** The site sends `Referrer-Policy: same-origin`, so the media Worker never sees a foreign Referer and serves our files on any domain. Enforced by `scripts/check-cyber-hardening-v179.mjs` and `tests/unit/referrer-policy.test.ts`.
- **Legacy catalogue media.** `/catalog-media/*` is a relative Vercel rewrite and works on every host.
- **Sitemap, robots.txt, social previews.** Built from the request host at runtime.

## 1. Vercel

1. Project → Settings → Domains: add the domain and complete DNS.
2. Project → Settings → Environment Variables (Production): set to `https://ALAN-ADI`
   - `APP_PUBLIC_ORIGIN`, `PUBLIC_APP_URL`, `SITE_URL`, `PUBLIC_SITE_URL`
   - `APP_ALLOWED_ORIGINS` and `PAYMENT_ALLOWED_ORIGINS` (comma-separated; keep the vercel.app origin as well during the switch)
3. Redeploy production so `runtime-env.js` picks up the new origin.

## 2. Supabase

1. Edge Functions → Secrets: `PUBLIC_SITE_URL=https://ALAN-ADI` (14 functions read it for their origin allow-list; `*.vercel.app` stays allowed automatically). If `APP_ALLOWED_ORIGINS` is set there, add the domain to it.
2. Authentication → URL Configuration:
   - Site URL: `https://ALAN-ADI`
   - Redirect URLs: `https://ALAN-ADI/account/callback`, `https://ALAN-ADI/account/login`, `https://ALAN-ADI/admin/login`

## 3. Payment and e-mail providers

1. PayTR merchant panel → notification (callback) URL: `https://ALAN-ADI/api/payments/paytr-callback`
2. iyzico: no stored callback (sent per request), nothing to change.
3. Resend: verify the domain if outgoing mail should use an address on it, then update `MAIL_FROM`.

## 4. Optional

- R2 Worker: add the domain to `ALLOWED_REFERER_HOSTS` in `workers/media/wrangler.toml` (or the Worker's Variables in the Cloudflare dashboard). Not required while the site sends no cross-origin Referer.
- Attach a custom media domain to the Worker and rebase stored URLs with `service_rebase_r2_media_v252` (see `docs/MEDIA_STORAGE_V252.md`).

## 5. Verify

- Home, `/fleet`, a vehicle detail page and a tour detail page show photos.
- Customer password reset e-mail links to the new domain.
- Admin login works and the admin booking list loads.
- `https://ALAN-ADI/robots.txt` and `https://ALAN-ADI/sitemap.xml` list the new host.
