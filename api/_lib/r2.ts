/**
 * V252 Cloudflare R2 media storage — server-only helpers (S3-compatible, SigV4).
 *
 * Env-gated: R2 is "configured" only when all five variables are valid:
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_BASE_URL
 * Without them every caller keeps Cloudinary / Supabase Storage. The secret never leaves
 * the server: browsers only receive short-lived presigned PUT URLs whose signature covers
 * host + content-type + content-length, so R2 rejects a different type or size.
 *
 * SigV4 is implemented with node:crypto (no SDK dependency). Verified against the AWS
 * documented presign example in tests/unit/media-provider.test.ts.
 */
import { createHash, createHmac } from "node:crypto";

export const R2_STORAGE_BUCKET = "r2";
/** Fixed responsive widths — must match src/utils/r2-media.ts and the DB helper (w1440 default). */
export const R2_IMAGE_WIDTHS = [480, 768, 1080, 1440, 1920] as const;
export const R2_VARIANT_MAX_BYTES = 8 * 1024 * 1024;
export const R2_ORIGINAL_MAX_BYTES = 25 * 1024 * 1024;
export const R2_VIDEO_MAX_BYTES = 50 * 1024 * 1024;
export const R2_PRESIGN_TTL_SECONDS = 900;

export interface R2Config {
  configured: boolean;
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicBaseUrl: string;
  endpoint: string;
}

const ACCOUNT_PATTERN = /^[a-f0-9]{32}$/i;
const BUCKET_PATTERN = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/;
/** Same shape the DB accepts (private.r2_delivery_url_v252): https host, optional port/path, no trailing slash. */
export const PUBLIC_BASE_PATTERN = /^https:\/\/[A-Za-z0-9.-]+(:[0-9]{2,5})?(\/[A-Za-z0-9._~-]+)*$/;
export const STEM_PATTERN = /^alperler\/[A-Za-z0-9_/-]{3,380}$/;

export function normalizePublicBaseUrl(value: unknown): string {
  const trimmed = String(value || "").trim().replace(/\/+$/, "");
  return PUBLIC_BASE_PATTERN.test(trimmed) ? trimmed : "";
}

export function r2ConfigFrom(env: Record<string, string | undefined>): R2Config {
  const accountId = String(env["R2_ACCOUNT_ID"] || "").trim();
  const accessKeyId = String(env["R2_ACCESS_KEY_ID"] || "").trim();
  const secretAccessKey = String(env["R2_SECRET_ACCESS_KEY"] || "").trim();
  const bucket = String(env["R2_BUCKET"] || "").trim();
  const publicBaseUrl = normalizePublicBaseUrl(env["R2_PUBLIC_BASE_URL"]);
  const configured = ACCOUNT_PATTERN.test(accountId) && accessKeyId.length >= 16 && secretAccessKey.length >= 32
    && BUCKET_PATTERN.test(bucket) && publicBaseUrl !== "";
  return {
    configured,
    accountId: configured ? accountId.toLowerCase() : "",
    accessKeyId: configured ? accessKeyId : "",
    secretAccessKey: configured ? secretAccessKey : "",
    bucket: configured ? bucket : "",
    publicBaseUrl: configured ? publicBaseUrl : "",
    endpoint: configured ? `https://${accountId.toLowerCase()}.r2.cloudflarestorage.com` : "",
  };
}

export function r2Config(): R2Config {
  return r2ConfigFrom(process.env as Record<string, string | undefined>);
}

export function isSafeStem(value: unknown): value is string {
  return typeof value === "string" && STEM_PATTERN.test(value) && !value.includes("..") && !value.includes("//") && !value.endsWith("/");
}

// ---- Sibling object names ------------------------------------------------------------------
export type R2FileName = string;
const VARIANT_NAME = /^w(480|768|1080|1440|1920)\.(webp|jpg)$/;
const ORIGINAL_NAME = /^orig\.(jpg|png|webp|avif)$/;
const VIDEO_NAME = /^video\.(mp4|webm)$/;
const CONTENT_TYPES: Record<string, string> = {
  webp: "image/webp", jpg: "image/jpeg", png: "image/png", avif: "image/avif", mp4: "video/mp4", webm: "video/webm",
};

export interface R2FileRequest { name: string; contentType: string; bytes: number }
export type R2FileCheck = { ok: true } | { ok: false; code: string; maxBytes?: number };

