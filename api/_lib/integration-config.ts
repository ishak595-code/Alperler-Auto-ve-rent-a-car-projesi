import { normalizeHttpsOrigin, vercelDeploymentOrigin, vercelProductionOrigin } from './public-origin';

export type PaymentProvider = "none" | "generic_hosted" | "paytr";

export interface ServerPaymentConfig {
  provider: PaymentProvider;
  configured: boolean;
  cardEnabled: boolean;
  eftEnabled: boolean;
  officeEnabled: boolean;
  createSessionUrl: string | null;
  secretKey: string | null;
  merchantId: string | null;
  merchantKey: string | null;
  merchantSalt: string | null;
  testMode: boolean;
  allowedOrigins: string[];
}

function asBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value.trim() === "") return fallback;
  return value.trim().toLowerCase() === "true";
}
function normalizeProvider(value: string | undefined): PaymentProvider {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "paytr") return "paytr";
  if (normalized === "generic_hosted") return "generic_hosted";
  return "none";
}
function normalizeOrigin(value: string): string | null { return normalizeHttpsOrigin(value); }
export function getAppUrl(): string | null {
  const explicit = normalizeHttpsOrigin(process.env.PUBLIC_APP_URL);
  return explicit || vercelProductionOrigin() || vercelDeploymentOrigin();
}
export function getPaymentConfig(): ServerPaymentConfig {
  const provider = normalizeProvider(process.env.PAYMENT_PROVIDER);
  const createSessionUrl = process.env.PAYMENT_CREATE_SESSION_URL?.trim() || null;
  const secretKey = process.env.PAYMENT_SECRET_KEY?.trim() || null;
  const genericMerchantId = process.env.PAYMENT_MERCHANT_ID?.trim() || null;
  const paytrMerchantId = process.env.PAYTR_MERCHANT_ID?.trim() || null;
  const merchantKey = process.env.PAYTR_MERCHANT_KEY?.trim() || null;
  const merchantSalt = process.env.PAYTR_MERCHANT_SALT?.trim() || null;
  const merchantId = provider === "paytr" ? paytrMerchantId : genericMerchantId;
  const configured = provider === "paytr"
    ? Boolean(paytrMerchantId && merchantKey && merchantSalt)
    : provider === "generic_hosted"
      ? Boolean(createSessionUrl && secretKey)
      : false;
  const explicitOrigins = (process.env.PAYMENT_ALLOWED_ORIGINS || "").split(",").map((origin) => origin.trim()).filter(Boolean).map(normalizeOrigin).filter((origin): origin is string => Boolean(origin));
  const appUrl = getAppUrl();
  const productionUrl = vercelProductionOrigin();
  const deploymentUrl = vercelDeploymentOrigin();
  const allowedOrigins = Array.from(new Set([
    ...(appUrl ? [appUrl] : []),
    ...(productionUrl ? [productionUrl] : []),
    ...(deploymentUrl ? [deploymentUrl] : []),
    ...explicitOrigins,
  ]));
  return {
    provider, configured,
    cardEnabled: configured && asBoolean(process.env.PAYMENT_CARD_ENABLED, false),
    eftEnabled: asBoolean(process.env.PAYMENT_EFT_ENABLED, true),
    officeEnabled: asBoolean(process.env.PAYMENT_OFFICE_ENABLED, true),
    createSessionUrl, secretKey, merchantId, merchantKey, merchantSalt,
    testMode: asBoolean(process.env.PAYTR_TEST_MODE, true), allowedOrigins,
  };
}
export function isAllowedRequestOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const normalized = normalizeOrigin(origin);
  if (!normalized) return false;
  const requestOrigin = normalizeHttpsOrigin(request.url);
  if (requestOrigin && normalized === requestOrigin) return true;
  const config = getPaymentConfig();
  if (config.allowedOrigins.includes(normalized)) return true;
  const hostname = new URL(normalized).hostname;
  return process.env.VERCEL_ENV !== "production" && hostname.endsWith(".vercel.app");
}
