export type BranchServiceType =
  | "RENTAL"
  | "SALES"
  | "TOUR"
  | "TRANSFER"
  | "PICKUP"
  | "RETURN";

export interface BusinessHours {
  label: string;
  value: string;
}

export interface Branch {
  id: string;
  name: string;
  city: string;
  district: string;
  addressLabel: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  latitude?: number;
  longitude?: number;
  mapUrl?: string;
  workingHours: BusinessHours[];
  services: BranchServiceType[];
  isActive: boolean;
  isPickupPoint: boolean;
  isReturnPoint: boolean;
  priority: number;
}
