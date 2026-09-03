# Alperler Rent A Car V244 Tam Teslimat ve Yeniden Kurulum Rehberi

Bu dosya, projenin başka bir sunucuya, başka bir Vercel hesabına, genel bir Node.js hostuna veya Docker ortamına yeniden kurulabilmesi için hazırlanmıştır.

## 1. Bu paketin kimliği

- Kaynak depo: `ishak595-code/Alperler-Auto-ve-rent-a-car-projesi`
- Production kaynak commit: `a2d3195c18bfe280ad0492c81ff3f3ab1a1fb3db`
- Sürüm: V244
- Runtime: Node.js 22+
- Frontend: Angular
- Uygulama backend'i: Supabase PostgreSQL + Auth + Storage + Edge Functions
- Web/BFF runtime: provider-neutral Node/Express (`server.ts`)
- Container runtime: `Dockerfile`
- Vercel: isteğe bağlı hosting adaptörü (`vercel.json`)

Bu teslimat dalında üretim kodu değiştirilmemiştir. Yalnız bu rehber ve ZIP artifact üretim workflow'u eklenmiştir.

## 2. ZIP içinde ne bulunur

Paket, Git deposundaki proje dosyalarının tamamını ve ayrıca CI ortamında yeniden üretilmiş `dist/` production build çıktısını içerir. Özellikle:

- `src/`: Angular uygulamasının tüm kaynak kodu
- `api/`: aynı-origin BFF/API endpointleri
- `server.ts`: Vercel'e bağımlı olmayan Node/Express runtime
- `Dockerfile` ve `.dockerignore`
- `vercel.json`: Vercel kullanılırsa routing/build adaptörü
- `supabase/migrations/`: veritabanı migration geçmişi
- `supabase/functions/`: Supabase Edge Function kaynakları
- Edge Function deployment manifesti ve ilgili konfigürasyonlar
- `public/`: PWA ve statik varlıklar
- `scripts/`: güvenlik, regression, portability ve handoff kontrolleri
- `.github/workflows/`: CI kalite/güvenlik kapıları
- `package.json` ve `package-lock.json`: exact dependency graph
- `.env.example`: gerekli environment variable isimleri ve açıklamaları
- `docs/HOSTING_HANDOFF_V244.md`: hosting taşıma rehberi
- bu `TESLIMAT_KURULUM_REHBERI_V244_TR.md`
- `dist/`: yeniden oluşturulmuş production frontend build
- `PACKAGE_MANIFEST.txt`: ZIP üretilirken oluşturulan dosya listesi
- `BUILD_PROOF.txt`: paketin hangi committen üretildiğini ve hangi doğrulamaların geçtiğini gösterir

`node_modules/` bilinçli olarak pakete konmaz. Platforma bağımlı ve çok büyük olduğu için taşınabilir değildir. Exact bağımlılıklar `package-lock.json` ile `npm ci` kullanılarak tekrar kurulur.

## 3. Güvenlik açısından pakete bilinçli olarak KONMAYAN şeyler

Gerçek secret değerleri hiçbir kaynak ZIP'inde bulunmamalıdır. Özellikle aşağıdakilerin gerçek production değerleri pakete konmaz:

- `SUPABASE_SERVICE_ROLE_KEY`
- ödeme sağlayıcı secret/key değerleri
- SMTP parolaları
- Resend API key
- Twilio token
- telematics webhook/command secrets
- Google Ads / Meta Ads tokenları
- diğer provider secretları

Bunlar hedef hosting ortamının secret/environment ayarlarında veya Supabase Vault içinde yeniden tanımlanır. `.env.example` hangi değişkenlerin gerektiğini gösterir.

Ayrıca canlı müşteri verisi, şifreler, auth sessionları veya ödeme kart verileri bu ZIP'e kopyalanmaz. Canlı veri Supabase projesinde kalır. Mevcut production Supabase projesine bağlanılırsa web hostunu değiştirmek için veritabanını taşımak gerekmez.

## 4. En hızlı kurulum: Generic Node host

Gerekenler:

- Node.js 22 veya daha yeni
- npm
- HTTPS domain
- mevcut veya yeni Supabase projesi

Komutlar:

```bash
cp .env.example .env
# .env içindeki gerçek environment değerlerini sunucunun secret manager'ında tanımlayın.
npm ci
npm run build
npm start
```

Uygulama varsayılan olarak `PORT=3000` üzerinden çalışır. Sağlık kontrolü:

```text
GET /health
```

Beklenen cevap HTTP 200 ve JSON içinde `ok: true` değeridir.

## 5. Docker ile kurulum

```bash
docker build -t alperler-rent-a-car .
docker run --rm -p 3000:3000 --env-file .env alperler-rent-a-car
```

Container aynı origin altında Angular build'i ve API/BFF katmanını birlikte servis eder.

## 6. Yeni Vercel projesine kurulum

1. GitHub deposunu yeni Vercel projesine import edin.
2. Production branch olarak `main` seçin.
3. Eski `.vercel/project.json` dosyasını taşımayın. Repo zaten belirli bir Vercel Project ID'ye bağlı değildir.
4. Node 22 kullanın.
5. Repo içindeki `vercel.json` build, output, güvenlik headerları, SPA routing ve API aliaslarını yönetir.
6. `.env.example` içindeki gerekli değişkenleri Vercel Project Settings > Environment Variables alanına ekleyin.
7. `SUPABASE_PROJECT_URL` ve `SUPABASE_PUBLISHABLE_KEY` doğru Supabase projesine ait olmalıdır.
8. `SUPABASE_SERVICE_ROLE_KEY` sadece server-side secret olmalıdır. Browser/public değişkenine çevrilmemelidir.
9. Final HTTPS domain belli olduğunda `APP_PUBLIC_ORIGIN`, `PUBLIC_APP_URL`, `SITE_URL` ve gerekiyorsa `PUBLIC_SITE_URL` doğru origin ile ayarlanmalıdır.
10. Browser ve API aynı origin'deyse `APP_ALLOWED_ORIGINS` çoğu durumda boş bırakılabilir. Ek origin yalnız gerçekten güvenilen HTTPS origin ise eklenmelidir.
11. Ödeme, SMTP, SMS, reklam ve telematics secretları yalnız ilgili özellik kullanılacaksa tanımlanmalıdır.

