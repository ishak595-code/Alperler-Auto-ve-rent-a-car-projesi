import { readFileSync } from 'node:fs';

const wallet = readFileSync('api/wallet-cards.ts', 'utf8');
const payment = readFileSync('api/payments.ts', 'utf8');
const branchesApi = readFileSync('api/branches.ts', 'utf8');
const paymentService = readFileSync('src/services/payment.service.ts', 'utf8');
const dockPolicy = readFileSync('src/services/mobile-dock-route-policy.ts', 'utf8');
const navigation = readFileSync('src/services/navigation-config.service.ts', 'utf8');
const branchWriteCutover = readFileSync('supabase/migrations/20260901174500_v225_branch_write_boundary_hardening.sql', 'utf8').toLowerCase();
const referralIdentityParity = readFileSync('supabase/migrations/20260901224432_v218_enforce_verified_referral_identity_rowtype_fix.sql', 'utf8').toLowerCase();
const branchInviteBoundaryParity = readFileSync('supabase/migrations/20260901225918_v226_branch_write_boundary_hardening.sql', 'utf8').toLowerCase();

function requireText(source, token, message) {
  if (!source.includes(token)) throw new Error(message);
}
function forbidText(source, token, message) {
  if (source.includes(token)) throw new Error(message);
}

requireText(dockPolicy, "return cleanCustomerPath(rawUrl) === '/';", 'Mobile dock must remain home-only through the canonical path normalizer.');
const defaultDockMatch = navigation.match(/const DEFAULT_DOCK:[\s\S]*?\.map\(/);
if (!defaultDockMatch) throw new Error('Canonical mobile dock defaults are missing.');
const defaultDock = defaultDockMatch[0];
for (const label of ['Kiralık', 'Satılık', 'Ara', 'Fırsatlar', 'Profil']) {
  requireText(defaultDock, `'${label}'`, `Canonical mobile dock label is missing: ${label}`);
}
const canonicalDockRows = [...defaultDock.matchAll(/^\s*\['[^']+',\s*'[^']+',\s*'[^']+',\s*'[^']+'\],?\s*$/gm)];
if (canonicalDockRows.length !== 5) throw new Error(`Canonical mobile dock must contain exactly five defaults, found ${canonicalDockRows.length}.`);

for (const token of [
  'revoke insert, update, delete on table public.branches from authenticated',
  'drop policy if exists branches_admin_delete on public.branches',
  'drop policy if exists branches_admin_insert on public.branches',
  'drop policy if exists branches_authenticated_update_v188 on public.branches',
]) requireText(branchWriteCutover, token, `Branch direct-write cutover is missing: ${token}`);
requireText(branchesApi, 'async function verifiedAdmin', 'Branch admin writes must verify the administrator server-side.');
requireText(branchesApi, 'SUPABASE_SERVICE_ROLE_KEY', 'Branch admin writes must use a server-only service boundary.');
requireText(branchesApi, 'await verifiedAdmin(request)', 'Branch mutations must pass through verifiedAdmin.');

requireText(
  referralIdentityParity,
  'public.partner_identity_snapshots%rowtype',
  'Production referral identity migration must keep the exact partner identity snapshot row type.',
);
requireText(
  referralIdentityParity,
  "v_identity.bank_match_status <> 'verified'",
  'Verified referral attribution must reject non-verified bank identity snapshots.',
);
for (const role of ['anon', 'authenticated']) {
  requireText(
    branchInviteBoundaryParity,
    `from anon, authenticated`,
    `Branch invite direct-write boundary must remain revoked for ${role}.`,
  );
}
requireText(
  branchInviteBoundaryParity,
  'on table public.branch_access_invites',
  'Branch access invite writes must stay behind the audited RPC boundary.',
);
requireText(
  branchInviteBoundaryParity,
  'revoke insert, update, delete',
  'Branch access invite direct client DML must remain revoked.',
);

requireText(wallet, "provider!=='IYZICO'", 'Saved-card provider boundary is missing.');
requireText(wallet, "env!==expectedEnvironment", 'Saved-card environment boundary is missing.');
requireText(wallet, "bookingRow.customer_user_id!==user.id", 'Saved-card booking ownership boundary is missing.');
requireText(paymentService, "usingSavedCard && status.provider !== 'iyzico'", 'PayTR hosted checkout must reject the saved-card path.');

const browserProjectionStart = wallet.indexOf('function customerCard');
const browserProjectionEnd = wallet.indexOf('\n\nasync function listCards', browserProjectionStart);
const browserProjection = wallet.slice(browserProjectionStart, browserProjectionEnd);
for (const secret of ['cardToken', 'providerPaymentMethodRef', 'providerCustomerRef']) {
  forbidText(browserProjection, secret, `Wallet browser projection exposes ${secret}.`);
}

forbidText(paymentService, 'cardToken', 'Frontend payment service must never know provider card tokens.');
forbidText(paymentService, 'cardUserKey', 'Frontend payment service must never know provider customer card keys.');

requireText(payment, 'safeReturnUrl', 'Payment redirect allowlist validation is required.');
requireText(payment, 'verifyIyzicoSignature', 'Hosted iyzico signature verification is required.');
requireText(payment, 'timingSafeEqual', 'Payment signatures must use constant-time comparison.');

console.log('V226 production boundary contract passed.');