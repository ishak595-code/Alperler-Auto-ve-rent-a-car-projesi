import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
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

const indexPath = resolve(process.cwd(), "index.html");
let index = readFileSync(indexPath, "utf8");
index = index
  .replace(/\s*<link\s+rel=["']canonical["'][^>]*>\s*/gi, "\n")
  .replace(/\s*<meta\s+property=["']og:url["'][^>]*>\s*/gi, "\n")
  .replace(/\s*<meta\s+property=["']og:image(?::width|:height)?["'][^>]*>\s*/gi, "\n")
  .replace(/\s*<meta\s+name=["']twitter:image["'][^>]*>\s*/gi, "\n")
  .replace(/\s*<meta\s+name=["']twitter:site["'][^>]*>\s*/gi, "\n")
  .replace(/\s*<!-- AI Discovery & Knowledge Graph JSON-LD -->\s*<script\s+type=["']application\/ld\+json["']>[\s\S]*?<\/script>\s*/i, "\n");

const robotsContent = siteUrl
  ? "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"
  : "noindex, nofollow";
index = index.replace(
  /<meta\s+name=["']robots["'][^>]*>/i,
  `<meta name="robots" content="${robotsContent}">`,
);
writeFileSync(indexPath, index, "utf8");

console.log(
  siteUrl
    ? `[seo] Prepared domain-aware SEO files for ${siteUrl}`
    : "[seo] PUBLIC_APP_URL is not configured; generated no-index SEO files.",
);
