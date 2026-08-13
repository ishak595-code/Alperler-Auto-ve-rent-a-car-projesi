import { createHash, createSign } from "node:crypto";

interface FirebaseServerConfig {
  configured: boolean;
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

interface OAuthTokenResponse {
  access_token?: string;
  expires_in?: number;
}

interface FirestoreDocumentResponse {
  name?: string;
  fields?: Record<string, FirestoreValue>;
  createTime?: string;
  updateTime?: string;
}

type FirestoreValue =
  | { stringValue: string }
  | { integerValue: string }
  | { doubleValue: number }
  | { booleanValue: boolean }
  | { timestampValue: string }
  | { nullValue: null };

export interface ServerBookingRecord {
  id: string;
  schemaVersion: number;
  type: "RENTAL" | "TOUR" | "SALE_INQUIRY" | "APPOINTMENT";
  itemId: string;
  itemName: string;
  image: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  basePrice: number;
  totalPrice: number;
  currency: "TRY" | "EUR" | "USD" | "CHF";
  personCount: number;
  startDate: string;
  endDate: string;
  days: number;
  withDriver: boolean;
  pickupLocation: string;
  dropoffLocation: string;
  rentalDuration: string;
  notes: string;
  paymentMethod: "NONE" | "CARD" | "EFT" | "OFFICE";
  paymentStatus: "NOT_REQUIRED" | "PENDING" | "PAID" | "FAILED" | "REFUNDED";
  externalPaymentReference: string;
  source: "WEB" | "ADMIN" | "PHONE";
  status: "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED" | "CANCELLED";
  createdAt: string;
  updatedAt: string;
}

export interface NotificationLease {
  acquired: boolean;
  alreadyProcessed: boolean;
  eventKey: string;
}

let cachedToken: { value: string; expiresAt: number } | null = null;
const LEASE_STALE_MS = 10 * 60 * 1000;

export function getFirebaseServerConfig(): FirebaseServerConfig {
  const projectId =
    process.env.FIREBASE_PROJECT_ID?.trim() ||
    process.env.GOOGLE_CLOUD_PROJECT?.trim() ||
    "";
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim() || "";
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || "")
    .replace(/\\n/g, "\n")
    .trim();

  return {
    configured: Boolean(projectId && clientEmail && privateKey),
    projectId,
    clientEmail,
    privateKey,
  };
}

function base64Url(value: string | Buffer): string {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

async function getAccessToken(): Promise<string> {
  const config = getFirebaseServerConfig();
  if (!config.configured) throw new Error("FIRESTORE_SERVER_NOT_CONFIGURED");

  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt - 60_000 > now) {
    return cachedToken.value;
  }

  const issuedAt = Math.floor(now / 1000);
  const unsigned = `${base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${base64Url(
    JSON.stringify({
      iss: config.clientEmail,
      scope: "https://www.googleapis.com/auth/datastore",
      aud: "https://oauth2.googleapis.com/token",
      iat: issuedAt,
      exp: issuedAt + 3600,
    }),
  )}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const assertion = `${unsigned}.${base64Url(signer.sign(config.privateKey))}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`FIRESTORE_OAUTH_FAILED_${response.status}`);

  const body = (await response.json()) as OAuthTokenResponse;
  if (!body.access_token) throw new Error("FIRESTORE_OAUTH_TOKEN_MISSING");
  cachedToken = {
    value: body.access_token,
    expiresAt: now + Math.max(300, body.expires_in || 3600) * 1000,
  };
  return cachedToken.value;
}

