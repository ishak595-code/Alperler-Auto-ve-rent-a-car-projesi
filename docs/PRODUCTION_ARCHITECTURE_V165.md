# Alperler Rent A Car V165 Production Architecture

Bu belge V165 sonrasında projeye dokunacak geliştiriciler için bağlayıcı teknik sözleşmedir. Amaç aynı işi yapan paralel mekanizmaların, yetki bypass'larının ve eski sürüm davranışlarının yeniden oluşmasını engellemektir.

## 1. Kaynak doğruluk sırası

Production veri akışında tek gerçek kaynak sırası şöyledir:

1. Supabase PostgreSQL: iş verisi ve iş kuralları
2. Supabase Auth: kullanıcı kimliği ve doğrulanmış e-posta
3. Supabase Storage: dosya ve medya
4. Supabase Edge Functions: service-role gerektiren veya güvenli gateway arkasında çalışan sunucu mantığı
5. Vercel `/api/*`: same-origin BFF, ödeme webhook sınırı, public gateway ve server-side entegrasyonlar
6. Angular frontend: sunucunun verdiği yetkiyi ve veriyi kullanan istemci

Frontend hiçbir zaman yetki kaynağı değildir. Local/session storage hiçbir zaman rol veya sahiplik kaynağı değildir.

## 2. Değiştirilemez rezervasyon invariantı

- `PENDING`: müşteri talebidir, aracı bloke etmez.
- `APPROVED`: admin onayıdır, aynı zaman aralığında araç stokunu bloke eder.
- Çakışma kontrolü onay aşamasında atomik olarak veritabanında yapılır.
- UI uygunluk göstergesi bu DB invariantının yerine geçemez.

Bu kuralı değiştiren migration veya frontend değişikliği ayrı iş kararı ve regression testi olmadan merge edilemez.

## 3. Kimlik ve yetkilendirme

### Admin

Admin kimliği Supabase Auth JWT ile doğrulanır. Yetki `public.admin_users` ve private authorization helper'ları üzerinden çözülür. E-posta doğrulanmamış hesap yönetim yetkisi alamaz.

### Müşteri

Rezervasyon sahipliği profil içindeki değiştirilebilir e-posta alanına göre kurulmaz. Sahiplik işlemlerinde Supabase Auth içindeki doğrulanmış kullanıcı ve doğrulanmış e-posta esas alınır.

### Şube sahibi

Şube başvurusu e-postası tek başına yetki vermez.

Akış:

1. Merkez başvuruyu onaylar.
2. Şube oluşturulur ve `branch_access_invites` kaydı oluşur.
3. Auth hesabı varsa yalnız doğrulanmış e-posta eşleşmesinde üyelik bağlanabilir.
4. Davet alan kullanıcı oturum açar.
5. `branch-access-v165` JWT'yi Supabase Auth üzerinden yeniden doğrular.
6. `claim_branch_access_by_identity` DB RPC'si Auth kimliğini ikinci kez doğrular.
7. Aktif membership oluşmadan portal yetkili sayılmaz.

`branch_memberships` tablosuna istemciden doğrudan üyelik üretmek yasaktır.

## 4. Tarayıcı oturumları

Şube portalı access/refresh tokenları `sessionStorage` kullanır. Kalıcı `localStorage` token depolaması V165 sonrası yasaktır.

Bir XSS olayı yine aktif browser oturumunu hedefleyebileceği için bu tek başına savunma değildir. Asıl savunma CSP, kısa token ömrü, server-side JWT doğrulaması ve RLS/RPC yetkilendirmesidir.

## 5. HTTP trust boundary

### Browser -> Vercel BFF

`api/_lib/request-security.ts` merkezi origin allow-list, request-id ve CORS standardıdır. Booking ve partner BFF'leri bu helper'ı kullanır.

### Browser -> Supabase Edge

Doğrudan browser tarafından çağrılabilen güvenlik-kritik Edge Function kendi origin allow-list'ini de uygular. V165 `branch-access-v165` ve şube başvuru gateway'i bu ikinci sınırı uygular. Böylece Vercel BFF atlanmaya çalışılsa bile rastgele bir web origin'i Supabase Edge katmanından CORS yetkisi alamaz. Public başvuru akışı ayrıca kalıcı veritabanı rate-limit, input validation ve honeypot koruması kullanır.

### Payment callback

PayTR callback browser CORS modeli değildir. Bu yol origin yerine sağlayıcı HMAC imzası, timing-safe comparison, transaction lookup, amount doğrulama ve idempotent terminal durum kontrolü ile korunur. Bu webhook'a browser origin kontrolü eklemek yanlıştır.

## 6. Content Security Policy

Production Tailwind Play CDN kaldırılmıştır. Tailwind Angular build sırasında PostCSS üzerinden statik CSS üretir.

- `@tailwindcss/postcss`: exact version
- `postcss`: exact version
- `tailwindcss`: exact version
- `.postcssrc.json`: build plugin tanımı
- `src/tailwind.css`: Tailwind giriş dosyası ve `source("../")` ile proje köküne sabitlenmiş source detection

`index.html` executable runtime bootstrap içermez. `window.process` `/runtime-env.js` üzerinden same-origin yüklenir.

CSP'de `script-src 'unsafe-inline'` yasaktır. Inline JSON-LD yalnız SHA-256 hash ile izinlidir. JSON-LD değişirse `vercel.json` CSP hash'i aynı commit içinde güncellenmelidir. `npm run security:v165` bu eşleşmeyi otomatik kontrol eder.

