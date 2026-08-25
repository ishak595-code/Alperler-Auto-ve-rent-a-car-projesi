# Alperler Auto Production Architecture V170

## Scope
V170 finalizes the public tour showcase/detail data path, dated tour booking semantics, tour media management, and the Super Admin Tour Studio. It also hardens the selected-cover behavior of sale vehicle cards.

## Non-negotiable tour booking rules
1. Every tour booking has a required customer-selected calendar date. The date is stored in `bookings.start_at` and remains visible to operations/admin workflows.
2. Tour demand is **flexible**. Multiple customers may create bookings for the same tour and same date. Cumulative demand must never close the date automatically.
3. `tours.capacity` means **recommended operational group size**. It is useful for guide/vehicle/staff planning but is not an inventory hard limit.
4. `PENDING` and `APPROVED` tour bookings are both demand metrics only. Neither blocks a new tour request.
5. Rental inventory semantics are unchanged: approved rental overlaps remain protected.
6. The customer may enter a large group size. Validation exists for integer/data-safety reasons, not because of `tours.capacity`.
7. The server, not the browser, calculates canonical tour unit price and the commercial offer (campaign/referral/loyalty) result.

## Tour public data source
Public V170 tour pages use `TourPublicDataV170Service`.

Canonical sources:
- `public.tours` for title, category, short/long description, price, duration, recommended group size, meeting point, location, route/program, included/excluded items, coordinates, map URL, branch, publication and quality metadata.
- `public.catalog_media` + Storage for image/video media.

No sample tour, hard-coded price range, hard-coded route, hard-coded location, or secondary technical fallback is allowed in the V170 route.

## Dynamic tour card
The public card may render only values derived from the canonical tour/media records:
- selected cover image
- badge
- featured state
- title
- short description
- duration
- location/meeting point
- category
- recommended group size
- person price
- photo/video counts

Filters derive from the live published catalog (price bounds, duration, category and location).

## Dynamic tour detail
The detail page uses the same canonical tour record and media collection as the card.

It renders:
- image and video gallery
- badge/title/price
- duration
- recommended group size
- meeting point/location
- program/route
- highlights
- included/excluded items
- map link
- required reservation date
- customer-entered person count
- informational demand metrics

Demand metrics never disable booking because of cumulative demand.

## Demand metrics and security boundary
`public.tour_demand_v170(text,date)` is a `SECURITY DEFINER` function but is service-only:
- `PUBLIC`: revoked
- `anon`: revoked
- `authenticated`: revoked
- `service_role`: execute granted

The browser does not call this RPC directly. The flow is:

`Angular -> same-origin /api/bookings?mode=tour-availability -> Supabase Edge Function tour-availability-v169 -> service-role RPC tour_demand_v170`

The existing Edge Function slug is retained for compatibility; its V170 implementation returns flexible-demand metrics.

## Tour booking write path
V170 tour booking creation uses `tour-booking-v170`.

Responsibilities:
- strict Origin allowlist
- payload size validation
- honeypot
- request/contact rate limiting
- optional authenticated customer linking
- required tour date
- large integer person-count validation
- published/active tour revalidation
- canonical server-side unit price
- `PENDING` booking creation
- campaign/referral/loyalty reservation through `reserve_booking_commercial_offer`
- idempotency
- notification dispatch

The client never supplies a trusted final price.

## Admin approval
V170 replaces the V169 tour capacity hard-stop in `admin_approve_booking`.

For TOUR:
- tour/date/person count must be valid
- tour must remain active and published
- cumulative people are not compared with `tours.capacity`
- approval writes audit metadata with `tourCapacityPolicy = FLEXIBLE_DEMAND`

For RENTAL, approved overlap protection remains unchanged.

## Super Admin Tour Studio
`AdminTourStudioV170Component` is the high-fidelity tour content editor.

It manages the same canonical data shown publicly:
- card title
- badge
- category
- person price
- duration
- recommended group size
- location
- meeting point
- short description
- featured state
- long description
- highlights
- program/route
- included/excluded items
- branch
- SEO slug
- coordinates/map URL
- source/provenance
- data quality
- publication state
- scheduled publication time
- image/video media
- image cover selection
- media order
- media active state
- alt text/video title
- video poster URL

There is no separate duplicate tour-content datastore.

## Tour media
`catalog_media` is the canonical media relation.

Rules:
- uploads go to the `catalog-media` Storage bucket
- both images and videos are supported
- exactly one active image is the cover for a live record
- changing cover updates the canonical cover relation
- card and detail read the same media records
- deleting/deactivating the last live image remains blocked by media integrity logic

## Sale card V170 hardening
The sale card now prefers `car.image` (the canonical selected cover) before `car.images[0]`. Therefore Super Admin `Kapak Yap` is honored on the public sale card even when gallery sort order differs.

Sale-card customer data remains canonical/admin-managed: listing number, sale state, badge, year, mileage, fuel, transmission, body type, color, warranty, damage summary, structured tramer truth, branch, location and price.

## Regression boundaries
V170 must not change:
- V163.3 rental inventory rule: only APPROVED rental bookings block inventory
- V164 branch ownership/network rules
- V166 commercial offer server authority
- V167 rental campaign integrity
- V168/V168.1 sale publication/tramer/expertise integrity

## Production rollout order
1. Merge only after all V163-V170 regression gates are green.
2. Apply the V170 migration from merged `main` only.
3. Deploy `tour-availability-v169` updated implementation.
4. Deploy `tour-booking-v170`.
5. Verify RPC execute privileges.
6. Test a dated PENDING tour booking.
7. Test multiple bookings on the same tour/date without a capacity rejection.
8. Test admin approval beyond recommended group size.
9. Verify the booking date remains intact in admin data.
10. Run Supabase security/performance advisors and Vercel production status.
