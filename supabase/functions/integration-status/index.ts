import "jsr:@supabase/functions-js/edge-runtime.d.ts";

function configured(...values: Array<string | undefined>): boolean {
  return values.every((value) => Boolean(value?.trim()));
}

Deno.serve((request) => {
  if (request.method !== "GET") {
    return Response.json({ ok: false, code: "METHOD_NOT_ALLOWED" }, { status: 405 });
  }

  const emailProvider = (Deno.env.get("EMAIL_PROVIDER") || "none").trim().toLowerCase();
  const smsProvider = (Deno.env.get("SMS_PROVIDER") || "none").trim().toLowerCase();
  const emailConfigured =
    emailProvider === "resend" &&
    configured(Deno.env.get("RESEND_API_KEY"), Deno.env.get("MAIL_FROM"));
  const smsConfigured =
    smsProvider === "twilio" &&
    configured(Deno.env.get("TWILIO_ACCOUNT_SID"), Deno.env.get("TWILIO_AUTH_TOKEN")) &&
    Boolean(Deno.env.get("TWILIO_FROM")?.trim() || Deno.env.get("TWILIO_MESSAGING_SERVICE_SID")?.trim());

  return Response.json(
    {
      ok: true,
      database: { provider: "supabase", configured: true, serverVerified: true },
      auth: { provider: "supabase", configured: true },
      email: { provider: emailProvider, configured: emailConfigured },
      sms: { provider: smsProvider, configured: smsConfigured },
      notifications: { workerConfigured: true },
    },
    {
      headers: {
        "cache-control": "no-store",
        "content-type": "application/json; charset=utf-8",
      },
    },
  );
});
