import { isAllowedRequestOrigin } from "./_lib/integration-config";
import { getMailerConfig, sendConfiguredMail } from "./_lib/mailer";

interface EmailRequestBody {
  to?: unknown;
  subject?: unknown;
  text?: unknown;
  html?: unknown;
}

interface RateBucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, RateBucket>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 10;

function json(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
    },
  });
}

function clientKey(request: Request): string {
  return (
    request.headers.get("x-vercel-forwarded-for") ||
    request.headers.get("x-forwarded-for") ||
    "unknown"
  )
    .split(",")[0]
    .trim()
    .slice(0, 128);
}

function rateLimited(request: Request): boolean {
  const now = Date.now();
  const key = clientKey(request);
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > MAX_REQUESTS;
}

function text(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) return null;
  return normalized;
}

function email(value: unknown): string | null {
  const normalized = text(value, 160)?.toLowerCase() || null;
  return normalized && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
    ? normalized
    : null;
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== "POST") {
      return json({ success: false, code: "METHOD_NOT_ALLOWED" }, 405);
    }
    if (!isAllowedRequestOrigin(request)) {
      return json({ success: false, code: "ORIGIN_NOT_ALLOWED" }, 403);
    }
    if (rateLimited(request)) {
      return json({ success: false, code: "RATE_LIMITED" }, 429);
    }

    const config = getMailerConfig();
    if (!config.configured) {
      return json(
        {
          success: false,
          code: "EMAIL_NOT_CONFIGURED",
          message: "E-posta sağlayıcısı henüz yapılandırılmamış.",
        },
        503,
      );
    }

    let body: EmailRequestBody;
    try {
      body = (await request.json()) as EmailRequestBody;
    } catch {
      return json({ success: false, code: "INVALID_JSON" }, 400);
    }

    const requestedRecipient = body.to === undefined ? null : email(body.to);
    const to = requestedRecipient || config.adminTo;
    const subject = text(body.subject, 180);
    const bodyText = text(body.text, 20_000);
    const html =
      typeof body.html === "string" && body.html.length <= 50_000
        ? body.html
        : undefined;

    if (!to || !subject || !bodyText || (body.to !== undefined && !requestedRecipient)) {
      return json({ success: false, code: "INVALID_EMAIL_REQUEST" }, 400);
    }

    if (!config.allowedRecipients.has(to)) {
      return json(
        {
          success: false,
          code: "RECIPIENT_NOT_ALLOWED",
          message:
            "Tarayıcıdan doğrudan e-posta gönderimi yalnızca yapılandırılmış işletme adreslerine açıktır.",
        },
        403,
      );
    }

    try {
      const result = await sendConfiguredMail({
        to,
        subject,
        text: bodyText,
        html,
      });
      return json({ success: true, messageId: result.messageId });
    } catch (error) {
      console.error("Transactional email delivery failed.", error);
      return json(
        {
          success: false,
          code: "EMAIL_DELIVERY_FAILED",
          message: "E-posta sağlayıcısı gönderimi tamamlayamadı.",
        },
        502,
      );
    }
  },
};
