# Rezervasyon E-posta ve SMS Kurulumu

Alperler Rent A Car rezervasyon ve ödeme bildirimlerini tek bir dinamik bildirim motorundan gönderir. Günlük yönetim ve sağlayıcı anahtarları için kod değişikliği gerekmez.

## Admin'de nereden yönetilir?

**Admin > Muhasebe & Tahsilat** (`/admin/finance`)

Bu ekranda üç ilgili bölüm vardır:

1. **E-posta ve SMS Bağlantıları**: Resend ve Twilio bağlantı anahtarları.
2. **Otomatik Müşteri Mesajları**: rezervasyon ve ödeme e-posta ve SMS metinleri, dil ve aktif/pasif durumu.
3. **Ofis / EFT Tahsilatı**: para gerçekten alındığında tahsilat ve müşteriye ödeme onayı.

Sağlayıcı secret değerleri Supabase Vault'ta şifreli tutulur. Kaydedildikten sonra değerler tarayıcıya geri gönderilmez. Admin yalnız `Hazır` / `Ayarlı değil` durumunu ve kaynağın Vault veya environment fallback olduğunu görür.

## Resend e-posta kurulumu

Resmi alan adı ekranı: https://resend.com/domains

Resend tarafında:

1. Resend hesabı açın.
2. Gönderim için kullanacağınız gerçek alan adını veya tercihen transactional alt alan adını ekleyin.
3. Resend'in gösterdiği DNS doğrulama kayıtlarını domain sağlayıcınızda ekleyin. Resend doğrulama ekranı SPF ve DKIM dahil gereken kayıtların durumunu gösterir.
4. Alan adı `verified` olduktan sonra API Keys bölümünden mümkünse yalnız gönderim yetkili ve ilgili domain ile sınırlandırılmış bir API key oluşturun.
5. Admin > Muhasebe & Tahsilat > E-posta ve SMS Bağlantıları > Resend E-posta alanına şunları girin:
   - **Resend API Key**: `re_...`
   - **Gönderen**: örneğin `Alperler Rent A Car <rezervasyon@alanadiniz.com>`
   - **Yönetici Bildirim E-postası**: yeni rezervasyonların yönetici kopyasının gideceği adres.
6. `Resend Bağlantısını Kaydet` düğmesine basın.
7. Durum `Hazır` olduğunda rezervasyon bildirim motoru Vault anahtarını environment fallback'in önünde kullanır.

Gerçek domain bağlı değilken sahte bir gönderen domain yazmayın. DNS doğrulaması tamamlanmadan canlı müşteri e-postasına güvenmeyin.

## Twilio SMS kurulumu

Resmi Console: https://console.twilio.com/

Twilio tarafında:

1. Twilio hesabı açın ve gerekli hesap doğrulamasını tamamlayın.
2. Console'dan **Account SID** ve **Auth Token** bilgilerini alın.
3. SMS gönderebilen bir Twilio telefon numarası satın alın veya bir **Messaging Service** oluşturun.
4. Messaging Service kullanıyorsanız Sender Pool'a en az bir geçerli gönderen ekleyin. Messaging Service SID `MG...` ile başlar.
5. Admin > Muhasebe & Tahsilat > E-posta ve SMS Bağlantıları > Twilio SMS alanına:
   - **Account SID**: `AC...`
   - **Auth Token**
   - ya **Gönderen Telefon** (E.164 biçimi, ör. `+90...` / `+41...`)
   - ya da **Messaging Service SID** (`MG...`)
   girin.
6. `Twilio Bağlantısını Kaydet` düğmesine basın.
7. Durum `Hazır` olduğunda SMS motoru Vault değerlerini kullanır.

Twilio SMS kullanılmak zorunda değildir. Resend e-posta tek başına çalışabilir. SMS sağlayıcısı bağlı değilse rezervasyon oluşturma veya e-posta gönderimi bozulmaz; SMS kanalı kontrollü olarak `not_configured` durumunda kalır.

## Dinamik mesaj şablonları

Admin > Muhasebe & Tahsilat > **Otomatik Müşteri Mesajları** bölümünden Türkçe, İngilizce, Almanca ve Fransızca şablonlar yönetilir.

Aynı müşteri şablonu hem e-posta hem SMS kanalının içerik kaynağıdır. E-posta tam konu/açılış/sıradaki-adım yapısını kullanır. SMS aynı güvenli değişkenleri düz metne dönüştürür, ödeme yöntemi uyarısını kanala uygun biçimde ekler ve sağlayıcı sınırı için 420 karaktere kontrollü olarak kısaltır. Böylece Admin'de değiştirilen müşteri mesajı e-posta ve SMS arasında eski/yeni metin ayrışması oluşturmaz.

Desteklenen olaylar:

- Rezervasyon alındı
- Rezervasyon inceleniyor
- Rezervasyon onaylandı
- Rezervasyon onaylanmadı
- İşlem tamamlandı
- Rezervasyon iptal edildi
- Ödeme alındı

Şablonlarda güvenli değişkenler kullanılabilir:

- `{{customer_name}}`
- `{{reference}}`
- `{{item_name}}`
- `{{total}}`
- `{{payment_method}}`
- `{{payment_status}}`
- `{{payment_amount}}`
- `{{amount_paid}}`
- `{{balance_due}}`