Angular component style injection nedeniyle `style-src 'unsafe-inline'` şimdilik korunmaktadır. Bunu nonce tabanlı modele taşımadan kaldırmak UI'ı bozabilir.

## 7. Veritabanı güvenliği

- Client-exposed tablolarda RLS zorunludur.
- Yeni tablo/fonksiyon/sequence için explicit grant gerekir.
- Application-owned yeni nesnelerde V165 default privileges `default deny` yönünde ayarlanır.
- Platform-owned `supabase_admin` default ACL uygulama migration rolü tarafından değiştirilemediği için CI ve migration review yeni nesnelerde explicit izin kontrolünü zorunlu tutar.
- SECURITY DEFINER fonksiyonlarda kontrollü `search_path` zorunludur.
- Yetki helper'ları mümkün olduğunda `private` şemasında tutulur.
- `service_role` anahtarı frontend bundle'a hiçbir koşulda giremez.

## 8. Analitik ve sosyal kanıt

Ham `visitor_events` müşteri arayüzüne açılmaz.

Kampanya sosyal kanıtı:

1. consent verilmiş gerçek analytics event'lerinden üretilir,
2. yalnız anonimleştirilmiş aggregate metrik olarak `campaign_social_proof_cache` içine yazılır,
3. public UI cache/RPC sözleşmesi üzerinden aggregate değer okur,
4. ham visitor/session/IP verisi public RPC tarafından bypass edilmez.

Sahte sayaç, rastgele kullanıcı sayısı veya frontend'de üretilmiş sosyal kanıt eklemek yasaktır.

## 9. Storage

- `customer-documents`: private
- `partner-uploads`: private
- araç/tur/catalog medya: public yayın amacıyla açık, MIME ve dosya boyutu sınırlarıyla korunur
- private belgeler public URL'ye çevrilmez
- upload yetkisi Storage RLS ve ilgili server-side iş akışıyla kontrol edilir

## 10. Legacy ve paralel mekanizma kuralı

Yeni bir özellik eklemeden önce aynı işi yapan mevcut service, Edge Function, RPC, migration veya API route aranmalıdır.

Yasak örnekler:

- ikinci bir rezervasyon uygunluk algoritması
- ikinci bir admin rol tablosu
- localStorage tabanlı rol/izin
- mock/fallback production katalog
- aynı entity için paralel public API
- RLS yerine sadece frontend guard
- service-role ile doğrudan browser erişimi
- sürümsüz CDN runtime dependency

Yeni mekanizma eski mekanizmanın yerini alıyorsa aynı PR'da eski yol kaldırılmalı veya açıkça compatibility adapter olarak belgelenmelidir.

## 11. Migration standardı

Migration:

- ileri yönlü ve idempotent olabildiği ölçüde güvenli olmalı,
- business data silmemeli,
- mevcut invariantları doğrulamalı,
- RLS/grant/function search_path etkisini açıkça göstermeli,
- rollback veya forward-fix stratejisi dokümante edilmeden riskli destructive DDL içermemeli.

Production DB'ye merge öncesi rastgele DDL uygulanmaz. Önce transaction/rollback doğrulaması, CI ve advisor kontrolü yapılır.

## 12. Kalite kapıları

Merge öncesi en az şu komutlar yeşil olmalıdır:

```bash
npm ci --no-audit --no-fund
npm run security:v165
npm audit --omit=dev --audit-level=high
npm run lint
npx tsc --noEmit -p tsconfig.api.json
npm run a11y:buttons
npm run a11y:dates
npm run media:vehicles
npm run vercel:functions
npm run design:premium
npm run pwa:installability
npm run build
```

Supabase Edge Functions için Deno type-check V165 workflow'unda ayrıca çalışır.

## 13. Deployment kuralı

`vercel.json` Git deployment ayarında yalnız `main` production deploy kaynağıdır. Hardening branch doğrudan production'a otomatik deploy edilmez.

Sıra:

1. feature/hardening branch
2. static guards
3. TypeScript + Deno
4. production Angular build
5. PR CI
6. Supabase migration/advisor doğrulaması
7. merge
8. production deployment
9. smoke test ve runtime error kontrolü

## 14. V165 migrationları

- `20260825143000_v165_security_defaults_identity.sql`: default ACL, verified customer identity, private authorization hardening
- `20260825143100_v165_campaign_proof_cache.sql`: privacy-safe campaign aggregate cache ve refresh
- `20260825143200_v165_branch_access_claim.sql`: doğrulanmış branch identity claim ve membership lifecycle

Bu üç migration birbirinden bağımsız özellik gibi görülmemelidir. V165 güvenlik modelinin tek paketidir.

## 15. Merge kriteri

V165 ancak aşağıdakilerin tümü doğruysa merge edilir:

- V165 workflow success
- mevcut ana kalite workflow'ları success
- production build success
- high/critical production npm vulnerability yok
- Supabase security advisor yeni kritik açık göstermiyor
- migration SQL transaction doğrulaması geçiyor
- CSP hash guard geçiyor
- Tailwind utility CSS dist içinde gerçekten oluşuyor
- PENDING/APPROVED rezervasyon invariantı korunuyor
- production smoke testte yeni 4xx/5xx regresyonu yok

Bu kriterlerden biri başarısızsa merge ertelenir; gate kapatılmaz veya bypass edilmez.
