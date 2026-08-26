# V191 Mobile Runtime, Performance and PWA Recovery

## Incident

A real mobile browser capture showed the customer shell in a partially styled state: the accessibility skip link was visible, the navbar geometry collapsed, and the closed mobile navigation occupied the page surface and intercepted interaction. The bottom customer dock remained comparatively intact because it already owned most of its critical CSS inside the component.

## Root causes addressed

1. Critical customer-shell geometry depended too heavily on generated Tailwind utilities.
2. The closed mobile navigation remained in the DOM and relied on the generated `.hidden` utility to stop occupying the viewport.
3. CI verified Angular compilation but did not verify that the production CSS bundle actually contained required generated utilities.
4. A global analytics-consent card rendered on first customer visit although analytics already defaults to no tracking until explicit stored consent exists.
5. Noncritical health, newsletter, analytics and profile-autofill services started during application bootstrap and competed with first paint on slower mobile devices.
6. Tailwind explicit source detection scanned the entire repository rather than browser runtime sources only.
7. The installed PWA preferred fullscreen before standalone and still carried an older service-worker cache release.

## V191 architecture

### Fail-safe customer shell

The navbar, mobile navigation, skip link, customer main offset and WhatsApp fixed action now own their critical geometry in component CSS. Tailwind continues to provide the broader design system, but loss or delayed arrival of generated utilities can no longer leave a closed full-screen navigation layer intercepting taps.

The mobile navigation is created only while `isMenuOpen()` is true. Closed means absent from the DOM, not merely visually hidden.

Breakpoints are explicit:

- phone: 72px fixed navbar
- tablet: 84px fixed navbar
- desktop: 96px fixed navbar
- desktop navigation begins at 1280px

### First-interaction performance

SEO and public-content freshness remain startup work because they directly affect the visible page. Noncritical background services move to `requestIdleCallback` with a bounded fallback:

- system health watcher
- newsletter cloud synchronization
- consent-gated visitor analytics
- customer profile autofill

No analytics opt-in is inferred. If consent is unknown, `VisitorAnalyticsService` remains nontracking.

### Tailwind production contract

Tailwind v4 explicit source detection is limited to `src`, `index.html` and `index.tsx`. CI builds production assets first, opens the actual generated CSS file and verifies that generated utilities exist. A green TypeScript or Angular build alone is no longer sufficient.

### Installed PWA

The manifest prefers `standalone`, preserving app-like home-screen behavior without forcing fullscreen browser-edge behavior. Safe-area ownership is assigned to the fixed shell components so top inset is not applied twice. The service-worker release is rotated to `v191-responsive-runtime`, which causes obsolete Alperler-owned PWA caches to be removed on activation.

## User-facing consent behavior

The global first-load analytics consent component is removed. The existing legal/cookie surfaces remain responsible for user-facing policy information. Analytics itself stays consent-gated and therefore does not begin tracking unknown users merely because the prompt was removed.

## Verification gates

V191 requires:

- dependency high-severity audit
- frontend type check
- API TypeScript check
- production Angular build
- compiled production CSS semantic verification
- PWA installability regression guard
- premium design regression guard
- existing repository-wide mobile, PWA, security and quality workflows

The release must not merge until the exact PR head is green.
