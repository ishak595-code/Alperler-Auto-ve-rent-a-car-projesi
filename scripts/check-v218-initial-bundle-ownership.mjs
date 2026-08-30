import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };

const app = read('src/app.component.ts');
const routes = read('src/app.routes.ts');
const checkoutShell = read('src/pages/booking-checkout-shell-v218.component.ts');
const adminCustomerShell = read('src/pages/admin/admin-customer-detail-shell-v218.component.ts');
const angular = JSON.parse(read('angular.json'));

for (const forbidden of [
  'CheckoutLoyaltyPanelComponent',
  'AdminCustomerLifetimePanelComponent',
  '<app-checkout-loyalty-panel',
  '<app-admin-customer-lifetime-panel',
  'showCheckoutLoyalty',
  'showAdminCustomer360',
]) {
  expect(!app.includes(forbidden), `Root shell must not own route-specific domain: ${forbidden}`);
}

const eagerGuardImports = [
  "import { AuthService } from './services/auth.service'",
  "import { CustomerAuthService } from './services/customer-auth.service'",
  "import { BranchPortalAuthService } from './services/branch-portal-auth.service'",
  "import { BranchSubscriptionV171Service } from './services/branch-subscription-v171.service'",
  "import { AdminAccessService, AdminArea } from './services/admin-access.service'",
  "import { CarService } from './services/car.service'",
];
for (const marker of eagerGuardImports) {
  expect(!routes.includes(marker), `Route guard dependency must remain lazy: ${marker}`);
}

for (const marker of [
  "await import('./services/auth.service')",
  "await import('./services/customer-auth.service')",
  "await import('./services/branch-portal-auth.service')",
  "await import('./services/branch-subscription-v171.service')",
  "await import('./services/admin-access.service')",
  "await import('./services/car.service')",
]) {
  expect(routes.includes(marker), `Lazy route guard dependency missing: ${marker}`);
}

expect(
  routes.includes("{ path: 'booking-checkout', canActivate: [checkoutGuard], loadComponent: () => import('./pages/booking-checkout-shell-v218.component').then(m => m.BookingCheckoutShellV218Component) }"),
  'Booking checkout must be owned by the lazy V218 route shell.',
);
expect(
  routes.includes("{ path: 'customers/:userId', canActivate: [adminAreaGuard('operations')], loadComponent: () => import('./pages/admin/admin-customer-detail-shell-v218.component').then(m => m.AdminCustomerDetailShellV218Component) }"),
  'Admin customer detail must be owned by the lazy V218 route shell.',
);

for (const marker of ['BookingCheckoutComponent', 'CheckoutLoyaltyPanelComponent', '<app-booking-checkout', '<app-checkout-loyalty-panel']) {
  expect(checkoutShell.includes(marker), `Checkout route shell is incomplete: ${marker}`);
}
for (const marker of ['AdminCustomerDetailComponent', 'AdminCustomerLifetimePanelComponent', '<app-admin-customer-detail', '<app-admin-customer-lifetime-panel']) {
  expect(adminCustomerShell.includes(marker), `Admin customer route shell is incomplete: ${marker}`);
}

const budgets = angular?.projects?.app?.architect?.build?.configurations?.production?.budgets || [];
const initial = budgets.find((budget) => budget.type === 'initial');
expect(initial?.maximumWarning === '950kb', 'Initial bundle warning ceiling must remain 950kb.');
expect(initial?.maximumError === '1000kb', 'Initial bundle hard ceiling must remain 1000kb.');

if (failures.length) {
  console.error('V218 initial bundle ownership contract failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('V218 initial bundle ownership contract passed: root domains and guards are lazy, route-owned panels are isolated, and the 1MB hard ceiling is enforced.');
