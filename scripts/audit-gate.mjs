#!/usr/bin/env node
/**
 * Dependency vulnerability gate (V257).
 *
 * Replaces a bare `npm audit --audit-level=high` in CI so that one advisory with NO published
 * fix cannot freeze every pull request, while everything else stays as strict as before:
 *
 *   1. Production dependencies (`npm audit --omit=dev`) must be completely free of high and
 *      critical advisories. No exception applies to code that ships to customers.
 *   2. The full tree (including build tooling) may contain a high or critical advisory only if
 *      it is listed in ACCEPTED below, with a reason and an expiry date. After the expiry date
 *      the gate fails again, so every exception is re-evaluated instead of forgotten.
 *
 * Remove an entry as soon as a patched version exists and bump the dependency instead.
 */
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export const ACCEPTED = [
  {
    id: "GHSA-ch52-4w7c-c8xp",
    package: "http-cache-semantics",
    expires: "2026-11-03",
    reason:
      "Affects every published version (<=4.2.0 is the latest), so no upgrade or override can fix it yet. " +
      "Reached only through @angular/cli -> pacote -> make-fetch-happen, the package fetcher used by the build " +
      "tooling on developer and CI machines. It is not part of the production dependency tree or the shipped site.",
  },
];

const BLOCKING = new Set(["high", "critical"]);

function advisoryId(via) {
  const match = /GHSA-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}/i.exec(String(via?.url || ""));
  return match ? match[0] : `npm:${via?.source ?? "unknown"}`;
}

/** Root-cause advisories (object `via` entries) at high or critical severity, de-duplicated. */
export function blockingAdvisories(report) {
  const found = new Map();
  for (const entry of Object.values(report?.vulnerabilities || {})) {
    for (const via of entry?.via || []) {
      if (!via || typeof via !== "object" || !BLOCKING.has(String(via.severity))) continue;
      const id = advisoryId(via);
      if (!found.has(id)) found.set(id, { id, package: String(via.name || ""), severity: String(via.severity), title: String(via.title || "") });
    }
  }
  return [...found.values()];
}

/** Pure decision used by the CLI and the unit tests. */
export function evaluate({ production, full, accepted = ACCEPTED, today = new Date() }) {
  const day = today.toISOString().slice(0, 10);
  const failures = [];
  for (const advisory of blockingAdvisories(production)) {
    failures.push(`production dependency ${advisory.package}: ${advisory.id} (${advisory.severity}) ${advisory.title}`);
  }
  const waived = [];
  for (const advisory of blockingAdvisories(full)) {
    const rule = accepted.find((item) => item.id.toLowerCase() === advisory.id.toLowerCase() && item.package === advisory.package);
    if (!rule) {
      if (!failures.some((line) => line.includes(advisory.id))) failures.push(`${advisory.package}: ${advisory.id} (${advisory.severity}) ${advisory.title}`);
    } else if (day > rule.expires) {
      failures.push(`${advisory.package}: accepted advisory ${advisory.id} expired on ${rule.expires}; upgrade if a fix exists or renew the entry with a fresh review`);
    } else {
      waived.push({ ...advisory, expires: rule.expires });
    }
  }
  return { ok: failures.length === 0, failures, waived };
}

function audit(args) {
  const result = spawnSync("npm", ["audit", "--json", ...args], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  try {
    return JSON.parse(result.stdout);
  } catch {
    throw new Error(`npm audit did not return JSON (${String(result.stderr || result.stdout).slice(0, 300)})`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  const outcome = evaluate({ production: audit(["--omit=dev"]), full: audit([]) });
  for (const item of outcome.waived) {
    console.log(`Accepted until ${item.expires}: ${item.package} ${item.id} (${item.severity}, build tooling only, no fix published).`);
  }
  if (!outcome.ok) {
    console.error("Dependency vulnerability gate: FAIL");
    for (const failure of outcome.failures) console.error(` - ${failure}`);
    process.exit(1);
  }
  console.log(`Dependency vulnerability gate: PASS (production tree clean; ${outcome.waived.length} time-boxed build-tooling exception(s)).`);
}