function firestoreBaseUrl(): string {
  const config = getFirebaseServerConfig();
  if (!config.configured) throw new Error("FIRESTORE_SERVER_NOT_CONFIGURED");
  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(config.projectId)}/databases/(default)/documents`;
}

function decodeValue(value: FirestoreValue | undefined): unknown {
  if (!value) return undefined;
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("nullValue" in value) return null;
  return undefined;
}

function encodeValue(value: string | number | boolean | null): FirestoreValue {
  if (value === null) return { nullValue: null };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value };
  }
  return { stringValue: value };
}

function decodeFields(
  fields: Record<string, FirestoreValue> | undefined,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(fields || {}).map(([key, value]) => [key, decodeValue(value)]),
  );
}

function asFirestoreFields(
  values: Record<string, string | number | boolean | null>,
): Record<string, FirestoreValue> {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, encodeValue(value)]),
  );
}

function isBookingType(value: unknown): value is ServerBookingRecord["type"] {
  return ["RENTAL", "TOUR", "SALE_INQUIRY", "APPOINTMENT"].includes(String(value));
}

function isBookingStatus(value: unknown): value is ServerBookingRecord["status"] {
  return ["PENDING", "APPROVED", "REJECTED", "COMPLETED", "CANCELLED"].includes(
    String(value),
  );
}

export async function fetchBookingById(
  bookingId: string,
): Promise<ServerBookingRecord | null> {
  if (!/^RES-[0-9]{13}-[A-Z0-9]{8}$/.test(bookingId)) return null;
  const token = await getAccessToken();
  const response = await fetch(
    `${firestoreBaseUrl()}/bookings/${encodeURIComponent(bookingId)}`,
    {
      headers: { authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8_000),
    },
  );
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`FIRESTORE_BOOKING_READ_FAILED_${response.status}`);

  const document = (await response.json()) as FirestoreDocumentResponse;
  const data = decodeFields(document.fields);
  if (!isBookingType(data.type) || !isBookingStatus(data.status)) return null;

  return {
    id: bookingId,
    schemaVersion: Number(data.schemaVersion || 0),
    type: data.type,
    itemId: String(data.itemId || ""),
    itemName: String(data.itemName || ""),
    image: String(data.image || ""),
    customerName: String(data.customerName || ""),
    customerEmail: String(data.customerEmail || ""),
    customerPhone: String(data.customerPhone || ""),
    basePrice: Number(data.basePrice || 0),
    totalPrice: Number(data.totalPrice || 0),
    currency: (["TRY", "EUR", "USD", "CHF"].includes(String(data.currency))
      ? data.currency
      : "TRY") as ServerBookingRecord["currency"],
    personCount: Number(data.personCount || 0),
    startDate: String(data.startDate || ""),
    endDate: String(data.endDate || ""),
    days: Number(data.days || 0),
    withDriver: Boolean(data.withDriver),
    pickupLocation: String(data.pickupLocation || ""),
    dropoffLocation: String(data.dropoffLocation || ""),
    rentalDuration: String(data.rentalDuration || ""),
    notes: String(data.notes || ""),
    paymentMethod: (["NONE", "CARD", "EFT", "OFFICE"].includes(String(data.paymentMethod))
      ? data.paymentMethod
      : "NONE") as ServerBookingRecord["paymentMethod"],
    paymentStatus: (["NOT_REQUIRED", "PENDING", "PAID", "FAILED", "REFUNDED"].includes(String(data.paymentStatus))
      ? data.paymentStatus
      : "NOT_REQUIRED") as ServerBookingRecord["paymentStatus"],
    externalPaymentReference: String(data.externalPaymentReference || ""),
    source: (["WEB", "ADMIN", "PHONE"].includes(String(data.source))
      ? data.source
      : "WEB") as ServerBookingRecord["source"],
    status: data.status,
    createdAt: String(data.createdAt || document.createTime || ""),
    updatedAt: String(data.updatedAt || document.updateTime || ""),
  };
}

function eventDocumentKey(bookingId: string, event: string, version: string): string {
  return createHash("sha256")
    .update(`${bookingId}|${event}|${version}`)
    .digest("hex")
    .slice(0, 32);
}

async function getNotificationEvent(
  token: string,
  bookingId: string,
  eventKey: string,
): Promise<FirestoreDocumentResponse | null> {
  const response = await fetch(
    `${firestoreBaseUrl()}/bookings/${encodeURIComponent(bookingId)}/notificationEvents/${encodeURIComponent(eventKey)}`,
    {
      headers: { authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8_000),
    },
  );
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`NOTIFICATION_LEDGER_READ_FAILED_${response.status}`);
  return (await response.json()) as FirestoreDocumentResponse;
}

async function retryExistingLease(input: {
  token: string;
  bookingId: string;
  eventKey: string;
  existingDocument: FirestoreDocumentResponse;
}): Promise<boolean> {
  const data = decodeFields(input.existingDocument.fields);
  const status = String(data.status || "");
  const startedAt = Date.parse(String(data.startedAt || ""));
  const processingIsStale =
    status === "PROCESSING" &&
    Number.isFinite(startedAt) &&
    Date.now() - startedAt > LEASE_STALE_MS;
  const retryable = status === "FAILED" || status === "SKIPPED" || processingIsStale;
  if (!retryable || !input.existingDocument.updateTime) return false;

  const fields = asFirestoreFields({
    status: "PROCESSING",
    startedAt: new Date().toISOString(),
    completedAt: "",
  });
  const updateMask = Object.keys(fields)
    .map((key) => `updateMask.fieldPaths=${encodeURIComponent(key)}`)
    .join("&");
  const precondition = `currentDocument.updateTime=${encodeURIComponent(input.existingDocument.updateTime)}`;
  const response = await fetch(
    `${firestoreBaseUrl()}/bookings/${encodeURIComponent(input.bookingId)}/notificationEvents/${encodeURIComponent(input.eventKey)}?${updateMask}&${precondition}`,
    {
      method: "PATCH",
      headers: {
        authorization: `Bearer ${input.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ fields }),
      signal: AbortSignal.timeout(8_000),
    },
  );

  if (response.status === 409 || response.status === 412) return false;
  if (!response.ok) throw new Error(`NOTIFICATION_RETRY_LEASE_FAILED_${response.status}`);
  return true;
}

