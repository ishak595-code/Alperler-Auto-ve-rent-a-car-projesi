import { readFileSync } from 'node:fs';

const wallet = readFileSync('api/wallet-cards.ts', 'utf8');
const payment = readFileSync('api/payments.ts', 'utf8');
const paymentService = readFileSync('src/services/payment.service.ts', 'utf8');
const dockPolicy = readFileSync('src/services/mobile-dock-route-policy.ts', 'utf8');
const navigation = readFileSync('src/services/navigation-config.service.ts', 'utf8');

function requireText(source, token, message) {
  if (!source.includes(token)) throw new Error(message);
}
function forbidText(source, token, message) {
  if (source.includes(token)) throw new Error(message);
}

requireText(dockPolicy, "return path === '/';", 'Mobile dock must remain home-only.');
for (const label of ['Kiralık', 'Satılık', 'Ara', 'Fırsatlar', 'Profil']) {
  requireText(navigation, `label: '${label}'`, `Canonical mobile dock label is missing: ${label}`);
}

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
