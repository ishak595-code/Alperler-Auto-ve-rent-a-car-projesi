import { Injectable, inject, signal } from "@angular/core";
import { NavigationStart, Router } from "@angular/router";
import { BranchService } from "./branch.service";

export interface ListingBranchContact {
  branchId: string;
  branchName: string;
  phone: string;
  whatsapp?: string;
  email?: string;
}

@Injectable({ providedIn: "root" })
export class ListingContactContextService {
  private readonly branches = inject(BranchService);
  private readonly router = inject(Router);
  private readonly _contact = signal<ListingBranchContact | null>(null);
  private resolveGeneration = 0;

  readonly contact = this._contact.asReadonly();

  constructor() {
    this.router.events.subscribe((event) => {
      if (!(event instanceof NavigationStart)) return;
      const path = event.url.split("?", 1)[0].split("#", 1)[0];
      if (!/^\/(fleet|sales|tour)\/[^/]+\/?$/.test(path)) this.clear();
    });
  }

  async resolve(branchId?: string | null): Promise<ListingBranchContact | null> {
    const generation = ++this.resolveGeneration;
    const cleanId = String(branchId || "").trim();
    if (!cleanId) {
      if (generation === this.resolveGeneration) this._contact.set(null);
      return null;
    }

    await this.branches.refreshPublic(false).catch(() => undefined);
    if (generation !== this.resolveGeneration) return this._contact();

    const branch = this.branches.branches().find((item) => item.cloudId === cleanId || item.id === cleanId.toLowerCase());
    if (!branch || !branch.isActive || branch.publicStatus !== "ACTIVE") {
      this._contact.set(null);
      return null;
    }

    const contact: ListingBranchContact = {
      branchId: branch.cloudId || branch.id,
      branchName: branch.operatorName || branch.name,
      phone: branch.phone,
      whatsapp: branch.whatsapp || branch.phone,
      email: branch.email,
    };
    this._contact.set(contact);
    return contact;
  }

  clear(): void {
    this.resolveGeneration += 1;
    this._contact.set(null);
  }
}
