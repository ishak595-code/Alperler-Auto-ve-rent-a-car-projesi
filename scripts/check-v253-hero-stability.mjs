#!/usr/bin/env node
// V253 guard: the homepage quick planner must reserve stable space for every
// mode/state, the hero must use one fluid clamp() type scale, and the WhatsApp
// FAB must be a single app-level chrome element that yields to the phone dock.
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const failures = [];
const need = (ok, message) => { if (!ok) failures.push(message); };

const home = read("src/pages/home-v71.component.ts");
for (const token of ["when-stack", "when-variant", "planner-feedback", "action-labels", "field-static", "--hero-h1:clamp(", "--hero-eyebrow:clamp(", "--hero-sub:clamp(", "--control-h:clamp(", "--action-h:clamp("]) {
  need(home.includes(token), `home-v71 is missing stable planner/hero token: ${token}`);
}
need(!/@if\s*\(\s*plannerSummary\(\)\s*\)/.test(home), "planner summary must not be inserted/removed with @if (reserve its box instead)");
need(!/@if\s*\(\s*plannerError\(\)\s*\)/.test(home), "planner error must replace the note inside the fixed feedback slot, not be inserted with @if");
need(/text-transform:uppercase/.test(home) && /\.eyebrow,\.planner-kicker\{[^}]*text-transform:uppercase/.test(home), "eyebrow/kicker must be the only uppercase hero text (lang-aware via CSS)");

const date = read("src/components/accessible-native-date.component.ts");
need(/small[^>]*is-empty/.test(date) || date.includes("is-empty"), "date trigger must always render its secondary line (is-empty) so choosing a date cannot grow it");

const cinematic = read("src/v193-cinematic-3d.css");
const hoverBlocks = cinematic.match(/app-home-v71 \.planner:(hover|focus-within)[^{]*\{[^}]*\}/g) ?? [];
need(hoverBlocks.every((block) => !/transform\s*:/.test(block)), "planner hover/focus must not change the 3D transform (it moved the card under the pointer)");

const stability = read("src/runtime-stability.css");
need(/scrollbar-gutter:\s*stable/.test(stability), "html must reserve the scrollbar gutter so modal scroll-lock cannot shift the page");

const app = read("src/app.component.ts");
const fab = read("src/components/whatsapp-fab.component.ts");
const layout = read("src/components/main-layout.component.ts");
need(app.includes("<app-whatsapp-fab"), "WhatsApp FAB must be mounted once at app level (MainLayout only wraps home/404)");
need(!layout.includes('data-chrome="whatsapp-fab"'), "MainLayout must not render a second WhatsApp FAB");
need(fab.includes("fab-yield") && fab.includes("mobileDockRendered"), "FAB must yield to the visible phone dock");
need(fab.includes("safe-area-inset-bottom") && fab.includes("safe-area-inset-right"), "FAB must respect safe-area insets");
need(!/transition:[^;]*\bbottom\b/.test(fab), "FAB must animate opacity/transform, never bottom (that registers as layout shift)");
need(fab.includes("window.location.pathname"), "FAB must read its initial route from the real URL");
// V254: the single floating WhatsApp button is homepage-only; in-page WhatsApp buttons elsewhere are separate.
need(/readonly onHomeRoute = computed\(\(\) => this\.currentPath\(\) === "\/"\)/.test(fab) && fab.includes("&& this.onHomeRoute()"), "Floating WhatsApp FAB must render on the homepage route only");
need(!fab.includes("hasOwnBottomActionBar") && !fab.includes("fab-lane"), "Floating WhatsApp FAB must not keep inner-page visibility/spacer logic");

// V254 first paint: saved non-TR language is loaded before the first frame; desktop header reserves its boxes.
const entry = read("index.tsx");
const ui = read("src/services/ui.service.ts");
const navbar = read("src/components/navbar.component.ts");
need(entry.includes("provideAppInitializer(() => inject(UiService).whenInitialLocaleReady())"), "Bootstrap must await the saved language pack (capped) so EN/DE never repaint from TR");
need(/whenInitialLocaleReady\(maxWaitMs = \d+\)/.test(ui) && ui.includes("Promise.race("), "Initial locale wait must be capped so a slow chunk never blocks startup");
need(navbar.includes(".desktop-nav{display:flex;min-width:0;min-height:45px;") && navbar.includes(".brand-link{flex:0 1 auto;min-width:172px;"), "Desktop header must reserve nav height and brand width before its content renders");

const routes = read("src/app.routes.ts");
need(/path:\s*'favorites'/.test(routes), "/favorites must redirect to saved vehicles instead of 404");

if (failures.length) {
  console.error("V253 hero stability guard failed:\n- " + failures.join("\n- "));
  process.exit(1);
}
console.log("V253 hero stability guard passed.");
