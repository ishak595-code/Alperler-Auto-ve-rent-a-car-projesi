import { getAppUrl } from "./integration-config";
import type { ServerBookingRecord } from "./firestore-rest";

export type BookingNotificationEvent =
  | "booking_created"
  | "booking_pending"
  | "booking_approved"
  | "booking_rejected"
  | "booking_completed"
  | "booking_cancelled";

interface BrandingConfig {
  name: string;
  phone: string;
  email: string;
  address: string;
  website: string;
  instagram: string;
  facebook: string;
  tiktok: string;
  youtube: string;
}

export interface BookingNotificationTemplate {
  customerSubject: string;
  customerText: string;
  customerHtml: string;
  customerSms: string;
  adminSubject: string;
  adminText: string;
  adminHtml: string;
}

function env(name: string, fallback = ""): string {
  return process.env[name]?.trim() || fallback;
}

function branding(): BrandingConfig {
  return {
    name: env("BUSINESS_NAME", "Alperler Auto"),
    phone: env("BUSINESS_PHONE", "0537 959 48 51"),
    email: env("BUSINESS_EMAIL", "alperlerauto@gmail.com"),
    address: env("BUSINESS_ADDRESS", "Hakkari Yüksekova Merkez"),
    website: env("BUSINESS_WEBSITE", getAppUrl() || ""),
    instagram: env("BUSINESS_INSTAGRAM_URL"),
    facebook: env("BUSINESS_FACEBOOK_URL"),
    tiktok: env("BUSINESS_TIKTOK_URL"),
    youtube: env("BUSINESS_YOUTUBE_URL"),
  };
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function humanType(type: ServerBookingRecord["type"]): string {
  switch (type) {
    case "RENTAL":
      return "Araç Kiralama";
    case "TOUR":
      return "Tur Rezervasyonu";
    case "SALE_INQUIRY":
      return "Araç Satın Alma Talebi";
    case "APPOINTMENT":
      return "Randevu Talebi";
  }
}

function actionNoun(type: ServerBookingRecord["type"]): string {
  switch (type) {
    case "RENTAL":
      return "rezervasyonunuz";
    case "TOUR":
      return "tur rezervasyonunuz";
    case "SALE_INQUIRY":
      return "satın alma talebiniz";
    case "APPOINTMENT":
      return "randevu talebiniz";
  }
}

function statusCopy(
  event: BookingNotificationEvent,
  booking: ServerBookingRecord,
): { title: string; lead: string; nextStep: string; accent: string } {
  const noun = actionNoun(booking.type);
  switch (event) {
    case "booking_created":
      return {
        title: `${humanType(booking.type)} Alındı`,
        lead: `${noun.charAt(0).toUpperCase()}${noun.slice(1)} sistemimize başarıyla ulaştı. Bu mesaj talebinizin kaydedildiğini doğrular; kesin onay ayrıca bildirilecektir.`,
        nextStep: "Ekibimiz talebinizi kontrol edecek. Onay veya gerekli ek bilgi olması halinde size e-posta ve/veya SMS ile bilgi vereceğiz.",
        accent: "#0369a1",
      };
    case "booking_pending":
      return {
        title: `${humanType(booking.type)} İncelemede`,
        lead: `${noun.charAt(0).toUpperCase()}${noun.slice(1)} yeniden değerlendirme aşamasına alındı.`,
        nextStep: "İnceleme tamamlandığında güncel durum tarafınıza ayrıca bildirilecektir.",
        accent: "#a16207",
      };
    case "booking_approved":
      return {
        title: `${humanType(booking.type)} Onaylandı`,
        lead: `İyi haber, ${noun} onaylandı. Aşağıdaki bilgiler kayıtlarımızdaki güncel detaylardır.`,
        nextStep: booking.type === "APPOINTMENT"
          ? "Belirtilen tarih ve saatte hazır olmanızı rica ederiz. Değişiklik gerekiyorsa iletişim bilgilerimizden bize ulaşabilirsiniz."
          : "Teslim, ödeme veya buluşma için ek işlem gerekiyorsa ekibimiz sizinle iletişime geçecektir.",
        accent: "#047857",
      };
    case "booking_rejected":
      return {
        title: `${humanType(booking.type)} Sonuçlandı`,
        lead: `Talebinizi inceledik. Ne yazık ki ${noun} mevcut koşullarda onaylanamadı.`,
        nextStep: "Alternatif araç, tarih veya hizmet seçeneği için bizimle iletişime geçebilirsiniz. Ekibimiz uygun bir alternatif bulmanıza yardımcı olacaktır.",
        accent: "#b91c1c",
      };
    case "booking_completed":
      return {
        title: `${humanType(booking.type)} Tamamlandı`,
        lead: `${noun.charAt(0).toUpperCase()}${noun.slice(1)} tamamlandı olarak kaydedildi.`,
        nextStep: "Bizi tercih ettiğiniz için teşekkür ederiz. Fatura, sözleşme veya işlem belgesi konusunda desteğe ihtiyacınız olursa bizimle iletişime geçebilirsiniz.",
        accent: "#334155",
      };
    case "booking_cancelled":
      return {
        title: `${humanType(booking.type)} İptal Edildi`,
        lead: `${noun.charAt(0).toUpperCase()}${noun.slice(1)} iptal edildi olarak kaydedildi.`,
        nextStep: "Yeni tarih veya alternatif hizmet için dilediğiniz zaman yeniden talep oluşturabilir veya doğrudan ekibimizle iletişime geçebilirsiniz.",
        accent: "#7f1d1d",
      };
  }
}

function formatDate(value: string): string {
  if (!value) return "";
  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatMoney(amount: number, currency: string): string {
  if (!Number.isFinite(amount) || amount <= 0) return "";
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function paymentLabel(method: ServerBookingRecord["paymentMethod"]): string {
  switch (method) {
    case "CARD":
      return "Kredi / Banka Kartı";
    case "EFT":
      return "Havale / EFT";
    case "OFFICE":
      return "Ofiste Ödeme";
    default:
      return "Ödeme Gerekmiyor / Sonradan Belirlenecek";
  }
}

function paymentStatusLabel(status: ServerBookingRecord["paymentStatus"]): string {
  switch (status) {
    case "PAID":
      return "Ödendi";
    case "PENDING":
      return "Ödeme Bekleniyor";
    case "FAILED":
      return "Ödeme Başarısız";
    case "REFUNDED":
      return "İade Edildi";
    default:
      return "Ödeme Gerekmiyor";
  }
}

function details(booking: ServerBookingRecord): Array<[string, string]> {
  const rows: Array<[string, string]> = [
    ["Referans", booking.id],
    ["İşlem", humanType(booking.type)],
    [booking.type === "APPOINTMENT" ? "Konu" : "Araç / Tur", booking.itemName],
  ];

  if (booking.startDate) rows.push(["Başlangıç / Tarih", formatDate(booking.startDate)]);
  if (booking.endDate && booking.endDate !== booking.startDate) {
    rows.push(["Bitiş", formatDate(booking.endDate)]);
  }
  if (booking.days > 0) rows.push(["Süre", `${booking.days} gün`]);
  if (booking.personCount > 0) rows.push(["Kişi Sayısı", String(booking.personCount)]);
  if (booking.withDriver) rows.push(["Sürücü", "Şoförlü hizmet"]);
  if (booking.pickupLocation) rows.push(["Alış / Buluşma", booking.pickupLocation]);
  if (booking.dropoffLocation) rows.push(["Teslim", booking.dropoffLocation]);
  if (booking.totalPrice > 0) {
    rows.push(["Toplam Tutar", formatMoney(booking.totalPrice, booking.currency)]);
  }
  if (booking.paymentMethod !== "NONE") {
    rows.push(["Ödeme Yöntemi", paymentLabel(booking.paymentMethod)]);
    rows.push(["Ödeme Durumu", paymentStatusLabel(booking.paymentStatus)]);
  }
  return rows;
}

function socialLinks(config: BrandingConfig): string {
  const links = [
    ["Instagram", config.instagram],
    ["Facebook", config.facebook],
    ["TikTok", config.tiktok],
    ["YouTube", config.youtube],
  ].filter((entry) => entry[1]);
  if (!links.length) return "";

  return `<div style="margin-top:14px;font-size:12px;line-height:1.8">${links
    .map(
      ([label, url]) =>
        `<a href="${escapeHtml(url)}" style="color:#0369a1;text-decoration:none;margin-right:12px">${escapeHtml(label)}</a>`,
    )
    .join("")}</div>`;
}

function footer(config: BrandingConfig): string {
  const website = config.website
    ? `<a href="${escapeHtml(config.website)}" style="color:#0369a1;text-decoration:none">${escapeHtml(config.website)}</a>`
    : "";
  return `
    <div style="margin-top:28px;padding-top:20px;border-top:1px solid #e2e8f0;color:#64748b;font-size:12px;line-height:1.7">
      <strong style="color:#0f172a">${escapeHtml(config.name)}</strong><br>
      ${escapeHtml(config.address)}<br>
      ${escapeHtml(config.phone)}${config.email ? ` | ${escapeHtml(config.email)}` : ""}<br>
      ${website}
      ${socialLinks(config)}
      <div style="margin-top:14px;color:#94a3b8">Bu ileti, oluşturduğunuz işlemle ilgili otomatik operasyon bildirimidir. Pazarlama e-postası değildir.</div>
    </div>`;
}

function htmlDocument(input: {
  title: string;
  lead: string;
  nextStep: string;
  accent: string;
  booking: ServerBookingRecord;
  config: BrandingConfig;
  admin?: boolean;
}): string {
  const rows = details(input.booking)
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:10px 0;color:#64748b;font-size:13px;width:40%;vertical-align:top">${escapeHtml(label)}</td>
          <td style="padding:10px 0;color:#0f172a;font-size:13px;font-weight:700;vertical-align:top">${escapeHtml(value)}</td>
        </tr>`,
    )
    .join("");

  const notes = input.booking.notes
    ? `<div style="margin-top:18px;padding:14px 16px;background:#f8fafc;border-radius:10px;color:#475569;font-size:13px;white-space:pre-line"><strong style="color:#0f172a">Not:</strong><br>${escapeHtml(input.booking.notes)}</div>`
    : "";
  const adminContact = input.admin
    ? `<div style="margin-top:18px;padding:14px 16px;background:#f8fafc;border-radius:10px;font-size:13px;color:#475569"><strong style="color:#0f172a">Müşteri:</strong> ${escapeHtml(input.booking.customerName)}<br><strong style="color:#0f172a">Telefon:</strong> ${escapeHtml(input.booking.customerPhone)}<br><strong style="color:#0f172a">E-posta:</strong> ${escapeHtml(input.booking.customerEmail || "Belirtilmedi")}</div>`
    : "";

  return `<!doctype html>
<html lang="tr">
  <body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif">
    <div style="max-width:680px;margin:0 auto;padding:24px 12px">
      <div style="background:#0f172a;border-radius:16px 16px 0 0;padding:22px 24px;color:#fff">
        <div style="font-size:20px;font-weight:900;letter-spacing:.02em">${escapeHtml(input.config.name)}</div>
        <div style="margin-top:4px;color:#cbd5e1;font-size:12px">Premium Otomotiv ve Seyahat Hizmetleri</div>
      </div>
      <div style="background:#fff;border-radius:0 0 16px 16px;padding:28px 24px;box-shadow:0 10px 30px rgba(15,23,42,.06)">
        <div style="display:inline-block;background:${escapeHtml(input.accent)};color:#fff;border-radius:999px;padding:7px 11px;font-size:11px;font-weight:800;letter-spacing:.05em;text-transform:uppercase">${escapeHtml(input.title)}</div>
        <h1 style="margin:18px 0 10px;color:#0f172a;font-size:24px;line-height:1.25">${input.admin ? "Yeni işlem kaydı" : `Sayın ${escapeHtml(input.booking.customerName)},`}</h1>
        <p style="margin:0;color:#475569;font-size:15px;line-height:1.7">${escapeHtml(input.lead)}</p>
        ${adminContact}
        <table role="presentation" style="width:100%;border-collapse:collapse;margin-top:22px;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0">${rows}</table>
        ${notes}
        <div style="margin-top:22px;padding:16px;border-left:4px solid ${escapeHtml(input.accent)};background:#f8fafc;color:#334155;font-size:14px;line-height:1.7">${escapeHtml(input.nextStep)}</div>
        ${footer(input.config)}
      </div>
    </div>
  </body>
</html>`;
}

export function buildBookingNotification(
  event: BookingNotificationEvent,
  booking: ServerBookingRecord,
): BookingNotificationTemplate {
  const config = branding();
  const copy = statusCopy(event, booking);
  const detailLines = details(booking).map(([label, value]) => `${label}: ${value}`);
  const customerSubject = `${copy.title} | ${booking.id} | ${config.name}`;
  const customerText = [
    `Sayın ${booking.customerName},`,
    "",
    copy.lead,
    "",
    ...detailLines,
    booking.notes ? `Not: ${booking.notes}` : "",
    "",
    copy.nextStep,
    "",
    `${config.name}`,
    `${config.phone}${config.email ? ` | ${config.email}` : ""}`,
    config.address,
    config.website,
  ]
    .filter((line) => line !== "")
    .join("\n");

  const adminSubject =
    event === "booking_created"
      ? `Yeni ${humanType(booking.type)} | ${booking.id}`
      : `${copy.title} | ${booking.id}`;
  const adminText = [
    `${copy.title}: ${booking.id}`,
    `Müşteri: ${booking.customerName}`,
    `Telefon: ${booking.customerPhone}`,
    `E-posta: ${booking.customerEmail || "Belirtilmedi"}`,
    ...detailLines,
    booking.notes ? `Not: ${booking.notes}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const smsLead =
    event === "booking_created"
      ? `${humanType(booking.type)} talebiniz alındı.`
      : event === "booking_approved"
        ? `${humanType(booking.type)} onaylandı.`
        : event === "booking_rejected"
          ? `${humanType(booking.type)} mevcut koşullarda onaylanamadı.`
          : event === "booking_cancelled"
            ? `${humanType(booking.type)} iptal edildi.`
            : event === "booking_completed"
              ? `${humanType(booking.type)} tamamlandı.`
              : `${humanType(booking.type)} incelemeye alındı.`;
  const customerSms = `${config.name}: ${smsLead} Ref: ${booking.id}. Destek: ${config.phone}`.slice(0, 320);

  return {
    customerSubject,
    customerText,
    customerHtml: htmlDocument({
      title: copy.title,
      lead: copy.lead,
      nextStep: copy.nextStep,
      accent: copy.accent,
      booking,
      config,
    }),
    customerSms,
    adminSubject,
    adminText,
    adminHtml: htmlDocument({
      title: copy.title,
      lead: `${humanType(booking.type)} kaydı ${booking.status} durumundadır.`,
      nextStep:
        event === "booking_created"
          ? "Bu kayıt yönetim panelinden incelenip onaylanabilir, reddedilebilir veya gerekli durumda müşteriyle iletişime geçilebilir."
          : "Durum değişikliği kayıt altına alınmıştır.",
      accent: copy.accent,
      booking,
      config,
      admin: true,
    }),
  };
}
