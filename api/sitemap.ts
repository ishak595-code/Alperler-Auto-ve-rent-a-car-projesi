import { SUPABASE_PROJECT_URL, supabaseRestHeaders } from "./_lib/supabase-public";

const DEFAULT_ORIGIN = "https://alperrentacar.online";

type DynamicRow = {
  id?: string;
  category?: string;
  slug?: string;
  seo_slug?: string;
  metadata?: Record<string, unknown> | null;
  updated_at?: string | null;
};

type SitemapEntry = {
  path: string;
  lastmod?: string | null;
  changefreq?: "daily" | "weekly" | "monthly";
  priority?: number;
};

function siteOrigin(): string {
  const configured = String(process.env.PUBLIC_APP_URL || DEFAULT_ORIGIN).trim().replace(/\/$/, "");
  try {
    const url = new URL(configured);
    return url.protocol === "https:" ? url.origin : DEFAULT_ORIGIN;
  } catch {
    return DEFAULT_ORIGIN;
  }
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function routeId(row: DynamicRow): string {
  const legacy = row.metadata?.["legacyId"];
  if (typeof legacy === "number" && Number.isFinite(legacy)) return String(legacy);
  if (typeof legacy === "string" && legacy.trim()) return legacy.trim();
  return String(row.id || "").trim();
}

function segment(value: string): string {
  return encodeURIComponent(value.trim());
}

async function publicRows(path: string): Promise<DynamicRow[]> {
  const response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/${path}`, {
    method: "GET",
    headers: {
      ...supabaseRestHeaders(),
      accept: "application/json",
    },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`SITEMAP_SOURCE_${response.status}`);
  const payload = await response.json();
  return Array.isArray(payload) ? payload as DynamicRow[] : [];
}

function toXml(entries: SitemapEntry[]): string {
  const origin = siteOrigin();
  const unique = new Map<string, SitemapEntry>();
  for (const entry of entries) {
    if (!entry.path.startsWith("/")) continue;
    unique.set(entry.path, entry);
  }

  const urls = [...unique.values()].map((entry) => {
    const absolute = `${origin}${entry.path}`;
    const lastmod = entry.lastmod ? `<lastmod>${xmlEscape(new Date(entry.lastmod).toISOString())}</lastmod>` : "";
    const changefreq = entry.changefreq ? `<changefreq>${entry.changefreq}</changefreq>` : "";
    const priority = typeof entry.priority === "number" ? `<priority>${entry.priority.toFixed(1)}</priority>` : "";
    return `<url><loc>${xmlEscape(absolute)}</loc>${lastmod}${changefreq}${priority}</url>`;
  }).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed", { status: 405, headers: { allow: "GET, HEAD" } });
    }

    const entries: SitemapEntry[] = [
      { path: "/", changefreq: "daily", priority: 1.0 },
      { path: "/fleet", changefreq: "daily", priority: 0.9 },
      { path: "/sales", changefreq: "daily", priority: 0.9 },
      { path: "/tours", changefreq: "weekly", priority: 0.8 },
      { path: "/campaigns", changefreq: "daily", priority: 0.8 },
      { path: "/branches", changefreq: "weekly", priority: 0.8 },
      { path: "/blog", changefreq: "weekly", priority: 0.8 },
      { path: "/about", changefreq: "monthly", priority: 0.6 },
      { path: "/contact", changefreq: "monthly", priority: 0.6 },
      { path: "/faq", changefreq: "monthly", priority: 0.5 },
      { path: "/list-your-car", changefreq: "monthly", priority: 0.5 },
      { path: "/branch-partner", changefreq: "monthly", priority: 0.5 },
    ];

    try {
      const [vehicles, tours, blog, branches] = await Promise.all([
        publicRows("vehicles?is_active=eq.true&publication_status=eq.PUBLISHED&select=id,category,metadata,updated_at"),
        publicRows("tours?is_active=eq.true&publication_status=eq.PUBLISHED&select=id,seo_slug,metadata,updated_at"),
        publicRows("blog_posts?status=eq.PUBLISHED&select=id,slug,metadata,updated_at"),
        publicRows("branches?is_active=eq.true&public_status=eq.ACTIVE&select=id,slug,updated_at"),
      ]);

      for (const row of vehicles) {
        const id = routeId(row);
        if (!id) continue;
        entries.push({
          path: `${row.category === "SALE" ? "/sales" : "/fleet"}/${segment(id)}`,
          lastmod: row.updated_at,
          changefreq: "daily",
          priority: 0.8,
        });
      }
      for (const row of tours) {
        const id = String(row.seo_slug || routeId(row)).trim();
        if (id) entries.push({ path: `/tour/${segment(id)}`, lastmod: row.updated_at, changefreq: "weekly", priority: 0.7 });
      }
      for (const row of blog) {
        const id = routeId(row) || String(row.slug || "").trim();
        if (id) entries.push({ path: `/blog/${segment(id)}`, lastmod: row.updated_at, changefreq: "monthly", priority: 0.7 });
      }
      for (const row of branches) {
        const slug = String(row.slug || "").trim();
        if (slug) entries.push({ path: `/branches/${segment(slug)}`, lastmod: row.updated_at, changefreq: "weekly", priority: 0.7 });
      }
    } catch (error) {
      console.error("[sitemap] dynamic source failed; serving stable routes", error);
    }

    const body = toXml(entries);
    return new Response(request.method === "HEAD" ? null : body, {
      status: 200,
      headers: {
        "content-type": "application/xml; charset=utf-8",
        "cache-control": "public, max-age=120, s-maxage=300, stale-while-revalidate=3600",
      },
    });
  },
};
