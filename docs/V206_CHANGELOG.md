# V206 Handoff and Portability Changelog

V206 is a non-destructive production handoff release layered on top of the V205 responsive prestige production baseline.

## Added

- root `README.md` as the canonical developer starting point;
- `CONTRIBUTING.md` with branch, migration, design and verification rules;
- `docs/DEVELOPER_HANDOFF_V206.md` subsystem/ownership map;
- `docs/DESIGN_SYSTEM_3D_V206.md` premium palette, 3D and responsive design contract;
- `docs/DEPLOYMENT_PORTABILITY_V206.md` clean-room deployment/migration runbook;
- `docs/PLATFORM_HARDENING_V206.md` account-level production checklist;
- Node 22 `.nvmrc`;
- repository `.editorconfig`;
- V206 static handoff integrity guard;
- V206 CI handoff/portability gate;
- `npm run verify:handoff` full local static production certification command.

## Clarified

- the current premium red accent continues to use historical `--alper-blue` compatibility variables;
- semantic aliases are added without changing effective colors;
- `ThemeService` remains the runtime admin-managed palette authority;
- `device-experience.css` remains the final global device-policy layer;
- CSS 3D remains desktop-forward and flattened on touch/mobile;
- reduced-motion behavior remains mandatory;
- versioned filenames are not evidence that a runtime component is obsolete.

## Intentionally not changed

- no customer data was replaced with seed/demo content;
- no visual redesign was introduced;
- no WebGL/Three.js dependency was added;
- no deployed migration history was rewritten;
- no temporary production hostname was hardcoded;
- no provider secret was added to the repository.
