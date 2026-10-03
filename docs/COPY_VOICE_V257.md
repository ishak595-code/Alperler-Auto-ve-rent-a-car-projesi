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

## Length limits

The home hero sits above the quick planner. On a landscape phone (844 x 390) the planner must start within the first 72% of the screen (`tests/v205/responsive-prestige.spec.ts`), so:

- hero title: one line, about 40 characters (about 25 in Russian);
- hero subtitle: about 130 characters, at most 150.

Check every language, not only Turkish: French, Spanish and Russian wrap first.

## Claims

Confirmed by the owner on 2026-10-03 and used in the copy:

- **7/24**: the team is reachable around the clock.
- **Ekspertizli**: cars for sale are sold with an inspection report.

Still not published unless the business can prove it on request:

- A customer count or years of experience as a number, "en iyi", "en ucuz", "1 numara".
- Fixed response or delivery times such as "5 dakikada".
- "Garanti" in any form, "sıfır risk", "sorunsuz". An inspection report is not a warranty.
- "Gerçek fotoğraf" while any listing still uses a representative image.
- Urgency that is not real (a countdown without an actual end date).

A number or a guarantee that cannot be shown on request is a legal exposure under Turkish consumer and commercial-advertising rules.

## Legacy keys

`hero.*`, `home.featured|sales|whyUs|partner|tours|vipAndMinibus` and `sales.header*` are not rendered by any current page. V258 rewrote them in the same voice, so reconnecting one no longer brings back "1001+ mutlu müşteri", "5 dakikada" or "garantili".
