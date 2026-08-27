import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const must = (source, needle, message) => { if (!source.includes(needle)) throw new Error(message || `Missing V201 contract: ${needle}`); };
const mustNot = (source, needle, message) => { if (source.includes(needle)) throw new Error(message || `Forbidden V201 contract: ${needle}`); };

const shell = read('src/pages/catalog-detail-shells.component.ts');
const rental = read('src/pages/car-detail.component.ts');
const sale = read('src/pages/sale-car-detail.component.ts');
const tour = read('src/pages/tour-detail.component.ts');
const campaignContext = read('src/components/catalog-campaign-context.component.ts');
const campaigns = read('src/pages/campaigns.component.ts');
const bookingService = read('src/services/booking.service.ts');
const tourBooking = read('src/services/tour-booking-v170.service.ts');
const detailData = read('src/services/public-detail-data.service.ts');
const adminWorkspace = read('src/pages/admin/admin-catalog-workspace.component.ts');
const pricingGuard = read('supabase/migrations/20260827221629_v201_campaign_normal_price_reference_guard.sql');

for (const contract of ['CarDetailComponent','SaleCarDetailComponent','TourDetailComponent','CatalogCampaignContextComponent','targetKind="SALE"','targetKind="TOUR"']) {
  must(shell, contract, `Canonical detail shell missing: ${contract}`);
}
for (const forbidden of ['RentalDetailV167Component','SaleDetailV1681Component','TourDetailV170Component']) {
  mustNot(shell, forbidden, `Parallel public renderer returned to shell: ${forbidden}`);
}

for (const contract of [
  'Tüm Özellikler ve Açıklama','fixed-actions','activeCampaign','queryParamMap.get("campaign")','campaignProofLabel',
  'proofByCampaign','car.transmission','car.fuel','car.seats','car.type','selectedPeriodAvailable()',
  'for (const video of car.videos || [])','DetailMediaLightboxComponent','dailyMileageLimit','hourlyMileageLimit','minimumRentalHours',
  'deposit','minLicenseYears','technicalRows','features()','commercialOffer.activateCampaign(verified)',
]) must(rental, contract, `Rental approved UX/data contract missing: ${contract}`);
mustNot(rental, 'mobile-actions', 'Legacy second rental CTA owner must not return.');
mustNot(rental, 'class="primary-action"', 'Inline rental reservation button must not duplicate the fixed action bar.');
mustNot(rental, 'class="whatsapp-action"', 'Inline rental WhatsApp button must not duplicate the fixed action bar.');
must(rental, 'offer.discountScope!=="UNIT"', 'Order-level campaign package prices must not replace rental unit price.');

for (const contract of [
  'İLAN BİLGİLERİ','AÇIKLAMA','KONUM',"activeTab.set('info')","activeTab.set('desc')","activeTab.set('loc')",
  'bottom-actions','Tüm Teknik Özellikleri İncele','Ekspertiz ve Tramer Durumu','DetailMediaLightboxComponent',
  'for (const video of item.videos || [])','technicalRows','damageExpertise','tramerStatusLabel','tramerAmount','mapHref(item)',
  'item.viewers','item.favCount','Tüm Donanım ve Özellikleri Göster',
]) must(sale, contract, `Sale approved UX/live-schema contract missing: ${contract}`);
mustNot(sale, 'getTechnicalSpecs', 'Sale detail must use the live canonical record, not static technical lookup data.');

for (const contract of [
  'readonly reservationOpen = signal(false)','@if (reservationOpen())','class="reservation-overlay"','(click)="openReservation()"',
  'aria-label="Bu turu rezerve et"','focusAfterRender','Bu Turu Rezerve Et','Tur Hakkında','Tur Programı','Kapsam','action-bar','map-panel','Buluşma ve rota','Haritada aç',
  'TourBookingV170Service','TourDemandV170Service','onDateChange($event)','1_000_000_000','sert limit değildir',
  'DetailMediaLightboxComponent','for (const video of item.videos || [])','commercialOffer.activateCampaign(verified)',
]) must(tour, contract, `Tour approved UX/flexible-demand contract missing: ${contract}`);
mustNot(tour, 'TARİHLİ REZERVASYON', 'Tour booking controls must not render as an always-open page section.');
mustNot(tour, 'Ne zaman geleceksiniz?', 'Tour booking form must stay behind the explicit reservation action.');
mustNot(tour, 'BookingService', 'Canonical tour must use the flexible-demand booking service.');

const mapIndex = tour.indexOf('class="panel map-panel"');
const actionIndex = tour.indexOf('class="action-bar"');
if (mapIndex < 0 || actionIndex < 0 || mapIndex > actionIndex) throw new Error('Tour map must remain in tour content before the fixed reservation action bar.');

for (const contract of [
  "queryParamMap.get('campaign')","item.targetType === expectedTarget","String(item.targetId || '') === this.routeId",
  'proofByCampaign','activeViewers15m','recentViewers24h','uniqueViewersTotal','KAMPANYADAN GELDİNİZ','commercialOffer.activateCampaign(verified)',
]) must(campaignContext, contract, `Campaign target context missing: ${contract}`);
for (const forbidden of ['openReservation(', 'whatsapp(', 'router.navigate']) mustNot(campaignContext, forbidden, `Campaign context must never become a second CTA owner: ${forbidden}`);

for (const contract of ['campaign=${encodeURIComponent(campaign.id)}','activateCampaign(campaign)']) must(campaigns, contract, `Campaign navigation context missing: ${contract}`);
for (const contract of ['campaignId:this.optionalUuid(campaignIntent)','campaignIdForItem(itemId)']) must(bookingService, contract, `Rental booking flow must preserve verified campaign intent: ${contract}`);
for (const contract of ['campaignIdForItem(itemId)','/functions/v1/tour-booking-v170','loyaltyPointsForCheckout()']) must(tourBooking, contract, `Tour booking flow must preserve authoritative commercial intent: ${contract}`);

for (const contract of [
  'fuel: row["fuel_type"] ?? undefined','transmission: row["transmission"] || undefined','type: row["body_type"] ?? undefined',
  'seats: row["seats"] ?? undefined','availability_status','loadForVehicle(ownerId)','loadForTour(ownerId)',
  'locationName: row["location_name"] || undefined','latitude: this.numberOrUndefined(row["latitude"])',
  'longitude: this.numberOrUndefined(row["longitude"])','mapUrl: row["map_url"] || undefined',
]) must(detailData, contract, `Public detail DB mapping missing: ${contract}`);

for (const contract of [
  'Fotoğraf & Video','hourlyMileageLimit','minimumRentalHours','dailyMileageLimit','damageExpertise','tramerStatus','tramerAmount',
  'tour.itinerary','tour.includedItems','tour.excludedItems','tour.capacity','tour.meetingPoint','tour.locationName','tour.latitude','tour.longitude','tour.mapUrl',
]) must(adminWorkspace, contract, `Admin-to-public schema field missing from canonical workspace: ${contract}`);

for (const contract of [
  'private.v201_campaign_normal_subtotal',"if abs(v_normal - v_marketed_new) <= 0.02 then",'return v_marketed_old',
  'v_effective_normal_subtotal := private.v201_campaign_normal_subtotal','private.v166_offer_breakdown',"'normalReferenceGuard','V201'",
  'revoke all on function public.reserve_booking_commercial_offer',
]) must(pricingGuard, contract, `Campaign normal-price reference guard missing: ${contract}`);

console.log('V201 canonical public detail UX, live schema, single CTA, map and pricing ownership: PASS');
