# Alperler Rent A Car - Production Operator Runbook

Bu dokümanın amacı, production yayına alındıktan sonra günlük işletme ayarlarını yazılım değiştirmeden yönetebilmektir. Runtime davranışının otoritesi Admin paneli + Supabase verisidir. Bu dosya secret içermez ve hiçbir gerçek API anahtarı repoya yazılmamalıdır.

## 1. Admin içinde hangi iş nereden yönetilir?

### Muhasebe & Tahsilat

Admin yolu: `/admin/finance`

Buradan:
- günlük/haftalık/aylık/yıllık gelir-gider özeti,
- açık alacaklar,
- Ofis/Nakit ve Havale/EFT tahsilatı,
- manuel gelir/gider kayıtları,
- ödeme bağlantılı muhasebe hareketleri,
- Resend e-posta bağlantısı,
- Twilio SMS bağlantısı,
- müşteriye giden rezervasyon/ödeme mesaj şablonları,
- finans hareketleri ve PDF raporu

yönetilir.

Ofis veya EFT tahsilatı yalnız müşteriden para gerçekten alındıktan sonra kaydedilir. Rezervasyon oluşturulması tek başına tahsilat değildir. Gerçek tahsilat kaydı `payment_transactions` üzerinden muhasebeye tek transaction gerçeğiyle senkronize edilir.

### Ödeme ve Depozito

Admin yolu: `/admin/payments`

Buradan:
- aktif kart sağlayıcısı `PayTR / iyzico / Kapalı`,
- Kart aç/kapat,
- Havale/EFT aç/kapat,
- Ofiste ödeme aç/kapat,
- Test/Sandbox modu,
- depozito kuralı,
- para birimi,
- banka/IBAN,
- PayTR güvenli credential seti,
- iyzico Sandbox credential seti,
- iyzico Live credential seti,
- callback/notification adresleri ve provider readiness

yönetilir.

Admin ekranı seçili sağlayıcının gerekli anahtar seti hazır değilse Kart seçeneğinin aktif kaydedilmesini engeller. Sunucu ödeme API'si de ayrıca fail-closed kontrol yapar.

### Operasyon & Filo

Admin yolu: `/admin/operations`

Buradan:
- bugün gelen rezervasyonlar,
- bugün başlayan rezervasyonlar,
- bugün bitecek rezervasyonlar,
- yaklaşan 7 günlük rezervasyonlar,
- Ofiste ödeme bekleyenler,
- EFT bekleyenler,
- açık mesajlar/partner talepleri,
- başarısız bildirimler,
- operasyon iş yükü

takip edilir.

### Mobil alt menü

Production müşteri sözleşmesi:

`Kiralık - Satılık - Ara - Fırsatlar - Profil`

Randevu sayfası ve admin yönetimi vardır ancak beşli mobil alt dock içinde değildir.

## 2. PayTR kurulumu

Resmi geliştirici merkezi: https://dev.paytr.com/

PayTR hesabı/işyeri onayı PayTR tarafında yapılır. PayTR sana şu değerleri verdiğinde Admin > Muhasebe & Tahsilat > Ödeme ve Depozito ekranındaki PayTR Güvenli Bağlantı formuna gir:

- Merchant ID / Merchant No
- Merchant Key
- Merchant Salt

Değerler Supabase Vault'a şifreli kaydedilir ve kayıt sonrası tarayıcıya geri gösterilmez.

PayTR panelinde Bildirim URL olarak Admin ekranında gösterilen canlı adresi kullan. Üretim biçimi:

`https://ALAN-ADIN/api/payments?op=paytr-callback`

PayTR callback endpointi session gerektirmez, kendi HMAC doğrulamasını yapar ve geçerli işlemden sonra `OK` döner. Sipariş tutarı tarayıcıdan gelen değere güvenilerek değil canonical booking kaydından hesaplanır.

İlk kurulum sırası:
1. PayTR hesabı ve işyeri onayı.
2. Credential setini Vault'a kaydet.
3. Kart kapalı, Test/Sandbox açık kalsın.
4. PayTR paneline Bildirim URL'yi gir.
5. Kontrollü test ödeme yap.
6. `payment_transactions`, rezervasyon ödeme durumu ve muhasebe hareketini kontrol et.
7. Canlı onayı geldikten sonra test modunu kapatıp Kart'ı Admin'den aç.

## 3. iyzico kurulumu

Resmi dokümantasyon: https://docs.iyzico.com/

Checkout Form API'si canlıda HTTPS callback kullanır ve IYZWSv2 imzalı sunucu çağrılarıyla çalışır.

Admin > Muhasebe & Tahsilat > Ödeme ve Depozito ekranında iki ayrı credential seti vardır:

