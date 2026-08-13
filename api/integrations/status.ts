import { getAppUrl, getPaymentConfig } from "../_lib/integration-config";

export default {
  fetch(): Response {
    const payment = getPaymentConfig();
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
          configured: Boolean(process.env.SMTP_USER && process.env.SMTP_PASS),
        },
        database: {
          configured: Boolean(
            process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT,
          ),
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
