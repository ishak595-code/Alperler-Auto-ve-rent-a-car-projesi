# V226 Production Hardening

## Confirmed production invariants

- Saved-card provider tokens remain server-only.
- The canonical provider-token owner is `private.customer_payment_tokens`.
- `service_customer_payment_method_token_v225(uuid, uuid)` is executable by `service_role` only.
- Customer payment methods are browser-visible only as opaque method IDs plus display metadata.
- Saved-card charging is available only with iyzico. The PayTR hosted iframe flow does not advertise saved-card charging.
- A saved-card charge requires an authenticated, email-confirmed customer and an owned booking.
- Sandbox and live saved-card tokens cannot cross environments.

## V226 concurrency invariant

A booking may have at most one active stored-card charge at a time. The database enforces this independently of browser state with `uq_payment_transactions_one_active_saved_card_v226` for `CREATED`, `PENDING`, `AUTHORIZED`, and `PAID` stored-card transactions.

This closes the server-side race where two requests using different saved cards could otherwise create separate active claims for the same booking before either charge completed.

## Release requirements

V226 must not merge unless the V226 payment concurrency workflow and the existing production, security, accessibility, responsive, repository-governance, booking, and quality gates are green on the exact pull-request head.

The repository's `main` branch should also be protected in GitHub so direct pushes cannot bypass those checks. The current connected GitHub API surface can audit branch protection but does not expose a protection write action, so this repository setting must not be represented as enabled unless GitHub itself reports it as protected.
