/**
 * V252 — minimal SigV4 header signing for server-side scripts talking to Cloudflare R2
 * (S3 API, region "auto"). Plain-JS twin of api/_lib/r2.ts signedHeaders(); the unit test
 * tests/unit/media-provider.test.ts asserts both produce identical signatures.
 */
import { createHash, createHmac } from "node:crypto";

const sha256Hex = (value) => createHash("sha256").update(value).digest("hex");
const hmac = (key, value) => createHmac("sha256", key).update(value).digest();

export function awsEncode(value, keepSlash = false) {
  const encoded = encodeURIComponent(value).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  return keepSlash ? encoded.replace(/%2F/g, "/") : encoded;
}

export function signR2Request({ method, url, accessKeyId, secretAccessKey, body = "", payloadHash, now = new Date(), extraHeaders = {} }) {
  const stamp = now.toISOString().replace(/[:-]/g, "").replace(/\.\d{3}/, "");
  const day = stamp.slice(0, 8);
  const hash = payloadHash || sha256Hex(body);
  const headers = { host: url.host, "x-amz-content-sha256": hash, "x-amz-date": stamp };
  for (const [name, value] of Object.entries(extraHeaders)) headers[name.toLowerCase()] = String(value).trim();
  const names = Object.keys(headers).sort();
  const params = [...url.searchParams.entries()].sort(([a, av], [b, bv]) => (a === b ? (av < bv ? -1 : 1) : a < b ? -1 : 1));
  const canonicalQuery = params.map(([k, v]) => `${awsEncode(k)}=${awsEncode(v)}`).join("&");
  const canonicalRequest = [method, awsEncode(decodeURIComponent(url.pathname), true), canonicalQuery,
    names.map((n) => `${n}:${headers[n]}\n`).join(""), names.join(";"), hash].join("\n");
  const scope = `${day}/auto/s3/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", stamp, scope, sha256Hex(canonicalRequest)].join("\n");
  const key = hmac(hmac(hmac(hmac(`AWS4${secretAccessKey}`, day), "auto"), "s3"), "aws4_request");
  const signature = createHmac("sha256", key).update(stringToSign).digest("hex");
  const out = { ...headers, authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${names.join(";")}, Signature=${signature}` };
  delete out.host;
  return out;
}
