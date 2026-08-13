import { getFirebaseServerConfig } from "../_lib/firestore-rest";
import { getAppUrl, getPaymentConfig } from "../_lib/integration-config";
import { getMailerConfig } from "../_lib/mailer";
import { getSmsConfig } from "../_lib/sms";

export default {
  fetch(): Response {
    const payment = getPaymentConfig();
    const mail = getMailerConfig();
    const sms = getSmsConfig();
    const firebaseServer = getFirebaseServerConfig();
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
          configured: mail.configured,
        },
        sms: {
          provider: sms.provider,
          configured: sms.configured,
        },
        database: {
          configured: firebaseServer.configured,
          serverVerified: firebaseServer.configured,
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
