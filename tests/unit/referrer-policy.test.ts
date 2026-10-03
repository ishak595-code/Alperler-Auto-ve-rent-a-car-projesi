import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { refererAllowed } from "../../workers/media/src/policy.ts";

const vercel = JSON.parse(fs.readFileSync("vercel.json", "utf8"));
const globalHeaders: Array<{ key: string; value: string }> =
  vercel.headers.find((rule: { source: string }) => rule.source === "/(.*)").headers;
const wrangler = fs.readFileSync("workers/media/wrangler.toml", "utf8");
const deployedAllowList = /ALLOWED_REFERER_HOSTS\s*=\s*"([^"]*)"/.exec(wrangler)?.[1] ?? "";

test("site sends no Referer on cross-origin requests (same-origin policy)", () => {
  assert.equal(globalHeaders.find((h) => h.key === "Referrer-Policy")?.value, "same-origin");
});

test("R2 Worker serves Referer-less requests, so media works on a future custom domain", () => {
  // What the browser sends to R2 under Referrer-Policy: same-origin.
  assert.equal(refererAllowed(null, deployedAllowList), true);
});

test("without the same-origin policy a new domain would be hotlink-blocked by the current Worker config", () => {
  // Documents why the policy matters: the deployed allow-list only knows the vercel.app host.
  assert.equal(refererAllowed("https://alperler-yeni-alan-adi.com.tr/", deployedAllowList), false);
  assert.equal(refererAllowed("https://alperler-auto-ve-rent-a-car-projesi.vercel.app/", deployedAllowList), true);
});
