# Homepage admin copy vs CI

## Ownership

Public homepage marketing strings are **admin-managed** at runtime:

- `site_config.homeContent` (hero, hızlı planlama / quick planner, trust badges, planner labels)
- `homepage_sections.settings` (section titles, descriptions, block CTA copy via V174.2 studio)

TR dictionary defaults in `UiService` are fallbacks only; live TR text follows admin saves.

## What CI still guards

| Gate | Still enforces |
| --- | --- |
| `scripts/check-customer-facing-copy-v225.mjs` | Infrastructure leakage in **hard-coded** public templates (`service_role`, Supabase, RLS, backend/frontend, internal `V###` version tags). |
| Homepage ownership contracts (V214 / V216 / V198) | Structure, placement ownership, overflow-safe layout — **not** marketing phrase length. |
| `service_save_site_config_v175` | Payload size (~220 KB) and settings permission — **not** per-field marketing length. |

## What was relaxed (this change)

1. **Customer copy scanner** no longer flags common marketing/UX English that previously blocked freeform copy when it appeared as literal template text: `API`, `fallback`, `canonical`, `checkout`, and bare `sunucu`. Infrastructure / secret phrases remain forbidden.
2. **Admin UI `maxlength`** on freeform homepage / planner / block-copy fields was raised to marketing-friendly limits (descriptions up to ~1200–2000 chars; titles/labels ~160–400). Short structural fields (routes, suffixes) stay tighter.
3. CI must **not** pin exact default Turkish marketing sentences for hero/planner copy. Changing admin text in production does not require a code PR.

## Operator note

If a save fails with `SITE_CONFIG_PAYLOAD_TOO_LARGE`, shrink media URLs or split content — not marketing paragraph length alone. Prefer shorter CTAs for buttons; long paragraphs belong in description fields.
