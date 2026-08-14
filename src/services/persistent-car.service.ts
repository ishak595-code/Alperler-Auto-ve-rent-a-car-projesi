import { Injectable } from "@angular/core";
import { BookingRequest, CarService } from "./car.service";

@Injectable()
export class PersistentCarService extends CarService {
  override async addReservation(
    request: BookingRequest,
  ): Promise<BookingRequest> {
    return super.addReservation(request);
  }
}
