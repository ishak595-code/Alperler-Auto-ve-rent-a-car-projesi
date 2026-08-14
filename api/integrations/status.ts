import { getAppUrl, getPaymentConfig } from "../_lib/integration-config";

const SUPABASE_URL = "https://hrztrgjvgdnaurejnsgs.supabase.co";

interface SupabaseHealth {
  ok?: boolean;
  database?: { provider?: string; configured?: boolean; serverVerified?: boolean };
  auth?: { provider?: string; configured?: boolean };
  email?: { provider?: string; configured?: boolean };
  sms?: { provider?: string; configured?: boolean };
  notifications?: { workerConfigured?: boolean };
}

async function getSupabaseHealth(): Promise<SupabaseHealth> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/integration-status`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) return {};
    return (await response.json()) as SupabaseHealth;
  } catch {
    return {};
  }
}

export default {
  async fetch(): Promise<Response> {
    const payment = getPaymentConfig();
    const supabase = await getSupabaseHealth();
    const environment = process.env.VERCEL_ENV;

    return Response.json(
      {
        environment:
          environment === "development" ||
          environment === "preview" ||
          environment === "production"
            ? environment
            : "unknown",
        appUrl: getAppUrl(),
        payment: {
          provider: payment.provider,
          configured: payment.configured,
          cardEnabled: payment.cardEnabled,
          eftEnabled: payment.eftEnabled,
          officeEnabled: payment.officeEnabled,
        },
        email: {
          provider: supabase.email?.provider || "none",
          configured: Boolean(supabase.email?.configured),
        },
        sms: {
          provider: supabase.sms?.provider || "none",
          configured: Boolean(supabase.sms?.configured),
        },
        database: {
          provider: "supabase",
          configured: Boolean(supabase.database?.configured),
          serverVerified: Boolean(supabase.database?.serverVerified),
        },
        auth: {
          provider: "supabase",
          configured: Boolean(supabase.auth?.configured),
        },
        notifications: {
          workerConfigured: Boolean(supabase.notifications?.workerConfigured),
        },
      },
      {
        headers: {
          "cache-control": "no-store",
          "content-type": "application/json; charset=utf-8",
        },
      },
    );
  },
};
