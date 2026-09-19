/** Supported public site languages (matches UiService packs). */
export type SiteLanguage = "TR" | "EN" | "DE" | "FR" | "KU" | "ES" | "RU" | "ZH" | "AR";

export const SUPPORTED_LANGUAGES: readonly SiteLanguage[] = [
  "TR",
  "EN",
  "DE",
  "FR",
  "KU",
  "ES",
  "RU",
  "ZH",
  "AR",
] as const;

const PRIMARY_TO_LANGUAGE: Record<string, SiteLanguage> = {
  tr: "TR",
  en: "EN",
  de: "DE",
  fr: "FR",
  es: "ES",
  ru: "RU",
  zh: "ZH",
  ar: "AR",
  ku: "KU",
  /** Central Kurdish → site KU pack */
  ckb: "KU",
  /** Northern Kurdish / Kurmanji → site KU pack */
  kmr: "KU",
};

/**
 * Map a BCP-47 / browser locale tag onto the supported language set.
 * Examples: en-US→EN, zh-CN→ZH, ckb-IQ→KU, tr→TR.
 */
export function mapBrowserLocaleToLanguage(tag: string | null | undefined): SiteLanguage | null {
  const raw = String(tag || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-");
  if (!raw) return null;

  // Script/region aliases for Chinese → single ZH pack.
  if (raw === "zh-cn" || raw === "zh-sg" || raw === "zh-hans" || raw.startsWith("zh-hans")) return "ZH";
  if (raw === "zh-tw" || raw === "zh-hk" || raw === "zh-mo" || raw.startsWith("zh-hant")) return "ZH";

  const primary = raw.split("-")[0] || "";
  return PRIMARY_TO_LANGUAGE[primary] || null;
}

/**
 * Prefer navigator.languages order, then navigator.language.
 * Returns null when nothing maps (caller keeps default TR).
 */
export function detectBrowserLanguage(
  languages: readonly string[] | null | undefined,
  language?: string | null,
): SiteLanguage | null {
  const candidates: string[] = [];
  if (Array.isArray(languages)) {
    for (const item of languages) {
      if (item) candidates.push(String(item));
    }
  }
  if (language) candidates.push(String(language));

  for (const tag of candidates) {
    const mapped = mapBrowserLocaleToLanguage(tag);
    if (mapped) return mapped;
  }
  return null;
}

export function isSupportedLanguage(value: string | null | undefined): value is SiteLanguage {
  return Boolean(value && (SUPPORTED_LANGUAGES as readonly string[]).includes(value));
}
