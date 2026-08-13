import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

function normalizeOrigin(value) {
  if (!value) return null;
  try {
    const url = new URL(value.startsWith("http") ? value : `https://${value}`);
    return url.protocol === "https:" ? url.origin : null;
  } catch {
    return null;
  }
}

const explicitUrl = normalizeOrigin(process.env.PUBLIC_APP_URL);
const vercelProductionUrl = normalizeOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL);
const siteUrl = explicitUrl || vercelProductionUrl;
const publicDir = resolve(process.cwd(), "public");
mkdirSync(publicDir, { recursive: true });

const publicPaths = [
  "/",
  "/fleet",
  "/sales",
  "/tours",
  "/branches",
  "/blog",
  "/about",
  "/contact",
  "/faq",
];

const robots = siteUrl
  ? [
      "User-agent: *",
      "Allow: /",
      "Disallow: /admin",
      "Disallow: /api/",
      "",
      `Sitemap: ${siteUrl}/sitemap.xml`,
      "",
    ].join("\n")
  : ["User-agent: *", "Disallow: /", ""].join("\n");

const sitemapEntries = siteUrl
  ? publicPaths.map((path) => `  <url><loc>${siteUrl}${path}</loc></url>`).join("\n")
  : "";
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapEntries}\n</urlset>\n`;

writeFileSync(resolve(publicDir, "robots.txt"), robots, "utf8");
writeFileSync(resolve(publicDir, "sitemap.xml"), sitemap, "utf8");

console.log(
  siteUrl
    ? `[seo] Generated robots.txt and sitemap.xml for ${siteUrl}`
    : "[seo] PUBLIC_APP_URL is not configured; generated no-index SEO files.",
);
