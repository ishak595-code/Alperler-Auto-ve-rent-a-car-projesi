#!/usr/bin/env node
// V254 guard: buttons and CTAs use sentence case in every language ("Mesajı gönder",
// "Tekrar dene", "Send message"). German keeps its natural noun capitals, Chinese and
// Arabic have no case. Turkish must never rely on CSS text-transform (İ/ı), so the
// strings themselves carry the rule.
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const failures = [];

const KEY = /^(.*(Cta|CTA|CtaFallback|Button|Btn|ActionLabel|CtaLabel|PrimaryLabel|SecondaryLabel|primaryLabel|secondaryLabel|ctaLabel|buttonLabel|viewAllLabel|submitLabel)|retry|retryLabel|submit|send|sendMessage|subscribe|apply|applyFilters|clear|clearFilters|save|cancel|continue|back|next|signIn|signUp|register|login|logout|showAll|loadMore|viewAll|viewDetails|reserve|bookNow|book|callNow|call|showResults|search|contactUs|getDirections|share|copyLink|confirm|tryAgain|reload|refresh|sendFeedback|goHome|backHome|readMore|seeAll|seeMore|cta|createBooking)$/;
const ALLOW = new Set("Alperler WhatsApp Google Facebook Apple Yüksekova Hakkari Hakkâri Cilo KVKK SMS PDF TL FAQ SSS VIP GDPR SUV ID IBAN iOS Android Instagram YouTube TikTok Telegram Türkiye Turkey İstanbul Van".split(" "));
const PHRASES = ["Rent A Car", "Alperler Auto"];
const locale = (lang) => (lang === "TR" ? "tr" : lang === "RU" ? "ru" : "en");

function offenders(value, lang) {
  const loc = locale(lang);
  const letters = value.replace(/[^\p{L}]/gu, "");
  if (letters.length > 3 && letters === letters.toLocaleUpperCase(loc)) return ["ALL CAPS"];
  let text = value;
  for (const phrase of PHRASES) text = text.split(phrase).join(" ");
  const words = text.match(/[\p{L}][\p{L}\p{M}’'\-.]*/gu) ?? [];
  return words.slice(1).filter((word) => {
    const base = word.replace(/[’'].*$/, "");
    if (ALLOW.has(word) || ALLOW.has(base)) return false;
    const core = word.replace(/[^\p{L}]/gu, "");
    if (core.length >= 2 && core.length <= 5 && core === core.toLocaleUpperCase(loc)) return false;
    return word[0] !== word[0].toLocaleLowerCase(loc);
  });
}

function scanPack(path, lang) {
  read(path).split("\n").forEach((line, index) => {
    for (const match of line.matchAll(/\b([A-Za-z0-9_]+)\s*:\s*(["'])([^"'\n]{2,80})\2/g)) {
      const [, key, , value] = match;
      if (!KEY.test(key) || value.trim().split(/\s+/).length < 2) continue;
      const bad = offenders(value, lang);
      if (bad.length) failures.push(`${path}:${index + 1} ${lang} ${key}: "${value}" (${bad.join(", ")})`);
    }
  });
}

scanPack("src/services/ui.service.ts", "TR");
for (const lang of ["en", "fr", "es", "ru", "ku"]) scanPack(`src/i18n/${lang}.ts`, lang.toUpperCase());

// German: nouns stay capitalised, but verbs/adverbs in a CTA must not be.
read("src/i18n/de.ts").split("\n").forEach((line, index) => {
  for (const match of line.matchAll(/\b([A-Za-z0-9_]+)\s*:\s*"([^"\n]{2,80})"/g)) {
    if (!KEY.test(match[1])) continue;
    const value = match[2];
    const verbCapital = /\bJetzt [A-ZÄÖÜ]/.test(value) || (/\s(Senden|Buchen|Mieten|Anrufen|Finden|Speichern|Entdecken|Bewerben|Zeigen|Anzeigen)$/.test(value) && !/^(Mehr|Alle) Anzeigen$/.test(value)) || /^[A-ZÄÖÜ\s]{5,}$/.test(value);
    if (verbCapital) failures.push(`src/i18n/de.ts:${index + 1} DE ${match[1]}: "${value}" (verb capitalised)`);
  }
});

// Built-in TR admin defaults for homepage/prefooter CTAs.
for (const path of ["src/services/homepage-layout.service.ts", "src/services/footer-settings.service.ts", "src/pages/admin/admin-homepage.component.ts", "src/pages/admin/admin-campaigns-v167.component.ts"]) {
  for (const match of read(path).matchAll(/(viewAllLabel|ctaLabel|primaryLabel|secondaryLabel)\s*:\s*'([^']+)'/g)) {
    const bad = offenders(match[2], "TR");
    if (bad.length) failures.push(`${path} ${match[1]}: "${match[2]}" (${bad.join(", ")})`);
  }
}

// Legacy DB-seeded Title Case defaults are modernised at render time; custom copy is untouched.
const legacy = read("src/services/legacy-cta-casing.ts");
if (!legacy.includes('"Rezervasyon Oluştur": "Rezervasyon oluştur"')) failures.push("legacy-cta-casing.ts must map seeded Title Case defaults to sentence case");
if (!read("src/components/dynamic-home-section.component.ts").includes("modernizeLegacyCtaCase(")) failures.push("homepage sections must modernise legacy CTA defaults");
if (!read("src/components/customer-prefooter-v174.component.ts").includes("modernizeLegacyCtaCase(")) failures.push("prefooter must modernise legacy CTA defaults");

// Never capitalise CTAs through CSS (breaks Turkish İ/ı and sentence case).
for (const path of ["src/styles.css", "src/premium-responsive.css", "src/premium-design-system.css", "src/base-shell.css"]) {
  let css = "";
  try { css = read(path); } catch { continue; }
  if (/text-transform\s*:\s*capitalize/.test(css)) failures.push(`${path} uses text-transform: capitalize`);
}

if (failures.length) {
  console.error(`V254 button casing guard failed (${failures.length}):\n- ` + failures.join("\n- "));
  process.exit(1);
}
console.log("V254 button casing guard passed: CTAs are sentence case in TR/EN/FR/ES/RU/KU, German verbs lowercase, defaults and legacy seeds normalised.");
