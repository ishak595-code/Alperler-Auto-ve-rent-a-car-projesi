export interface Vehicle {
  id: string | number;
  category: 'RENTAL' | 'SALE' | 'TOUR';
  title?: string;
  brand?: string;
  model?: string;
  series?: string;
  year?: number;
  type?: 'SUV' | 'Sedan' | 'Hatchback' | 'Luxury' | 'Sport' | 'Pickup' | 'Minibus' | 'VIP';
  transmission?: 'Otomatik' | 'Manuel';
  fuel?: 'Benzin' | 'Dizel' | 'Hibrit' | 'Elektrik';
  price: number; // Daily price for rental, total price for sale, price per person for tour
  image?: string;
  images?: string[];
  gallery?: string[];
  location?: string;
  description?: string;
  features?: string[];
  
  // Rental specific
  seats?: number;
  isAvailable?: boolean;
  driverOption?: 'WITH_DRIVER' | 'WITHOUT_DRIVER' | 'BOTH';
  bookedDates?: {start: string, end: string}[];
  deposit?: number;
  minAge?: number;
  minLicenseYears?: number;
  dailyMileageLimit?: number;

  // Sale specific
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
  
  // Tour specific
  duration?: string;
  highlights?: string[];
  mapIframeUrl?: string;
  
  // Badges & Status
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
  isPaintless?: boolean;
  isReplaceFree?: boolean;
  isDamageFree?: boolean;
  hasWarranty?: boolean;
  paintedParts?: string;
  availability?: string;

  // Technical Specs
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
    hood?: 'original' | 'painted' | 'changed';
    frontBumper?: 'original' | 'painted' | 'changed';
    rearBumper?: 'original' | 'painted' | 'changed';
    roof?: 'original' | 'painted' | 'changed';
    trunk?: 'original' | 'painted' | 'changed';
    frontLeftDoor?: 'original' | 'painted' | 'changed';
    frontRightDoor?: 'original' | 'painted' | 'changed';
    rearLeftDoor?: 'original' | 'painted' | 'changed';
    rearRightDoor?: 'original' | 'painted' | 'changed';
    frontLeftFender?: 'original' | 'painted' | 'changed';
    frontRightFender?: 'original' | 'painted' | 'changed';
    rearLeftFender?: 'original' | 'painted' | 'changed';
    rearRightFender?: 'original' | 'painted' | 'changed';
  };
  
  // Showcase flags
  popularityScore?: number;
  displayPriority?: number;
}

// Keep Car, SaleCar, and Tour as aliases for backward compatibility during refactoring
export type Car = Vehicle;
export type SaleCar = Vehicle;
export type Tour = Vehicle;
