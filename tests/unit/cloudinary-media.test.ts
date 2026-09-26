/**
 * V249 Cloudinary media — unit tests (node:test + tsx, no browser needed).
 * Run: npm run test:cloudinary
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

import {
  CLOUDINARY_IMAGE_WIDTHS,
  cloudNameForRow,
  cloudinaryImageUrl,
  cloudinaryMediaUrl,
  cloudinarySizeViolation,
  cloudinarySrcset,
  cloudinaryVideoPosterUrl,
  cloudinaryVideoUrl,
  nearestCloudinaryWidth,
  readCloudinaryCloudName,
  withCloudinaryWidth,
} from "../../src/utils/cloudinary-media.ts";
import {
  adminFolder,
  catalogFolder,
  cloudinaryConfig,
  isSafePublicId,
  signCloudinaryParams,
  signUpload,
} from "../../api/_lib/cloudinary.ts";

const PID = "alperler/catalog/vehicle/0b7c1f4e-2a4d-4c1e-9f7a-1d2e3f4a5b6c/7d1c";

test("image URL uses f_auto,q_auto and a fixed width", () => {
  assert.equal(
    cloudinaryImageUrl("demo", PID, 1080),
    `https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_1080/${PID}`,
  );
});

test("widths snap to the small fixed set (never arbitrary breakpoints)", () => {
  assert.deepEqual([...CLOUDINARY_IMAGE_WIDTHS], [480, 768, 1080, 1440, 1920]);
  assert.equal(nearestCloudinaryWidth(1), 480);
  assert.equal(nearestCloudinaryWidth(500), 768);
  assert.equal(nearestCloudinaryWidth(1440), 1440);
  assert.equal(nearestCloudinaryWidth(5000), 1920);
  assert.equal(nearestCloudinaryWidth(Number.NaN), 1440);
});

test("video URL uses q_auto,vc_auto", () => {
  assert.equal(cloudinaryVideoUrl("demo", PID), `https://res.cloudinary.com/demo/video/upload/q_auto,vc_auto/${PID}.mp4`);
  assert.equal(cloudinaryMediaUrl("demo", PID, "VIDEO"), cloudinaryVideoUrl("demo", PID));
  assert.match(cloudinaryVideoPosterUrl("demo", PID), /\/video\/upload\/so_0,f_auto,q_auto,w_1080\/.+\.jpg$/);
});

test("invalid cloud name or empty public id yields no URL", () => {
  assert.equal(cloudinaryImageUrl("", PID), "");
  assert.equal(cloudinaryImageUrl("bad name!", PID), "");
  assert.equal(cloudinaryVideoUrl("demo", ""), "");
});

test("withCloudinaryWidth only rewrites our Cloudinary URLs", () => {
  const url = cloudinaryImageUrl("demo", PID, 1920);
  assert.equal(withCloudinaryWidth(url, 480), cloudinaryImageUrl("demo", PID, 480));
  const supabase = "https://hrztrgjvgdnaurejnsgs.supabase.co/storage/v1/object/public/catalog-media/vehicle/x/y.webp";
  assert.equal(withCloudinaryWidth(supabase, 480), supabase);
  assert.equal(withCloudinaryWidth("/catalog-media/vehicle/x/y.webp", 480), "/catalog-media/vehicle/x/y.webp");
});

test("srcset lists the fixed widths for Cloudinary URLs and nothing otherwise", () => {
  const srcset = cloudinarySrcset(cloudinaryImageUrl("demo", PID));
  assert.equal(srcset.split(", ").length, 5);
  assert.match(srcset, /w_480\/.+ 480w/);
  assert.equal(cloudinarySrcset("/catalog-media/a.webp"), "");
});

test("row cloud name wins over runtime; runtime env disabled outside the browser", () => {
  assert.equal(readCloudinaryCloudName(), "");
  assert.equal(cloudNameForRow({ cloudinary: { cloudName: "rowcloud" } }, "runtime"), "rowcloud");
  assert.equal(cloudNameForRow({}, "runtime"), "runtime");
  assert.equal(cloudNameForRow(null, ""), "");
});

test("free plan caps: 10 MB image, 100 MB video", () => {
  assert.equal(cloudinarySizeViolation(10 * 1024 * 1024, "image/webp"), "");
  assert.equal(cloudinarySizeViolation(10 * 1024 * 1024 + 1, "image/webp"), "image");
  assert.equal(cloudinarySizeViolation(100 * 1024 * 1024, "video/mp4"), "");
  assert.equal(cloudinarySizeViolation(100 * 1024 * 1024 + 1, "video/mp4"), "video");
});

test("signature follows the Cloudinary algorithm (sorted params + secret, SHA-256)", () => {
  // Documented Cloudinary example string; SHA-256 digest (Cloudinary accepts SHA-1 or SHA-256).
  const expected = createHash("sha256").update("eager=w_400,h_300,c_pad|w_260,h_200,c_crop&public_id=sample_image&timestamp=1315060510abcd").digest("hex");
  const actual = signCloudinaryParams({ timestamp: 1315060510, public_id: "sample_image", eager: "w_400,h_300,c_pad|w_260,h_200,c_crop", api_key: "ignored", file: "ignored", resource_type: "ignored" }, "abcd");
  assert.equal(actual, expected);
  assert.equal(actual, "cc927e1290f9e3ae4c1a741eda21a4630b4ce80f9ce0bc0296337d25cf40f91e");
});

test("server config is env-gated (all three variables required)", () => {
  const saved = { ...process.env };
  try {
    delete process.env.CLOUDINARY_CLOUD_NAME;
    delete process.env.CLOUDINARY_API_KEY;
    delete process.env.CLOUDINARY_API_SECRET;
    assert.equal(cloudinaryConfig().configured, false);
    process.env.CLOUDINARY_CLOUD_NAME = "demo";
    process.env.CLOUDINARY_API_KEY = "123";
    assert.equal(cloudinaryConfig().configured, false);
    process.env.CLOUDINARY_API_SECRET = "s3cr3t";
    const config = cloudinaryConfig();
    assert.equal(config.configured, true);
    const signed = signUpload(config, catalogFolder("VEHICLE", "0B7C1F4E-2A4D-4C1E-9F7A-1D2E3F4A5B6C"), "video", 1700000000, "fixed-nonce");
    assert.equal(signed.publicId, "alperler/catalog/vehicle/0b7c1f4e-2a4d-4c1e-9f7a-1d2e3f4a5b6c/fixed-nonce");
    assert.equal(signed.signature, signCloudinaryParams({ public_id: signed.publicId, timestamp: 1700000000 }, "s3cr3t"));
    assert.equal(signed.uploadUrl, "https://api.cloudinary.com/v1_1/demo/video/upload");
    assert.equal(signed.maxBytes, 100 * 1024 * 1024);
    assert.ok(!JSON.stringify(signed).includes("s3cr3t"), "secret must never be part of the signed payload");
  } finally {
    process.env = saved;
  }
});

test("public ids are confined to the alperler/ folder", () => {
  assert.equal(isSafePublicId(PID), true);
  assert.equal(isSafePublicId("other/folder/x"), false);
  assert.equal(isSafePublicId("alperler/../x"), false);
  assert.equal(isSafePublicId("alperler/a b"), false);
  assert.equal(adminFolder("HOMEPAGE_SECTION", "Hero Şube", "background"), "alperler/admin/homepage_section/hero-sube/background");
});
