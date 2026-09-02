import { Injectable, inject } from "@angular/core";
import { Vehicle } from "../models/car.model";
import { DetailKind, PublicDetailDataService } from "./public-detail-data.service";
import { ListingContactContextService } from "./listing-contact-context.service";

@Injectable()
export class BranchAwarePublicDetailDataService extends PublicDetailDataService {
  private readonly listingContact = inject(ListingContactContextService);

  override async load(kind: DetailKind, routeId: string): Promise<Vehicle> {
    const item = await super.load(kind, routeId);
    await this.listingContact.resolve(item.branchId);
    return item;
  }
}
