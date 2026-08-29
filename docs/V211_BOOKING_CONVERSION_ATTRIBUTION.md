# V211 Booking Conversion Attribution

V211 closes conversion measurement for the canonical appointment path without creating a second analytics runtime owner.

## Canonical funnel

The single funnel name is `booking_conversion`.

Entry steps are attached to the original consent-aware click event produced by `VisitorAnalyticsService`:

- `entry_mobile_dock` — the canonical `MOBILE_DOCK` appointment item identified by `data-dock-item="appointment"`.
- `entry_home_closing_cta` — the database-managed `closing_cta` homepage section identified by its existing section ownership marker.
- `entry_other_appointment_link` — other internal links whose final path is `/appointment`.

No extra synthetic click is emitted for these entries. This preserves the accuracy of aggregate click counts while still attaching `funnelName`, `funnelStep`, and safe `section` metadata.

## Appointment lifecycle

The existing appointment form declares `data-analytics-form="booking_conversion"`, so the current global analytics owner emits:

- `form_start / started`
- `form_submit / submit_attempt`
- `form_abandon / abandoned` when applicable

After `BookingService.create()` resolves successfully, `AppointmentComponent` records `form_submit / success` through `VisitorAnalyticsService.trackFormSuccess('booking_conversion')`. Success is never recorded before the booking write succeeds.

## Privacy and transport

V211 does not add a new endpoint, table, RPC, cookie, identifier, or tracking provider. Analytics still requires the existing explicit analytics consent and remains disabled on admin paths.

The existing `analytics-ingest` Edge Function remains the server-side ingestion owner. It already sanitizes `funnelName` and `funnelStep`, allowlists `section` metadata, rate-limits requests, redacts sensitive text patterns, and writes through the existing server-side analytics RPC.

## Admin reporting

The existing Admin Analytics screen remains the reporting owner. Its `FUNNELS` view can now show the complete `booking_conversion` chain and compare which appointment entry surface produces form starts, submission attempts, abandonment, and successful booking records.

## Permanent invariant

`scripts/check-v211-booking-conversion-attribution.mjs` enforces the full contract. It is wired into `verify:handoff` and is also executed by the always-on V208.2 Architecture Constitution guard, so future pull requests cannot silently detach the mobile dock, closing CTA, appointment form lifecycle, successful booking completion, secure ingest, or admin funnel reporting.