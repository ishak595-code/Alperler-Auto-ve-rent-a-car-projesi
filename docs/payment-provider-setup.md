# PayTR + iyzico Payment Provider Setup

Alperler Rent A Car supports PayTR and iyzico side-by-side. Both credential sets may remain installed. The active customer-card provider is selected from the Admin panel and historical transactions keep their original provider.

## Where to manage payments in Admin

The canonical management path is:

**Admin > Muhasebe & Tahsilat > Ödeme ve Depozito**

Direct route: `/admin/payments`

Use the finance module as follows:

- **Muhasebe & Tahsilat**: income/expense ledger, office/EFT collections, reports and links to payment/subscription management.
- **Ödeme ve Depozito**: PayTR/iyzico credentials, active provider, Test/Sandbox mode, Card/EFT/Office switches, deposit rule, currency, bank/IBAN, provider callback addresses and readiness state.
- **Şube Abonelikleri**: branch subscription invoices and payment operations. Branch subscription card collection remains PayTR-specific.

After the provider gives you credentials, routine operation is Admin-owned. Changing the active provider, test/live mode, Card, EFT/Office, deposit rule, bank details or rotating provider credentials does not require a code change or deployment.

## Recommended no-code setup

The preferred credential store is **Supabase Vault**, which is integrated into the Admin payment screen. When PayTR or iyzico gives you merchant/API credentials, enter them directly in **Admin > Muhasebe & Tahsilat > Ödeme ve Depozito**. The values are encrypted in Vault and are never returned to the browser after save.

Environment variables remain supported as a server-only compatibility/fallback option. Vault credentials take precedence when a complete Vault set exists.

Normal future activation does not require a deployment or a developer. The database-backed **Kart** switch in Admin is the activation authority. The Admin service checks the server-side provider readiness before it allows Card to be saved as enabled, and the payment API independently fails closed unless the selected provider has a complete credential set.

## Safety rules

- Never put provider secret keys in Angular/browser source, normal Supabase tables, screenshots, issue comments, chat logs, or Git history.
- Never prefill or echo saved secret values back to the Admin browser. The screen shows only configured/not-configured status.
- Keep customer card collection disabled in Admin until the provider account is approved and sandbox/test verification passes.
- Do not automatically retry a failed charge through the second provider. Manual/Admin provider switching avoids double-charge ambiguity.
- Card details are entered only on PayTR/iyzico hosted payment surfaces; they do not enter this application.
- iyzico buyer identity/address fields required for Checkout Form are transmitted only to iyzico and are not copied into `payment_transactions.request_snapshot`.

## Emergency server controls

Everyday provider setup and card activation are owned by Admin. The optional server variable below is deliberately **kill-only**. It is not part of normal activation.

```text
PAYMENT_CARD_KILL_SWITCH=false
PAYMENT_EFT_ENABLED=true
PAYMENT_OFFICE_ENABLED=true
PAYMENT_ALLOWED_ORIGINS=https://YOUR_DOMAIN
APP_PUBLIC_ORIGIN=https://YOUR_DOMAIN
PUBLIC_APP_URL=https://YOUR_DOMAIN
SITE_URL=https://YOUR_DOMAIN
```

- `PAYMENT_CARD_KILL_SWITCH=false`: Admin may activate a fully configured provider.
- `PAYMENT_CARD_KILL_SWITCH=true`: all new card-session creation is blocked immediately, regardless of the Admin Card setting. Use only for incident response/emergency maintenance.

This design means receiving new PayTR/iyzico credentials later does not require changing a Vercel environment variable merely to start accepting cards.

While no custom domain is connected, leave the custom-origin variables empty and use Vercel's derived production/deployment origin. Never configure an unowned domain.

## PayTR

Official developer documentation: https://dev.paytr.com/

PayTR provides these three values:

```text
Merchant No / Merchant ID
Merchant Key
Merchant Salt
```

PayTR documents these API values in the Merchant Panel information/integration area. Enter all three in **Admin > Muhasebe & Tahsilat > Ödeme ve Depozito > PayTR Güvenli Bağlantı**.

Optional server environment fallback:

```text
PAYTR_MERCHANT_ID=
PAYTR_MERCHANT_KEY=
PAYTR_MERCHANT_SALT=
PAYTR_TEST_MODE=false
```

`PAYTR_TEST_MODE=true` is an emergency force-test override. Leave it `false` for normal operation so **Admin > Test / sandbox modu** controls whether PayTR is sent `test_mode=1` or `0`.

### PayTR Bildirim URL

Open the live Alperler Admin payment screen and copy **PayTR Bildirim URL**. In PayTR Merchant Panel, register it under the Notification/Callback setting. PayTR's current documentation places the Bildirim URL setting under the Merchant Panel's setup/settings area.

Production shape:

```text
https://YOUR_DOMAIN/api/payments?op=paytr-callback
```

