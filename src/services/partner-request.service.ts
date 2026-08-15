import { Injectable, inject, signal } from "@angular/core";
import { AuthService } from "./auth.service";
import { AnalyticsIdentityService } from "./analytics-identity.service";
import { VisitorAnalyticsService } from "./visitor-analytics.service";

export type PartnerIntent = "sell" | "rent";
export type PartnerStatus =
  | "UPLOADING"
  | "NEW"
  | "REVIEWING"
  | "CONTACTED"
  | "OFFERED"
  | "ACCEPTED"
  | "REJECTED"
  | "CLOSED";

export interface PartnerSubmissionInput {
  intent: PartnerIntent;
  name: string;
  phone: string;
  email?: string;
  carBrand: string;
  carModel: string;
  modelYear: number;
  km: number;
  askingPrice?: number;
  withDriver: boolean;
  notes?: string;
  files: File[];
}

export interface PartnerAdminRecord {
  id: string;
  reference: string;
  intent: "SELL" | "RENT";
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  carBrand: string;
  carModel: string;
  modelYear?: number;
  km?: number;
  askingPrice?: number;
  withDriver: boolean;
  description?: string;
  mediaPaths: Array<{
    path: string;
    originalName?: string;
    type?: string;
    size?: number;
  }>;
  status: PartnerStatus;
  internalNotes?: string;
  createdAt: Date;
  submittedAt?: Date;
}

interface UploadTarget {
  path: string;
  token: string;
  signedUrl: string;
  originalName: string;
  type: string;
  size: number;
}

interface FileManifest {
  name: string;
  type: string;
  size: number;
}

interface InitResponse {
  ok: boolean;
  code?: string;
  message?: string;
  reference?: string;
  requestId?: string;
  status?: PartnerStatus;
  duplicate?: boolean;
  uploadToken?: string;
  uploads?: UploadTarget[];
  delivery?: unknown;
  completedCount?: number;
  expectedCount?: number;
}

interface AdminResponse {
  ok: boolean;
  code?: string;
  requests?: Record<string, unknown>[];
  request?: Record<string, unknown>;
}

@Injectable({ providedIn: "root" })
export class PartnerRequestService {
  private readonly authService = inject(AuthService);
  private readonly analyticsIdentity = inject(AnalyticsIdentityService);
  private readonly analytics = inject(VisitorAnalyticsService);
  private readonly storageHost =
    "https://hrztrgjvgdnaurejnsgs.storage.supabase.co";
  private readonly bucket = "partner-uploads";
  private readonly tusChunkSize = 6 * 1024 * 1024;
  private readonly largeFileThreshold = 6 * 1024 * 1024;
  private readonly submissionKeyStorage = "alperler_partner_submission_key";
  private readonly _records = signal<PartnerAdminRecord[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _uploadProgress = signal<Record<string, number>>({});
  private currentSubmissionKey = this.loadSubmissionKey();

  readonly records = this._records.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly uploadProgress = this._uploadProgress.asReadonly();

  resetSubmissionKey(): void {
    this.currentSubmissionKey = crypto.randomUUID();
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(
        this.submissionKeyStorage,
        this.currentSubmissionKey,
      );
    }
    this._uploadProgress.set({});
  }

  async submit(input: PartnerSubmissionInput): Promise<{ reference: string }> {
    this._error.set(null);
    this._uploadProgress.set({});

    const files = input.files.slice(0, 10);
    const manifest: FileManifest[] = files.map((file) => ({
      name: file.name,
      type: file.type,
      size: file.size,
    }));

    let session = await this.call<InitResponse>("POST", {
      ...input,
      idempotencyKey: this.currentSubmissionKey,
      files: manifest,
    });

    if (!session.ok || !session.reference) {
      throw new Error(session.code || "PARTNER_REQUEST_CREATE_FAILED");
    }

    if (session.duplicate && session.status === "NEW") {
      const reference = session.reference;
      this.completeAnalytics(reference, input);
      this.resetSubmissionKey();
      return { reference };
    }

    if (session.duplicate && session.status === "UPLOADING") {
      session = await this.resumeUpload(manifest);
      if (!session.ok || !session.reference) {
        throw new Error(session.code || "PARTNER_RESUME_FAILED");
      }
    }

    if (session.status === "UPLOADING") {
      if (!session.uploadToken) throw new Error("UPLOAD_TOKEN_MISSING");

      const targets = session.uploads || [];
      const availableIndexes = new Set(files.map((_, index) => index));

      for (const target of targets) {
        const fileIndex = files.findIndex(
          (file, index) =>
            availableIndexes.has(index) &&
            file.name === target.originalName &&
            file.type === target.type &&
            file.size === target.size,
        );
        if (fileIndex < 0) throw new Error("UPLOAD_FILE_MISMATCH");

        availableIndexes.delete(fileIndex);
        await this.uploadFile(files[fileIndex], target);
      }

      const finalized = await this.call<InitResponse>("POST", {
        operation: "finalize",
        reference: session.reference,
        uploadToken: session.uploadToken,
      });
      if (!finalized.ok || finalized.status !== "NEW") {
        throw new Error(
          finalized.code || "PARTNER_REQUEST_FINALIZE_FAILED",
        );
      }
    }

    const reference = session.reference;
    this.completeAnalytics(reference, input);
    this.resetSubmissionKey();
    return { reference };
  }

