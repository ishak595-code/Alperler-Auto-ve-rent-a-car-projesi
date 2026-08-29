# V212 Privacy and Third-Party Tracking Consent

## Purpose

V212 makes `VisitorAnalyticsService` the single runtime owner for optional visitor-tracking consent. The application must not create a second consent store, a second banner state machine, or a page-specific tracking preference.

## Consent purposes

Two optional purposes are independent:

- **Analytics**: first-party visitor analytics and, when configured, Google Analytics.
- **Marketing**: when configured, Google Ads and Meta Pixel.

Essential site operations such as authentication, security, reservations and service requests are not controlled by these optional toggles.

## Legacy preference migration

The existing storage key `alperler.analytics.consent.v1` remains canonical so existing browsers do not receive conflicting preference owners.

- legacy `accepted` => analytics accepted, marketing unknown
- legacy `rejected` => analytics rejected, marketing rejected
- no/invalid value => analytics unknown, marketing unknown

A historic analytics acceptance must never silently become marketing consent.

## Runtime rules

1. `AnalyticsConsentComponent` is mounted once by the customer root shell.
2. Admin and branch portal surfaces do not render the customer consent banner.
3. Google Analytics may be loaded only when analytics consent is accepted.
4. Google Ads and Meta Pixel may be loaded only when marketing consent is accepted.
5. Revocation must update already-loaded provider consent APIs and remove known first-party tracking cookies where possible.
6. SEO metadata, canonical URLs and JSON-LD are independent from optional tracking consent and must continue to function with every optional purpose disabled.
7. The legal/privacy center exposes both current choices and can reset them so the customer can choose again.
8. Production site configuration may contain tracking IDs in the future; adding an ID must not bypass the consent gate.

## Permanent invariant

`scripts/check-v212-third-party-tracking-consent.mjs` is part of `verify:handoff` and is also executed by the V208.2 architecture constitution guard. A future change that removes the root consent owner, collapses analytics and marketing consent, or wires provider IDs directly without the purpose gates must fail CI.
