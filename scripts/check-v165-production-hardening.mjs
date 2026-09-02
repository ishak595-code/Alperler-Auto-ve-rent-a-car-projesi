import fs from "node:fs";
import crypto from "node:crypto";

const failures = [];
const read = (path) => fs.readFileSync(path, "utf8");
const must = (condition, message) => { if (!condition) failures.push(message); };
const contains = (source, token, message) => must(source.includes(token), message);
const absent = (source, token, message) => must(!source.includes(token), message);
const isTailwind42Patch = (value) => /^4\.2\.\d+$/.test(String(value || ""));

const pkg = JSON.parse(read("package.json"));
const lock = JSON.parse(read("package-lock.json"));
const angular = JSON.parse(read("angular.json"));
const vercel = JSON.parse(read("vercel.json"));
const postcss = JSON.parse(read(".postcssrc.json"));
const index = read("index.html");
const tailwindSource = read("src/tailwind.css");
const navbar = read("src/components/navbar.component.ts");
const mainLayout = read("src/components/main-layout.component.ts");
const staticHeaders = read("public/_headers");
const branchAuth = read("src/services/branch-portal-auth.service.ts");
const branchAccess = read("supabase/functions/branch-access-v165/index.ts");
const branchPartner = read("supabase/functions/branch-partner-v164/index.ts");
const requestSecurity = read("api/_lib/request-security.ts");
const bookingsApi = read("api/bookings.ts");
const partnerApi = read("api/partner.ts");
const paymentsApi = read("api/payments.ts");
const securityMigration = read("supabase/migrations/20260825143000_v165_security_defaults_identity.sql");
const proofMigration = read("supabase/migrations/20260825143100_v165_campaign_proof_cache.sql");
const branchMigration = read("supabase/migrations/20260825143200_v165_branch_access_claim.sql");

must(isTailwind42Patch(pkg.devDependencies?.["@tailwindcss/postcss"]), "@tailwindcss/postcss must remain within the vetted 4.2.x patch line");
must(pkg.devDependencies?.postcss === "8.5.26", "postcss must remain pinned to 8.5.26");
must(isTailwind42Patch(lock.packages?.[""]?.devDependencies?.["@tailwindcss/postcss"]), "package-lock must keep @tailwindcss/postcss within the vetted 4.2.x patch line");
must(lock.packages?.[""]?.devDependencies?.postcss === "8.5.26", "package-lock must pin postcss");
must(postcss.plugins?.["@tailwindcss/postcss"] && typeof postcss.plugins["@tailwindcss/postcss"] === "object", "PostCSS Tailwind plugin configuration is missing");

const styles = angular.projects?.app?.architect?.build?.options?.styles || [];
must(styles[0] === "src/tailwind.css", "Tailwind must compile first in Angular global styles");
must(styles.includes("src/base-shell.css"), "base-shell.css must be compiled by Angular");
contains(tailwindSource, "@import \"tailwindcss\" source(none);", "Tailwind runtime source auto-detection must be disabled in favor of explicit sources");
contains(tailwindSource, "@source \"./\";", "Tailwind must explicitly scan browser runtime src sources");
contains(tailwindSource, "@source \"../index.html\";", "Tailwind must explicitly scan the document shell");
contains(tailwindSource, "@source \"../index.tsx\";", "Tailwind must explicitly scan the application bootstrap");
absent(tailwindSource, "@source \"../\";", "Tailwind must not scan migrations, docs, workflows and other non-runtime repository sources");
contains(tailwindSource, 'bg-slate-50 text-slate-800 antialiased', "Application-shell baseline Tailwind utilities must remain explicitly discoverable");
contains(navbar, ".site-navbar{position:fixed", "Critical navbar geometry must have component-owned CSS independent of Tailwind utilities");
contains(navbar, ".mobile-navigation{position:fixed", "Critical mobile navigation geometry must have component-owned CSS independent of Tailwind utilities");
contains(navbar, "navigation.mobileMenuEnabled() && isMenuOpen()", "Closed mobile navigation must be absent from the DOM rather than relying on a utility class");
contains(mainLayout, ".skip-link{position:fixed", "Accessibility skip-link hidden/focus geometry must have component-owned CSS");
contains(mainLayout, ".customer-main{min-width:0;flex:1;padding-top:72px}", "Customer shell must own its phone header offset");
must(fs.existsSync("public/runtime-env.js"), "runtime-env.js is missing");

absent(index, "cdn.tailwindcss.com", "Tailwind Play CDN must never be used in production");
absent(index, "@tailwindcss/browser", "Tailwind browser runtime must never be used in production");
absent(index, "window.process =", "Executable runtime bootstrap must not be inline in index.html");
absent(index, "<style>", "Global shell CSS must not be inline in index.html");
contains(index, "<script src=\"/runtime-env.js\"></script>", "External runtime-env.js bootstrap is missing");

const globalHeaders = (vercel.headers || []).find((entry) => entry.source === "/(.*)")?.headers || [];
const csp = globalHeaders.find((entry) => entry.key === "Content-Security-Policy")?.value || "";
contains(csp, "script-src 'self'", "CSP script-src must start from self");
absent(csp, "script-src 'self' 'unsafe-inline'", "CSP must not allow arbitrary inline executable scripts");
absent(csp, "cdn.tailwindcss.com", "CSP must not trust Tailwind CDN");
contains(csp, "script-src-attr 'none'", "CSP must block inline event handlers");
contains(csp, "object-src 'none'", "CSP must block plugin/object content");
contains(csp, "frame-ancestors 'none'", "CSP must block framing");

