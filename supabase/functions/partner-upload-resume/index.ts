import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const BUCKET = "partner-uploads";
const supabase = createClient(URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

interface FileInput {
  name?: unknown;
  type?: unknown;
  size?: unknown;
}

function json(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
    },
  });
}

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function serviceHeaders(extra: Record<string, string> = {}) {
  return {
    apikey: SERVICE_KEY,
    authorization: `Bearer ${SERVICE_KEY}`,
    "content-type": "application/json",
    ...extra,
  };
}

async function db(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${URL}/rest/v1/${path}`, {
    ...init,
    headers: { ...serviceHeaders(), ...(init.headers || {}) },
    signal: AbortSignal.timeout(10_000),
  });
}

async function digest(value: string): Promise<string> {
  const raw = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(raw)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function rate(
  key: string,
  scope: string,
  seconds: number,
  limit: number,
): Promise<boolean> {
  const response = await db("rpc/consume_rate_limit", {
    method: "POST",
    body: JSON.stringify({
      p_key_hash: key,
      p_scope: scope,
      p_window_seconds: seconds,
      p_limit: limit,
    }),
  });
  if (!response.ok) throw new Error("RATE_LIMIT_BACKEND_FAILED");
  return Boolean(await response.json());
}

function fileIdentity(file: {
  originalName: string;
  type: string;
  size: number;
}): string {
  return `${file.originalName}\u0000${file.type}\u0000${file.size}`;
}

function normalizeIncoming(files: FileInput[]) {
  if (files.length > 10) throw new Error("TOO_MANY_FILES");
  return files.map((file) => {
    const originalName = clean(file.name, 180);
    const type = clean(file.type, 100).toLowerCase();
    const size = Number(file.size || 0);
    if (!originalName || !type || !Number.isInteger(size) || size < 1) {
      throw new Error("INVALID_FILE_MANIFEST");
    }
    if (size > 50 * 1024 * 1024) throw new Error("INVALID_FILE_SIZE");
    return { originalName, type, size };
  });
}

function sameManifest(
  expected: Array<{ originalName: string; type: string; size: number }>,
  incoming: Array<{ originalName: string; type: string; size: number }>,
): boolean {
  if (expected.length !== incoming.length) return false;
  const counts = new Map<string, number>();
  for (const item of expected) {
    const key = fileIdentity(item);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  for (const item of incoming) {
    const key = fileIdentity(item);
    const count = counts.get(key) || 0;
    if (count < 1) return false;
    if (count === 1) counts.delete(key);
    else counts.set(key, count - 1);
  }
  return counts.size === 0;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
  }
  if (!URL || !SERVICE_KEY) {
    return json({ ok: false, code: "SERVER_CONFIG_MISSING" }, 503);
  }
  if (Number(request.headers.get("content-length") || 0) > 20_000) {
    return json({ ok: false, code: "PAYLOAD_TOO_LARGE" }, 413);
  }

  let input: { idempotencyKey?: unknown; files?: FileInput[] };
  try {
    input = (await request.json()) as {
      idempotencyKey?: unknown;
      files?: FileInput[];
    };
  } catch {
    return json({ ok: false, code: "INVALID_JSON" }, 400);
  }

  const idempotencyKey = clean(input.idempotencyKey, 120);
  if (idempotencyKey.length < 20) {
    return json({ ok: false, code: "INVALID_RESUME_KEY" }, 400);
  }

  let incoming: Array<{ originalName: string; type: string; size: number }>;
  try {
    incoming = normalizeIncoming(Array.isArray(input.files) ? input.files : []);
  } catch (error) {
    return json(
      {
        ok: false,
        code: error instanceof Error ? error.message : "INVALID_FILE_MANIFEST",
      },
      400,
    );
  }

  try {
    const ip = clean(
      request.headers.get("x-client-ip") ||
        request.headers.get("x-forwarded-for")?.split(",")[0] ||
        "unknown",
      100,
    );
    const networkHash = await digest(
      `${ip}|${clean(request.headers.get("user-agent"), 300)}`,
    );
    const keyHash = await digest(idempotencyKey);
    if (
      !(await rate(networkHash, "partner_resume_network", 60, 8)) ||
      !(await rate(keyHash, "partner_resume_key", 60, 5))
    ) {
      return json({ ok: false, code: "RATE_LIMITED" }, 429);
    }

    const lookup = await db(
      `partner_requests?idempotency_key=eq.${encodeURIComponent(idempotencyKey)}&status=eq.UPLOADING&select=id,reference,status,media_paths&limit=1`,
    );
    if (!lookup.ok) {
      return json({ ok: false, code: "RESUME_LOOKUP_FAILED" }, 500);
    }
    const rows = await lookup.json();
    const existing = Array.isArray(rows) ? rows[0] : null;
    if (!existing) {
      return json({ ok: false, code: "RESUME_NOT_FOUND" }, 404);
    }

    const manifest = Array.isArray(existing.media_paths)
      ? existing.media_paths
          .map((item: unknown) => {
            const row = item as Record<string, unknown>;
            return {
              path: clean(row.path, 400),
              originalName: clean(row.originalName, 180),
              type: clean(row.type, 100).toLowerCase(),
              size: Number(row.size || 0),
            };
          })
          .filter(
            (item: { path: string; originalName: string; type: string; size: number }) =>
              item.path &&
              item.originalName &&
              item.type &&
              Number.isInteger(item.size) &&
              item.size > 0,
          )
      : [];

    if (
      !sameManifest(
        manifest.map((item) => ({
          originalName: item.originalName,
          type: item.type,
          size: item.size,
        })),
        incoming,
      )
    ) {
      return json({ ok: false, code: "IDEMPOTENCY_CONFLICT" }, 409);
    }

    const { data: storedObjects, error: listError } = await supabase.storage
      .from(BUCKET)
      .list(String(existing.id), { limit: 100 });
    if (listError) {
      return json({ ok: false, code: "UPLOAD_STATE_READ_FAILED" }, 500);
    }
    const completedNames = new Set(
      (storedObjects || []).map((item) => item.name).filter(Boolean),
    );

    const uploads: Array<{
      path: string;
      token: string;
      signedUrl: string;
      originalName: string;
      type: string;
      size: number;
    }> = [];

    for (const item of manifest) {
      const objectName = item.path.split("/").pop() || "";
      if (objectName && completedNames.has(objectName)) continue;
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUploadUrl(item.path, { upsert: false });
      if (error || !data?.token || !data?.signedUrl) {
        return json({ ok: false, code: "UPLOAD_URL_CREATE_FAILED" }, 500);
      }
      uploads.push({
        path: item.path,
        token: data.token,
        signedUrl: data.signedUrl,
        originalName: item.originalName,
        type: item.type,
        size: item.size,
      });
    }

    const uploadToken = crypto.randomUUID() + crypto.randomUUID();
    const uploadTokenHash = await digest(uploadToken);
    const patch = await db(
      `partner_requests?id=eq.${encodeURIComponent(String(existing.id))}`,
      {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ upload_token_hash: uploadTokenHash }),
      },
    );
    if (!patch.ok) {
      return json({ ok: false, code: "RESUME_TOKEN_ROTATION_FAILED" }, 500);
    }

    return json({
      ok: true,
      duplicate: true,
      reference: existing.reference,
      status: "UPLOADING",
      uploadToken,
      uploads,
      completedCount: manifest.length - uploads.length,
      expectedCount: manifest.length,
    });
  } catch (error) {
    console.error("partner-upload-resume failed", error);
    return json({ ok: false, code: "PARTNER_RESUME_FAILED" }, 500);
  }
});