/** Validates one sibling object: fixed names, matching content type, per-type size cap. */
export function checkR2File(file: R2FileRequest, allowVideo: boolean): R2FileCheck {
  const name = String(file?.name || "");
  const ext = name.split(".").pop() || "";
  const isVariant = VARIANT_NAME.test(name);
  const isOriginal = ORIGINAL_NAME.test(name);
  const isVideo = VIDEO_NAME.test(name);
  if (!isVariant && !isOriginal && !isVideo) return { ok: false, code: "INVALID_MEDIA_FILE_NAME" };
  if (isVideo && !allowVideo) return { ok: false, code: "INVALID_RESOURCE_TYPE" };
  if (String(file.contentType || "").toLowerCase() !== CONTENT_TYPES[ext]) return { ok: false, code: "INVALID_CONTENT_TYPE" };
  const bytes = Number(file.bytes);
  if (!Number.isInteger(bytes) || bytes <= 0) return { ok: false, code: "INVALID_FILE_SIZE" };
  const cap = isVideo ? R2_VIDEO_MAX_BYTES : isOriginal ? R2_ORIGINAL_MAX_BYTES : R2_VARIANT_MAX_BYTES;
  if (bytes > cap) return { ok: false, code: isVideo ? "MEDIA_VIDEO_TOO_LARGE" : "MEDIA_IMAGE_TOO_LARGE", maxBytes: cap };
  return { ok: true };
}

export function objectKey(stem: string, name: string): string {
  return `${stem}/${name}`;
}

export function publicObjectUrl(publicBaseUrl: string, stem: string, name: string): string {
  return `${publicBaseUrl}/${stem}/${name}`;
}

// ---- SigV4 ------------------------------------------------------------------------------------
function sha256Hex(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}
function hmac(key: Buffer | string, value: string): Buffer {
  return createHmac("sha256", key).update(value).digest();
}
/** RFC 3986 encoding as required by SigV4 (slashes kept in paths). */
export function awsEncode(value: string, keepSlash = false): string {
  const encoded = encodeURIComponent(value).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  return keepSlash ? encoded.replace(/%2F/g, "/") : encoded;
}
export function amzDate(date: Date): { stamp: string; day: string } {
  const stamp = date.toISOString().replace(/[:-]/g, "").replace(/\.\d{3}/, "");
  return { stamp, day: stamp.slice(0, 8) };
}
function signingKey(secret: string, day: string, region: string, service: string): Buffer {
  return hmac(hmac(hmac(hmac(`AWS4${secret}`, day), region), service), "aws4_request");
}

export interface PresignInput {
  method: "PUT" | "GET" | "DELETE" | "HEAD";
  host: string;
  path: string; // already starts with "/", unencoded
  accessKeyId: string;
  secretAccessKey: string;
  region?: string;
  service?: string;
  expiresSeconds: number;
  now?: Date;
  /** Header name (lowercase) → value; host is always added and signed. */
  signedHeaders?: Record<string, string>;
}

