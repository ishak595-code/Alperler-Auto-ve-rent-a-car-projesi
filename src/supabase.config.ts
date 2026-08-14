export const SUPABASE_PROJECT_URL = "https://hrztrgjvgdnaurejnsgs.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Xecd7WNvJrZe1VymygJmMA_ceiMCleW";
export const PRIMARY_ADMIN_EMAIL = "ishak595@gmail.com";

export function supabaseAuthUrl(path: string): string {
  return `${SUPABASE_PROJECT_URL}/auth/v1/${path.replace(/^\//, "")}`;
}

export function supabaseFunctionUrl(name: string): string {
  return `${SUPABASE_PROJECT_URL}/functions/v1/${encodeURIComponent(name)}`;
}
