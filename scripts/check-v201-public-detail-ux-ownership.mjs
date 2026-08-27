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
const detailData = read('src/services/public-detail-data.service.ts');

for (const contract of [
  'CarDetailComponent',
  'SaleCarDetailComponent',
  'TourDetailComponent',
  'CatalogCampaignContextComponent',
  'targetKind="SALE"',
  'targetKind="TOUR"',
]) must(shell, contract, `Canonical detail shell missing: ${contract}`);
for (const forbidden of ['RentalDetailV167Component','SaleDetailV1681Component','TourDetailV170Component']) {
  mustNot(shell, forbidden, `Parallel public renderer returned to shell: ${forbidden}`);
}

for (const contract of [
  'Tüm Özellikler ve Açıklama',
  'mobile-actions',
  'activeCampaign',
  'queryParamMap.get("campaign")',
  'car.transmission',
  'car.fuel',
  'car.seats',
  'car.type',
  'selectedPeriodAvailable()',
  'for(const video of car.videos||[])',
]) must(rental, contract, `Rental approved UX/data contract missing: ${contract}`);

for (const contract of [
  'İLAN BİLGİLERİ',
  'AÇIKLAMA',
  'KONUM',
  "activeTab.set('info')",
  "activeTab.set('desc')",
  "activeTab.set('loc')",
  'bottom-actions',
  'Tüm Teknik Özellikleri İncele',
  'Ekspertiz ve Tramer Durumu',
]) must(sale, contract, `Sale approved UX contract missing: ${contract}`);

for (const contract of [
  'readonly reservationOpen = signal(false)',
  '@if (reservationOpen())',
  'class="reservation-overlay"',
  '(click)="openReservation()"',
  'Bu Turu Rezerve Et',
  'Tur Hakkında',
  'Tur Programı',
  'Kapsam',
  'action-bar',
]) must(tour, contract, `Tour approved UX contract missing: ${contract}`);
mustNot(tour, 'TARİHLİ REZERVASYON', 'Tour booking controls must not render as the always-open page section.');
mustNot(tour, 'Ne zaman geleceksiniz?', 'Tour booking form must stay behind the explicit reservation action.');

for (const contract of [
  "queryParamMap.get('campaign')",
  "item.targetType === expectedTarget",
  "String(item.targetId || '') === this.routeId",
  'proofByCampaign',
  'activeViewers15m',
  'recentViewers24h',
  'uniqueViewersTotal',
  'KAMPANYADAN GELDİNİZ',
]) must(campaignContext, contract, `Campaign target context missing: ${contract}`);
for (const forbidden of ['openReservation(', 'whatsapp(', 'router.navigate']) {
  mustNot(campaignContext, forbidden, `Campaign context must never become a second CTA owner: ${forbidden}`);
}

for (const contract of [
  'campaign=${encodeURIComponent(campaign.id)}',
  'activateCampaign(campaign)',
]) must(campaigns, contract, `Campaign navigation context missing: ${contract}`);

for (const contract of [
  'fuel: row["fuel_type"] ?? undefined',
  'transmission: row["transmission"] || undefined',
  'type: row["body_type"] ?? undefined',
  'seats: row["seats"] ?? undefined',
  'availability_status',
  'loadForVehicle(ownerId)',
  'loadForTour(ownerId)',
]) must(detailData, contract, `Public detail DB mapping missing: ${contract}`);

console.log('V201 public detail UX ownership: PASS');
