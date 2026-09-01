import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const dock = read("src/components/customer-mobile-dock.component.ts");
const spacing = read("src/mobile-target-fixes.css");
const layout = read("src/components/main-layout.component.ts");
const device = read("src/device-experience.css");
const angular = read("angular.json");

const failures = [];
const requireText = (source, needle, message) => {
  if (!source.includes(needle)) failures.push(message);
};
const rejectText = (source, needle, message) => {
  if (source.includes(needle)) failures.push(message);
};

requireText(dock, "(max-width:639px) and (pointer:coarse)", "Dock must be phone-class in portrait.");
requireText(dock, "(max-width:950px) and (max-height:500px) and (pointer:coarse)", "Dock must preserve short coarse landscape phones.");
if (dock.includes("@media (max-width:767px) and (pointer:coarse)")) failures.push("Legacy 767px dock breakpoint must not return.");

requireText(dock, "class=\"customer-command-dock\"", "Customer dock must remain a native navigation landmark.");
requireText(dock, "[routerLink]=\"item.route\"", "Customer dock actions must remain native router links.");
requireText(dock, "[attr.aria-current]=\"isCurrent(item.route) ? 'page' : null\"", "Current dock destination must expose aria-current=page.");
requireText(dock, "track item.id", "Dock items must keep stable DOM identity across route changes.");
requireText(dock, "[attr.aria-label]=\"item.label\"", "Dock actions must keep stable accessible names.");
requireText(dock, "[attr.aria-hidden]=\"autoHidden() ? 'true' : null\"", "Auto-hidden dock must leave the accessibility tree.");
requireText(dock, "[attr.inert]=\"autoHidden() ? '' : null\"", "Auto-hidden dock must leave sequential focus navigation.");
requireText(dock, "visibility:hidden", "Auto-hidden dock must not remain visually or accessibility-visible.");
requireText(dock, "releaseDockFocus()", "Dock must release focus before becoming inert.");
requireText(dock, "isPhoneDockViewport()", "Dock auto-hide state must be limited to actual phone-class viewports.");
requireText(dock, "window.matchMedia", "Dock viewport ownership must match the CSS media contract.");
rejectText(dock, "HostListener", "The mobile dock must not use an unthrottled HostListener scroll path.");
requireText(dock, "window.requestAnimationFrame", "Dock scroll behavior must be requestAnimationFrame throttled.");
requireText(dock, "Math.abs(delta) < 12", "Dock scroll behavior must retain hysteresis to prevent jitter.");
requireText(dock, "mobileDockAutoHideEnabled()", "Dock must honor the data-driven auto-hide setting.");
requireText(dock, "dock-auto-hidden", "Dock must expose one stable visual auto-hide state.");
requireText(dock, "this.setAutoHidden(delta > 0 && currentY > 120)", "Dock must hide on downward scrolling and restore on upward scrolling.");
rejectText(dock, "backdrop-filter:blur", "Fixed phone dock must not use scroll-heavy backdrop blur compositing.");
rejectText(dock, "-webkit-backdrop-filter:blur", "Fixed phone dock must not use WebKit backdrop blur compositing.");

requireText(spacing, "(max-width:639px) and (pointer:coarse)", "Dock content spacing must match phone-class portrait.");
requireText(spacing, "(max-width:950px) and (max-height:500px) and (pointer:coarse)", "Dock content spacing must match phone landscape.");
requireText(layout, "[class.mobile-dock-present]=\"navigation.mobileDockRendered()\"", "Footer dock spacing must follow the live dock-render state.");
requireText(spacing, "app-customer-footer-v70.mobile-dock-present .customer-footer", "Footer must reserve fixed-dock safe area only while the dock is rendered.");
requireText(layout, "@media(max-width:639px) and (pointer:coarse)", "WhatsApp offset must match the phone dock breakpoint.");

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
