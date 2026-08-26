import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(() => Response.json(
  { ok: false, code: "BOOTSTRAP_DISABLED", message: "Owner bootstrap is permanently retired." },
  { status: 410, headers: { "cache-control": "no-store", "content-type": "application/json; charset=utf-8" } },
));
