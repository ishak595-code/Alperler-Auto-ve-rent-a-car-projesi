import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const failures = [];
const read = (path) => {
  const full = join(root, path);
  if (!existsSync(full)) {
    failures.push(`Missing required file: ${path}`);
    return "";
  }
  return readFileSync(full, "utf8");
};

const workflowDir = join(root, ".github", "workflows");
const workflowFiles = readdirSync(workflowDir).filter((name) => /\.ya?ml$/i.test(name));
for (const name of workflowFiles) {
  const source = read(`.github/workflows/${name}`);
  if (/\bpull_request_target\s*:/.test(source)) failures.push(`Unsafe pull_request_target trigger is forbidden: ${name}`);
  if (/permissions\s*:\s*write-all/.test(source)) failures.push(`write-all workflow permission is forbidden: ${name}`);
}

for (const name of [
  "alperler-quality-gate.yml",
  "v205-responsive-prestige.yml",
  "v206-production-handoff-portability.yml",
  "v207-customer-experience.yml",
  "v207-database-source-contract.yml",
  "v208-repository-governance.yml",
]) {
  const source = read(`.github/workflows/${name}`);
  if (!source.includes("\nconcurrency:\n")) failures.push(`Critical workflow must define native concurrency: ${name}`);
  if (!source.includes("cancel-in-progress: true")) failures.push(`Critical workflow must cancel stale runs: ${name}`);
}

const governorWorkflow = read(".github/workflows/v208-repository-governance.yml");
for (const contract of [
  "actions: write",
  "github.event.pull_request.head.repo.full_name == github.repository",
  "scripts/cancel-stale-pr-workflows.mjs",
]) {
  if (!governorWorkflow.includes(contract)) failures.push(`V208 stale-run governor contract is missing: ${contract}`);
}

const cancelScript = read("scripts/cancel-stale-pr-workflows.mjs");
for (const contract of ["run.head_sha === currentSha", "pull_requests", "/cancel", "headRepository !== repository"]) {
  if (!cancelScript.includes(contract)) failures.push(`Stale-run cancellation safety contract is missing: ${contract}`);
}

const tourAdapter = read("src/services/tour-public-data-v170.service.ts");
for (const forbidden of ["SUPABASE_PROJECT_URL", "SUPABASE_PUBLISHABLE_KEY", "fetch("]) {
  if (tourAdapter.includes(forbidden)) failures.push(`V170 tour adapter reopened a parallel database source: ${forbidden}`);
}
for (const required of ["inject(CarService)", "refreshCloudCatalog(true)", "getTours()"] ) {
  if (!tourAdapter.includes(required)) failures.push(`V170 tour adapter must delegate to canonical CarService: ${required}`);
}

const packageJson = read("package.json");
if (!packageJson.includes('"repository-governance:v208"')) failures.push("package.json must expose repository-governance:v208");
if (!packageJson.includes("npm run repository-governance:v208 &&")) failures.push("verify:handoff must run V208 repository governance first");

read("docs/REPOSITORY_GOVERNANCE_V208.md");

if (failures.length) {
  console.error("V208 repository governance: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`V208 repository governance: PASS (${workflowFiles.length} workflows audited).`);
