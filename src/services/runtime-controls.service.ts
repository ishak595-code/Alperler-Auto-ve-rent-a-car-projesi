import { Injectable, signal } from "@angular/core";
import { SUPABASE_PROJECT_URL, SUPABASE_PUBLISHABLE_KEY } from "../supabase.config";

export interface RuntimeControls {
  maintenanceMode: boolean;
  readOnlyMode: boolean;
  allowBookings: boolean;
  allowAppointments: boolean;
  allowContact: boolean;
  allowPartnerRequests: boolean;
  maintenanceTitle: string;
  maintenanceMessage: string;
  statusMessage: string;
  updatedByAdmin: boolean;
}

const DEFAULT_CONTROLS: RuntimeControls = {
  maintenanceMode: false,
  readOnlyMode: false,
  allowBookings: true,
  allowAppointments: true,
  allowContact: true,
  allowPartnerRequests: true,
  maintenanceTitle: "Kısa bir bakım çalışması yapıyoruz",
  maintenanceMessage: "Hizmeti daha iyi hale getirmek için kısa süreli bakım yapıyoruz. Lütfen biraz sonra tekrar deneyin.",
  statusMessage: "",
  updatedByAdmin: false,
};

@Injectable({ providedIn: "root" })
export class RuntimeControlsService {
  readonly controls = signal<RuntimeControls>({ ...DEFAULT_CONTROLS });
  readonly loading = signal(false);
  readonly lastUpdatedAt = signal<string | null>(null);
  private lastFetchAt = 0;
  private inFlight: Promise<void> | null = null;

  async refresh(force = false): Promise<void> {
    const now = Date.now();
    if (!force && now - this.lastFetchAt < 60_000) return;
    if (this.inFlight) return this.inFlight;

    this.inFlight = this.load().finally(() => { this.inFlight = null; });
    return this.inFlight;
  }

  bookingAllowed(): boolean {
    const c = this.controls();
    return !c.maintenanceMode && !c.readOnlyMode && c.allowBookings;
  }

  appointmentAllowed(): boolean {
    const c = this.controls();
    return !c.maintenanceMode && !c.readOnlyMode && c.allowAppointments;
  }

  contactAllowed(): boolean {
    const c = this.controls();
    return !c.maintenanceMode && c.allowContact;
  }

  partnerRequestAllowed(): boolean {
    const c = this.controls();
    return !c.maintenanceMode && !c.readOnlyMode && c.allowPartnerRequests;
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const response = await fetch(
        `${SUPABASE_PROJECT_URL}/rest/v1/site_config?key=eq.runtime_controls&is_public=eq.true&select=value,updated_at&limit=1`,
        {
          headers: { apikey: SUPABASE_PUBLISHABLE_KEY },
          cache: "no-store",
        },
      );
      if (!response.ok) return;
      const rows = await response.json().catch(() => []);
      const row = Array.isArray(rows) ? rows[0] : null;
      if (!row?.value || typeof row.value !== "object") return;
      const value = row.value as Partial<RuntimeControls>;
      this.controls.set({
        maintenanceMode: value.maintenanceMode === true,
        readOnlyMode: value.readOnlyMode === true,
        allowBookings: value.allowBookings !== false,
        allowAppointments: value.allowAppointments !== false,
        allowContact: value.allowContact !== false,
        allowPartnerRequests: value.allowPartnerRequests !== false,
        maintenanceTitle: this.text(value.maintenanceTitle, DEFAULT_CONTROLS.maintenanceTitle, 120),
        maintenanceMessage: this.text(value.maintenanceMessage, DEFAULT_CONTROLS.maintenanceMessage, 500),
        statusMessage: this.text(value.statusMessage, "", 250),
        updatedByAdmin: value.updatedByAdmin === true,
      });
      this.lastUpdatedAt.set(typeof row.updated_at === "string" ? row.updated_at : null);
      this.lastFetchAt = Date.now();
    } catch {
      // Fail open for public browsing. Transaction gateways enforce their own
      // server-side controls, so a config fetch outage does not brick the site.
    } finally {
      this.loading.set(false);
    }
  }

  private text(value: unknown, fallback: string, max: number): string {
    return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : fallback;
  }
}
