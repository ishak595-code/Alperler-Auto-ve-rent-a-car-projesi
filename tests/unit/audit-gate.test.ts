import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluate } from "../../scripts/audit-gate.mjs";

const advisory = (name: string, ghsa: string, severity = "high") => ({
  source: 1, name, title: `${name} issue`, url: `https://github.com/advisories/${ghsa}`, severity, range: "*",
});
const report = (...entries: Array<ReturnType<typeof advisory>>) => ({
  vulnerabilities: Object.fromEntries(entries.map((via) => [via.name, { name: via.name, severity: via.severity, via: [via] }])),
});
const clean = { vulnerabilities: {} };
const accepted = [{ id: "GHSA-aaaa-bbbb-cccc", package: "tooling-lib", expires: "2026-11-03", reason: "no fix published" }];
const today = new Date("2026-10-03T00:00:00Z");

test("clean trees pass", () => {
  assert.equal(evaluate({ production: clean, full: clean, accepted, today }).ok, true);
});

test("an accepted build-tooling advisory passes and is reported as waived", () => {
  const outcome = evaluate({ production: clean, full: report(advisory("tooling-lib", "GHSA-aaaa-bbbb-cccc")), accepted, today });
  assert.equal(outcome.ok, true);
  assert.equal(outcome.waived.length, 1);
});

test("the same advisory in the production tree always fails", () => {
  const hit = report(advisory("tooling-lib", "GHSA-aaaa-bbbb-cccc"));
  assert.equal(evaluate({ production: hit, full: hit, accepted, today }).ok, false);
});

test("an unlisted high or critical advisory fails", () => {
  assert.equal(evaluate({ production: clean, full: report(advisory("other", "GHSA-dddd-eeee-ffff")), accepted, today }).ok, false);
  assert.equal(evaluate({ production: clean, full: report(advisory("other", "GHSA-dddd-eeee-ffff", "critical")), accepted, today }).ok, false);
});

test("an accepted id on a different package does not match", () => {
  assert.equal(evaluate({ production: clean, full: report(advisory("another-lib", "GHSA-aaaa-bbbb-cccc")), accepted, today }).ok, false);
});

test("an expired exception fails again", () => {
  const outcome = evaluate({ production: clean, full: report(advisory("tooling-lib", "GHSA-aaaa-bbbb-cccc")), accepted, today: new Date("2026-11-04T00:00:00Z") });
  assert.equal(outcome.ok, false);
  assert.match(outcome.failures[0], /expired/);
});

test("moderate and low advisories do not block, as with --audit-level=high", () => {
  assert.equal(evaluate({ production: clean, full: report(advisory("minor", "GHSA-gggg-hhhh-iiii", "moderate")), accepted, today }).ok, true);
});
