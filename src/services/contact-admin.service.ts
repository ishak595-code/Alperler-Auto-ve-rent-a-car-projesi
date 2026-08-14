import { Injectable, inject, signal } from "@angular/core";
import { AuthService } from "./auth.service";

export type ContactStatus = "NEW" | "READ" | "REPLIED" | "ARCHIVED";
export interface ContactAdminRecord {
  id: string;
  reference: string;
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  status: ContactStatus;
  internalNotes?: string;
  createdAt: Date;
  readAt?: Date;
  repliedAt?: Date;
  archivedAt?: Date;
}

@Injectable({ providedIn: "root" })
export class ContactAdminService {
  private readonly auth = inject(AuthService);
  private readonly _records = signal<ContactAdminRecord[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  readonly records = this._records.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  async refresh(): Promise<void> {
    this._loading.set(true);
    this._error.set(null);
    try {
      const token = await this.auth.getAccessToken();
      if (!token) throw new Error("ADMIN_SESSION_REQUIRED");
      const response = await fetch("/api/contact-admin", { headers: { authorization: `Bearer ${token}` } });
      const payload = (await response.json().catch(() => ({}))) as { ok?: boolean; code?: string; messages?: Record<string, unknown>[] };
      if (!response.ok || !payload.ok || !Array.isArray(payload.messages)) throw new Error(payload.code || "CONTACT_LIST_FAILED");
      this._records.set(payload.messages.map((row) => this.map(row)));
    } catch (error) {
      const message = error instanceof Error ? error.message : "CONTACT_LIST_FAILED";
      this._error.set(message);
      throw error;
    } finally {
      this._loading.set(false);
    }
  }

  async update(reference: string, status: ContactStatus, internalNotes = ""): Promise<void> {
    const token = await this.auth.getAccessToken();
    if (!token) throw new Error("ADMIN_SESSION_REQUIRED");
    const response = await fetch("/api/contact-admin", {
      method: "PATCH",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ reference, status, internalNotes }),
    });
    const payload = (await response.json().catch(() => ({}))) as { ok?: boolean; code?: string; message?: Record<string, unknown> };
    if (!response.ok || !payload.ok || !payload.message) throw new Error(payload.code || "CONTACT_UPDATE_FAILED");
    const record = this.map(payload.message);
    this._records.update((records) => records.map((current) => (current.reference === reference ? record : current)));
  }

  private map(row: Record<string, unknown>): ContactAdminRecord {
    return {
      id: String(row["id"] || ""),
      reference: String(row["reference"] || ""),
      name: String(row["name"] || ""),
      email: String(row["email"] || ""),
      phone: row["phone"] ? String(row["phone"]) : undefined,
      subject: row["subject"] ? String(row["subject"]) : undefined,
      message: String(row["message"] || ""),
      status: String(row["status"] || "NEW") as ContactStatus,
      internalNotes: row["internal_notes"] ? String(row["internal_notes"]) : undefined,
      createdAt: new Date(String(row["created_at"] || 0)),
      readAt: row["read_at"] ? new Date(String(row["read_at"])) : undefined,
      repliedAt: row["replied_at"] ? new Date(String(row["replied_at"])) : undefined,
      archivedAt: row["archived_at"] ? new Date(String(row["archived_at"])) : undefined,
    };
  }
}
