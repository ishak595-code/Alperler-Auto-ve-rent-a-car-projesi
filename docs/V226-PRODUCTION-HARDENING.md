# V226 Production Hardening

## Confirmed production invariants

- Saved-card provider tokens remain server-only.
- The canonical provider-token owner is `private.customer_payment_tokens`.
- `service_customer_payment_method_token_v225(uuid, uuid)` is executable by `service_role` only.
- Customer payment methods are browser-visible only as opaque method IDs plus display metadata.
- Saved-card charging is available only with iyzico. The PayTR hosted iframe flow does not advertise saved-card charging.
- A saved-card charge requires an authenticated, email-confirmed customer and an owned booking.
- Sandbox and live saved-card tokens cannot cross environments.
- Browser roles cannot insert, update, or delete `payment_transactions`. Authenticated users retain only the RLS-constrained read path required by the application.

## V226 booking payment invariant

A booking may have at most one active customer payment attempt at a time, regardless of whether the attempt uses a saved card, iyzico hosted checkout, or PayTR hosted checkout.

Production enforces this independently of browser state with the unique partial index `uq_payment_transactions_one_active_booking_v226` on `booking_id` for `CREATED`, `PENDING`, `AUTHORIZED`, and `PAID` transactions.

Failed, cancelled, and refunded transactions fall outside the active set, so a legitimate retry can create a new payment attempt after the prior attempt is no longer active.

This closes both saved-card versus saved-card races and cross-channel races between saved-card charging and hosted payment sessions.

## Customer profile and Storage invariant

The `customer-avatars` bucket accepts only the configured image formats and size limit. Customer writes remain owner-scoped. Because avatar replacement uses Storage upsert, production also has `customer_avatar_select_own`, which grants an authenticated customer SELECT visibility only to their own objects in that bucket. This keeps first upload and subsequent replacement consistent under Storage RLS.

The account surface keeps profile and booking data as required reads while optional loyalty and referral summaries are isolated with settled reads so an optional dependency cannot collapse the entire profile.

Account security remains owned by the canonical V223 component and renders only after explicit customer action.

## Customer CTA, footer, and newsletter invariant

Campaign fallback CTAs are constrained at the database boundary to safe customer-facing internal routes. Protocol-relative targets, `/admin`, and `/branch-portal` targets are rejected by `campaigns_cta_internal_route_v226_check`.

The public footer suppresses administrative actions. Feedback uses the canonical contact gateway. Newsletter signup, unsubscribe state, admin listing, and admin mutations all operate on the same newsletter data source through their server-side gateways rather than direct browser table writes.

## Quick Planning stability invariant

`HomeV71Component` remains the canonical production homepage owner. The planner-specific touch stability layer is scoped to HomeV71 and the global `device-experience.css` device policy remains the final global CSS layer.

The V205 browser matrix includes a real Quick Planning interaction regression on Android phone, iPhone/WebKit, Android landscape phone, iPad Mini/WebKit, Android tablet, and desktop Chromium. It verifies that interactions settle without residual planner movement or horizontal overflow, that validation behaves correctly, that the accessible date dialog can select today, and that the chosen date reaches the canonical tour route.

## Production migrations added in V226

- `20260902003000_v226_saved_card_single_active_charge_guard.sql`
- `20260902011500_v226_referral_identity_contract_restore.sql`
- `20260902014500_v226_customer_footer_admin_link_retire.sql`
- `20260902020500_v226_booking_payment_channel_lock_and_grant_hardening.sql`
- `20260902110004_v226_customer_avatar_upsert_select_policy.sql`
- `20260902110216_v226_campaign_cta_internal_route_guard.sql`

Production migration state must be checked against the live Supabase migration ledger before release. A migration file existing in GitHub is not sufficient evidence that the invariant is live.

## Release requirements

V226 must not merge unless the exact pull-request head is green across the V226 production integrity workflow and the existing production, security, accessibility, responsive, repository-governance, booking, database-source, architecture, PWA, and quality gates.

The PR must be merged with an expected-head SHA so a late branch update cannot bypass the validated commit.

GitHub repository rulesets were empty when checked during V226. The available classic branch-protection read returned insufficient permission, so classic `main` protection could not be positively verified and must not be represented as enabled without direct GitHub evidence.

The connected Vercel project available in this session points to a different repository, so V226 must not claim a Vercel preview or deployment verification from that unrelated project.