/** V253 media Worker request policy (pure functions, unit-tested in tests/unit/media-provider.test.ts). */
// Search engines, social networks and chat apps that legitimately show our images with a Referer.
const TRUSTED_REFERER_SUFFIXES = [
  "google.com", "google.com.tr", "googleusercontent.com", "bing.com", "yandex.com", "yandex.com.tr", "duckduckgo.com",
  "facebook.com", "fb.com", "instagram.com", "whatsapp.com", "whatsapp.net", "t.co", "twitter.com", "x.com",
  "linkedin.com", "pinterest.com", "telegram.org", "t.me",
];
export const MAX_KEY_LENGTH = 420;

function hostMatches(host: string, suffixes: string[]): boolean {
  // "-team.vercel.app" entries match Vercel preview hosts (project-git-branch-team.vercel.app).
  return suffixes.some((suffix) => suffix && (suffix.startsWith("-") ? host.endsWith(suffix) : host === suffix || host.endsWith(`.${suffix}`)));
}

/** V253 hotlink policy: no Referer → allowed; our own hosts and search/social hosts → allowed; other sites → 403. */
export function refererAllowed(referer: string | null, allowedCsv: string | undefined): boolean {
  const allowed = String(allowedCsv || "").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
  if (!referer || allowed.length === 0) return true;
  let host: string;
  try {
    host = new URL(referer).hostname.toLowerCase();
  } catch {
    return true;
  }
  return hostMatches(host, allowed) || hostMatches(host, TRUSTED_REFERER_SUFFIXES);
}

/** Only a single "bytes=a-b" / "bytes=a-" / "bytes=-n" range is served; multi-range requests are refused. */
export function rangeAcceptable(range: string | null): boolean {
  if (!range) return true;
  return /^bytes=(\d{1,12}-\d{0,12}|-\d{1,12})$/.test(range.trim());
}
