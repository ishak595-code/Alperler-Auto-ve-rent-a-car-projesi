#!/usr/bin/env node
/**
 * Contract: browser language auto-detect + public chrome i18n wiring
 * (footer links, dock aria, home section empty states). No custom domain hardcoding.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const assert = (cond, msg) => {
  if (!cond) throw new Error(`I18N_CHROME_AUTODETECT: ${msg}`);
};

const ui = read('src/services/ui.service.ts');
const detectSrc = read('src/i18n/detect-browser-language.ts');
const footer = read('src/components/customer-footer-v70.component.ts');
const dock = read('src/components/customer-mobile-dock.component.ts');
const section = read('src/components/dynamic-home-section.component.ts');
const en = read('src/i18n/en.ts');

assert(detectSrc.includes('mapBrowserLocaleToLanguage'), 'detect helper missing mapBrowserLocaleToLanguage');
assert(detectSrc.includes('ckb:') && detectSrc.includes('kmr:'), 'Kurdish browser aliases (ckb/kmr) missing');
assert(detectSrc.includes('detectBrowserLanguage'), 'detectBrowserLanguage export missing');

assert(ui.includes('detectBrowserLanguage'), 'UiService must call detectBrowserLanguage on first visit');
assert(ui.includes('isSupportedLanguage'), 'UiService must validate persisted language');
assert(ui.includes('publicFooterLinkLabel'), 'UiService must expose publicFooterLinkLabel');
assert(ui.includes('publicFooterSetting'), 'UiService must expose publicFooterSetting');
assert(ui.includes('emptyTitle:'), 'TR homeSection.emptyTitle missing');
assert(ui.includes('"services.appointment"'), 'footer link map must cover appointment');
assert(ui.includes('"legal.kvkk"'), 'footer link map must cover legal.kvkk');

assert(footer.includes('linkLabel(link)'), 'footer template must use linkLabel()');
assert(footer.includes('publicFooterLinkLabel'), 'footer must wire publicFooterLinkLabel');
assert(footer.includes('overflow-wrap:anywhere'), 'footer links need overflow-wrap for small chrome');
assert(footer.includes('min-height:44px'), 'footer links need 44px touch targets');

assert(dock.includes('[attr.aria-label]="dockLabel(item)"'), 'dock aria-label must use localized dockLabel');
assert(dock.includes('overflow-wrap:anywhere'), 'dock labels need overflow-wrap');
assert(dock.includes('-webkit-line-clamp:2'), 'dock labels should clamp to 2 lines');

assert(section.includes('isCatalogEmpty()'), 'home sections must expose honest empty state');
assert(section.includes('homeSection.emptyBody'), 'empty body must use UiService pack');
assert(section.includes('layout.loaded()'), 'empty chrome only after layout loaded');

assert(en.includes('emptyTitle:'), 'EN homeSection.emptyTitle missing');
assert(en.includes('rentals:'), 'EN footer.links.rentals missing');
assert(en.includes('appointment:'), 'EN footer.links.appointment missing');
assert(en.includes('brandSummary:'), 'EN footer.brandSummary missing');

for (const code of ['de', 'fr', 'es', 'ru', 'zh', 'ar', 'ku']) {
  const pack = read(`src/i18n/${code}.ts`);
  assert(pack.includes('emptyTitle:'), `${code} missing homeSection.emptyTitle`);
  assert(pack.includes('rentals:'), `${code} missing footer.links.rentals`);
  assert(pack.includes('brandSummary:'), `${code} missing footer.brandSummary`);
}

// Hard constraint: do not invent a custom purchased domain as primary site URL in these chrome files.
for (const [name, src] of [
  ['ui.service.ts', ui],
  ['customer-footer-v70.component.ts', footer],
  ['customer-mobile-dock.component.ts', dock],
  ['detect-browser-language.ts', detectSrc],
]) {
  assert(!/https?:\/\/(www\.)?alperler\.com/i.test(src), `${name} must not hardcode alperler.com as primary URL`);
}

// Lightweight runtime mapping checks (inline; no TS loader required).
function mapLocale(tag) {
  const raw = String(tag || '').trim().toLowerCase().replace(/_/g, '-');
  if (!raw) return null;
  if (raw.startsWith('zh-hans') || raw === 'zh-cn' || raw === 'zh-sg') return 'ZH';
  if (raw.startsWith('zh-hant') || raw === 'zh-tw' || raw === 'zh-hk' || raw === 'zh-mo') return 'ZH';
  const primary = raw.split('-')[0] || '';
  const table = { tr: 'TR', en: 'EN', de: 'DE', fr: 'FR', es: 'ES', ru: 'RU', zh: 'ZH', ar: 'AR', ku: 'KU', ckb: 'KU', kmr: 'KU' };
  return table[primary] || null;
}
function detectLocale(langs, lang) {
  for (const tag of [...(langs || []), lang].filter(Boolean)) {
    const m = mapLocale(tag);
    if (m) return m;
  }
  return null;
}

assert(mapLocale('en-US') === 'EN', 'en-US → EN');
assert(mapLocale('zh-CN') === 'ZH', 'zh-CN → ZH');
assert(mapLocale('ckb-IQ') === 'KU', 'ckb-IQ → KU');
assert(mapLocale('kmr') === 'KU', 'kmr → KU');
assert(mapLocale('pt-BR') === null, 'pt-BR unsupported → null');
assert(detectLocale(['pt-BR', 'de-DE'], 'pt') === 'DE', 'navigator.languages prefers first supported');
assert(detectLocale(['xx', 'yy'], 'tr-TR') === 'TR', 'falls back to navigator.language');

console.log('I18N chrome auto-detect + footer/dock/empty-state contract: PASS');

