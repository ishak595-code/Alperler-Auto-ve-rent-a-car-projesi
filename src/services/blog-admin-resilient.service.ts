import { Injectable } from "@angular/core";
import { BlogAdminRecord, BlogAdminService } from "./blog-admin.service";

@Injectable()
export class BlogAdminResilientService extends BlogAdminService {
  override async save(record: BlogAdminRecord): Promise<BlogAdminRecord> {
    try {
      return await super.save(record);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const normalized = message.toUpperCase();
      if (!normalized.includes("DUPLICATE") && !normalized.includes("UNIQUE") && !normalized.includes("SLUG")) throw error;

      const base = (record.slug || record.title || "yazi")
        .toLocaleLowerCase("tr-TR")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/ı/g, "i").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ö/g, "o").replace(/ç/g, "c")
        .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 96) || "yazi";
      const uniqueSlug = `${base}-${crypto.randomUUID().slice(0, 8)}`;
      return super.save({ ...record, slug: uniqueSlug });
    }
  }
}
