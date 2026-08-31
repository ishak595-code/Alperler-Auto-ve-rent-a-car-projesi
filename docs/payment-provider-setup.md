# PayTR + iyzico Payment Provider Setup

Alperler Rent A Car supports PayTR and iyzico side-by-side. Both credential sets may remain installed. The active customer-card provider is selected from **Admin > Ödeme ve Depozito** and historical transactions keep their original provider.

## Recommended no-code setup

The preferred credential store is **Supabase Vault**, which is integrated into the admin payment screen. When PayTR or iyzico gives you merchant/API credentials, enter them directly in **Admin > Ödeme ve Depozito**. The values are encrypted in Vault and are never returned to the browser after save.

Environment variables remain supported as a server-only compatibility/fallback option. Vault credentials take precedence when a complete Vault set exists.

## Safety rules

- Never put provider secret keys in Angular/browser source, normal Supabase tables, screenshots, issue comments, chat logs, or Git history.
- Never prefill or echo saved secret values back to the admin browser. The admin screen shows only configured/not-configured status.
- Keep customer card collection disabled until the provider account is approved and sandbox/test verification passes.
- Do not automatically retry a failed charge through the second provider. Manual/admin provider switching avoids double-charge ambiguity.
- Card details are entered only on PayTR/iyzico hosted payment surfaces; they do not enter this application.
- iyzico buyer identity/address fields required for Checkout Form are transmitted only to iyzico and are not copied into `payment_transactions.request_snapshot`.

## One-time server safety switches

These variables are server-only. `PAYMENT_CARD_ENABLED` is an emergency/global kill switch in addition to the database-backed Admin card toggle.

```text
PAYMENT_CARD_ENABLED=false
PAYMENT_EFT_ENABLED=true
PAYMENT_OFFICE_ENABLED=true
PAYMENT_ALLOWED_ORIGINS=https://YOUR_DOMAIN
APP_PUBLIC_ORIGIN=https://YOUR_DOMAIN
PUBLIC_APP_URL=https://YOUR_DOMAIN
SITE_URL=https://YOUR_DOMAIN
```

Keep `PAYMENT_CARD_ENABLED=false` during initial setup. Change it to `true` only after provider sandbox/test validation is complete. After that, everyday provider selection, test/live selection, and Card on/off are managed from Admin.

While no custom domain is connected, leave the custom-origin variables empty and use Vercel's derived production/deployment origin. Never configure an unowned domain.

## PayTR

Official developer documentation: https://dev.paytr.com/

PayTR provides these three values:

```text
Merchant No / Merchant ID
Merchant Key
Merchant Salt
```

Preferred: enter all three in **Admin > Ödeme ve Depozito > PayTR Güvenli Bağlantı**.

Optional server environment fallback:

```text
PAYTR_MERCHANT_ID=
PAYTR_MERCHANT_KEY=
PAYTR_MERCHANT_SALT=
PAYTR_TEST_MODE=false
```

`PAYTR_TEST_MODE=true` is an emergency force-test override. Leave it `false` for normal operation so **Admin > Test / sandbox modu** controls whether PayTR is sent `test_mode=1` or `0`.

### PayTR Bildirim URL

In the PayTR Merchant Panel, configure the production **Bildirim URL / Callback URL** as:

```text
https://YOUR_DOMAIN/api/payments?op=paytr-callback
```

Do not use `/api/payments/paytr-callback`; this project uses the `op=paytr-callback` router operation.

The application:

- creates the PayTR iFrame token server-side;
- calculates the requested amount from the canonical booking/database record, not a browser-supplied amount;
- verifies the PayTR callback HMAC with constant-time comparison;
- keeps HMAC validation on PayTR `total_amount` as specified by PayTR;
- validates the original order amount against callback `payment_amount`, because `total_amount` may be higher for installments/alternative payment methods;
- responds `OK` only after a valid callback is processed and handles duplicate terminal callbacks idempotently.

Current customer and branch-subscription PayTR card flows use TRY.

## iyzico

Official developer documentation: https://docs.iyzico.com/

### Sandbox credentials

Preferred: enter the sandbox API Key and Secret Key in **Admin > Ödeme ve Depozito > iyzico Sandbox Bağlantısı**.

Environment fallback:

```text
IYZICO_SANDBOX_API_KEY=
IYZICO_SANDBOX_SECRET_KEY=
```

### Live credentials

Preferred: enter the live API Key and Secret Key in **Admin > Ödeme ve Depozito > iyzico Canlı Bağlantısı**.

Environment fallback:

```text
IYZICO_API_KEY=
IYZICO_SECRET_KEY=
```

Both Sandbox and Live sets can coexist. **Admin > Test / sandbox modu** selects which set is used.

### Checkout Form callback

The application sends this trusted HTTPS callback URL to iyzico when creating Checkout Form:

```text
https://YOUR_DOMAIN/api/payments?op=iyzico-callback
```

The application signs requests with IYZWSv2 HMAC SHA-256, verifies initialize/retrieve response signatures, and validates amount/currency against the canonical transaction.

A `fraudStatus=0` result is **not** marked paid. It remains pending/authorized and the booking stays pending until iyzico completes the fraud review.

### iyzico Instant Fraud Notification (IFN)

In the iyzico Merchant Panel, configure the fraud-review Callback / IFN URL as:

```text
https://YOUR_DOMAIN/api/payments?op=iyzico-fraud-notification
```

The IFN payload itself is used only as a reconciliation trigger. Before changing the booking/payment state, the server retrieves the payment directly from iyzico with signed API authentication, verifies iyzico's response signature, and rechecks amount, currency, payment status and fraud status. This prevents an unauthenticated forged IFN payload from marking a booking paid.

## Admin activation sequence

1. Provider approves your merchant account.
2. Open **Admin > Ödeme ve Depozito**.
3. Save PayTR and/or iyzico credentials into the encrypted Vault forms. Saved values disappear from the form and only readiness status remains.
4. Keep **Kart** disabled and **Test / sandbox modu** enabled.
5. For PayTR, add the PayTR Bildirim URL in the PayTR Merchant Panel.
6. For iyzico, add the IFN URL in the iyzico Merchant Panel.
7. Confirm the Admin screen reports the intended provider mode as ready.
8. Run controlled sandbox/test payments and confirm callback settlement.
9. Set the one-time server safety switch `PAYMENT_CARD_ENABLED=true` and deploy.
10. In Admin, select the desired active provider, keep test mode for a final check, enable **Kart**, and save.
11. When live credentials and merchant approval are confirmed, turn off **Test / sandbox modu** and save.
12. Run one low-value controlled real booking and verify the booking plus `payment_transactions` terminal status before normal customer use.

## Provider roles

- **Customer bookings:** active provider may be PayTR or iyzico.
- **Havale/EFT and office payment:** provider-independent and controlled by database-backed Admin settings.
- **Branch subscription card payments:** intentionally PayTR-specific for now; this is separate from customer booking checkout.

## Operational recovery

- If a provider has an incident, disable **Kart** or select **Online kart kapalı** in Admin before changing anything else.
- Do not delete historical payment rows or provider references when switching providers.
- Rotating a provider secret is done by entering the full replacement set in the matching Admin secure form; old values are overwritten in Vault.
- Removing Vault credentials does not erase environment fallback credentials. If environment credentials exist, the server may still report the provider as configured.
