import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const fail = (message) => {
  console.error(`V192_HOME_RUNTIME_FAIL: ${message}`);
  process.exitCode = 1;
};

const routes = read("src/app.routes.ts");
const catalog = read("src/services/catalog.service.ts");
const car = read("src/services/car.service.ts");
const coordinator = read("src/services/public-content-refresh-coordinator.service.ts");
const home = read("src/pages/home-v71.component.ts");
const layout = read("src/components/main-layout.component.ts");

const staticPageImports = routes
  .split(/\r?\n/)
  .filter((line) => /^import\s.+from\s+["']\.\/pages\//.test(line));
for (const line of staticPageImports) {
  if (!line.includes("./pages/home-v71.component")) {
    fail(`customer/admin route code leaked back into the initial bundle: ${line.trim()}`);
  }
}
for (const required of [
  "loadComponent: () => import('./pages/fleet.component')",
  "loadComponent: () => import('./pages/blog-list.component')",
  "loadComponent: () => import('./pages/about.component')",
  "loadComponent: () => import('./pages/admin/admin-layout.component')",
]) {
  if (!routes.includes(required)) fail(`route code-splitting contract missing: ${required}`);
}
if (!routes.includes("children: [{ path: '', component: HomeV71Component }]")) {
  fail("canonical root route must remain HomeV71Component inside MainLayoutComponent");
}

if (!catalog.includes("return this.directPublicRequest<T>(resource, fresh);")) {
  fail("public catalog reads must use the canonical Supabase public read path");
}
if (catalog.includes("Public catalog API fallback activated")) {
  fail("public catalog must not perform gateway-first then Supabase fallback reads");
}

const constructorStart = car.indexOf("constructor() {");
const configMethodStart = car.indexOf("refreshSiteConfig(", constructorStart);
const constructorBody = constructorStart >= 0 && configMethodStart > constructorStart
  ? car.slice(constructorStart, configMethodStart)
  : "";
if (!constructorBody) fail("CarService constructor/config boundary could not be verified");
if (constructorBody.includes("refreshCloudCatalog(")) {
  fail("CarService constructor must not start the full catalog before first paint");
}
for (const required of [
  "refreshSiteConfig(fresh = false)",
  '["site_config"]',
  '["vehicles", "tours", "catalog_media", "media_assets", "blog_posts", "faqs"]',
  "queueConfigRefresh",
  "queueCloudCatalogRefresh",
]) {
  if (!car.includes(required)) fail(`CarService split ownership missing: ${required}`);
}
const fullCatalogStart = car.indexOf("async refreshCloudCatalog");
const fullCatalogEnd = car.indexOf("async ensureVehicleCloudInventory", fullCatalogStart);
const fullCatalogBody = fullCatalogStart >= 0 && fullCatalogEnd > fullCatalogStart
  ? car.slice(fullCatalogStart, fullCatalogEnd)
  : "";
if (!fullCatalogBody) fail("full catalog refresh body could not be verified");
if (fullCatalogBody.includes("loadConfig(")) fail("site_config must not be coupled back into heavy catalog hydration");

const expectedStartupOrder = [
  'key: "config"',
  'key: "homepage"',
  'key: "branches"',
];
let previousIndex = -1;
for (const token of expectedStartupOrder) {
  const index = coordinator.indexOf(token);
  if (index < 0) fail(`startup task missing: ${token}`);
  if (index >= 0 && index < previousIndex) fail(`startup task order is not top-down: ${token}`);
  previousIndex = Math.max(previousIndex, index);
}
for (const required of [
  "startupOffsets()",
  "return { config: 0, homepage: 0, branches: 0 };",
  "Promise.allSettled(dueTasks.map((task) => task.run()))",
  "refreshSiteConfig(true)",
  "homepageLayout.refreshPublicState()",
  "branchService.refresh()",
]) {
  if (!coordinator.includes(required)) fail(`global startup hydration contract missing: ${required}`);
}
for (const forbidden of [
  'key: "campaigns"',
  'key: "catalog"',
  "campaignService.refreshPublicState()",
  "refreshCloudCatalog(true)",
  "connection?.saveData",
  'connection?.effectiveType === "2g"',
  "catalog: 1_100",
  "catalog: 2_500",
]) {
  if (coordinator.includes(forbidden)) fail(`global shell must not regain heavy or timer-staggered catalog ownership: ${forbidden}`);
}
if (coordinator.includes("setInterval(")) fail("startup/fallback scheduler must not use setInterval");

for (const required of [
  "homepageLayout.sections()",
  "@for (section of managedSections(); track section.sectionKey)",
  '<app-dynamic-home-section [section]="section"></app-dynamic-home-section>',
]) {
  if (!home.includes(required)) fail(`homepage deterministic rendering contract missing: ${required}`);
}
for (const forbidden of [
  "@defer (on viewport",
  "@placeholder (minimum 120ms)",
  "fallbackSections",
  "images.unsplash.com",
  'sectionKey:"campaigns"',
  'sectionKey:"rental_featured"',
  'sectionKey:"sale_featured"',
  'sectionKey:"tour_featured"',
  'sectionKey:"branches"',
  'sectionKey:"partner"',
  'sectionKey:"blog_featured"',
]) {
  if (home.includes(forbidden)) fail(`homepage regained a delayed/static ownership shortcut: ${forbidden}`);
}

for (const required of [
  "<app-customer-prefooter-v174>",
  "<app-customer-footer-v70",
  "@defer (on idle)",
  "<app-feedback>",
]) {
  if (!layout.includes(required)) fail(`customer shell contract missing: ${required}`);
}
if (layout.includes("@defer (on viewport")) {
  fail("customer prefooter/footer must not wait for viewport visibility");
}

if (!process.exitCode) {
  console.log("V192 homepage runtime OK: lightweight global hydration, bounded route-owned catalogs, route code-splitting and deterministic full-page rendering are enforced.");
}
