# V206 Premium Design and Cinematic 3D Contract

This document defines the visual ownership rules for the Alperler Rent A Car customer experience. It is intentionally conservative: the goal is a premium automotive showroom, not decorative complexity.

## 1. Effective brand language

The current production identity uses four dominant roles:

| Role | Default | Purpose |
| --- | --- | --- |
| graphite black | `#06080D` | primary page and hero depth |
| elevated graphite | `#171D26` | raised premium surfaces |
| premium red | `#9E1B24` | primary interaction/brand accent |
| red highlight | `#E15A62` | focus/active/highlight accent |
| warm gold | `#D4AF37` | premium value, brand edge and restrained highlight |
| off-white | `#F8F6F1` | primary text |
| muted warm gray | `#B8B4AA` | supporting text |

The exact repository fallback values are defined in `src/prestige-palette-defaults.css` and mirrored by `ThemeService` defaults.

The names `--alper-blue` and `--alper-blue-light` are historical compatibility tokens. In the current prestige palette they are assigned premium red values. Do not perform a broad search/replace rename in production code. New code should prefer the semantic aliases documented below once available.

## 2. Theme ownership

There is one runtime theme authority: `src/services/theme.service.ts`.

`ThemeService`:

- reads admin-managed site configuration;
- sanitizes configured colors;
- applies CSS custom properties to `document.documentElement`;
- controls content width, radius and font scale;
- exposes the configured motion preference;
- updates the browser theme color.

Repository CSS values are initial-paint and failure-safe defaults. They must not become a competing hardcoded theme that ignores admin configuration.

## 3. Global CSS layer order

The order in `angular.json` is part of the design contract:

1. `src/tailwind.css`
2. `src/base-shell.css`
3. `src/mobile-target-fixes.css`
4. `src/runtime-stability.css`
5. `src/premium-design-system.css`
6. `src/prestige-palette-defaults.css`
7. `src/premium-responsive.css`
8. `src/v193-cinematic-3d.css`
9. `src/device-experience.css`

Why this order exists:

- base/tailwind provide primitives;
- stability fixes prevent generic runtime breakage;
- premium design defines customer material behavior;
- prestige palette binds the current brand identity;
- responsive layer owns shared detail geometry;
- cinematic 3D adds depth without becoming data/theme authority;
- device experience is last so phone/tablet/desktop policy cannot be accidentally undone by older global rules.

Do not append a new global stylesheet after `device-experience.css` as a quick fix. If a new final layer is genuinely required, ownership must be migrated intentionally and the V206 guard updated.

## 4. Cinematic 3D philosophy

`src/v193-cinematic-3d.css` uses native CSS perspective and transforms instead of WebGL.

Desktop receives:

- perspective on hero and dynamic section stages;
- shallow `translateZ` separation;
- restrained X/Y rotation;
- layered material shadows;
- controlled image scale on hover;
- gold edge lighting and low-opacity red atmosphere.

The intention is physical depth, not a game scene.

The current implementation deliberately avoids a Three.js/WebGL dependency because the customer journey is conversion-first. A new 3D engine must not be introduced merely for visual novelty.

Any future WebGL proposal must prove:

1. measurable visual value beyond existing CSS depth;
2. no material regression on low/mid-tier mobile GPUs;
3. acceptable bundle impact within production budgets;
4. no conflict with reduced-motion settings;
5. keyboard/screen-reader neutrality;
6. graceful no-WebGL fallback;
7. no delay to planner or first interactive content.

## 5. Hero ownership

`HomeV71Component` owns the semantic hero and planner.

The cinematic layer may style that content but may not replace it with a second hero component.

Background precedence:

1. admin-configured hero background when present;
2. repository fallback `/brand/alperler-hero.svg` only when no configured background exists.

The fallback is a portability asset, not an instruction to override admin content.

## 6. Quick planner hierarchy

The planner is the primary conversion instrument on the homepage.

Phone experience order:

