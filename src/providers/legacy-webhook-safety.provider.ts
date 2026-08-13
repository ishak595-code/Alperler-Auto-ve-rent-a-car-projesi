import { inject, provideEnvironmentInitializer } from "@angular/core";
import { CarService } from "../services/car.service";

export function provideLegacyWebhookSafety() {
  return provideEnvironmentInitializer(() => {
    const carService = inject(CarService);
    carService.triggerWebhook = (eventName: string) => {
      console.info("Legacy browser webhook transport disabled:", eventName);
    };
  });
}
