# Payment Provider Setup

Alperler Rent A Car supports PayTR and iyzico side-by-side. Configure both credential sets on the server, then select the active customer card provider in **Admin > Ödeme ve Depozito**. Provider selection does not rewrite historical transactions.

## Safety rules

- Never put provider secret keys in Angular/browser source, Supabase public tables, screenshots, issue comments, or Git history.
- Store secrets only in Vercel environment variables.
- Keep `PAYMENT_CARD_ENABLED=false` until at least one provider account is approved and the relevant test flow passes.
- Do not implement automatic provider retry after a failed payment. Manual/admin provider switching avoids double-charge ambiguity.
- PayTR customer card flow and branch-subscription card flow use PayTR callbacks with server HMAC verification.
- iyzico customer card flow uses Checkout Form. Card details stay on iyzico. Required buyer identity/address fields are transmitted only for the iyzico session and are not copied into `payment_transactions.request_snapshot`.

## Common Vercel variables

```text
PAYMENT_CARD_ENABLED=false
PAYMENT_EFT_ENABLED=true
PAYMENT_OFFICE_ENABLED=true
PAYMENT_ALLOWED_ORIGINS=https://YOUR_DOMAIN
APP_PUBLIC_ORIGIN=https://YOUR_DOMAIN
PUBLIC_APP_URL=https://YOUR_DOMAIN
SITE_URL=https://YOUR_DOMAIN
```

While no custom domain is connected, leave the custom-origin variables empty and use Vercel's derived production/deployment origin. Never configure an unowned domain.

## PayTR

Official developer documentation: https://dev.paytr.com/

Set server-only Vercel variables:

```text
PAYTR_MERCHANT_ID=
PAYTR_MERCHANT_KEY=
PAYTR_MERCHANT_SALT=
PAYTR_TEST_MODE=true
```

Production callback endpoint after the domain is connected:

```text
https://YOUR_DOMAIN/api/payments/paytr-callback
```

The application creates the PayTR iFrame token server-side, recalculates the charge from the canonical booking record, verifies callback HMAC with constant-time comparison, validates callback amount, and treats duplicate terminal callbacks idempotently.

When PayTR customer card collection is active, the current integration requires TRY.

## iyzico

Official developer documentation: https://docs.iyzico.com/

Sandbox variables:

```text
IYZICO_SANDBOX_API_KEY=
IYZICO_SANDBOX_SECRET_KEY=
```

Production variables:

```text
IYZICO_API_KEY=
IYZICO_SECRET_KEY=
```

Checkout Form callback endpoint is generated from the trusted request origin:

```text
https://YOUR_DOMAIN/api/payments?op=iyzico-callback
```

The application signs server requests with IYZWSv2 HMAC SHA-256, verifies signed initialize/retrieve responses, retrieves Checkout Form results server-side, and validates amount/currency against the canonical transaction before marking a booking paid.

`Admin > Ödeme ve Depozito > Test / sandbox modu` controls whether iyzico sandbox or live credentials are used. Both credential sets may exist simultaneously.

## Activation sequence

1. Connect and verify the production domain on Vercel.
2. Set the common HTTPS origin variables.
3. Add PayTR and/or iyzico server credentials to Vercel Production and Preview as appropriate.
4. Keep `PAYMENT_CARD_ENABLED=false`, deploy, and confirm `/api/payments?op=provider-status` reports the expected credentials as available without exposing any secret values.
5. Complete provider test transactions and provider-side callback setup.
6. Set `PAYMENT_CARD_ENABLED=true` and redeploy.
7. Open Admin > Ödeme ve Depozito, select PayTR or iyzico, select test/live mode, enable Card, and save.
8. Run one low-value controlled booking through the selected provider and verify the booking and `payment_transactions` terminal status.
9. Switch provider from Admin only when desired; do not delete old provider secrets or historical provider references merely because a different provider becomes active.

## Provider roles

- **Customer bookings:** active provider can be PayTR or iyzico.
- **Havale/EFT and office payment:** provider-independent and controlled by database-backed admin settings.
- **Branch subscription card payments:** currently intentionally PayTR-specific; this is a separate business flow from customer booking checkout.