## 7. Supabase katmanı

Supabase bu uygulamanın backend veri sahibidir. Aşağıdakiler repo içinde kaynak olarak mevcuttur:

- tüm migration SQL dosyaları
- Edge Function kaynakları
- Storage/DB/RLS ile ilgili migration geçmişi
- deployment manifesti

Yeni, boş bir Supabase projesi kurulacaksa migrationlar kronolojik sırayla uygulanmalı ve Edge Functionlar deployment manifestine göre deploy edilmelidir. Ardından gerekli Edge Function secretları Supabase secret manager/Vault üzerinden tanımlanmalıdır.

Mevcut production Supabase projesi korunacaksa migration geçmişini sıfırdan tekrar çalıştırmayın. Önce uzak veritabanının migration durumunu karşılaştırın. Eksik migration varsa yalnız eksik olanları kontrollü biçimde uygulayın.

## 8. Temel environment değişkenleri

Tüm liste ve açıklamalar `.env.example` içindedir. Minimum web/Supabase bağlantısı için tipik olarak:

```text
APP_PUBLIC_ORIGIN
PUBLIC_APP_URL
SITE_URL
PUBLIC_SITE_URL
APP_ALLOWED_ORIGINS
SUPABASE_PROJECT_URL
SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
NODE_ENV
PORT
```

Ödeme, e-posta, SMS, telematics ve reklam değişkenleri ilgili entegrasyonlar etkinse ayrıca gerekir.

## 9. Başka bir yazılım mühendisi nereden başlamalı

Önce şu dosyaları sırayla okuyun:

1. `TESLIMAT_KURULUM_REHBERI_V244_TR.md`
2. `docs/HOSTING_HANDOFF_V244.md`
3. `.env.example`
4. `package.json`
5. `server.ts`
6. `vercel.json`
7. `Dockerfile`
8. `supabase/` klasörü
9. `api/` klasörü
10. `src/app.routes.ts` ve `src/` altındaki canonical Angular surface/service dosyaları
11. `.github/workflows/` ve `scripts/` altındaki kalite/güvenlik sözleşmeleri

Version numarası içeren eski dosyaları rastgele canonical kabul etmeyin. Route/import/service ownership'i ve mevcut regression kontrollerini okuyarak aktif surface'i belirleyin. Eski migration dosyaları geçmişin parçasıdır ve silinmemelidir.

## 10. Değişiklik yapmadan önce çalıştırılması gereken kontroller

```bash
npm ci
npm run lint
npm run typecheck:api
npm run build
npm run portability:host:v244
npm run verify:handoff
```

`verify:handoff` geniş bir regression ve portability zinciridir. Kırmızı sonuç varken production merge/deploy yapılmamalıdır.

## 11. Deploy sonrası güvenli smoke test

Fake production rezervasyonu veya ödeme oluşturmadan önce:

- `/` HTTP 200
- `/health` HTTP 200 ve `ok: true`
- `/api/integrations/status` JSON döner
- `/api/partner?op=admin-core&view=operations` tokensız çağrıda kontrollü auth hatası döner, platform crash vermez
- `/api/bookings` tokensız GET kontrollü auth hatası döner
- `/api/contact` desteklenmeyen GET için application method error döner
- `/robots.txt`, `/sitemap.xml`, `/manifest.json`, `/service-worker.js`, `/offline.html` resolve olur

Ardından gerçek yetkili admin oturumu ile Kontrol Merkezi, Rezervasyonlar, Araç Değerleme, Bayilik Başvuruları, Mesajlar ve Ayarlar kontrol edilir.

Müşteri tarafında login/account restore, profil alanlarının bağımsız kaydı, avatar upload, referral/account alanları ve kontrollü gerçek rezervasyon akışı doğrulanır.

## 12. Rezervasyon ve fiyat güvenlik sınırı

Browser doğrudan `bookings` tablosuna yazmamalıdır. Rezervasyon; server-side availability, campaign, loyalty, fiyatlandırma ve booking validasyonundan geçmelidir. Client'ın gönderdiği sahte total/discount değeri authoritative kabul edilmemelidir.

Başarılı rezervasyon backend tarafından gerçekten persist edildikten sonra booking reference üretilmeli ve Admin > Operasyonlar > Rezervasyonlar altında görünmelidir.

## 13. Paket bütünlüğü

ZIP artifact oluşturulurken workflow:

- exact dependency graph ile `npm ci` çalıştırır,
- frontend TypeScript kontrolünü çalıştırır,
- API TypeScript kontrolünü çalıştırır,
- production build üretir,
- portable host contractını çalıştırır,
- portable Node smoke testini çalıştırır,
- paket içindeki dosyaların listesini `PACKAGE_MANIFEST.txt` içine yazar,
- build kanıtını `BUILD_PROOF.txt` içine yazar.

Bu sayede başka bir mühendis yalnız kaynak kodu değil, kuruluma ve bağımsız doğrulamaya uygun bir teslimat alır.
