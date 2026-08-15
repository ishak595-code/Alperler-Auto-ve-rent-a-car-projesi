import { Injectable, inject } from "@angular/core";
import { SUPABASE_PROJECT_URL, SUPABASE_PUBLISHABLE_KEY } from "../supabase.config";
import { AuthService } from "./auth.service";

export interface StaffBranchAssignmentRecord {
  kind: "BRANCH";
  staffId: string;
  branchId: string;
  isPrimary: boolean;
  createdAt?: string;
}

export interface VehicleStaffAssignmentRecord {
  kind: "VEHICLE";
  staffId: string;
  vehicleId: string;
  responsibility: "RESPONSIBLE" | "SALES" | "FLEET" | "DELIVERY" | "MAINTENANCE" | string;
  createdAt?: string;
}

export interface TourStaffAssignmentRecord {
  kind: "TOUR";
  staffId: string;
  tourId: string;
  responsibility: "COORDINATOR" | "GUIDE" | "DRIVER" | "CONTENT" | string;
  createdAt?: string;
}

export interface AssignmentSnapshot {
  branches: StaffBranchAssignmentRecord[];
  vehicles: VehicleStaffAssignmentRecord[];
  tours: TourStaffAssignmentRecord[];
}

@Injectable({ providedIn: "root" })
export class AssignmentCenterService {
  private readonly auth = inject(AuthService);

  async load(): Promise<AssignmentSnapshot> {
    const token = await this.requiredToken();
    const [branches, vehicles, tours] = await Promise.all([
      this.rest<any[]>("GET", "staff_branch_assignments?select=staff_id,branch_id,is_primary,created_at&order=created_at.desc", undefined, token),
      this.rest<any[]>("GET", "vehicle_staff_assignments?select=vehicle_id,staff_id,responsibility,created_at&order=created_at.desc", undefined, token),
      this.rest<any[]>("GET", "tour_staff_assignments?select=tour_id,staff_id,responsibility,created_at&order=created_at.desc", undefined, token),
    ]);

    return {
      branches: branches.map((row) => ({
        kind: "BRANCH" as const,
        staffId: String(row.staff_id),
        branchId: String(row.branch_id),
        isPrimary: Boolean(row.is_primary),
        createdAt: row.created_at || undefined,
      })),
      vehicles: vehicles.map((row) => ({
        kind: "VEHICLE" as const,
        staffId: String(row.staff_id),
        vehicleId: String(row.vehicle_id),
        responsibility: String(row.responsibility || "RESPONSIBLE"),
        createdAt: row.created_at || undefined,
      })),
      tours: tours.map((row) => ({
        kind: "TOUR" as const,
        staffId: String(row.staff_id),
        tourId: String(row.tour_id),
        responsibility: String(row.responsibility || "COORDINATOR"),
        createdAt: row.created_at || undefined,
      })),
    };
  }

  async removeBranch(staffId: string, branchId: string): Promise<void> {
    const token = await this.requiredToken();
    await this.rest(
      "DELETE",
      `staff_branch_assignments?staff_id=eq.${encodeURIComponent(staffId)}&branch_id=eq.${encodeURIComponent(branchId)}`,
      undefined,
      token,
    );
  }

  async removeVehicle(vehicleId: string, staffId: string, responsibility: string): Promise<void> {
    const token = await this.requiredToken();
    await this.rest(
      "DELETE",
      `vehicle_staff_assignments?vehicle_id=eq.${encodeURIComponent(vehicleId)}&staff_id=eq.${encodeURIComponent(staffId)}&responsibility=eq.${encodeURIComponent(responsibility)}`,
      undefined,
      token,
    );
  }

  async removeTour(tourId: string, staffId: string, responsibility: string): Promise<void> {
    const token = await this.requiredToken();
    await this.rest(
      "DELETE",
      `tour_staff_assignments?tour_id=eq.${encodeURIComponent(tourId)}&staff_id=eq.${encodeURIComponent(staffId)}&responsibility=eq.${encodeURIComponent(responsibility)}`,
      undefined,
      token,
    );
  }

  private async requiredToken(): Promise<string> {
    const token = await this.auth.getAccessToken();
    if (!token) throw new Error("Yönetici oturumu gerekli.");
    return token;
  }

  private async rest<T>(method: "GET" | "DELETE", path: string, body: unknown, token: string): Promise<T> {
    const response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/${path}`, {
      method,
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        authorization: `Bearer ${token}`,
        ...(body ? { "content-type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      const payload = await response.text().catch(() => "");
      throw new Error(payload.slice(0, 280) || `ASSIGNMENT_${response.status}`);
    }
    if (method === "DELETE") return undefined as T;
    return (await response.json()) as T;
  }
}
