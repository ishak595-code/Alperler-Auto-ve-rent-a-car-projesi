export const SUPABASE_PROJECT_URL =
  (process.env.SUPABASE_PROJECT_URL || "https://hrztrgjvgdnaurejnsgs.supabase.co").replace(/\/$/, "");

export const SUPABASE_PUBLISHABLE_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY || "sb_publishable_Xecd7WNvJrZe1VymygJmMA_ceiMCleW";

export function supabaseRestHeaders(
  authorization?: string | null,
  extra: Record<string, string> = {},
): Record<string, string> {
  return {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    ...(authorization ? { authorization } : {}),
    "content-type": "application/json",
    ...extra,
  };
}
