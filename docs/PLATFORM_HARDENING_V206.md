# V206 Platform Hardening Checklist

Some production controls live in provider/account configuration and cannot be guaranteed by application source code alone. This document prevents those controls from being forgotten during handoff or migration.

## Current audit context

At the V206 handoff audit, application CI/security gates are green on the V205 production baseline. Two account-level controls still require provider-side administration in any final production environment:

1. GitHub protection/rules for `main`.
2. Supabase Auth leaked-password protection when the project plan supports it.

These are not reasons to weaken source controls. They are additional platform controls.

## GitHub `main` protection

Required production policy:

- no routine direct pushes to `main`;
- changes arrive through pull requests;
- required production quality checks must pass before merge;
- force pushes should be disabled;
- branch deletion should be blocked;
- administrators should follow the same review/quality process unless an emergency procedure is explicitly used.

Recommended required checks include the central professional quality gate and current release integrity/security checks that are stable for the repository.

Do not blindly require every historical workflow by name forever. Required checks should represent current canonical release gates and should be updated when workflows are intentionally retired or renamed.

After configuring protection/rules, verify the GitHub branch API reports protection/rules as enabled and test that an unreviewed/failing PR cannot merge.

## Supabase leaked-password protection

Supabase Security Advisor reports a warning when leaked-password protection is disabled.

Supabase documents this control under Auth password security. When enabled, Supabase Auth rejects known compromised passwords using the HaveIBeenPwned Pwned Passwords data/API.

The feature is plan-dependent. If available for the production project:

- open Supabase Dashboard;
- go to Authentication/Auth settings for password security;
- enable leaked-password protection;
- keep a sensible minimum password length and password-strength policy;
- re-run Security Advisor and confirm the warning is gone.

Do not implement a fake client-side substitute and call the issue closed. Password compromise checks belong at the authentication authority.

## Supabase RLS information findings

Security Advisor may also report `RLS enabled, no policy` as INFO for internal/server-only tables. This can be correct when the intended policy is "no direct client access".

Do not add permissive RLS policies merely to silence an INFO finding.

For each finding, prove the intended access model:

- server-only/no direct client access -> RLS enabled with no client policy can be intentional;
- authenticated client access required -> add the narrow policy through a new migration;
- public access required -> add only the minimum explicit policy needed.

## Supabase unused-index information findings

A young or low-traffic production database can show many `unused_index` INFO findings.

Do not mass-drop these indexes based only on zero recorded scans. Before removal, check:

- query patterns;
- foreign-key/join needs;
- operational/admin/reporting workloads;
- data growth expectations;
- whether the index was recently introduced;
- whether a scheduled/rare workflow depends on it.

Index cleanup should be evidence-driven and delivered through a new migration.

## Vercel/deployment account

For each production deployment account verify:

- the repository integration points to the intended project;
- the production domain is attached to that project;
- Node 22 is used;
- all required server-only secrets are configured;
- preview and production environments do not accidentally share secrets that should differ;
- deployment status for the exact merge commit succeeds;
- production aliases/domains resolve to the successful deployment.

Repository code must remain portable even if management access to a specific Vercel account is unavailable to a developer.

## Domain/DNS

Before setting `PUBLIC_APP_URL`, `PUBLIC_SITE_URL` or payment allowed origins:

- the domain must actually be owned;
- DNS must point to the intended production host;
- HTTPS must be serving the application;
- Auth redirect URLs must be updated;
- payment provider callback/origin configuration must be updated;
- SEO canonical/sitemap/robots output must reflect the real origin.

Do not commit speculative domains into source.

## Production certification record

For a formal handoff, record outside the source repository:

- production Git commit SHA;
- deployment ID/date;
- Supabase project reference;
- domain(s);
- date Security Advisor was reviewed;
- date GitHub protection/rules were verified;
- operator who performed the platform checks.

Do not record secret values in this certification record.
