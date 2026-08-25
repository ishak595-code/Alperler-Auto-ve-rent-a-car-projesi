import { Injectable } from "@angular/core";

export interface TourDemandV170 {
  ok: boolean;
  tourId: string;
  date: string;
  publicationStatus: string;
  isActive: boolean;
  available: boolean;
  capacityPolicy: "FLEXIBLE_DEMAND" | string;
  hardCapacity: boolean;
  recommendedGroupSize: number;
  approvedPeople: number;
  pendingPeople: number;
  approvedReservations: number;
  pendingReservations: number;
  remainingSeats: null;
  pendingBlocksCapacity: boolean;
  approvedBlocksCapacity: boolean;
  requestId?: string;
}

@Injectable({ providedIn: "root" })
export class TourDemandV170Service {
  async check(identifier: string | number, date: string): Promise<TourDemandV170> {
    const tourId = String(identifier ?? "").trim();
    if (!tourId) throw new Error("Tur kimliği eksik.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Tur tarihi geçerli değil.");

    const response = await fetch("/api/bookings?mode=tour-availability", {
      method: "POST",
      headers: { "content-type": "application/json", "x-request-id": crypto.randomUUID() },
      body: JSON.stringify({ tourId, date }),
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ({})) as Partial<TourDemandV170> & { code?: string; message?: string };
    if (!response.ok || payload.ok !== true) throw new Error(`${payload.code || "TOUR_DEMAND_FAILED"}:${payload.message || "Tur talep bilgisi alınamadı."}`);
    return {
      ok: true,
      tourId: String(payload.tourId || tourId),
      date: String(payload.date || date),
      publicationStatus: String(payload.publicationStatus || ""),
      isActive: payload.isActive === true,
      available: payload.available === true,
      capacityPolicy: String(payload.capacityPolicy || "FLEXIBLE_DEMAND"),
      hardCapacity: payload.hardCapacity === true,
      recommendedGroupSize: Math.max(0, Number(payload.recommendedGroupSize || 0)),
      approvedPeople: Math.max(0, Number(payload.approvedPeople || 0)),
      pendingPeople: Math.max(0, Number(payload.pendingPeople || 0)),
      approvedReservations: Math.max(0, Number(payload.approvedReservations || 0)),
      pendingReservations: Math.max(0, Number(payload.pendingReservations || 0)),
      remainingSeats: null,
      pendingBlocksCapacity: false,
      approvedBlocksCapacity: false,
      requestId: payload.requestId,
    };
  }
}
