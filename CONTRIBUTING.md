# Contributing to Alperler Rent A Car

This repository is production-oriented. Changes must preserve canonical ownership, live data truth, accessibility, portability and the premium visual identity.

## Branch and pull-request discipline

- Branch from the latest `main`.
- Keep one coherent engineering objective per pull request.
- Never develop production changes directly on `main`.
- Do not merge while production-affecting checks are failing or still running.
- Prefer squash merge for focused release branches so `main` stays readable.

Recommended flow:

```bash
git checkout main
git pull --ff-only
git checkout -b feature/short-purpose
npm ci
npm run verify:handoff
```

After implementation, run the full handoff gate again before opening or updating the PR.

## Canonical ownership first

Before creating a new page, component or service, inspect:

- `src/app.routes.ts`
- `docs/CANONICAL_RUNTIME_ARCHITECTURE_V203.md`
- `docs/DEVELOPER_HANDOFF_V206.md`

A new versioned component is not automatically the new runtime owner. Stable route wrappers must continue pointing to one explicit implementation.

Never reintroduce removed parallel rental, sale, tour or admin catalogue renderers simply to avoid changing the canonical component.

## Database and Supabase changes

- Treat applied migrations as immutable history.
- Add a new timestamped migration for schema/security changes.
- Keep RLS, grants and server-only boundaries explicit.
- Do not expose `SUPABASE_SERVICE_ROLE_KEY` to browser source.
- Edge Function deployment intent belongs in `supabase/functions/deployment-manifest.v186.json`.
- If adding/removing an Edge Function, update the manifest and portability guard in the same PR.
- Re-run Supabase security and performance advisors after DDL changes.

## API and integration changes

Browser code must not contain privileged provider credentials. Prefer the existing same-origin BFF/API pattern under `api/` for operations that require server-only credentials or origin validation.

Do not pin a temporary `*.vercel.app` deployment hostname in source, docs or environment templates. Public origin must remain deployment-portable.

## Design and CSS changes

Read `docs/DESIGN_SYSTEM_3D_V206.md` before altering customer-facing styles.

Rules:

- `ThemeService` and admin-managed settings remain the runtime theme authority.
- `prestige-palette-defaults.css` provides safe initial-paint values.
- `v193-cinematic-3d.css` owns cinematic depth.
- `device-experience.css` is the final phone/tablet/desktop behavior layer.
- Do not add a new global stylesheet after `device-experience.css` without explicitly migrating ownership and updating the V206 guard.
- Preserve touch-device 3D flattening and reduced-motion behavior.
- Do not convert the customer experience into generic bright-blue SaaS styling.
- Preserve the graphite, premium red, warm gold and off-white brand hierarchy unless an approved brand change is being implemented through the admin-managed palette.

## Responsive changes

The current contract is intentional:

- phone portrait: customer bottom dock
- short coarse landscape phone: customer bottom dock remains
- tablet: no customer bottom dock
- desktop: no customer bottom dock
- mobile homepage: quick planner precedes trust proof

Any change to these rules must update `src/device-experience.css`, the dock component, V205 static guard and the Playwright device matrix together.

## Accessibility

Do not remove or dynamically mutate accessible names while a control is focused. Preserve keyboard navigation, visible focus, safe-area support and reduced-motion behavior.

At minimum run:

```bash
npm run a11y:buttons
npm run a11y:dates
```

## Security

Never commit:

- Supabase service-role keys
- provider secrets
- SMTP passwords
- payment merchant secrets
- webhook secrets
- private tokens

Use `.env.example` only as a variable-name template.

## Required local verification

Run:

```bash
npm run verify:handoff
```

This is the expected pre-handoff and pre-merge static build gate. Browser/device regressions are additionally enforced by GitHub Actions.

## Cleanup rule

Before deleting any historical or versioned file:

1. prove it is not an active route/import owner;
2. identify unique business behavior;
3. move still-required behavior into the canonical owner/service;
4. retarget CI away from obsolete implementation details;
5. delete the duplicate;
6. run the full verification suite.

Version number alone is never evidence that a file is obsolete.