1. eyebrow/brand context;
2. heading;
3. concise supporting copy;
4. quick planner;
5. trust proof;
6. first dynamic section, currently capable of rendering active offers/campaign content depending on admin layout.

This order is owned by `src/device-experience.css` and protected by V205/V206 guards.

Do not insert decorative blocks before the planner on phones without conversion evidence.

## 7. Mobile performance contract

Touch/mobile devices intentionally flatten the heavy 3D treatment.

On coarse pointer or narrow screens, the cinematic layer:

- disables persistent backdrop blur on key hero surfaces;
- removes perspective;
- flattens transform-style;
- removes translateZ/rotation from hero and cards;
- reduces transitions;
- keeps material colors, borders and shadows so the premium identity survives.

This is not a reduced-quality theme. It is the premium mobile version optimized for stable scrolling and battery/GPU behavior.

## 8. Tablet contract

Tablets are not treated as oversized phones.

- customer bottom dock is not rendered on tablets;
- tablet navigation uses the upper navigation/hamburger behavior;
- touch-friendly hit targets remain;
- cinematic effects remain flattened where coarse-pointer policy applies;
- iPad Mini must not fall into phone-dock behavior merely because its CSS width is small.

## 9. Desktop contract

Desktop has the fullest showroom effect:

- desktop search is available in the hero;
- bottom customer dock is absent;
- 3D depth and hover response are allowed;
- content should remain restrained and readable at wide widths;
- `site-content-max` and responsive clamps prevent uncontrolled stretching.

## 10. Reduced motion

Both system preference and admin-configured reduced motion are respected.

`prefers-reduced-motion: reduce` and `body[data-motion="reduced"]` reduce transitions/animations to effectively static behavior.

Never add a new decorative animation that bypasses both controls.

## 11. Color usage rules

Premium red:

- primary conversion actions;
- active navigation/accent states;
- controlled micro labels;
- never broad page backgrounds.

Warm gold:

- premium value/savings;
- edge lighting;
- trust/premium accents;
- focus support only where contrast remains clear;
- never flood large content surfaces.

Graphite:

- primary background;
- cards and elevated surfaces;
- strong contrast hierarchy through subtle elevation rather than many unrelated colors.

Off-white/muted gray:

- readable text hierarchy;
- avoid pure-white overload on large surfaces.

## 12. Shadow and depth rules

A premium automotive UI should look physically layered, not bubbly.

Use:

- one major depth shadow;
- one restrained contact shadow;
- optional inset highlight;
- subtle gold/red atmospheric tint only on brand surfaces.

Avoid:

- repeated neon glows;
- bright colored borders around every card;
- large-radius generic SaaS cards everywhere;
- exaggerated hover rotation;
- independent shadow systems in every component.

## 13. Accessibility and contrast

Visual prestige never overrides usability.

- focus-visible states must remain visible;
- text must stay legible against admin-configured palettes;
- state cannot be communicated only by color;
- reduced motion must be preserved;
- safe-area insets must remain respected on installed/mobile experiences.

## 14. Design change checklist

Before merging a customer-facing visual change:

1. identify the current CSS owner;
2. avoid creating a duplicate global layer;
3. test Android phone portrait;
4. test iPhone WebKit portrait;
5. test a short landscape phone;
6. test iPad Mini/tablet;
7. test 1440px desktop;
8. verify no horizontal overflow;
9. verify planner hierarchy and dock policy;
10. verify reduced-motion behavior;
11. run `npm run verify:handoff`;
12. wait for GitHub device/browser workflows.

## 15. Design invariants protected by code

V206 verifies that:

- the prestige palette and `ThemeService` defaults stay aligned;
- the cinematic layer still contains perspective/depth and mobile flattening;
- reduced-motion handling exists;
- no `three` dependency is introduced accidentally;
- the stylesheet ownership order remains stable;
- `device-experience.css` remains the final device contract;
- phone planner ordering remains planner-before-trust.
