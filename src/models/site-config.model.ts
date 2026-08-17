export interface TeamMember {
  id: number;
  name: string;
  role: string;
  description: string;
  image: string;
}

export interface RentalExtraOption {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  enabled: boolean;
  sortOrder?: number;
  pricePerDay?: number;
  pricePerHour?: number;
  flatPrice?: number;
}

export interface SiteConfig {
  logoUrl: string;
  logoWidthDesktop?: number;
  logoWidthMobile?: number;
  adminProfileUrl?: string;
  adminEmails?: string[];

  companyName: string;
  tagline?: string;
  phone: string;
  email: string;
  address: string;
  whatsapp: string;
  whatsappUsername?: string;
  whatsappMessage?: string;
  instagramUrl: string;
  twitterUrl: string;
  facebookUrl: string;
  youtubeUrl: string;
  tiktokUrl: string;

  rentalExtras?: RentalExtraOption[];

  seoTitle?: string;
  seoKeywords?: string;
  seoDescription?: string;
  seoAuthor?: string;
  seoOgTitle?: string;
  seoOgDescription?: string;
  seoOgImage?: string;
  seoTwitterHandle?: string;
  googleAnalyticsId?: string;
  googleAdsId?: string;
  metaPixelId?: string;

  aboutTitle: string;
  aboutText: string;
  team: TeamMember[];

  // Core legal texts.
  kvkkText: string;
  privacyText: string;
  cookiesText: string;
  termsText: string;
  distanceSellingText: string;
  cancellationText: string;
  insuranceText: string;

  // Service-specific legal texts. Optional for backward compatibility with
  // older site_config rows; production/admin legal center manages these keys.
  rentalTermsText?: string;
  salesTermsText?: string;
  tourTermsText?: string;
  partnerTermsText?: string;
  branchTermsText?: string;
  commercialCommunicationText?: string;

  theme: "light" | "dark" | "luxury" | "corporate";

  heroTitle?: string;
  heroSubtitle?: string;
  campaignEarlyBooking?: string;
  campaignRoadside?: string;
  campaignFreeDelivery?: string;
  whyUsTitle?: string;
  whyUsSubtitle?: string;
  whyUsTrustTitle?: string;
  whyUsTrustDesc?: string;
  whyUsSupportTitle?: string;
  whyUsSupportDesc?: string;
  whyUsComfortTitle?: string;
  whyUsComfortDesc?: string;
  salesTitle?: string;
  salesDesc?: string;
  salesCta?: string;
  partnerTitle?: string;
  partnerSubtitle?: string;
  partnerRequirementYear?: string;

  homeContent?: {
    heroTitle?: string;
    heroSubtitle?: string;
    heroTrustLine?: string;
    heroCtaSubtext?: string;
    heroCta?: string;

    quickActionLabel?: string;
    quickActionRentTitle?: string;
    quickActionRentDesc?: string;
    quickActionSalesTitle?: string;
    quickActionSalesDesc?: string;
    quickActionToursTitle?: string;
    quickActionToursDesc?: string;
    quickActionSellTitle?: string;
    quickActionSellDesc?: string;

    bookingTitle?: string;
    bookingSubtitle?: string;

    featuredBadge?: string;
    featuredTitle?: string;
    featuredSubtitle?: string;
    featuredViewAll?: string;

    salesBadge?: string;
    salesTitle?: string;
    salesDescription?: string;
    salesViewAll?: string;

    whyUsTitle?: string;
    whyUsSubtitle?: string;
    whyUsTrustTitle?: string;
    whyUsTrustDesc?: string;
    whyUsSupportTitle?: string;
    whyUsSupportDesc?: string;
    whyUsComfortTitle?: string;
    whyUsComfortDesc?: string;

    partnerTitle?: string;
    partnerSubtitle?: string;
    partnerReqTitle?: string;
    partnerFormTitle?: string;

    campaignBannerBadge?: string;
    campaignBannerTitle?: string;
    campaignBannerSubtitle?: string;
    campaignBannerButtonText?: string;

    campaignsEarly?: string;
    campaignsRoadside?: string;
    campaignsFree?: string;
    campaignsDelivery?: string;

    toursTitle?: string;
    toursSubtitle?: string;
    toursViewAll?: string;
    toursBookBtn?: string;
    toursBottomNote?: string;
  };
}
