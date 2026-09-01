import { getIyzicoCredentials, getPaymentConfig, IyzicoCredentialSet, PaytrServerConfig } from './integration-config';

type VaultCredentialPayload = {
  configured?: unknown;
  merchantId?: unknown;
  merchantKey?: unknown;
  merchantSalt?: unknown;
  apiKey?: unknown;
  secretKey?: unknown;
};

export interface PaymentCredentialAvailability {
  paytr: boolean;
  iyzicoSandbox: boolean;
  iyzicoLive: boolean;
}

function clean(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function serviceConfig(): { url: string; key: string; configured: boolean } {
  const url = process.env.SUPABASE_PROJECT_URL?.trim() || process.env.SUPABASE_URL?.trim() || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || '';
  return { url, key, configured: Boolean(url && key) };
}

async function vaultCredentials(provider: 'PAYTR' | 'IYZICO', testMode: boolean): Promise<VaultCredentialPayload | null> {
  const cfg = serviceConfig();
  if (!cfg.configured) return null;
  try {
    const response = await fetch(`${cfg.url}/rest/v1/rpc/service_payment_provider_credentials_v221`, {
      method: 'POST',
      headers: {
        apikey: cfg.key,
        authorization: `Bearer ${cfg.key}`,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({ p_provider: provider, p_test_mode: testMode }),
      cache: 'no-store',
      signal: AbortSignal.timeout(7_000),
    });
    if (!response.ok) return null;
    const payload = await response.json().catch(() => null) as VaultCredentialPayload | null;
    return payload && payload.configured === true ? payload : null;
  } catch {
    return null;
  }
}

export async function resolvePaytrCredentials(): Promise<PaytrServerConfig> {
  const env = getPaymentConfig().paytr;
  const vault = await vaultCredentials('PAYTR', true);
  if (!vault) return env;
  const merchantId = clean(vault.merchantId);
  const merchantKey = clean(vault.merchantKey);
  const merchantSalt = clean(vault.merchantSalt);
  if (!merchantId || !merchantKey || !merchantSalt) return env;
  return {
    configured: true,
    merchantId,
    merchantKey,
    merchantSalt,
    testMode: env.testMode,
  };
}

export async function resolveIyzicoCredentials(testMode: boolean): Promise<IyzicoCredentialSet> {
  const env = getIyzicoCredentials(testMode);
  const vault = await vaultCredentials('IYZICO', testMode);
  if (!vault) return env;
  const apiKey = clean(vault.apiKey);
  const secretKey = clean(vault.secretKey);
  if (!apiKey || !secretKey) return env;
  return {
    configured: true,
    apiKey,
    secretKey,
    baseUrl: testMode ? 'https://sandbox-api.iyzipay.com' : 'https://api.iyzipay.com',
  };
}

export async function paymentCredentialAvailability(): Promise<PaymentCredentialAvailability> {
  const [paytr, sandbox, live] = await Promise.all([
    resolvePaytrCredentials(),
    resolveIyzicoCredentials(true),
    resolveIyzicoCredentials(false),
  ]);
  return {
    paytr: paytr.configured,
    iyzicoSandbox: sandbox.configured,
    iyzicoLive: live.configured,
  };
}
