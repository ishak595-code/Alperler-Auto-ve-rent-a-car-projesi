import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const dock = read("src/components/customer-mobile-dock.component.ts");
const policy = read("src/services/mobile-dock-route-policy.ts");
const spacing = read("src/mobile-target-fixes.css");
const layout = read("src/components/main-layout.component.ts");
const device = read("src/device-experience.css");
const runtime = read("tests/v205/responsive-prestige.spec.ts");
const angular = read("angular.json");

const failures = [];
const requireText = (source, needle, message) => {
  if (!source.includes(needle)) failures.push(message);
};
const rejectText = (source, needle, message) => {
  if (source.includes(needle)) failures.push(message);
};

requireText(policy, "return cleanCustomerPath(rawUrl) === '/'", "Customer dock must be home-only by allowlist.");
requireText(dock, "(max-width:639px) and (pointer:coarse)", "Dock must be phone-class in portrait.");
requireText(dock, "(max-width:950px) and (max-height:500px) and (pointer:coarse)", "Dock must preserve short coarse landscape phones.");
requireText(dock, "isPhoneDockViewport()", "Dock auto-hide state must be limited to actual phone-class viewports.");
requireText(dock, "window.matchMedia", "Dock viewport ownership must match the CSS media contract.");

for (const token of [
  "<nav",
  "class=\"customer-command-dock\"",
  "[routerLink]=\"item.route\"",
  "[attr.aria-current]=\"isCurrent(item.route) ? 'page' : null\"",
  "track item.id",
  "[attr.aria-label]=\"item.label\"",
  "[attr.aria-hidden]=\"autoHidden() ? 'true' : null\"",
  "[attr.inert]=\"autoHidden() ? '' : null\"",
  "visibility:hidden",
  "releaseDockFocus()",
  "window.requestAnimationFrame",
  "Math.abs(delta) < 12",
  "mobileDockAutoHideEnabled()",
  "dock-auto-hidden",
  "this.setAutoHidden(delta > 0 && currentY > 120)",
]) requireText(dock, token, `Responsive dock contract missing: ${token}`);
for (const token of ["HostListener","backdrop-filter:blur","-webkit-backdrop-filter:blur"]) rejectText(dock, token, `Responsive dock regression returned: ${token}`);

requireText(spacing, "app-home-v71 > main", "Only home should reserve mobile dock safe area.");
for (const forbidden of ["app-fleet app-rental-catalog-v217 > main","app-sales-results app-sale-catalog-v217 > main","app-tours app-tour-catalog-v217 > main","app-campaigns > main","app-account-shell app-account-dashboard-v150 > main"]) {
  rejectText(spacing, forbidden, `Non-home route still reserves dock space: ${forbidden}`);
}

for (const token of [
  "isHomePage() && navigation.mobileDockAutoHidden() && getWhatsappNumber()",
  "class=\"whatsapp-fab\"",
  "animation:whatsapp-fab-enter .16s ease .18s both",
]) requireText(layout, token, `Homepage WhatsApp handoff missing: ${token}`);
rejectText(layout, "dock-offset", "Homepage WhatsApp must never be stacked above the dock.");
rejectText(layout, "showWhatsapp=signal", "Homepage WhatsApp must not be timer-driven.");

for (const token of [
  'toHaveAttribute("aria-hidden", "true")',
  'toHaveAttribute("inert", "")',
  'getByRole("navigation", { name: "Alt hızlı menü" })',
  'toHaveCount(0)',
  'not.toHaveAttribute("aria-hidden", "true")',
  'a.whatsapp-fab',
]) requireText(runtime, token, `Responsive device regression must verify dock/WhatsApp handoff: ${token}`);

requireText(device, "app-home-v71 .hero-copy-block", "Device contract must own the phone hero hierarchy.");
requireText(device, "display: contents", "Phone hero copy must expose children for semantic visual reordering.");
requireText(device, "app-home-v71 .planner { order: 5", "Planner must precede trust proof on phones.");
requireText(device, "app-home-v71 .trust-row { order: 6", "Trust proof must follow the planner on phones.");
requireText(device, "app-home-v71 .desktop-search { order: 4; display: none !important; }", "Phone hero search must remain hidden, including landscape phones.");
requireText(angular, '"src/device-experience.css"', "Canonical device experience stylesheet must be in the production style graph.");

if (failures.length) {
  console.error("V205 responsive prestige integrity: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("V205 responsive prestige integrity: PASS");
