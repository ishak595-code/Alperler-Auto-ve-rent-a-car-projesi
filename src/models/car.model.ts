export interface VehicleTechnicalSpecs {
  maxSpeed: string;
  acceleration: string;
  cityFuel: string;
  highwayFuel: string;
  combinedFuel: string;
  tankCapacity: string;
  trunkCapacity: string;
  wheels: string;
  dimensions: string;
  cylinders: string;
  engineVolume: string;
  enginePower: string;
  torque: string;
  weight: string;
  drivetrain: string;
}

export type TramerTruthStatus = 'UNKNOWN' | 'DECLARED_CLEAN' | 'DECLARED_RECORD' | 'VERIFIED_CLEAN' | 'VERIFIED_RECORD';
export type ExpertisePartStatus = 'original' | 'local_painted' | 'painted' | 'changed';

export interface Vehicle {
  id: string | number;
  category: 'RENTAL' | 'SALE' | 'TOUR';
  cloudId?: string;
  cloudStockCode?: string;
  cloudSlug?: string;
  publicationStatus?: 'DRAFT' | 'PENDING_REVIEW' | 'SCHEDULED' | 'PUBLISHED' | 'REJECTED' | 'SUSPENDED' | 'ARCHIVED';
  publishedAt?: string;
  scheduledAt?: string;
  branchId?: string;
  branchName?: string;
  branchSlug?: string;
  branchCity?: string;
  branchDistrict?: string;
  listingOrigin?: 'CENTRAL' | 'BRANCH';
  rejectionReason?: string;
  title?: string;
  brand?: string;
  model?: string;
  series?: string;
  year?: number;
  type?: 'SUV' | 'Sedan' | 'Hatchback' | 'Luxury' | 'Sport' | 'Pickup' | 'Minibus' | 'Minibüs' | 'VIP' | string;
  transmission?: 'Otomatik' | 'Manuel' | string;
  fuel?: 'Benzin' | 'Dizel' | 'Hibrit' | 'Elektrik' | string;
  price: number;
  image?: string;
  images?: string[];
  gallery?: string[];
  videos?: { url: string; posterUrl?: string; title?: string; attribution?: string }[];
  location?: string;
  description?: string;
  features?: string[];

  technicalSpecs?: VehicleTechnicalSpecs;
  technicalSpecsProvenance?: {
    source?: string;
    verificationStatus?: 'VERIFIED' | 'NEEDS_ADMIN_REVIEW' | 'UNVERIFIED';
    updatedAt?: string;
  };

  seats?: number;
  doors?: number;
  isAvailable?: boolean;
  driverOption?: 'WITH_DRIVER' | 'WITHOUT_DRIVER' | 'BOTH';
  bookedDates?: {start: string, end: string}[];
  deposit?: number;
  minAge?: number;
  minLicenseYears?: number;
  dailyMileageLimit?: number;
  hourlyMileageLimit?: number;
  hourlyPrice?: number;
  hourlyRentalEnabled?: boolean;
  minimumRentalHours?: number;
  luggage?: number;
  group?: string;

  km?: number;
  detailedFeatures?: {
      interior: string[];
      exterior: string[];
      multimedia: string[];
      safety: string[];
  };
  engineVolume?: string;
  enginePower?: string;
  drivetrain?: string;
  damageStatus?: string;
  expertReport?: string;
  color?: string;
  warranty?: string;

  tramerStatus?: TramerTruthStatus;
  tramerAmount?: number;
  tramerCurrency?: 'TRY' | string;
  tramerSourceName?: string;
  tramerSourceUrl?: string;
  tramerVerifiedAt?: string;

  duration?: string;
  highlights?: string[];
  mapIframeUrl?: string;
  capacity?: number;
  meetingPoint?: string;
  itinerary?: unknown[];
  includedItems?: string[];
  excludedItems?: string[];

  badge?: 'FIRSAT' | 'YENİ' | 'ACİL' | 'POPÜLER' | 'PREMIUM' | 'UYGUN FİYAT' | 'YENİ GİRİŞ' | '' | string;
  viewers?: number;
  isLastCar?: boolean;
  isPriceDropped?: boolean;
  daysLeft?: number;
  favCount?: number;
  isPopular?: boolean;
  isFeatured?: boolean;
  isCampaign?: boolean;
  discountRate?: number;
  createdAt?: string;
  updatedAt?: string;
  isPaintless?: boolean;
  isReplaceFree?: boolean;
  isDamageFree?: boolean;
  hasWarranty?: boolean;
  paintedParts?: string;
  availability?: string;

  fuelConsumption?: string;
  acceleration?: string;
  maxSpeed?: string;
  length?: string;
  width?: string;
  height?: string;
  trunkVolume?: string;
  weight?: string;
  cylinderCount?: number;
  fuelTankCapacity?: string;
  torque?: string;
  kaskoValue?: string;
  cityFuelConsumption?: string;
  highwayFuelConsumption?: string;
  wheelSize?: string;
  tramer?: string;
  damageExpertise?: {
    hood?: ExpertisePartStatus;
    frontBumper?: ExpertisePartStatus;
    rearBumper?: ExpertisePartStatus;
    roof?: ExpertisePartStatus;
    trunk?: ExpertisePartStatus;
    frontLeftDoor?: ExpertisePartStatus;
    frontRightDoor?: ExpertisePartStatus;
    rearLeftDoor?: ExpertisePartStatus;
    rearRightDoor?: ExpertisePartStatus;
    frontLeftFender?: ExpertisePartStatus;
    frontRightFender?: ExpertisePartStatus;
    rearLeftFender?: ExpertisePartStatus;
    rearRightFender?: ExpertisePartStatus;
  };

  popularityScore?: number;
  displayPriority?: number;
}

export type Car = Vehicle;
export type SaleCar = Vehicle;
export type Tour = Vehicle;
