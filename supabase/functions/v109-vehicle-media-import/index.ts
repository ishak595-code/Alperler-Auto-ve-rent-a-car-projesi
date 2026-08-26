import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(() => Response.json(
  { ok: false, code: "MIGRATION_COMPLETED", message: "V109 vehicle media migration is closed." },
  { status: 410, headers: { "cache-control": "no-store", "content-type": "application/json; charset=utf-8" } },
));