absent(staticHeaders, "cdn.tailwindcss.com", "public/_headers must not trust Tailwind CDN");
absent(staticHeaders, "script-src 'self' 'unsafe-inline'", "public/_headers must not allow arbitrary inline executable scripts");
contains(staticHeaders, `Content-Security-Policy: ${csp}`, "public/_headers CSP must stay byte-for-byte aligned with vercel.json");
contains(staticHeaders, "X-Permitted-Cross-Domain-Policies: none", "public/_headers must keep cross-domain policy disabled");
contains(staticHeaders, "/runtime-env.js", "public/_headers must define runtime-env cache protection");

const jsonLdMatch = index.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
must(Boolean(jsonLdMatch), "JSON-LD structured data block is missing");
if (jsonLdMatch) {
  const hash = crypto.createHash("sha256").update(jsonLdMatch[1], "utf8").digest("base64");
  contains(csp, `'sha256-${hash}'`, "CSP JSON-LD hash does not match index.html; update CSP atomically with structured data");
  contains(staticHeaders, `'sha256-${hash}'`, "public/_headers JSON-LD CSP hash does not match index.html");
}

contains(requestSecurity, "configuredOrigins()", "Central request origin allow-list helper is missing");
contains(requestSecurity, "REQUEST_ID_PATTERN", "Central request-id validation is missing");
contains(bookingsApi, "guardOrigin(request", "Booking BFF must enforce central origin guard");
contains(partnerApi, "guardOrigin(request", "Partner BFF must enforce central origin guard");
contains(paymentsApi, "isAllowedRequestOrigin(request)", "Payment session creation must enforce an origin allow-list");
contains(paymentsApi, "timingSafeEqual", "Payment callback signature comparison must remain timing-safe");
contains(paymentsApi, "INVALID_HASH", "Payment callback must reject invalid signatures");

contains(branchAuth, "sessionStorage", "Branch portal tokens must use sessionStorage");
must(!/localStorage\.(?:setItem|getItem)\(/.test(branchAuth), "Branch portal access/refresh tokens must never be written to or restored from localStorage");
contains(branchAuth, "branch-access-claim", "Branch portal must claim access through the V165 BFF operation");
contains(partnerApi, 'edgeFunction: "branch-access-v165"', "V165 BFF operation must proxy to branch-access-v165");
contains(partnerApi, 'operation === "branch-access-claim"', "V165 BFF branch-access operation is missing");
contains(branchAuth, "pwnedpasswords.com/range/", "Branch password flow must keep k-anonymity breached-password screening");
contains(branchAccess, "APP_ALLOWED_ORIGINS", "Branch access Edge Function must enforce configured origins");
contains(branchAccess, "email_confirmed_at", "Branch access must require verified Auth email");
contains(branchAccess, "claim_branch_access_by_identity", "Branch access must use the server-only identity claim RPC");
contains(branchAccess, "ORIGIN_NOT_ALLOWED", "Branch access direct Edge boundary must reject untrusted origins");
absent(branchAccess, '"access-control-allow-origin": "*"', "Branch access CORS must never be wildcard");
contains(branchPartner, "trustedClientAddress(request)", "Branch partner rate limiting must use trusted gateway client address");
absent(branchPartner, 'clean(request.headers.get("x-client-ip")', "Branch partner rate limiting must not trust spoofable x-client-ip");
contains(branchPartner, "email_confirmed_at", "Branch partner admin authorization must require verified email");
contains(branchPartner, "allowedRedirectOrigin", "Branch invite redirects must be allow-listed");
contains(branchPartner, "APP_ALLOWED_ORIGINS", "Branch partner direct Edge boundary must use configured origin allow-list");
contains(branchPartner, "ORIGIN_NOT_ALLOWED", "Branch partner direct Edge boundary must reject untrusted origins");

contains(securityMigration, "alter default privileges", "V165 must define safe application-owned default privileges");
contains(securityMigration, "email_confirmed_at", "Customer booking ownership must rely on verified Auth identity");
contains(securityMigration, "link_own_customer_booking", "Verified customer booking-link function hardening is missing");
contains(securityMigration, "private.can_manage_branch", "Branch authorization helper must live in private schema");
contains(proofMigration, "campaign_social_proof_cache", "Public campaign proof cache is missing");
contains(proofMigration, "visitor_events", "Campaign proof cache must derive from real analytics data");
contains(proofMigration, "cron.schedule", "Campaign proof aggregate refresh schedule is missing");
contains(branchMigration, "claim_branch_access_by_identity", "Branch identity claim RPC is missing");
contains(branchMigration, "email_confirmed_at", "Branch claim RPC must require verified Auth email");
contains(branchMigration, "branch_access_invites", "Branch claim must be anchored to an invite record");

for (const [name, sql] of [
  ["security defaults", securityMigration],
  ["campaign proof cache", proofMigration],
  ["branch access claim", branchMigration],
]) {
  must(!/grant\s+all\s+on\s+(?:schema|table|sequence|function).*\b(?:anon|authenticated)\b/i.test(sql), `${name} migration grants ALL to a client role`);
  must(!/security\s+definer[\s\S]{0,300}set\s+search_path\s*=\s*'?\$user'?/i.test(sql), `${name} migration contains an unsafe SECURITY DEFINER search_path`);
}

must(vercel.git?.deploymentEnabled?.main === true, "Production Git deployment must remain enabled for main");
must(vercel.git?.deploymentEnabled?.["*"] === false, "Non-main branches must not auto-deploy to production");

if (failures.length) {
  console.error("V165 production hardening guard failed:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log("V165 production hardening guard passed: build-time Tailwind, fail-safe responsive shell, CSP integrity, identity boundaries, payment trust boundary, branch access, analytics privacy and database hardening invariants are intact.");