/** Query-string (presigned URL) SigV4 with UNSIGNED-PAYLOAD. Returns the full https URL. */
export function presignUrl(input: PresignInput): string {
  const region = input.region || "auto";
  const service = input.service || "s3";
  const { stamp, day } = amzDate(input.now || new Date());
  const headers: Record<string, string> = { host: input.host };
  for (const [name, value] of Object.entries(input.signedHeaders || {})) headers[name.toLowerCase()] = String(value).trim();
  const headerNames = Object.keys(headers).sort();
  const signedHeaderList = headerNames.join(";");
  const scope = `${day}/${region}/${service}/aws4_request`;
  const query: Record<string, string> = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${input.accessKeyId}/${scope}`,
    "X-Amz-Date": stamp,
    "X-Amz-Expires": String(Math.max(1, Math.min(604800, Math.trunc(input.expiresSeconds)))),
    "X-Amz-SignedHeaders": signedHeaderList,
  };
  const canonicalQuery = Object.keys(query).sort().map((k) => `${awsEncode(k)}=${awsEncode(query[k])}`).join("&");
  const canonicalPath = awsEncode(input.path, true);
  const canonicalHeaders = headerNames.map((name) => `${name}:${headers[name]}\n`).join("");
  const canonicalRequest = [input.method, canonicalPath, canonicalQuery, canonicalHeaders, signedHeaderList, "UNSIGNED-PAYLOAD"].join("\n");
  const stringToSign = ["AWS4-HMAC-SHA256", stamp, scope, sha256Hex(canonicalRequest)].join("\n");
  const signature = createHmac("sha256", signingKey(input.secretAccessKey, day, region, service)).update(stringToSign).digest("hex");
  return `https://${input.host}${canonicalPath}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

/** Header-signed request (server → R2) for list/delete. */
export function signedHeaders(input: { method: string; url: URL; accessKeyId: string; secretAccessKey: string; body?: string; now?: Date }): Record<string, string> {
  const { stamp, day } = amzDate(input.now || new Date());
  const payloadHash = sha256Hex(input.body || "");
  const headers: Record<string, string> = { host: input.url.host, "x-amz-content-sha256": payloadHash, "x-amz-date": stamp };
  const names = Object.keys(headers).sort();
  const params = [...input.url.searchParams.entries()].sort(([a, av], [b, bv]) => (a === b ? (av < bv ? -1 : 1) : a < b ? -1 : 1));
  const canonicalQuery = params.map(([k, v]) => `${awsEncode(k)}=${awsEncode(v)}`).join("&");
  const canonicalRequest = [input.method, awsEncode(decodeURIComponent(input.url.pathname), true), canonicalQuery,
    names.map((n) => `${n}:${headers[n]}\n`).join(""), names.join(";"), payloadHash].join("\n");
  const scope = `${day}/auto/s3/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", stamp, scope, sha256Hex(canonicalRequest)].join("\n");
  const signature = createHmac("sha256", signingKey(input.secretAccessKey, day, "auto", "s3")).update(stringToSign).digest("hex");
  return {
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": stamp,
    authorization: `AWS4-HMAC-SHA256 Credential=${input.accessKeyId}/${scope}, SignedHeaders=${names.join(";")}, Signature=${signature}`,
  };
}

export interface PresignedPut { name: string; key: string; url: string; contentType: string; bytes: number; publicUrl: string }

export function presignPut(config: R2Config, stem: string, file: R2FileRequest, now = new Date()): PresignedPut {
  if (!config.configured) throw new Error("R2_NOT_CONFIGURED");
  if (!isSafeStem(stem)) throw new Error("INVALID_R2_KEY");
  const key = objectKey(stem, file.name);
  const host = new URL(config.endpoint).host;
  const url = presignUrl({
    method: "PUT",
    host,
    path: `/${config.bucket}/${key}`,
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    expiresSeconds: R2_PRESIGN_TTL_SECONDS,
    now,
    signedHeaders: { "content-type": file.contentType, "content-length": String(file.bytes) },
  });
  return { name: file.name, key, url, contentType: file.contentType, bytes: file.bytes, publicUrl: publicObjectUrl(config.publicBaseUrl, stem, file.name) };
}

async function r2Fetch(config: R2Config, method: string, url: URL): Promise<Response> {
  const headers = signedHeaders({ method, url, accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey });
  return fetch(url, { method, headers, signal: AbortSignal.timeout(15_000) });
}

/** Deletes every object under `<stem>/` (a stem has ≤ ~10 siblings). Idempotent. */
export async function deleteStem(config: R2Config, stem: string): Promise<{ ok: boolean; deleted: number; status: number }> {
  if (!config.configured) throw new Error("R2_NOT_CONFIGURED");
  if (!isSafeStem(stem)) throw new Error("INVALID_R2_KEY");
  const list = new URL(`${config.endpoint}/${config.bucket}`);
  list.searchParams.set("list-type", "2");
  list.searchParams.set("prefix", `${stem}/`);
  list.searchParams.set("max-keys", "100");
  const listing = await r2Fetch(config, "GET", list);
  if (!listing.ok) return { ok: false, deleted: 0, status: listing.status };
  const xml = await listing.text();
  const keys = [...xml.matchAll(/<Key>([^<]+)<\/Key>/g)].map((m) => m[1].replace(/&amp;/g, "&"))
    .filter((key) => key.startsWith(`${stem}/`));
  let deleted = 0;
  for (const key of keys) {
    const target = new URL(`${config.endpoint}/${config.bucket}/${awsEncode(key, true)}`);
    const response = await r2Fetch(config, "DELETE", target);
    if (!response.ok && response.status !== 404) return { ok: false, deleted, status: response.status };
    deleted++;
  }
  return { ok: true, deleted, status: 200 };
}
