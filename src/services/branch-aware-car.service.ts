import { Injectable, computed, inject } from "@angular/core";
import { CarService } from "./car.service";
import { ListingContactContextService } from "./listing-contact-context.service";

@Injectable()
export class BranchAwareCarService extends CarService {
  private readonly listingContact = inject(ListingContactContextService);
  private readonly branchAwareConfig = computed(() => {
    const base = super.getConfig()();
    const contact = this.listingContact.contact();
    if (!contact) return base;
    return {
      ...base,
      phone: contact.phone || base.phone,
      whatsapp: contact.whatsapp || contact.phone || base.whatsapp,
      email: contact.email || base.email,
    };
  });

  override getConfig() {
    return this.branchAwareConfig;
  }
}
