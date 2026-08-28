import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const failures = [];

function read(path) {
  const full = join(root, path);
  if (!existsSync(full)) {
    failures.push(`Missing required file: ${path}`);
    return "";
  }
  return readFileSync(full, "utf8");
}

function walk(dir) {
  const result = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) result.push(...walk(full));
    else result.push(full);
  }
  return result;
}

const srcRoot = join(root, "src");
for (const full of walk(srcRoot)) {
  if (!full.endsWith(".ts")) continue;
  const source = readFileSync(full, "utf8");
  if (/select=\*/.test(source)) {
    failures.push(`Browser source must not use PostgREST select=*: ${relative(root, full)}`);
  }
}

const catalog = read("src/services/catalog.service.ts");
for (const contract of ["publicVehicleSelect", "publicTourSelect", "publicBlogSelect", "publicFaqSelect"]) {
  if (!catalog.includes(contract)) failures.push(`Catalog public projection is missing: ${contract}`);
}

const detail = read("src/services/public-detail-data.service.ts");
if (/vehicles\?[^`\n]*publication_status=eq\.PUBLISHED/.test(detail)) {
  failures.push("Vehicle detail visibility must be owned by database RLS, not a PUBLISHED client filter.");
}
if (/tours\?[^`\n]*publication_status=eq\.PUBLISHED/.test(detail)) {
  failures.push("Tour detail visibility must be owned by database RLS, not a PUBLISHED client filter.");
}
if (!detail.includes('isAvailable: row["is_active"] === true')) {
  failures.push("Tour detail availability must not reject RLS-visible scheduled tours.");
}

const legacyTour = read("src/services/tour-public-data-v170.service.ts");
if (/tours\?[^`\n]*publication_status=eq\.PUBLISHED/.test(legacyTour)) {
  failures.push("Legacy tour data service must not override database publication visibility.");
}
if (!legacyTour.includes('isAvailable: row["is_active"] === true')) {
  failures.push("Legacy tour mapping must preserve RLS-visible scheduled tours.");
}

const campaign = read("src/services/campaign.service.ts");
if (/campaigns\?[^`\n]*publication_status=eq\.PUBLISHED/.test(campaign)) {
  failures.push("Public campaign visibility must be owned by database RLS, not a PUBLISHED client filter.");
}
const loadPublicStart = campaign.indexOf("loadPublic(): Promise<CampaignRecord[]>");
const refreshPublicStart = campaign.indexOf("async refreshPublicState", loadPublicStart);
if (loadPublicStart >= 0 && refreshPublicStart > loadPublicStart) {
  const loadPublicBody = campaign.slice(loadPublicStart, refreshPublicStart);
  if (loadPublicBody.includes("inPublicWindow")) {
    failures.push("Campaign public loader must not duplicate DB start/end visibility logic.");
  }
} else {
  failures.push("Campaign public loader contract could not be located.");
}
if (!campaign.includes('item.publicationStatus === "SCHEDULED"')) {
  failures.push("Homepage campaign placement sync must retain scheduled campaigns before their start time.");
}

const layout = read("src/services/homepage-layout.service.ts");
if (!/homepage_sections\?[^`\n]*select=\$\{this\.publicSectionSelect\}/.test(layout)) {
  failures.push("Homepage sections must use the explicit publicSectionSelect projection regardless of query-parameter order.");
}
if (!/homepage_placements\?[^`\n]*select=\$\{this\.publicPlacementSelect\}/.test(layout)) {
  failures.push("Homepage placements must use the explicit publicPlacementSelect projection regardless of query-parameter order.");
}

const migration = read("supabase/migrations/20260828203000_v207_campaign_schedule_rls_and_anon_dml_hardening.sql");
if (!migration.includes("publication_status = 'SCHEDULED'")) failures.push("V207 campaign RLS migration must support elapsed scheduled publication.");
if (!migration.includes("revoke insert, update, delete on table public.vehicles from anon")) failures.push("V207 anonymous DML hardening is missing.");

const placementBackfill = read("supabase/migrations/20260828221500_v207_campaign_placement_window_backfill.sql");
for (const contract of [
  "hp.entity_id = c.id",
  "hp.starts_at is distinct from c.starts_at",
  "hp.ends_at is distinct from c.ends_at",
]) {
  if (!placementBackfill.includes(contract)) failures.push(`V207 campaign placement backfill contract is missing: ${contract}`);
}
if (/f[0-9a-f]{7}-[0-9a-f-]{27,}/i.test(placementBackfill)) {
  failures.push("V207 campaign placement backfill must not hardcode campaign identifiers.");
}

const privilegeHardening = read("supabase/migrations/20260829194500_v207_explicit_data_api_privilege_hardening.sql");
for (const contract of [
  "revoke select, insert, update, delete, truncate, references, trigger on table public.customer_profiles from anon",
  "revoke select, insert, update, delete, truncate, references, trigger on table public.customer_loyalty_accounts from anon",
  "revoke select, insert, update, delete, truncate, references, trigger on table public.customer_experience_preferences from anon",
  "revoke insert, update, delete, truncate, references, trigger on table public.navigation_items from anon",
  "revoke select, insert, update, delete, truncate, references, trigger on table public.vehicle_operations from anon",
  "grant select on table public.branch_subscription_plans to anon, authenticated",
  "grant update on table public.branch_subscription_plans to authenticated",
  "grant select, update on table public.branch_subscriptions to authenticated",
  "grant select on table public.branch_subscription_invoices to authenticated",
]) {
  if (!privilegeHardening.includes(contract)) failures.push(`V207 explicit Data API privilege contract is missing: ${contract}`);
}

if (failures.length) {
  console.error("V207 database source contract: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("V207 database source contract: PASS");
