# V194 Homepage Runtime Jank Hardening

## Objective

V194 removes three root causes that can make the Alperler customer website or homepage administration feel stale, frozen, or unnecessarily heavy after the V193 premium 3D release.

This release does not replace working services, duplicate data sources, or hard-code customer content. Supabase/admin ownership, V187 public refresh orchestration, V192 progressive rendering, and V193 desktop 3D remain intact.

## Root causes addressed

### 1. Homepage top-area save was coupled to the full public catalog

The admin homepage editor already persists hero and planner settings through `CarService.updateConfig()` into `site_config`.

After that successful config write, it also forced `refreshCloudCatalog(true)`. That second operation loads vehicles, tours, blog, FAQs and catalog media even though none of those domains changed.

V194 removes this coupling from `saveTopArea()`.

The explicit admin `refresh()` operation still refreshes homepage metadata, campaigns and catalog candidates because that action actually needs those datasets.

### 2. Touch devices still carried unnecessary compositor work

V193 correctly disabled hover interactions on touch devices, but some `translateZ(0)`, preserve-3d contexts and backdrop blur remained. Those properties can create extra compositing surfaces even when there is no visible hover animation.

V194 keeps the premium material treatment while flattening the touch/mobile rendering path:

- no navbar/planner/search/trust-chip backdrop blur on coarse pointers or narrow screens
- no touch `translateZ(0)` promotion
- perspective disabled in the touch path
- transform-style flattened
- backface visibility restored
- image/card hover transitions removed from touch
- opaque premium backgrounds replace blur-dependent transparency where needed

Desktop precision-pointer devices retain the full cinematic perspective and Z-depth.

### 3. PWA cache generation was frozen to V191

`public/service-worker.js` still identified itself as `v191-responsive-runtime`, and the V191 CI guard required that exact string. A major presentation/runtime release therefore could not rotate the cache generation without breaking an older regression check.

V194 changes the service-worker generation to `v194-home-runtime-jank` and makes the V191 regression guard validate a generic versioned release identifier rather than one historical release name.

When the new worker activates, the existing service-worker cleanup logic removes old `alperler-pwa-*` cache generations that are no longer active.

Business data remains network-authoritative. API, catalog-media and cross-origin Supabase requests are not written to Cache Storage.

## Brand consistency

The admin `Alperler Auto` theme preview and the actual customer runtime brand theme now use the same premium identity:

- black `#06080D`
- graphite `#171D26`
- deep red `#720B12`
- gold remains the accent/material edge token

This preserves optional alternate admin themes, while the named Alperler brand theme itself no longer renders as the previous blue gradient.

## Regression invariants

`scripts/check-v194-home-runtime-jank.mjs` enforces:

1. `saveTopArea()` cannot call `refreshCloudCatalog`.
2. Explicit admin refresh must still refresh catalog candidates.
3. Service-worker cache generation is V194.
4. V191 cannot pin the worker to the historical V191 release.
5. Touch/mobile rendering must disable backdrop blur, perspective and compositor-forcing Z transforms.
6. Desktop 3D perspective and fine-pointer interactions must remain.
7. Admin brand preview and runtime brand theme must stay aligned.

The V194 workflow also reruns V193, V192, V191, V187 and PWA installability guards, dependency audit, TypeScript and production build.
