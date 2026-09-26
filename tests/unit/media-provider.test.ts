/**
 * V252 provider-agnostic media storage — unit tests (node:test + tsx, no network).
 * Run: npm run test:media
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { presignUrl, presignPut, r2ConfigFrom, checkR2File, signedHeaders, isSafeStem, R2_IMAGE_WIDTHS as SERVER_WIDTHS } from "../../api/_lib/r2.ts";
import { resolveMediaProvider } from "../../api/_lib/media-provider.ts";
import { authzForKey, targetFrom } from "../../api/_lib/media-upload.ts";
import { resolveMediaProviderFromEnv } from "../../scripts/media-provider-env.mjs";
import { signR2Request } from "../../scripts/r2-sigv4.mjs";
import {
  R2_IMAGE_WIDTHS,
  isR2VariantUrl,
  r2ImageUrl,
  r2MediaUrl,
  r2PosterUrl,
  r2Srcset,
  r2VideoUrl,
  readActiveMediaProvider,
  withR2Width,
} from "../../src/utils/r2-media.ts";
import { responsiveSrcset, responsiveUrl } from "../../src/utils/responsive-media.ts";
import { variantSize } from "../../src/utils/image-variants.ts";

const R2_ENV = {
  R2_ACCOUNT_ID: "0123456789abcdef0123456789abcdef",
  R2_ACCESS_KEY_ID: "AKIAEXAMPLEEXAMPLE12",
  R2_SECRET_ACCESS_KEY: "secret-secret-secret-secret-secret-secret",
  R2_BUCKET: "alperler-media",
  R2_PUBLIC_BASE_URL: "https://alperler-media.example.workers.dev/",
};
const CLD_ENV = { CLOUDINARY_CLOUD_NAME: "demo", CLOUDINARY_API_KEY: "k", CLOUDINARY_API_SECRET: "s" };
const BASE = "https://alperler-media.example.workers.dev";
const STEM = "alperler/catalog/vehicle/11111111-2222-4333-8444-555555555555/0123456789abcdef0123456789abcdef";

test("SigV4 presign matches the AWS documented example", () => {
  const url = presignUrl({
    method: "GET",
    host: "examplebucket.s3.amazonaws.com",
    path: "/test.txt",
    accessKeyId: "AKIAIOSFODNN7EXAMPLE",
    secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    region: "us-east-1",
    service: "s3",
    expiresSeconds: 86400,
    now: new Date("2013-05-24T00:00:00Z"),
  });
  assert.match(url, /X-Amz-Signature=aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404$/);
  assert.match(url, /X-Amz-Credential=AKIAIOSFODNN7EXAMPLE%2F20130524%2Fus-east-1%2Fs3%2Faws4_request/);
});

test("R2 config requires all five variables and normalizes the public base", () => {
  assert.equal(r2ConfigFrom({}).configured, false);
  const partial = { ...R2_ENV, R2_SECRET_ACCESS_KEY: "" };
  assert.equal(r2ConfigFrom(partial).configured, false);
  assert.equal(r2ConfigFrom({ ...R2_ENV, R2_PUBLIC_BASE_URL: "http://insecure.example" }).configured, false);
  const config = r2ConfigFrom(R2_ENV);
  assert.equal(config.configured, true);
  assert.equal(config.publicBaseUrl, BASE);
  assert.equal(config.endpoint, `https://${R2_ENV.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`);
});

test("provider resolution: auto prefers r2, then cloudinary, then supabase; TS and script agree", () => {
  const cases: Array<[Record<string, string>, string]> = [
    [{}, "supabase"],
    [CLD_ENV, "cloudinary"],
    [R2_ENV, "r2"],
    [{ ...CLD_ENV, ...R2_ENV }, "r2"],
    [{ ...CLD_ENV, ...R2_ENV, MEDIA_PROVIDER: "cloudinary" }, "cloudinary"],
    [{ ...CLD_ENV, ...R2_ENV, MEDIA_PROVIDER: "supabase" }, "supabase"],
    [{ ...CLD_ENV, MEDIA_PROVIDER: "r2" }, "cloudinary"],
    [{ MEDIA_PROVIDER: "cloudinary" }, "supabase"],
    [{ ...R2_ENV, MEDIA_PROVIDER: "auto" }, "r2"],
    [{ ...CLD_ENV, ...R2_ENV, R2_BUCKET: "" }, "cloudinary"],
  ];
  for (const [env, expected] of cases) {
    assert.equal(resolveMediaProvider(env), expected, JSON.stringify(Object.keys(env)));
    assert.equal(resolveMediaProviderFromEnv(env).provider, expected, `script mirror ${JSON.stringify(Object.keys(env))}`);
  }
  assert.equal(resolveMediaProviderFromEnv(R2_ENV).r2Base, BASE);
});

test("presigned PUT signs host + content-type + content-length and returns the public URL", () => {
  const put = presignPut(r2ConfigFrom(R2_ENV), STEM, { name: "w480.webp", contentType: "image/webp", bytes: 1234 }, new Date("2026-09-26T10:00:00Z"));
  assert.equal(put.key, `${STEM}/w480.webp`);
  assert.equal(put.publicUrl, `${BASE}/${STEM}/w480.webp`);
  assert.match(put.url, /^https:\/\/0123456789abcdef0123456789abcdef\.r2\.cloudflarestorage\.com\/alperler-media\/alperler\/catalog\//);
  assert.match(put.url, /X-Amz-SignedHeaders=content-length%3Bcontent-type%3Bhost/);
  assert.match(put.url, /X-Amz-Expires=900/);
  assert.ok(!put.url.includes(R2_ENV.R2_SECRET_ACCESS_KEY));
  assert.throws(() => presignPut(r2ConfigFrom(R2_ENV), "../escape", { name: "w480.webp", contentType: "image/webp", bytes: 1 }));
});

test("R2 file validation: fixed names, matching type, size caps, no video for image-only scopes", () => {
  assert.deepEqual(checkR2File({ name: "w1440.webp", contentType: "image/webp", bytes: 10 }, false), { ok: true });
  assert.deepEqual(checkR2File({ name: "w1440.jpg", contentType: "image/jpeg", bytes: 10 }, false), { ok: true });
  assert.equal(checkR2File({ name: "w1440.webp", contentType: "image/png", bytes: 10 }, false).ok, false);
  assert.equal(checkR2File({ name: "w999.webp", contentType: "image/webp", bytes: 10 }, false).ok, false);
  assert.equal(checkR2File({ name: "../x.webp", contentType: "image/webp", bytes: 10 }, false).ok, false);
  assert.equal(checkR2File({ name: "video.mp4", contentType: "video/mp4", bytes: 10 }, false).ok, false);
  assert.deepEqual(checkR2File({ name: "video.mp4", contentType: "video/mp4", bytes: 10 }, true), { ok: true });
  const big = checkR2File({ name: "w480.webp", contentType: "image/webp", bytes: 50 * 1024 * 1024 }, false);
  assert.equal(big.ok, false);
  assert.equal(!big.ok && big.code, "MEDIA_IMAGE_TOO_LARGE");
  assert.equal(checkR2File({ name: "w480.webp", contentType: "image/webp", bytes: 0 }, false).ok, false);
});

test("upload targets map to owner-prefixed folders and the right authorization", () => {
  const vehicle = targetFrom({ scope: "catalog", entityType: "VEHICLE", entityId: "11111111-2222-4333-8444-555555555555" });
  assert.equal(vehicle.folder, "alperler/catalog/vehicle/11111111-2222-4333-8444-555555555555");
  assert.deepEqual(vehicle.authz, { kind: "owner", vehicleId: "11111111-2222-4333-8444-555555555555" });
  assert.equal(targetFrom({ scope: "catalog", entityType: "BLOG", entityId: "11111111-2222-4333-8444-555555555555" }).authz.kind, "content");
  const branch = targetFrom({ scope: "branch", branchId: "11111111-2222-4333-8444-555555555555" });
  assert.equal(branch.folder, "alperler/branch/11111111-2222-4333-8444-555555555555");
  assert.equal(branch.allowVideo, true);
  const draft = targetFrom({ scope: "branch", branchId: "11111111-2222-4333-8444-555555555555", purpose: "vehicle-draft" });
  assert.equal(draft.folder, "alperler/branch/11111111-2222-4333-8444-555555555555/vehicle-draft");
  assert.equal(draft.allowVideo, false);
  assert.equal(targetFrom({ scope: "admin", entityType: "SITE_CONFIG", entityId: "logo", purpose: "logo" }).folder, "alperler/admin/site_config/logo/logo");
  assert.equal(targetFrom({ scope: "ops", vehicleId: "ABC-1" }).authz.kind, "ops");
  assert.throws(() => targetFrom({ scope: "catalog", entityType: "VEHICLE", entityId: "not-a-uuid" }));
  assert.throws(() => targetFrom({ scope: "nope" }));
});

test("rollback keys re-derive the authorization of the scope that created them", () => {
  assert.deepEqual(authzForKey(STEM), { kind: "owner", vehicleId: "11111111-2222-4333-8444-555555555555" });
  assert.deepEqual(authzForKey("alperler/branch/11111111-2222-4333-8444-555555555555/vehicle-draft/0123456789abcdef"), { kind: "owner", branchId: "11111111-2222-4333-8444-555555555555" });
  assert.deepEqual(authzForKey("alperler/admin/site_config/logo/logo/0123456789abcdef"), { kind: "content" });
  assert.deepEqual(authzForKey("alperler/ops/inspection/abc-1/0123456789abcdef"), { kind: "ops" });
  assert.equal(authzForKey("alperler/catalog/vehicle/11111111-2222-4333-8444-555555555555/../x"), null);
  assert.equal(authzForKey("other/prefix/x"), null);
  assert.equal(isSafeStem(STEM), true);
  assert.equal(isSafeStem("alperler/x/../y"), false);
});

test("script SigV4 twin produces the same Authorization header as the API helper", () => {
  const url = new URL(`https://${R2_ENV.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/alperler-media?list-type=2&prefix=${encodeURIComponent(STEM + "/")}`);
  const now = new Date("2026-09-26T10:00:00Z");
  const api = signedHeaders({ method: "GET", url, accessKeyId: R2_ENV.R2_ACCESS_KEY_ID, secretAccessKey: R2_ENV.R2_SECRET_ACCESS_KEY, now });
  const script = signR2Request({ method: "GET", url, accessKeyId: R2_ENV.R2_ACCESS_KEY_ID, secretAccessKey: R2_ENV.R2_SECRET_ACCESS_KEY, now });
  assert.equal(script.authorization, api.authorization);
});

test("R2 delivery helpers: fixed widths, srcset only for our variant URLs", () => {
  assert.deepEqual([...R2_IMAGE_WIDTHS], [...SERVER_WIDTHS]);
  assert.equal(r2ImageUrl(BASE, STEM), `${BASE}/${STEM}/w1440.webp`);
  assert.equal(r2ImageUrl(BASE, STEM, 700), `${BASE}/${STEM}/w768.webp`);
  assert.equal(r2ImageUrl(BASE, STEM, 5000, "jpg"), `${BASE}/${STEM}/w1920.jpg`);
  assert.equal(r2VideoUrl(BASE, STEM, "webm"), `${BASE}/${STEM}/video.webm`);
  assert.equal(r2ImageUrl("http://x", STEM), "");
  const meta = { r2: { publicBaseUrl: BASE, variantExt: "webp", videoExt: "mp4" } };
  assert.equal(r2MediaUrl(STEM, "IMAGE", meta), `${BASE}/${STEM}/w1440.webp`);
  assert.equal(r2MediaUrl(STEM, "VIDEO", meta), `${BASE}/${STEM}/video.mp4`);
  assert.equal(r2PosterUrl(STEM, meta), `${BASE}/${STEM}/w1080.webp`);
  const url = `${BASE}/${STEM}/w1440.webp`;
  assert.equal(isR2VariantUrl(url), true);
  assert.equal(withR2Width(url, 480), `${BASE}/${STEM}/w480.webp`);
  const srcset = r2Srcset(url);
  assert.equal(srcset.split(", ").length, 5);
  assert.ok(srcset.startsWith(`${BASE}/${STEM}/w480.webp 480w`));
  assert.equal(r2Srcset("https://hrztrgjvgdnaurejnsgs.supabase.co/storage/v1/object/public/catalog-media/vehicle/x.jpg"), "");
  assert.equal(responsiveSrcset(url), srcset);
  assert.ok(responsiveSrcset("https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_1440/alperler/catalog/x").includes("w_480"));
  assert.equal(responsiveSrcset("/assets/car-placeholder.jpg"), "");
  assert.equal(responsiveUrl("/catalog-media/a.jpg", 480), "/catalog-media/a.jpg");
});

test("browser provider flag: MEDIA_PROVIDER wins, legacy runtime-env falls back to V249 behaviour", () => {
  assert.equal(readActiveMediaProvider({ MEDIA_PROVIDER: "r2" }), "r2");
  assert.equal(readActiveMediaProvider({ MEDIA_PROVIDER: "supabase", CLOUDINARY_CLOUD_NAME: "demo" }), "supabase");
  assert.equal(readActiveMediaProvider({ CLOUDINARY_CLOUD_NAME: "demo" }), "cloudinary");
  assert.equal(readActiveMediaProvider({}), "supabase");
});

test("variant sizes never upscale", () => {
  assert.deepEqual(variantSize(4000, 3000, 1440), { width: 1440, height: 1080 });
  assert.deepEqual(variantSize(800, 600, 1920), { width: 800, height: 600 });
});
