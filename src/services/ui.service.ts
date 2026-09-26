import { Injectable, signal, computed, inject } from "@angular/core";
import { Router } from "@angular/router";
import { CarService } from "./car.service";
import {
  detectBrowserLanguage,
  isSupportedLanguage,
} from "../i18n/detect-browser-language";

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
    // Manual choice always wins (persisted). First visit: map navigator.languages → supported set.
    let initial: Language = "TR";
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("alperler-language");
      if (isSupportedLanguage(saved)) {
        initial = saved;
      } else if (typeof navigator !== "undefined") {
        const detected = detectBrowserLanguage(navigator.languages, navigator.language);
        if (detected) {
          initial = detected;
          localStorage.setItem("alperler-language", detected);
        }
      }
    } else if (typeof navigator !== "undefined") {
      const detected = detectBrowserLanguage(navigator.languages, navigator.language);
      if (detected) initial = detected;
    }
    this.currentLang.set(initial);
    this.syncDocumentLanguage(initial);
    // Prefetch saved/detected non-TR locale so chrome does not linger on TR fallback.
    void this.ensureLocaleLoaded(initial);
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
    void this.ensureLocaleLoaded(lang);
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

  /** Known vehicle listing badge chrome (ACIL / FIRSAT / ...). Unknown freeform admin badges stay live. */
  listingBadgeLabel(value: string | null | undefined): string {
    const raw = String(value || "").trim();
    if (!raw) return "";
    const badges = (this.translations() as any).listingBadges as Record<string, string> | undefined;
    if (!badges) return raw;
    if (badges[raw]) return badges[raw];
    const norm = raw.toLocaleUpperCase("tr-TR");
    for (const [key, label] of Object.entries(badges)) {
      if (String(key).toLocaleUpperCase("tr-TR") === norm) return label;
    }
    return raw;
  }

  /** Sale availability tokens written by catalog mapping (Satildi / Satista / ...). Custom metadata stays live. */
  listingStatusLabel(
    value: string | null | undefined,
    opts?: { sold?: boolean; variant?: "card" | "detail" },
  ): string {
    const t = this.translations() as any;
    const raw = String(value || "").trim();
    const sold = opts?.sold === true || raw === "Satıldı";
    const variant = opts?.variant || "detail";
    if (sold) {
      return variant === "card"
        ? String(t.saleCard?.sold || t.vehicleCard?.soldUpper || t.listingStatus?.["Satıldı"] || raw)
        : String(t.saleDetail?.statusSold || t.vehicleCard?.sold || t.listingStatus?.["Satıldı"] || raw);
    }
    if (!raw || raw === "Satışta") {
      return variant === "card"
        ? String(t.saleCard?.forSale || t.listingStatus?.["Satışta"] || raw)
        : String(t.saleDetail?.statusForSale || t.listingStatus?.["Satışta"] || raw);
    }
    const map = t.listingStatus as Record<string, string> | undefined;
    if (map?.[raw]) return map[raw];
    const norm = raw.toLocaleLowerCase("tr-TR");
    if (map) {
      for (const [key, label] of Object.entries(map)) {
        if (String(key).toLocaleLowerCase("tr-TR") === norm) return label;
      }
    }
    return raw;
  }

  // --- TRANSLATIONS ---
  // TR stays eager (default + admin homeContent live base).
  // Non-TR packs: src/i18n/{en,de,fr,es,ru,ku,zh,ar}.ts — dynamic import.
  private dictionary: Partial<Record<Language, any>> = {
    TR: {
      mediaUpload: {
        imageTooLarge: "Fotoğraf en fazla {max} MB olabilir. Lütfen daha küçük bir fotoğraf seçin.",
        videoTooLarge: "Video en fazla {max} MB olabilir. Lütfen daha kısa veya sıkıştırılmış bir video seçin.",
        uploadFailed: "Medya bulut depolamaya yüklenemedi. Bağlantınızı kontrol edip tekrar deneyin.",
        signatureFailed: "Yükleme izni alınamadı. Oturumunuzu yenileyip tekrar deneyin.",
      },
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
        campaigns: "Kampanyalar",
        appointment: "Randevu",
        branches: "Şubeler",
        branchPartner: "Bayilik Başvurusu",
        search: "Arama",
        account: "Profil",
        faq: "Sık Sorulan Sorular",
        legal: "Yasal Bilgilendirmeler",
        fleetShort: "Kiralık",
        salesShort: "Satılık",
        campaignsShort: "Fırsatlar",
         brandSub: "Kiralama • Satış • Tur",
         mainAria: "Ana navigasyon",
         homeAria: "Alperler Rent A Car ana sayfa",
         desktopMenuAria: "Masaüstü site menüsü",
         languageSelect: "Dil seçimi",
         loginRegister: "Giriş / Kayıt",
         loginRegisterLong: "Giriş Yap / Kayıt Ol",
         loginRegisterAria: "Giriş yap veya kayıt ol",
         myAccount: "Hesabım",
         openMenu: "Menüyü aç",
         closeMenu: "Menüyü kapat",
         mobileNavAria: "Mobil navigasyon",
         mobileIntro: "Kiralama, satış, tur ve diğer hizmetlere buradan ulaşın.",
         personalSettings: "Kişisel ayarlar",
         language: "Dil",
         languageOptions: "Dil seçenekleri",
         adminLogin: "Yönetici Girişi",
         favoritesCount: "{n} favori",
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
        servicesTitle: "Hizmetlerimiz",
        corporate: "Kurumsal",
        corporateTitle: "Alperler Auto",
        legal: "Yasal",
        legalTitle: "Yasal",
        newsletter: "Bülten Aboneliği",
        newsletterSub:
          "Kampanyalardan ve yeni araçlardan haberdar olmak için ücretsiz abone olun.",
        emailPlaceholder: "E-posta adresiniz",
        emailLabel: "E-posta adresiniz",
        freeNote: "Abonelik ücretsizdir.",
        legalLabel: "Ticari ileti ve abonelik koşulları",
        subscribeBtn: "Ücretsiz Abone Ol",
        subscribeSuccess:
          "Tebrikler! Bültenimize başarıyla abone oldunuz. Kampanyalarımızdan ilk siz haberdar olacaksınız.",
        contactUs: "Bize Ulaşın",
        contactBtn: "İletişime Geç",
        contactText: "Sorularınız mı var? 7/24 destek hattımız hizmetinizde.",
        designed: "Tasarım ve Altyapı ❤️ ile Yüksekova'da Geliştirildi",
        footerText:
          "Yüksekova'nın güvenilir araç kiralama, ikinci el galeri ve turizm acentesi. Premium hizmet, güvenli yolculuklar.",
        brandSummary: "Araç kiralama, ikinci el satış, transfer ve bölgesel tur hizmetlerini tek yerde planlayın.",
        legalMoreLabel: "Diğer yasal metinler",
        phoneLabel: "Ara",
        whatsappLabel: "WhatsApp",
        copyrightSuffix: "Tüm hakları saklıdır.",
        homeLabel: "Ana sayfa",
        contactLabel: "İletişim",
        links: {
          rentals: "Kiralık Araçlar",
          sales: "Satılık Araçlar",
          valuation: "Aracını Değerlendir",
          tours: "Turlar",
          campaigns: "Kampanyalar",
          branches: "Şubelerimiz",
          appointment: "Randevu",
          about: "Hakkımızda",
          blog: "Blog",
          contact: "İletişim",
          faq: "Sık Sorulan Sorular",
          branchPartner: "Şube Başvurusu",
          feedback: "Geri Bildirim Gönder",
          rental: "Kiralama Koşulları",
          insurance: "Sigorta ve Sorumluluk",
          cancellation: "İade ve İptal",
          kvkk: "KVKK Aydınlatma",
          privacy: "Gizlilik",
          salesTerms: "Satış ve İlan Koşulları",
          tour: "Tur ve Transfer Koşulları",
          partner: "Aracını Değerlendir Koşulları",
          branch: "Şube ve Bayilik Koşulları",
          commercial: "Bülten ve Ticari İleti",
          termsGeneral: "Genel Kullanım Şartları",
          cookies: "Çerez Politikası",
          terms: "Kiralama Koşulları",
          distanceSelling: "Mesafeli Satış Sözleşmesi",
          admin: "Yönetici",
        },
        feedbackBtn: "Geri Bildirim Gönder",
         ariaSuffix: "alt bilgi",
         socialAria: "Sosyal medya hesapları",
         logoAlt: "{name} logosu",
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
          stepOf: "Adım {step} / 3",
          inquiryKicker: "Talep",
          createBooking: "Rezervasyon Oluştur",
          createInquiry: "Talep Oluştur",
          backAria: "Rezervasyondan geri dön",
          rentalVehicle: "Kiralık Araç",
          purchaseRequest: "Satın Alma Talebi",
          perHour: "/ saat",
          perDay: "/ gün",
          savedTitle: "Talebiniz Kaydedildi",
          referenceLabel: "Referans",
          planKicker: "1. Planlama",
          planTitle: "Kiralama planınızı belirleyin",
          planCopy: "Saatlik, günlük, haftalık, aylık veya uzun süreli kiralamayı seçin. Saatlik kiralamada aynı araç, çakışmayan saat aralıklarında farklı müşterilere ayrılabilir.",
          hourly: "Saatlik",
          daily: "Günlük",
          weekly: "Haftalık",
          monthly: "Aylık",
          longterm: "Uzun Süre",
          hourlyMinNote: "Bu araç için minimum {hours} saat. Başlayan her saat ücretlendirmede tam saate yuvarlanır.",
          rentalDate: "Kiralama Tarihi",
          pickupTime: "Alış Saati",
          returnTime: "İade Saati",
          driverPreference: "Sürücü Tercihi",
          withoutDriver: "Şoförsüz",
          withDriverShort: "Şoförlü",
          youDrive: "Aracı siz kullanırsınız",
          notOffered: "Bu araçta sunulmuyor",
          driverOnlyNote: "Bu araç yalnız şoförlü sunuluyor",
          selfDriveOnlyNote: "Bu araç yalnız şoförsüz sunuluyor",
          driverChoiceHint: "Tercihinizi değiştirebilirsiniz",
          driverService: "Şoför hizmeti",
          pickupWhere: "Nereden alınacak?",
          pickupSelect: "Teslim alma noktası seçin",
          dropoffWhere: "Nereye iade edilecek?",
          dropoffSelect: "İade noktası seçin",
          periodBusy: "Bu zaman aralığı mevcut onaylı kayıtlara göre dolu görünüyor. Talebinizi yine de gönderebilirsiniz; ekip uygun alternatif araçları değerlendirecek.",
          extrasTitle: "Ek Hizmetler",
          extrasSelected: "{count} hizmet seçildi",
          extrasOptional: "İsteğe bağlı",
          vehicleHours: "Araç · {hours} saat",
          vehicleDays: "Araç · {days} gün",
          otherExtras: "Diğer ek hizmetler",
          distanceFuel: "Mesafe / yakıt · {km} km",
          estimatedTotal: "Tahmini Toplam",
          nextStep: "Sonraki Adım",
          contactKicker: "2. İletişim",
          contactTitle: "İletişim bilgilerinizi tamamlayın",
          contactCopy: "Kiralama planınız korunur. Üye hesabınız varsa boş alanlar profil bilgilerinizle otomatik tamamlanabilir.",
          firstName: "Ad",
          lastName: "Soyad",
          phoneLabel: "Telefon",
          emailLabel: "E-posta",
          noteLabel: "Not",
          notePlaceholder: "Özel istek veya açıklama",
          backStep: "Geri",
          paymentKicker: "3. Onay ve Ödeme",
          reviewTitle: "Rezervasyonu kontrol edin",
          reviewVehicle: "Araç",
          reviewTime: "Zaman",
          reviewDriver: "Şoför",
          reviewPickup: "Teslim",
          reviewDropoff: "İade",
          reviewTotal: "Toplam",
          payOnDelivery: "Teslimde",
          payOnDeliveryHint: "Araç tesliminde ödeme",
          cardTitle: "Kart",
          cardReadyHint: "Kartla ödeme kullanılabilir",
          cardUnavailableHint: "Şu anda kullanılamıyor",
          noPaymentNote: "Şu anda aktif ve kullanılabilir bir ödeme yöntemi bulunmuyor. Lütfen ekiple iletişime geçin.",
          eftInfoTitle: "Havale / EFT Bilgileri",
          eftInfoHint: "Bilgiler doğrudan güncel ödeme ayarlarından gelir.",
          bankLabel: "Banka",
          accountHolderLabel: "Hesap sahibi",
          ibanLabel: "IBAN",
          eftPendingDetails: "IBAN veya hesap sahibi bilgisi henüz yayınlanmadıysa ekip rezervasyon onayında güncel banka bilgilerini iletir.",
          savedCardsTitle: "Kayıtlı kartlarınız",
          savedCardsHint: "İsterseniz kayıtlı kartınızı seçin veya yeni kartla devam edin.",
          defaultCard: "Varsayılan",
          newCard: "Yeni kartla devam et",
          newCardHint: "iyzico güvenli ödeme sayfası açılır.",
          cardNotReadyNote: "Kartla ödeme entegrasyonu şu anda hazır değil. Aktif olan diğer ödeme yöntemlerinden birini seçin.",
          saving: "Kaydediliyor...",
          submitBooking: "Rezervasyon Talebini Gönder",
          inquiryTitle: "İletişim bilgilerinizi bırakın",
          submitInquiry: "Talebi Gönder",
          eftFallback: "Banka bilgileri rezervasyon onayında paylaşılır",
          successRentalSaved: "Rezervasyon talebiniz kaydedildi. Uygunluk doğrulandıktan sonra sizinle iletişime geçilecektir.",
          successInquirySaved: "Talebiniz kaydedildi. Ekibimiz sizinle iletişime geçilecektir.",
          successCardPaid: "Rezervasyonunuz kaydedildi ve kart ödemeniz başarıyla alındı.",
          successCardPending: "Rezervasyonunuz kaydedildi. Kart işleminiz güvenlik kontrolünde ve sonucu hesabınıza yansıtılacaktır.",
          successCardIncomplete: "Rezervasyon kaydedildi ancak kart ödemesi tamamlanamadı. {message}",
          successCardFailed: "Rezervasyon kaydedildi ancak kartla ödeme başlatılamadı. Talebiniz kaybolmadı.",
          toastFailed: "Talep kaydedilemedi.",
          pricePerHour: "{amount} ₺/saat",
          pricePerDay: "{amount} ₺/gün",
          priceFlat: "{amount} ₺ tek sefer",
          freeLabel: "Ücretsiz",
          noteRentalType: "Kiralama türü: {value}",
          notePickup: "Teslim alma: {value}",
          noteDropoff: "İade: {value}",
          noteDriver: "Sürücü tercihi: {value}",
          noteExtras: "Ek hizmetler: {value}",
          noteExtrasNone: "Ek hizmetler: Yok",
          fallbackExtraDriverLabel: "Şoförlü kiralama",
          fallbackExtraDriverDesc: "Profesyonel sürücü hizmeti",
          fallbackExtraChildSeatLabel: "Bebek / çocuk koltuğu",
          fallbackExtraChildSeatDesc: "Yaşa uygun güvenlik koltuğu",
          fallbackExtraProtectionLabel: "Ek güvence paketi",
          fallbackExtraProtectionDesc: "Standart kapsama ek koruma talebi",
          fallbackExtraAdditionalDriverLabel: "Ek sürücü",
          fallbackExtraAdditionalDriverDesc: "Sözleşmeye ikinci sürücü eklenmesi",
          fallbackExtraAirportLabel: "Havalimanı teslim / iade",
          fallbackExtraAirportDesc: "Havalimanı teslimat hizmeti",
          fallbackExtraAfterHoursLabel: "Mesai dışı teslim / iade",
          fallbackExtraAfterHoursDesc: "Normal operasyon saatleri dışındaki teslimat talebi",
          fallbackExtraSnowChainLabel: "Kar zinciri seti",
          fallbackExtraSnowChainDesc: "Kış koşulları için zincir seti",
          errors: {
            contactIncomplete: "İletişim bilgilerinizi tamamlayın.",
            contactFieldsIncomplete: "Ad, soyad, telefon ve geçerli e-posta bilgilerini tamamlayın.",
            pickupRequired: "Teslim alma noktasını seçin.",
            driverInvalid: "Bu araç için geçerli sürücü tercihini seçin.",
            paymentInactive: "Seçtiğiniz ödeme yöntemi artık aktif değil. Güncel ödeme yöntemlerinden birini seçin.",
            paymentMethodInactive: "Bu ödeme yöntemi şu anda aktif değil.",
            cardUnavailable: "Kartla ödeme şu anda kullanılamıyor. Aktif olan başka bir ödeme yöntemini seçin.",
            cardNotReady: "Kartla ödeme entegrasyonu şu anda hazır değil.",
            noPaymentMethod: "Şu anda kullanılabilir bir ödeme yöntemi bulunmuyor. Lütfen ekiple iletişime geçin.",
            vehicleUnavailable: "Bu araç seçilen zaman aralığında artık müsait değil. Lütfen başka zaman veya araç seçin.",
            driverOptionNotAllowed: "Seçtiğiniz sürücü tercihi bu araçta kullanılamıyor.",
            bookingsDisabled: "Yeni rezervasyon işlemleri kısa süreliğine durdurulmuş. Lütfen biraz sonra tekrar deneyin.",
            invalidRentalVehicle: "Araç kaydı doğrulanamadı. Araç sayfasına dönüp tekrar deneyin.",
            invalidPickupBranch: "Seçtiğiniz teslim alma noktası şu anda kiralama teslimine açık değil. Lütfen başka bir teslim noktası seçin.",
            invalidDropoffBranch: "Seçtiğiniz iade noktası şu anda araç iadesine açık değil. Lütfen başka bir iade noktası seçin.",
            invalidBranchTimezone: "Şube saat dilimi doğrulanamadı. Lütfen başka bir teslim noktası seçin veya ekiple iletişime geçin.",
            hourlyNotAllowed: "Bu araç için saatlik kiralama kullanılamıyor.",
            hourlyInactive: "Bu araç için saatlik kiralama aktif değil.",
            invalidHourly: "Saatlik kiralama tarih ve saatlerini kontrol edin.",
            paymentDisabled: "Seçtiğiniz ödeme yöntemi kapatılmış. Güncel ödeme yöntemlerinden birini seçin.",
            rateLimited: "Çok kısa sürede fazla talep gönderildi. Birkaç dakika sonra tekrar deneyin.",
            gatewayUnavailable: "Talep servisine şu anda ulaşılamıyor. Bilgilerinizde sorun yok. Lütfen kısa süre sonra tekrar deneyin.",
            createFailed: "Talep sisteme kaydedilemedi. Ekip tarafındaki kayıt servisi kontrol ediliyor, lütfen tekrar deneyin.",
            genericFailed: "Talep kaydedilemedi. Lütfen kısa süre sonra tekrar deneyin.",
            invalidRentalDate: "Geçerli bir kiralama tarihi seçin.",
            returnTimeAfterPickup: "İade saati alış saatinden sonra olmalıdır.",
            minimumHours: "Bu araç en az {hours} saat kiralanabilir.",
            hourlyMaxHours: "Saatlik kiralama 23 saate kadar kullanılabilir. Daha uzun süre için günlük kiralamayı seçin.",
            datesRequired: "Alış ve iade tarihlerini seçin.",
            returnDateAfterPickup: "İade tarihi alış tarihinden sonra olmalıdır.",
          },
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
         eyebrow: "ALPERLER DENEYİM",
         introTitle: "Görüşünüz doğrudan ekibimize ulaşır.",
         introText: "Hata, öneri veya deneyiminizi birkaç adımda paylaşın.",
         categoryAria: "Geri bildirim kategorisi",
         starAria: "{n} yıldız",
         saving: "Kaydediliyor",
         storeError: "Geri bildirim kaydedilemedi. Lütfen tekrar deneyin.",
         referenceLabel: "Referans",
       },
      common: {
        close: "Kapat",
        favorites: "Favoriler",
        menuToggle: "Menüyü Aç/Kapat",
        addToFav: "Favorilere Ekle",
        removeFromFav: "Favorilerden Çıkar",
         skipToContent: "İçeriğe geç",
         whatsappDefault: "Merhaba, detaylı bilgi almak istiyorum.",
         whatsappFabAria: "WhatsApp ile yazın",
         siteBrandFallback: "Alperler Rent A Car",
       },
        dock: {
          ariaLabel: "Alt hızlı menü",
          items: {
            fleet: "Kiralık",
            sales: "Satılık",
            search: "Arama",
            campaigns: "Fırsatlar",
            account: "Profil",
            home: "Ana Sayfa",
            appointment: "Randevu",
            tours: "Turlar",
            branches: "Şubeler",
            contact: "İletişim",
            about: "Hakkımızda",
            blog: "Blog",
          }
        },
        catalog: {
          backAria: "Geri dön",
          searchAria: "Kiralık araçlarda ara",
          searchPlaceholder: "Marka, model, seri veya araç no ara",
          kicker: "ALPERLER KİRALAMA",
          title: "Kiralık Araçlar",
          subtitle: "İster birkaç saat ister uzun dönem. Aradığınız aracı marka, model, araç numarası, konum ve özelliklere göre hızlıca bulun.",
          withDriver: "Şoförlü",
          withoutDriver: "Şoförsüz",
          duration: "Kiralama süresi",
          brand: "Marka",
          bodyType: "Kasa tipi",
          fuel: "Yakıt",
          transmission: "Vites",
          branch: "Şube",
          all: "Tümü",
          allBranches: "Tüm şubeler",
          minSeats: "En az koltuk",
          minPrice: "En düşük fiyat",
          maxPrice: "En yüksek fiyat",
          driver: "Sürücü",
          availability: "Müsaitlik",
          availableOnly: "Yalnız müsait",
          sort: "Sıralama",
          sortRecommended: "Önerilen",
          sortPriceAsc: "Fiyat: düşükten yükseğe",
          sortPriceDesc: "Fiyat: yüksekten düşüğe",
          sortYearDesc: "En yeni model",
          clearFilters: "Filtreleri temizle",
          showResults: "Sonuçları göster",
          resultsCount: "{n} araç bulundu",
          resultsHint: "Size uygun seçeneği karşılaştırın, detayları inceleyin ve yolculuğunuzu kolayca planlayın.",
          preparing: "Seçenekler hazırlanıyor...",
          emptyTitle: "Uygun araç bulunamadı",
          showAll: "Tüm kiralık araçları göster",
          errorTitle: "Araçlara şu anda ulaşılamıyor",
          loadError: "Kiralık araçlar şu anda yüklenemiyor. Lütfen tekrar deneyin.",
          retry: "Tekrar dene",
          loading: "Yükleniyor...",
          loadMore: "Daha Fazla Araç Göster",
          hourly: "Saatlik",
          daily: "Günlük",
          weekly: "Haftalık",
          monthly: "Aylık",
          longterm: "Uzun dönem"
        },
        favoritesPage: {
          backAria: "Geri dön",
          kicker: "ALPERLER HESABIM",
          title: "Favorilerim",
          subtitle: "Beğendiğiniz araçları, turları ve rehber yazılarını tek yerde saklayın.",
          tabsAria: "Favori türleri",
          tabAll: "Tümü",
          tabVehicles: "Araçlar",
          tabTours: "Turlar",
          tabBlog: "Blog",
          count: "{n} kayıt",
          preparing: "Favorileriniz hazırlanıyor.",
          readyHint: "Kaydettikleriniz burada otomatik olarak görünür.",
          openDetailAria: "{title} detayını aç",
          inspect: "İncele",
          removeAria: "{title} favorilerden çıkar",
          emptyTitle: "Henüz favoriniz yok",
          emptyHint: "Beğendiğiniz araç, tur ve yazıları kalple kaydedin; planınız tek dokunuşla hazır olsun.",
          linkVehicles: "Araçlar",
          linkTours: "Turlar",
          linkBlog: "Blog",
          errorTitle: "Favorilerinize şu anda ulaşılamıyor",
          errorHint: "Kayıtlarınız güvende. Bağlantı kısa süre içinde otomatik olarak yeniden kontrol edilecek.",
          loading: "Hazırlanıyor...",
          loadMore: "Daha Fazla Göster",
          badgeSale: "SATILIK",
          badgeRent: "KİRALIK",
          badgeTour: "TUR",
          badgeBlog: "BLOG",
          perDay: " / gün",
          perPerson: " / kişi",
          tourFallback: "Tur"
        },
        accountAuth: {
          homeAria: "Alperler Rent A Car ana sayfa",
          brandSub: "Kiralama • Satış • Tur",
          backToSite: "Siteye dön",
          kicker: "ALPERLER HESABI",
          kickerAdmin: "ALPERLER YÖNETİM HESABI",
          titleLogin: "Hesabınıza giriş yapın",
          titleRegister: "Hesabınızı oluşturun",
          titleRecovery: "Yeni parolanızı belirleyin",
          copyLogin: "İşlemlerinize ve hesabınıza kaldığınız yerden devam edin.",
          copyRegister: "Kiralama, satış ve tur işlemlerinizi tek hesapta takip edin.",
          copyRecovery: "Güvenli yenileme bağlantınız doğrulandı. Yeni parolanızı kaydedin.",
          copyAdmin: "Yetkili hesabınızla giriş yaptığınızda yönetim paneline güvenli biçimde yönlendirilirsiniz.",
          cardAriaCustomer: "Müşteri hesabı",
          cardAriaAdmin: "Yönetici hesabı girişi",
          inviteTitle: "Bir arkadaşınızın davetiyle geldiniz.",
          inviteBody: "Davetiniz hesabınızla eşleştirilecek. Uygun gerçek işlem tamamlandığında avantaj otomatik değerlendirilir.",
          tabsAria: "Hesap işlemi",
          loginTab: "Giriş Yap",
          registerTab: "Kayıt Ol",
          socialAria: "Sosyal hesap ile devam et",
          continueGoogle: "Google ile devam et",
          continueFacebook: "Facebook ile devam et",
          continueApple: "Apple ile devam et",
          orEmail: "veya e-posta ile",
          fullName: "Ad Soyad",
          fullNamePh: "Adınız ve soyadınız",
          email: "E-posta",
          emailPh: "ornek@email.com",
          password: "Parola",
          newPassword: "Yeni parola",
          passwordPhLogin: "Parolanız",
          passwordPhNew: "En az 10 karakter",
          passwordNote: "En az 10 karakter, bir büyük harf, bir küçük harf ve bir rakam kullanın.",
          confirmPassword: "Yeni parola tekrar",
          confirmPasswordPh: "Yeni parolanızı tekrar girin",
          working: "İşleniyor…",
          savePassword: "Yeni Parolayı Kaydet",
          forgotPassword: "Parolamı unuttum",
          backToLogin: "Giriş ekranına dön",
          continueWithout: "Hesap açmadan devam et",
          infoSummary: "Alperler hesabı ne sağlar?",
          infoBody: "Profil bilgilerinizi yeniden girmeden kullanabilir, hesabınıza bağlanan kiralama, satış ve tur işlemlerinizi takip edebilir, sadakat ve davet avantajlarınızı görebilirsiniz.",
          infoItem1: "İşlem geçmişi ve profil bilgileri tek yerde",
          infoItem2: "Alperler Cüzdan ve uygun belge yönetimi",
          infoItem3: "Sadakat puanları ve kampanyalı arkadaş davetleri",
          infoLegal: "Gizlilik ve kullanım koşullarını inceleyin",
          msgRecoveryExpired: "Yenileme bağlantısının süresi dolmuş veya bağlantı doğrulanamamış. Yeni bir bağlantı isteyin.",
          msgPasswordMismatch: "Yeni parolalar birbiriyle eşleşmiyor.",
          msgPasswordUpdated: "Parolanız başarıyla güncellendi. Güvenli hesabınız açılıyor.",
          msgRegisterConfirm: "Kaydınız tamamlandı. E-posta adresinize gelen doğrulama bağlantısına dokunduktan sonra giriş yapabilirsiniz.",
          msgGoogleOauthOff: "Google ile giriş bağlantısı görünür durumda ancak OAuth sağlayıcısı henüz Supabase Auth içinde etkin değil.",
          msgFacebookOauthOff: "Facebook ile giriş bağlantısı görünür durumda ancak OAuth sağlayıcısı henüz Supabase Auth içinde etkin değil.",
          msgResetSent: "Parola yenileme bağlantısı e-posta adresinize gönderildi. En yeni e-postadaki bağlantıyı aynı cihaz ve tarayıcıda açın.",
          msgAdminResetFail: "Yönetici parola yenileme isteği işlenemedi.",
          msgAdminSessionFail: "Yönetim paneli oturumu açılamadı."
        },
        aboutPage: {
          backAria: "Geri",
          title: "Hakkımızda",
          eyebrow: "Kiralama · Satış · Transfer · Tur",
          titleFallback: "Araç, yolculuk ve seyahatte tek noktadan çözüm",
          heroCopy: "İnsanların ve kurumların doğru araca, doğru bilgiye ve doğru hizmete daha az uğraşla ulaşabilmesi için çalışıyoruz.",
          servicesAria: "Hizmetlere hızlı erişim",
          linkRental: "Kiralık Araçlar",
          linkSales: "Satılık Araçlar",
          linkTours: "Turlar",
          whyEyebrow: "Neden Varız?",
          whyTitle: "Bir araçtan fazlası, ihtiyaca uygun çözüm.",
          platformEyebrow: "Tek Platform",
          platformTitle: "İhtiyacınız değişse de çözüm aynı yerde.",
          solRentalTitle: "Araç Kiralama",
          solRentalBody: "Günlük, uzun dönem, şoförlü veya özel gün ihtiyaçlarında uygun seçenekleri daha kolay karşılaştırın.",
          solRentalLink: "Kiralık araçları gör",
          solSaleTitle: "Alım, Satım ve Değerleme",
          solSaleBody: "Satılık araçları inceleyin veya kendi aracınızı satış ve kiralama filosu için değerlendirmeye gönderin.",
          solSaleLink: "Satılık araçları gör",
          solTourTitle: "Tur ve Transfer",
          solTourBody: "Yerel saha bilgisiyle özel rotaları, transferleri ve bölgesel seyahat seçeneklerini tek yerden planlayın.",
          solTourLink: "Turları keşfet",
          teamEyebrow: "AlperAuto Ekibi",
          teamTitle: "Yerel bilgi, ortak sorumluluk.",
          teamCopy: "Hizmetin dijital taraftan saha operasyonuna kadar tek ekip anlayışıyla ilerlemesini hedefliyoruz.",
          closingTitle: "Daha az belirsizlik, daha hızlı çözüm.",
          closingCopy: "Bireysel veya kurumsal ihtiyacınızı anlatın. Doğru araç, satış, transfer ya da tur seçeneğine birlikte ulaşalım.",
          contactCta: "Bize Ulaşın"
        },
        searchPage: {
          backAria: "Aramadan geri dön",
          kicker: "ALPERLER ARAMA",
          title: "Ne arıyorsunuz?",
          placeholder: "Marka, model, araç no, tur, kampanya, blog veya hizmet ara",
          clearAria: "Aramayı temizle",
          filtersAria: "Arama sonucu türü",
          filterAll: "Tümü",
          filterVehicles: "Araçlar",
          filterTravel: "Tur & Fırsat",
          filterContent: "Rehber",
          filterServices: "Hizmetler",
          resultsTitle: "Sonuçlar",
          searching: "Güncel sonuçlar aranıyor",
          startTitle: "Aramaya başlayın",
          startHint: "En az iki karakter yazın. Marka, model, stok veya araç numarası, tur, kampanya, blog ve hizmetler birlikte aranır.",
          inspect: "İncele",
          loading: "Yükleniyor...",
          loadMore: "Daha Fazla Sonuç",
          emptyTitle: "Eşleşme bulunamadı",
          emptyHint: "Marka, model veya hizmet adı deneyin — doğru seçenek bir arama uzağınızda.",
          statusSearching: "Güncel içerikler aranıyor.",
          statusMinChars: "En az iki karakter yazın.",
          statusEmpty: "Eşleşme bulunamadı.",
          statusPartial: "İlk {n} eşleşme gösteriliyor.",
          statusFound: "{n} eşleşme bulundu.",
          kindRental: "Kiralık araç",
          kindSale: "Satılık araç",
          kindTour: "Tur",
          kindCampaign: "Kampanya",
          kindBlog: "Blog",
          kindBranch: "Şube",
          kindFaq: "Sık sorulan soru",
          kindSection: "Vitrin",
          kindPage: "Hizmet"
        },
        tourCatalog: {
          backAria: "Geri dön",
          searchAria: "Turlarda ara",
          searchPlaceholder: "Tur, rota, konum veya kategori ara",
          filtersOpenAria: "Tur filtrelerini aç",
          filtersCloseAria: "Tur filtrelerini kapat",
          filtersAria: "Tur filtreleri",
          kicker: "ALPERLER TUR",
          title: "Turlar ve Deneyimler",
          subtitle: "Doğa, kültür ve özel rotalar arasından size uygun deneyimi seçin. Programı, buluşma noktasını ve dahil olan ayrıcalıkları karşılaştırın.",
          minPrice: "En düşük fiyat",
          maxPrice: "En yüksek fiyat",
          duration: "Süre",
          tourType: "Tur türü",
          location: "Konum",
          sort: "Sıralama",
          all: "Tümü",
          sortFeatured: "Öne çıkanlar",
          sortPriceAsc: "Fiyat: düşükten yükseğe",
          sortPriceDesc: "Fiyat: yüksekten düşüğe",
          sortTitle: "Ada göre",
          clearFilters: "Filtreleri temizle",
          showResults: "Sonuçları göster",
          resultsCount: "{n} tur gösteriliyor",
          resultsHint: "Size en uygun rotayı seçin ve detayları karşılaştırın.",
          preparing: "Rotalar hazırlanıyor...",
          inspectAria: "{title} turunu incele",
          tourFallback: "Tur",
          featured: "ÖNE ÇIKAN",
          upToPeople: "{n} kişiye kadar",
          perPerson: "Kişi başı",
          inspect: "Turu İncele",
          emptyTitle: "Bu seçimlere uygun tur bulunamadı",
          showAll: "Tüm turları göster",
          errorTitle: "Turlara şu anda ulaşılamıyor",
          loadError: "Turlar şu anda yüklenemiyor. Lütfen tekrar deneyin.",
          retry: "Tekrar dene",
          loading: "Yükleniyor...",
          loadMore: "Daha Fazla Tur Göster"
        },
        saleCatalog: {
          backAria: "Geri dön",
          searchAria: "Satılık araçlarda ara",
          searchPlaceholder: "Araç no, marka, model, seri, yıl veya konum ara",
          kicker: "ALPERLER İKİNCİ EL",
          title: "Satılık Araçlar",
          subtitle: "Fiyat, kilometre, model yılı, ekspertiz ve hasar geçmişi bilgilerini karşılaştırın. Araç numarasını yazarak ilana doğrudan ulaşabilirsiniz.",
          brand: "Marka",
          modelYear: "Model yılı",
          fuel: "Yakıt",
          transmission: "Vites",
          bodyType: "Kasa tipi",
          color: "Renk",
          branch: "Şube",
          all: "Tümü",
          allBranches: "Tüm şubeler",
          minPrice: "En düşük fiyat",
          maxPrice: "En yüksek fiyat",
          minKm: "En düşük km",
          maxKm: "En yüksek km",
          damage: "Ekspertiz / hasar",
          damageClean: "Hasarsız / hatasız beyanı",
          damageDeclared: "Boya / değişen / hasar beyanı",
          damageTramerUnverified: "Tramer doğrulanmamış",
          warranty: "Garanti",
          warrantyYes: "Garanti bilgisi olanlar",
          saleStatus: "Satış durumu",
          statusAvailable: "Yalnız satışta",
          statusSold: "Satılanlar",
          sort: "Sıralama",
          sortRecommended: "Önerilen",
          sortPriceAsc: "Fiyat: düşükten yükseğe",
          sortPriceDesc: "Fiyat: yüksekten düşüğe",
          sortYearDesc: "En yeni model",
          sortKmAsc: "En düşük kilometre",
          clearFilters: "Filtreleri temizle",
          showResults: "Sonuçları göster",
          resultsCount: "{n} ilan bulundu",
          resultsHint: "Size uygun aracı karşılaştırın; ekspertiz, geçmiş ve donanım detaylarını tek tek inceleyin.",
          preparing: "İlanlar hazırlanıyor...",
          emptyTitle: "Uygun ilan bulunamadı",
          emptyHint: "Filtreleri biraz esnetin; şeffaf geçmişli seçenekler sizi bekliyor.",
          showAll: "Tüm satılık araçları göster",
          errorTitle: "İlanlara şu anda ulaşılamıyor",
          loadError: "Satılık araçlar şu anda yüklenemiyor. Lütfen tekrar deneyin.",
          retry: "Tekrar dene",
          loading: "Yükleniyor...",
          loadMore: "Daha Fazla İlan Göster",
          filterBtn: "Filtrele",
          clearShort: "Temizle",
          listingCount: "{n} ilan",
          defaultSummary: "Satıştaki araçlar",
          summaryPrice: "fiyat seçimi",
          summaryKm: "kilometre seçimi",
          summaryDamage: "ekspertiz seçimi",
          sheetKicker: "ARACINIZI SEÇİN",
          sheetTitle: "Satılık Araçları Filtreleyin",
          closeFiltersAria: "Filtreleri kapat",
          showVehicles: "{n} Aracı Göster",
          toolbarAria: "Satılık araç filtre ve sıralama özeti",
          resultsAria: "Satılık araç sonuçları",
        },
        blogCatalog: {
          backAria: "Geri dön",
          kicker: "ALPERLER YOL REHBERİ",
          title: "Blog ve Haberler",
          searchAria: "Blog yazılarında ara",
          searchPlaceholder: "Başlık, konu veya yazar ara",
          introTitle: "Daha iyi bir yolculuk için doğru bilgiler",
          introCopy: "Araç seçimi, kiralama, güvenli sürüş ve bölgenin keşfedilmeye değer rotaları için pratik rehberler.",
          count: "{n} rehber ve yazı",
          addFavAria: "{title} favorilere ekle",
          removeFavAria: "{title} favorilerden çıkar",
          readMore: "Devamını Oku",
          emptyTitle: "Aramanıza uygun yazı bulunamadı",
          showAll: "Tüm yazıları göster",
          errorTitle: "Blog yazılarına şu anda ulaşılamıyor",
          loadError: "Blog yazıları şu anda yüklenemiyor. Lütfen tekrar deneyin.",
          favError: "Favori işlemi tamamlanamadı. Lütfen tekrar deneyin.",
          retry: "Tekrar dene",
          preparing: "Yazılar hazırlanıyor...",
          loading: "Yükleniyor...",
          loadMore: "Daha Fazla Yazı Göster"
        },
        faqPage: {
          backAria: "Geri dön",
          title: "Sıkça Sorulan Sorular",
          heading: "Merak ettiklerinizin yanıtları",
          subtitle: "Kiralama, satış ve hizmet süreçleriyle ilgili güncel bilgileri burada bulabilirsiniz.",
          loading: "Sorular hazırlanıyor...",
          error: "FAQ bilgilerine şu anda ulaşılamıyor.",
          retry: "Tekrar dene",
          empty: "Henüz yayınlanmış soru bulunmuyor."
        },
        contactPage: {
          backAria: "Geri dön",
          title: "İletişim",
          headerSub: "Alperler Rent A Car destek ve bilgi hattı",
          eyebrow: "Bize Ulaşın",
          heroTitle: "Sorunuzu doğrudan ekibimize iletin",
          heroCopy: "Araç kiralama, satılık araçlar, tur, randevu veya diğer konular için bize yazın. Ekibimiz talebinizi inceleyip gerektiğinde sizinle iletişime geçecektir.",
          phone: "Telefon",
          email: "E-posta",
          whatsapp: "WhatsApp",
          whatsappHint: "Hızlı bilgi ve destek",
          address: "Adres",
          successTitle: "Mesajınız alındı",
          successCopy: "Teşekkür ederiz. Ekibimiz mesajınızı inceleyip gerekli olduğunda verdiğiniz iletişim bilgileri üzerinden sizinle bağlantı kuracaktır.",
          reference: "Referans: {ref}",
          emailNote: "Onay e-postası ulaşmasa bile mesajınız alınmıştır. Referans numaranızı saklayabilirsiniz.",
          newMessage: "Yeni Mesaj Gönder",
          formTitle: "Mesaj Gönder",
          formHint: "Zorunlu alanları eksiksiz doldurun.",
          name: "Ad *",
          surname: "Soyad *",
          phoneLabel: "Telefon *",
          emailLabel: "E-posta *",
          message: "Mesajınız *",
          messagePlaceholder: "Size nasıl yardımcı olabiliriz?",
          sending: "Gönderiliyor...",
          send: "Mesajı Gönder",
          rateLimited: "Kısa sürede çok fazla mesaj gönderildi. Lütfen biraz sonra tekrar deneyin.",
          sendFailed: "Mesajınız şu anda gönderilemedi. Lütfen tekrar deneyin veya telefon/WhatsApp üzerinden bize ulaşın.",
          whatsappDefault: "Merhaba, bilgi almak istiyorum."
        },
        rentalShowcase: {
          backAria: "Kiralık araçlardan geri dön",
          searchAria: "Kiralık araçlarda ara",
          searchPlaceholder: "Marka, model, konum veya araç no ara",
          kicker: "ALPERLER KİRALAMA",
          title: "Kiralık Araçlar",
          favoritesTitle: "Favorilerim",
          subtitle: "İster birkaç saat ister uzun dönem. Yolculuğunuza uygun aracı fiyat, konfor, konum ve müsaitlik seçenekleriyle kolayca bulun.",
          toolbarAria: "Kiralık araç filtre ve sıralama özeti",
          resultsCount: "{n} araç",
          summaryAll: "Tüm araçlar",
          summaryAvailableOnly: "yalnız müsait",
          clear: "Temizle",
          filter: "Filtrele",
          resultsAria: "Kiralık araç sonuçları",
          emptyTitle: "Aradığınız özelliklerde araç bulunamadı",
          emptyHint: "Tarih, şube veya donanımı gevşetin — bakımlı araçlar planınıza uymak için hazır.",
          showAll: "Tüm Kiralık Araçları Göster",
          filterSheetEyebrow: "SİZE UYGUN ARACI BULUN",
          filterSheetTitle: "Kiralık Araçları Filtreleyin",
          closeFiltersAria: "Filtreleri kapat",
          driverOption: "Sürücü seçeneği",
          allOptions: "Tüm seçenekler",
          availableOnly: "Yalnız müsait araçlar",
          allVehicles: "Tüm araçlar",
          rentalDate: "Kiralama tarihi",
          pickupTime: "Alış saati",
          returnTime: "İade saati",
          pickupDate: "Alış tarihi",
          returnDate: "İade tarihi",
          clearFilters: "Filtreleri Temizle",
          showVehicles: "{n} Aracı Göster",
          minPriceHourly: "En düşük saatlik fiyat",
          minPriceDaily: "En düşük günlük fiyat",
          maxPriceHourly: "En yüksek saatlik fiyat",
          maxPriceDaily: "En yüksek günlük fiyat"
        },
        appointmentPage: {
          backAria: "Geri dön",
          title: "Randevu Talebi",
          heading: "Randevu Talep Et",
          intro: "Araç kiralama, satın alma, VIP tur veya diğer hizmetlerimiz için talebinizi oluşturun. Kayıt sonrası size referans numarası verilir.",
          successTitle: "Randevu Talebiniz Kaydedildi",
          successCopy: "Talebiniz başarıyla kaydedildi. Kesin randevu onayı ayrıca bildirilecektir.",
          referenceLabel: "Referans Numarası",
          goHome: "Ana Sayfaya Dön",
          topic: "Randevu Konusu *",
          name: "Ad Soyad *",
          phone: "Telefon *",
          email: "E-posta *",
          emailHint: "Randevu kaydı ve durum değişiklikleri bu adrese gönderilir.",
          dateAria: "Randevu tarihi seç",
          timeAria: "Randevu saati seç",
          date: "Tarih *",
          time: "Saat *",
          message: "Mesajınız / Notunuz",
          messagePlaceholder: "Varsa eklemek istediğiniz notu yazın",
          formError: "Lütfen ad-soyad, telefon, e-posta, konu, tarih ve saat alanlarını geçerli şekilde doldurun.",
          submit: "Randevu Talebini Gönder",
          topicRent: "Araç Kiralama",
          topicBuy: "Araç Satın Alma",
          topicSell: "Aracımı Satmak/Kiralamak İstiyorum",
          topicTour: "VIP Tur / Transfer",
          topicOther: "Diğer",
          toastInvalid: "Lütfen zorunlu alanları kontrol edin.",
          toastSuccess: "Randevu talebiniz kaydedildi.",
          toastFail: "Randevu talebi kaydedilemedi. Lütfen tekrar deneyin veya bizimle iletişime geçin.",
          deliveryUnknown: "Bildirim sonucu alınamadı. Rezervasyon kaydı korunmaktadır.",
          deliveryBoth: "Onay e-postası ve SMS gönderildi.",
          deliveryEmail: "E-posta gönderildi. SMS kanalı henüz tamamlanmadı.",
          deliverySms: "SMS gönderildi. E-posta kanalı henüz tamamlanmadı.",
          deliveryNotConfigured: "Talebiniz kaydedildi. Bildirim sağlayıcılarından en az biri henüz yapılandırılmamış.",
          deliveryPartial: "Talebiniz kaydedildi ancak otomatik bildirim gönderimi tamamlanamadı. Kaydınız kaybolmadı.",
          itemName: "Randevu: {topic}",
          fallbackTopic: "Randevu",
          notesTime: "Saat: {time}",
          notesMessage: "Mesaj: {message}",
          notificationStatus: "Bildirim Durumu",
          saving: "Kaydediliyor...",
          phonePlaceholder: "05XX XXX XX XX",
          emailPlaceholder: "ornek@email.com",
        },
        blogDetail: {
          backAria: "Rehber yazısından geri dön",
          kicker: "ALPERLER YOL REHBERİ",
          titleFallback: "Rehber Yazısı",
          galleryAria: "{title} fotoğraf ve video galerisi",
          openFullscreenAria: "{title} tam ekran aç",
          openVideoFullscreenAria: "Videoyu tam ekran galeride aç",
          prevMediaAria: "Önceki medya",
          nextMediaAria: "Sonraki medya",
          authorLabel: "YAZAR",
          brandFallback: "Alperler Rent A Car",
          share: "Paylaş",
          shareAria: "Bu yazıyı paylaş",
          copyLink: "Bağlantıyı Kopyala",
          copyLinkAria: "Yazı bağlantısını kopyala",
          copied: "Bağlantı kopyalandı.",
          allGuides: "Tüm Rehberler",
          contactUs: "Bize Ulaşın",
          loading: "Yazı hazırlanıyor",
          errorTitle: "Bu yazıya şu anda ulaşılamıyor",
          errorHint: "Lütfen kısa bir süre sonra yeniden deneyin veya diğer rehberlere göz atın.",
          backToGuides: "Tüm Rehberlere Dön",
          shareTitleFallback: "Alperler Yol Rehberi",
          shareTextFallback: "Alperler Yol Rehberi'ndeki bu yazıyı inceleyin.",
          mediaTitle: "Blog görseli",
          videoTitle: "Blog videosu",
        },
        legalPage: {
          backAria: "Geri dön",
          headerTitle: "Kurumsal & Yasal",
          introTitle: "Hizmete Göre Açık Yasal Bilgilendirme",
          introCopy: "Genel veri ve kullanım politikalarının yanında saatlik ve günlük kiralama, satış, tur, araç değerlendirme, şube ağı ve ticari ileti süreçlerine özel koşulları ayrı ayrı inceleyebilirsiniz.",
          openDocAria: "{title} belgesini aç",
          backToList: "Yasal Belgeler Listesine Dön",
          backToListAria: "Yasal belgeler listesine dön",
          unpublished: "Bu belge henüz yönetim panelinden yayımlanmamış.",
          fallbackTitle: "Yasal Bilgilendirme",
          docs: {
            rental: "Araç Kiralama Koşulları",
            hourlyRental: "Saatlik Araç Kiralama Koşulları",
            sales: "İkinci El Satış & İlan Koşulları",
            tour: "Tur & Transfer Hizmet Koşulları",
            partner: "Aracını Değerlendir Başvuru Koşulları",
            branch: "Şube & Bayilik Başvuru Koşulları",
            commercial: "Bülten & Ticari Elektronik İleti Bilgilendirmesi",
            commercialShort: "Bülten & Ticari Elektronik İleti",
            kvkk: "KVKK Aydınlatma Metni",
            privacy: "Gizlilik Politikası",
            cookies: "Çerez Politikası",
            terms: "Genel Kullanım Şartları",
            distanceSelling: "Mesafeli İşlem Bilgilendirmesi",
            cancellation: "İade ve İptal Politikası",
            insurance: "Araç Sigorta ve Sorumluluk Metni",
            insuranceShort: "Araç Sigorta ve Sorumluluk",
            faq: "Sıkça Sorulan Sorular",
          },
        },
        trackCar: {
          backAria: "Rezervasyon takip ekranından geri dön",
          kicker: "OPERASYON TAKİBİ",
          bookingFallback: "Rezervasyon",
          liveHint: "Gerçek rezervasyon kaydı · Supabase canlı veri",
          loadingTitle: "Rezervasyon yükleniyor",
          loadingHint: "Yönetici yetkisi ve canlı rezervasyon kaydı doğrulanıyor.",
          accessDeniedTitle: "Erişim reddedildi",
          accessDenied: "Bu ekran yalnız rezervasyon operasyonu yetkisi olan yönetici hesaplarına açıktır.",
          dataErrorTitle: "Rezervasyon verisine ulaşılamadı",
          notFoundTitle: "Rezervasyon bulunamadı",
          notFoundHint: "{id} referansına ait aktif kayıt bulunmuyor.",
          backToReservations: "Rezervasyonlara Dön",
          reference: "Referans:",
          callCustomer: "Müşteriyi Ara",
          whatsapp: "WhatsApp",
          openVehicle: "Aracı Aç",
          customerTitle: "Müşteri",
          fullName: "Ad Soyad",
          phone: "Telefon",
          email: "E-posta",
          source: "Kaynak",
          notSpecified: "Belirtilmedi",
          detailTitle: "Rezervasyon Detayı",
          start: "Başlangıç",
          end: "Bitiş",
          duration: "Süre",
          days: "{n} gün",
          withDriver: "Şoförlü hizmet",
          withoutDriver: "Şoförsüz kiralama",
          driver: "Şoför",
          routeTitle: "Teslim ve Rota",
          pickup: "Alış / Buluşma",
          dropoff: "İade / Varış",
          paymentTitle: "Ödeme",
          method: "Yöntem",
          status: "Durum",
          total: "Toplam",
          telemetryKicker: "CANLI GPS / TELEMETRİ",
          telemetryTitle: "Gerçek cihaz verisi henüz bağlı değil",
          telemetryHint: "Bu projede şu anda GPS/telemetri tablosu veya cihaz sağlayıcısı bulunmuyor. Bu nedenle konum, hız, yakıt, kapı ve motor durumu uydurulmuyor. Gerçek cihaz entegrasyonu eklendiğinde bu bölüm yalnız doğrulanmış telemetriyi gösterecek.",
          notesTitle: "Operasyon Notu",
          whatsappMessage: "Merhaba, {ref} referanslı Alperler Auto rezervasyonunuz hakkında iletişime geçiyoruz.",
          typeRental: "Araç Kiralama",
          typeTour: "Tur",
          typeSale: "Satış Talebi",
          typeAppointment: "Randevu",
          statusPending: "Bekliyor",
          statusApproved: "Onaylandı",
          statusRejected: "Reddedildi",
          statusCompleted: "Tamamlandı",
          statusCancelled: "İptal",
          payCard: "Kart",
          payEft: "Havale / EFT",
          payOffice: "Ofiste Ödeme",
          payNone: "Ödeme seçilmedi",
          payPaid: "Ödendi",
          payPending: "Ödeme Bekliyor",
          payFailed: "Başarısız",
          payRefunded: "İade Edildi",
          payNotRequired: "Ödeme Gerekmiyor",
        },
        tourMedia: {
          kicker: "Gerçek Rota Medyası",
          title: "Fotoğraf & Video Galerisi",
          videoUnsupported: "Tarayıcınız video oynatmayı desteklemiyor.",
          attribution: "Kaynak / Atıf: {value}",
          thumbsAria: "Tur medya küçük resimleri",
          openVideoAria: "Videoyu aç: {title}",
          openPhotoAria: "Fotoğrafı aç: {title}",
          photoTitle: "{title} rota fotoğrafı",
          videoTitle: "{title} videosu",
          tourFallback: "Tur",
        },
        mediaLightbox: {
          defaultAria: "Medya tam ekran görünümü",
          closeAria: "Tam ekran medyayı kapat",
          prevAria: "Önceki medya",
          nextAria: "Sonraki medya",
          imageAlt: "Detay görseli",
          videoAlt: "Detay videosu",
        },
        nativeDate: {
          selectStrong: "Tarihi seç",
          dialogTitle: "Tarih seç",
          closeAria: "Takvimi kapat",
          prevMonthAria: "Önceki ay",
          nextMonthAria: "Sonraki ay",
          daysAria: "{month} tarihleri",
          clear: "Tarihi temizle",
          today: "Bugün",
          defaultLabel: "Tarih",
          changeSuffix: "tarihi değiştir",
          selectSuffix: "Tarihi seç",
          todayWord: "bugün",
          selectedWord: "seçili",
          weekdays: ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"],
        },
        prefooter: {
          trustAria: "Hizmet güven bilgileri",
          badge: "Size Uygun Sonraki Adım",
          title: "Planınızı Birlikte Netleştirelim",
          description: "Araç kiralama, ikinci el araç, tur, transfer, randevu veya aracınızı değerlendirme konusunda hangi adımın size uygun olduğunu birlikte netleştirin.",
          primaryLabel: "Bize Ulaşın",
          secondaryLabel: "Randevu Oluştur",
          trustItems: [
            "Kiralama, satış, tur ve transfer tek ekipte",
            "WhatsApp ve telefon desteği",
            "Güncel filo ve şube seçenekleriyle ihtiyacınıza net cevap",
          ],
        },
        loyaltyPanel: {
          panelAria: "Sadakat puanı kullanımı",
          brand: "ALPERLER SADAKAT",
          pointsBalance: "{n} puanınız var",
          usePoints: "Puan Kullan",
          sheetTitle: "Puanınızı bu işlemde kullanın",
          balancePrefix: "Mevcut bakiye:",
          pointsUnit: "puan",
          closeAria: "Sadakat puanı panelini kapat",
          pointsLabel: "Kullanmak istediğiniz puan",
          quickAria: "Hızlı puan seçimi",
          all: "Tümü",
          rule: "Minimum {n} puan. Puanınızın TL karşılığı ve bu işlemde kullanabileceğiniz en yüksek oran, ödeme tamamlanmadan önce güncel koşullara göre kesinleştirilir.",
          remove: "Puan Kullanma",
          apply: "{n} Puanı Uygula",
          selectPoints: "Puan Seç",
          applied: "{n} puan kullanım tercihiniz işleminize eklendi. Kesin puan ve indirim tutarı rezervasyon onayında gösterilir.",
        },
        toast: {
          closeAria: "Bildirimi kapat",
        },
        tourDetail: {
          backAria: "Turlardan geri dön",
          kicker: "TUR DETAYI",
          galleryAria: "{title} fotoğraf ve video galerisi",
          openFullscreenAria: "{title} tam ekran aç",
          durationFallback: "Tur deneyimi",
          mediaEmptyTitle: "Bu tur için görsel yüklenmedi",
          mediaEmptyHint: "Fotoğraf ve videolar yüklendikçe burada gösterilecek.",
          routeInfo: "Rota Bilgisi",
          campaignPrice: "Kampanya fiyatı",
          fromPrice: "kişi başı",
          duration: "Süre",
          groupSize: "Önerilen grup",
          people: "{n} kişi",
          notSpecified: "Belirtilmedi",
          meeting: "Buluşma",
          location: "Konum",
          aboutTour: "Tur hakkında",
          itinerary: "Güzergah",
          scope: "Kapsam",
          included: "Dahil",
          excluded: "Hariç",
          highlights: "Öne çıkanlar",
          mapTitle: "Buluşma ve rota",
          openMap: "Haritada aç",
          actionsAria: "Tur hızlı işlemleri",
          whatsapp: "WhatsApp",
          reserve: "Rezervasyon Talep Et",
          closeReservationAria: "Tur rezervasyonunu kapat",
          stepOf: "Adım {n} / {total}",
          successTitle: "Rezervasyon talebiniz alındı",
          successCopy: "Referans: {ref}",
          step1Kicker: "1. Tarih ve kişi sayısı",
          step1Title: "Tur planınızı belirleyin",
          tourDate: "Tur Tarihi",
          demandLoadingTitle: "Uygunluk kontrol ediliyor",
          demandLoadingHint: "Seçtiğiniz tarih için rezervasyon durumu hazırlanıyor.",
          peopleCount: "Kişi Sayısı",
          decreasePeopleAria: "Kişi sayısını azalt",
          increasePeopleAria: "Kişi sayısını artır",
          estimatedTotal: "Tahmini toplam",
          campaignEstimatedTotal: "Kampanyalı tahmini toplam",
          continue: "Devam",
          step2Kicker: "2. İletişim",
          step2Title: "İletişim bilgilerinizi tamamlayın",
          firstName: "Ad",
          lastName: "Soyad",
          phone: "Telefon",
          email: "E-posta",
          note: "Not",
          back: "Geri",
          step3Kicker: "3. Onay",
          step3Title: "Talebinizi kontrol edin",
          reviewTour: "Tur",
          reviewDate: "Tarih",
          reviewPeople: "Kişi",
          reviewContact: "İletişim",
          submit: "Talebi Gönder",
          submitting: "Gönderiliyor...",
          loading: "Tur bilgileri hazırlanıyor",
          errorTitle: "Tur bilgilerine şu anda ulaşılamıyor",
          errorHint: "Lütfen kısa bir süre sonra yeniden deneyin.",
          retry: "Tekrar dene",
          invalidDate: "Geçerli bir tur tarihi seçin.",
          invalidContact: "Lütfen ad, soyad, telefon ve e-posta alanlarını geçerli şekilde doldurun.",
          notSelected: "Seçilmedi",
          summaryFallback: "Alperler Rent A Car tur deneyimi",
          mediaTitle: "Tur görseli",
          videoTitle: "{title} videosu",
          prevMediaAria: "Önceki medya",
          nextMediaAria: "Sonraki medya",
          statusLabel: "Durum",
          statusOpen: "Rezervasyona açık",
          aboutHint: "Rota ve deneyim ayrıntıları",
          stopsHint: "{n} durak ve deneyim",
          scopeTitle: "Neler Dahil?",
          scopeHint: "Öne çıkanlar, dahil olanlar ve hariç tutulanlar",
          whatsappAria: "WhatsApp üzerinden tur hakkında bilgi al",
          reserveAria: "Bu turu rezerve et",
          reservationTitle: "Tur Rezervasyonu",
          returnToTour: "Tura Dön",
          returnToTourAria: "Tur detayına dön",
          demandReadyTitle: "Bu tarih için talep oluşturabilirsiniz",
          demandReadyHint: "{approved} onaylı rezervasyon · {pending} bekleyen talep",
          demandUnavailableTitle: "Uygunluk bilgisi şu anda gösterilemiyor",
          demandUnavailableHint: "Talebinizi gönderebilirsiniz; ekibimiz uygunluğu teyit edecektir.",
          pickDateTitle: "Tarih seçin",
          pickDateHint: "Seçtiğiniz gün için rezervasyon durumunu burada görebilirsiniz.",
          peopleAria: "Kişi sayısı",
          recommendedGroup: "Önerilen grup: {label}.",
          peopleUnit: "{n} kişi",
          continueContactAria: "İletişim bilgileri adımına devam et",
          backStep1Aria: "Tarih ve kişi sayısı adımına geri dön",
          continueReviewAria: "Rezervasyon onay adımına devam et",
          backContactAria: "İletişim bilgileri adımına geri dön",
          submitAria: "Rezervasyon talebini gönder",
          serverNote: "Kesin fiyat ve uygunluk, talebiniz gönderildiğinde teyit edilir.",
          retryAria: "Tur bilgilerini tekrar yükle",
          submitFail: "Rezervasyon talebi gönderilemedi. Bilgilerinizi kontrol edip tekrar deneyin.",
          whatsappPrefill: "Merhaba, {title} hakkında bilgi almak istiyorum. {url}",
          titleFallback: "Tur",
          seoTitle: "{title} | {company}",
          seoDescription: "{title} için rota, süre, kişi başı fiyat ve rezervasyon bilgileri.",
          itineraryStep: "Program adımı {n}",
        },
        saleDetail: {
          backAria: "Satılık araçlardan geri dön",
          badge: "SATILIK ARAÇ",
          shareAria: "Aracı paylaş",
          addFavAria: "Favorilere ekle",
          removeFavAria: "Favorilerden çıkar",
          galleryAria: "{brand} {model} fotoğraf ve video galerisi",
          enlargeAria: "Araç görselini büyüt",
          videoFullscreenAria: "Videoyu tam ekran aç",
          prevMediaAria: "Önceki medya",
          nextMediaAria: "Sonraki medya",
          mediaEmpty: "Araç görsellerine şu anda ulaşılamıyor",
          stockNo: "Araç No {id}",
          interestAria: "Araç ilgi bilgileri",
          views: "{n} görüntülenme",
          favCount: "{n} favori",
          tabsAria: "Araç detay bölümleri",
          tabInfo: "İLAN BİLGİSİ",
          tabDesc: "AÇIKLAMA",
          tabLocation: "KONUM",
          listingAria: "Satılık araç bilgileri",
          techToggle: "Teknik özellikler",
          featuresToggle: "Donanım ve özellikler",
          expertiseTitle: "Ekspertiz ve Hasar Geçmişi",
          tramerInfo: "Tramer bilgisi",
          tramerSource: "Doğrulama kaynağı: {name}",
          aboutTitle: "{brand} {model} Hakkında",
          descFallback: "Bu araç için ayrıntılı açıklama henüz paylaşılmamış.",
          locationFallback: "Konum bilgisi için bizimle iletişime geçin",
          actionsAria: "Satılık araç işlemleri",
          callAria: "Telefonla ara",
          call: "Ara",
          inquiryAria: "Satış talebi gönder",
          inquiry: "Satış Talebi",
          whatsappAria: "WhatsApp ile bilgi al",
          whatsapp: "WhatsApp",
          loading: "Araç bilgileri hazırlanıyor",
          errorTitle: "Araç bilgilerine şu anda ulaşılamıyor",
          errorHint: "Lütfen kısa bir süre sonra yeniden deneyin.",
          retry: "Tekrar dene",
          notSpecified: "Belirtilmedi",
          labelListingNo: "İlan No",
          labelListingDate: "İlan Tarihi",
          labelBrand: "Marka",
          labelSeriesModel: "Seri / Model",
          labelYear: "Yıl",
          labelKm: "Kilometre",
          labelFuel: "Yakıt",
          labelTransmission: "Vites",
          labelBody: "Kasa",
          labelColor: "Renk",
          labelSeats: "Koltuk",
          labelDoors: "Kapı",
          labelDrivetrain: "Çekiş",
          labelEnginePower: "Motor Gücü",
          labelEngineVolume: "Motor Hacmi",
          labelWarranty: "Garanti",
          labelStatus: "Durum",
          statusForSale: "Satışta",
          statusSold: "Satıldı",
          warrantyYes: "Var",
          cylindersUnit: "{n} silindir",
          people: "{n} kişi",
          kmValue: "{n} km",
          dateUnknown: "Tarih bilgisi paylaşılmamış",
          shareText: "Bu satılık aracı inceleyin.",
          mediaTitle: "Araç görseli",
          videoTitle: "{brand} {model} videosu",
          damageStatus: "Hasar Durumu",
          damageFree: "Hatasız ve Boyasız",
          tramerAmount: "Tramer Tutarı",
          tramerVerifiedAt: "Doğrulama Tarihi",
          hidePerformance: "Performans Bilgilerini Gizle",
          showPerformance: "Performans ve Tüketim Bilgilerini Gör",
          hideFeatures: "Donanımı Gizle",
          showFeatures: "Konfor ve Donanımı Gör",
          damageAria: "Hasar ve tramer bilgileri",
          featuredFeatures: "Öne çıkan donanımlar",
          dealerHint: "Araç konumu için ekibimizden bilgi alabilirsiniz.",
          specMaxSpeed: "Maksimum hız",
          specAccel: "0-100 km/s",
          specEngineVolume: "Motor hacmi",
          specEnginePower: "Motor gücü",
          specTorque: "Tork",
          specDrivetrain: "Çekiş",
          specCylinders: "Silindir",
          specCityFuel: "Şehir içi tüketim",
          specHighwayFuel: "Uzun yol tüketim",
          specCombinedFuel: "Ortalama tüketim",
          specTank: "Depo",
          specTrunk: "Bagaj",
          specWheels: "Jant / Lastik",
          specDimensions: "Boyutlar",
          specWeight: "Ağırlık",
          tramerStatus: "Tramer Durumu",
          tramerUnknown: "Bilgi paylaşılmamış",
          tramerDeclaredClean: "Beyan: kayıt yok",
          tramerDeclaredRecord: "Beyan: kayıt var",
          tramerVerifiedClean: "Doğrulandı: kayıt yok",
          tramerVerifiedRecord: "Doğrulandı: kayıt var",
          tramerAmountText: "Bildirilen tramer tutarı {amount} TL.",
          whatsappPrefill: "Merhaba, {brand} {model} satılık araç hakkında bilgi almak istiyorum. {url}",
          seoBrandFallback: "Araç",
          seoTitle: "{brand} {model} Satılık | {company}",
          seoDescription: "{year} {brand} {model} satılık araç. {kmPart}Fiyat, ekspertiz, açıklama ve konum bilgileri.",
          seoKmPart: "{km} km. ",
          shareTitle: "{brand} {model} | {company}",
        },
        carDetail: {
          backAria: "Kiralık araçlara geri dön",
          badge: "KİRALIK ARAÇ",
          campaignStripAria: "Bu araca ait aktif kampanya",
          shareAria: "Aracı paylaş",
          addFavAria: "Favorilere ekle",
          removeFavAria: "Favorilerden çıkar",
          galleryAria: "{brand} {model} fotoğraf ve video galerisi",
          fullscreenAria: "{brand} {model} görselini tam ekran aç",
          videoFullscreenAria: "Videoyu tam ekran aç",
          prevMediaAria: "Önceki medya",
          nextMediaAria: "Sonraki medya",
          mediaEmpty: "Araç görsellerine şu anda ulaşılamıyor",
          stockNo: "ARAÇ NO {id}",
          dailyRental: "Günlük kiralama",
          hourlyRental: "Saatlik kiralama",
          factsAria: "Temel araç bilgileri",
          modelYear: "Model Yılı",
          transmission: "Vites",
          fuel: "Yakıt",
          seats: "Koltuk",
          people: "{n} kişi",
          notSpecified: "Belirtilmedi",
          doors: "Kapı",
          availability: "Müsaitlik",
          available: "Müsait",
          busyPeriod: "Seçilen zaman aralığında dolu",
          withDriver: "Şoförlü",
          withoutDriver: "Şoförsüz",
          aboutToggleSmall: "BU ARAÇ HAKKINDA",
          aboutToggle: "Tüm detayları göster",
          rentalTerms: "Kiralama Koşulları",
          location: "Konum",
          driverOption: "Sürücü seçeneği",
          driverBoth: "Şoförlü / şoförsüz",
          comfort: "Konfor ve Donanım",
          performance: "Performans ve Tüketim",
          aboutVehicle: "Araç Hakkında",
          actionsAria: "Araç hızlı işlemleri",
          callAria: "Telefonla ara",
          call: "Ara",
          whatsappAria: "WhatsApp ile bu araç hakkında bilgi al",
          whatsapp: "WhatsApp",
          reserve: "Rezervasyon Yap",
          loading: "Araç bilgileri hazırlanıyor",
          errorTitle: "Araç bilgilerine şu anda ulaşılamıyor",
          errorHint: "Lütfen kısa bir süre sonra yeniden deneyin.",
          retry: "Tekrar dene",
          shareText: "Bu kiralık aracı inceleyin.",
          summaryFallback: "Alperler Rent A Car kiralık araç",
          mediaTitle: "Araç görseli",
          videoTitle: "{brand} {model} videosu",
          campaignPrice: "kampanya fiyatı",
          countdownEnded: "Süre doldu",
          hourly: "Saatlik",
          daily: "Günlük",
          weekly: "Haftalık",
          monthly: "Aylık",
          longterm: "Uzun dönem",
          aboutToggleTitle: "Konfor, kiralama koşulları ve araç bilgileri",
          dailyMileage: "Günlük kilometre hakkı",
          minHours: "En az {n} saat",
          hourlyMileage: "Saatlik kilometre hakkı",
          deposit: "Depozito",
          minAge: "Minimum sürücü yaşı",
          minLicense: "Ehliyet süresi",
          minLicenseYears: "En az {n} yıl",
          luggage: "Bagaj kapasitesi",
          vehicleClass: "Araç sınıfı",
          callUnavailableAria: "Telefonla arama şu anda kullanılamıyor",
          galleryTitle: "{brand} {model} fotoğraf ve video galerisi",
          withDriverShort: "Şoförlü",
          withoutDriverShort: "Şoförsüz",
          proofViewers15m: "{n} kişi son 15 dakikada inceledi",
          proofViewers24h: "{n} kişi son 24 saatte inceledi",
          proofViewersTotal: "{n} kişi inceledi",
          proofViews: "{n} görüntülenme",
          proofNew: "Yeni fırsat",
          countdownDays: "{n} gün kaldı",
          countdownDay: "1 gün kaldı",
          countdownHours: "{n} saat kaldı",
          whatsappPrefill: "Merhaba, {brand} {model} kiralama hakkında bilgi almak istiyorum. {url}",
          seoBrandFallback: "Araç",
          seoTitle: "{brand} {model} Kiralama | {company}",
          seoDescription: "{brand} {model} günlük/saatlik fiyat, konfor özellikleri ve kiralama koşulları.",
          shareTitle: "{brand} {model} | {company}",
        },
        listYourCar: {
          backAria: "Önceki sayfaya dön",
          title: "Araç Değerleme ve Filoya Kabul",
          secureBadge: "Güvenli başvuru",
          heroEyebrow: "Satış, garanti ve gelir paylaşımı",
          heroTitle: "Aracını sadece listeleme. Profesyonel değerlemeye sok.",
          heroCopy: "Araç bilgilerini, konumunu ve varsa ekspertiz belgelerini gönder. Ekibimiz piyasa bandını, kondisyon sınıfını ve size uygun modeli değerlendirir.",
          statSecure: "Güvenli başvuru",
          statCondition: "Kondisyon sınıfı",
          noticeEyebrow: "Önemli ayrım",
          noticeTitle: "Beklediğin fiyat resmi teklif değildir.",
          noticeCopy: "Başvuruda yazdığın tutar yalnızca senin fiyat beklentindir. Alperler Auto piyasa değeri ve resmi teklifi, uzman incelemesi ve gerekiyorsa fiziki ekspertiz sonrasında belirler.",
          successEyebrow: "Başvuru alındı",
          successTitle: "Değerleme dosyan oluşturuldu.",
          successCopy: "Referans numaranı sakla. Ekibimiz başvuruyu inceleyip gerekiyorsa ekspertiz veya görüşme randevusu oluşturacak.",
          newApplication: "Yeni başvuru",
          geoError: "Konum seçenekleri şu anda hazırlanamadı. İl ve ilçe seçimi tamamlanmadan başvuru gönderilemez.",
          sectionIntentTitle: "İşlem modelini seç",
          sectionIntentHint: "Aracı satmak mı, filoya gelir modeliyle dahil etmek mi istiyorsun?",
          intentSellTitle: "Aracımı satmak istiyorum",
          intentSellHint: "Uzman değerleme sonrası satın alma teklifi",
          intentRentTitle: "Filoya vermek istiyorum",
          intentRentHint: "Aylık garanti veya gelir paylaşımı modeli",
          sectionVehicleTitle: "Araç bilgileri",
          sectionVehicleHint: "Değerleme kalitesini doğrudan etkileyen temel teknik bilgiler.",
          brand: "Marka *",
          model: "Model *",
          modelYear: "Model yılı *",
          km: "Kilometre *",
          fuel: "Yakıt *",
          transmission: "Vites *",
          bodyType: "Kasa tipi",
          color: "Renk",
          askingPrice: "Beklediğin fiyat",
          askingPriceHint: "Bu tutar resmi teklif değildir.",
          select: "Seç",
          preferNot: "Belirtmek istemiyorum",
          gasoline: "Benzin",
          diesel: "Dizel",
          hybrid: "Hibrit",
          electric: "Elektrik",
          lpg: "LPG",
          automatic: "Otomatik",
          manual: "Manuel",
          withDriver: "Şoförlü hizmet de sunabilirim",
          sectionLocationTitle: "Konum ve tercih edilen şube",
          sectionLocationHint: "İl ve ilçenizi seçin, size uygun şube seçeneklerini görüntüleyin.",
          province: "İl *",
          provinceLoading: "İller hazırlanıyor...",
          provinceSelect: "İl seç",
          district: "İlçe *",
          districtSelect: "İlçe seç",
          preferredBranch: "Tercih edilen şube",
          noBranchPref: "Şube tercihim yok",
          sectionOwnershipTitle: "Sahiplik ve araç durumu",
          sectionOwnershipHint: "Ekspertiz öncesi beyan. Nihai kondisyon sınıfını uzman ekip belirler.",
          ownership: "Sahiplik durumu *",
          ownerSelf: "Araç benim",
          ownerProxy: "Vekil / yetkiliyim",
          expertReport: "Mevcut ekspertiz raporum var",
          damageDeclaration: "Hasar, değişen, boya ve önemli mekanik durum beyanı",
          sectionIdentityTitle: "Araç kimlik bilgileri",
          sectionIdentityHint: "Plaka, VIN ve ruhsat bilgileri yalnız başvurunuzun doğrulanması için korunur ve herkese açık gösterilmez.",
          plate: "Plaka",
          vin: "VIN / Şasi numarası",
          registration: "Ruhsat referansı",
          ownershipConfirmed: "Bu araç için beyan vermeye yetkili olduğumu onaylıyorum. *",
          sectionMediaTitle: "Fotoğraf ve belgeler",
          sectionMediaHint: "Fotoğraf, video ve PDF ekspertiz belgesi yükleyebilirsin.",
          chooseFiles: "Dosya seç veya yeniden seç",
          filesHint: "JPG, PNG, WEBP, MP4, PDF. En fazla 10 dosya, dosya başına 50 MB.",
          uploading: "Dosyalar yükleniyor",
          sectionContactTitle: "İletişim ve açıklama",
          sectionContactHint: "Değerleme ekibinin sana ulaşacağı bilgiler.",
          fullName: "Ad soyad *",
          phone: "Telefon *",
          email: "E-posta",
          notes: "Ek not",
          terms: "Başvuru koşullarını okudum ve kabul ediyorum. *",
          privacy: "Kişisel verilerimin bu değerleme süreci için işlenmesini kabul ediyorum. *",
          submit: "Değerleme başvurusunu gönder",
          submitting: "Gönderiliyor...",
          formIncomplete: "Yıldızlı alanları, il-ilçe bilgisini ve onay kutularını tamamla.",
          summaryTitle: "Dosya özeti",
          summaryIntent: "İşlem",
          summarySell: "Satış",
          summaryRent: "Filoya katılım",
          summaryVehicle: "Araç",
          summaryLocation: "Konum",
          processTitle: "Süreç nasıl ilerler?",
          fileReject: "Bazı dosyalar kabul edilmedi. En fazla 10 dosya, dosya başına 50 MB ve toplam 200 MB sınırı vardır.",
          rateLimited: "Kısa sürede çok fazla başvuru denemesi yapıldı. Lütfen biraz sonra tekrar deneyin.",
          submitFailed: "Başvuru şu anda gönderilemedi. Lütfen tekrar deneyin.",
          statOffers: "Teklif modeli",
          phBrand: "Örn. Toyota",
          phModel: "Örn. Corolla",
          phColor: "Örn. Beyaz",
          phCurrency: "TL",
          phDamage: "Bildiğiniz tüm önemli durumları açıkça yazın.",
          phPlate: "34 ABC 123",
          phVin: "17 haneli VIN",
          phRegistration: "İsteğe bağlı",
          phEmail: "Teklif ve randevu bildirimleri için önerilir",
          phNotes: "Araçla veya talebinle ilgili ek bilgi",
          other: "Diğer",
          semiAutomatic: "Yarı otomatik",
          bodyMinibus: "Minibüs",
          ownerAuthorized: "Satış için yetkiliyim",
          ownerCompany: "Şirket aracı",
          branchHint: "Bölgenize uygun, hizmet veren şubeler gösterilir.",
          identitySummary: "Plaka, VIN ve ruhsat bilgisini ekle",
          processStep1: "Başvuru ve belgeleriniz alınır.",
          processStep2: "Uzman ekip piyasa bandı ve A-E kondisyon sınıfı oluşturur.",
          processStep3: "Gerekirse ekspertiz veya görüşme randevusu atanır.",
          processStep4: "Uzman değerlemesi tamamlandığında resmi teklif aşamasına geçilir.",
          notSelected: "Seçilmedi",
          errInvalidGeo: "İl ve ilçe eşleşmesi doğrulanamadı. Konumu yeniden seçin.",
          errBranchNotFound: "Seçilen şube artık hizmet vermiyor. Şube tercihini yenileyin.",
          errIdentitySave: "Kimlik bilgileri kaydedilemedi. Başvurunuz tamamlanmadı. Lütfen tekrar deneyin.",
          errConsent: "Başvuru koşulları ve kişisel veri onayı zorunludur.",
          errGeneric: "Başvuru tamamlanamadı. Bilgileri kontrol edip tekrar deneyin.",
          summaryExpectation: "Beklenti",
          summaryNotSpecified: "Belirtilmedi",
          summaryFiles: "Dosya",
          summaryFileCount: "{n} adet",
        },

        listingBadges: {
          "ACİL": "ACİL",
          "FIRSAT": "FIRSAT",
          "YENİ": "YENİ",
          "POPÜLER": "POPÜLER",
          "PREMIUM": "PREMIUM",
          "UYGUN FİYAT": "UYGUN FİYAT",
          "YENİ GİRİŞ": "YENİ GİRİŞ",
        },
        listingStatus: {
          "Satıldı": "Satıldı",
          "Satışta": "Satışta",
          "Rezerve": "Rezerve",
          "Kirada": "Kirada",
          "Bakımda": "Bakımda",
          "Kontrolde / bakımda": "Kontrolde / bakımda",
        },
        vehicleCard: {
          seats: "{n} Kişilik",
          insured: "%100 Kaskolu & Yol Yardım",
          expertise: "101 Nokta Ekspertizli",
          guarantee: "Alperler Güvencesi",
          available: "Müsait",
          busy: "Dolu",
          withDriver: "ŞOFÖRLÜ",
          withoutDriver: "ŞOFÖRSÜZ",
          bothDrivers: "ŞOFÖRLÜ & ŞOFÖRSÜZ",
          sold: "Satıldı",
          soldUpper: "SATILDI",
          details: "Detay",
          detailAria: "{year} {brand} {model} detaylarını görüntüle",
          shareAria: "{brand} {model} aracını paylaş",
          shareText: "{year} model {brand} {model} Alperler'de!",
          vehicleFallback: "Araç"
        },
        rentalCard: {
          available: "MÜSAİT",
          busy: "ŞU AN DOLU",
          deal: "FIRSAT",
          rentalVehicle: "Kiralık araç",
          featuresAria: "Öne çıkan araç özellikleri",
          seats: "{n} kişi",
          withDriver: "Şoförlü",
          withoutDriver: "Şoförsüz",
          bothDrivers: "Şoförlü / şoförsüz",
          locationFallback: "Konum için bizimle iletişime geçin",
          stock: "ARAÇ NO {code}",
          hourly: "Saatlik kiralama",
          daily: "Günlük kiralama",
          inspect: "Aracı İncele",
          hourUnit: "saat",
          dayUnit: "gün",
          totalAdv: "{qty} {unit} toplam · {discount} avantaj",
          ariaAvailable: "müsait",
          ariaBusy: "şu an dolu",
          ariaModel: "{year} model",
          ariaPriceHourly: "{price} Türk lirası saatlik kiralama",
          ariaPriceDaily: "{price} Türk lirası günlük kiralama",
          ariaInspect: "Aracı incele"
        },
        saleCard: {
          stock: "ARAÇ NO {code}",
          sold: "SATILDI",
          forSale: "SATIŞTA",
          saleVehicle: "Satılık araç",
          factsAria: "Araç özellikleri",
          branchFallback: "Şube bilgisi için aracı inceleyin",
          locationFallback: "Konum bilgisi için aracı inceleyin",
          inspectSold: "Aracı incele",
          inspectLive: "Araç ve ekspertiz bilgilerini incele",
          warrantyPresent: "Garanti bilgisi mevcut",
          tramerUnknown: "Tramer bilgisi paylaşılmamış",
          tramerDeclaredClean: "Tramer beyanı: kayıt yok",
          tramerVerifiedClean: "Tramer doğrulandı: kayıt yok",
          tramerVerified: "Tramer doğrulandı",
          tramerDeclared: "Tramer beyanı",
          amountUnknown: "tutar paylaşılmamış",
          kmUnknown: "kilometre bilgisi paylaşılmamış",
          aria: "{title}, {stock}{km} kilometre, fiyat {price} Türk lirası, {tramer}, {status}. Aracı incele",
          stockPart: "araç no {code}, "
        },
        homeSection: {
          loadFailed: "{title} yüklenemedi",
          loadFailedBody: "İçerik geçici olarak yüklenemedi. Lütfen sayfayı yenileyin veya birkaç dakika sonra tekrar deneyin.",
          retry: "Tekrar Dene",
          retryAria: "{title} bölümünü yeniden yükle",
          emptyTitle: "{title} şu an burada yok",
          emptyBody: "Bu bölümde henüz gösterilecek içerik yok. Tam listeye göz atabilir veya birazdan yeniden deneyebilirsiniz.",
          emptyCta: "Seçeneklere göz at",
          partnerOwnersBadge: "Araç Sahipleri",
          partnerDescFallback: "Aracınızı satış veya kiralama filosu için değerlendirmeye gönderin.",
          partnerCtaFallback: "Aracımı Değerlendir",
          promoFallbackBadge: "Alperler Auto",
          promoFallbackDescription: "Detayları keşfedin.",
          saleBadge: "İkinci El",
          rentalBadge: "Kiralık Araçlar",
          tourBadge: "Turlar",
          blogBadge: "Yol Rehberi",
          campaignBadge: "Fırsatlar",
          branchBadge: "Şubeler",
          viewAllLabel: "Tümünü Gör",
          tourExploreAria: "{title} turunu keşfet",
          tourAlt: "Tur",
          featured: "ÖNE ÇIKAN",
          tourFallbackDescription: "Süreyi, rotayı ve kişi başı fiyatı baştan görün; size uyan deneyimin ayrıntılarına geçin.",
          tourIncludedAria: "Tura dahil olan öne çıkanlar",
          tourIncluded: "Tura dahil",
          capacityUpTo: "{n} kişiye kadar",
          perPerson: "Kişi başı",
          tourCardCtaLabel: "Rotayı ve Ayrıntıları Keşfet",
          blogCardCtaLabel: "Yazıyı Oku",
          campaignLabel: "KAMPANYA",
          campaignDiscountSuffix: "İNDİRİM",
          campaignFallbackDescription: "Kampanyanın avantajını ve ilgili araç ya da tur detayını inceleyin.",
          campaignCtaLabel: "Kampanyayı İncele",
          campaignExpiredLabel: "Süre doldu",
          campaignDaysRemainingSuffix: "gün kaldı",
          campaignOneDayRemainingLabel: "1 gün kaldı",
          campaignHoursRemainingSuffix: "saat kaldı",
          campaignSavingSuffix: "kazanç",
          campaignAdvantageSuffix: "avantaj",
          campaignLimitedLabel: "Sınırlı süreli fırsat",
          campaignNewLabel: "Yeni kampanya",
          campaignViewsSuffix: "görüntülenme",
          campaignProofActiveSuffix: "kişi son 15 dk'da inceledi",
          campaignProofRecentSuffix: "kişi son 24 saatte inceledi",
          campaignProofUniqueSuffix: "kişi inceledi",
          branchFranchiseLabel: "Yetkili Bayi",
          branchLocationLabel: "Alperler Auto Noktası",
          branchFallbackDescriptionSuffix: "bölgesindeki araç ve hizmet seçeneklerini inceleyin.",
          branchPickupLabel: "Teslim alma",
          branchReturnLabel: "İade",
          branchCardCtaLabel: "Şubeyi Keşfet",
          partnerCtaTitle: "Kendi bölgenizde Alperler Auto ile büyümek ister misiniz?",
          partnerCtaLabel: "Bayilik Başvurusu",
          defaultDescription: "Planınıza ekstra avantaj katacak seçili fırsatlar burada. Süre dolmadan size uyan kampanyayı yakalayın, gerçek fiyat avantajını görün ve tek dokunuşla detayına geçin.",
          sections: {
            campaigns: {
              title: "Aktif Fırsatlar",
              badge: "KAÇIRMADAN İNCELE",
              description: "Planınıza ekstra avantaj katacak seçili fırsatlar burada. Süre dolmadan size uyan kampanyayı yakalayın, gerçek fiyat avantajını görün ve tek dokunuşla detayına geçin.",
            },
            services: {
              title: "Hizmetlerimiz",
              badge: "ALPERLER AUTO",
              description: "Kiralama, satış, tur ve transfer — ihtiyacınıza uygun adımı tek yerden planlayın.",
            },
            "why-us": {
              title: "Neden Biz",
              badge: "GÜVENİNİZİ KAZANDIK",
              description: "Net fiyat, yerel ekip ve bakımlı filo ile yolculuğunuzu güvenle planlayın.",
            },
            why_us: {
              title: "Neden Biz",
              badge: "GÜVENİNİZİ KAZANDIK",
              description: "Net fiyat, yerel ekip ve bakımlı filo ile yolculuğunuzu güvenle planlayın.",
            },
            kirala: {
              title: "Kirala",
              badge: "HIZLI KİRALAMA",
              description: "Size uygun aracı seçin, tarihleri netleştirin ve dakikalar içinde yola çıkın.",
            },
            rent: {
              title: "Kirala",
              badge: "HIZLI KİRALAMA",
              description: "Size uygun aracı seçin, tarihleri netleştirin ve dakikalar içinde yola çıkın.",
            },
            featured: {
              title: "Öne Çıkan Araçlar",
              badge: "KİRALIK ARAÇLAR",
              description: "Bakımlı, net fiyatlı ve hemen kullanılabilir seçenekler.",
            },
            rental: {
              title: "Kiralık Araçlar",
              badge: "KİRALIK",
              description: "Günlük iş veya tatil planınız için bakımlı araçlar.",
            },
            sales: {
              title: "Satılık Araçlar",
              badge: "İKİNCİ EL",
              description: "Şeffaf geçmişli, ekspertizli ikinci el seçenekler.",
            },
            tours: {
              title: "Turlar",
              badge: "KEŞFET",
              description: "Bölgesel rotalar ve özel gün deneyimleri.",
            },
            branches: {
              title: "Şubeler",
              badge: "YAKININIZDA",
              description: "Teslim alma ve iade noktalarını keşfedin.",
            },
            blog: {
              title: "Blog",
              badge: "YOL REHBERİ",
              description: "Seyahat ve araç seçimi için pratik öneriler.",
            },
            partner: {
              title: "Aracını Değerlendir",
              badge: "ARAÇ SAHİPLERİ",
              description: "Aracınızı satış veya kiralama için değerlendirmeye gönderin.",
              cta: "Aracımı Değerlendir",
            },
            closing_cta: {
              title: "Yolculuğunuzu Birlikte Planlayalım",
              badge: "ALPERLER RENT A CAR",
              description: "Kiralama, özel gün aracı ve rota planınızı tek noktadan oluşturun.",
              cta: "Rezervasyon Oluştur",
            },
          },
          byType: {
            CAMPAIGN: {
              title: "Aktif Fırsatlar",
              badge: "KAÇIRMADAN İNCELE",
              description: "Planınıza ekstra avantaj katacak seçili fırsatlar burada. Süre dolmadan size uyan kampanyayı yakalayın, gerçek fiyat avantajını görün ve tek dokunuşla detayına geçin.",
            },
            VEHICLES_RENTAL: {
              title: "Kiralık Araçlar",
              badge: "KİRALIK",
              description: "Günlük iş veya tatil planınız için bakımlı araçlar.",
            },
            VEHICLES_SALE: {
              title: "Satılık Araçlar",
              badge: "İKİNCİ EL",
              description: "Şeffaf geçmişli, ekspertizli ikinci el seçenekler.",
            },
            TOURS: {
              title: "Turlar",
              badge: "KEŞFET",
              description: "Bölgesel rotalar ve özel gün deneyimleri.",
            },
            BLOG: {
              title: "Blog",
              badge: "YOL REHBERİ",
              description: "Seyahat ve araç seçimi için pratik öneriler.",
            },
            CUSTOM: {
              title: "Hizmetlerimiz",
              badge: "ALPERLER AUTO",
              description: "Kiralama, satış, tur ve transfer — ihtiyacınıza uygun adımı tek yerden planlayın.",
            },
          },
        },
        campaignsPage: {
          backAria: "Kampanyalardan geri dön",
          title: "Kampanyalar",
          kicker: "Aktif Fırsatlar",
          introTitle: "Planınıza uygun avantajları inceleyin",
          introCopy: "Kaçırmadan bakın: süresi, kapsamı ve fiyat avantajı net fırsatları yan yana görün. Kartı açınca ilgili araç veya tura geçersiniz — karar vermek kolaylaşır.",
          errorTitle: "Kampanyalar yüklenemedi",
          retry: "Tekrar Dene",
          loadingTitle: "Fırsatlar sizin için hazırlanıyor",
          loadingCopy: "Size yakışan güncel avantajlar toplanıyor. Bir an sürecek.",
          emptyTitle: "Şu an yeni bir fırsat kapıda",
          emptyCopy: "Yeni kampanyalar açılır açılmaz burada sizi bekler. Bu arada kiralık ve satılık seçeneklere göz atabilirsiniz.",
          badge: "KAMPANYA",
          discount: "%{n} İNDİRİM",
          mediaEmptyAria: "Kampanya görseli yakında",
          fallbackDesc: "Avantajı, süreyi ve size özel koşulları detayda görün — tek dokunuşla netleşsin.",
          saving: "{amount} avantaj",
          savingPct: "%{n} avantaj",
          deadline: "Bitiş: {date}",
          cta: "Kampanyayı İncele",
          loadError: "Kampanyalar şu anda yüklenemiyor. Lütfen tekrar deneyin.",
          hookSaving: "{amount} fiyat avantajı",
          hookPct: "%{n} fiyat avantajı",
          hookDefault: "Size özel avantajı kaçırmayın",
          proofActive: "{n} kişi son 15 dakikada inceledi",
          proofDay: "{n} kişi son 24 saatte inceledi",
          proofTotal: "{n} kişi inceledi",
          proofViews: "{n} görüntülenme",
          proofNew: "Yeni kampanya",
          ended: "Süre doldu",
          daysLeft: "{n} gün kaldı",
          oneDayLeft: "1 gün kaldı",
          hoursLeft: "{n} saat kaldı",
          unspecified: "Belirtilmedi"
        },
        homePage: {
          trustLine: "YÜKSEKOVA · KİRALAMA · SATIŞ · TUR · TRANSFER",
          title: "Yolculuğunuza yakışan aracı bulun.",
          subtitle: "Kiralık araçtan ikinci el seçeneğe, şoförlü transferden özel gün ve bölgesel turlara kadar ihtiyacınıza uygun seçeneği keşfedin.",
          searchAria: "Araç, tur veya ilan ara",
          searchPlaceholder: "Marka, model, tur veya ilan no",
          searchStartAria: "Aramayı başlat",
          searchButton: "Ara",
          trustAria: "Alperler Rent A Car hizmet avantajları",
          trustPrice: "Net fiyat bilgisi",
          trustSupport: "Yerel ekip desteği",
          trustVerified: "Güncel araç ve hizmetler",
          plannerKicker: "HIZLI PLANLAMA",
          bookingTitle: "Planınızı oluşturun",
          bookingSubtitle: "Hizmet türünü, teslim noktasını ve kiralama süresini seçin. Uygun seçenekleri doğrudan görüntüleyin.",
          serviceLabel: "Ne için araç veya hizmet arıyorsunuz?",
          serviceIndividual: "Şoförsüz araç kiralama",
          serviceDriver: "Şoförlü araç / transfer",
          serviceWedding: "Düğün / özel gün aracı",
          serviceTour: "Tur / gezi planı",
          pickupLabel: "Nereden teslim almak istiyorsunuz?",
          pickupAria: "Teslim alma noktasını seç",
          pickupPlaceholder: "Teslim noktasını seçin",
          durationLabel: "Kiralama Süresi",
          durationAria: "Kiralama süresini seç",
          durationHourly: "Saatlik",
          durationDaily: "Günlük",
          durationWeekly: "Haftalık",
          durationMonthly: "Aylık",
          durationLongterm: "Uzun Süre",
          tourDateLabel: "Tur tarihi",
          hourlyDateLabel: "Kiralama tarihi",
          startDateLabel: "Alış tarihi",
          endDateLabel: "İade tarihi",
          startTimeLabel: "Alış Saati",
          startTimeAria: "Alış saatini seç",
          endTimeLabel: "İade Saati",
          endTimeAria: "İade saatini seç",
          plannerNote: "Kesin rezervasyon, araç ve seçilen zaman aralığı uygunluğu doğrulandıktan sonra oluşur.",
          loading: "Size uygun seçenekler hazırlanıyor...",
          errorTourDate: "Tur tarihini seçin.",
          errorStartDate: "Alış tarihini seçin.",
          errorEndDate: "İade tarihini seçin.",
          errorDateOrder: "İade tarihi alış tarihinden sonra olmalıdır.",
          errorPickup: "Teslim alma noktasını seçin.",
          errorTimeOrder: "İade saati alış saatinden sonra olmalıdır.",
          errorHourlyLimit: "23 saati aşan kiralamalar için günlük seçeneği kullanın.",
          buttonTour: "Bu Tarihe Uyan Turları Göster",
          buttonHourly: "Bu Saatlere Uyan Araçları Göster",
          buttonDriver: "Şoförlü Seçenekleri Göster",
          buttonWedding: "Özel Gün Araçlarını Göster",
          buttonRental: "Bu Tarihe Uyan Araçları Göster",
          summarySelf: "Şoförsüz",
          summaryDriver: "Şoförlü",
          summaryWedding: "Özel gün",
          summaryTour: "Tur",
          seoTitleSuffix: "Araç Kiralama, Satış ve Turlar",
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
        accountShell: {
          homeAria: "Ana sayfaya dön",
          home: "Ana Sayfa",
          navAria: "Hesap bölümleri",
          overview: "Genel Bakış",
          favorites: "Favorilerim",
          profile: "Profil Ayarları",
          wallet: "Cüzdan ve Belgeler",
          referral: "Arkadaşını Davet Et · Sen de Kazan",
          quickAria: "Hızlı işlemler",
          rentKicker: "KİRALAMA",
          rentTitle: "Araç Bul",
          rentHint: "Uygun kiralık araçları incele",
          saleKicker: "SATIŞ",
          saleTitle: "Araç İncele",
          saleHint: "Satılık araçları görüntüle",
          tourKicker: "TUR",
          tourTitle: "Tur Keşfet",
          tourHint: "Rota ve tur seçeneklerini aç",
          apptKicker: "RANDEVU",
          apptTitle: "Randevu Al",
          apptHint: "İşleminiz için randevu oluştur",
        },
        accountFavorites: {
          kicker: "HESABIM",
          title: "Favorilerim",
          subtitle: "Araç, tur ve blog seçimleriniz tek yerde korunur. Bu özet yalnız son favorilerinizi getirir.",
          viewAll: "Tümünü Gör",
          openAria: "{title} favorisini aç",
          inspect: "İncele",
          emptyTitle: "Henüz favoriniz yok",
          emptyHint: "Kalple kaydedin; favorileriniz bir sonraki yolculuğunuz için hazır beklesin.",
          linkVehicles: "Araçlar",
          linkTours: "Turlar",
          linkBlog: "Blog",
          badgeTour: "TUR",
          badgeBlog: "BLOG",
          badgeVehicle: "ARAÇ",
          tourFallback: "Tur",
        },
        accountDashboard: {
          eyebrow: "ALPERLER HESABIM",
          adminOpening: "Yönetim açılıyor...",
          admin: "Yönetim",
          profileSettings: "Profil Ayarları",
          logout: "Çıkış",
          loading: "Hesap bilgileriniz hazırlanıyor...",
          toolsAria: "Hesap hızlı işlemleri",
          rentKicker: "KİRALAMA",
          rentTitle: "Araç Bul",
          saleKicker: "SATIŞ",
          saleTitle: "Araç İncele",
          tourKicker: "ROTA",
          tourTitle: "Tur Keşfet",
          apptKicker: "RANDEVU",
          apptTitle: "Randevu Al",
          overviewEyebrow: "HESAP ÖZETİ",
          overviewTitle: "Tek bakışta durumunuz",
          refresh: "Yenile",
          points: "Puan",
          seeDetail: "Detayı gör",
          reviewing: "İnceleniyor",
          openRequests: "Talepleri aç",
          approved: "Onaylandı",
          openBookings: "Rezervasyonları aç",
          total: "Toplam",
          seeAll: "Tümünü gör",
          loyaltyEyebrow: "SADAKAT DETAYI",
          tierLevel: "{tier} seviye",
          close: "Kapat",
          rentals: "Kiralama",
          tours: "Tur",
          sales: "Satış",
          campaigns: "Kampanya",
          referrals: "Davet",
          pointsEarned: "Kazanılan Puan",
          spendLabel: "{currency} toplam harcama",
          spendMeta: "{tx} tamamlanan işlem · {saved} {currency} avantaj",
          historyEyebrow: "REZERVASYON VE TALEPLER",
          historyTitle: "İşlem geçmişiniz",
          historyHint: "Rezervasyonlarınızı ve taleplerinizi durumlarına göre kolayca takip edin.",
          filtersAria: "İşlem durumu filtreleri",
          filterAll: "Tümü",
          filterPending: "İnceleniyor",
          filterApproved: "Onaylandı",
          filterCompleted: "Tamamlandı",
          filterClosed: "Kapandı",
          start: "Başlangıç",
          end: "Bitiş",
          payment: "Ödeme",
          cancelConfirm: "Bu talebi iptal etmek istediğinizden emin misiniz?",
          cancelDismiss: "Vazgeç",
          cancelling: "İptal ediliyor...",
          cancelRequest: "Talebi İptal Et",
          emptyTitle: "Bu durumda bir işleminiz yok.",
          emptyHint: "Yeni rezervasyon veya talebiniz burada görünsün — tek bakışta takip edin.",
          browseServices: "Hizmetleri İncele",
          partialRefresh: "Hesabınız açıldı ancak bazı ek bilgiler şu anda güncellenemedi. Lütfen biraz sonra tekrar deneyin.",
          refreshFail: "Hesap bilgileriniz şu anda yenilenemedi. Lütfen tekrar deneyin.",
          tenureYears: "{years} yıl {months} aydır müşteri",
          tenureMonths: "{months} aydır müşteri",
          engLong: "Uzun dönem müşteri",
          engLoyal: "Sadık müşteri",
          engRegular: "Düzenli müşteri",
          engNew: "Yeni müşteri",
          typeRental: "Araç Kiralama",
          typeTour: "Tur Rezervasyonu",
          typeSale: "Satın Alma Talebi",
          typeAppt: "Randevu Talebi",
          typeGeneric: "Talep",
          statusApproved: "Onaylandı",
          statusRejected: "Onaylanmadı",
          statusCompleted: "Tamamlandı",
          statusCancelled: "İptal Edildi",
          statusPending: "İnceleniyor",
          payPaid: "Ödendi",
          payRefunded: "İade Edildi",
          payFailed: "Başarısız",
          payPending: "Bekliyor",
          payUnknown: "Belirtilmedi",
          descApproved: "Talebiniz onaylandı. İşlem ayrıntıları için ekibimiz gerektiğinde sizinle iletişime geçecektir.",
          descRejected: "Talebiniz bu aşamada onaylanmadı. Alternatif seçenekler için destek ekibimizle iletişime geçebilirsiniz.",
          descCompleted: "Bu işlem tamamlandı ve geçmiş kaydı olarak hesabınızda saklanıyor.",
          descCancelled: "Bu talep iptal edildi ve aktif işlem olarak değerlendirilmez.",
          descPending: "Talebiniz alındı ve ekibimiz tarafından inceleniyor. Durum değiştiğinde hesabınızda güncel durumunu görebilirsiniz.",
          cancelSuccess: "Talebiniz iptal edildi ve işlem geçmişi güncellendi.",
          cancelFail: "Talep iptal edilemedi.",
          adminFail: "Yönetim paneli açılamadı.",
          fallbackName: "Hesabım",
        },
        accountWallet: {
          eyebrow: "ALPERLER HESABIM",
          title: "Cüzdan ve Belgeler",
          subtitle: "Ödeme kartlarınızı ve rezervasyonlarda kullanacağınız belgeleri tek yerden yönetin.",
          navAria: "Cüzdan gezinme",
          backAccount: "Hesabıma Dön",
          home: "Ana Sayfa",
          cardsEyebrow: "ÖDEME CÜZDANI",
          cardsTitle: "Kayıtlı kartlarım",
          cardsHint: "Kartlarınızı sonraki ödemelerde daha hızlı kullanmak için güvenle ekleyebilirsiniz.",
          close: "Kapat",
          addCard: "Yeni Kart Ekle",
          privacyTitle: "Güvenli kart saklama",
          privacyBody: "Kart bilgileriniz güvenli ödeme kuruluşunda korunur. Cüzdanda yalnız kartın tanınması için gereken sınırlı bilgiler gösterilir.",
          cardsLoading: "Kartlarınız hazırlanıyor...",
          cardsUnavailableTitle: "Kayıtlı kart özelliği şu anda aktif değil.",
          cardsUnavailableBody: "Rezervasyon sırasında sunulan diğer ödeme seçeneklerini kullanabilirsiniz.",
          cardAlias: "Kart adı",
          cardAliasPh: "Örn. Kişisel kartım",
          cardHolder: "Kart üzerindeki ad soyad",
          cardNumber: "Kart numarası",
          cardNumberPh: "0000 0000 0000 0000",
          expMonth: "Son kullanma ayı",
          expMonthPh: "AA",
          expYear: "Son kullanma yılı",
          expYearPh: "YYYY",
          formHelp: "Kart güvenlik kodu bu işlem için istenmez. Kartınızı eklediğinizde yalnız ödeme kuruluşunun oluşturduğu güvenli kayıt kullanılır.",
          addingCard: "Kart ekleniyor...",
          saveCard: "Kartı Güvenle Kaydet",
          default: "Varsayılan",
          expiry: "Son kullanma {mm}/{yy}",
          makeDefault: "Varsayılan Yap",
          removeCard: "Kartı Kaldır",
          emptyCardsTitle: "Henüz kayıtlı kartınız yok.",
          emptyCardsBody: "İsterseniz bir kart ekleyip sonraki ödemelerinizi hızlandırabilirsiniz.",
          docsEyebrow: "BELGELERİM",
          docsTitle: "Kimlik ve ehliyet",
          docsHint: "Rezervasyon doğrulamasında gereken belgeleri bir kez yükleyip durumlarını buradan takip edin.",
          docsLoading: "Belgeleriniz hazırlanıyor...",
          consentEyebrow: "GİZLİLİK ONAYI",
          consentTitleFallback: "Belge Kullanım Onayı",
          consentHint: "Kimlik veya ehliyet yüklemeden önce belge kullanım koşullarını onaylamanız gerekir.",
          accepting: "Onaylanıyor...",
          acceptTerms: "Koşulları Kabul Et",
          privateTitle: "Özel erişim",
          privateBody: "Belgeleriniz yalnız doğrulama yetkisi olan ekip tarafından rezervasyon işlemleri için görüntülenebilir.",
          slotsAria: "Kimlik ve ehliyet belge alanları",
          view: "Görüntüle",
          uploading: "Yükleniyor...",
          replacePhoto: "Yeni Fotoğraf Yükle",
          remove: "Kaldır",
          replaceAria: "{title} için yeni fotoğraf çek veya seç",
          emptyDocTitle: "Henüz yüklenmedi",
          emptyDocHint: "Telefonunuzun kamerasıyla fotoğraf çekebilir veya galeriden görsel seçebilirsiniz.",
          capture: "Fotoğraf Çek veya Görsel Seç",
          captureAria: "{title} fotoğrafı çek veya seç",
          reviewEyebrow: "DOĞRULAMA SÜRECİ",
          reviewTitle: "Belgeniz yüklendiğinde ne olur?",
          review1: "Belge hesabınıza eklenir.",
          review2: "Yetkili ekip rezervasyonla birlikte kontrol eder.",
          review3: "Sonuç cüzdanınızda görünür; gerekirse yeniden yükleme notu alırsınız.",
          slotIdFront: "Kimlik Ön Yüz",
          slotIdFrontDesc: "Kimliğinizin fotoğraflı ön yüzünü net ve tam kadraj yükleyin.",
          slotIdBack: "Kimlik Arka Yüz",
          slotIdBackDesc: "Kimliğinizin arka yüzündeki bilgilerin tamamı görünür olmalı.",
          slotLicenseFront: "Ehliyet Ön Yüz",
          slotLicenseFrontDesc: "Sürücü belgenizin ön yüzünü yansıma ve bulanıklık olmadan yükleyin.",
          slotLicenseBack: "Ehliyet Arka Yüz",
          slotLicenseBackDesc: "Sürücü belgenizin arka yüzünü tam kadraj yükleyin.",
          errDocsLoad: "Belgeleriniz şu anda yüklenemedi. Biraz sonra yeniden deneyin.",
          errCardsLoad: "Kayıtlı kartlarınız şu anda yüklenemedi. Biraz sonra yeniden deneyin.",
          defaultAlias: "Kartım",
          msgCardAdded: "Kartınız cüzdanınıza eklendi.",
          msgCardRemoved: "Kart cüzdanınızdan kaldırıldı.",
          msgDefaultUpdated: "Varsayılan kartınız güncellendi.",
          statusVerified: "Doğrulandı",
          statusRejected: "Yeniden Yükleme Gerekli",
          statusExpired: "Süresi Doldu",
          statusPending: "İnceleniyor",
          msgTermsAccepted: "Belge alanınız açıldı. Belgelerinizi ekleyebilirsiniz.",
          errTerms: "Belge onayı şu anda tamamlanamadı.",
          msgUploaded: "{title} başarıyla yüklendi.",
          errSize: "Belge dosyası en fazla 10 MB olabilir.",
          errType: "Lütfen JPEG, PNG veya WebP formatında bir görsel seçin.",
          errUpload: "Belge yüklenemedi. Görüntüyü kontrol edip tekrar deneyin.",
          errOpen: "Belge şu anda görüntülenemedi.",
          msgRemoved: "{title} kaldırıldı.",
          errRemove: "Belge kaldırılamadı. Lütfen tekrar deneyin.",
          errGeneric: "İşlem tamamlanamadı. Lütfen tekrar deneyin.",
        },
        accountProfile: {
          kicker: "PROFİL AYARLARI",
          title: "Hesabınızı yönetin",
          subtitle: "Yalnız değiştirmek istediğiniz bölümü açın. Kaydettiğiniz bölüm otomatik kapanır.",
          titleAlt: "Bilgilerim",
          subtitleAlt: "Rezervasyonlarda kullanacağınız iletişim ve adres bilgilerinizi güncel tutun.",
          loading: "Profil bilgileriniz hazırlanıyor...",
          loadingAlt: "Profiliniz hazırlanıyor...",
          avatarKicker: "PROFİL FOTOĞRAFI",
          avatarTitle: "Fotoğrafınızı değiştirin",
          avatarHas: "Fotoğraf kayıtlı",
          avatarNone: "Henüz fotoğraf yok",
          avatarAlt: "Profil fotoğrafı",
          avatarUploading: "Yükleniyor...",
          avatarSelect: "Fotoğraf Seç",
          avatarChange: "Fotoğraf Değiştir",
          avatarRemove: "Fotoğrafı Kaldır",
          avatarHint: "JPG, PNG veya WebP. En fazla 2 MB. Fotoğraf yükleme, diğer profil bilgilerinin kaydından bağımsızdır.",
          infoKicker: "KİŞİSEL VE İLETİŞİM",
          infoTitle: "Bilgilerim",
          infoHint: "Ad, telefon, adres, doğum tarihi ve dil",
          fullName: "Ad Soyad",
          phone: "Telefon",
          birthDate: "Doğum Tarihi",
          city: "Şehir",
          district: "İlçe",
          postalCode: "Posta Kodu",
          address: "Adres",
          language: "Dil",
          localeTr: "Türkçe",
          localeEn: "English",
          localeDe: "Deutsch",
          localeKu: "Kurdî",
          localeAr: "العربية",
          marketing: "Kampanya ve fırsat bildirimlerini almak istiyorum.",
          cancel: "Vazgeç",
          saving: "Kaydediliyor...",
          saveInfo: "Bilgileri Kaydet",
          saveChanges: "Değişiklikleri Kaydet",
          securityKicker: "HESAP GÜVENLİĞİ",
          securityTitle: "Parola ve oturum",
          securityHint: "Güvenlik seçeneklerini yalnız ihtiyaç duyduğunuzda açın",
          securityTitleAlt: "Güvenlik ayarları",
          securityHintAlt: "Parola ve oturum güvenliği seçeneklerini yalnız ihtiyaç duyduğunuzda açın.",
          securityClose: "Güvenlik Ayarlarını Kapat",
          securityOpen: "Güvenlik Ayarlarını Aç",
          sessionKicker: "OTURUM",
          logout: "Çıkış Yap",
          loggingOut: "Çıkış yapılıyor...",
          logoutHint: "Bu cihazdaki müşteri oturumunu güvenli biçimde kapatır",
          msgSaved: "Profil bilgileriniz kaydedildi.",
          msgUpdated: "Profil bilgileriniz güncellendi.",
          errSave: "Profil bilgileriniz kaydedilemedi.",
          errSaveRetry: "Profil bilgileriniz kaydedilemedi. Lütfen tekrar deneyin.",
          msgAvatarUpdated: "Profil fotoğrafınız güncellendi.",
          errAvatarSize: "Profil fotoğrafı en fazla 2 MB olabilir.",
          errAvatarType: "JPEG, PNG veya WebP formatında bir fotoğraf seçin.",
          errAvatarUpdate: "Profil fotoğrafı güncellenemedi.",
          msgAvatarRemoved: "Profil fotoğrafınız kaldırıldı.",
          errAvatarRemove: "Profil fotoğrafı kaldırılamadı.",
          errLoad: "Profiliniz şu anda yüklenemedi.",
          errLoadRetry: "Profiliniz şu anda yüklenemedi. Lütfen tekrar deneyin.",
        },
        accountSecurity: {
          kicker: "HESAP GÜVENLİĞİ",
          title: "Parolanızı güvenle yönetin",
          subtitle: "Güçlü ve size özel bir parola belirleyerek hesabınızı koruyun. Parolanızı dilediğiniz zaman buradan yenileyebilirsiniz.",
          close: "Kapat",
          changePassword: "Parolayı Değiştir",
          newPassword: "Yeni parola",
          confirmPassword: "Yeni parola tekrar",
          hint: "En az 10 karakter, bir büyük harf, bir küçük harf ve bir rakam kullanın. Veri sızıntılarında görülen parolalar kabul edilmez. Daha önce başka hesaplarda kullandığınız parolaları tercih etmeyin.",
          saving: "Güncelleniyor…",
          save: "Yeni Parolayı Kaydet",
          errEmpty: "Yeni parola alanlarını doldurun.",
          errMismatch: "Yeni parolalar birbiriyle eşleşmiyor.",
          errSave: "Yeni parola kaydedilemedi.",
          msgUpdated: "Parolanız güvenli şekilde güncellendi.",
        },
        accountReferral: {
          kicker: "ARKADAŞINI DAVET ET",
          title: "Sen de kazan, arkadaşın da kazansın",
          subtitle: "Kişisel davet bağlantınızı paylaşın. Arkadaşınız uygun kiralama, araç satın alma veya tur işlemini tamamladığında ödüller hesabınıza işlenir.",
          summaryReady: "{n} başarılı davet, {points} puan kazanıldı",
          summaryIdle: "Kişisel davet kodunuzu ve ödüllerinizi görüntüleyin",
          loading: "Davet bilgileriniz hazırlanıyor...",
          codeLabel: "KİŞİSEL DAVET KODUNUZ",
          linkLabel: "Davet bağlantısı",
          linkAria: "Kişisel davet bağlantısı",
          copy: "Linki Kopyala",
          copyLong: "Davet Linkini Kopyala",
          share: "Paylaş",
          rental: "KİRALAMA",
          sale: "ARAÇ SATIŞI",
          tour: "TUR",
          pointsPlus: "+{n} puan",
          registered: "Kayıt olan",
          pending: "Bekleyen",
          rewarded: "Ödüllenen",
          pointsEarned: "Kazanılan puan",
          milestone: "{n} başarılı davet sonra +{bonus} bonus puan",
          milestoneNext: "Sonraki davet ödülü",
          campaigns: "Kampanyaları ve fırsatları gör",
          campaignsLong: "Kampanyalı Araçları ve Fırsatları Gör",
          empty: "Davet kodunuz şu anda hazırlanamadı. Bölümü kapatıp yeniden açarak tekrar deneyebilirsiniz.",
          errLink: "Davet bağlantısı hazırlanamadı.",
          errLinkLong: "Davet bağlantısı şu anda hazırlanamadı.",
          msgCopied: "Davet bağlantısı kopyalandı.",
          errCopy: "Bağlantı otomatik kopyalanamadı. Alandan seçerek kopyalayabilirsiniz.",
          errCopyLong: "Davet bağlantısı kopyalanamadı. Bağlantıyı alandan seçip kopyalayabilirsiniz.",
          shareTitle: "Alperler Rent A Car",
          shareText: "Alperler Rent A Car davet bağlantımla katıl.",
          shareTextLong: "Alperler Rent A Car davet bağlantımla katıl, uygun işlemlerde sen de avantaj kazan.",
          msgShareReady: "Davet bağlantısı paylaşım için hazırlandı.",
          errLoad: "Davet bilgileri şu anda yüklenemedi.",
          rewardsAria: "Davet ödülleri",
          inviteeCan: "Arkadaşınız +{n} puan alabilir.",
          inviteeCanDiscount: "Arkadaşınız +{n} puan ve {discount} davet avantajı alabilir.",
          stackOn: "Uygun kampanyalarda davet avantajı kampanyalı fiyatla birlikte kullanılabilir.",
          stackOff: "Davet avantajı ile kampanya indirimi aynı işlemde birlikte kullanılamaz.",
          settingsFail: "Davet programı ayarları şu anda yüklenemedi.",
          codeLoading: "Davet kodunuz hazırlanıyor. Profilinizi yenileyip tekrar deneyin.",
          percent: "%{n}",
          amountTl: "{n} TL",
        },
        accountCallback: {
          title: "Giriş tamamlanıyor",
          body: "Hesabınız güvenli şekilde hazırlanıyor…",
        },

        pageNotFound: {
          title: "Sayfa Bulunamadı",
          body: "Aradığınız sayfaya ulaşılamıyor. URL'yi yanlış yazmış olabilirsiniz veya sayfa kaldırılmış olabilir.",
          home: "Ana Sayfaya Dön",
        },
        contactEntry: {
          redirecting: "Rezervasyon ekranı açılıyor...",
        },
        runtimeStatus: {
          systemStatus: "Alperler Auto sistem durumu",
          checking: "Kontrol ediliyor…",
          recheck: "Durumu Yeniden Kontrol Et",
          readOnly: "Şu anda görüntüleme modu aktif. Rezervasyon ve yeni başvuru işlemleri kısa süreliğine durduruldu.",
        },
        bookingSuccess: {
          eyebrow: "TALEBİNİZ ALINDI",
          title: "Talebiniz başarıyla gönderildi",
          body: "Talebinizi oluşturduğunuz için teşekkür ederiz. Ekibimiz bilgilerinizi inceleyerek en kısa süre içerisinde sizinle iletişime geçecektir.",
          reference: "Referans numaranız",
          accountNoteLoggedIn: "Talebinizin güncel durumunu Hesabım bölümünden takip edebilir, uygun işlemleri hesabınızdan iptal edebilirsiniz.",
          accountNoteGuest: "Bir sonraki işlemlerinizde taleplerinizi hesabınızdan takip etmek için müşteri hesabınızla giriş yapabilirsiniz.",
          trackAccount: "Hesabımda Takip Et",
          home: "Ana Sayfaya Dön",
        },
        iyzicoBuyer: {
          title: "iyzico ödeme bilgileri",
          intro: "iyzico, ödeme güvenliği ve yasal ödeme kaydı için bu bilgileri ister. Kart bilgileriniz Alperler Rent A Car sistemine gelmez.",
          identity: "Kimlik / pasaport numarası",
          billingAddress: "Fatura adresi",
          city: "Şehir",
          country: "Ülke",
          zipCode: "Posta kodu",
          cancel: "Vazgeç",
          continue: "Ödemeye Devam Et",
          privacy: "Bu alanlar ödeme oturumu oluşturulurken iyzico’ya aktarılır. Uygulamanın ödeme işlem geçmişine kimlik veya açık adres kopyası yazılmaz.",
          error: "iyzico için kimlik/pasaport numarası, fatura adresi, şehir, ülke ve posta kodunu tamamlayın.",
          defaultCountry: "Türkiye",
        },
        tourFavorite: {
          removeAria: "Turu favorilerden çıkar",
          addAria: "Turu favorilere ekle",
          active: "Favoride",
          add: "Favoriye Ekle",
          added: "Tur favorilerinize eklendi.",
          removed: "Tur favorilerinizden çıkarıldı.",
          fail: "Favori işlemi şu anda tamamlanamadı.",
          fallbackTitle: "Tur",
          pricePerPerson: "{price} TL / kişi",
        },
        carCarousel: {
          zoomAria: "{alt} görselini büyüt",
          prevAria: "Önceki görsel",
          nextAria: "Sonraki görsel",
          selectAria: "Görsel seçimi",
          goToAria: "{n}. görsele git",
          fullscreenAria: "{alt} tam ekran galerisi",
          imageCountLive: "{current} / {total} görsel",
          closeAria: "Galeriyi kapat",
          thumbsAria: "Galeri küçük görselleri",
          showAria: "{n}. görseli göster",
          thumbAlt: "{n}. küçük görsel",
          defaultAlt: "Araç görseli",
        },
        lightbox: {
          closeAria: "Kapat",
          prevAria: "Önceki Görsel",
          nextAria: "Sonraki Görsel",
          keyboardHint: "Klavye ok tuşlarını kullanabilirsiniz",
        },
        catalogCampaign: {
          sectionAria: "Bu içerikte kullanılan kampanya",
          badgeFallback: "KAMPANYA",
          eyebrow: "AKTİF KAMPANYA",
          benefitsAria: "Kampanya avantajları",
          proofActive: "{n} kişi son 15 dakikada inceledi",
          proofDay: "{n} kişi son 24 saatte inceledi",
          proofTotal: "{n} kişi inceledi",
          proofViews: "{n} görüntülenme",
          proofNew: "Yeni kampanya",
          savings: "{amount} avantaj",
          campaignPrice: "Kampanya fiyatı",
          priceAdvantage: "fiyat avantajı",
          discountPct: "%{n} İNDİRİM",
          advantagePct: "%{n} AVANTAJ",
          ended: "Süre doldu",
          daysLeft: "{n} gün kaldı",
          oneDayLeft: "1 gün kaldı",
          hoursLeft: "{n} saat kaldı",
        },
        catalogVideo: {
          kicker: "Gerçek yolculuk görüntüleri",
          title: "Video Galerisi",
          subtitle: "Aracı veya turu gerçek karelerle görün; içiniz rahat karar verin.",
          count: "{n} video",
          videoFallback: "Video",
          itemFallback: "Araç / tur videosu",
          sourceFallback: "Kaynak",
        },
        vehicleListItem: {
          discount: "%{n} İNDİRİM",
          deal: "FIRSAT",
          specsAria: "Araç özellikleri",
          seats: "{n} kişi",
          km: "{n} km",
          hourlyRentable: "Saatlik kiralanabilir",
          inspect: "Aracı İncele",
          perHour: "/ saat",
          perDay: "/ gün",
          fallbackTitle: "Araç",
          locationFallback: "Konum için aracı inceleyin",
          saleDescFallback: "Kilometre, ekspertiz, hasar geçmişi ve satış koşullarını araç detayında inceleyin.",
          ariaRental: "kiralık araç",
          ariaSale: "satılık araç",
          ariaKm: "{n} kilometre",
          unitHourly: " saatlik",
          unitDaily: " günlük",
          aria: "{title}, {type}{details}, fiyat {price} Türk lirası{unit}. Aracı incele",
        },
        expertiseGraphic: {
          ariaLabel: "Araç parça bazlı ekspertiz görünümü",
          frontBumper: "Ön tampon",
          hood: "Kaput",
          frontLeftFender: "Sol ön ç.",
          frontRightFender: "Sağ ön ç.",
          frontLeftDoor: "Sol ön",
          frontRightDoor: "Sağ ön",
          roof: "Tavan",
          rearLeftDoor: "Sol arka",
          rearRightDoor: "Sağ arka",
          rearLeftFender: "Sol arka ç.",
          rearRightFender: "Sağ arka ç.",
          trunk: "Bagaj",
          rearBumper: "Arka tampon",
          original: "Orijinal",
          localPainted: "Lokal boyalı",
          painted: "Boyalı",
          changed: "Değişen",
          unknown: "Bilgi yok",
        },
        branchDirectory: {
          networkKicker: "Alperler Auto Şube Ağı",
          title: "Size en uygun Alperler noktasını kolayca bulun.",
          subtitle: "Şubelerin hizmetlerini, iletişim bilgilerini ve bölgesel seçeneklerini karşılaştırın. Kiralama, satış ve tur ihtiyaçlarınız için size en yakın noktayı seçin.",
          searchAria: "Şube ara",
          searchPlaceholder: "İşletme, il, ilçe veya hizmet ara…",
          marketplaceCta: "İl / İlçeye Göre Araç ve Tur Ara",
          loading: "Şubeler hazırlanıyor…",
          errorTitle: "Şubelere şu anda ulaşılamıyor",
          errorCopy: "Şube bilgileri geçici olarak görüntülenemiyor. Biraz sonra yeniden deneyebilirsiniz.",
          retry: "Tekrar Dene",
          heroAlt: "{name} şube kapak fotoğrafı",
          imageSoon: "Şube görseli yakında eklenecek",
          verified: "Doğrulanmış İşletme",
          inspect: "Şubeyi İncele",
          detailsSoon: "Detaylar yakında",
          call: "Ara",
          noPhone: "Telefon yok",
          emptyTitle: "Aramanıza uyan şube yok",
          emptyHint: "İl, ilçe veya hizmet deneyin; size en yakın noktayı hızla bulun.",
          networkFranchise: "Yetkili İş Ortağı",
          networkPartner: "Bölgesel Partner",
          networkCentral: "Merkez Şubesi",
          serviceRental: "Kiralama",
          serviceSales: "Satış",
          serviceTour: "Tur",
          serviceTransfer: "Transfer",
          servicePickup: "Teslim",
          serviceReturn: "İade",
          branchFallback: "Şube",
        },
        branchDetail: {
          backAria: "Şube detayından geri dön",
          networkKicker: "Alperler Auto Şube Ağı",
          branchFallback: "Şube",
          loading: "Şube bilgileri hazırlanıyor…",
          errorTitle: "Şube şu anda görüntülenemiyor",
          errorCopy: "Şube bilgilerine geçici olarak ulaşılamıyor. Diğer Alperler noktalarını inceleyebilir veya biraz sonra yeniden deneyebilirsiniz.",
          backToBranches: "Tüm Şubelere Dön",
          verified: "Doğrulanmış İşletme",
          legalBusiness: "Yasal işletme: {name}",
          defaultDescription: "Bu şubedeki araç ve turlar Alperler hizmet standartlarıyla sunulur.",
          callBranch: "Şubeyi Ara",
          whatsapp: "WhatsApp",
          openMap: "Haritada Aç",
          summary: "Şube Özeti",
          statRental: "Kiralık",
          statSale: "Satılık",
          statTour: "Tur",
          address: "Adres:",
          email: "E-posta:",
          territory: "Hizmet bölgesi:",
          socialAccounts: "Sosyal hesaplar",
          coverAlt: "{name} kapak fotoğrafı",
          mediaKicker: "Şubeyi Yakından Tanıyın",
          mediaTitle: "Fotoğraf ve Videolar",
          hoursTitle: "Çalışma Saatleri",
          guaranteeTitle: "Müşteri Güvencesi",
          guaranteeOn: "Hizmetler Alperler müşteri standartlarıyla sunulur.",
          guaranteeOff: "İşlem koşulları size açık ve anlaşılır biçimde gösterilir.",
          pricingTitle: "Şeffaf Fiyatlandırma",
          pricingOn: "Fiyatlar açık, anlaşılır ve tutarlı biçimde sunulur.",
          pricingOff: "Fiyatlar ilan üzerinde açıkça gösterilir.",
          qualityTitle: "Kalite Kontrolü",
          qualityOn: "Araç ve tur seçenekleri kalite standartlarına göre incelenir.",
          qualityOff: "İlanlar Alperler hizmet standartlarıyla sunulur.",
          rentalsKicker: "Kiralık",
          rentalsTitle: "Bu Şubenin Kiralık Araçları",
          rentalsCount: "{n} araç",
          salesKicker: "Satılık",
          salesTitle: "Bu Şubenin Satılık Araçları",
          salesCount: "{n} araç",
          toursKicker: "Tur ve Deneyimler",
          toursTitle: "Bu Şubenin Turları",
          toursCount: "{n} tur",
          perDay: "₺ / gün",
          perPerson: "₺ / kişi",
          km: "km",
          transmissionFallback: "Şanzıman bilgisi",
          fuelFallback: "Yakıt bilgisi",
          durationFallback: "Süre bilgisi şubede",
          vehicleFallback: "Araç",
          tourFallback: "Tur",
          emptyTitle: "Henüz seçenek bulunmuyor",
          emptyHint: "Yeni araç ve turlar eklendikçe burada sizi karşılar — sık uğrayın.",
          networkFranchise: "Yetkili İş Ortağı",
          networkPartner: "Bölgesel Partner",
          networkCentral: "Merkez Şubesi",
          serviceRental: "Kiralama",
          serviceSales: "Satış",
          serviceTour: "Tur",
          serviceTransfer: "Transfer",
          servicePickup: "Teslim",
          serviceReturn: "İade",
        },
        branchMarketplace: {
          networkKicker: "Türkiye Geneli Alperler Şube Ağı",
          title: "İlinizi ve ilçenizi seçin, bölgenizdeki araçları ve turları keşfedin.",
          subtitle: "Konumunuza göre kiralık ve satılık araçları, turları ve hizmet veren şubeleri karşılaştırın. Her sonuçta hizmeti sunan işletme ve bölge bilgilerini açıkça görebilirsiniz.",
          province: "İl",
          provinceAria: "İl seçin",
          allProvinces: "Tüm iller",
          district: "İlçe",
          districtAria: "İlçe seçin",
          allDistricts: "Tüm ilçeler",
          lookingFor: "Ne arıyorsunuz?",
          kindAria: "İlan türü",
          kindAll: "Tümü",
          kindRental: "Kiralık",
          kindSale: "Satılık",
          kindTour: "Tur",
          kindListing: "İlan",
          search: "Sonuçları Getir",
          searching: "Aranıyor…",
          metricBranches: "Şube",
          metricRentals: "Kiralık",
          metricSales: "Satılık",
          metricTours: "Tur",
          detail: "Detay",
          viewBranch: "Şubeyi Gör",
          emptyTitle: "Bu konumda henüz seçenek yok",
          emptyHint: "Komşu ilçeyi deneyin veya tüm ili açın — uygun seçenek bir adım ötenizde.",
          geoError: "Konum seçenekleri şu anda hazırlanamadı.",
          searchError: "Arama şu anda tamamlanamadı. Lütfen tekrar deneyin.",
          tourFallback: "Tur",
          vehicleFallback: "Araç",
        },
        branchPlans: {
          networkKicker: "Alperler Auto Şube Ağı",
          title: "Sadece bir ilan sayfası değil, işletmenizin dijital satış ve rezervasyon altyapısı.",
          subtitle: "Kendi web sitesi, rezervasyon sistemi veya güçlü dijital vitrini olmayan yerel işletmeler için doğrulanmış şube profili, il ve ilçe bazlı bulunabilirlik, merkezi yayın altyapısı, bakım, güvenlik ve kampanya araçlarını tek yerde topluyoruz.",
          valueIdentityTitle: "Doğrulanmış kimlik",
          valueIdentityCopy: "Müşteri kiminle işlem yaptığını açıkça görür.",
          valueLocalTitle: "Yerel bulunabilirlik",
          valueLocalCopy: "İl ve ilçe seçildiğinde bölgenizdeki ilanlar görünür.",
          valueGrowthTitle: "Merkezi büyüme araçları",
          valueGrowthCopy: "Uygun paketlerde kampanya ve trafik yönlendirme altyapısı.",
          valueSecurityTitle: "Bakım ve güvenlik",
          valueSecurityCopy: "Teknik altyapı ve yayın kalite kontrolü merkezden yürütülür.",
          recommended: "ÖNERİLEN",
          perMonth: "ay",
          perYear: "yıl",
          applyCta: "Bu Paketle Başvur",
          whyTitle: "Abonelik ücreti neyin karşılığı?",
          whyCopy: "Şube yalnız “sitede görünmek” için ödeme yapmaz. Ücret, seçilen pakete göre doğrulanmış işletme profili, il/ilçe arama altyapısı, araç ve tur yayın sistemi, merkezi kalite onayı, teknik bakım, güvenlik, rezervasyon altyapısı, kampanya araçları ve trafik yönlendirme kapasitesini finanse eder. Böylece işletme ayrı bir yazılım ekibi kurmadan dijital kanala çıkabilir.",
          whyNote: "Paket özellikleri ve ücretleri Super Admin tarafından dinamik olarak değiştirilebilir. Reklam veya trafik desteği belirli bir satış/adet sonucu garantisi anlamına gelmez.",
          loadError: "Abonelik paketleri şu anda yüklenemiyor.",
        },
        branchPartner: {
          backToPlans: "← Paketleri ve avantajları gör",
          networkKicker: "Doğrulanmış şube ağı",
          title: "İşletmenizi Alperler Auto'nun yerel dijital satış kanalına taşıyın.",
          subtitle: "Başvurunuz ticari kimlik, yetkili, iletişim, hizmet kapasitesi ve bölge uygunluğu açısından incelenir. Onay tek başına canlı yayın hakkı vermez.",
          bullet1: "Ticari ve iletişim bilgileri merkezi ekip tarafından doğrulanır.",
          bullet2: "Şube oluşturulduğunda sözleşme, kimlik, adres, fiyat, güvenlik ve ödeme kontrolleri tamamlanır.",
          bullet3: "Paket ve abonelik aktif değilse yeni ilan yayın sürecine alınmaz.",
          bullet4: "Şube ilanları doğrudan yayınlanmaz, merkez kalite kontrolünden geçer.",
          bullet5: "Rezervasyon ve müşteri talepleri ilanı yöneten doğrulanmış şubeye bağlanır.",
          formTitle: "Bayilik / Şube Başvurusu",
          formHint: "Yıldızlı alanlar sözleşme ve uygunluk incelemesi için zorunludur.",
          successTitle: "Başvurunuz merkezi sisteme kaydedildi.",
          successReference: "Referans:",
          successNote: "İnceleme tamamlanmadan şube veya ilan yayına açılmaz.",
          sectionBusiness: "İşletme ve Yetkili",
          businessName: "İşletme / Ticari Unvan *",
          businessType: "İşletme Türü *",
          typeSole: "Şahıs işletmesi",
          typeLimited: "Limited şirket",
          typeJointStock: "Anonim şirket",
          typeCooperative: "Kooperatif",
          typeOther: "Diğer",
          fullName: "Yetkili Ad Soyad *",
          phone: "Telefon *",
          email: "E-posta *",
          website: "İşletme Web Sitesi",
          websitePlaceholder: "https://...",
          sectionVerification: "Ticari Doğrulama",
          verificationNote: "Kimlik belgesi ve banka bilgisi bu açık formda alınmaz. Bunlar onay sonrası güvenli şube kurulumunda doğrulanır.",
          taxOffice: "Vergi Dairesi *",
          taxNumber: "Vergi / T.C. Vergi Numarası *",
          tradeRegistryNo: "Ticaret Sicil No",
          mersisNo: "MERSİS No",
          mersisPlaceholder: "Varsa 16 hane",
          businessAddress: "İşletme Adresi *",
          sectionOps: "Bölge ve Operasyon",
          province: "İl *",
          provinceAria: "Şube ili",
          provinceSelect: "İl seçin",
          district: "İlçe *",
          districtAria: "Şube ilçesi",
          districtSelect: "İlçe seçin",
          operatingArea: "Hedef Çalışma Bölgesi",
          operatingAreaPlaceholder: "Mahalle, havalimanı, çevre ilçeler...",
          experienceYears: "Otomotiv Deneyimi",
          officeStatus: "Ofis Durumu *",
          officeOwn: "Kendi yerim var",
          officeRent: "Kiralanmış yerim var",
          officePlan: "Yer açmayı planlıyorum",
          officeNone: "Şimdilik ofis yok",
          currentFleet: "Mevcut Araç Sayısı *",
          plannedFleet: "Planlanan Araç Sayısı *",
          listingModel: "İlan Modeli *",
          listingOwn: "Kendi filom",
          listingNetwork: "Bölgesel ağ",
          listingBoth: "Kendi filo + bölgesel ağ",
          budgetRange: "Başlangıç Bütçesi",
          budgetDiscuss: "Görüşmede netleşsin",
          budgetUnder100k: "100.000 TL altı",
          budget100k250k: "100.000 - 250.000 TL",
          budget250k500k: "250.000 - 500.000 TL",
          budget500kPlus: "500.000 TL üzeri",
          servicesLegend: "Sunacağınız Hizmetler *",
          serviceRental: "Araç kiralama",
          serviceSales: "İkinci el satış",
          serviceTour: "Tur / transfer",
          sectionExtra: "Ek Bilgi ve Onaylar",
          notes: "Ek Bilgi",
          consentAccuracy: "Verdiğim işletme, yetkili ve iletişim bilgilerinin doğru olduğunu kabul ediyorum.",
          consentPrivacy: "Başvuru bilgilerimin değerlendirme, iletişim ve şube doğrulama amacıyla işlenmesini kabul ediyorum.",
          consentDueDiligence: "Alperler Auto'nun başvuruyu onaylamadan önce ticari kayıt, yetkili, adres, araç sahipliği, marka standardı ve gerekli diğer uygunluk kontrollerini yapabileceğini kabul ediyorum.",
          submit: "Başvuruyu Güvenli Şekilde Gönder",
          submitting: "Başvuru kaydediliyor…",
          geoLoadError: "Türkiye il/ilçe dizini yüklenemedi.",
          errRateLimited: "Çok fazla başvuru denemesi yapıldı. Lütfen daha sonra tekrar deneyin.",
          errDueDiligence: "Ticari doğrulama alanlarını ve üç onayı kontrol edin.",
          errRequired: "Zorunlu başvuru alanlarını kontrol edin.",
          errGeneric: "Başvuru kaydedilemedi. Bilgileriniz değiştirilmedi.",
        },
        layoutTitles: {
          fleet: "Kiralık Araçlar",
          sales: "Satılık Araçlar",
          blog: "Blog & Haberler",
          tours: "Turlar",
          listYourCar: "Arabanı Değerlendir",
          contact: "İletişim",
          about: "Hakkımızda",
          legal: "Kurumsal",
          appointment: "Randevu Talebi",
          faq: "S.S.S.",
          home: "Alperler Rent A Car",
        },
    }
  };

  /** Loaded non-TR packs; signal so translations() recomputes when a pack arrives. */
  private localePacks = signal<Partial<Record<Language, any>>>({});
  private localeLoadInflight = new Map<Language, Promise<void>>();

  private async ensureLocaleLoaded(lang: Language): Promise<void> {
    if (lang === "TR") return;
    if (this.dictionary[lang] || this.localePacks()[lang]) return;
    const existing = this.localeLoadInflight.get(lang);
    if (existing) return existing;

    const load = (async () => {
      try {
        const pack = await this.importLocalePack(lang);
        if (!pack) return;
        this.localePacks.update((prev) =>
          prev[lang] ? prev : { ...prev, [lang]: pack },
        );
      } catch (err) {
        console.warn(`[UiService] Failed to load locale pack ${lang}`, err);
      } finally {
        this.localeLoadInflight.delete(lang);
      }
    })();

    this.localeLoadInflight.set(lang, load);
    return load;
  }

  private importLocalePack(lang: Language): Promise<any> {
    switch (lang) {
      case "EN":
        return import("../i18n/en").then((m) => m.default);
      case "DE":
        return import("../i18n/de").then((m) => m.default);
      case "FR":
        return import("../i18n/fr").then((m) => m.default);
      case "ES":
        return import("../i18n/es").then((m) => m.default);
      case "RU":
        return import("../i18n/ru").then((m) => m.default);
      case "KU":
        return import("../i18n/ku").then((m) => m.default);
      case "ZH":
        return import("../i18n/zh").then((m) => m.default);
      case "AR":
        return import("../i18n/ar").then((m) => m.default);
      default:
        return Promise.resolve(null);
    }
  }



  /** Public footer link label by linkKey. Prefer UiService packs; admin/DB TR only for TR or unknown custom keys. */
  publicFooterLinkLabel(linkKey: string, fallback: string): string {
    const t = this.translations() as any;
    const key = String(linkKey || "").trim().toLowerCase();
    if (!key) return fallback;
    const links = t?.footer?.links || {};
    const nav = t?.nav || {};
    const map: Record<string, unknown> = {
      "services.rentals": links.rentals || nav.fleet,
      "services.sales": links.sales || nav.sales,
      "services.valuation": links.valuation || nav.earn,
      "services.tours": links.tours || nav.tours,
      "services.campaigns": links.campaigns || nav.campaigns,
      "services.branches": links.branches || nav.branches,
      "services.appointment": links.appointment || nav.appointment,
      "corporate.about": links.about || nav.about,
      "corporate.blog": links.blog || nav.blog,
      "corporate.contact": links.contact || nav.contact,
      "corporate.faq": links.faq || nav.faq,
      "corporate.branch_partner": links.branchPartner || nav.branchPartner,
      "corporate.feedback": links.feedback || t?.footer?.feedbackBtn,
      "bottom.feedback": links.feedback || t?.footer?.feedbackBtn,
      "legal.rental": links.rental || links.terms,
      "legal.insurance": links.insurance,
      "legal.cancellation": links.cancellation,
      "legal.kvkk": links.kvkk,
      "legal.privacy": links.privacy,
      "legal.sales": links.salesTerms,
      "legal.tour": links.tour,
      "legal.partner": links.partner,
      "legal.branch": links.branch,
      "legal.commercial": links.commercial,
      "legal.terms": links.termsGeneral || links.terms,
      "legal.cookies": links.cookies,
      "legal.distance-selling": links.distanceSelling,
      "bottom.admin": links.admin,
    };
    const mapped = map[key];
    if (typeof mapped === "string" && mapped.trim()) return mapped.trim();
    return fallback;
  }

  /** Footer chrome labels that admins often leave in TR — pack wins when lang !== TR. */
  publicFooterSetting(
    packKey:
      | "brandSummary"
      | "legalMoreLabel"
      | "phoneLabel"
      | "whatsappLabel"
      | "copyrightSuffix"
      | "homeLabel"
      | "contactLabel"
      | "footerText",
    adminValue: string,
  ): string {
    const pack = String((this.translations() as any)?.footer?.[packKey] || "").trim();
    const admin = String(adminValue || "").trim();
    if (this.currentLang() !== "TR" && pack) return pack;
    return admin || pack;
  }

  /** Public chrome label for nav/dock itemKey. Prefer UiService packs; admin/DB TR only for TR or unknown custom keys. */
  publicNavLabel(itemKey: string, fallback: string, surface: "MOBILE_MENU" | "MOBILE_DOCK" = "MOBILE_MENU"): string {
    const t = this.translations() as any;
    const key = String(itemKey || "").trim();
    if (!key) return fallback;
    if (surface === "MOBILE_DOCK") {
      const dockLabel = t?.dock?.items?.[key];
      if (typeof dockLabel === "string" && dockLabel.trim()) return dockLabel.trim();
    }
    const nav = t?.nav || {};
    const map: Record<string, unknown> = {
      home: nav.home,
      fleet: surface === "MOBILE_DOCK" ? (nav.fleetShort || nav.fleet) : nav.fleet,
      sales: surface === "MOBILE_DOCK" ? (nav.salesShort || nav.sales) : nav.sales,
      tours: nav.tours,
      earn: nav.earn,
      "list-car": nav.earn,
      about: nav.about,
      contact: nav.contact,
      blog: nav.blog,
      corporate: nav.corporate,
      campaigns: surface === "MOBILE_DOCK" ? (nav.campaignsShort || nav.campaigns) : nav.campaigns,
      appointment: nav.appointment,
      branches: nav.branches,
      "branch-partner": nav.branchPartner,
      search: nav.search,
      account: nav.account,
      faq: nav.faq,
      legal: nav.legal,
    };
    const mapped = map[key];
    if (typeof mapped === "string" && mapped.trim()) return mapped.trim();
    // Non-TR: do not invent pack strings for freeform admin labels; keep admin fallback only when no pack key exists.
    return fallback;
  }

  /** Homepage section chrome: when lang!==TR prefer UiService keys over admin TR leftovers. */
  publicSectionChrome(
    sectionKey: string,
    sectionType: string,
    kind: "title" | "badge" | "description" | "cta",
    adminValue: string,
    category?: string,
  ): string {
    const lang = this.currentLang();
    const t = this.translations() as any;
    const hs = t?.homeSection || {};
    const byKey = hs?.sections?.[sectionKey];
    let typeKey = String(sectionType || "").toUpperCase();
    if (typeKey === "VEHICLES") {
      typeKey = String(category || "").toUpperCase() === "SALE" ? "VEHICLES_SALE" : "VEHICLES_RENTAL";
    }
    const byType = hs?.byType?.[typeKey];
    const fromKey = byKey && typeof byKey[kind] === "string" ? String(byKey[kind]).trim() : "";
    const fromType = byType && typeof byType[kind] === "string" ? String(byType[kind]).trim() : "";
    const packValue = fromKey || fromType;
    const admin = String(adminValue || "").trim();
    if (lang !== "TR") {
      if (packValue) return packValue;
      return admin; // unknown custom chrome without pack key
    }
    // TR: prefer operator title when present; otherwise durable pack defaults so remounts never blank vitrin chrome.
    return admin || packValue;
  }

  /**
   * Homepage / promo CTA label. Non-TR prefers pack `sections.*.cta` (or known TR→pack maps).
   * Never leave admin Turkish leftovers like "Rezervasyon Oluştur" when lang ≠ TR.
   */
  publicSectionCta(
    sectionKey: string,
    sectionType: string,
    adminValue: string,
    category?: string,
    fallbackPack?: string,
  ): string {
    const lang = this.currentLang();
    const admin = String(adminValue || "").trim();
    const packFallback = String(fallbackPack || "").trim();
    const fromChrome = this.publicSectionChrome(sectionKey, sectionType, "cta", "", category);
    if (lang === "TR") return admin || fromChrome || packFallback;

    if (fromChrome) return fromChrome;
    if (packFallback) return packFallback;

    const t = this.translations() as any;
    if (/^Rezervasyon\s+Oluştur$/i.test(admin) || /^Rezervasyon\s+Olustur$/i.test(admin)) {
      return String(t?.checkout?.createBooking || "").trim() || admin;
    }
    if (/^Randevu\s+Oluştur$/i.test(admin) || /^Randevu\s+Olustur$/i.test(admin)) {
      return String(t?.prefooter?.secondaryLabel || t?.nav?.appointment || "").trim() || admin;
    }
    if (/^Aracımı\s+Değerlendir$/i.test(admin) || /^Aracimi\s+Degerlendir$/i.test(admin)) {
      return String(t?.homeSection?.partnerCtaFallback || "").trim() || admin;
    }
    // Unknown custom CTA without pack: keep admin (operator-authored) rather than inventing copy.
    return admin;
  }

  /** Prefooter chrome: admin TR stays live only for TR; other langs use UiService. */
  publicPrefooterChrome(): {
    badge: string;
    title: string;
    description: string;
    primaryLabel: string;
    secondaryLabel: string;
    trustItems: string[];
  } {
    const t = this.translations() as any;
    const pf = t?.prefooter || {};
    const packTrust = Array.isArray(pf.trustItems) ? pf.trustItems.map(String).filter(Boolean) : [];
    return {
      badge: String(pf.badge || ""),
      title: String(pf.title || ""),
      description: String(pf.description || ""),
      primaryLabel: String(pf.primaryLabel || ""),
      secondaryLabel: String(pf.secondaryLabel || ""),
      trustItems: packTrust,
    };
  }

  private carService = inject(CarService);

  translations = computed(() => {
    // Deep clone TR first so admin homeContent can live-update the TR base.
    // Other locales merge over that base: pack keys win; missing keys fall back
    // to latest admin-overridden TR (then dictionary TR). Never machine-translate admin copy.
    // Read localePacks() so this recomputes when a lazy pack finishes loading.
    const packs = this.localePacks();
    const lang = this.currentLang();
    const trBase = JSON.parse(JSON.stringify(this.dictionary.TR || {}));
    const configSignal = this.carService.getConfig();
    const config = configSignal();
    const homeContent = config.homeContent;
    if (homeContent) this.applyAdminHomeContent(trBase, homeContent);

    if (lang === "TR") return trBase;
    const selectedPack = packs[lang] || this.dictionary[lang] || {};
    const selected = JSON.parse(JSON.stringify(selectedPack));
    return mergeTranslationObjects(trBase, selected);
  });

  /** Apply admin homeContent onto a TR dictionary clone (live TR source for fallbacks). */
  private applyAdminHomeContent(base: any, homeContent: Record<string, any>): void {
    if (!base.hero) base.hero = {};
    if (!base.home) base.home = {};
    if (!base.home.booking) base.home.booking = {};
    if (!base.home.featured) base.home.featured = {};
    if (!base.home.sales) base.home.sales = {};
    if (!base.home.whyUs) base.home.whyUs = { features: { trust: {}, support: {}, comfort: {} } };
    if (!base.home.whyUs.features) base.home.whyUs.features = { trust: {}, support: {}, comfort: {} };
    if (!base.home.partner) base.home.partner = { requirements: {}, form: {} };
    if (!base.home.campaigns) base.home.campaigns = {};
    if (!base.home.tours) base.home.tours = {};
    if (!base.homePage) base.homePage = {};
    const hp = base.homePage;

    const set = (obj: any, key: string, value: unknown) => {
      if (typeof value === "string" && value.trim()) obj[key] = value;
    };

    set(base.hero, "title", homeContent.heroTitle);
    set(base.hero, "subtitle", homeContent.heroSubtitle);
    set(base.hero, "trustLine", homeContent.heroTrustLine);
    set(base.hero, "ctaSubtext", homeContent.heroCtaSubtext);
    set(base.hero, "cta", homeContent.heroCta);

    set(base.home.booking, "title", homeContent.bookingTitle);
    set(base.home.featured, "badge", homeContent.featuredBadge);
    set(base.home.featured, "title", homeContent.featuredTitle);
    set(base.home.featured, "subtitle", homeContent.featuredSubtitle);
    set(base.home.featured, "viewAll", homeContent.featuredViewAll);
    set(base.home.sales, "badge", homeContent.salesBadge);
    set(base.home.sales, "title", homeContent.salesTitle);
    set(base.home.sales, "description", homeContent.salesDescription);
    set(base.home.sales, "viewAll", homeContent.salesViewAll);
    set(base.home.whyUs, "title", homeContent.whyUsTitle);
    set(base.home.whyUs, "subtitle", homeContent.whyUsSubtitle);
    if (!base.home.whyUs.features.trust) base.home.whyUs.features.trust = {};
    if (!base.home.whyUs.features.support) base.home.whyUs.features.support = {};
    if (!base.home.whyUs.features.comfort) base.home.whyUs.features.comfort = {};
    set(base.home.whyUs.features.trust, "title", homeContent.whyUsTrustTitle);
    set(base.home.whyUs.features.trust, "desc", homeContent.whyUsTrustDesc);
    set(base.home.whyUs.features.support, "title", homeContent.whyUsSupportTitle);
    set(base.home.whyUs.features.support, "desc", homeContent.whyUsSupportDesc);
    set(base.home.whyUs.features.comfort, "title", homeContent.whyUsComfortTitle);
    set(base.home.whyUs.features.comfort, "desc", homeContent.whyUsComfortDesc);
    if (!base.home.partner.requirements) base.home.partner.requirements = {};
    if (!base.home.partner.form) base.home.partner.form = {};
    set(base.home.partner, "title", homeContent.partnerTitle);
    set(base.home.partner, "subtitle", homeContent.partnerSubtitle);
    set(base.home.partner.requirements, "title", homeContent.partnerReqTitle);
    set(base.home.partner.form, "title", homeContent.partnerFormTitle);
    set(base.home.campaigns, "early", homeContent.campaignsEarly);
    set(base.home.campaigns, "roadside", homeContent.campaignsRoadside);
    set(base.home.campaigns, "free", homeContent.campaignsFree);
    set(base.home.campaigns, "delivery", homeContent.campaignsDelivery);
    set(base.home.tours, "title", homeContent.toursTitle);
    set(base.home.tours, "subtitle", homeContent.toursSubtitle);
    set(base.home.tours, "viewAll", homeContent.toursViewAll);
    set(base.home.tours, "bookBtn", homeContent.toursBookBtn);

    // Homepage chrome (home-v71) — admin strings stay live on TR and as fallback for missing pack keys.
    set(hp, "trustLine", homeContent.heroTrustLine);
    set(hp, "title", homeContent.heroTitle);
    set(hp, "subtitle", homeContent.heroSubtitle);
    set(hp, "searchPlaceholder", homeContent.searchPlaceholder);
    set(hp, "searchButton", homeContent.searchButtonLabel);
    set(hp, "trustPrice", homeContent.trustPrice);
    set(hp, "trustSupport", homeContent.trustSupport);
    set(hp, "trustVerified", homeContent.trustVerified);
    set(hp, "plannerKicker", homeContent.plannerKicker);
    set(hp, "bookingTitle", homeContent.bookingTitle);
    set(hp, "bookingSubtitle", homeContent.bookingSubtitle);
    set(hp, "serviceLabel", homeContent.plannerServiceLabel);
    set(hp, "serviceIndividual", homeContent.plannerServiceIndividual);
    set(hp, "serviceDriver", homeContent.plannerServiceDriver);
    set(hp, "serviceWedding", homeContent.plannerServiceWedding);
    set(hp, "serviceTour", homeContent.plannerServiceTour);
    set(hp, "pickupLabel", homeContent.plannerPickupLabel);
    set(hp, "pickupPlaceholder", homeContent.plannerPickupPlaceholder);
    set(hp, "durationLabel", homeContent.plannerDurationLabel);
    set(hp, "tourDateLabel", homeContent.plannerTourDateLabel);
    set(hp, "hourlyDateLabel", homeContent.plannerHourlyDateLabel);
    set(hp, "startDateLabel", homeContent.plannerStartDateLabel);
    set(hp, "endDateLabel", homeContent.plannerEndDateLabel);
    set(hp, "startTimeLabel", homeContent.plannerStartTimeLabel);
    set(hp, "endTimeLabel", homeContent.plannerEndTimeLabel);
    set(hp, "plannerNote", homeContent.plannerNote);
    set(hp, "loading", homeContent.plannerLoadingText);
    set(hp, "errorTourDate", homeContent.plannerErrorTourDate);
    set(hp, "errorStartDate", homeContent.plannerErrorStartDate);
    set(hp, "errorEndDate", homeContent.plannerErrorEndDate);
    set(hp, "errorDateOrder", homeContent.plannerErrorDateOrder);
    set(hp, "errorPickup", homeContent.plannerErrorPickup);
    set(hp, "errorTimeOrder", homeContent.plannerErrorTimeOrder);
    set(hp, "errorHourlyLimit", homeContent.plannerErrorHourlyLimit);
    set(hp, "buttonTour", homeContent.plannerButtonTour);
    set(hp, "buttonHourly", homeContent.plannerButtonHourly);
    set(hp, "buttonDriver", homeContent.plannerButtonDriver);
    set(hp, "buttonWedding", homeContent.plannerButtonWedding);
    set(hp, "buttonRental", homeContent.plannerButtonRental);

    const serviceKey: Record<string, string> = {
      individual: "serviceIndividual",
      driver: "serviceDriver",
      wedding: "serviceWedding",
      tour: "serviceTour",
    };
    if (Array.isArray(homeContent.plannerServiceOptions)) {
      for (const row of homeContent.plannerServiceOptions) {
        const key = serviceKey[String(row?.value || "")];
        if (key) set(hp, key, row?.label);
      }
    }
    const durationKey: Record<string, string> = {
      hourly: "durationHourly",
      daily: "durationDaily",
      weekly: "durationWeekly",
      monthly: "durationMonthly",
      longterm: "durationLongterm",
    };
    if (Array.isArray(homeContent.plannerDurationOptions)) {
      for (const row of homeContent.plannerDurationOptions) {
        const key = durationKey[String(row?.value || "")];
        if (key) set(hp, key, row?.label);
      }
    }
  }
}
