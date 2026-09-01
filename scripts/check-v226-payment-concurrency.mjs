import { readFileSync } from 'node:fs';

const wallet = readFileSync('api/wallet-cards.ts', 'utf8');
const paymentService = readFileSync('src/services/payment.service.ts', 'utf8');
const checkout = readFileSync('src/pages/booking-checkout.component.ts', 'utf8');
const migration = readFileSync('supabase/migrations/20260902003000_v226_saved_card_single_active_charge_guard.sql', 'utf8');

function requireText(source, token, message) {
  if (!source.includes(token)) throw new Error(message);
}

requireText(migration, 'create unique index if not exists uq_payment_transactions_one_active_saved_card_v226', 'V226 saved-card active-charge unique index is missing.');
requireText(migration, "request_snapshot ->> 'storedCard' = 'true'", 'V226 unique index must be scoped to stored-card payment attempts.');
requireText(migration, "status in ('CREATED','PENDING','AUTHORIZED','PAID')", 'V226 unique index must cover every active stored-card payment status.');

requireText(wallet, 'if(bookingRow.customer_user_id!==user.id)', 'Saved-card charge must enforce booking ownership.');
requireText(wallet, "service_customer_payment_method_token_v225", 'Saved-card charge must resolve provider tokens server-side.');
requireText(wallet, "env!==expectedEnvironment", 'Saved-card charge must enforce sandbox/live isolation.');
requireText(wallet, 'storedCard:true', 'Stored-card payment attempts must be marked for the database concurrency invariant.');
requireText(wallet, "iyzicoRequest('POST','/payment/auth'", 'Saved-card charge must use the iyzico server-side payment path.');
requireText(wallet, 'verifyPaymentSignature(result,credentials.secretKey)', 'Saved-card payment response signature verification is required.');
requireText(wallet, 'amountValid', 'Saved-card payment amount verification is required.');
requireText(wallet, 'currencyValid', 'Saved-card payment currency verification is required.');

const claimPosition = wallet.indexOf('const claimed=await claimPayment');
const chargePosition = wallet.indexOf("iyzicoRequest('POST','/payment/auth'");
if (claimPosition < 0 || chargePosition < 0 || claimPosition > chargePosition) {
  throw new Error('The database payment claim must be created before iyzico can charge a saved card.');
}

const customerCardStart = wallet.indexOf('function customerCard');
const customerCardEnd = wallet.indexOf('\n\nasync function listCards', customerCardStart);
const publicCardProjection = wallet.slice(customerCardStart, customerCardEnd);
for (const forbidden of ['cardToken', 'providerPaymentMethodRef', 'providerCustomerRef']) {
  if (publicCardProjection.includes(forbidden)) throw new Error(`Browser-visible card projection leaks ${forbidden}.`);
}

requireText(paymentService, "if (usingSavedCard && status.provider !== 'iyzico')", 'PayTR hosted flow must not pretend to support saved-card charging.');
requireText(paymentService, 'this.customerAuth.getAccessToken()', 'Saved-card charge must require an authenticated customer session.');
requireText(checkout, "paymentService.paymentStatus().provider === 'iyzico'", 'Saved-card picker must be capability-gated to iyzico.');
requireText(checkout, 'selectedSavedCardId', 'Checkout must keep saved-card selection opaque and identifier-only.');

console.log('V226 payment concurrency and saved-card security contract passed.');
