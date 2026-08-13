import { Injectable, inject } from "@angular/core";
import { BookingService } from "./booking.service";
import { BookingRequest, CarService } from "./car.service";

@Injectable()
export class PersistentCarService extends CarService {
  private readonly bookingService = inject(BookingService);

  override async addReservation(request: BookingRequest): Promise<void> {
    await this.bookingService.create({
      type: request.type,
      itemId: request.item?.id,
      itemName:
        request.itemName?.trim() ||
        (request.item && "brand" in request.item
          ? `${request.item.brand || ""} ${request.item.model || ""}`.trim()
          : "Rezervasyon Talebi"),
      image: request.image,
      customerName: request.customerName?.trim() || "İsimsiz Müşteri",
      customerEmail: request.customerEmail?.trim() || undefined,
      customerPhone: request.customerPhone?.trim() || "Belirtilmedi",
      basePrice: request.basePrice,
      totalPrice: request.totalPrice,
      currency: "TRY",
      personCount: request.personCount,
      startDate: request.startDate,
      endDate: request.endDate,
      days: request.days,
      withDriver: request.withDriver,
      pickupLocation: request.pickupLocation,
      rentalDuration: request.rentalDuration,
      notes: request.notes,
      paymentMethod: "NONE",
      source: "WEB",
    });
  }
}