This endpoint is intentionally public to PayTR, session-independent, verifies the PayTR HMAC itself and returns plain `OK` only after a valid callback is processed.

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

Enter the sandbox API Key and Secret Key in **Admin > Muhasebe & Tahsilat > Ödeme ve Depozito > iyzico Sandbox Bağlantısı**.

Environment fallback:

```text
IYZICO_SANDBOX_API_KEY=
IYZICO_SANDBOX_SECRET_KEY=
```

### Live credentials

Enter the live API Key and Secret Key in **Admin > Muhasebe & Tahsilat > Ödeme ve Depozito > iyzico Canlı Bağlantısı** after your live merchant account is approved.

Environment fallback:

```text
IYZICO_API_KEY=
IYZICO_SECRET_KEY=
```

Both Sandbox and Live sets can coexist. **Admin > Test / sandbox modu** selects which set is used. Card cannot be saved as enabled unless the credential set for the selected mode is server-confirmed as configured.

### Checkout Form callback

The application sends this trusted HTTPS callback URL to iyzico when creating Checkout Form:

```text
https://YOUR_DOMAIN/api/payments?op=iyzico-callback
```

The live Admin screen also shows this address for operational verification. Checkout Form sends the callback URL as part of session initialization; there is no reason to type a secret into the browser for this step.

The application signs requests with IYZWSv2 HMAC SHA-256, verifies initialize/retrieve response signatures, and validates amount/currency against the canonical transaction.

A `fraudStatus=0` result is **not** marked paid. It remains pending/authorized and the booking stays pending until iyzico completes the fraud review.

If an already authorized/reviewing transaction is later rejected by iyzico with `fraudStatus=-1`, the application records the provider outcome as **REFUNDED**, matching iyzico's post-review fraud lifecycle instead of misclassifying it as an ordinary payment failure.

### iyzico Instant Fraud Notification (IFN)

Copy **iyzico Fraud / IFN URL** from the live Admin payment screen and register it in the applicable iyzico merchant notification/fraud-notification configuration when enabled for the merchant account.

Production shape:

```text
https://YOUR_DOMAIN/api/payments?op=iyzico-fraud-notification
```

The IFN payload itself is used only as a reconciliation trigger. Before changing the booking/payment state, the server retrieves the payment directly from iyzico with signed API authentication, verifies iyzico's response signature, and rechecks amount, currency, payment status and fraud status. This prevents an unauthenticated forged IFN payload from marking a booking paid.

## Admin activation sequence

1. Provider approves your merchant account.
2. Open **Admin > Muhasebe & Tahsilat > Ödeme ve Depozito** (`/admin/payments`).
3. Save PayTR and/or iyzico credentials into the encrypted Vault forms. Saved values disappear from the form and only readiness status remains.
4. Keep **Kart** disabled and **Test / sandbox modu** enabled.
5. For PayTR, copy **PayTR Bildirim URL** from Admin and register it in the PayTR Merchant Panel.
6. For iyzico, verify the Checkout Form callback address and copy/register **iyzico Fraud / IFN URL** where applicable.
7. Confirm the Admin screen reports the intended provider/mode as ready.
8. Run controlled sandbox/test payments and confirm callback settlement and the corresponding `payment_transactions` state.
9. In Admin, select the desired active provider and enable **Kart**. The system refuses to save Card as enabled if the selected provider/mode credentials are not ready.
10. When live credentials and merchant approval are confirmed, turn off **Test / sandbox modu** and save. For iyzico this switches readiness to the live credential set.
11. Run one low-value controlled real booking and verify the booking plus `payment_transactions` terminal status before normal customer use.

## Provider roles

- **Customer bookings:** active provider may be PayTR or iyzico.
- **Havale/EFT and office payment:** provider-independent and controlled by database-backed Admin settings.
- **Branch subscription card payments:** intentionally PayTR-specific for now; this is separate from customer booking checkout.

## What remains outside the Admin panel

The following are infrastructure/provider responsibilities rather than ordinary site settings:

- provider merchant-account application, commercial approval, KYC and contract/commission terms;
- entering the Alperler callback/notification URL in the provider's own merchant panel where that provider requires it;
- domain ownership, DNS and TLS/SSL configuration;
- the emergency server-only `PAYMENT_CARD_KILL_SWITCH` used only for incident response.

Everything else in the normal payment operating cycle is designed to be managed from **Admin > Muhasebe & Tahsilat > Ödeme ve Depozito**.

## Operational recovery

- If a provider has an incident, first disable **Kart** or select **Online kart kapalı** in Admin.
- For a platform-wide incident where Admin must not be able to reopen card collection, set `PAYMENT_CARD_KILL_SWITCH=true` as an emergency server override.
- Do not delete historical payment rows or provider references when switching providers.
- Rotating a provider secret is done by entering the full replacement set in the matching Admin secure form; old values are overwritten in Vault.
- Removing Vault credentials does not erase environment fallback credentials. If environment credentials exist, the server may still report the provider as configured.
