# V193 Home Brand, Hero Media Ownership and Cinematic 3D

## Goal

V193 gives the public site a consistent Alperler premium automotive identity while preserving the dynamic content ownership introduced in earlier releases.

The visual direction is black, metallic gold and restrained red, with real CSS perspective and Z-depth instead of flat card styling. The effect is intended to resemble a premium automotive showroom, not a decorative game interface.

## Ownership rules

1. Homepage hero content remains owned by `site_config.homeContent.heroImage` when an administrator publishes a hero image.
2. The homepage hero must never silently reuse the SEO/Open Graph image.
3. When no dynamic hero is configured, the public page may use the repository-owned `/brand/alperler-hero.svg` fallback.
4. Navbar brand presentation continues to respect a configured `logoUrl`. When no remote logo is configured, the repository-owned `/brand/alperler-logo.svg` is the portable fallback.
5. PWA and document chrome use the repository-owned `/brand/alperler-app-icon.svg` plus existing PNG fallbacks.
6. Core brand fallbacks are same-origin assets so a hosting move does not require a second media migration.

## Media performance

Administrator-uploaded homepage background images are prepared client-side before upload where browser support is available.

- Maximum target geometry: 1920 x 1280
- Preferred output: WebP
- Target payload: about 1.5 MB
- Long-lived public cache header for immutable object paths
- Existing admin media authorization and object ownership remain unchanged

This optimization is for background media. It does not rewrite vehicle, tour or other catalog ownership.

## Cinematic 3D architecture

`src/v193-cinematic-3d.css` is loaded after the existing global style layers. It enhances established components without duplicating their data logic.

The layer uses:

- CSS perspective and `transform-style: preserve-3d`
- Z-axis separation for hero copy, search and planning surfaces
- restrained X/Y rotation for desktop precision pointers
- metallic edge light and physically layered shadows
- glass surfaces with blur and saturation
- red CTA material and gold highlight tokens
- depth treatment for vehicle, campaign, tour, branch, blog, partner and promotional cards

The layer does not introduce WebGL or a continuous render loop. This keeps the public site usable on mid-range devices and avoids unnecessary battery/GPU cost.

## Responsive and accessibility policy

Desktop precision pointers receive the strongest 3D depth and hover response.

Touch/coarse-pointer devices keep material depth but remove hover-driven transforms that can create GPU churn or unstable touch interaction.

Both operating-system `prefers-reduced-motion` and the site's `body[data-motion="reduced"]` preference suppress decorative animation and transition duration.

No critical information, navigation or form affordance may depend on a 3D transform or animation.

## Brand palette

V193 default premium tokens:

- Background: `#06080D`
- List background: `#090C12`
- Surface: `#0D1118`
- Card: `#11161E`
- Elevated: `#171D26`
- Border: `#303846`
- Primary red: `#9E1B24`
- Red highlight: `#E15A62`
- Metallic gold: `#D4AF37`
- Primary text: `#F8F6F1`
- Muted text: `#B8B4AA`

Existing model property names such as `primaryBlue` remain unchanged for backward compatibility, even though V193 maps that semantic accent slot to the new Alperler red.

## Regression guard

`scripts/check-v193-home-brand-3d.mjs` verifies:

- all repository-owned core brand assets exist
- the hero is not coupled to the SEO OG image
- homepage background optimization remains active
- Angular loads the V193 cinematic layer
- perspective/Z-depth primitives are present
- desktop, touch and reduced-motion guards are present
- navbar fallback points to the repository logo
- manifest, favicon and theme color point to the V193 identity
- the default theme includes black, gold and red brand tokens

The dedicated GitHub Actions workflow also runs V192 homepage runtime and V187 public-content orchestration regression guards, dependency audit, TypeScript type checking and a production build.
