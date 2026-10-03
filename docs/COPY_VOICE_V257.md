# Customer copy voice (V257)

The rules behind the V257 copy refresh. Follow them when adding or editing customer-facing text, in the admin panel or in code.

## Where copy lives

| Surface | Source of truth |
| --- | --- |
| Home hero, trust chips, planner heading (Turkish) | `site_config.site_settings.homeContent` (admin). Code fallback: `homePage` in `src/services/ui.service.ts` |
| Home section titles, badges, descriptions (Turkish) | `homepage_sections.title` and `settings.badge` / `settings.description` (admin). Code fallback: `homeSection.sections` |
| About title and story | `site_settings.aboutTitle` / `aboutText` (admin) |
| Footer summary and newsletter | `footer_settings` (admin) |
| Listing, FAQ, contact, appointment, campaign, blog page headers | `src/services/ui.service.ts` (Turkish) and `src/i18n/*.ts` (other languages) |
| Search and social snippets | `site_settings.seo*` (admin) and the meta tags in `index.html` |

Database values that existed before this refresh are kept in `docs/copy-backup-v257-db.json`; the new admin-managed copy is in `docs/copy-refresh-v257-db.sql` (data only, run once in the Supabase SQL editor).

## Voice

1. **Outcome first.** Say what the customer gets, not what the system does. "Fiyatı baştan görün", not "fiyat bilgilerini karşılaştırın".
2. **Local and concrete.** Yüksekova, Hakkâri, Cilo, yayla yolu, düğün günü, gelin arabası. Named places and occasions beat "bölgesel hizmetler".
3. **Lower the risk.** The customer's fears are a hidden price, a car that differs from the listing, and nobody answering. Answer them directly: price shown upfront, listing details stated openly, a local team one message away.
4. **Polite "siz", one register.** No "sen" forms, no slang.
5. **Short sentences.** One idea each. No em dashes.
6. **The decision stays with the customer.** Invite, do not push: "Karar sizin, hazırlık bizden."

## Claims we do not make

Persuasive copy must stay true. Do not publish any of these unless the business can prove it on request:

- Customer counts, years of experience, "en iyi", "en ucuz", "1 numara".
- "7/24", fixed response or delivery times, "5 dakikada".
- "Garanti", "ekspertiz garantili", "sıfır risk", "sorunsuz".
- "Gerçek fotoğraf" while any listing still uses a representative image.
- Urgency that is not real (a countdown without an actual end date).

Unproven claims are a legal exposure under Turkish consumer and commercial-advertising rules, and they cost more trust than they win in a town where customers know each other.

## Legacy keys

`hero.*`, `home.featured|sales|whyUs|partner|tours|vipAndMinibus` and `sales.header*` in the Turkish dictionary are not rendered by any current page. They still contain old claims such as "1001+ mutlu müşteri" and "7/24". Do not reconnect them to a page without rewriting them first.
