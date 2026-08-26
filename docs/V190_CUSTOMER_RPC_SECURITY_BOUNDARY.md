# V190 Customer RPC Security Boundary

## Problem

After V189 moved branch authorization helpers out of the exposed `public` schema, Supabase Security Advisor still reported twelve legitimate customer/branch self-service RPCs as `SECURITY DEFINER` functions in `public`.

Those functions cannot simply become `SECURITY INVOKER` implementations. Several must read or mutate privileged sources such as `auth.users`, protected booking/audit data, referral state, vault terms and payment-method metadata. A blind invoker conversion would break production behavior, while leaving the privileged bodies in `public` keeps an avoidable Data API privilege surface.

## Root fix

V190 separates API contract from privilege implementation.

For each of the twelve RPCs, the existing production-tested function is renamed and moved in-place to `private`. PostgreSQL keeps the same function object/body/dependencies while its schema/name changes. The implementation remains `SECURITY DEFINER`, has `search_path=''`, retains its existing self/role authorization logic, and is not executable by `PUBLIC` or `anon`.

The original `public` name is recreated with the exact argument/default/return contract as a thin `SECURITY INVOKER` wrapper. The browser continues calling the same `/rest/v1/rpc/...` names, but the exposed function itself no longer elevates privileges.

This avoids duplicating or reimplementing security-sensitive business logic while removing all twelve privileged implementations from the exposed public schema.

## RPCs closed by V190

- `accept_customer_vault_terms()`
- `claim_customer_referral(text)`
- `claim_customer_referral_context(text, uuid, text)`
- `customer_cancel_booking(text)`
- `customer_lifetime_summary(uuid)`
- `ensure_customer_profile()`
- `get_or_create_customer_referral_code()`
- `link_own_customer_booking(text)`
- `my_branch_subscription_entitlements_v1714()`
- `remove_customer_payment_method(uuid)`
- `revoke_customer_vault_terms()`
- `set_default_customer_payment_method(uuid)`

## Contract preservation

V190 preserves:

- existing public RPC names used by the website
- argument types and optional defaults
- return types, including the branch entitlement table shape
- authenticated caller access
- pre-existing service-role access only on functions that already had it
- the original privileged implementation code and dependency OIDs

`PUBLIC` and `anon` execution are explicitly revoked from both public wrappers and private implementations.

## Production preflight

Before the migration was committed, the full DDL was executed against production inside a transaction ending in `ROLLBACK`. The transformed state reported zero target `public` SECURITY DEFINER functions, proving the schema/function operations and wrapper signatures are valid without changing production state.

## HIBP password warning is separate

The remaining `Leaked Password Protection Disabled` advisor warning is not caused by SQL or these RPCs. Production currently runs on the Supabase Free plan. Supabase's native Have I Been Pwned password protection (`password_hibp_enabled`) is a paid-plan Auth capability.

The website already performs a client-side compromised-password check as a defense-in-depth control, but a crafted client could bypass browser validation and call Supabase Auth directly. Therefore the native platform warning must not be represented as solved by frontend code.

The actual platform-boundary fix is:

1. explicitly approve/perform a Supabase Pro upgrade,
2. enable native leaked-password protection in Supabase Auth,
3. rerun Security Advisor.

V190 does not trigger a paid plan change automatically.
