export type PaymentMethod = "CARD" | "EFT" | "OFFICE";
export type PaymentProvider = "none" | "paytr" | "iyzico";

export interface PaymentProviderDetails {
  globalCardGate: boolean;
  paytr: {
    configured: boolean;
    forceTestMode: boolean;
  };
  iyzico: {
    sandboxConfigured: boolean;
    liveConfigured: boolean;
  };
}

export interface PaymentIntegrationStatus {
  provider: PaymentProvider;
  configured: boolean;
  cardEnabled: boolean;
  eftEnabled: boolean;
  officeEnabled: boolean;
  availableProviders?: { paytr: boolean; iyzico: boolean };
  providerDetails?: PaymentProviderDetails;
}
export interface EmailIntegrationStatus { configured: boolean; }
export interface SmsIntegrationStatus { provider: "none" | "twilio"; configured: boolean; }
export interface IntegrationStatusResponse {
  environment: "development" | "preview" | "production" | "unknown";
  appUrl: string | null;
  payment: PaymentIntegrationStatus;
  email: EmailIntegrationStatus;
  sms: SmsIntegrationStatus;
  database: { configured: boolean; serverVerified?: boolean; };
}
export interface PaymentSessionCustomer {
  name: string;
  email: string;
  phone: string;
  identityNumber?: string;
  billingAddress?: string;
  city?: string;
  country?: string;
  zipCode?: string;
}
export interface PaymentSessionRequest {
  bookingReference: string;
  amount: number;
  currency: "TRY" | "EUR" | "USD" | "CHF";
  method: "CARD";
  paymentMethodId?: string;
  customer: PaymentSessionCustomer;
  returnUrl: string;
  cancelUrl: string;
  description?: string;
  metadata?: Record<string, string | number | boolean>;
}
export interface PaymentSessionResponse {
  ok: boolean;
  status: "ready" | "paid" | "not_configured" | "rejected" | "error";
  provider: PaymentProvider;
  checkoutUrl?: string;
  externalReference?: string;
  message?: string;
}
