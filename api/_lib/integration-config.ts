import { normalizeHttpsOrigin, vercelDeploymentOrigin, vercelProductionOrigin } from './public-origin';

export type PaymentProvider = "none" | "paytr" | "iyzico";

export interface PaytrServerConfig {
  configured: boolean;
  merchantId: string | null;
  merchantKey: string | null;
  merchantSalt: string | null;
  testMode: boolean;
}
export interface IyzicoCredentialSet {
  configured: boolean;
  apiKey: string | null;
  secretKey: string | null;
  baseUrl: string;
}
export interface ServerPaymentConfig {
  paytr: PaytrServerConfig;
  iyzico: { sandbox: IyzicoCredentialSet; live: IyzicoCredentialSet };
  cardEnabled: boolean;
  eftEnabled: boolean;
  officeEnabled: boolean;
  allowedOrigins: string[];
}

function asBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value.trim() === "") return fallback;
  return value.trim().toLowerCase() === "true";
}
function normalizeOrigin(value: string): string | null { return normalizeHttpsOrigin(value); }
export function getAppUrl(): string | null {
  const explicit = normalizeHttpsOrigin(process.env.PUBLIC_APP_URL);
  return explicit || vercelProductionOrigin() || vercelDeploymentOrigin();
}
function credentialSet(apiKey: string | undefined, secretKey: string | undefined, baseUrl: string): IyzicoCredentialSet {
  const cleanApiKey = apiKey?.trim() || null;
  const cleanSecretKey = secretKey?.trim() || null;
  return { configured: Boolean(cleanApiKey && cleanSecretKey), apiKey: cleanApiKey, secretKey: cleanSecretKey, baseUrl };
}
export function getPaymentConfig(): ServerPaymentConfig {
  const paytrMerchantId = process.env.PAYTR_MERCHANT_ID?.trim() || null;
  const paytrMerchantKey = process.env.PAYTR_MERCHANT_KEY?.trim() || null;
  const paytrMerchantSalt = process.env.PAYTR_MERCHANT_SALT?.trim() || null;
  const explicitOrigins = (process.env.PAYMENT_ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map(normalizeOrigin)
    .filter((origin): origin is string => Boolean(origin));
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
    paytr: {
      configured: Boolean(paytrMerchantId && paytrMerchantKey && paytrMerchantSalt),
      merchantId: paytrMerchantId,
      merchantKey: paytrMerchantKey,
      merchantSalt: paytrMerchantSalt,
      testMode: asBoolean(process.env.PAYTR_TEST_MODE, true),
    },
    iyzico: {
      sandbox: credentialSet(process.env.IYZICO_SANDBOX_API_KEY, process.env.IYZICO_SANDBOX_SECRET_KEY, "https://sandbox-api.iyzipay.com"),
      live: credentialSet(process.env.IYZICO_API_KEY, process.env.IYZICO_SECRET_KEY, "https://api.iyzipay.com"),
    },
    cardEnabled: asBoolean(process.env.PAYMENT_CARD_ENABLED, false),
    eftEnabled: asBoolean(process.env.PAYMENT_EFT_ENABLED, true),
    officeEnabled: asBoolean(process.env.PAYMENT_OFFICE_ENABLED, true),
    allowedOrigins,
  };
}
export function getIyzicoCredentials(testMode: boolean): IyzicoCredentialSet {
  const config = getPaymentConfig();
  return testMode ? config.iyzico.sandbox : config.iyzico.live;
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