  async refreshAdmin(): Promise<void> {
    this._loading.set(true);
    this._error.set(null);
    try {
      const response = await this.callAdmin<AdminResponse>("GET");
      if (!response.ok || !Array.isArray(response.requests)) {
        throw new Error(response.code || "PARTNER_LIST_FAILED");
      }
      this._records.set(response.requests.map((row) => this.fromApi(row)));
    } catch (error) {
      this._error.set(
        error instanceof Error ? error.message : "Başvurular okunamadı.",
      );
      throw error;
    } finally {
      this._loading.set(false);
    }
  }

  async updateStatus(
    reference: string,
    status: Exclude<PartnerStatus, "UPLOADING">,
    internalNotes?: string,
  ): Promise<void> {
    const response = await this.callAdmin<AdminResponse>("PATCH", {
      reference,
      status,
      internalNotes: internalNotes || "",
    });
    if (!response.ok || !response.request) {
      throw new Error(response.code || "PARTNER_UPDATE_FAILED");
    }
    const updated = this.fromApi(response.request);
    this._records.update((records) =>
      records.map((record) =>
        record.reference === reference ? updated : record,
      ),
    );
  }

  private completeAnalytics(reference: string, input: PartnerSubmissionInput): void {
    void this.analyticsIdentity.link({
      entityType: "PARTNER_REQUEST",
      reference,
      phone: input.phone,
      email: input.email,
    });
    this.analytics.trackFormSuccess("partner-request");
  }

  private async resumeUpload(files: FileManifest[]): Promise<InitResponse> {
    const response = await fetch("/api/partner-upload-resume", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        idempotencyKey: this.currentSubmissionKey,
        files,
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as InitResponse;
    if (!response.ok || !payload.ok) {
      throw new Error(
        payload.code || payload.message || `PARTNER_RESUME_${response.status}`,
      );
    }
    return payload;
  }

  private async uploadFile(file: File, target: UploadTarget): Promise<void> {
    this.setProgress(target.path, 0);
    if (file.size > this.largeFileThreshold) {
      await this.uploadTus(file, target);
    } else {
      await this.uploadSigned(file, target);
    }
    this.setProgress(target.path, 100);
  }

  private async uploadSigned(
    file: File,
    target: UploadTarget,
  ): Promise<void> {
    const delays = [0, 1_500, 4_000];
    let lastError: unknown;
    for (let attempt = 0; attempt < delays.length; attempt += 1) {
      if (delays[attempt]) await this.sleep(delays[attempt]);
      try {
        const form = new FormData();
        form.append("cacheControl", "3600");
        form.append("", file);
        const response = await fetch(target.signedUrl, {
          method: "PUT",
          headers: { "x-upsert": "false" },
          body: form,
        });
        if (!response.ok) {
          throw new Error(`SIGNED_UPLOAD_${response.status}`);
        }
        return;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError instanceof Error
      ? lastError
      : new Error("SIGNED_UPLOAD_FAILED");
  }

  private async uploadTus(
    file: File,
    target: UploadTarget,
  ): Promise<void> {
    const endpoint = `${this.storageHost}/storage/v1/upload/resumable`;
    const metadata = [
      ["bucketName", this.bucket],
      ["objectName", target.path],
      ["contentType", file.type],
      ["cacheControl", "3600"],
    ]
      .map(([key, value]) => `${key} ${btoa(value)}`)
      .join(",");

    const createResponse = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Tus-Resumable": "1.0.0",
        "Upload-Length": String(file.size),
        "Upload-Metadata": metadata,
        "x-signature": target.token,
        "x-upsert": "false",
      },
    });
    if (!createResponse.ok) {
      throw new Error(`TUS_CREATE_${createResponse.status}`);
    }
    const location = createResponse.headers.get("location");
    if (!location) throw new Error("TUS_LOCATION_MISSING");
    const uploadUrl = new URL(location, endpoint).toString();
    let offset = Number(createResponse.headers.get("upload-offset") || 0);

    while (offset < file.size) {
      const end = Math.min(offset + this.tusChunkSize, file.size);
      const chunk = file.slice(
        offset,
        end,
        file.type || "application/octet-stream",
      );
      const nextOffset = await this.patchTusChunk(
        uploadUrl,
        target.token,
        chunk,
        offset,
        file.size,
      );
      offset = nextOffset;
      this.setProgress(
        target.path,
        Math.min(99, Math.round((offset / file.size) * 100)),
      );
    }
  }

