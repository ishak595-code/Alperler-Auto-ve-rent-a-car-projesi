import { Injectable, inject } from "@angular/core";
import { AuthService } from "./auth.service";
import { RuntimeControls } from "./runtime-controls.service";

export interface AdminSystemEventRow {
  id: number;
  severity: "INFO" | "WARN" | "ERROR" | "CRITICAL";
  source: string;
  code: string;
  message: string;
  route?: string | null;
  occurrence_count: number;
  first_seen: string;
  last_seen: string;
  resolved_at?: string | null;
  auto_recovered: boolean;
  recovery_action?: string | null;
  release_sha?: string | null;
  client_family?: string | null;
  details?: Record<string, unknown> | null;
}

export interface AdminSystemRepairResult {
  ok?: boolean;
  runId?: string;
  runtimeRestored?: boolean;
  navigationSettingsRestored?: boolean;
  navigationItemsInserted?: number;
  homepageSectionsInserted?: number;
  businessDataDeleted?: boolean;
  completedAt?: string;
}

interface GatewayResponse {
  ok?: boolean;
  code?: string;
  message?: string;
  events?: AdminSystemEventRow[];
  value?: RuntimeControls;
  id?: number;
  resolvedAt?: string | null;
  runId?: string;
  runtimeRestored?: boolean;
  navigationSettingsRestored?: boolean;
  navigationItemsInserted?: number;
  homepageSectionsInserted?: number;
  businessDataDeleted?: boolean;
  completedAt?: string;
}

@Injectable({ providedIn: "root" })
export class AdminSystemHealthService {
  private readonly auth = inject(AuthService);
  private readonly endpoint = "/api/partner?op=site-content-admin";

  async loadEvents(limit = 500): Promise<AdminSystemEventRow[]> {
    const payload = await this.request({ action: "systemHealthSnapshot", limit: Math.max(1, Math.min(Math.floor(limit), 500)) });
    return Array.isArray(payload.events) ? payload.events : [];
  }

  async saveRuntimeControls(controls: RuntimeControls): Promise<RuntimeControls> {
    const payload = await this.request({ action: "saveRuntimeControls", controls });
    return payload.value && typeof payload.value === "object" ? payload.value : controls;
  }

  async setEventResolved(eventId: number, resolved: boolean): Promise<void> {
    if (!Number.isSafeInteger(eventId) || eventId <= 0) throw new Error("SYSTEM_EVENT_ID_INVALID");
    await this.request({ action: "setSystemEventResolved", eventId, resolved });
  }

  async runSafeRepair(): Promise<AdminSystemRepairResult> {
    const payload = await this.request({ action: "runSafeRepair" });
    if (payload.businessDataDeleted !== false) throw new Error("SYSTEM_REPAIR_SAFETY_CHECK_FAILED");
    return payload;
  }

  private async request(body: Record<string, unknown>): Promise<GatewayResponse> {
    const token = await this.auth.getAccessToken();
    if (!token) throw new Error("ADMIN_SESSION_REQUIRED");
    const response = await fetch(this.endpoint, {
      method: "PATCH",
      cache: "no-store",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        accept: "application/json",
        "x-request-id": crypto.randomUUID(),
      },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({})) as GatewayResponse;
    if (!response.ok || payload.ok !== true) throw new Error(payload.code || payload.message || `SYSTEM_HEALTH_GATEWAY_${response.status}`);
    return payload;
  }
}
