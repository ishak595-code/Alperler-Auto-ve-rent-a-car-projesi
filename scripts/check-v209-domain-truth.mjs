import fs from 'node:fs';

const fail = (message) => {
  console.error(`V209_DOMAIN_TRUTH_FAIL: ${message}`);
  process.exitCode = 1;
};
const read = (path) => fs.readFileSync(path, 'utf8');

const car = read('src/services/car.service.ts');
const favorites = read('src/services/customer-favorites-v217.service.ts');
const feedback = read('src/components/feedback.component.ts');
const checkout = read('src/pages/booking-checkout.component.ts');
const appointment = read('src/pages/appointment.component.ts');
const adminReservations = read('src/pages/admin/admin-reservations.component.ts');
const valuation = read('src/pages/list-your-car-v172.component.ts');
const analytics = read('src/services/visitor-analytics.service.ts');

for (const forbidden of [
  '_reservations', '_partnerRequests', '_feedbacks', '_notifications', '_visitCount',
  'addReservation(', 'updateReservationStatus(', 'deleteReservation(',
  'submitPartnerRequest(', 'addPartnerRequest(', 'deletePartnerRequest(',
  'addFeedback(', 'updateFeedbackStatus(', 'deleteFeedback(',
  'sendNotification(', 'deleteNotification(', 'clearAllNotifications(',
  'incrementVisitCount(', 'resetStats(',
]) {
  if (car.includes(forbidden)) fail(`CarService still owns legacy business state/capability: ${forbidden}`);
}

if (!car.includes('CustomerFavoritesV217Service')) fail('vehicle favorite compatibility API must delegate to the canonical V217 owner');
for (const forbidden of ['_favoriteCars', 'db_favoriteCars', 'installDevicePreferencePersistence(', 'loadDevicePreferences(']) {
  if (car.includes(forbidden)) fail(`CarService still owns legacy favorite state: ${forbidden}`);
}
if (!favorites.includes("private readonly legacyVehicleKey = 'db_favoriteCars'")) fail('V217 canonical favorites must retain one-way legacy vehicle preference migration');
if (fs.existsSync('src/services/customer-favorites-sync.service.ts')) fail('legacy customer favorites sync owner still exists');

for (const fragment of ['reservations(?:_v2)?', 'partnerrequests(?:_v2)?', 'feedbacks(?:_v2)?', 'notifications', 'visits']) {
  if (!car.toLowerCase().includes(fragment)) fail(`legacy cache cleanup regex does not cover ${fragment}`);
}
for (const key of ['db_reservations_v2', 'db_partnerRequests_v2', 'db_feedbacks_v2', 'db_notifications', 'db_visits']) {
  const writer = new RegExp(`localStorage\\.setItem\\(\\s*["']${key}["']`, 'i');
  const reader = new RegExp(`(?:localStorage\\.getItem|readStorage)\\(\\s*["']${key}["']`, 'i');
  if (writer.test(car)) fail(`CarService still writes obsolete business cache ${key}`);
  if (reader.test(car)) fail(`CarService still reads obsolete business cache ${key}`);
}
if (!car.includes('sessionStorage.removeItem("session_active")')) fail('legacy visit-session marker is not purged');

if (!feedback.includes('fetch("/api/contact"')) fail('feedback must use canonical same-origin contact gateway');
if (feedback.includes('CarService') || feedback.includes('.addFeedback(')) fail('feedback still mirrors production data into CarService');

for (const [name, source] of [
  ['booking checkout', checkout],
  ['appointment', appointment],
  ['admin reservations', adminReservations],
]) {
  if (!source.includes('BookingService')) fail(`${name} must use BookingService as the booking owner`);
}
if (!checkout.includes('this.bookingService.create(')) fail('checkout must create bookings through BookingService');
if (checkout.includes('carService.addReservation')) fail('checkout still uses CarService booking shadow owner');

if (!valuation.includes('VehicleValuationV172Service')) fail('vehicle valuation must use its canonical V172 domain service');
if (valuation.includes('CarService')) fail('vehicle valuation still depends on CarService as a business owner');

if (!analytics.includes("supabaseFunctionUrl('analytics-ingest')")) fail('visitor analytics canonical ingest owner is missing');
if (!analytics.includes('CONSENT_KEY')) fail('analytics consent boundary is missing');
if (/db_visits|session_active/i.test(analytics)) fail('canonical analytics service references retired CarService visit counters');

if (!process.exitCode) console.log('V209 domain truth contract passed: CarService owns no persisted customer/business truth; vehicle favorites delegate to the canonical V217 account-aware owner.');