Sandbox:
- API Key
- Secret Key

Live:
- API Key
- Secret Key

İki set aynı anda Vault'ta bulunabilir. Test/Sandbox anahtarı hangi setin kullanılacağını belirler.

Checkout callback biçimi:

`https://ALAN-ADIN/api/payments?op=iyzico-callback`

Fraud / IFN biçimi:

`https://ALAN-ADIN/api/payments?op=iyzico-fraud-notification`

IFN payload'ı tek başına para durumunu değiştirmez. Sunucu iyzico'ya yeniden imzalı sorgu yapar; status, signature, tutar, currency ve fraud sonucu yeniden doğrulanır.

`fraudStatus=0` olan işlem müşteriye hizmet verilmiş/ödenmiş kabul edilmez. İnceleme tamamlanana kadar bekler. İnceleme sonrası `-1` olan işlem REFUNDED olarak muhasebeleştirilir.

## 4. E-posta: Resend

Resmi API key dokümantasyonu: https://resend.com/docs/dashboard/api-keys/introduction

Domain dokümantasyonu: https://resend.com/docs/api-reference/domains/create-domain

Production e-posta için önce Resend hesabında gönderim domainini ekle ve Resend'in verdiği DNS kayıtlarını alan adı DNS paneline girip doğrula.

Sonra Admin > Muhasebe & Tahsilat içindeki Resend bağlantı bölümünde:
- API Key,
- From adresi,
- yönetici bildirim alıcı adresi

bilgilerini kaydet.

API key yalnız bir kez gösterilebildiği için provider panelinden aldıktan sonra doğrudan Admin'deki güvenli alana gir. Secret normal site_config veya frontend source'a yazılmaz.

Rezervasyon bildirimleri 7 event x 4 dil olmak üzere veritabanı şablonlarından yönetilir. Şablonlar Admin'den değiştirilebilir ve kod deploy'u gerektirmez.

Temel eventler:
- Rezervasyon alındı
- Kontrol ediliyor
- Onaylandı
- Reddedildi
- Tamamlandı
- İptal edildi
- Ödeme alındı

Ofiste ödeme rezervasyon maili makbuz gibi davranmaz. Müşteriye ödeme yöntemini, toplam/ödenen/kalan tutarı ve tahsilatın ofiste yapılacağını açıklar. Para gerçekten kaydedildiğinde ayrı `payment_received` bildirimi oluşur.

## 5. SMS: Twilio

Resmi SMS quickstart: https://www.twilio.com/docs/messaging/quickstart

Messaging Services: https://www.twilio.com/docs/messaging/services

Twilio Console'da:
- Account SID,
- Auth Token,
- SMS gönderebilen telefon numarası veya Messaging Service SID

oluşturulur/alınır.

Admin > Muhasebe & Tahsilat içindeki Twilio güvenli bağlantı formuna bu değerleri gir. Production için trial kısıtları yerine gerçek mesajlaşma hesabı/numarası ve ülke bazlı gerekli sender/registration onayları tamamlanmalıdır.

Twilio bağlamak zorunlu değildir. SMS kapalı/bağlı değilken e-posta akışı bağımsız çalışabilir.

## 6. Otomatik mesaj şablonları

Müşteriye giden metinlerin runtime sahibi `notification_templates` tablosudur. Normal kullanıcı bu tabloya doğrudan erişemez; RLS açıktır ve Admin değişiklikleri yalnız yetkili service-role gateway üzerinden yapılır.

Şablon düzenlerken serbest HTML veya script ekleme. Admin ekranının izin verdiği güvenli tokenları kullan. Örnek operasyonel tokenlar rezervasyon referansı, müşteri adı, hizmet, tarihler, toplam, ödeme yöntemi, ödenen ve kalan tutar gibi canonical veriden türetilir.

Teknik hata kodlarını müşteri metnine yazma.

## 7. Domain + Vercel

Gerçek alan adı satın alındıktan sonra:
1. Vercel production projesine domain ekle.
2. Vercel'in istediği DNS kayıtlarını domain sağlayıcısında uygula.
3. HTTPS/TLS aktif olup domain production uygulamasını gerçekten açmadan custom origin değerlerini değiştirme.
4. Payment callback adreslerinin Admin ekranında yeni HTTPS domain ile üretildiğini kontrol et.
5. PayTR/iyzico panellerindeki callback/notification adreslerini yeni domain ile eşitle.
6. Resend gönderim domainini DNS ile doğrula.

Uygulama public origin çözümlemesinde `APP_PUBLIC_ORIGIN`, `PUBLIC_APP_URL`, `SITE_URL` ve Vercel production/deployment host zincirini destekler. Domain yokken localhost veya uydurma domain production otoritesi yapılmamalıdır.

