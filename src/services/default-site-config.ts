import { SiteConfig } from "../models/site-config.model";

/**
 * Rendering shell only.
 *
 * Customer-facing business data, pricing, contact details, legal copy, SEO copy,
 * homepage copy and appearance settings are owned by public.site_config and the
 * admin content gateway. This object exists only so Angular has a type-safe,
 * non-sensitive value before the first database read completes. Never add real
 * operational data here.
 */
export const DEFAULT_SITE_CONFIG: SiteConfig = {
  logoUrl: "",
  companyName: "Alperler Rent A Car",
  tagline: "",
  phone: "",
  email: "",
  address: "",
  whatsapp: "",
  whatsappMessage: "",
  instagramUrl: "",
  twitterUrl: "",
  facebookUrl: "",
  youtubeUrl: "",
  tiktokUrl: "",

  rentalExtras: [],
  rentalRoutePricing: [],

  aboutTitle: "",
  aboutText: "",
  team: [],

  kvkkText: "",
  privacyText: "",
  cookiesText: "",
  termsText: "",
  distanceSellingText: "",
  cancellationText: "",
  insuranceText: "",
  rentalTermsText: "",
  hourlyRentalTermsText: "",
  salesTermsText: "",
  tourTermsText: "",
  partnerTermsText: "",
  branchTermsText: "",
  commercialCommunicationText: "",

  theme: "luxury",
  motionPreference: "system",
};