export async function acquireNotificationLease(input: {
  bookingId: string;
  event: string;
  bookingVersion: string;
}): Promise<NotificationLease> {
  const token = await getAccessToken();
  const eventKey = eventDocumentKey(
    input.bookingId,
    input.event,
    input.bookingVersion || "unknown",
  );
  const now = new Date().toISOString();
  const response = await fetch(
    `${firestoreBaseUrl()}/bookings/${encodeURIComponent(input.bookingId)}/notificationEvents?documentId=${eventKey}`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        fields: asFirestoreFields({
          event: input.event,
          status: "PROCESSING",
          bookingVersion: input.bookingVersion || "",
          startedAt: now,
          completedAt: "",
        }),
      }),
      signal: AbortSignal.timeout(8_000),
    },
  );

  if (response.status === 409) {
    const existingDocument = await getNotificationEvent(
      token,
      input.bookingId,
      eventKey,
    );
    if (!existingDocument) {
      throw new Error("NOTIFICATION_LEDGER_CONFLICT_WITHOUT_DOCUMENT");
    }
    const acquired = await retryExistingLease({
      token,
      bookingId: input.bookingId,
      eventKey,
      existingDocument,
    });
    return { acquired, alreadyProcessed: !acquired, eventKey };
  }
  if (!response.ok) throw new Error(`NOTIFICATION_LEASE_FAILED_${response.status}`);
  return { acquired: true, alreadyProcessed: false, eventKey };
}

export async function completeNotificationLease(input: {
  bookingId: string;
  eventKey: string;
  status: "SENT" | "PARTIAL" | "FAILED" | "SKIPPED";
  emailStatus: string;
  smsStatus: string;
  adminEmailStatus: string;
  emailMessageId?: string;
  smsMessageId?: string;
  adminEmailMessageId?: string;
}): Promise<void> {
  const token = await getAccessToken();
  const fields = asFirestoreFields({
    status: input.status,
    emailStatus: input.emailStatus,
    smsStatus: input.smsStatus,
    adminEmailStatus: input.adminEmailStatus,
    emailMessageId: input.emailMessageId || "",
    smsMessageId: input.smsMessageId || "",
    adminEmailMessageId: input.adminEmailMessageId || "",
    completedAt: new Date().toISOString(),
  });
  const updateMask = Object.keys(fields)
    .map((key) => `updateMask.fieldPaths=${encodeURIComponent(key)}`)
    .join("&");
  const response = await fetch(
    `${firestoreBaseUrl()}/bookings/${encodeURIComponent(input.bookingId)}/notificationEvents/${encodeURIComponent(input.eventKey)}?${updateMask}`,
    {
      method: "PATCH",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ fields }),
      signal: AbortSignal.timeout(8_000),
    },
  );
  if (!response.ok) {
    throw new Error(`NOTIFICATION_LEDGER_UPDATE_FAILED_${response.status}`);
  }
}
