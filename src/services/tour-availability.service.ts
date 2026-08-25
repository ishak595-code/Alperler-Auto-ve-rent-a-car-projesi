import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { firstValueFrom } from "rxjs";

export interface TourAvailabilityV169 {
  tourId: string;
  date: string;
  publicationStatus: string;
  isActive: boolean;
  capacity: number;
  approvedPeople: number;
  pendingPeople: number;
  remainingSeats: number;
  available: boolean;
  pendingBlocksCapacity: false;
}

interface TourAvailabilityResponse extends Partial<TourAvailabilityV169> {
  ok: boolean;
  code?: string;
  message?: string;
}

@Injectable({ providedIn: "root" })
export class TourAvailabilityService {
  private readonly http = inject(HttpClient);

  async check(tourId: string | number, date: string): Promise<TourAvailabilityV169> {
    try {
      const response = await firstValueFrom(this.http.post<TourAvailabilityResponse>("/api/bookings?mode=tour-availability", {
        tourId: String(tourId),
        date,
      }));
      if (!response.ok || !response.tourId || !response.date) throw new Error(response.code || "TOUR_AVAILABILITY_FAILED");
      return {
        tourId: response.tourId,
        date: response.date,
        publicationStatus: String(response.publicationStatus || ""),
        isActive: response.isActive === true,
        capacity: Math.max(0, Number(response.capacity || 0)),
        approvedPeople: Math.max(0, Number(response.approvedPeople || 0)),
        pendingPeople: Math.max(0, Number(response.pendingPeople || 0)),
        remainingSeats: Math.max(0, Number(response.remainingSeats || 0)),
        available: response.available === true,
        pendingBlocksCapacity: false,
      };
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.error && typeof error.error === "object") {
        const payload = error.error as { code?: unknown; message?: unknown };
        throw new Error(`${String(payload.code || "TOUR_AVAILABILITY_FAILED")}:${String(payload.message || "Tur kontenjanı doğrulanamadı.")}`);
      }
      throw error instanceof Error ? error : new Error("TOUR_AVAILABILITY_FAILED");
    }
  }
}
