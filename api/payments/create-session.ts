import {
  getPaymentConfig,
  isAllowedRequestOrigin,
} from "../_lib/integration-config";

interface CreateSessionBody {
  bookingReference?: unknown;
  amount?: unknown;
  currency?: unknown;
  method?: unknown;
  customer?: {
    name?: unknown;
    email?: unknown;
    phone?: unknown;
  };
  returnUrl?: unknown;
  cancelUrl?: unknown;
  description?: unknown;
  metadata?: unknown;
}

const currencies = new Set(["TRY", "EUR", "USD", "CHF"]);

function json(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
    },
  });
}

function isNonEmptyString(value: unknown, maxLength: number): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.trim().length <= maxLength
  );
}

function isSafeReturnUrl(value: unknown, allowedOrigins: string[]): value is string {
  if (!isNonEmptyString(value, 2048)) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && allowedOrigins.includes(url.origin);
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== "POST") {
      return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
    }

    if (!isAllowedRequestOrigin(request)) {
      return json({ ok: false, code: "ORIGIN_NOT_ALLOWED" }, 403);
    }

    const config = getPaymentConfig();
    if (!config.cardEnabled || !config.createSessionUrl || !config.secretKey) {
      return json(
        {
          ok: false,
          status: "not_configured",
          provider: config.provider,
          code: "PAYMENT_PROVIDER_NOT_CONFIGURED",
          message:
            "Online kart ödeme altyapısı yapılandırılmamış. Diğer ödeme yöntemlerini kullanabilirsiniz.",
        },
        503,
      );
    }

    let body: CreateSessionBody;
    try {
      body = (await request.json()) as CreateSessionBody;
    } catch {
      return json({ ok: false, code: "INVALID_JSON" }, 400);
    }

    const amount = typeof body.amount === "number" ? body.amount : Number.NaN;
    const currency = typeof body.currency === "string" ? body.currency : "";
    const customer = body.customer;

    if (
      !isNonEmptyString(body.bookingReference, 128) ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      amount > 10_000_000 ||
      !currencies.has(currency) ||
      body.method !== "CARD" ||
      !customer ||
      !isNonEmptyString(customer.name, 160) ||
      !isNonEmptyString(customer.email, 160) ||
      !customer.email.includes("@") ||
      !isNonEmptyString(customer.phone, 40) ||
      !isSafeReturnUrl(body.returnUrl, config.allowedOrigins) ||
      !isSafeReturnUrl(body.cancelUrl, config.allowedOrigins)
    ) {
      return json({ ok: false, code: "INVALID_PAYMENT_REQUEST" }, 400);
    }

    const upstreamPayload = {
      version: 1,
      bookingReference: body.bookingReference.trim(),
      amount,
      currency,
      method: "CARD",
      customer: {
        name: customer.name.trim(),
        email: customer.email.trim().toLowerCase(),
        phone: customer.phone.trim(),
      },
      returnUrl: body.returnUrl,
      cancelUrl: body.cancelUrl,
      description:
        typeof body.description === "string"
          ? body.description.trim().slice(0, 500)
          : undefined,
      metadata:
        body.metadata && typeof body.metadata === "object" ? body.metadata : undefined,
      merchantId: config.merchantId || undefined,
    };

    try {
      const upstream = await fetch(config.createSessionUrl, {
        method: "POST",
        headers: {
          authorization: `Bearer ${config.secretKey}`,
          "content-type": "application/json",
          "x-alperler-contract-version": "1",
          ...(config.merchantId
            ? { "x-merchant-id": config.merchantId }
            : {}),
        },
        body: JSON.stringify(upstreamPayload),
        signal: AbortSignal.timeout(12_000),
      });

      if (!upstream.ok) {
        console.error("Payment gateway rejected create-session request.", {
          status: upstream.status,
          provider: config.provider,
        });
        return json(
          {
            ok: false,
            status: "rejected",
            provider: config.provider,
            code: "PAYMENT_GATEWAY_REJECTED",
            message: "Ödeme sağlayıcısı işlemi başlatamadı.",
          },
          502,
        );
      }

      const result = (await upstream.json()) as Record<string, unknown>;
      const checkoutUrl =
        typeof result.checkoutUrl === "string"
          ? result.checkoutUrl
          : typeof result.url === "string"
            ? result.url
            : null;
      const externalReference =
        typeof result.externalReference === "string"
          ? result.externalReference
          : typeof result.reference === "string"
            ? result.reference
            : typeof result.id === "string"
              ? result.id
              : undefined;

      if (!checkoutUrl || !checkoutUrl.startsWith("https://")) {
        return json(
          {
            ok: false,
            status: "error",
            provider: config.provider,
            code: "INVALID_GATEWAY_RESPONSE",
          },
          502,
        );
      }

      return json({
        ok: true,
        status: "ready",
        provider: config.provider,
        checkoutUrl,
        externalReference,
      });
    } catch (error) {
      console.error("Payment gateway create-session request failed.", error);
      return json(
        {
          ok: false,
          status: "error",
          provider: config.provider,
          code: "PAYMENT_GATEWAY_UNAVAILABLE",
          message: "Ödeme sağlayıcısına şu anda ulaşılamıyor.",
        },
        502,
      );
    }
  },
};
