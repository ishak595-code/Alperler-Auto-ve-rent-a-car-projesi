export type PaymentMethod = "CARD" | "EFT" | "OFFICE";

export type PaymentProvider = "none" | "generic_hosted";

export interface PaymentIntegrationStatus {
  provider: PaymentProvider;
  configured: boolean;
  cardEnabled: boolean;
  eftEnabled: boolean;
  officeEnabled: boolean;
}

export interface IntegrationStatusResponse {
  environment: "development" | "preview" | "production" | "unknown";
  appUrl: string | null;
  payment: PaymentIntegrationStatus;
  email: {
    configured: boolean;
  };
  database: {
    configured: boolean;
  };
}

export interface PaymentSessionCustomer {
  name: string;
  email: string;
  phone: string;
}

export interface PaymentSessionRequest {
  bookingReference: string;
  amount: number;
  currency: "TRY" | "EUR" | "USD" | "CHF";
  method: "CARD";
  customer: PaymentSessionCustomer;
  returnUrl: string;
  cancelUrl: string;
  description?: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface PaymentSessionResponse {
  ok: boolean;
  status: "ready" | "not_configured" | "rejected" | "error";
  provider: PaymentProvider;
  checkoutUrl?: string;
  externalReference?: string;
  message?: string;
}
