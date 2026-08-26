import { Injectable, inject } from "@angular/core";
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

interface AssignmentGatewaySnapshot {
  branches?: Record<string, unknown>[];
  vehicles?: Record<string, unknown>[];
  tours?: Record<string, unknown>[];
  code?: string;
}

@Injectable({ providedIn: "root" })
export class AssignmentCenterService {
  private readonly auth = inject(AuthService);
  private readonly endpoint = "/api/partner?op=admin-core";

  async load(): Promise<AssignmentSnapshot> {
    const token = await this.requiredToken();
    const response = await fetch(`${this.endpoint}&view=assignments`, { headers: this.headers(token), cache: "no-store" });
    const payload = await response.json().catch(() => ({})) as AssignmentGatewaySnapshot;
    if (!response.ok) throw new Error(String(payload.code || `ASSIGNMENT_${response.status}`));
    const branches = Array.isArray(payload.branches) ? payload.branches : [];
    const vehicles = Array.isArray(payload.vehicles) ? payload.vehicles : [];
    const tours = Array.isArray(payload.tours) ? payload.tours : [];

    return {
      branches: branches.map((row) => ({
        kind: "BRANCH" as const,
        staffId: String(row["staff_id"] || ""),
        branchId: String(row["branch_id"] || ""),
        isPrimary: Boolean(row["is_primary"]),
        createdAt: row["created_at"] ? String(row["created_at"]) : undefined,
      })),
      vehicles: vehicles.map((row) => ({
        kind: "VEHICLE" as const,
        staffId: String(row["staff_id"] || ""),
        vehicleId: String(row["vehicle_id"] || ""),
        responsibility: String(row["responsibility"] || "RESPONSIBLE"),
        createdAt: row["created_at"] ? String(row["created_at"]) : undefined,
      })),
      tours: tours.map((row) => ({
        kind: "TOUR" as const,
        staffId: String(row["staff_id"] || ""),
        tourId: String(row["tour_id"] || ""),
        responsibility: String(row["responsibility"] || "COORDINATOR"),
        createdAt: row["created_at"] ? String(row["created_at"]) : undefined,
      })),
    };
  }

  async removeBranch(staffId: string, branchId: string): Promise<void> {
    await this.action({ action: "UNASSIGN_STAFF_BRANCH", staffId, branchId });
  }

  async removeVehicle(vehicleId: string, staffId: string, responsibility: string): Promise<void> {
    await this.action({ action: "UNASSIGN_STAFF_VEHICLE", vehicleId, staffId, responsibility });
  }

  async removeTour(tourId: string, staffId: string, responsibility: string): Promise<void> {
    await this.action({ action: "UNASSIGN_STAFF_TOUR", tourId, staffId, responsibility });
  }

  private async action(body: Record<string, unknown>): Promise<void> {
    const token = await this.requiredToken();
    const response = await fetch(this.endpoint, {
      method: "PATCH",
      headers: this.headers(token),
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ({})) as { code?: string };
    if (!response.ok) throw new Error(String(payload.code || `ASSIGNMENT_${response.status}`));
  }

  private async requiredToken(): Promise<string> {
    const token = await this.auth.getAccessToken();
    if (!token) throw new Error("Yönetici oturumu gerekli.");
    return token;
  }

  private headers(token: string): Record<string, string> {
    return {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      accept: "application/json",
      "x-request-id": crypto.randomUUID(),
    };
  }
}
