export type SmsProvider = "none" | "twilio";

export interface SmsConfig {
  provider: SmsProvider;
  configured: boolean;
  accountSid: string;
  authToken: string;
  from: string;
  messagingServiceSid: string;
}

export interface SmsResult {
  messageId: string;
  status: string;
}

interface TwilioResponse {
  sid?: string;
  status?: string;
  message?: string;
}

export function getSmsConfig(): SmsConfig {
  const provider: SmsProvider =
    process.env.SMS_PROVIDER?.trim().toLowerCase() === "twilio"
      ? "twilio"
      : "none";
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim() || "";
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim() || "";
  const from = process.env.TWILIO_FROM?.trim() || "";
  const messagingServiceSid =
    process.env.TWILIO_MESSAGING_SERVICE_SID?.trim() || "";

  return {
    provider,
    configured:
      provider === "twilio" &&
      Boolean(accountSid && authToken && (from || messagingServiceSid)),
    accountSid,
    authToken,
    from,
    messagingServiceSid,
  };
}

export function normalizePhone(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;

  let normalized = raw.replace(/[^0-9+]/g, "");
  if (normalized.startsWith("00")) normalized = `+${normalized.slice(2)}`;
  if (/^05\d{9}$/.test(normalized)) normalized = `+9${normalized}`;
  else if (/^5\d{9}$/.test(normalized)) normalized = `+90${normalized}`;
  else if (/^90\d{10}$/.test(normalized)) normalized = `+${normalized}`;

  return /^\+[1-9]\d{7,14}$/.test(normalized) ? normalized : null;
}

export async function sendConfiguredSms(input: {
  to: string;
  body: string;
}): Promise<SmsResult> {
  const config = getSmsConfig();
  if (!config.configured) throw new Error("SMS_NOT_CONFIGURED");

  const to = normalizePhone(input.to);
  if (!to) throw new Error("INVALID_SMS_RECIPIENT");
  const body = input.body.trim().slice(0, 640);
  if (!body) throw new Error("INVALID_SMS_BODY");

  const payload = new URLSearchParams({ To: to, Body: body });
  if (config.messagingServiceSid) {
    payload.set("MessagingServiceSid", config.messagingServiceSid);
  } else {
    payload.set("From", config.from);
  }

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(config.accountSid)}/Messages.json`,
    {
      method: "POST",
      headers: {
        authorization: `Basic ${Buffer.from(`${config.accountSid}:${config.authToken}`).toString("base64")}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: payload,
      signal: AbortSignal.timeout(8_000),
    },
  );

  const responseBody = (await response.json().catch(() => ({}))) as TwilioResponse;
  if (!response.ok || !responseBody.sid) {
    console.error("SMS provider rejected transactional message.", {
      status: response.status,
      providerMessage: responseBody.message || "unknown",
    });
    throw new Error(`SMS_DELIVERY_FAILED_${response.status}`);
  }

  return {
    messageId: responseBody.sid,
    status: responseBody.status || "accepted",
  };
}
