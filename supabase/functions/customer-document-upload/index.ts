import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const BUCKET = "customer-documents";
const MAX_BYTES = 10 * 1024 * 1024;
const DOCUMENT_TYPES = new Set([
  "IDENTITY_FRONT",
  "IDENTITY_BACK",
  "DRIVING_LICENSE_FRONT",
  "DRIVING_LICENSE_BACK",
  "PASSPORT",
  "ADDRESS_DOCUMENT",
  "OTHER",
]);

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, max) : "";
}
function requestId(request: Request): string {
  const supplied = clean(request.headers.get("x-request-id"), 80);
  return /^[A-Za-z0-9._:-]{8,80}$/.test(supplied) ? supplied : crypto.randomUUID();
}
function json(body: unknown, status: number, id: string): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-request-id": id,
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
    },
  });
}
function serviceHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return { apikey: SERVICE_KEY, authorization: `Bearer ${SERVICE_KEY}`, "content-type": "application/json", ...extra };
}
async function db(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { ...serviceHeaders(), ...(init.headers || {}) },
    signal: init.signal || AbortSignal.timeout(10_000),
  });
}
async function authenticatedUser(request: Request): Promise<{ id: string; email?: string }> {
  const authorization = request.headers.get("authorization") || "";
  if (!/^Bearer\s+\S+/i.test(authorization)) throw new Error("UNAUTHORIZED");
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SERVICE_KEY, authorization },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error("UNAUTHORIZED");
  const user = await response.json();
  const id = clean(user?.id, 80);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) throw new Error("UNAUTHORIZED");
  return { id, email: clean(user?.email, 160).toLowerCase() || undefined };
}
async function activeConsent(userId: string): Promise<boolean> {
  const terms = await db("customer_vault_terms?is_active=eq.true&select=version&order=published_at.desc&limit=1");
  if (!terms.ok) throw new Error("VAULT_TERMS_UNAVAILABLE");
  const termRows = await terms.json();
  const version = clean(termRows?.[0]?.version, 120);
  if (!version) return false;
  const consent = await db(`customer_vault_consents?user_id=eq.${encodeURIComponent(userId)}&terms_version=eq.${encodeURIComponent(version)}&revoked_at=is.null&select=user_id&limit=1`);
  if (!consent.ok) throw new Error("VAULT_CONSENT_UNAVAILABLE");
  const rows = await consent.json();
  return Array.isArray(rows) && Boolean(rows[0]?.user_id);
}

type VerifiedType = { mime: "image/jpeg" | "image/png" | "image/webp" | "application/pdf"; extension: "jpg" | "png" | "webp" | "pdf" };
function verifySignature(bytes: Uint8Array): VerifiedType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { mime: "image/jpeg", extension: "jpg" };
  if (bytes.length >= 8 && [0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a].every((value, index) => bytes[index] === value)) return { mime: "image/png", extension: "png" };
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0,4)) === "RIFF" && String.fromCharCode(...bytes.slice(8,12)) === "WEBP") return { mime: "image/webp", extension: "webp" };
  if (bytes.length >= 5 && String.fromCharCode(...bytes.slice(0,5)) === "%PDF-") return { mime: "application/pdf", extension: "pdf" };
  return null;
}
function expiryDate(value: FormDataEntryValue | null): string | null {
  const raw = clean(typeof value === "string" ? value : "", 10);
  if (!raw) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) throw new Error("DOCUMENT_EXPIRY_INVALID");
  const parsed = new Date(`${raw}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== raw) throw new Error("DOCUMENT_EXPIRY_INVALID");
  return raw;
}
async function removeStorage(path: string): Promise<void> {
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encoded}`, {
    method: "DELETE",
    headers: { apikey: SERVICE_KEY, authorization: `Bearer ${SERVICE_KEY}` },
    signal: AbortSignal.timeout(10_000),
  }).catch(() => undefined);
}