  private async patchTusChunk(
    uploadUrl: string,
    token: string,
    chunk: Blob,
    expectedOffset: number,
    total: number,
  ): Promise<number> {
    const retryDelays = [0, 3_000, 5_000, 10_000, 20_000];
    let offset = expectedOffset;
    let lastError: unknown;

    for (let attempt = 0; attempt < retryDelays.length; attempt += 1) {
      if (retryDelays[attempt]) await this.sleep(retryDelays[attempt]);
      try {
        const response = await fetch(uploadUrl, {
          method: "PATCH",
          headers: {
            "Tus-Resumable": "1.0.0",
            "Upload-Offset": String(offset),
            "Content-Type": "application/offset+octet-stream",
            "x-signature": token,
          },
          body: chunk,
        });
        if (response.ok) {
          const headerOffset = Number(response.headers.get("upload-offset"));
          return Number.isFinite(headerOffset) && headerOffset > offset
            ? Math.min(headerOffset, total)
            : Math.min(offset + chunk.size, total);
        }
        if (![409, 412, 429, 500, 502, 503, 504].includes(response.status)) {
          throw new Error(`TUS_PATCH_${response.status}`);
        }
      } catch (error) {
        lastError = error;
      }

      const remoteOffset = await this.readTusOffset(uploadUrl, token).catch(
        () => offset,
      );
      if (remoteOffset > offset) {
        return Math.min(remoteOffset, total);
      }
      offset = remoteOffset;
    }

    throw lastError instanceof Error
      ? lastError
      : new Error("TUS_UPLOAD_FAILED");
  }

  private async readTusOffset(
    uploadUrl: string,
    token: string,
  ): Promise<number> {
    const response = await fetch(uploadUrl, {
      method: "HEAD",
      headers: {
        "Tus-Resumable": "1.0.0",
        "x-signature": token,
      },
    });
    if (!response.ok) throw new Error(`TUS_HEAD_${response.status}`);
    const offset = Number(response.headers.get("upload-offset"));
    if (!Number.isFinite(offset) || offset < 0) {
      throw new Error("TUS_OFFSET_INVALID");
    }
    return offset;
  }

  private setProgress(path: string, progress: number): void {
    this._uploadProgress.update((current) => ({
      ...current,
      [path]: progress,
    }));
  }

  private async call<T>(method: "POST", body: unknown): Promise<T> {
    const response = await fetch("/api/partner-requests", {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = (await response.json().catch(() => ({}))) as T & {
      code?: string;
      message?: string;
    };
    if (!response.ok) {
      throw new Error(
        payload.code ||
          payload.message ||
          `PARTNER_API_${response.status}`,
      );
    }
    return payload;
  }

  private async callAdmin<T>(
    method: "GET" | "PATCH",
    body?: unknown,
  ): Promise<T> {
    const token = await this.authService.getAccessToken();
    if (!token) throw new Error("ADMIN_SESSION_REQUIRED");
    const response = await fetch("/api/partner-requests", {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: method === "GET" ? undefined : JSON.stringify(body),
    });
    const payload = (await response.json().catch(() => ({}))) as T & {
      code?: string;
    };
    if (!response.ok) {
      throw new Error(
        payload.code || `PARTNER_ADMIN_API_${response.status}`,
      );
    }
    return payload;
  }

  private fromApi(row: Record<string, unknown>): PartnerAdminRecord {
    const media = Array.isArray(row["media_paths"]) ? row["media_paths"] : [];
    return {
      id: String(row["id"] || ""),
      reference: String(row["reference"] || ""),
      intent: row["intent"] === "SELL" ? "SELL" : "RENT",
      customerName: String(row["customer_name"] || ""),
      customerEmail: row["customer_email"]
        ? String(row["customer_email"])
        : undefined,
      customerPhone: String(row["customer_phone"] || ""),
      carBrand: String(row["vehicle_brand"] || ""),
      carModel: String(row["vehicle_model"] || ""),
      modelYear:
        row["model_year"] === null || row["model_year"] === undefined
          ? undefined
          : Number(row["model_year"]),
      km:
        row["mileage_km"] === null || row["mileage_km"] === undefined
          ? undefined
          : Number(row["mileage_km"]),
      askingPrice:
        row["asking_price"] === null || row["asking_price"] === undefined
          ? undefined
          : Number(row["asking_price"]),
      withDriver: Boolean(row["with_driver"]),
      description: row["description"]
        ? String(row["description"])
        : undefined,
      mediaPaths: media.map((item) => {
        const entry = item as Record<string, unknown>;
        return {
          path: String(entry["path"] || ""),
          originalName: entry["originalName"]
            ? String(entry["originalName"])
            : undefined,
          type: entry["type"] ? String(entry["type"]) : undefined,
          size:
            entry["size"] === undefined
              ? undefined
              : Number(entry["size"]),
        };
      }),
      status: String(row["status"] || "NEW") as PartnerStatus,
      internalNotes: row["internal_notes"]
        ? String(row["internal_notes"])
        : undefined,
      createdAt: new Date(String(row["created_at"] || 0)),
      submittedAt: row["submitted_at"]
        ? new Date(String(row["submitted_at"]))
        : undefined,
    };
  }

  private loadSubmissionKey(): string {
    const fresh = crypto.randomUUID();
    if (typeof sessionStorage === "undefined") return fresh;
    const existing = sessionStorage.getItem(this.submissionKeyStorage) || "";
    if (existing.length >= 20) return existing;
    sessionStorage.setItem(this.submissionKeyStorage, fresh);
    return fresh;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
