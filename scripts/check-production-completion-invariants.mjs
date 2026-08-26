import fs from 'node:fs';

const fail = (message) => {
  console.error(`PRODUCTION_COMPLETION_FAIL: ${message}`);
  process.exitCode = 1;
};

const branchService = fs.readFileSync('src/services/branch.service.ts', 'utf8');
const branchPublic = fs.readFileSync('src/services/branch-public-v171.service.ts', 'utf8');
const coordinator = fs.readFileSync('src/services/public-content-refresh-coordinator.service.ts', 'utf8');
const campaignsPage = fs.readFileSync('src/pages/campaigns.component.ts', 'utf8');
const vercel = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));

if (branchService.includes('void this.refreshPublic();')) fail('BranchService must not self-fetch public branches in its constructor');
if (!branchService.includes('PUBLIC_BRANCH_COALESCE_MS')) fail('BranchService public freshness coalescing is missing');
if (!branchService.includes('publicRefreshInFlight')) fail('BranchService in-flight request coalescing is missing');
if (!branchService.includes('refreshPublic(false, true)')) fail('Branch mutation/realtime paths must be able to bypass the short freshness cache');

if (branchPublic.includes('/api/branches')) fail('BranchPublicV171Service must not bypass the shared BranchService cache');
if (!branchPublic.includes('private readonly branchService:BranchService')) fail('BranchPublicV171Service must depend on shared BranchService');
if (!branchPublic.includes('await this.branchService.refresh()')) fail('BranchPublicV171Service must reuse the shared branch refresh path');

if (campaignsPage.includes('campaignService.loadPublic()')) fail('Campaigns page must not start a duplicate public campaign fetch');

if (!coordinator.includes('task.key === "catalog" ? now + task.cadenceMs : now')) fail('Coordinator must avoid a second catalog startup cycle while CarService owns initial hydration');
if (!coordinator.includes('void this.runCycle(false, "start")')) fail('Coordinator startup must honor per-domain due times instead of force-refreshing every domain');
if (!coordinator.includes('run: () => this.carService.refreshCloudCatalog(true)')) fail('Scheduled/reconnect catalog reconciliation must still force a fresh catalog cycle');

const ignoreCommand = String(vercel.ignoreCommand || '');
if (!ignoreCommand.includes('VERCEL_GIT_PREVIOUS_SHA')) fail('Vercel build gating must fail safe when previous SHA is unavailable');
for (const token of ['supabase/', 'docs/', '\\.github/', 'scripts/']) {
  if (!ignoreCommand.includes(token)) fail(`Vercel infra-only allowlist missing ${token}`);
}
if (!ignoreCommand.includes('exit 1') || !ignoreCommand.includes('exit 0')) fail('Vercel ignoreCommand must explicitly distinguish build and skip exits');

if (!process.exitCode) console.log('Production completion invariants passed: public refresh deduplication and Vercel build gating are protected.');
