import { test } from "node:test";
import assert from "node:assert/strict";
import { SUPABASE_PROJECT_URL } from "../../src/supabase.config.ts";
import { cdnCatalogMediaText, cdnCatalogMediaUrl, readPublicCatalogJson } from "../../src/utils/cdn-catalog-media.ts";

const legacy = `${SUPABASE_PROJECT_URL}/storage/v1/object/public/catalog-media/vehicle/abc/photo.jpg`;

test("legacy catalogue-media URL is served through the same-origin CDN path", () => {
  assert.equal(cdnCatalogMediaUrl(legacy), "/catalog-media/vehicle/abc/photo.jpg");
});

test("other buckets, R2, Cloudinary, external and non-strings are untouched", () => {
  const untouched = [
    `${SUPABASE_PROJECT_URL}/storage/v1/object/public/customer-avatars/u/a.jpg`,
    "https://alperler-media.example.workers.dev/alperler/catalog/vehicle/1/w1440.webp",
    "https://res.cloudinary.com/demo/image/upload/v1/x.jpg",
    "https://images.unsplash.com/photo.jpg",
    "/catalog-media/already/local.jpg",
  ];
  for (const url of untouched) assert.equal(cdnCatalogMediaUrl(url), url);
  assert.equal(cdnCatalogMediaUrl(null), null);
  assert.equal(cdnCatalogMediaUrl(42), 42);
});

test("JSON text rewrite keeps the document valid, including nested arrays", () => {
  const payload = [{ cover_image: legacy, images: [legacy, legacy.replace("photo", "two")], title: "Hilux" }];
  const rewritten = JSON.parse(cdnCatalogMediaText(JSON.stringify(payload)));
  assert.deepEqual(rewritten, [{
    cover_image: "/catalog-media/vehicle/abc/photo.jpg",
    images: ["/catalog-media/vehicle/abc/photo.jpg", "/catalog-media/vehicle/abc/two.jpg"],
    title: "Hilux",
  }]);
});

test("readPublicCatalogJson parses a Response with rewritten media", async () => {
  const response = new Response(JSON.stringify({ ok: true, records: [{ image: legacy }] }), { headers: { "content-type": "application/json" } });
  const value = await readPublicCatalogJson<{ ok: boolean; records: Array<{ image: string }> }>(response);
  assert.equal(value.records[0].image, "/catalog-media/vehicle/abc/photo.jpg");
});
