import { Injectable } from "@angular/core";
import { SUPABASE_PROJECT_URL, SUPABASE_PUBLISHABLE_KEY } from "../supabase.config";

export interface PublicFaqV217 {
  id: string;
  question: string;
  answer: string;
  category?: string;
}

@Injectable({ providedIn: "root" })
export class PublicFaqV217Service {
  async list(limit = 100, signal?: AbortSignal): Promise<PublicFaqV217[]> {
    const safeLimit = Math.max(1, Math.min(100, Math.floor(Number(limit) || 100)));
    const params = new URLSearchParams({
      select: "id,question,answer,category,sort_order",
      is_active: "eq.true",
      order: "sort_order.asc,id.asc",
      limit: String(safeLimit),
    });
    const response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/faqs?${params}`, {
      method: "GET",
      cache: "no-store",
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        accept: "application/json",
        "cache-control": "no-cache",
      },
      signal,
    });
    if (!response.ok) throw new Error(`PUBLIC_FAQ_V217_${response.status}`);
    const rows = await response.json() as Array<Record<string, unknown>>;
    return rows
      .map((row) => ({
        id: String(row["id"] || "").trim(),
        question: String(row["question"] || "").trim(),
        answer: String(row["answer"] || "").trim(),
        category: String(row["category"] || "").trim() || undefined,
      }))
      .filter((row) => row.id && row.question && row.answer);
  }
}
