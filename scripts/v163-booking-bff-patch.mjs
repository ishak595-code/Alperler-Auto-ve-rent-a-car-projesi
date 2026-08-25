import fs from 'node:fs';
const path='supabase/functions/booking-gateway/index.ts';
let s=fs.readFileSync(path,'utf8');
const oldCors=`const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, content-type, x-client-ip, x-idempotency-key",
  "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS,
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}`;
const newCors=`function requestId(request: Request): string {
  const supplied = clean(request.headers.get("x-request-id"), 80);
  return /^[A-Za-z0-9._:-]{8,80}$/.test(supplied) ? supplied : crypto.randomUUID();
}

function json(body: unknown, status = 200, id?: string): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      ...(id ? { "x-request-id": id } : {}),
    },
  });
}`;
if(!s.includes(oldCors)) throw new Error('booking gateway CORS block target missing');
s=s.replace(oldCors,newCors);
const oldServe=`Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return json({ ok: false, code: "SERVER_CONFIG_MISSING" }, 503);
  }
  if (request.method === "POST") return createBooking(request);
  if (request.method === "GET") return listBookings(request);
  if (request.method === "PATCH") return patchBooking(request);
  if (request.method === "DELETE") return deleteBooking(request);
  return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
});`;
const newServe=`Deno.serve(async (request) => {
  const id = requestId(request);
  // Browser traffic must pass through the same-origin Vercel BFF. Guest booking
  // remains supported server-to-server, while direct cross-origin browser calls
  // cannot bypass the BFF request boundary and correlation headers.
  if (request.headers.get("origin")) {
    return json({ ok: false, code: "DIRECT_BROWSER_ACCESS_DENIED", requestId: id }, 403, id);
  }
  if (request.method === "OPTIONS") {
    return json({ ok: false, code: "DIRECT_BROWSER_ACCESS_DENIED", requestId: id }, 403, id);
  }
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return json({ ok: false, code: "SERVER_CONFIG_MISSING", requestId: id }, 503, id);
  }
  if (request.method === "POST") return createBooking(request);
  if (request.method === "GET") return listBookings(request);
  if (request.method === "PATCH") return patchBooking(request);
  if (request.method === "DELETE") return deleteBooking(request);
  return json({ ok: false, code: "METHOD_NOT_ALLOWED", requestId: id }, 405, id);
});`;
if(!s.includes(oldServe)) throw new Error('booking gateway serve target missing');
s=s.replace(oldServe,newServe);
fs.writeFileSync(path,s);
console.log('V163 booking gateway BFF-only hardening applied');
