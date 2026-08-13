import { Injectable, inject } from "@angular/core";
import { BookingType } from "../models/booking.model";
import { BookingService } from "./booking.service";
import { BookingRequest, CarService } from "./car.service";

@Injectable()
export class PersistentCarService extends CarService {
  private readonly bookingService = inject(BookingService);

  override async addReservation(request: BookingRequest): Promise<void> {
    const type = this.resolveBookingType(request);
    const itemName =
      request.itemName?.trim() ||
      (request.item && "brand" in request.item
        ? `${request.item.brand || ""} ${request.item.model || ""}`.trim()
        : type === "TOUR"
          ? "Tur Rezervasyonu"
          : type === "APPOINTMENT"
            ? "Randevu Talebi"
            : "Rezervasyon Talebi");

    await this.bookingService.create({
      type,
      itemId: request.item?.id,
      itemName,
      image: request.image || request.item?.image,
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

  private resolveBookingType(request: BookingRequest): BookingType {
    if (
      request.type === "RENTAL" ||
      request.type === "TOUR" ||
      request.type === "SALE_INQUIRY" ||
      request.type === "APPOINTMENT"
    ) {
      return request.type;
    }

    const item = request.item;
    if (item && "category" in item) {
      if (item.category === "SALE") return "SALE_INQUIRY";
      if (item.category === "RENTAL") return "RENTAL";
    }

    const context = `${request.itemName || ""} ${request.notes || ""}`.toLocaleLowerCase("tr-TR");
    if (context.includes("tur")) return "TOUR";
    if (context.includes("randevu")) return "APPOINTMENT";
    if (context.includes("satın") || context.includes("satilik") || context.includes("satılık")) {
      return "SALE_INQUIRY";
    }

    return "RENTAL";
  }
}
