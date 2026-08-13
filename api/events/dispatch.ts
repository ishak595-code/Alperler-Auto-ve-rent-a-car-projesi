import { createHmac, randomUUID } from "node:crypto";
import { isAllowedRequestOrigin } from "../_lib/integration-config";
import { getWebhookConfig } from "../_lib/webhook-config";

type AllowedEvent =
  | "new_booking"
  | "new_contact_message"
  | "new_partner_request"
  | "booking_status_changed";

const allowedEvents = new Set<AllowedEvent>([
  "new_booking",
  "new_contact_message",
  "new_partner_request",
  "booking_status_changed",
]);

interface EventRequest {
  event?: unknown;
  data?: unknown;
}

interface RateBucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, RateBucket>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 60;

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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== "POST") {
      return json({ accepted: false, code: "METHOD_NOT_ALLOWED" }, 405);
    }
    if (!isAllowedRequestOrigin(request)) {
      return json({ accepted: false, code: "ORIGIN_NOT_ALLOWED" }, 403);
    }
    if (rateLimited(request)) {
      return json({ accepted: false, code: "RATE_LIMITED" }, 429);
    }

    let body: EventRequest;
    try {
      body = (await request.json()) as EventRequest;
    } catch {
      return json({ accepted: false, code: "INVALID_JSON" }, 400);
    }

    if (
      typeof body.event !== "string" ||
      !allowedEvents.has(body.event as AllowedEvent) ||
      !isPlainObject(body.data)
    ) {
      return json({ accepted: false, code: "INVALID_EVENT" }, 400);
    }

    const serializedData = JSON.stringify(body.data);
    if (serializedData.length > 32_000) {
      return json({ accepted: false, code: "PAYLOAD_TOO_LARGE" }, 413);
    }

    const config = getWebhookConfig();
    if (!config.configured || !config.url || !config.secret) {
      return json({ accepted: false, status: "disabled" }, 202);
    }

    const eventId = randomUUID();
    const envelope = JSON.stringify({
      version: 1,
      id: eventId,
      event: body.event,
      occurredAt: new Date().toISOString(),
      data: body.data,
    });
    const signature = createHmac("sha256", config.secret)
      .update(envelope)
      .digest("hex");

    try {
      const upstream = await fetch(config.url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-alperler-event": body.event,
          "x-alperler-event-id": eventId,
          "x-alperler-signature": `sha256=${signature}`,
        },
        body: envelope,
        signal: AbortSignal.timeout(8_000),
      });

      if (!upstream.ok) {
        console.error("Configured webhook rejected event.", {
          event: body.event,
          status: upstream.status,
        });
        return json({ accepted: false, status: "rejected" }, 502);
      }

      return json({ accepted: true, status: "delivered", eventId });
    } catch (error) {
      console.error("Configured webhook delivery failed.", error);
      return json({ accepted: false, status: "unavailable" }, 502);
    }
  },
};
