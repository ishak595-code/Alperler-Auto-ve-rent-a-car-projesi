import { Injectable, inject } from "@angular/core";
import { AuthService } from "./auth.service";
import { CatalogMediaService } from "./catalog-media.service";
import { SUPABASE_PROJECT_URL, SUPABASE_PUBLISHABLE_KEY } from "../supabase.config";

export type BlogPublicationStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export interface BlogAdminRecord {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage?: string;
  authorName: string;
  status: BlogPublicationStatus;
  publishedAt?: string;
  seoTitle?: string;
  seoDescription?: string;
  readTime: string;
  originalDate: string;
  metadata: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({ providedIn: "root" })
export class BlogAdminService {
  private readonly auth = inject(AuthService);
  private readonly media = inject(CatalogMediaService);

  async list(): Promise<BlogAdminRecord[]> {
    const response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/blog_posts?select=*&order=updated_at.desc`, {
      method: "GET",
      cache: "no-store",
      headers: await this.headers(),
    });
    if (!response.ok) throw new Error(`BLOG_ADMIN_LIST_${response.status}`);
    const rows = await response.json() as Record<string, unknown>[];
    return rows.map((row) => this.fromRow(row));
  }

  async createDraft(): Promise<BlogAdminRecord> {
    const suffix = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    const body = {
      title: "Yeni Blog Yazısı",
      slug: `taslak-${suffix}`,
      excerpt: null,
      content: "",
      cover_image: null,
      author_name: "Alperler Rent A Car",
      status: "DRAFT",
      published_at: null,
      seo_title: null,
      seo_description: null,
      metadata: { readTime: "4 Dk Okuma", originalDate: new Date().toLocaleDateString("tr-TR") },
    };
    const response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/blog_posts?select=*`, {
      method: "POST",
      headers: { ...(await this.headers()), Prefer: "return=representation" },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(await this.errorCode(response, "BLOG_DRAFT_CREATE"));
    return this.fromRow(((await response.json()) as Record<string, unknown>[])[0] || {});
  }

  async save(record: BlogAdminRecord): Promise<BlogAdminRecord> {
    const status = this.status(record.status);
    const publishedAt = status === "PUBLISHED" ? (record.publishedAt || new Date().toISOString()) : null;
    const body = {
      title: record.title.trim(),
      slug: this.slug(record.slug || record.title),
      excerpt: record.excerpt.trim() || null,
      content: record.content,
      author_name: record.authorName.trim() || "Alperler Rent A Car",
      status,
      published_at: publishedAt,
      seo_title: record.seoTitle?.trim() || null,
      seo_description: record.seoDescription?.trim() || null,
      metadata: {
        ...(record.metadata || {}),
        readTime: record.readTime.trim() || "4 Dk Okuma",
        originalDate: record.originalDate.trim(),
      },
      updated_at: new Date().toISOString(),
    };
    const response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/blog_posts?id=eq.${encodeURIComponent(record.id)}&select=*`, {
      method: "PATCH",
      headers: { ...(await this.headers()), Prefer: "return=representation" },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(await this.errorCode(response, "BLOG_SAVE"));
    const rows = await response.json() as Record<string, unknown>[];
    if (!rows[0]) throw new Error("BLOG_NOT_FOUND");
    return this.fromRow(rows[0]);
  }

  async archive(record: BlogAdminRecord): Promise<BlogAdminRecord> {
    return this.save({ ...record, status: "ARCHIVED", publishedAt: undefined });
  }

  async removeDraft(record: BlogAdminRecord): Promise<void> {
    if (record.status !== "DRAFT") throw new Error("Yalnız taslak yazı kalıcı olarak silinebilir. Yayınlanmış yazıyı arşivleyin.");

    const current = await this.fetchById(record.id);
    if (!current) return;
    if (current.status !== "DRAFT") throw new Error("Bu yazı artık taslak değil. Güncel durumu yenileyip tekrar kontrol edin.");

    await this.media.removeAll("BLOG", record.id);

    const response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/blog_posts?id=eq.${encodeURIComponent(record.id)}&status=eq.DRAFT&select=id`, {
      method: "DELETE",
      headers: { ...(await this.headers()), Prefer: "return=representation" },
    });
    if (!response.ok) throw new Error(await this.errorCode(response, "BLOG_DELETE"));
    const deleted = await response.json() as Array<{ id?: string }>;
    if (!deleted.some((row) => row.id === record.id)) throw new Error("BLOG_DELETE_STATE_CHANGED");
  }

  private async fetchById(id: string): Promise<BlogAdminRecord | null> {
    const response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/blog_posts?id=eq.${encodeURIComponent(id)}&select=*&limit=1`, {
      method: "GET",
      cache: "no-store",
      headers: await this.headers(),
    });
    if (!response.ok) throw new Error(await this.errorCode(response, "BLOG_ADMIN_READ"));
    const rows = await response.json() as Record<string, unknown>[];
    return rows[0] ? this.fromRow(rows[0]) : null;
  }

  private async headers(): Promise<Record<string, string>> {
    const token = await this.auth.getAccessToken();
    if (!token) throw new Error("ADMIN_SESSION_REQUIRED");
    return {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      authorization: `Bearer ${token}`,
      accept: "application/json",
      "content-type": "application/json",
    };
  }

  private fromRow(row: Record<string, any>): BlogAdminRecord {
    const metadata = row?.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata) ? row.metadata as Record<string, unknown> : {};
    return {
      id: String(row.id || ""),
      title: String(row.title || ""),
      slug: String(row.slug || ""),
      excerpt: String(row.excerpt || ""),
      content: String(row.content || ""),
      coverImage: row.cover_image || undefined,
      authorName: String(row.author_name || "Alperler Rent A Car"),
      status: this.status(row.status),
      publishedAt: row.published_at || undefined,
      seoTitle: row.seo_title || undefined,
      seoDescription: row.seo_description || undefined,
      readTime: String(metadata["readTime"] || "4 Dk Okuma"),
      originalDate: String(metadata["originalDate"] || (row.published_at ? new Date(row.published_at).toLocaleDateString("tr-TR") : "")),
      metadata,
      createdAt: row.created_at || undefined,
      updatedAt: row.updated_at || undefined,
    };
  }

  private status(value: unknown): BlogPublicationStatus {
    return value === "PUBLISHED" || value === "ARCHIVED" ? value : "DRAFT";
  }

  private slug(value: string): string {
    const normalized = value.toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ö/g, "o").replace(/ç/g, "c").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120);
    return normalized || `yazi-${Date.now()}`;
  }

  private async errorCode(response: Response, fallback: string): Promise<string> {
    const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
    return String(payload["message"] || payload["code"] || `${fallback}_${response.status}`);
  }
}
