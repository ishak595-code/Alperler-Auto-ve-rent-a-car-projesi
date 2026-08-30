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

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const retryableStatuses = new Set([429, 500, 502, 503, 504]);

const api = async (path, init = {}, options = {}) => {
  const maxAttempts = Math.max(1, Number(options.maxAttempts || 4));

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let response;
    try {
      response = await fetch(`https://api.github.com/repos/${owner}/${repo}${path}`, {
        ...init,
        headers: {
          accept: "application/vnd.github+json",
          authorization: `Bearer ${token}`,
          "x-github-api-version": "2022-11-28",
          ...(init.headers || {}),
        },
      });
    } catch (error) {
      if (attempt >= maxAttempts) throw error;
      const delayMs = Math.min(4000, 250 * (2 ** (attempt - 1)));
      console.warn(`GitHub API network error for ${path}; retrying in ${delayMs}ms (${attempt}/${maxAttempts}).`);
      await sleep(delayMs);
      continue;
    }

    const body = await response.text().catch(() => "");
    if (response.ok) return body ? JSON.parse(body) : null;

    if (retryableStatuses.has(response.status) && attempt < maxAttempts) {
      const retryAfterSeconds = Number(response.headers.get("retry-after") || 0);
      const delayMs = retryAfterSeconds > 0
        ? Math.min(10000, retryAfterSeconds * 1000)
        : Math.min(4000, 250 * (2 ** (attempt - 1)));
      console.warn(`GitHub API ${response.status} for ${path}; retrying in ${delayMs}ms (${attempt}/${maxAttempts}).`);
      await sleep(delayMs);
      continue;
    }

    const failure = new Error(`GitHub API ${response.status}: ${body.slice(0, 500)}`);
    failure.status = response.status;
    throw failure;
  }

  throw new Error(`GitHub API retry budget exhausted for ${path}`);
};

const cancellable = new Set(["queued", "in_progress", "waiting", "pending", "requested"]);
let cancelled = 0;
let completedBeforeCancellation = 0;
let transientCancellationFailures = 0;

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
      const status = Number(error?.status || 0);
      if (status === 409 || /cannot be cancelled|already completed/i.test(message)) {
        completedBeforeCancellation += 1;
        console.log(`Run ${run.id} completed before cancellation.`);
        continue;
      }
      if (retryableStatuses.has(status) || /network|fetch failed|retry budget exhausted/i.test(message)) {
        transientCancellationFailures += 1;
        console.warn(`Could not cancel stale run ${run.id} after bounded retries; continuing because this is cleanup-only. ${message}`);
        continue;
      }
      throw error;
    }
  }

  if (runs.length < 100) break;
}

console.log(
  `Stale-run governor complete. Cancelled ${cancelled} run(s), ${completedBeforeCancellation} completed before cancellation, `
  + `${transientCancellationFailures} transient cancellation failure(s). Current SHA: ${currentSha}.`,
);