Deno.serve(async (request) => {
  const id = requestId(request);
  if (request.method !== "POST") return json({ ok: false, code: "METHOD_NOT_ALLOWED", requestId: id }, 405, id);
  if (!SUPABASE_URL || !SERVICE_KEY) return json({ ok: false, code: "SERVER_CONFIG_MISSING", requestId: id }, 503, id);
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_BYTES + 1_000_000) return json({ ok: false, code: "DOCUMENT_SIZE_INVALID", requestId: id }, 413, id);

  try {
    const user = await authenticatedUser(request);
    const userAuthorization = request.headers.get("authorization") || "";
    if (!(await activeConsent(user.id))) return json({ ok: false, code: "VAULT_CONSENT_REQUIRED", message: "Belge kasası koşullarını kabul etmeniz gerekiyor.", requestId: id }, 403, id);
    const form = await request.formData();
    const fileValue = form.get("file");
    if (!(fileValue instanceof File)) throw new Error("DOCUMENT_FILE_REQUIRED");
    if (fileValue.size <= 0 || fileValue.size > MAX_BYTES) throw new Error("DOCUMENT_SIZE_INVALID");
    const documentType = clean(form.get("documentType"), 40).toUpperCase();
    if (!DOCUMENT_TYPES.has(documentType)) throw new Error("DOCUMENT_TYPE_INVALID");
    const expiry = expiryDate(form.get("expiryDate"));

    const buffer = await fileValue.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const verified = verifySignature(bytes);
    if (!verified) throw new Error("DOCUMENT_SIGNATURE_INVALID");
    if (fileValue.type && fileValue.type !== verified.mime) throw new Error("DOCUMENT_MIME_MISMATCH");

    const objectPath = `${user.id}/${crypto.randomUUID()}.${verified.extension}`;
    const encoded = objectPath.split("/").map(encodeURIComponent).join("/");
    const upload = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encoded}`, {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        authorization: userAuthorization,
        "content-type": verified.mime,
        "cache-control": "3600",
        "x-upsert": "false",
      },
      body: bytes,
      signal: AbortSignal.timeout(20_000),
    });
    if (!upload.ok) throw new Error(`DOCUMENT_STORAGE_${upload.status}`);

    const metadata = {
      user_id: user.id,
      document_type: documentType,
      storage_path: objectPath,
      original_name: clean(fileValue.name, 180) || `document.${verified.extension}`,
      mime_type: verified.mime,
      file_size: fileValue.size,
      expiry_date: expiry,
      verification_status: "PENDING",
    };
    const insert = await db("customer_documents?select=id,user_id,document_type,storage_path,original_name,mime_type,file_size,expiry_date,verification_status,verified_at,rejection_reason,created_at,updated_at", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(metadata),
    });
    if (!insert.ok) {
      await removeStorage(objectPath);
      throw new Error(`DOCUMENT_METADATA_${insert.status}`);
    }
    const rows = await insert.json();
    return json({ ok: true, document: rows?.[0], requestId: id }, 201, id);
  } catch (error) {
    console.error("customer-document-upload failed", id, error);
    const code = error instanceof Error ? error.message : "DOCUMENT_UPLOAD_FAILED";
    const status = code === "UNAUTHORIZED" ? 401 : code === "VAULT_CONSENT_REQUIRED" ? 403 : code.startsWith("DOCUMENT_") ? 400 : code.includes("_413") ? 413 : 500;
    const message = code === "DOCUMENT_SIGNATURE_INVALID" || code === "DOCUMENT_MIME_MISMATCH"
      ? "Dosyanın gerçek biçimi doğrulanamadı. JPEG, PNG, WebP veya PDF yükleyin."
      : code === "DOCUMENT_SIZE_INVALID" ? "Belge en fazla 10 MB olabilir."
      : code === "DOCUMENT_TYPE_INVALID" ? "Belge türü geçerli değil."
      : status === 401 ? "Oturumunuzun yenilenmesi gerekiyor."
      : "Belge güvenli kasaya yüklenemedi.";
    return json({ ok: false, code, message, requestId: id }, status, id);
  }
});
