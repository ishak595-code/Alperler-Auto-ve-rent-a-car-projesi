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
const campaignService = read('src/services/campaign.service.ts');
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
  'Konfor, kiralama koşulları ve araç bilgileri','Performans ve Tüketim','fixed-actions','activeCampaign','campaignProofLabel',
  'proofByCampaign','car.transmission','car.fuel','car.seats','car.doors','car.luggage','car.type','selectedPeriodAvailable()',
  'for (const video of car.videos || [])','DetailMediaLightboxComponent','dailyMileageLimit','hourlyMileageLimit','minimumRentalHours',
  'deposit','minLicenseYears','technicalRows','features()','commercialOffer.activateCampaign(verified)',
]) must(rental, contract, `Rental approved UX/data contract missing: ${contract}`);
for (const forbidden of ['mobile-actions','class="primary-action"','class="whatsapp-action"','Özellikler, koşullar ve açıklama','Rezervasyon Özeti','Kiralama Özeti','class="reservation-panel"']) {
  mustNot(rental, forbidden, `Legacy or duplicate rental UX must not return: ${forbidden}`);
}
must(rental, 'offer.discountScope!=="UNIT"', 'Order-level campaign package prices must not replace rental unit price.');

for (const contract of [
  'İLAN BİLGİLERİ','AÇIKLAMA','KONUM',"activeTab.set('info')","activeTab.set('desc')","activeTab.set('loc')",
  'bottom-actions','readonly listingRows = computed<ListingRow[]>','Performans ve Tüketim Bilgilerini Gör','Ekspertiz ve Hasar Geçmişi','DetailMediaLightboxComponent',
  'for (const video of item.videos || [])','technicalRows','damageExpertise','tramerStatusLabel','tramerAmount','mapHref(item)',
  'item.viewers','item.favCount','Konfor ve Donanımı Gör','(click)="callPhone()"','(click)="inquire(item)"','aria-label="Satış talebi gönder"','<span>Satış Talebi Gönder</span>','<span>WhatsApp</span>',
]) must(sale, contract, `Sale approved UX/live-schema contract missing: ${contract}`);
for (const forbidden of ['getTechnicalSpecs','class="core-facts"','[href]="phoneHref()"','Teknik Verileri Gör','Donanım ve Özellikleri Gör','<span>Bilgi Al</span>']) {
  mustNot(sale, forbidden, `Legacy sale UX/data contract must not return: ${forbidden}`);
}

for (const contract of [
  'readonly reservationOpen = signal(false)','@if (reservationOpen())','class="reservation-overlay"','(click)="openReservation()"',
  'aria-label="Bu turu rezerve et"','focusAfterRender','Bu Turu Rezerve Et','Tur Hakkında','Tur Programı','Neler Dahil?','action-bar','map-panel','Buluşma ve rota','Haritada aç',
  'TourBookingV170Service','TourDemandV170Service','onDateChange($event)','1_000_000_000',
  'DetailMediaLightboxComponent','for (const video of item.videos || [])','commercialOffer.activateCampaign(verified)',
  'new URL(record.mapUrl)','parsed.searchParams.get("q")','maps/search/?api=1&query=','Math.abs(latitude) <= 90','Math.abs(longitude) <= 180',
  'aria-label="Tur detayına dön"','aria-label="İletişim bilgileri adımına devam et"','aria-label="Rezervasyon onay adımına devam et"',
  'aria-label="Rezervasyon talebini gönder"','aria-label="Tur bilgilerini tekrar yükle"',
]) must(tour, contract, `Tour approved UX/flexible-demand/map/a11y contract missing: ${contract}`);
mustNot(tour, 'TARİHLİ REZERVASYON', 'Tour booking controls must not render as an always-open page section.');
mustNot(tour, 'Ne zaman geleceksiniz?', 'Tour booking form must stay behind the explicit reservation action.');
mustNot(tour, 'BookingService', 'Canonical tour must use the flexible-demand booking service.');
mustNot(tour, 'if (record.mapUrl && /^https:\/\\/\\//i.test(record.mapUrl)) return record.mapUrl;', 'Tour map button must not blindly return an embed URL.');

const mapIndex = tour.indexOf('class="panel map-panel"');
const actionIndex = tour.indexOf('class="action-bar"');
const overlayIndex = tour.indexOf('class="reservation-overlay"');
if (mapIndex < 0 || actionIndex < 0 || overlayIndex < 0 || mapIndex > actionIndex || mapIndex > overlayIndex) throw new Error('Tour map must remain in tour content before the fixed reservation action and reservation overlay.');

for (const contract of [
  "queryParamMap.get('campaign')",'resolvedTargetId','new Set([this.routeId, this.resolvedTargetId()]','aliases.has(String(item.targetId || \'\').trim())',
  'this.detailData.load(kind, this.routeId)','proofByCampaign','activeViewers15m','recentViewers24h','uniqueViewersTotal','AKTİF KAMPANYA','commercialOffer.activateCampaign(verified)',
]) must(campaignContext, contract, `Campaign target context missing: ${contract}`);
for (const forbidden of ['openReservation(', 'whatsapp(', 'router.navigate']) mustNot(campaignContext, forbidden, `Campaign context must never become a second CTA owner: ${forbidden}`);
mustNot(campaignContext, 'KAMPANYADAN GELDİNİZ', 'Legacy query-only campaign presentation must not return.');

for (const contract of ['campaign=${encodeURIComponent(campaign.id)}','activateCampaign(campaign)']) must(campaigns, contract, `Campaign navigation context missing: ${contract}`);
for (const contract of [
  'input.publicationStatus === "PUBLISHED" || input.publicationStatus === "SCHEDULED"',
  'input.publicationStatus === "ARCHIVED"','is_active: isActive',
  'public_campaign_catalog_v217','loadPublicForTarget(','currentRouteTarget()','PUBLIC_CAMPAIGN_TARGET_LIMIT = 12',
]) must(campaignService, contract, `Campaign publication and bounded target ownership contract missing: ${contract}`);
for (const contract of ['campaignId:this.optionalUuid(campaignIntent)','campaignIdForItem(itemId)']) must(bookingService, contract, `Rental booking flow must preserve verified campaign intent: ${contract}`);
for (const contract of ['campaignIdForItem(itemId)','/functions/v1/tour-booking-v170','loyaltyPointsForCheckout()']) must(tourBooking, contract, `Tour booking flow must preserve authoritative commercial intent: ${contract}`);

for (const contract of [
  'fuel: row["fuel_type"] ?? undefined','transmission: row["transmission"] || undefined','type: row["body_type"] ?? undefined',
  'seats: row["seats"] ?? undefined','doors: row["doors"] ?? metadata["doors"] ?? undefined','year: row["model_year"]','km: row["mileage_km"]','availability_status','loadForVehicle(ownerId)','loadForTour(ownerId)',
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

console.log('V201.1/V225 canonical detail UX, bounded target campaigns, single CTA, external map, accessibility, live schema and pricing ownership: PASS');
