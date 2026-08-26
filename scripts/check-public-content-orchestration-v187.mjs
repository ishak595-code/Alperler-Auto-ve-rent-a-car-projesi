import fs from "node:fs";

const fail = (message) => {
  console.error(`V187_PUBLIC_CONTENT_FAIL: ${message}`);
  process.exitCode = 1;
};
const read = (path) => fs.readFileSync(path, "utf8");

const coordinatorPath = "src/services/public-content-refresh-coordinator.service.ts";
const coordinator = read(coordinatorPath);
const app = read("src/app.component.ts");
const home = read("src/pages/home-v71.component.ts");
const dynamic = read("src/components/dynamic-home-section.component.ts");
const realtime = read("src/services/public-content-realtime.service.ts");

const domainPaths = [
  "src/services/car.service.ts",
  "src/services/campaign.service.ts",
  "src/services/branch.service.ts",
  "src/services/homepage-layout.service.ts",
];

for (const path of domainPaths) {
  const source = read(path);
  for (const forbidden of [
    "setInterval(",
    "document.addEventListener(\"visibilitychange\"",
    "document.addEventListener('visibilitychange'",
    "window.addEventListener(\"online\"",
    "window.addEventListener('online'",
    "window.addEventListener(\"offline\"",
    "window.addEventListener('offline'",
  ]) {
    if (source.includes(forbidden)) fail(`${path} regained lifecycle polling ownership: ${forbidden}`);
  }
}

for (const required of [
  "class PublicContentRefreshCoordinatorService",
  'key: "catalog"',
  'key: "campaigns"',
  'key: "homepage"',
  'key: "branches"',
  "ACTIVE_CONTENT_CADENCE_MS = 60_000",
  "BRANCH_DIRECTORY_CADENCE_MS = 5 * 60_000",
  "Promise.allSettled",
  "window.setTimeout",
  "document.visibilityState",
  "navigator.onLine",
  'window.addEventListener("online"',
  'window.addEventListener("offline"',
  'document.addEventListener("visibilitychange"',
  "forceAfterCycle",
  "failureCounts",
  "withJitter",
]) {
  if (!coordinator.includes(required)) fail(`coordinator contract missing: ${required}`);
}

if (coordinator.includes("setInterval(")) fail("coordinator must use recursive setTimeout, not setInterval");
if ((coordinator.match(/window\.setTimeout\(/g) || []).length !== 1) fail("coordinator must own exactly one scheduling setTimeout");
for (const forbidden of ["refreshAdmin", "adminRemoteBranches", "branch-portal", "/admin/", "service_role", "SUPABASE_SERVICE_ROLE_KEY"]) {
  if (coordinator.includes(forbidden)) fail(`global public coordinator crossed a private/admin boundary: ${forbidden}`);
}

for (const required of [
  "refreshCloudCatalog(true)",
  "refreshPublicState()",
  "homepageLayout.refreshPublicState()",
  "branchService.refresh()",
]) {
  if (!coordinator.includes(required)) fail(`coordinator does not reconcile expected public domain: ${required}`);
}

if (!app.includes("injector.get(PublicContentRefreshCoordinatorService)")) fail("AppComponent must lazily instantiate the coordinator");
if (!app.includes("this.publicContentRefresh.start()")) fail("customer routes must start shared public refresh");
if (!app.includes("this.publicContentRefresh?.stop()")) fail("admin/branch portal routes must stop shared fallback polling");

const expectedSectionKeys = ["campaigns", "rental_featured", "sale_featured", "tour_featured", "branches", "partner", "blog_featured"];
for (const key of expectedSectionKeys) {
  if (!home.includes(`sectionKey:\"${key}\"`)) fail(`homepage fallback section missing: ${key}`);
}
if ((home.match(/sectionKey:\"(?:campaigns|rental_featured|sale_featured|tour_featured|branches|partner|blog_featured)\"/g) || []).length !== 7) {
  fail("homepage fallback must retain exactly seven managed public sections");
}

for (const forbidden of ["setInterval", "visibilitychange", "SUPABASE_PROJECT_URL", "/rest/v1/"]) {
  if (dynamic.includes(forbidden)) fail(`dynamic section component regained transport/timer ownership: ${forbidden}`);
}

if (!realtime.includes("postgres_changes")) fail("event-driven realtime must remain active while polling is only fallback reconciliation");
if (!realtime.includes("branches")) fail("public realtime table set must retain branch directory updates");

if (!process.exitCode) {
  console.log("V187 public content orchestration OK: four isolated domains, one lifecycle scheduler, seven dynamic home sections, branch-safe public scope.");
}
