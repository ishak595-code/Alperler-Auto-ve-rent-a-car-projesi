const token = process.env.GITHUB_TOKEN;
const repository = String(process.env.GITHUB_REPOSITORY || "").trim();
const currentSha = String(process.env.CURRENT_HEAD_SHA || "").trim();
const prNumber = Number(process.env.PR_NUMBER || 0);
const headRepository = String(process.env.PR_HEAD_REPOSITORY || "").trim();

if (!token) throw new Error("GITHUB_TOKEN is required");
if (!repository || !currentSha || !Number.isInteger(prNumber) || prNumber <= 0) {
  throw new Error("Repository, current head SHA and PR number are required");
}
if (headRepository !== repository) {
  console.log("Stale-run governor skipped for a fork pull request.");
  process.exit(0);
}

const [owner, repo] = repository.split("/");
if (!owner || !repo) throw new Error("GITHUB_REPOSITORY must be owner/repo");

const api = async (path, init = {}) => {
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}${path}`, {
    ...init,
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token}`,
      "x-github-api-version": "2022-11-28",
      ...(init.headers || {}),
    },
  });
  const body = await response.text().catch(() => "");
  if (!response.ok) throw new Error(`GitHub API ${response.status}: ${body.slice(0, 500)}`);
  return body ? JSON.parse(body) : null;
};

const cancellable = new Set(["queued", "in_progress", "waiting", "pending", "requested"]);
let cancelled = 0;

for (let page = 1; page <= 20; page += 1) {
  const payload = await api(`/actions/runs?event=pull_request&per_page=100&page=${page}`);
  const runs = Array.isArray(payload?.workflow_runs) ? payload.workflow_runs : [];

  for (const run of runs) {
    if (!run || !cancellable.has(run.status) || run.head_sha === currentSha) continue;
    const belongsToPullRequest = Array.isArray(run.pull_requests)
      && run.pull_requests.some((pull) => Number(pull?.number) === prNumber);
    if (!belongsToPullRequest) continue;

    try {
      await api(`/actions/runs/${run.id}/cancel`, { method: "POST" });
      cancelled += 1;
      console.log(`Cancelled stale run ${run.id} (${run.name || "workflow"}) at ${run.head_sha}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/409|cannot be cancelled|already completed/i.test(message)) {
        console.log(`Run ${run.id} completed before cancellation.`);
        continue;
      }
      throw error;
    }
  }

  if (runs.length < 100) break;
}

console.log(`Stale-run governor complete. Cancelled ${cancelled} run(s). Current SHA: ${currentSha}.`);
