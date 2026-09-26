/**
 * V254 button casing rule: buttons and CTAs use sentence case in every language
 * ("Mesajı gönder", "Tekrar dene"), never CSS text-transform (Turkish İ/ı).
 *
 * Admin-saved copy is honoured as written. The only exception is the exact set of
 * built-in Title Case defaults that older releases seeded into the database: when a
 * saved value is byte-for-byte one of those legacy defaults, it is shown with the
 * current sentence-case default instead. Anything an operator actually typed differs
 * from these strings and is left untouched.
 */
const LEGACY_DEFAULTS: Readonly<Record<string, string>> = {
  "Rezervasyon Oluştur": "Rezervasyon oluştur",
  "Randevu Oluştur": "Randevu oluştur",
  "Aracımı Değerlendir": "Aracımı değerlendir",
  "Bize Ulaşın": "Bize ulaşın",
  "Detayları İncele": "Detayları incele",
  "Fırsatı İncele": "Fırsatı incele",
  "Tüm Fırsatlar": "Tüm fırsatlar",
  "Tüm Kiralık Araçlar": "Tüm kiralık araçlar",
  "Tüm Satılık Araçlar": "Tüm satılık araçlar",
  "Tüm Turlar": "Tüm turlar",
  "Tüm Noktalar": "Tüm noktalar",
  "Tüm Yazılar": "Tüm yazılar",
  "Tümünü Gör": "Tümünü gör",
  "Geri Bildirim Gönder": "Geri bildirim gönder",
  "Ücretsiz Abone Ol": "Ücretsiz abone ol",
  "Abone Ol": "Abone ol",
  "Mesajı Gönder": "Mesajı gönder",
  "Tekrar Dene": "Tekrar dene",
};

export function modernizeLegacyCtaCase(value: string): string {
  const trimmed = String(value ?? "").trim();
  return LEGACY_DEFAULTS[trimmed] ?? value;
}
