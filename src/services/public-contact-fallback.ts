/**
 * Public contact chrome fallback (v248).
 *
 * The admin-owned value in public.site_config always wins. This fallback only
 * exists so the public WhatsApp / phone chrome never disappears when the site
 * configuration cannot be read (Supabase quota, 402/503, offline first visit).
 * The number is the already-published public business line (seed migrations
 * 202608140016 / 20260815165500 and the customer-facing EFT copy), not a secret.
 */
export const PUBLIC_WHATSAPP_FALLBACK_DIGITS = "905379594851";
export const PUBLIC_PHONE_FALLBACK = "+905379594851";
export const PUBLIC_WHATSAPP_FALLBACK_MESSAGE = "Merhaba, Alperler Rent A Car hizmetleri hakkında bilgi almak istiyorum.";

interface ContactLike {
  whatsapp?: string | null;
  phone?: string | null;
}

/** Digits for wa.me: configured WhatsApp, else configured phone, else the public business line. */
export function resolvePublicWhatsappDigits(config: ContactLike | null | undefined): string {
  const configured = String(config?.whatsapp || config?.phone || "").replace(/\D/g, "");
  return configured.length >= 8 ? configured : PUBLIC_WHATSAPP_FALLBACK_DIGITS;
}

/** tel: target: configured phone, else the public business line. */
export function resolvePublicPhoneHref(config: ContactLike | null | undefined): string {
  const configured = String(config?.phone || "").replace(/[^+\d]/g, "");
  return `tel:${configured.replace(/\D/g, "").length >= 8 ? configured : PUBLIC_PHONE_FALLBACK}`;
}

export function buildPublicWhatsappHref(digits: string, message: string): string {
  const safeDigits = String(digits || "").replace(/\D/g, "") || PUBLIC_WHATSAPP_FALLBACK_DIGITS;
  const text = String(message || "").trim() || PUBLIC_WHATSAPP_FALLBACK_MESSAGE;
  return `https://wa.me/${safeDigits}?text=${encodeURIComponent(text)}`;
}