## 8. Supabase Auth production URL ayarı

Resmi Supabase Redirect URL dokümantasyonu: https://supabase.com/docs/guides/auth/redirect-urls

Supabase Dashboard > Authentication > URL Configuration bölümünde:
- Site URL gerçek production HTTPS domain olmalı.
- Uygulamanın kullandığı auth dönüş adresleri Redirect URLs allow-listesinde olmalı.
- Admin parola kurtarma dönüşü `/admin/login?recovery=1` akışını production domain üzerinde desteklemeli.
- E-posta template'lerinde literal `localhost` adresi bırakılmamalı.

Supabase Site URL, uygulama `redirectTo` vermediğinde varsayılan dönüş adresidir. `redirectTo` kullanıldığında hedef allow-list ile uyuşmalıdır.

Bu ayar Supabase hosted Auth yapılandırmasıdır; SQL migration değildir.

## 9. Supabase parola güvenliği

Resmi dokümantasyon: https://supabase.com/docs/guides/auth/password-security

Supabase Dashboard Auth ayarlarında mümkün olan en güçlü password policy kullanılmalı. Plan destekliyorsa `Leaked Password Protection` açılmalıdır. Supabase bu özelliği bilinen sızmış parolaları reddetmek için HaveIBeenPwned Pwned Passwords verisiyle kullanır.

Uygulamanın kendi güçlü parola/HIBP koruması bu platform ayarının yerine geçmez; ikisi savunma katmanlarıdır.

## 10. GitHub main koruması

Resmi ruleset dokümantasyonu: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets

GitHub repository > Settings > Rules > Rulesets altında `main` için aktif bir branch ruleset oluştur.

Önerilen minimum kurallar:
- değişiklikler Pull Request üzerinden gelsin,
- force push kapalı,
- branch deletion kapalı,
- merge öncesi gerekli status checks başarılı olsun,
- kritik release/device/security kontrolleri required check olarak seçilsin,
- mümkünse bypass yalnız gerçek acil durum sahipleriyle sınırlı olsun.

Current release zincirinde `release-static` ve `release-devices` temel yayın kapılarıdır. CodeQL/security kontrolleri de korunmalıdır. Job isimlerini değiştirdiğinde ruleset required-check listesini de kontrol et.

Ruleset/branch protection GitHub platform ayarıdır; application code veya Supabase migration ile değiştirilmez.

## 11. Günlük işletme kontrol listesi

Admin'e girdiğinde önce Operasyon & Filo ekranını kontrol et:
- bugün gelenler,
- bugün başlayanlar,
- bugün bitecekler,
- yaklaşan 7 gün,
- ofiste tahsilat bekleyenler,
- EFT bekleyenler,
- başarısız bildirimler.

Sonra gerekirse Muhasebe & Tahsilat ekranından gerçek tahsilatı kaydet. Para alınmadan ödeme kaydı oluşturma.

Ödeme sağlayıcı arızasında:
- önce Admin'den Kart'ı kapat veya sağlayıcıyı `Online kart kapalı` yap,
- platform çapında acil durum varsa server-only `PAYMENT_CARD_KILL_SWITCH=true` kullan,
- eski transaction kayıtlarını silme.

Bildirim sağlayıcı arızasında:
- Resend/Twilio readiness durumunu Admin'den kontrol et,
- secret rotasyonunda tam yeni credential setini kaydet,
- eski gönderim loglarını silme.

## 12. Yayına çıkmadan son doğrulama

Aşağıdakiler tamamlanmadan gerçek para/e-posta/SMS hizmetini aktif kabul etme:
- custom domain HTTPS çalışıyor,
- Supabase Auth Site URL ve Redirect URLs doğru,
- PayTR ve/veya iyzico merchant hesabı onaylı,
- seçili provider credential seti Admin'de Ready,
- callback/notification adresleri provider panelinde doğru,
- kontrollü test ödeme sonucu booking + payment transaction + finance ledger ile eşleşiyor,
- Resend domaini verified ve test maili gerçek alıcıya ulaşıyor,
- SMS kullanılacaksa Twilio sender/number hazır ve test SMS ulaşıyor,
- Admin Operasyon ekranında rezervasyon/ödeme bakiyeleri doğru,
- GitHub release-static ve release-devices yeşil,
- Vercel production deploy current main SHA için SUCCESS,
- main ruleset/protection aktif.

Bu kontrol listesi tamamlandıktan sonra normal işletme değişiklikleri için kod değiştirmek gerekmez. Sağlayıcı secret rotasyonu, ödeme aç/kapat, aktif kart sağlayıcısı, depozito, EFT/Ofis, mesaj şablonları ve günlük operasyon takibi Admin panelinden yönetilir.
