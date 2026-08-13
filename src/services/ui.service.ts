import { Injectable, signal, computed, inject } from "@angular/core";
import { Router } from "@angular/router";
import { CarService } from "./car.service";

export type Language = "TR" | "EN" | "DE" | "FR" | "KU" | "ES" | "RU" | "ZH" | "AR";

function mergeTranslationObjects(base: any, override: any): any {
  if (!override || typeof override !== "object" || Array.isArray(override)) {
    return override ?? base;
  }
  const result: any = {
    ...(base && typeof base === "object" && !Array.isArray(base) ? base : {}),
  };
  for (const [key, value] of Object.entries(override)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      result[key] = mergeTranslationObjects(result[key] || {}, value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

@Injectable({
  providedIn: "root",
})
export class UiService {
  router = inject(Router);

  // --- OVERLAY STATES ---
  isAboutOpen = signal(false);
  isContactOpen = signal(false);
  isLegalOpen = signal(false);
  isFeedbackOpen = signal(false);
  legalType = signal<
    | "kvkk"
    | "privacy"
    | "cookies"
    | "terms"
    | "distance-selling"
    | "cancellation"
    | "insurance"
  >("terms");

  // --- LANGUAGE STATE ---
  currentLang = signal<Language>("TR");

  constructor() {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("alperler-language") as Language | null;
      const supported: Language[] = ["TR", "EN", "DE", "FR", "KU", "ES", "RU", "ZH", "AR"];
      if (saved && supported.includes(saved)) this.currentLang.set(saved);
    }
    this.syncDocumentLanguage(this.currentLang());
  }

  // --- ACTIONS ---
  toggleAbout(isOpen: boolean) {
    this.isAboutOpen.set(isOpen);
    if (isOpen) {
      this.isContactOpen.set(false);
      this.isLegalOpen.set(false);
      this.isFeedbackOpen.set(false);
    }
  }
  toggleContact(isOpen: boolean) {
    this.isContactOpen.set(isOpen);
    if (isOpen) {
      this.isAboutOpen.set(false);
      this.isLegalOpen.set(false);
      this.isFeedbackOpen.set(false);
      this.router.navigate(["/contact"]);
    }
  }
  toggleFeedback(isOpen: boolean) {
    this.isFeedbackOpen.set(isOpen);
    if (isOpen) {
      this.isAboutOpen.set(false);
      this.isContactOpen.set(false);
      this.isLegalOpen.set(false);
    }
  }

  openLegal(
    type:
      | "kvkk"
      | "privacy"
      | "cookies"
      | "terms"
      | "distance-selling"
      | "cancellation"
      | "insurance",
  ) {
    this.legalType.set(type);
    this.isLegalOpen.set(true);
    this.isAboutOpen.set(false);
    this.isContactOpen.set(false);
    this.isFeedbackOpen.set(false);
  }
  closeLegal() {
    this.isLegalOpen.set(false);
  }

  closeAllOverlays() {
    this.isAboutOpen.set(false);
    this.isContactOpen.set(false);
    this.isLegalOpen.set(false);
    this.isFeedbackOpen.set(false);
  }

  setLanguage(lang: Language) {
    this.currentLang.set(lang);
    if (typeof localStorage !== "undefined") localStorage.setItem("alperler-language", lang);
    this.syncDocumentLanguage(lang);
  }

  private syncDocumentLanguage(lang: Language) {
    if (typeof document === "undefined") return;
    const languageCodes: Record<Language, string> = { TR: "tr", EN: "en", DE: "de", FR: "fr", KU: "ku", ES: "es", RU: "ru", ZH: "zh", AR: "ar" };
    document.documentElement.lang = languageCodes[lang];
    document.documentElement.dir = lang === "AR" ? "rtl" : "ltr";
  }

  translateDbValue(
    value: string,
    category: "fuel" | "transmission" | "type" | "damage",
  ): string {
    if (!value) return "";
    const t = this.translations();
    const val = value.toLowerCase();

    if (category === "fuel") {
      if (val.includes("dizel")) return t.car.diesel;
      if (val.includes("benzin")) return t.car.gasoline;
      if (val.includes("hibrit")) return t.car.hybrid;
      if (val.includes("elektrik")) return t.car.electric;
    }

    if (category === "transmission") {
      if (val.includes("otomatik") || val.includes("auto")) return t.car.auto;
      if (val.includes("manuel") || val.includes("manual")) return t.car.manual;
    }

    if (category === "type") {
      if (val === "suv") return t.filters.suv;
      if (val === "sedan") return t.filters.sedan;
      if (val === "hatchback") return t.filters.hatchback;
      if (val === "pickup") return t.filters.pickup;
      if (val === "luxury" || val === "lüks") return t.filters.luxury;
    }

    if (category === "damage") {
      if (val.includes("hatasız") || val.includes("boyasız"))
        return t.car.noDamageRecord;
      if (val.includes("boyalı")) return t.car.damageStatus;
    }

    return value;
  }

  // --- TRANSLATIONS ---
  private dictionary: Partial<Record<Language, any>> = {
    TR: {
      nav: {
        home: "Ana Sayfa",
        fleet: "Araç Filosu",
        sales: "2. El Satış",
        tours: "Turlar",
        earn: "Aracını Değerlendir",
        about: "Hakkımızda",
        contact: "İletişim",
        blog: "Blog",
        corporate: "Kurumsal",
      },
      hero: {
        title: "Beklemek Yok: 5 Dakikada Onayla, Anında Yola Çık",
        subtitle:
          "Uzun prosedürlere ve gizli ücretlere son. Aracını Seç, 5 Dakikada Yola Çık.",
        trustLine: "1001+ MUTLU MÜŞTERİ • SIFIR GİZLİ ÜCRET • GÜVENİLİR FİLO",
        ctaSubtext: "Kefilsiz, evraksız, hızlı çözüm",
        bullets: [
          "Premium Araç Kiralama",
          "Şoförlü VIP Transfer",
          "Havalimanı Teslimatı",
          "Sıfır Komisyon",
        ],
        cta: "Şimdi Kirala",
      },
      buttons: {
        back: "Geri Dön",
        close: "Kapat",
        book: "Rezervasyon Yap",
        details: "Detaylar",
        call: "Hemen Ara",
        send: "Gönder",
        rent: "Hemen Kirala",
        rentDriver: "Şoförlü Kirala",
        notAvailable: "Müsait Değil",
        remove: "Kaldır",
        apply: "Başvuruyu Gönder",
        viewAll: "Tümünü İncele",
        viewAllFleet: "TÜM KİRALIK ARABALAR",
        viewAllSales: "TÜM SATILIK ARABALAR",
        viewTours: "Tüm Turları Görüntüle",
        backHome: "Geri Dön",
        complete: "Tamamla",
        pay: "Öde ve Bitir",
        appointment: "Randevu Talep Et",
      },

      filters: {
        all: "Tümü",
        suv: "SUV",
        pickup: "Pikap",
        sedan: "Sedan",
        hatchback: "Ekonomik",
        luxury: "Lüks",
        minibus: "Minibüs",
        vip: "VIP",
        driverActive: "Şoförlü Kiralama Seçeneği Aktif",
        rented: "KİRALANDI",
        brand: "Marka ve Model",
        series: "Seri",
        priceRange: "Fiyat Aralığı",
        kmRange: "Kilometre Aralığı",
        color: "Renk",
        engine: "Motor Gücü / Hacmi",
        fuel: "Yakıt Tipi",
        transmission: "Vites Tipi",
        year: "Model Yılı",
        damage: "Hasar Durumu",
      },
      sort: {
        label: "Sıralama",
        default: "Önerilen",
        priceAsc: "Fiyat: Artan",
        priceDesc: "Fiyat: Azalan",
      },
      car: {
        day: "gün",
        transmission: "Vites",
        seats: "Kişilik",
        fuel: "Yakıt",
        auto: "Otomatik",
        manual: "Manuel",
        diesel: "Dizel",
        gasoline: "Benzin",
        hybrid: "Hibrit",
        electric: "Elektrik",
        year: "Model",
        km: "KM",
        overview: "Genel Bakış",
        availability: "Müsaitlik Durumu",
        available: "Müsait",
        similarCars: "Benzer Araçlar",
        description: "Açıklama",
        features: "Özellikler",
        insured: "Kaskolu",
        viewersCount: "kişi şu an bu aracı inceliyor",
        expertReport: "Ekspertizli",
        lastCar: "Son Araç",
        buyNow: "Satın Al",
        details: "Detaylar",
        rentNow: "Hemen Kirala",
        whatsappMsg:
          "Merhaba, {brand} {model} ({year}) aracınız hakkında bilgi almak istiyorum. Link: {url}",
        inquiryMeet: "RANDEVU TALEBİ: Aracı yerinde görüp incelemek istiyorum.",
        inquiryInfo:
          "SATIN ALMA TALEBİ: Araç hakkında detaylı görüşmek istiyorum.",
        withDriverLabel: "(Şoförlü)",
        deposit: "Depozito",
        minAge: "Min. Yaş",
        minLicenseYears: "Ehliyet Yılı",
        years: "Yıl",
        dontMiss: "Bu Fırsatı Kaçırma!",
        priceDropped: "Fiyat düştü",
        todayViewers: "Bugün {n} kişi bu ilana baktı",
        daysLeft: "İlanın yayında kalacağı son {n} gün",
        engineVolume: "Motor Hacmi",
        enginePower: "Motor Gücü",
        drivetrain: "Çekiş",
        color: "Renk",
        warranty: "Garanti",
        damageStatus: "Hasar Kaydı",
        paintedParts: "Boyalı Parçalar",
        noPaintedParts: "Boyasız",
        noReplacedParts: "Değişensiz",
        noDamageRecord: "Hasar Kayıtsız",
        hasWarranty: "Garantili",
        discount: "Büyük İndirim",
        paintlessReplaceFree: "Boyasız / Değişensiz",
        accidentFree: "Kazasız",
        inspectNow: "Hemen İncele",
        sendSaleRequest: "Satış Talebi Gönder",
        popularListing: "Çok Popüler İlan",
        height: "Yükseklik",
        trustBadge: "Güvenli Alışveriş",
        fastResponse: "Hızlı Geri Dönüş",
        opportunity: "Fırsat İlan",
        purchaseRequest: "Satın Alma Talebi",
        rentalRequest: "Kiralama Talebi",
        expertiseReady: "Ekspertiz Hazır",
        tradeAvailable: "Takasa Uygun",
        premiumGallery: "Premium Galeri",
        location: "Hakkari / Yüksekova",
        appointmentInfo: "Randevu ile gösterim yapılır",
        listingNo: "İlan No",
        listingDate: "İlan Tarihi",
        featuredFeatures: "Öne Çıkan Özellikler",
        allFeatures: "Tüm Özellikleri Gör",
        damageExpertise: "Hasar ve Ekspertiz",
        sellerInfo: "Satıcı Bilgileri",
        locationDelivery: "Konum ve Teslimat",
        generalStatus: "Genel Durum",
        mechanicalStatus: "Mekanik Durum",
        equipment: "Donanım",
        cosmeticStatus: "Kozmetik Durum",
        extraInfo: "Ek Bilgi",
        verifiedSeller: "Doğrulanmış Satıcı",
        royalDrive: "Royal Drive Auto",
        zirveAuto: "Zirve Auto Premium",
        northline: "Northline Gallery",
        eidsVerified: "EİDS Doğrulandı",
        originalChassis: "Şase Orijinal",
        originalAirbag: "Airbag Orijinal",
        cleanInterior: "İç Aksam Temiz",
        expertDocAvailable: "Ekspertiz Belgesi Mevcut",
        openLocation: "Konumu Aç",
        sendMessage: "Mesaj Gönder",
        callNow: "Hemen Ara",
        whatsappAsk: "WhatsApp'tan Sor",
        highInterest: "Son 24 saatte yoğun ilgi gördü",
        topViewed: "Bugün en çok bakılan ilanlardan biri",
        advantageousPrice: "Emsallerine göre avantajlı fiyat",
      },
      chat: {
        title: "Alper AI",
        subtitle: "Size nasıl yardımcı olabilirim?",
        placeholder: "Mesajınızı yazın...",
        welcome:
          "Merhaba! Ben Alper AI, size araç kiralama veya satış süreçlerinde yardımcı olabilirim. Ne sormak istersiniz?",
        voiceAssistant: "SESLİ ASİSTAN",
        listening: "Sizi Dinliyorum...",
        speaking: "Cevap Veriyorum...",
        thinking: "Düşünüyorum...",
        tapToSpeak: "Dokun ve Konuş",
        prompt: "Size nasıl yardımcı olabilirim?",
        online: "Online",
      },
      fleet: {
        subtitle: "Yüksekova yollarına uygun, güçlü ve konforlu araçlar.",
        searchPlaceholder: "Araç Ara (Marka, Model...)",
        filterType: "Araç Tipi Filtreleri",
        filterBtn: "Filtrele",
        sortBtn: "Sırala",
      },
      footer: {
        rights: "Tüm Hakları Saklıdır.",
        support: "7/24 Canlı Destek",
        corporate: "Kurumsal",
        legal: "Yasal",
        newsletter: "Bülten Aboneliği",
        newsletterSub:
          "Kampanyalardan ve yeni araçlardan haberdar olmak için ücretsiz abone olun.",
        emailPlaceholder: "E-posta adresiniz",
        subscribeBtn: "Ücretsiz Abone Ol",
        subscribeSuccess:
          "Tebrikler! Bültenimize başarıyla abone oldunuz. Kampanyalarımızdan ilk siz haberdar olacaksınız.",
        contactUs: "Bize Ulaşın",
        contactBtn: "İletişime Geç",
        contactText: "Sorularınız mı var? 7/24 destek hattımız hizmetinizde.",
        designed: "Tasarım ve Altyapı ❤️ ile Yüksekova'da Geliştirildi",
        footerText:
          "Yüksekova'nın güvenilir araç kiralama, ikinci el galeri ve turizm acentesi. Premium hizmet, güvenli yolculuklar.",
        links: {
          kvkk: "KVKK Aydınlatma Metni",
          privacy: "Gizlilik Politikası",
          cookies: "Çerez Politikası",
          terms: "Kiralama Koşulları",
          faq: "Sıkça Sorulan Sorular",
          distanceSelling: "Mesafeli Satış Sözleşmesi",
          cancellation: "İade ve İptal Politikası",
          insurance: "Araç Sigorta ve Sorumluluk",
        },
        feedbackBtn: "Geri Bildirim Gönder",
      },
      about: {
        title: "Hakkımızda",
        story: "Kurumsal Hikayemiz",
        teamTitle: "Yönetim ve Operasyon",
        teamSubtitle: "Profesyonel hizmet, aile sıcaklığı.",
      },
      contact: {
        title: "İletişim",
        subtitle: "7/24 Yanınızdayız",
        infoTitle: "İletişim Bilgileri",
        formTitle: "Bize Ulaşın",
        formSubtitle: "Sorularınız veya talepleriniz için formu doldurun.",
        name: "Adınız",
        surname: "Soyadınız",
        phone: "Telefon",
        email: "E-Posta Adresi",
        message: "Mesajınız",
        send: "Gönder",
        successTitle: "İşleminiz Başarıyla Alındı!",
        successText:
          "Talebiniz bize ulaştı. En kısa sürede size dönüş yapılacaktır.",
        summary: "Sipariş Özeti",
        personalInfo: "Kişisel Bilgiler",
        paymentMethod: "Ödeme Yöntemi",
        creditCard: "Kredi Kartı",
        office: "Ofiste Öde",
        eft: "Havale / EFT",
        total: "Toplam Tutar",
        days: "Gün",
        checkout: {
          cancel: "Vazgeç ve Siteye Dön",
          securePayment: "GÜVENLİ ÖDEME & REZERVASYON",
          requestCreation: "TALEP OLUŞTURMA",
          summary: "Sipariş Özeti",
          rentalService: "Kiralama Hizmeti",
          tourService: "Tur Hizmeti",
          saleRequest: "Satın Alma Talebi",
          rentalType: "Kiralama Türü",
          withDriver: "Şoförlü Hizmet",
          pickupDate: "Alış Tarihi",
          returnDate: "Dönüş Tarihi",
          dailyPrice: "Günlük Fiyat",
          duration: "Süre",
          total: "Toplam Tutar",
          estimatedPrice: "Tahmini Bedel",
          successTitle: "İşleminiz Başarıyla Alındı!",
          bookingCode: "Rezervasyon Kodunuz:",
          goHome: "Ana Sayfaya Dön",
          personalInfo: "Kişisel Bilgiler",
          paymentMethod: "Ödeme Yöntemi",
          creditCard: "Kredi Kartı",
          payAtOffice: "Ofiste Öde",
          eft: "Havale / EFT",
          securePaymentBadge: "256-Bit SSL Güvenli Ödeme",
          cardName: "Kart Üzerindeki İsim Soyisim",
          cardNumber: "Kart Numarası",
          expiryDate: "Son Kullanma Tarihi",
          month: "Ay",
          year: "Yıl",
          cvv: "CVV Güvenlik Kodu",
          officeSelected: "Ofiste Ödeme Seçildi",
          officeDesc:
            "Rezervasyonunuz oluşturulacak. Araç tesliminde nakit veya kredi kartı ile ödeme yapabilirsiniz.",
          bankName: "Ziraat Bankası",
          receiver: "ALICI: ALPERLER AUTO",
          eftNotice:
            "Önemli: Lütfen açıklama kısmına AD SOYAD yazınız. İşlem sonrası dekontu WhatsApp hattımıza iletiniz.",
          connectingBank: "Banka ile İletişim Kuruluyor...",
          processing: "İşlem Tamamlanıyor...",
          confirmAndFinish: "Ödemeyi Onayla ve Bitir",
          completeBooking: "Rezervasyonu Tamamla",
          sendRequest: "Talebi Gönder",
          termsNotice:
            '"Tamamla" butonuna basarak Mesafeli Satış Sözleşmesi\'ni kabul etmiş olursunuz.',
          successRentalCC:
            "Ödemeniz güvenli bir şekilde alındı. Araç teslimatı için ofisimizde bekleniyorsunuz.",
          successRentalEFT:
            "Havale bildiriminiz alındı. Lütfen ödeme dekontunu 0537 959 48 51 WhatsApp hattımıza iletiniz.",
          successRentalOffice:
            "Rezervasyonunuz oluşturuldu. Ödemeyi ofiste araç teslimi sırasında yapabilirsiniz.",
          successOther:
            "Talebiniz bize ulaştı. En kısa sürede {phone} numarasından size dönüş yapılacaktır.",
          formSuccess: "Mesajınız iletildi! Teşekkürler.",
        },
      },
      feedback: {
        title: "Geri Bildirim Gönder",
        subtitle: "Görüşleriniz bizim için değerli.",
        category: "Kategori",
        rating: "Puanınız",
        message: "Mesajınız",
        placeholder: "Deneyiminizi bizimle paylaşın...",
        submit: "Gönder",
        success: "Geri bildiriminiz için teşekkürler!",
        categories: {
          BUG: "Hata Bildirimi",
          FEATURE: "Özellik İsteği",
          GENERAL: "Genel Görüş",
          CONTENT: "İçerik Hatası",
          OTHER: "Diğer",
        },
        analysis: {
          title: "Geri Bildirim Analizi (AI)",
          btn: "Analiz Et",
          loading: "Analiz ediliyor...",
          empty: "Henüz analiz edilecek veri yok.",
        },
        hideAnalysis: "Analizi Gizle",
        aiAnalysis: "Yönetici Analizi (AI)",
        totalFeedback: "Toplam Geri Bildirim:",
        successSubtitle:
          "Görüşleriniz hizmet kalitemizi artırmamıza yardımcı oluyor.",
      },
      common: {
        close: "Kapat",
        favorites: "Favoriler",
        menuToggle: "Menüyü Aç/Kapat",
        addToFav: "Favorilere Ekle",
        removeFromFav: "Favorilerden Çıkar",
      },
      home: {
        booking: {
          title: "5 Dakikada Hızlıca Kirala",
          type: "HİZMET TÜRÜ",
          types: {
            individual: "Bireysel Kiralama",
            driver: "Şoförlü VIP / Sedan",
            wedding: "Düğün & Özel Gelin Arabası",
            minibus: "Piknik & Tur Servisi / Minibüs",
          },
          duration: "Kiralama Süresi",
          durations: {
            hourly: "Saatlik Hizmet",
            daily: "Günlük (1-29 Gün)",
            monthly: "Aylık (30+ Gün)",
            longterm: "Uzun Dönem (6+ Ay)",
          },
          pickup: "NEREDEN ALACAKSINIZ?",
          locations: {
            center: "Yüksekova Merkez",
            airport: "S. Eyyubi Havalimanı (Yüksekova)",
            bus: "Yüksekova Otogar",
            hakkari: "Hakkari Merkez",
            semdinli: "Şemdinli Merkez",
            derecik: "Derecik Merkez",
            cukurca: "Çukurca Merkez",
            vanAirport: "Van Ferit Melen Havalimanı",
            vanBus: "Van Otogar",
            sirnakAirport: "Şerafettin Elçi Havalimanı (Şırnak)",
          },
          startDate: "ALIŞ TARİHİ",
          endDate: "DÖNÜŞ TARİHİ",
          searchBtn: "ARAÇ BUL",
        },
        featured: {
          badge: "KİRALIK ARAÇLAR",
          title: "Güvenli ve Temiz Kiralık Araçlar",
          subtitle:
            "Günlük işleriniz ya da tatil planınız için bakımları tam yapılmış, bütçenize uygun araçlar. Gizli masraf veya karmaşık prosedürler yok.",
          viewAll: "Tüm Filoyu İncele",
          model: "Model",
          perDay: "/ gün",
          person: "Kişilik",
          rentNow: "Hemen Kirala",
        },
        sales: {
          badge: "İKİNCİ EL ARAÇLAR",
          title: "Sorunsuz ve Garantili İkinci El Arabalar",
          description:
            "Şeffaf geçmişli, ekspertiz garantili ve tüm kontrolleri yapılmış arabalarımızla bütçenize uygun aracı güvenle alın.",
          viewAll: "Tüm Satılık Araçları İncele",
          cta: "Satılık Araçları Göster",
          stats: {
            expert: "Ekspertiz Garantisi",
            months: "Ay",
            warranty: "Mekanik Garanti",
            trade: "Takas",
            value: "Değerinde Alım",
            credit: "Kredi",
            finance: "Hızlı Finansman",
          },
        },
        whyUs: {
          title: "Neden Bizi Tercih Etmelisiniz?",
          subtitle:
            "Uzun yıllara dayanan tecrübemiz ve şeffaf hizmet anlayışımızla, araç kiralama ve satış süreçlerinizde her zaman güvenebileceğiniz çözüm ortağınızız.",
          features: {
            trust: {
              title: "Tam Güvence ve Şeffaflık",
              desc: "Sürpriz masraflar ve gizli şartlar yok. Bakımları eksiksiz, yeni nesil araç filomuzla yola güvenle çıkın.",
            },
            support: {
              title: "7/24 Kesintisiz Destek",
              desc: "Yolculuğunuz boyunca karşılaşabileceğiniz her türlü durumda, bir telefon uzağınızda olan profesyonel destek ekibimiz yanınızda.",
            },
            comfort: {
              title: "Temizlik ve Memnuniyet",
              desc: "Her teslimat öncesinde özenle temizlenen ve kontrolleri sağlanan araçlarımızla her zaman en iyi deneyimi yaşayın.",
            },
          },
        },
        partner: {
          title: "Aracınız Kapıda Beklemesin, Size Değer Katsın",
          subtitle:
            "Kullanmadığınız aracınızı güvenilir araç havuzumuza katarak düzenli ek gelir elde edin veya değerinde bize satarak anında nakite çevirin. Tüm süreçleri biz yönetelim, siz rahat edin.",
          requirements: {
            title: "Bize Katılmanın Avantajları",
            year: "Resmi ve Güvenli Sözleşme",
            damage: "Tam Kapsamlı Kasko Güvencesi",
            maintenance: "Zamanında ve Düzenli Ödeme",
          },
          form: {
            title: "Değerlendirme ve Filo Ortaklığı Başvurusu",
            success: {
              title: "Başvurunuz Alındı!",
              message:
                "Uzman ekibimiz aracınızı inceleyip en kısa sürede sizinle iletişime geçecektir.",
            },
            name: "Ad Soyad",
            phone: "Telefon Numarası",
            email: "E-posta Adresi",
            car: "Araç Marka ve Model",
            year: "Model Yılı",
            km: "Kilometre",
            photos: "Araç Fotoğrafları / Video (Opsiyonel)",
            upload: "Fotoğrafları Buraya Sürükleyin veya Seçin",
            maxFiles: "Maksimum 5 dosya, her biri en fazla 10MB",
            notes: "Ek Notlar",
            notesPlaceholder:
              "Aracınızın durumu, istediğiniz fiyat veya sormak istedikleriniz...",
            submit: "Hemen Başvur",
            errors: {
              name: "Lütfen adınızı ve soyadınızı giriniz.",
              phone: "Lütfen geçerli bir telefon numarası giriniz.",
              email: "Lütfen geçerli bir e-posta adresi giriniz.",
              car: "Lütfen araç marka ve modelini giriniz.",
              km: "Lütfen aracın kilometresini giriniz.",
            },
          },
        },
        tours: {
          title: "Yüksekova ve Çevresi İçin Kaliteli Turlar",
          subtitle:
            "Bölgeyi çok iyi bilen rehberlerimiz ve geniş araçlarımızla Hakkari'nin doğasını ailenizle veya arkadaşlarınızla güvenle gezin.",
          bookBtn: "Rezervasyon Yap",
          viewAll: "Tüm Turları Görüntüle",
          bottomNote:
            "* Rezervasyon ve detaylı fiyatlandırma için müşteri temsilcimiz size dönüş sağlayacaktır.",
          list: [
            {
              id: 1,
              title: "Cilo Dağları & Buzullar Turu",
              description:
                "Türkiye'nin en yüksek ikinci zirvesi olan Cilo Dağları'nda unutulmaz bir macera. Buzul gölleri ve eşsiz manzaralar.",
              price: 1500,
              category: "Doğa & Macera",
            },
            {
              id: 2,
              title: "Sat Gölleri Kamp Turu",
              description:
                "Bölgenin saklı cenneti Sat Gölleri'nde yıldızların altında kamp deneyimi. Profesyonel rehberler eşliğinde.",
              price: 2000,
              category: "Kamp",
            },
            {
              id: 3,
              title: "Cennet Cehennem Vadisi Turu",
              description:
                "Bir yanda buzullar, diğer yanda rengarenk çiçeklerle kaplı eşsiz bir doğa harikasını bizimle keşfedin.",
              price: 1200,
              category: "Doğa & Macera",
            },
          ],
        },
        vipAndMinibus: {
          badge: "ÖZEL GÜN VE GRUP TAŞIMACILIĞI",
          title: "Düğün, Nişan ve Grup Gezileriniz İçin Profesyonel Çözümler",
          description:
            "En özel günlerinizde kusursuz hizmet! Düğün ve gelin arabası olarak lüks VIP araçlarımızla yanınızdayız. Ayrıca şehir içi/dışı düğün misafirleri, okul servisi, turist gezileri, piknik organizasyonları ve kalabalık aileler için konforlu, 15, 18 ve 20 kişilik şoförlü minibüs kiralama hizmetimizle yanınızdayız.",
          cta: "Tümünü Gör",
          features: {
            wedding: "Lüks Düğün & Gelin Arabaları",
            minibus: "15-20 Kişilik Minibüs & Servisler",
            group: "Düğün Konvoyu & Misafir Taşıma",
            tourist: "Turist & Tur Gezi Servisleri",
          },
        },
        campaigns: {
          early: "Erken Rezervasyon İndirimi",
          roadside: "Kesintisiz Yol Yardım",
          free: "ÜCRETSİZ",
          delivery: "Havalimanı & Otogar Teslimat",
        },
      },
      sales: {
        headerTitle: "Ayrıcalıklı İkinci El Dünyası",
        headerSubtitle:
          "Risk sıfır, güven sonsuz. 101 nokta ekspertizinden geçmiş, şeffaf geçmişe sahip, tam donanımlı ve garantili araç portföyümüz.",
        badge: "İKİNCİ EL SATIŞ DEPARTMANI",
        card1: "Sıfır Ayarında",
        card2: "Şeffaf Ekspertiz",
        card3: "Mekanik Garanti",
        card4: "Değerinde Takas",
        expert: "Araç Detay & Ekspertiz",
        appointment: "Randevu Al",
        buy: "Satın Al",
        status: { forSale: "Satılık" },
        searchPlaceholder: "Marka, model veya başlık ara...",
        filterBtn: "Filtrele",
        filterTitle: "Detaylı Filtreleme",
        clear: "Temizle",
        brand: "Marka",
        allBrands: "Tüm Markalar",
        year: "Yıl",
        allYears: "Tüm Yıllar",
        km: "Kilometre",
        all: "Tümü",
        condition: "Durum",
        new: "Sıfır (0 km)",
        used: "İkinci El",
        damageStatus: "Hasar Durumu",
        clean: "Hatasız / Boyasız",
        damaged: "Hasar Kayıtlı",
        color: "Renk",
        allColors: "Tüm Renkler",
        showResults: "Sonuçları Göster",
        sortBtn: "Sırala",
        sortDefault: "Varsayılan",
        sortPriceAsc: "Fiyat: Artan",
        sortPriceDesc: "Fiyat: Azalan",
        sortYearDesc: "Yıl: Yeniden Eskiye",
        sortYearAsc: "Yıl: Eskiden Yeniye",
      },
    },
    EN: {
      nav: {
        home: "Home",
        fleet: "Fleet",
        sales: "Car Sales",
        tours: "Tours",
        earn: "Earn with Us",
        about: "About Us",
        contact: "Contact",
        blog: "Blog",
        corporate: "Corporate",
      },
      hero: {
        title:
          "Rent a Car in Yüksekova in 2 Minutes - Instant Approval, Best Prices",
        subtitle: "",
        bullets: [
          "Car Rental (With/Without Driver)",
          "Group, Wedding and VIP Transport",
          "Delivery to Şırnak, Hakkari, Van Airport",
          "Zero Commission, 100% Transparent Price",
        ],
        cta: "Find a Car Now - Instant Approval",
      },
      buttons: {
        back: "Go Back",
        close: "Close",
        book: "Book Now",
        details: "Details",
        call: "Call Now",
        send: "Send",
        rent: "Rent Now",
        rentDriver: "Rent with Driver",
        notAvailable: "Not Available",
        remove: "Remove",
        apply: "Submit Application",
        viewAll: "View All",
        viewTours: "View All Tours",
        backHome: "Back to Home",
        complete: "Complete",
        pay: "Pay & Finish",
        appointment: "Book Appointment",
      },

      filters: {
        all: "All",
        suv: "SUV",
        pickup: "Pickup",
        sedan: "Sedan",
        hatchback: "Economy",
        luxury: "Luxury",
        minibus: "Minibus",
        vip: "VIP",
        driverActive: "Chauffeur Service Active",
        rented: "RENTED",
      },
      sort: {
        label: "Sort",
        default: "Recommended",
        priceAsc: "Price: Low to High",
        priceDesc: "Price: High to Low",
      },
      car: {
        day: "day",
        transmission: "Transmission",
        seats: "Seats",
        fuel: "Fuel",
        auto: "Automatic",
        manual: "Manual",
        diesel: "Diesel",
        gasoline: "Gasoline",
        hybrid: "Hybrid",
        electric: "Electric",
        year: "Model",
        km: "KM",
        overview: "Overview",
        availability: "Availability",
        available: "Available",
        similarCars: "Similar Cars",
        description: "Description",
        features: "Features",
        insured: "Insured",
        viewersCount: "people viewing",
        expertReport: "Expert Report",
        lastCar: "Last Car",
        buyNow: "Buy Now",
        details: "Details",
        rentNow: "Rent Now",
        opportunity: "Opportunity Listing",
        purchaseRequest: "Purchase Request",
        rentalRequest: "Rental Request",
        expertiseReady: "Inspection Ready",
        tradeAvailable: "Trade-in Available",
        dontMiss: "DON'T MISS THIS OPPORTUNITY!",
        whatsappMsg:
          "Hello, I would like to get information about your {brand} {model} ({year}) vehicle. Link: {url}",
        inquiryMeet:
          "APPOINTMENT REQUEST: I would like to see and inspect the vehicle on site.",
        inquiryInfo:
          "PURCHASE REQUEST: I would like to discuss the vehicle in detail.",
        withDriverLabel: "(With Driver)",
        deposit: "Deposit",
        minAge: "Min. Age",
        minLicenseYears: "License Years",
        years: "Years",
        priceDropped: "Price dropped",
        todayViewers: "{n} people looked today",
        daysLeft: "Last {n} days",
        engineVolume: "Engine Volume",
        enginePower: "Engine Power",
        drivetrain: "Drivetrain",
        color: "Color",
        warranty: "Warranty",
        damageStatus: "Damage Status",
        paintedParts: "Painted Parts",
        noPaintedParts: "No Painted Parts",
        noReplacedParts: "No Replaced Parts",
        noDamageRecord: "No Damage Record",
        hasWarranty: "Has Warranty",
        discount: "Discount",
        paintlessReplaceFree: "Paintless / No Replacement",
        accidentFree: "Accident Free",
        inspectNow: "Inspect Now",
        sendSaleRequest: "Send Sale Request",
        popularListing: "Popular Listing",
      },
      chat: {
        title: "Live Support",
        subtitle: "Alperler Assistant",
        placeholder: "Type something...",
        welcome: "Hello! Welcome to Alperler Auto. How can I help you?",
      },
      fleet: {
        subtitle:
          "Powerful and comfortable vehicles suitable for Yüksekova roads.",
        searchPlaceholder: "Search Car (Brand, Model...)",
        filterType: "Vehicle Type Filters",
        filterBtn: "Filter",
        sortBtn: "Sort",
      },
      home: {
        booking: {
          title: "Rent a Car Now",
          type: "SERVICE TYPE",
          types: {
            individual: "Individual Rental",
            driver: "Rental with Driver",
          },
          duration: "Rental Duration",
          durations: {
            hourly: "Hourly Service",
            daily: "Daily (1-29 Days)",
            monthly: "Monthly (30+ Days)",
            longterm: "Long Term (6+ Months)",
          },
          pickup: "PICKUP LOCATION",
          locations: {
            center: "Yüksekova Center",
            airport: "Yüksekova Airport",
            bus: "Yüksekova Bus Terminal",
          },
          startDate: "PICKUP DATE",
          endDate: "RETURN DATE",
          searchBtn: "FIND CAR",
        },
        featured: {
          badge: "PRESTIGIOUS FLEET",
          title: "Choose the Car That Reflects You, Rule the Roads",
          subtitle:
            "We have a solution for everything, from individual needs to weddings, group tours, and large families. Luxury VIP, Minibus, SUV, Sedan, Economy, and Pickup options are ready to go.",
          viewAll: "View Entire Fleet",
          model: "Model",
          perDay: "/ day",
          person: "Person",
          rentNow: "Rent Now",
        },
        sales: {
          badge: "PREMIUM SECOND-HAND PORTFOLIO",
          title: "Own a Car Risk-Free, Transparently, and Advantageously",
          description:
            "Buying a car has never been this safe and easy. Experience the difference with our expertise-guaranteed, clean-history vehicles inspected by professionals.",
          viewAll: "View All Cars for Sale",
          cta: "Show Cars for Sale",
          stats: {
            expert: "Expertise Guarantee",
            months: "Months",
            warranty: "Mechanical Warranty",
            trade: "Trade-in",
            value: "Value Purchase",
            credit: "Credit",
            finance: "Fast Finance",
          },
        },
        whyUs: {
          title: "Why Do Hundreds of Customers Choose Us?",
          subtitle:
            "We don't just hand over keys; we promise a seamless, enjoyable, and privileged journey that values your time and budget.",
          features: {
            trust: {
              title: "Uncompromising Security",
              desc: "Fully insured, late-model vehicles maintained by authorized services. Feel completely safe with our transparent policy of no surprise costs.",
            },
            support: {
              title: "You Are Never Alone",
              desc: "We are with you every second of your journey. We solve your problems instantly with our 24/7 uninterrupted support line.",
            },
            comfort: {
              title: "VIP Standard Comfort",
              desc: "Ionic and detailed sterilization before every delivery. Experience flawless freshness with our meticulously prepared vehicles.",
            },
          },
        },
        partner: {
          title: "Don't Let Your Car Sit Idle, Let It Generate Cash",
          subtitle:
            "While you continue your routine, let your car safely gain value with us. Our expert team manages all operational stress and the sales process, while you enjoy risk-free earnings or the comfort of a quick sale.",
          requirements: {
            title: "Application Conditions",
            year: "Must be at least 2018 Model.",
            damage: "No heavy damage record.",
            maintenance: "All maintenance must be done at authorized services.",
          },
          form: {
            title: "Car Application Form",
            success: {
              title: "Application Received!",
              message:
                "Our expert team will examine your vehicle and get back to you as soon as possible.",
            },
            name: "Name Surname",
            phone: "Phone",
            email: "Email Address",
            car: "Car Brand/Model",
            year: "Model Year",
            km: "Car Mileage (KM)",
            photos: "Car Photos / Video",
            upload: "Upload Photo or Video",
            maxFiles: "(Max 10 Files)",
            notes: "Additional Notes",
            notesPlaceholder: "What you want to add about the vehicle...",
            submit: "Submit Application",
            errors: {
              name: "Please enter your full name.",
              phone: "Please enter a valid phone number.",
              email: "Please enter a valid email address.",
              car: "Please enter car brand and model.",
              km: "Please enter a valid mileage.",
            },
          },
        },
        tours: {
          title: "A Fascinating Journey to Undiscovered Beauties",
          subtitle:
            "Cross the borders. From the majestic summit of the Cilo Mountains to mysterious glaciers, are you ready for enchanting adventures you've never experienced before?",
          bookBtn: "Book Now",
          viewAll: "View All Tours",
          bottomNote:
            "* Our representative will contact you for reservation and pricing details.",
        },
        vipAndMinibus: {
          badge: "SPECIAL EVENTS & GROUP TRANSPORTATION",
          title:
            "Professional Solutions for Weddings, Engagements, and Group Trips",
          description:
            "Flawless service on your most special days! We are with you with our luxury VIP vehicles for weddings and bridal cars. We also ease your burden with our comfortable, 15-20 passenger chauffeured minibus rentals for moving wedding guests, school transport, tourist trips, picnics, and large families.",
          cta: "Get a Special Quote",
          features: {
            wedding: "Luxury Wedding & Bridal Cars",
            minibus: "15-20 Passenger Minibuses",
            group: "Wedding Convoy & Guest Transport",
            tourist: "Tourist & Picnic Services",
          },
        },
        campaigns: {
          early: "Early Booking Discount",
          roadside: "Uninterrupted Roadside Assistance",
          free: "FREE",
          delivery: "Airport & Terminal Delivery",
        },
      },
      sales: {
        headerTitle: "Reliable Second Hand",
        headerSubtitle:
          "Vehicles with expertise reports, warranty, and trade-in options.",
        badge: "Car Sales Division",
        card1: "Reliable Used Cars",
        card2: "Expertise Report",
        card3: "Warranty Options",
        card4: "Trade-in Available",
        expert: "Expertise / Condition",
        appointment: "Book Appointment",
        buy: "Buy Now",
        status: { forSale: "For Sale" },
        searchPlaceholder: "Search brand, model or title...",
        filterBtn: "Filter",
        filterTitle: "Detailed Filtering",
        clear: "Clear",
        brand: "Brand",
        allBrands: "All Brands",
        year: "Year",
        allYears: "All Years",
        km: "Mileage",
        all: "All",
        condition: "Condition",
        new: "New (0 km)",
        used: "Used",
        damageStatus: "Damage Status",
        clean: "Damage Free / No Paint",
        damaged: "Has Damage Record",
        color: "Color",
        allColors: "All Colors",
        showResults: "Show Results",
        sortBtn: "Sort",
        sortDefault: "Default",
        sortPriceAsc: "Price: Low to High",
        sortPriceDesc: "Price: High to Low",
        sortYearDesc: "Year: New to Old",
        sortYearAsc: "Year: Old to New",
      },
      footer: {
        rights: "All Rights Reserved.",
        support: "24/7 Live Support",
        corporate: "Corporate",
        legal: "Legal",
        newsletter: "Newsletter Subscription",
        newsletterSub:
          "Subscribe for free to be informed about campaigns and new vehicles.",
        emailPlaceholder: "Your email address",
        subscribeBtn: "Subscribe for Free",
        subscribeSuccess:
          "Congratulations! You have successfully subscribed to our newsletter.",
        contactUs: "Contact Us",
        contactBtn: "Get in Touch",
        contactText: "Questions? Our 24/7 support hotline is at your service.",
        designed: "Designed with ❤️ in Yüksekova",
        links: {
          kvkk: "KVKK Text",
          privacy: "Privacy Policy",
          cookies: "Cookie Policy",
          terms: "Rental Terms",
          faq: "FAQ",
        },
      },
      about: {
        title: "About Us",
        story: "Our Corporate Story",
        teamTitle: "Management and Operation",
        teamSubtitle: "Professional service, family warmth.",
      },
      contact: {
        title: "Contact",
        subtitle: "We are with you 24/7",
        infoTitle: "Contact Information",
        formTitle: "Contact Us",
        formSubtitle: "Fill out the form for your questions or requests.",
        name: "Name",
        surname: "Surname",
        phone: "Phone",
        email: "Email Address",
        message: "Your Message",
        send: "Send",
        checkout: {
          cancel: "Cancel and Return to Site",
          securePayment: "SECURE PAYMENT & BOOKING",
          requestCreation: "REQUEST CREATION",
          summary: "Order Summary",
          rentalService: "Rental Service",
          tourService: "Tour Service",
          saleRequest: "Purchase Request",
          rentalType: "Rental Type",
          withDriver: "Chauffeur Service",
          pickupDate: "Pickup Date",
          returnDate: "Return Date",
          dailyPrice: "Daily Price",
          duration: "Duration",
          total: "Total Amount",
          estimatedPrice: "Estimated Price",
          successTitle: "Your Transaction Was Successfully Received!",
          bookingCode: "Your Booking Code:",
          goHome: "Return to Home Page",
          personalInfo: "Personal Information",
          paymentMethod: "Payment Method",
          creditCard: "Credit Card",
          payAtOffice: "Pay at Office",
          eft: "Bank Transfer / EFT",
          securePaymentBadge: "256-Bit SSL Secure Payment",
          cardName: "Name on Card",
          cardNumber: "Card Number",
          expiryDate: "Expiry Date",
          month: "Month",
          year: "Year",
          cvv: "CVV Security Code",
          officeSelected: "Pay at Office Selected",
          officeDesc:
            "Your reservation will be created. You can pay by cash or credit card upon vehicle delivery.",
          bankName: "Ziraat Bank",
          receiver: "RECEIVER: ALPERLER AUTO",
          eftNotice:
            "Important: Please write NAME SURNAME in the description. Send the receipt to our WhatsApp line after the transaction.",
          connectingBank: "Connecting to Bank...",
          processing: "Processing...",
          confirmAndFinish: "Confirm and Finish Payment",
          completeBooking: "Complete Booking",
          sendRequest: "Send Request",
          termsNotice:
            'By clicking "Complete", you accept the Distance Selling Agreement.',
          successRentalCC:
            "Your payment has been securely received. We are waiting for you at our office for vehicle delivery.",
          successRentalEFT:
            "Your transfer notification has been received. Please send the payment receipt to our WhatsApp line at 0537 959 48 51.",
          successRentalOffice:
            "Your reservation has been created. You can make the payment at the office during vehicle delivery.",
          successOther:
            "Your request has reached us. We will get back to you from {phone} as soon as possible.",
          formSuccess: "Your message has been delivered! Thank you.",
        },
      },
      feedback: {
        title: "Send Feedback",
        subtitle: "Your feedback is valuable to us.",
        category: "Category",
        rating: "Rating",
        message: "Message",
        placeholder: "Share your experience...",
        submit: "Send",
        success: "Thank you for your feedback!",
        categories: {
          BUG: "Bug Report",
          FEATURE: "Feature Request",
          GENERAL: "General Feedback",
          CONTENT: "Content Error",
          OTHER: "Other",
        },
        analysis: {
          title: "Feedback Analysis (AI)",
          btn: "Analyze",
          loading: "Analyzing...",
          empty: "No data to analyze yet.",
        },
        hideAnalysis: "Hide Analysis",
        aiAnalysis: "Admin Analysis (AI)",
        totalFeedback: "Total Feedback:",
        successSubtitle: "Your feedback helps us improve our service quality.",
      },
      common: {
        close: "Close",
        favorites: "Favorites",
        menuToggle: "Open/Close Menu",
        addToFav: "Add to Favorites",
        removeFromFav: "Remove from Favorites",
      },
    },
    DE: {
      nav: {
        home: "Startseite",
        fleet: "Flotte",
        sales: "Autoverkauf",
        about: "Über uns",
        contact: "Kontakt",
        blog: "Blog",
        corporate: "Unternehmen",
      },
      hero: {
        title: "Führende Autovermietung in Yüksekova",
        subtitle: "Sicheres, komfortables und erstklassiges Mietwagenerlebnis.",
        cta: "Jetzt Mieten",
      },
      buttons: {
        back: "Zurück",
        close: "Schließen",
        book: "Jetzt Buchen",
        details: "Details",
        call: "Jetzt Anrufen",
        send: "Senden",
        rent: "Jetzt Mieten",
        rentDriver: "Mieten mit Fahrer",
        notAvailable: "Nicht Verfügbar",
        remove: "Entfernen",
        apply: "Bewerbung Senden",
        viewAll: "Alle Anzeigen",
        viewTours: "Alle Touren Anzeigen",
        backHome: "Zurück zur Startseite",
        complete: "Abschließen",
        pay: "Bezahlen & Beenden",
        appointment: "Termin vereinbaren",
      },
      common: {
        close: "Schließen",
        favorites: "Favoriten",
        menuToggle: "Menü öffnen/schließen",
        addToFav: "Zu Favoriten hinzufügen",
        removeFromFav: "Aus Favoriten entfernen",
      },

      filters: {
        all: "Alle",
        suv: "SUV",
        pickup: "Pickup",
        sedan: "Limousine",
        hatchback: "Kleinwagen",
        luxury: "Luxus",
        driverActive: "Chauffeurservice Aktiv",
        rented: "VERMIETET",
      },
      sort: {
        label: "Sortieren",
        default: "Empfohlen",
        priceAsc: "Preis: Aufsteigend",
        priceDesc: "Preis: Absteigend",
      },
      car: {
        day: "Tag",
        transmission: "Getriebe",
        seats: "Sitze",
        fuel: "Kraftstoff",
        auto: "Automatik",
        manual: "Manuell",
        diesel: "Diesel",
        gasoline: "Benzin",
        hybrid: "Hybrid",
        electric: "Elektrisch",
        year: "Modell",
        km: "KM",
      },
      chat: {
        title: "Live-Support",
        subtitle: "Alperler Assistent",
        placeholder: "Schreiben Sie etwas...",
        welcome:
          "Hallo! Willkommen bei Alperler Auto. Wie kann ich Ihnen helfen?",
      },
      home: {
        booking: {
          title: "Jetzt Auto Mieten",
          type: "SERVICEART",
          types: {
            individual: "Individuelle Miete",
            driver: "Miete mit Fahrer",
          },
          pickup: "ABHOLORT",
          locations: {
            center: "Yüksekova Zentrum",
            airport: "Yüksekova Flughafen",
            bus: "Yüksekova Busbahnhof",
          },
          startDate: "ABHOLDATUM",
          endDate: "RÜCKGABEDATUM",
          searchBtn: "AUTO FINDEN",
        },
        featured: {
          title: "Unsere Flotte",
          subtitle: "Bereit für jede Straße mit SUV, Pickup und Limousinen.",
          viewAll: "Alle Anzeigen",
          model: "Modell",
          perDay: "/ Tag",
          person: "Personen",
          rentNow: "Jetzt Mieten",
        },
        sales: {
          badge: "Autoverkaufsabteilung",
          title: "Besitzen Sie ein zuverlässiges Auto",
          description:
            "Holen Sie sich Ihr Traumauto mit unseren geprüften Gebrauchtwagen. Inzahlungnahme und passende Zahlungspläne warten auf Sie.",
          cta: "Autos zum Verkauf",
          viewAll: "Alle Gebrauchtwagen anzeigen",
          stats: {
            expert: "Gutachten Garantie",
            months: "Monate",
            warranty: "Mechanische Garantie",
            trade: "Inzahlungnahme",
            value: "Wertkauf",
            credit: "Kredit",
            finance: "Schnelle Finanzierung",
          },
        },
        whyUs: {
          title: "Warum Alperler Auto?",
          subtitle:
            "Wir sind hier, um nicht nur beim ersten Mal, sondern jedes Mal Ihre Wahl zu sein. Weil wir nicht nur Schlüssel übergeben, sondern Türen zu einer ganz neuen Erfahrung öffnen.",
          features: {
            trust: {
              title: "Vertrauen & Versicherung",
              desc: "Vollkaskoversicherte, werkstattgepflegte Fahrzeuge. Keine Überraschungskosten, volle Sicherheit.",
            },
            support: {
              title: "24/7 Live-Support",
              desc: "Wir sind in jedem Moment Ihrer Reise bei Ihnen. Sie können uns jederzeit unter 0537 959 48 51 erreichen.",
            },
            comfort: {
              title: "Komfortable Reise",
              desc: "Detaillierte Reinigung vor jeder Übergabe. Maximaler Komfort mit neuen Modellen.",
            },
          },
        },
        partner: {
          title: "Vermieten Sie Ihr Auto an uns",
          subtitle:
            "Lassen Sie Ihr Auto Geld verdienen, anstatt stillzustehen. Schließen Sie Ihr Fahrzeug unserer Flotte mit Alperler-Sicherheit an, verdienen Sie regelmäßiges Einkommen.",
          requirements: {
            title: "Bewerbungsbedingungen",
            year: "Muss mindestens Modell 2018 sein.",
            damage: "Kein schwerer Unfallschaden.",
            maintenance:
              "Alle Wartungen müssen bei autorisierten Diensten durchgeführt werden.",
          },
          form: {
            title: "Fahrzeugbewerbungsformular",
            success: {
              title: "Bewerbung Erhalten!",
              message:
                "Unser Expertenteam wird Ihr Fahrzeug prüfen und sich so schnell wie möglich bei Ihnen melden.",
            },
            name: "Vorname Nachname",
            phone: "Telefon",
            car: "Auto Marke/Modell",
            year: "Modelljahr",
            km: "Kilometerstand (KM)",
            photos: "Auto Fotos / Video",
            upload: "Foto oder Video Hochladen",
            maxFiles: "(Max 10 Dateien)",
            notes: "Zusätzliche Notizen",
            notesPlaceholder: "Was Sie über das Fahrzeug hinzufügen möchten...",
            submit: "Bewerbung Senden",
          },
        },
        tours: {
          title: "Yüksekova Entdeckungstouren",
          subtitle:
            "Einzigartige Routen von den Cilo-Bergen bis zu den Gletschern erwarten Sie.",
          bookBtn: "Jetzt Buchen",
          viewAll: "Alle Touren Anzeigen",
        },
        vipAndMinibus: {
          badge: "SPECIAL EVENTS & GROUP TRANSPORTATION",
          title:
            "Professional Solutions for Weddings, Engagements, and Group Trips",
          description:
            "Flawless service on your most special days! We are with you with our luxury VIP vehicles for weddings and bridal cars. We also ease your burden with our comfortable, 15-20 passenger chauffeured minibus rentals for moving wedding guests, school transport, tourist trips, picnics, and large families.",
          cta: "Get a Special Quote",
          features: {
            wedding: "Luxury Wedding & Bridal Cars",
            minibus: "15-20 Passenger Minibuses",
            group: "Wedding Convoy & Guest Transport",
            tourist: "Tourist & Picnic Services",
          },
        },
        campaigns: {
          early: "Frühbucherrabatt",
          roadside: "Ununterbrochene Pannenhilfe",
          free: "KOSTENLOS",
          delivery: "Flughafen- & Terminalzustellung",
        },
      },
      sales: {
        headerTitle: "Zuverlässige Gebrauchtwagen",
        headerSubtitle: "Fahrzeuge mit Gutachten, Garantie und Inzahlungnahme.",
        badge: "Autoverkaufsabteilung",
        card1: "Zuverlässige Gebrauchte",
        card2: "Gutachten",
        card3: "Garantieoptionen",
        card4: "Inzahlungnahme",
        expert: "Gutachten / Zustand",
        appointment: "Termin Vereinbaren",
        buy: "Jetzt Kaufen",
        status: { forSale: "Zu Verkaufen" },
      },
      contact: {
        title: "Kontakt",
        subtitle: "Wir sind 24/7 bei Ihnen",
        infoTitle: "Kontaktinformationen",
        formTitle: "Kontaktieren Sie uns",
        formSubtitle:
          "Füllen Sie das Formular für Ihre Fragen oder Anfragen aus.",
        name: "Name",
        surname: "Nachname",
        phone: "Telefon",
        email: "E-Mail",
        message: "Nachricht",
        successTitle: "Transaktion Erfolgreich Empfangen!",
        successText:
          "Wir haben Ihre Anfrage erhalten. Wir werden uns so schnell wie möglich bei Ihnen melden.",
        summary: "Bestellübersicht",
        personalInfo: "Persönliche Informationen",
        paymentMethod: "Zahlungsmethode",
        creditCard: "Kreditkarte",
        office: "Im Büro Bezahlen",
        eft: "Überweisung / EFT",
        total: "Gesamtbetrag",
        days: "Tage",
        checkout: {
          cancel: "Abbrechen & Zurück",
          securePayment: "SICHERE ZAHLUNG & RESERVIERUNG",
          createRequest: "ANFRAGE ERSTELLEN",
          rentalService: "Mietservice",
          tourService: "Tourservice",
          saleRequest: "Kaufanfrage",
          pickupDate: "Abholdatum",
          returnDate: "Rückgabedatum",
          dailyPrice: "Tagespreis",
          duration: "Dauer",
          estimatedCost: "Geschätzte Kosten",
          reservationCode: "Reservierungscode",
          returnHome: "Zurück zur Startseite",
          cardHolder: "Karteninhaber",
          cardNumber: "Kartennummer",
          expiryDate: "Ablaufdatum",
          cvv: "CVV Sicherheitscode",
          officePaymentSelected: "Zahlung im Büro ausgewählt",
          bankName: "Ziraat Bank",
          important: "Wichtig:",
          contract: "Fernabsatzvertrag",
        },
      },
      footer: {
        rights: "Alle Rechte vorbehalten.",
        support: "24/7 Live-Support",
        corporate: "Unternehmen",
        legal: "Rechtliches",
        contactUs: "Kontaktieren Sie uns",
        contactText: "Fragen? Unsere 24/7-Support-Hotline ist für Sie da.",
        designed: "Entworfen mit ❤️ in Yüksekova",
        links: {
          kvkk: "KVKK Text",
          privacy: "Datenschutz",
          cookies: "Cookie-Richtlinie",
          terms: "Mietbedingungen",
          faq: "FAQ",
        },
      },
    },
    FR: {
      nav: {
        home: "Accueil",
        fleet: "Flotte",
        sales: "Vente Auto",
        about: "À propos",
        contact: "Contact",
        blog: "Blog",
        corporate: "Entreprise",
      },
      hero: {
        title: "Location de voitures leader à Yüksekova",
        subtitle:
          "Expérience de location de voiture sûre, confortable et premium.",
        cta: "Louer Maintenant",
      },
      buttons: {
        back: "Retour",
        close: "Fermer",
        book: "Réserver",
        details: "Détails",
        call: "Appeler",
        send: "Envoyer",
        rent: "Louer",
        rentDriver: "Louer avec Chauffeur",
        notAvailable: "Indisponible",
        remove: "Supprimer",
        apply: "Soumettre",
        viewAll: "Voir Tout",
        viewTours: "Voir Tours",
        backHome: "Retour Accueil",
        complete: "Terminer",
        pay: "Payer & Finir",
        appointment: "Prendre rendez-vous",
      },
      common: {
        close: "Fermer",
        favorites: "Favoris",
        menuToggle: "Ouvrir/Fermer le Menu",
        addToFav: "Ajouter aux Favoris",
        removeFromFav: "Supprimer des Favoris",
      },

      filters: {
        all: "Tous",
        suv: "SUV",
        pickup: "Pickup",
        sedan: "Berline",
        hatchback: "Économique",
        luxury: "Luxe",
        driverActive: "Service Chauffeur Actif",
        rented: "LOUÉ",
      },
      sort: {
        label: "Trier",
        default: "Recommandé",
        priceAsc: "Prix: Croissant",
        priceDesc: "Prix: Décroissant",
      },
      car: {
        day: "jour",
        transmission: "Transmission",
        seats: "Sièges",
        fuel: "Carburant",
        auto: "Automatique",
        manual: "Manuel",
        diesel: "Diesel",
        gasoline: "Essence",
        hybrid: "Hybride",
        electric: "Électrique",
        year: "Modèle",
        km: "KM",
      },
      chat: {
        title: "Support en direct",
        subtitle: "Assistant Alperler",
        placeholder: "Écrivez quelque chose...",
        welcome:
          "Bonjour ! Bienvenue chez Alperler Auto. Comment puis-je vous aider ?",
      },
      home: {
        booking: {
          title: "Louer une Voiture Maintenant",
          type: "TYPE DE SERVICE",
          types: {
            individual: "Location Individuelle",
            driver: "Location avec Chauffeur",
          },
          pickup: "LIEU DE PRISE EN CHARGE",
          locations: {
            center: "Centre Yüksekova",
            airport: "Aéroport Yüksekova",
            bus: "Gare Routière Yüksekova",
          },
          startDate: "DATE DE DÉPART",
          endDate: "DATE DE RETOUR",
          searchBtn: "TROUVER VOITURE",
        },
        featured: {
          title: "Notre Flotte Vedette",
          subtitle:
            "Prêt pour toutes les routes avec des options SUV, Pickup et Berline.",
          viewAll: "Voir Tout",
          model: "Modèle",
          perDay: "/ jour",
          person: "Personnes",
          rentNow: "Louer Maintenant",
        },
        sales: {
          badge: "Division Vente Auto",
          title: "Possédez une Voiture Fiable",
          description:
            "Obtenez la voiture de vos rêves avec nos véhicules d'occasion garantis et bien entretenus. Options de reprise et plans de paiement adaptés vous attendent.",
          cta: "Voir les Voitures",
          viewAll: "Voir tous les véhicules d'occasion",
          stats: {
            expert: "Garantie Expertise",
            months: "Mois",
            warranty: "Garantie Mécanique",
            trade: "Reprise",
            value: "Achat Valeur",
            credit: "Crédit",
            finance: "Finance Rapide",
          },
        },
        whyUs: {
          title: "Pourquoi Alperler Auto ?",
          subtitle:
            "Nous sommes là pour être votre choix à chaque fois. Parce que nous ne remettons pas seulement des clés, nous ouvrons les portes d'une toute nouvelle expérience.",
          features: {
            trust: {
              title: "Confiance & Assurance",
              desc: "Véhicules entièrement assurés et entretenus. Pas de coûts surprises, assurance totale.",
            },
            support: {
              title: "Support 24/7",
              desc: "Nous sommes avec vous à chaque instant de votre voyage. Vous pouvez nous joindre au 0537 959 48 51 à tout moment.",
            },
            comfort: {
              title: "Voyage Confortable",
              desc: "Nettoyage détaillé avant chaque livraison. Confort maximal avec de nouveaux modèles.",
            },
          },
        },
        partner: {
          title: "Louez votre voiture à nous",
          subtitle:
            "Laissez votre voiture gagner de l'argent au lieu de rester inactive. Rejoignez notre flotte avec l'assurance Alperler, gagnez un revenu régulier.",
          requirements: {
            title: "Conditions de Candidature",
            year: "Doit être au moins Modèle 2018.",
            damage: "Pas de dommages lourds.",
            maintenance:
              "Tout entretien doit être fait par des services agréés.",
          },
          form: {
            title: "Formulaire de Candidature",
            success: {
              title: "Candidature Reçue !",
              message:
                "Notre équipe d'experts examinera votre véhicule et vous répondra dès que possible.",
            },
            name: "Nom Prénom",
            phone: "Téléphone",
            car: "Marque/Modèle Voiture",
            year: "Année Modèle",
            km: "Kilométrage (KM)",
            photos: "Photos / Vidéo Voiture",
            upload: "Télécharger Photo ou Vidéo",
            maxFiles: "(Max 10 Fichiers)",
            notes: "Notes Supplémentaires",
            notesPlaceholder: "Ce que vous voulez ajouter sur le véhicule...",
            submit: "Soumettre Candidature",
          },
        },
        tours: {
          title: "Tours de Découverte",
          subtitle:
            "Des routes uniques des montagnes Cilo aux glaciers vous attendent.",
          bookBtn: "Réserver",
          viewAll: "Voir Tours",
        },
        vipAndMinibus: {
          badge: "SPECIAL EVENTS & GROUP TRANSPORTATION",
          title:
            "Professional Solutions for Weddings, Engagements, and Group Trips",
          description:
            "Flawless service on your most special days! We are with you with our luxury VIP vehicles for weddings and bridal cars. We also ease your burden with our comfortable, 15-20 passenger chauffeured minibus rentals for moving wedding guests, school transport, tourist trips, picnics, and large families.",
          cta: "Get a Special Quote",
          features: {
            wedding: "Luxury Wedding & Bridal Cars",
            minibus: "15-20 Passenger Minibuses",
            group: "Wedding Convoy & Guest Transport",
            tourist: "Tourist & Picnic Services",
          },
        },
        campaigns: {
          early: "Réduction Réservation Anticipée",
          roadside: "Assistance Routière Ininterrompue",
          free: "GRATUIT",
          delivery: "Livraison Aéroport & Terminal",
        },
      },
      sales: {
        headerTitle: "Occasion Fiable",
        headerSubtitle: "Véhicules avec rapports d'expertise et garantie.",
        badge: "Division Vente Auto",
        card1: "Occasion Fiable",
        card2: "Rapport Expertise",
        card3: "Options Garantie",
        card4: "Reprise Possible",
        expert: "Expertise / État",
        appointment: "Prendre Rendez-vous",
        buy: "Acheter",
        status: { forSale: "À Vendre" },
      },
      contact: {
        title: "Contact",
        subtitle: "Nous sommes avec vous 24/7",
        infoTitle: "Informations de Contact",
        formTitle: "Contactez-nous",
        formSubtitle: "Remplissez le formulaire pour vos questions.",
        name: "Nom",
        surname: "Prénom",
        phone: "Téléphone",
        email: "E-mail",
        message: "Message",
        successTitle: "Transaction Reçue !",
        successText:
          "Nous avons reçu votre demande. Nous vous répondrons dès que possible.",
        summary: "Résumé Commande",
        personalInfo: "Infos Personnelles",
        paymentMethod: "Méthode de Paiement",
        creditCard: "Carte Crédit",
        office: "Payer au Bureau",
        eft: "Virement Bancaire",
        total: "Montant Total",
        days: "Jours",
        checkout: {
          cancel: "Annuler & Retour",
          securePayment: "PAIEMENT SÉCURISÉ & RÉSERVATION",
          createRequest: "CRÉER DEMANDE",
          rentalService: "Service Location",
          tourService: "Service Tour",
          saleRequest: "Demande Achat",
          pickupDate: "Date Prise",
          returnDate: "Date Retour",
          dailyPrice: "Prix Journalier",
          duration: "Durée",
          estimatedCost: "Coût Estimé",
          reservationCode: "Code Réservation",
          returnHome: "Retour Accueil",
          cardHolder: "Titulaire Carte",
          cardNumber: "Numéro Carte",
          expiryDate: "Date Expiration",
          cvv: "Code Sécurité CVV",
          officePaymentSelected: "Paiement au Bureau Sélectionné",
          bankName: "Ziraat Bank",
          important: "Important:",
          contract: "Contrat Vente Distance",
        },
      },
      footer: {
        rights: "Tous droits réservés.",
        support: "Support en direct 24/7",
        corporate: "Entreprise",
        legal: "Légal",
        contactUs: "Contactez-nous",
        contactText:
          "Des questions ? Notre ligne de support 24/7 est à votre service.",
        designed: "Conçu avec ❤️ à Yüksekova",
        footerText:
          "Votre compagnon de voyage avec un service de location de voiture fiable à Yüksekova. Service premium, voyage en toute sécurité.",
        links: {
          kvkk: "Texte KVKK",
          privacy: "Politique Confidentialité",
          cookies: "Politique Cookies",
          terms: "Conditions Location",
          faq: "FAQ",
        },
      },
    },
    ES: {
      nav: {
        home: "Inicio",
        fleet: "Flota",
        sales: "Venta de Autos",
        about: "Nosotros",
        contact: "Contacto",
        blog: "Blog",
        corporate: "Corporativo",
      },
      hero: {
        title: "Alquiler de coches líder en Yüksekova",
        subtitle: "Experiencia de alquiler de coches segura, cómoda y premium.",
        cta: "Alquilar Ahora",
      },
      buttons: {
        back: "Volver",
        close: "Cerrar",
        book: "Reservar",
        details: "Detalles",
        call: "Llamar",
        send: "Enviar",
        rent: "Alquilar",
        rentDriver: "Alquilar con Conductor",
        notAvailable: "No Disponible",
        remove: "Eliminar",
        apply: "Enviar Solicitud",
        viewAll: "Ver Todo",
        viewTours: "Ver Tours",
        backHome: "Volver al Inicio",
        complete: "Completar",
        pay: "Pagar y Terminar",
        appointment: "Pedir Cita",
      },
      common: {
        close: "Cerrar",
        favorites: "Favoritos",
        menuToggle: "Abrir/Cerrar Menú",
        addToFav: "Añadir a Favoritos",
        removeFromFav: "Eliminar de Favoritos",
      },

      filters: {
        all: "Todos",
        suv: "SUV",
        pickup: "Pickup",
        sedan: "Sedán",
        hatchback: "Económico",
        luxury: "Lujo",
        driverActive: "Servicio de Chófer Activo",
        rented: "ALQUILADO",
      },
      sort: {
        label: "Ordenar",
        default: "Recomendado",
        priceAsc: "Precio: Bajo a Alto",
        priceDesc: "Precio: Alto a Bajo",
      },
      car: {
        day: "día",
        transmission: "Transmisión",
        seats: "Asientos",
        fuel: "Combustible",
        auto: "Automático",
        manual: "Manual",
        diesel: "Diésel",
        gasoline: "Gasolina",
        hybrid: "Híbrido",
        electric: "Eléctrico",
        year: "Modelo",
        km: "KM",
      },
      chat: {
        title: "Soporte en vivo",
        subtitle: "Asistente Alperler",
        placeholder: "Escribe algo...",
        welcome: "¡Hola! Bienvenido a Alperler Auto. ¿Cómo puedo ayudarte?",
      },
      home: {
        booking: {
          title: "Alquilar Coche Ahora",
          type: "TIPO DE SERVICIO",
          types: {
            individual: "Alquiler Individual",
            driver: "Alquiler con Conductor",
          },
          pickup: "LUGAR DE RECOGIDA",
          locations: {
            center: "Centro Yüksekova",
            airport: "Aeropuerto Yüksekova",
            bus: "Terminal Autobuses Yüksekova",
          },
          startDate: "FECHA RECOGIDA",
          endDate: "FECHA DEVOLUCIÓN",
          searchBtn: "BUSCAR COCHE",
        },
        featured: {
          title: "Nuestra Flota Destacada",
          subtitle:
            "Listo para cualquier camino con opciones SUV, Pickup y Sedán.",
          viewAll: "Ver Todo",
          model: "Modelo",
          perDay: "/ día",
          person: "Personas",
          rentNow: "Alquilar Ahora",
        },
        sales: {
          badge: "División de Ventas",
          title: "Posee un Auto Confiable",
          description:
            "Obtenga el auto de sus sueños con nuestros vehículos usados garantizados y bien mantenidos. Opciones de intercambio y planes de pago adecuados le esperan.",
          cta: "Ver Autos en Venta",
          viewAll: "Ver Todos los Vehículos de Ocasión",
          stats: {
            expert: "Garantía Peritaje",
            months: "Meses",
            warranty: "Garantía Mecánica",
            trade: "Intercambio",
            value: "Compra Valor",
            credit: "Crédito",
            finance: "Financiación Rápida",
          },
        },
        whyUs: {
          title: "¿Por qué Alperler Auto?",
          subtitle:
            "Estamos aquí para ser su elección no solo la primera vez, sino cada vez. Porque no solo entregamos llaves, abrimos las puertas a una experiencia completamente nueva.",
          features: {
            trust: {
              title: "Confianza y Seguro",
              desc: "Vehículos totalmente asegurados y mantenidos en servicio autorizado. Sin costos sorpresa, garantía total.",
            },
            support: {
              title: "Soporte 24/7",
              desc: "Estamos con usted en cada momento de su viaje. Puede contactarnos al 0537 959 48 51 en cualquier momento.",
            },
            comfort: {
              title: "Viaje Cómodo",
              desc: "Limpieza detallada antes de cada entrega. Máximo confort con modelos nuevos.",
            },
          },
        },
        partner: {
          title: "Alquílenos su Auto",
          subtitle:
            "Deje que su auto gane dinero en lugar de estar inactivo. Únase a nuestra flota con la garantía de Alperler, gane ingresos regulares.",
          requirements: {
            title: "Condiciones de Solicitud",
            year: "Debe ser al menos Modelo 2018.",
            damage: "Sin daños graves.",
            maintenance:
              "Todo el mantenimiento debe hacerse en servicios autorizados.",
          },
          form: {
            title: "Formulario de Solicitud",
            success: {
              title: "¡Solicitud Recibida!",
              message:
                "Nuestro equipo de expertos examinará su vehículo y le responderá lo antes posible.",
            },
            name: "Nombre Apellido",
            phone: "Teléfono",
            car: "Marca/Modelo Auto",
            year: "Año Modelo",
            km: "Kilometraje (KM)",
            photos: "Fotos / Video Auto",
            upload: "Subir Foto o Video",
            maxFiles: "(Max 10 Archivos)",
            notes: "Notas Adicionales",
            notesPlaceholder: "Lo que quiera agregar sobre el vehículo...",
            submit: "Enviar Solicitud",
          },
        },
        tours: {
          title: "Tours de Descubrimiento",
          subtitle:
            "Rutas únicas desde las montañas Cilo hasta los glaciares le esperan.",
          bookBtn: "Reservar",
          viewAll: "Ver Todos los Tours",
        },
        vipAndMinibus: {
          badge: "SPECIAL EVENTS & GROUP TRANSPORTATION",
          title:
            "Professional Solutions for Weddings, Engagements, and Group Trips",
          description:
            "Flawless service on your most special days! We are with you with our luxury VIP vehicles for weddings and bridal cars. We also ease your burden with our comfortable, 15-20 passenger chauffeured minibus rentals for moving wedding guests, school transport, tourist trips, picnics, and large families.",
          cta: "Get a Special Quote",
          features: {
            wedding: "Luxury Wedding & Bridal Cars",
            minibus: "15-20 Passenger Minibuses",
            group: "Wedding Convoy & Guest Transport",
            tourist: "Tourist & Picnic Services",
          },
        },
        campaigns: {
          early: "Descuento Reserva Anticipada",
          roadside: "Asistencia en Carretera Ininterrumpida",
          free: "GRATIS",
          delivery: "Entrega Aeropuerto y Terminal",
        },
      },
      sales: {
        headerTitle: "Segunda Mano Confiable",
        headerSubtitle: "Vehículos con informes de peritaje y garantía.",
        badge: "División de Ventas",
        card1: "Usados Confiables",
        card2: "Informe Peritaje",
        card3: "Opciones Garantía",
        card4: "Intercambio Posible",
        expert: "Peritaje / Condición",
        appointment: "Pedir Cita",
        buy: "Comprar",
        status: { forSale: "En Venta" },
      },
      contact: {
        title: "Contacto",
        subtitle: "Estamos contigo 24/7",
        infoTitle: "Información de Contacto",
        formTitle: "Contáctenos",
        formSubtitle: "Complete el formulario para sus preguntas.",
        name: "Nombre",
        surname: "Apellido",
        phone: "Teléfono",
        email: "E-mail",
        message: "Mensaje",
        successTitle: "¡Transacción Recibida!",
        successText:
          "Hemos recibido su solicitud. Le responderemos lo antes posible.",
        summary: "Resumen del Pedido",
        personalInfo: "Información Personal",
        paymentMethod: "Método de Pago",
        creditCard: "Tarjeta Crédito",
        office: "Pagar en Oficina",
        eft: "Transferencia Bancaria",
        total: "Monto Total",
        days: "Días",
        checkout: {
          cancel: "Cancelar y Volver",
          securePayment: "PAGO SEGURO Y RESERVA",
          createRequest: "CREAR SOLICITUD",
          rentalService: "Servicio Alquiler",
          tourService: "Servicio Tour",
          saleRequest: "Solicitud Compra",
          pickupDate: "Fecha Recogida",
          returnDate: "Fecha Devolución",
          dailyPrice: "Precio Diario",
          duration: "Duración",
          estimatedCost: "Costo Estimado",
          reservationCode: "Código Reserva",
          returnHome: "Volver Inicio",
          cardHolder: "Titular Tarjeta",
          cardNumber: "Número Tarjeta",
          expiryDate: "Fecha Caducidad",
          cvv: "Código Seguridad CVV",
          officePaymentSelected: "Pago en Oficina Seleccionado",
          bankName: "Ziraat Bank",
          important: "Importante:",
          contract: "Contrato Venta Distancia",
          goHome: "Volver Atrás",
        },
      },
      footer: {
        rights: "Todos los derechos reservados.",
        support: "Soporte en vivo 24/7",
        corporate: "Corporativo",
        legal: "Legal",
        contactUs: "Contáctenos",
        contactText:
          "¿Preguntas? Nuestra línea de soporte 24/7 está a su servicio.",
        designed: "Diseñado con ❤️ en Yüksekova",
        links: {
          kvkk: "Texto KVKK",
          privacy: "Política Privacidad",
          cookies: "Política Cookies",
          terms: "Condiciones Alquiler",
          faq: "FAQ",
        },
      },
    },
    RU: {
      nav: {
        home: "Главная",
        fleet: "Автопарк",
        sales: "Продажа",
        about: "О нас",
        contact: "Контакты",
        blog: "Блог",
        corporate: "Корпоративный",
      },
      hero: {
        title: "Лидер проката авто в Юксекова",
        subtitle: "Безопасный, комфортный и премиальный опыт аренды.",
        cta: "Арендовать",
      },
      buttons: {
        back: "Назад",
        close: "Закрыть",
        book: "Забронировать",
        details: "Детали",
        call: "Позвонить",
        send: "Отправить",
        rent: "Арендовать",
        rentDriver: "Аренда с водителем",
        notAvailable: "Недоступно",
        remove: "Удалить",
        apply: "Отправить заявку",
        viewAll: "Смотреть все",
        viewTours: "Смотреть туры",
        backHome: "На главную",
        complete: "Завершить",
        pay: "Оплатить",
        appointment: "Записаться",
      },
      common: {
        close: "Закрыть",
        favorites: "Избранное",
        menuToggle: "Открыть/Закрыть меню",
        addToFav: "Добавить в избранное",
        removeFromFav: "Удалить из избранного",
      },

      filters: {
        all: "Все",
        suv: "Внедорожник",
        pickup: "Пикап",
        sedan: "Седан",
        hatchback: "Эконом",
        luxury: "Люкс",
        driverActive: "Услуга водителя активна",
        rented: "АРЕНДОВАНО",
      },
      sort: {
        label: "Сортировка",
        default: "Рекомендуемые",
        priceAsc: "Цена: по возрастанию",
        priceDesc: "Цена: по убыванию",
      },
      car: {
        day: "день",
        transmission: "Коробка",
        seats: "Мест",
        fuel: "Топливо",
        auto: "Автомат",
        manual: "Механика",
        diesel: "Дизель",
        gasoline: "Бензин",
        hybrid: "Гибрид",
        electric: "Электро",
        year: "Год",
        km: "КМ",
      },
      chat: {
        title: "Живая поддержка",
        subtitle: "Ассистент Alperler",
        placeholder: "Напишите что-нибудь...",
        welcome:
          "Здравствуйте! Добро пожаловать в Alperler Auto. Чем могу помочь?",
      },
      home: {
        booking: {
          title: "Арендовать авто сейчас",
          type: "ТИП УСЛУГИ",
          types: {
            individual: "Индивидуальная аренда",
            driver: "Аренда с водителем",
          },
          pickup: "МЕСТО ПОЛУЧЕНИЯ",
          locations: {
            center: "Центр Юксекова",
            airport: "Аэропорт Юксекова",
            bus: "Автовокзал Юксекова",
          },
          startDate: "ДАТА ПОЛУЧЕНИЯ",
          endDate: "ДАТА ВОЗВРАТА",
          searchBtn: "НАЙТИ АВТО",
        },
        featured: {
          title: "Наш автопарк",
          subtitle: "Готовы к любым дорогам с SUV, пикапами и седанами.",
          viewAll: "Смотреть все",
          model: "Модель",
          perDay: "/ день",
          person: "Персон",
          rentNow: "Арендовать",
        },
        sales: {
          badge: "Отдел продаж",
          title: "Купите надежный автомобиль",
          description:
            "Получите автомобиль мечты с нашими проверенными б/у авто с гарантией. Трейд-ин и удобные планы оплаты ждут вас.",
          cta: "Авто на продажу",
          viewAll: "Посмотреть все подержанные автомобили",
          stats: {
            expert: "Гарантия экспертизы",
            months: "Месяцев",
            warranty: "Механическая гарантия",
            trade: "Трейд-ин",
            value: "Выкуп по стоимости",
            credit: "Кредит",
            finance: "Быстрое финансирование",
          },
        },
        whyUs: {
          title: "Почему Alperler Auto?",
          subtitle:
            "Мы здесь, чтобы быть вашим выбором не только в первый раз, но и каждый раз. Потому что мы не просто передаем ключи, мы открываем двери к совершенно новому опыту.",
          features: {
            trust: {
              title: "Доверие и Страховка",
              desc: "Полностью застрахованные и обслуженные у официалов авто. Никаких скрытых расходов, полная гарантия.",
            },
            support: {
              title: "24/7 Поддержка",
              desc: "Мы с вами в любой момент вашего путешествия. Вы можете связаться с нами по номеру 0537 959 48 51 в любое время.",
            },
            comfort: {
              title: "Комфортное путешествие",
              desc: "Детальная чистка перед каждой подачей. Максимальный комфорт с новыми моделями.",
            },
          },
        },
        partner: {
          title: "Сдайте нам свое авто",
          subtitle:
            "Пусть ваша машина зарабатывает, а не простаивает. Присоединяйтесь к нашему автопарку с гарантией Alperler, получайте регулярный доход.",
          requirements: {
            title: "Условия заявки",
            year: "Не старше 2018 года.",
            damage: "Без серьезных повреждений.",
            maintenance: "Обслуживание в официальных сервисах.",
          },
          form: {
            title: "Форма заявки на авто",
            success: {
              title: "Заявка принята!",
              message:
                "Наши эксперты осмотрят ваш автомобиль и свяжутся с вами в ближайшее время.",
            },
            name: "Имя Фамилия",
            phone: "Телефон",
            car: "Марка/Модель авто",
            year: "Год выпуска",
            km: "Пробег (КМ)",
            photos: "Фото / Видео авто",
            upload: "Загрузить фото или видео",
            maxFiles: "(Макс 10 файлов)",
            notes: "Дополнительные заметки",
            notesPlaceholder: "Что вы хотите добавить об автомобиле...",
            submit: "Отправить заявку",
          },
        },
        tours: {
          title: "Туры открытий",
          subtitle: "Уникальные маршруты от гор Джило до ледников ждут вас.",
          bookBtn: "Забронировать",
          viewAll: "Смотреть все туры",
        },
        vipAndMinibus: {
          badge: "SPECIAL EVENTS & GROUP TRANSPORTATION",
          title:
            "Professional Solutions for Weddings, Engagements, and Group Trips",
          description:
            "Flawless service on your most special days! We are with you with our luxury VIP vehicles for weddings and bridal cars. We also ease your burden with our comfortable, 15-20 passenger chauffeured minibus rentals for moving wedding guests, school transport, tourist trips, picnics, and large families.",
          cta: "Get a Special Quote",
          features: {
            wedding: "Luxury Wedding & Bridal Cars",
            minibus: "15-20 Passenger Minibuses",
            group: "Wedding Convoy & Guest Transport",
            tourist: "Tourist & Picnic Services",
          },
        },
        campaigns: {
          early: "Скидка за раннее бронирование",
          roadside: "Непрерывная помощь на дороге",
          free: "БЕСПЛАТНО",
          delivery: "Доставка в аэропорт и терминал",
        },
      },
      sales: {
        headerTitle: "Надежные б/у авто",
        headerSubtitle: "Автомобили с отчетами экспертизы и гарантией.",
        badge: "Отдел продаж",
        card1: "Надежные б/у",
        card2: "Отчет экспертизы",
        card3: "Гарантия",
        card4: "Трейд-ин",
        expert: "Экспертиза / Состояние",
        appointment: "Записаться",
        buy: "Купить",
        status: { forSale: "Продается" },
      },
      contact: {
        title: "Контакты",
        subtitle: "Мы с вами 24/7",
        infoTitle: "Контактная информация",
        formTitle: "Свяжитесь с нами",
        formSubtitle: "Заполните форму для вопросов.",
        name: "Имя",
        surname: "Фамилия",
        phone: "Телефон",
        email: "Email",
        message: "Сообщение",
        successTitle: "Заявка принята!",
        successText:
          "Мы получили ваш запрос. Мы свяжемся с вами в ближайшее время.",
        summary: "Итог заказа",
        personalInfo: "Личная информация",
        paymentMethod: "Метод оплаты",
        creditCard: "Кредитная карта",
        office: "Оплата в офисе",
        eft: "Перевод",
        total: "Итого",
        days: "Дней",
        checkout: {
          cancel: "Отмена и возврат",
          securePayment: "БЕЗОПАСНАЯ ОПЛАТА И БРОНЬ",
          createRequest: "СОЗДАТЬ ЗАПРОС",
          rentalService: "Услуга аренды",
          tourService: "Тур услуга",
          saleRequest: "Запрос на покупку",
          pickupDate: "Дата получения",
          returnDate: "Дата возврата",
          dailyPrice: "Цена за день",
          duration: "Длительность",
          estimatedCost: "Ориентировочная стоимость",
          reservationCode: "Код бронирования",
          returnHome: "На главную",
          cardHolder: "Владелец карты",
          cardNumber: "Номер карты",
          expiryDate: "Срок действия",
          cvv: "CVV код",
          officePaymentSelected: "Выбрана оплата в офисе",
          bankName: "Ziraat Bank",
          important: "Важно:",
          contract: "Договор дистанционной продажи",
        },
      },
      footer: {
        rights: "Все права защищены.",
        support: "24/7 Поддержка",
        corporate: "Корпоративный",
        legal: "Правовая инфо",
        contactUs: "Свяжитесь с нами",
        contactText: "Вопросы? Наша линия поддержки 24/7 к вашим услугам.",
        designed: "Создано с ❤️ в Юксекова",
        links: {
          kvkk: "Текст KVKK",
          privacy: "Политика конфиденциальности",
          cookies: "Политика куки",
          terms: "Условия аренды",
          faq: "Часто задаваемые вопросы",
        },
      },
    },
    KU: {
      nav: { home: "Malper", fleet: "Fîloya Wesayîtan", sales: "Firotina Destê Duyem", tours: "Tûr", earn: "Wesayîta Xwe Nirxîne", about: "Derbarê Me", contact: "Têkilî", blog: "Blog", corporate: "Korporatîf" },
      hero: { title: "Li Bendê Neme: Di 5 Deqîqeyan de Pejirandin, Tavilê Bikeve Rê", subtitle: "Prosedurên dirêj û lêçûnên veşartî tune. Wesayîta xwe hilbijêre û bi ewlehî bikeve rê.", trustLine: "1001+ MÛŞTERIYÊN KÊFXWEŞ • LÊÇÛNA VEŞARTÎ TUNE • FÎLOYA EWLE", ctaSubtext: "Çareseriya bilez û hêsan", cta: "Niha Kirê Bike" },
      buttons: { back: "Vegere", close: "Bigire", book: "Rezervasyon Bike", details: "Hûrgulî", call: "Niha Telefon Bike", send: "Bişîne", rent: "Niha Kirê Bike", rentDriver: "Bi Şofêr Kirê Bike", notAvailable: "Ne Amade Ye", remove: "Rake", apply: "Daxwazê Bişîne", viewAll: "Hemûyan Bibîne", viewAllFleet: "HEMÛ WESAYÎTÊN KIRÊKÎ", viewAllSales: "HEMÛ WESAYÎTÊN FIROTINÊ", viewTours: "Hemû Tûran Bibîne", backHome: "Vegere Malperê", complete: "Temam Bike", pay: "Bide û Temam Bike", appointment: "Daxwaza Randevûyê" },
      common: { close: "Bigire", favorites: "Favorî", menuToggle: "Menûyê Veke an Bigire", addToFav: "Bike Favorî", removeFromFav: "Ji Favoriyan Rake", searchPlaceholder: "Wesayît bigere..." },
      filters: { all: "Hemû", pickup: "Pikap", sedan: "Sedan", hatchback: "Ekonomîk", luxury: "Luks", minibus: "Mînîbus", vip: "VIP", driverActive: "Vebijarka Kirêkirina bi Şofêr Çalak e", rented: "HATIYE KIRÊKIRIN", brand: "Marka û Model", series: "Serî", priceRange: "Navbera Biha", kmRange: "Navbera Kilometreyê", color: "Reng", engine: "Hêza / Hecma Motorê", fuel: "Cureyê Sotemeniyê", transmission: "Cureyê Vitesê", year: "Sala Modelê", damage: "Rewşa Ziyanê" },
      sort: { label: "Rêzkirin", default: "Pêşniyarkirî", priceAsc: "Biha: Ji Kêm ber Bi Zêde", priceDesc: "Biha: Ji Zêde ber Bi Kêm" },
      car: { day: "roj", transmission: "Vites", seats: "Kes", fuel: "Sotemenî", auto: "Otomatîk", manual: "Manuel", diesel: "Dîzel", gasoline: "Benzîn", hybrid: "Hîbrît", electric: "Elektrîk", year: "Model", km: "KM", overview: "Nêrîna Giştî", availability: "Rewşa Amadeyiyê", available: "Amade", similarCars: "Wesayîtên Wekhev", description: "Danasîn", features: "Taybetmendî", details: "Hûrgulî", rentNow: "Niha Kirê Bike", buyNow: "Bikire", listingNo: "Hejmara Îlanê", location: "Hakkari / Yüksekova", callNow: "Niha Telefon Bike", sendMessage: "Peyam Bişîne", whatsappAsk: "Ji WhatsAppê Bipirse" },
      fleet: { subtitle: "Wesayîtên bihêz, rehet û guncaw ji bo rêyên Yüksekova.", searchPlaceholder: "Wesayît Bigere (Marka, Model...)", filterType: "Parzûnên Cureyê Wesayîtê", filterBtn: "Parzûn Bike", sortBtn: "Rêz Bike" },
      home: { booking: { title: "Bi Bilez Wesayît Kirê Bike", type: "Cureyê Xizmetê", types: { individual: "Kirêkirina Kesane", driver: "Kirêkirina bi Şofêr" }, pickup: "Cihê Teslîmgirtinê", locations: { center: "Navenda Yüksekova", airport: "Balafirgeha Yüksekova", bus: "Otogara Yüksekova" }, startDate: "Dîroka Girtinê", endDate: "Dîroka Vegerandinê", searchBtn: "Wesayît Bibîne" }, featured: { badge: "WESAYÎTÊN KIRÊKÎ", title: "Wesayîtên Ewle û Paqij", subtitle: "Wesayîtên ku bakımên wan hatine kirin û ji bo rêwîtiyê amade ne.", viewAll: "Hemû Fîloyê Bibîne", perDay: "/ roj", person: "Kes", rentNow: "Niha Kirê Bike" }, sales: { badge: "WESAYÎTÊN DESTÊ DUYEM", title: "Wesayîtên Destê Duyem ên Bêpirsgirêk û Bi Garantî", description: "Bi dîroka vekirî, ekspertîz û kontrolên temam wesayîta xwe bi ewlehî bikire.", cta: "Wesayîtên Firotinê Bibîne", viewAll: "Hemû Wesayîtên Firotinê Bibîne" }, tours: { title: "Tûrên Keşfê yên Yüksekova", subtitle: "Rêyên taybet ji çiyayên Cîlo heta geliyên Hakkari li benda we ne.", bookBtn: "Niha Rezervasyon Bike", viewAll: "Hemû Tûran Bibîne" }, whyUs: { title: "Çima Alperler Auto?", subtitle: "Ewlehî, şefafî û xizmeta bilez di her gavê de." } },
      sales: { headerTitle: "Wesayîtên Destê Duyem ên Ewle", headerSubtitle: "Wesayîtên bi ekspertîz û kontrolkirî.", badge: "Firotina Wesayîtan", appointment: "Randevû", buy: "Bikire", status: { forSale: "Tê Firotin" } },
      contact: { title: "Têkilî", subtitle: "24/7 Em Li Gel We Ne", infoTitle: "Agahiyên Têkiliyê", formTitle: "Bi Me Re Têkilî Daynin", formSubtitle: "Ji bo pirs û daxwazên xwe formê dagirin.", name: "Nav", surname: "Paşnav", phone: "Telefon", email: "E-Posta", message: "Peyam", send: "Bişîne", successTitle: "Daxwaza We Hate Wergirtin!", successText: "Daxwaza we gihîşt me. Em ê di demeke nêzîk de bi we re têkilî daynin." },
      footer: { rights: "Hemû Maf Parastî Ne.", support: "Piştgiriya 24/7", corporate: "Korporatîf", legal: "Yasayî", newsletter: "Abonetiya Nûçenameyê", newsletterSub: "Ji kampanya û wesayîtên nû agahdar bibin.", emailPlaceholder: "Navnîşana e-postayê", subscribeBtn: "Belaş Abone Bibe", contactUs: "Bi Me Re Têkilî Daynin", contactBtn: "Têkilî", contactText: "Pirsên we hene? Xeta piştgiriyê 24/7 li xizmeta we ye.", links: { privacy: "Polîtîkaya Nepenîtiyê", cookies: "Polîtîkaya Çerezan", terms: "Mercên Kirêkirinê", faq: "Pirsên Pir Tên Pirsîn" } }
    },
    ZH: {
      nav: {
        home: "首页",
        fleet: "车队",
        sales: "汽车销售",
        about: "关于我们",
        contact: "联系方式",
        blog: "博客",
        corporate: "企业",
      },
      hero: {
        title: "Yüksekova 领先的汽车租赁",
        subtitle: "安全、舒适和优质的租车体验。",
        cta: "立即租赁",
      },
      buttons: {
        back: "返回",
        close: "关闭",
        book: "立即预订",
        details: "详情",
        call: "立即致电",
        send: "发送",
        rent: "立即租赁",
        rentDriver: "带司机租赁",
        notAvailable: "不可用",
        remove: "移除",
        apply: "提交申请",
        viewAll: "查看全部",
        viewTours: "查看所有旅游",
        backHome: "返回首页",
        complete: "完成",
        pay: "支付并完成",
        appointment: "预约",
      },
      common: {
        close: "关闭",
        favorites: "收藏夹",
        menuToggle: "打开/关闭菜单",
        addToFav: "添加到收藏夹",
        removeFromFav: "从收藏夹移除",
      },

      filters: {
        all: "全部",
        suv: "SUV",
        pickup: "皮卡",
        sedan: "轿车",
        hatchback: "经济型",
        luxury: "豪华",
        driverActive: "司机服务已激活",
        rented: "已租",
      },
      sort: {
        label: "排序",
        default: "推荐",
        priceAsc: "价格：从低到高",
        priceDesc: "价格：从高到低",
      },
      car: {
        day: "天",
        transmission: "变速箱",
        seats: "座位",
        fuel: "燃料",
        auto: "自动",
        manual: "手动",
        diesel: "柴油",
        gasoline: "汽油",
        hybrid: "混合动力",
        electric: "电动",
        year: "年款",
        km: "公里",
      },
      chat: {
        title: "在线支持",
        subtitle: "Alperler 助手",
        placeholder: "写点什么...",
        welcome: "您好！欢迎来到 Alperler Auto。我能为您做什么？",
      },
      home: {
        booking: {
          title: "立即租车",
          type: "服务类型",
          types: { individual: "个人租赁", driver: "带司机租赁" },
          pickup: "取车地点",
          locations: {
            center: "Yüksekova 中心",
            airport: "Yüksekova 机场",
            bus: "Yüksekova 巴士总站",
          },
          startDate: "取车日期",
          endDate: "还车日期",
          searchBtn: "查找车辆",
        },
        featured: {
          title: "精选车队",
          subtitle: "SUV、皮卡和轿车，随时准备出发。",
          viewAll: "查看全部",
          model: "型号",
          perDay: "/ 天",
          person: "人",
          rentNow: "立即租赁",
        },
        sales: {
          badge: "汽车销售部",
          title: "拥有可靠的汽车",
          description:
            "通过我们有保障、维护良好的二手车，获得您梦想中的汽车。以旧换新和合适的付款计划等着您。",
          cta: "查看待售车辆",
          viewAll: "查看所有二手车",
          stats: {
            expert: "专业保证",
            months: "月",
            warranty: "机械保修",
            trade: "以旧换新",
            value: "保值收购",
            credit: "信用",
            finance: "快速融资",
          },
        },
        whyUs: {
          title: "为什么选择 Alperler Auto？",
          subtitle:
            "我们在这里不仅是您第一次的选择，也是您每一次的选择。因为我们不仅交付钥匙，还为您开启全新的体验之门。",
          features: {
            trust: {
              title: "信任与保险",
              desc: "全额保险，授权服务维护的车辆。无隐形费用，全面保障。",
            },
            support: {
              title: "24/7 实时支持",
              desc: "我们在您旅程的每一刻与您同在。您可以随时拨打 0537 959 48 51 联系我们。",
            },
            comfort: {
              title: "舒适旅程",
              desc: "每次交付前进行详细清洁。新车型带来最大舒适度。",
            },
          },
        },
        partner: {
          title: "把您的车租给我们",
          subtitle:
            "让您的车赚钱，而不是闲置。加入我们的车队，享受 Alperler 保障，获得定期收入。",
          requirements: {
            title: "申请条件",
            year: "必须至少是 2018 年款。",
            damage: "无重大事故记录。",
            maintenance: "所有维护必须在授权服务处进行。",
          },
          form: {
            title: "车辆申请表",
            success: {
              title: "收到申请！",
              message: "我们的专家团队将检查您的车辆，并尽快回复您。",
            },
            name: "姓名",
            phone: "电话",
            car: "汽车品牌/型号",
            year: "车型年份",
            km: "行驶里程 (KM)",
            photos: "汽车照片/视频",
            upload: "上传照片或视频",
            maxFiles: "(最多 10 个文件)",
            notes: "补充说明",
            notesPlaceholder: "您想补充关于车辆的信息...",
            submit: "提交申请",
          },
        },
        tours: {
          title: "Yüksekova 探索之旅",
          subtitle: "从 Cilo 山脉到冰川的独特路线等着您。",
          bookBtn: "立即预订",
          viewAll: "查看所有旅游",
        },
        vipAndMinibus: {
          badge: "SPECIAL EVENTS & GROUP TRANSPORTATION",
          title:
            "Professional Solutions for Weddings, Engagements, and Group Trips",
          description:
            "Flawless service on your most special days! We are with you with our luxury VIP vehicles for weddings and bridal cars. We also ease your burden with our comfortable, 15-20 passenger chauffeured minibus rentals for moving wedding guests, school transport, tourist trips, picnics, and large families.",
          cta: "Get a Special Quote",
          features: {
            wedding: "Luxury Wedding & Bridal Cars",
            minibus: "15-20 Passenger Minibuses",
            group: "Wedding Convoy & Guest Transport",
            tourist: "Tourist & Picnic Services",
          },
        },
        campaigns: {
          early: "早鸟折扣",
          roadside: "不间断道路救援",
          free: "免费",
          delivery: "机场和终点站送车",
        },
      },
      sales: {
        headerTitle: "可靠的二手车",
        headerSubtitle: "带有专业报告和保修的车辆。",
        badge: "汽车销售部",
        card1: "可靠二手车",
        card2: "专业报告",
        card3: "保修选项",
        card4: "以旧换新",
        expert: "专业 / 状况",
        appointment: "预约",
        buy: "购买",
        status: { forSale: "待售" },
      },
      contact: {
        title: "联系方式",
        subtitle: "我们 24/7 与您同在",
        infoTitle: "联系信息",
        formTitle: "联系我们",
        formSubtitle: "填写表格以咨询问题。",
        name: "姓名",
        surname: "姓氏",
        phone: "电话",
        email: "电子邮件",
        message: "信息",
        successTitle: "交易成功接收！",
        successText: "我们已收到您的请求。我们将尽快回复您。",
        summary: "订单摘要",
        personalInfo: "个人信息",
        paymentMethod: "支付方式",
        creditCard: "信用卡",
        office: "办公室支付",
        eft: "银行转账",
        total: "总金额",
        days: "天",
        checkout: {
          cancel: "取消并返回",
          securePayment: "安全支付和预订",
          createRequest: "创建请求",
          rentalService: "租赁服务",
          tourService: "旅游服务",
          saleRequest: "购买请求",
          pickupDate: "取车日期",
          returnDate: "还车日期",
          dailyPrice: "日价格",
          duration: "时长",
          estimatedCost: "预计费用",
          reservationCode: "预订代码",
          returnHome: "返回首页",
          cardHolder: "持卡人姓名",
          cardNumber: "卡号",
          expiryDate: "有效期",
          cvv: "CVV 安全码",
          officePaymentSelected: "已选择办公室支付",
          bankName: "Ziraat Bank",
          important: "重要提示：",
          contract: "远程销售协议",
          goHome: "返回首页",
        },
      },
      footer: {
        rights: "版权所有。",
        support: "24/7 在线支持",
        corporate: "企业",
        legal: "法律",
        contactUs: "联系我们",
        contactText: "有问题？我们的 24/7 支持热线为您服务。",
        designed: "在 Yüksekova 用 ❤️ 设计",
        links: {
          kvkk: "KVKK 文本",
          privacy: "隐私政策",
          cookies: "Cookie 政策",
          terms: "租赁条款",
          faq: "常见问题",
        },
      },
    },
    AR: {
      nav: {
        home: "الرئيسية",
        fleet: "الأسطول",
        sales: "مبيعات السيارات",
        about: "من نحن",
        contact: "اتصل بنا",
        blog: "مدونة",
        corporate: "شركات",
      },
      hero: {
        title: "تأجير السيارات الرائد في يوكسكوفا",
        subtitle: "تجربة تأجير سيارات آمنة ومريحة ومميزة.",
        cta: "استأجر الآن",
      },
      buttons: {
        back: "عودة",
        close: "إغلاق",
        book: "احجز الآن",
        details: "التفاصيل",
        call: "اتصل الآن",
        send: "إرسال",
        rent: "استأجر الآن",
        rentDriver: "تأجير مع سائق",
        notAvailable: "غير متوفر",
        remove: "إزالة",
        apply: "تقديم الطلب",
        viewAll: "عرض الكل",
        viewTours: "عرض جميع الجولات",
        backHome: "العودة للرئيسية",
        complete: "إكمال",
        pay: "دفع وإنهاء",
        appointment: "حجز موعد",
      },
      common: {
        close: "إغلاق",
        favorites: "المفضلة",
        menuToggle: "فتح/إغلاق القائمة",
        addToFav: "إضافة إلى المفضلة",
        removeFromFav: "إزالة من المفضلة",
      },
      footer: {
        rights: "جميع الحقوق محفوظة.",
        support: "دعم مباشر 24/7",
        corporate: "شركات",
        legal: "قانوني",
        contactUs: "اتصل بنا",
        contactText: "أسئلة؟ خط الدعم 24/7 في خدمتك.",
        designed: "صمم بـ ❤️ في يوكسكوفا",
        links: {
          kvkk: "نص KVKK",
          privacy: "سياسة الخصوصية",
          cookies: "سياسة ملفات تعريف الارتباط",
          terms: "شروط التأجير",
          faq: "الأسئلة الشائعة",
        },
      },
      filters: {
        all: "الكل",
        suv: "دفع رباعي",
        pickup: "بيك أب",
        sedan: "سيدان",
        hatchback: "اقتصادي",
        luxury: "فاخر",
        driverActive: "خدمة السائق نشطة",
        rented: "مؤجر",
      },
      sort: {
        label: "ترتيب",
        default: "موصى به",
        priceAsc: "السعر: من الأقل للأعلى",
        priceDesc: "السعر: من الأعلى للأقل",
      },
      car: {
        day: "يوم",
        transmission: "ناقل الحركة",
        seats: "مقاعد",
        fuel: "وقود",
        auto: "أوتوماتيك",
        manual: "يدوي",
        diesel: "ديزل",
        gasoline: "بنزين",
        hybrid: "هجين",
        electric: "كهربائي",
        year: "موديل",
        km: "كم",
      },
      chat: {
        title: "دعم مباشر",
        subtitle: "مساعد Alperler",
        placeholder: "اكتب شيئًا...",
        welcome: "مرحبًا! مرحبًا بكم في Alperler Auto. كيف يمكنني مساعدتك؟",
      },
      home: {
        booking: {
          title: "استأجر سيارة الآن",
          type: "نوع الخدمة",
          types: { individual: "تأجير فردي", driver: "تأجير مع سائق" },
          pickup: "موقع الاستلام",
          locations: {
            center: "مركز يوكسكوفا",
            airport: "مطار يوكسكوفا",
            bus: "محطة حافلات يوكسكوفا",
          },
          startDate: "تاريخ الاستلام",
          endDate: "تاريخ العودة",
          searchBtn: "ابحث عن سيارة",
        },
        featured: {
          title: "أسطولنا المميز",
          subtitle: "جاهز لأي طريق مع خيارات SUV وبيك أب وسيدان.",
          viewAll: "عرض الكل",
          model: "الموديل",
          perDay: "/ يوم",
          person: "أشخاص",
          rentNow: "استأجر الآن",
        },
        sales: {
          badge: "قسم مبيعات السيارات",
          title: "امتلك سيارة موثوقة",
          description:
            "احصل على سيارة أحلامك مع سياراتنا المستعملة المضمونة والمصانة جيدًا. خيارات الاستبدال وخطط الدفع المناسبة بانتظارك.",
          cta: "عرض السيارات للبيع",
          viewAll: "عرض جميع السيارات المستعملة",
          stats: {
            expert: "ضمان الخبرة",
            months: "أشهر",
            warranty: "ضمان ميكانيكي",
            trade: "استبدال",
            value: "شراء بالقيمة",
            credit: "ائتمان",
            finance: "تمويل سريع",
          },
        },
        whyUs: {
          title: "لماذا Alperler Auto؟",
          subtitle:
            "نحن هنا لنكون خيارك ليس فقط في المرة الأولى، ولكن في كل مرة. لأننا لا نسلم المفاتيح فحسب، بل نفتح الأبواب لتجربة جديدة تمامًا.",
          features: {
            trust: {
              title: "ثقة وتأمين",
              desc: "سيارات مؤمنة بالكامل ومصانة في الخدمة المعتمدة. لا تكاليف مفاجئة، ضمان كامل.",
            },
            support: {
              title: "دعم مباشر 24/7",
              desc: "نحن معك في كل لحظة من رحلتك. يمكنك الاتصال بنا على 0537 959 48 51 في أي وقت.",
            },
            comfort: {
              title: "رحلة مريحة",
              desc: "تنظيف مفصل قبل كل تسليم. أقصى درجات الراحة مع الموديلات الجديدة.",
            },
          },
        },
        partner: {
          title: "أجر سيارتك لنا",
          subtitle:
            "دع سيارتك تكسب المال بدلاً من أن تكون عاطلة. انضم إلى أسطولنا بضمان Alperler، واكسب دخلاً منتظمًا.",
          requirements: {
            title: "شروط التقديم",
            year: "يجب أن يكون الموديل 2018 على الأقل.",
            damage: "لا يوجد سجل أضرار جسيمة.",
            maintenance: "يجب إجراء جميع الصيانات في الخدمات المعتمدة.",
          },
          form: {
            title: "نموذج طلب السيارة",
            success: {
              title: "تم استلام الطلب!",
              message:
                "سيقوم فريق الخبراء لدينا بفحص سيارتك والرد عليك في أقرب وقت ممكن.",
            },
            name: "الاسم واللقب",
            phone: "الهاتف",
            car: "ماركة/موديل السيارة",
            year: "سنة الموديل",
            km: "كيلومترات السيارة (KM)",
            photos: "صور / فيديو السيارة",
            upload: "تحميل صورة أو فيديو",
            maxFiles: "(الحد الأقصى 10 ملفات)",
            notes: "ملاحظات إضافية",
            notesPlaceholder: "ما تريد إضافته حول السيارة...",
            submit: "إرسال الطلب",
          },
        },
        tours: {
          title: "جولات استكشاف يوكسكوفا",
          subtitle: "طرق فريدة من جبال جيلو إلى الأنهار الجليدية بانتظارك.",
          bookBtn: "احجز الآن",
          viewAll: "عرض جميع الجولات",
        },
        vipAndMinibus: {
          badge: "SPECIAL EVENTS & GROUP TRANSPORTATION",
          title:
            "Professional Solutions for Weddings, Engagements, and Group Trips",
          description:
            "Flawless service on your most special days! We are with you with our luxury VIP vehicles for weddings and bridal cars. We also ease your burden with our comfortable, 15-20 passenger chauffeured minibus rentals for moving wedding guests, school transport, tourist trips, picnics, and large families.",
          cta: "Get a Special Quote",
          features: {
            wedding: "Luxury Wedding & Bridal Cars",
            minibus: "15-20 Passenger Minibuses",
            group: "Wedding Convoy & Guest Transport",
            tourist: "Tourist & Picnic Services",
          },
        },
        campaigns: {
          early: "خصم الحجز المبكر",
          roadside: "مساعدة على الطريق بلا انقطاع",
          free: "مجاني",
          delivery: "توصيل للمطار والمحطة",
        },
      },
      sales: {
        headerTitle: "سيارات مستعملة موثوقة",
        headerSubtitle: "سيارات مع تقارير خبرة وضمان.",
        badge: "قسم مبيعات السيارات",
        card1: "مستعمل موثوق",
        card2: "تقرير خبرة",
        card3: "خيارات الضمان",
        card4: "استبدال متاح",
        expert: "خبرة / حالة",
        appointment: "حجز موعد",
        buy: "شراء",
        status: { forSale: "للبيع" },
      },
      contact: {
        title: "اتصل بنا",
        subtitle: "نحن معك 24/7",
        infoTitle: "معلومات الاتصال",
        formTitle: "تواصل معنا",
        formSubtitle: "املأ النموذج لأسئلتك أو طلباتك.",
        name: "الاسم",
        surname: "اللقب",
        phone: "الهاتف",
        email: "البريد الإلكتروني",
        message: "الرسالة",
        successTitle: "تم استلام المعاملة بنجاح!",
        successText: "لقد تلقينا طلبك. سنرد عليك في أقرب وقت ممكن.",
        summary: "ملخص الطلب",
        personalInfo: "المعلومات الشخصية",
        paymentMethod: "طريقة الدفع",
        creditCard: "بطاقة ائتمان",
        office: "الدفع في المكتب",
        eft: "تحويل بنكي",
        total: "المبلغ الإجمالي",
        days: "أيام",
        checkout: {
          cancel: "إلغاء وعودة",
          securePayment: "دفع آمن وحجز",
          createRequest: "إنشاء طلب",
          rentalService: "خدمة تأجير",
          tourService: "خدمة جولة",
          saleRequest: "طلب شراء",
          pickupDate: "تاريخ الاستلام",
          returnDate: "تاريخ العودة",
          dailyPrice: "السعر اليومي",
          duration: "المدة",
          estimatedCost: "التكلفة التقديرية",
          reservationCode: "رمز الحجز",
          returnHome: "عودة للرئيسية",
          cardHolder: "اسم حامل البطاقة",
          cardNumber: "رقم البطاقة",
          expiryDate: "تاريخ الانتهاء",
          cvv: "رمز الأمان CVV",
          officePaymentSelected: "تم اختيار الدفع في المكتب",
          bankName: "Ziraat Bank",
          important: "مهم:",
          contract: "اتفاقية البيع عن بعد",
          goHome: "Geri Dön",
        },
      },
    },
  };

  private carService = inject(CarService);

  translations = computed(() => {
    // Deep clone the base dictionary for the current language
    const trBase = JSON.parse(JSON.stringify(this.dictionary.TR || {}));
    const selected = JSON.parse(JSON.stringify(this.dictionary[this.currentLang()] || {}));
    const base = this.currentLang() === "TR" ? trBase : mergeTranslationObjects(trBase, selected);
    const configSignal = this.carService.getConfig();
    const config = configSignal(); // Get the actual value
    const homeContent = config.homeContent;

    if (homeContent && this.currentLang() === "TR") {
      // Safely apply overrides directly into the specific path in the cloned dictionary

      // Hero
      if (homeContent.heroTitle) base.hero.title = homeContent.heroTitle;
      if (homeContent.heroSubtitle)
        base.hero.subtitle = homeContent.heroSubtitle;
      if (homeContent.heroTrustLine)
        base.hero.trustLine = homeContent.heroTrustLine;
      if (homeContent.heroCtaSubtext)
        base.hero.ctaSubtext = homeContent.heroCtaSubtext;
      if (homeContent.heroCta) base.hero.cta = homeContent.heroCta;

      // Booking
      if (homeContent.bookingTitle)
        base.home.booking.title = homeContent.bookingTitle;

      // Featured
      if (homeContent.featuredBadge)
        base.home.featured.badge = homeContent.featuredBadge;
      if (homeContent.featuredTitle)
        base.home.featured.title = homeContent.featuredTitle;
      if (homeContent.featuredSubtitle)
        base.home.featured.subtitle = homeContent.featuredSubtitle;
      if (homeContent.featuredViewAll)
        base.home.featured.viewAll = homeContent.featuredViewAll;

      // Sales
      if (homeContent.salesBadge)
        base.home.sales.badge = homeContent.salesBadge;
      if (homeContent.salesTitle)
        base.home.sales.title = homeContent.salesTitle;
      if (homeContent.salesDescription)
        base.home.sales.description = homeContent.salesDescription;
      if (homeContent.salesViewAll)
        base.home.sales.viewAll = homeContent.salesViewAll;

      // Why Us
      if (homeContent.whyUsTitle)
        base.home.whyUs.title = homeContent.whyUsTitle;
      if (homeContent.whyUsSubtitle)
        base.home.whyUs.subtitle = homeContent.whyUsSubtitle;

      if (homeContent.whyUsTrustTitle)
        base.home.whyUs.features.trust.title = homeContent.whyUsTrustTitle;
      if (homeContent.whyUsTrustDesc)
        base.home.whyUs.features.trust.desc = homeContent.whyUsTrustDesc;

      if (homeContent.whyUsSupportTitle)
        base.home.whyUs.features.support.title = homeContent.whyUsSupportTitle;
      if (homeContent.whyUsSupportDesc)
        base.home.whyUs.features.support.desc = homeContent.whyUsSupportDesc;

      if (homeContent.whyUsComfortTitle)
        base.home.whyUs.features.comfort.title = homeContent.whyUsComfortTitle;
      if (homeContent.whyUsComfortDesc)
        base.home.whyUs.features.comfort.desc = homeContent.whyUsComfortDesc;

      // Partner
      if (homeContent.partnerTitle)
        base.home.partner.title = homeContent.partnerTitle;
      if (homeContent.partnerSubtitle)
        base.home.partner.subtitle = homeContent.partnerSubtitle;
      if (homeContent.partnerReqTitle)
        base.home.partner.requirements.title = homeContent.partnerReqTitle;
      if (homeContent.partnerFormTitle)
        base.home.partner.form.title = homeContent.partnerFormTitle;

      // Campaigns
      if (homeContent.campaignsEarly)
        base.home.campaigns.early = homeContent.campaignsEarly;
      if (homeContent.campaignsRoadside)
        base.home.campaigns.roadside = homeContent.campaignsRoadside;
      if (homeContent.campaignsFree)
        base.home.campaigns.free = homeContent.campaignsFree;
      if (homeContent.campaignsDelivery)
        base.home.campaigns.delivery = homeContent.campaignsDelivery;

      // Tours
      if (homeContent.toursTitle)
        base.home.tours.title = homeContent.toursTitle;
      if (homeContent.toursSubtitle)
        base.home.tours.subtitle = homeContent.toursSubtitle;
      if (homeContent.toursViewAll)
        base.home.tours.viewAll = homeContent.toursViewAll;
      if (homeContent.toursBookBtn)
        base.home.tours.bookBtn = homeContent.toursBookBtn;
    }

    return base;
  });
}
