export type BranchServiceType =
  | "RENTAL"
  | "SALES"
  | "TOUR"
  | "TRANSFER"
  | "PICKUP"
  | "RETURN";

export type BranchNetworkType = "OWNED" | "FRANCHISE" | "PARTNER";
export type BranchPublicStatus = "DRAFT" | "ACTIVE" | "SUSPENDED" | "CLOSED";

export interface BusinessHours {
  label: string;
  value: string;
}

export interface Branch {
  id: string;
  cloudId?: string;
  slug?: string;
  name: string;
  city: string;
  district: string;
  addressLabel: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  timezone: string;
  latitude?: number;
  longitude?: number;
  mapUrl?: string;
  workingHours: BusinessHours[];
  services: BranchServiceType[];
  isActive: boolean;
  isPickupPoint: boolean;
  isReturnPoint: boolean;
  priority: number;
  networkType?: BranchNetworkType;
  publicStatus?: BranchPublicStatus;
  territoryLabel?: string;
  publicDescription?: string;
  heroImage?: string;
  customerGuaranteeEnabled?: boolean;
  centralPricingRequired?: boolean;
  listingRequiresApproval?: boolean;
  brandProfile?: Record<string, unknown>;
  serviceRules?: Record<string, unknown>;
}