Admin metni HTML veya JavaScript olarak çalıştırılmaz. Değişkenler düz metin olarak güvenli biçimde işlenir ve e-posta HTML'ine escape edilerek yerleştirilir.

## Ofiste ödeme davranışı

Müşteri rezervasyonda **Ofiste ödeme** seçerse:

- Rezervasyon oluşturulur.
- Ödeme durumu `PENDING` kalır.
- Rezervasyon e-postası ve SMS'inde ödeme yöntemi açıkça `Ofiste ödeme` gösterilir.
- E-posta ve SMS rezervasyon teyidinin ödeme makbuzu olmadığı açıkça belirtilir.
- Para gerçekten ofiste alındığında Admin > Muhasebe & Tahsilat > Ofis / EFT Tahsilatı üzerinden kayıt yapılır.
- Kayıt veritabanında tek transaction içinde, satır kilidi ve idempotency korumasıyla işlenir.
- `payment_transactions` kaydı oluşur; muhasebe trigger'ı `finance_transactions` kaydını üretir; rezervasyonun `amount_paid` ve `payment_status` değerleri gerçek ödemeye göre yeniden hesaplanır.
- Ardından müşteriye ayrı `Ödemeniz alındı` e-postası/SMS'i gönderilir.

Aynı tahsilatın tekrar gönderilmesi idempotency anahtarıyla çift kayıt oluşturmaz. Tarayıcı/telefon ağ cevabını kaybetse bile aynı değiştirilmemiş tahsilat formunun yeniden gönderimi aynı request-id kullanır. Kalan bakiyeden fazla ödeme reddedilir. İptal/reddedilmiş veya tamamen ödenmiş rezervasyona yeni tahsilat yapılamaz.

## Havale / EFT davranışı

Rezervasyon e-postası ve SMS havalenin henüz tahsil edilmediğini ve mesajın makbuz olmadığını söyler. Banka hareketi gerçekten doğrulandıktan sonra Admin'den EFT tahsilatı kaydedilir ve ödeme onayı ayrıca gönderilir.

## Muhasebe bütünlüğü

- Gerçek ödeme ile oluşan `finance_transactions` satırı `payment_transaction_id` ile ödeme kaydına bağlanır.
- PayTR, iyzico, Ofis ve EFT kaynaklı ödeme satırları sıradan manuel muhasebe satırı gibi `VOID` yapılamaz. Bu, ödeme gerçeği ile rezervasyon bakiyesinin ayrışmasını engeller.
- Manuel eklenmiş gider/gelir satırı gerekçesi belirtilerek void edilebilir.
- Gerçek ödeme iadesi veya provider reversal işlemi, ödeme sağlayıcısı ve rezervasyon bakiyesiyle birlikte uzlaştırılan ayrı bir finansal akış gerektirir; yalnız ledger satırını silmek iade sayılmaz.
- Farklı dövizler birbiriyle toplanmaz; özet ve PDF raporları para birimi bazında hesaplanır.

## Bildirim teslim güvenliği

- Her rezervasyon/olay/kanal için teslim kayıtları `notification_deliveries` tablosunda tutulur.
- Aynı olayın gereksiz tekrar gönderimi engellenir.
- Ödeme onayı teslim anahtarı payment transaction kimliği içerir; iki farklı gerçek ödeme ayrı onay alabilir, aynı ödeme tekrar gönderilmez.
- E-posta veya SMS sağlayıcısı geçici olarak çalışmazsa finansal tahsilat geri alınmaz. Tahsilat doğru kalır, bildirim durumu ayrıca izlenir.
- Secret değerleri normal tabloda, tarayıcı localStorage'da, GitHub'da veya audit logunda tutulmaz.

## Domain bağlandıktan sonra kontrol listesi

1. Production domain HTTPS ile açılıyor.
2. Resend domain doğrulaması tamamlandı.
3. Resend API key ve doğrulanmış sender Admin'de Vault'a kaydedildi.
4. Twilio kullanılacaksa Account SID/Auth Token ve sender veya Messaging Service SID Vault'a kaydedildi.
5. Admin ekranında sağlayıcı durumu `Hazır`.
6. Test rezervasyonu oluşturuldu ve müşteri e-postası/SMS'inde rezervasyon referansı, hizmet, ödeme yöntemi ve durum doğru.
7. Ofiste ödeme testinde ilk mesaj makbuz iddiası yapmıyor.
8. Aynı rezervasyona kontrollü düşük tutarlı tahsilat girildi; açık bakiye azaldı ve ödeme onayı ayrı geldi.
9. Muhasebe defterinde ödeme yalnız bir kez görünüyor.
10. Operasyon Merkezi'nde bugünkü ve yaklaşan rezervasyonlar ile bekleyen tahsilatlar doğru görünüyor.

## Dış platformlarda yapılması gerekenler

Kod veya deploy gerektirmeyen fakat ilgili sağlayıcının kendi panelinde tamamlanması gereken işler:

- Resend hesabı ve domain DNS doğrulaması.
- Resend API key oluşturma.
- Twilio hesabı/işletme doğrulaması.
- SMS gönderen numara satın alma veya Messaging Service oluşturup sender pool ekleme.
- Domain DNS ve SSL/TLS bağlantısı.

Bunlar tamamlandıktan sonra günlük site tarafındaki yönetim Admin panelinden yapılır.
