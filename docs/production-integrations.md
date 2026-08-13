# Production booking integrations

This document is the operational checklist for Alperler Auto booking persistence and transactional notifications.

## 1. Source of truth

- `firestore.rules` is the only Firestore Rules source of truth in this repository.
- `firebase.json` points Firestore deployments to `firestore.rules`.
- Do not restore or deploy old draft rules from Git history.
- Booking documents use schema version 3 and IDs in the form `RES-<13 digit timestamp>-<8 uppercase alphanumeric chars>`.
- Client access to `bookings/{bookingId}/notificationEvents/*` is denied. The server-side service account owns the notification ledger.

## 2. Vercel production variables

Configure these only in Vercel project environment settings. Never commit secret values to Git.

### Application

- `PUBLIC_APP_URL`

### Firebase service account

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

`FIREBASE_PRIVATE_KEY` may be stored as one line containing literal `\n` sequences. The server normalizes them at runtime.

### Transactional e-mail

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `MAIL_FROM`
- `MAIL_ADMIN_TO`

The generic `/api/send-email` endpoint remains restricted. Customer booking notifications must use `/api/notifications/booking`, which verifies the booking in Firestore and builds the message on the server.

### Transactional SMS

- `SMS_PROVIDER=twilio`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM`
- or `TWILIO_MESSAGING_SERVICE_SID`

Keep `SMS_PROVIDER=none` until the credentials and sender are valid. The application must never report an SMS as sent when the provider is not configured.

### Business identity

- `BUSINESS_NAME`
- `BUSINESS_PHONE`
- `BUSINESS_EMAIL`
- `BUSINESS_ADDRESS`
- `BUSINESS_WEBSITE`
- `BUSINESS_INSTAGRAM_URL`
- `BUSINESS_FACEBOOK_URL`
- `BUSINESS_TIKTOK_URL`
- `BUSINESS_YOUTUBE_URL`

Only verified social profile URLs should be configured. Empty social variables are intentionally omitted from outgoing messages.

## 3. Firebase Rules deployment

Repository presence is not proof that the rules are live in Firebase. After a rules change:

1. Authenticate Firebase CLI or CI with the correct production Firebase project.
2. Verify the target project ID before deployment.
3. Deploy Firestore rules using `firebase.json`.
4. Confirm the deployed rules version in Firebase Console.
5. Test that a public user can create only a valid schema-v3 `PENDING` booking.
6. Test that a public user cannot read bookings or notification ledger documents.
7. Test that an authenticated admin can read bookings and update only lifecycle/payment fields permitted by the rules.

Do not deploy if the Firebase project identity cannot be verified.

## 4. End-to-end production verification

After Vercel secrets and Firebase Rules are configured:

1. Redeploy the exact Git commit intended for production.
2. Request `/api/integrations/status` and verify e-mail, SMS and server-side database readiness.
3. Create one controlled test appointment with a real test e-mail and phone number.
4. Confirm the booking exists in Firestore before any success state is accepted.
5. Confirm the booking is schema version 3 and starts in `PENDING`.
6. Confirm a private `notificationEvents` ledger entry exists for the booking event.
7. Confirm customer e-mail delivery and record the provider message ID.
8. Confirm customer SMS delivery and record the provider message ID.
9. Confirm admin notification e-mail delivery.
10. Change the booking to `APPROVED` in the admin panel and verify the lifecycle update is persisted before notification delivery.
11. Repeat for `CANCELLED` on a separate test booking.
12. Confirm duplicate requests for an already processed event do not cause duplicate delivery.

## 5. Failure policy

- Booking persistence and notification delivery are separate outcomes.
- A notification failure must never delete a valid Firestore booking.
- Missing provider configuration is `not_configured`, not `sent`.
- Provider rejection is `failed`, not `sent`.
- Duplicate lifecycle events are protected by the Firestore notification ledger.
- If Firestore server verification is not configured, transactional customer notification must fail closed rather than trust browser-supplied recipient/content data.

## 6. Deployment artifact safety

`.vercelignore` excludes ZIP archives, including files under `public/`. Legacy project archives may remain recoverable in Git history, but they must not be shipped as public production assets.
