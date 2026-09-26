/**
 * V252 — plain-JS mirror of api/_lib/media-provider.ts resolveMediaProvider() for build
 * scripts (write-runtime-env, migrate-media). tests/unit/media-provider.test.ts asserts both
 * agree on every env combination. Returns only public values (provider + R2 public base).
 */
export function resolveMediaProviderFromEnv(source) {
  const get = (name) => String(source[name] ?? '').trim();
  const base = get('R2_PUBLIC_BASE_URL').replace(/\/+$/, '');
  const r2 = /^[a-f0-9]{32}$/i.test(get('R2_ACCOUNT_ID')) && get('R2_ACCESS_KEY_ID').length >= 16
    && get('R2_SECRET_ACCESS_KEY').length >= 32 && /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(get('R2_BUCKET'))
    && /^https:\/\/[A-Za-z0-9.-]+(:[0-9]{2,5})?(\/[A-Za-z0-9._~-]+)*$/.test(base);
  const cloudinary = /^[A-Za-z0-9_-]{1,64}$/.test(get('CLOUDINARY_CLOUD_NAME')) && get('CLOUDINARY_API_KEY').length > 0 && get('CLOUDINARY_API_SECRET').length > 0;
  const requested = (get('MEDIA_PROVIDER') || 'auto').toLowerCase();
  if (requested === 'supabase') return { provider: 'supabase', r2Base: r2 ? base : '' };
  if (requested === 'r2' && r2) return { provider: 'r2', r2Base: base };
  if (requested === 'cloudinary' && cloudinary) return { provider: 'cloudinary', r2Base: r2 ? base : '' };
  return { provider: r2 ? 'r2' : cloudinary ? 'cloudinary' : 'supabase', r2Base: r2 ? base : '' };
}
