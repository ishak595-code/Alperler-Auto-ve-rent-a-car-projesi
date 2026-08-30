import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };

const app = read('src/app.component.ts');
const routes = read('src/app.routes.ts');
const navigation = read('src/services/navigation-config.service.ts');
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

expect(app.includes('BookingSuccessExperienceService'), 'Root must retain the lightweight booking-success signal owner.');
expect(
  app.includes('@defer (when bookingSuccessExperience.result(); prefetch on idle)'),
  'Booking success overlay must remain deferred until a success result exists, with idle prefetch.',
);
expect(
  (app.match(/<app-booking-success-overlay/g) || []).length === 1,
  'Booking success overlay must have exactly one root render site inside its deferred block.',
);

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
  "import('./services/auth.service')",
  "import('./services/customer-auth.service')",
  "import('./services/branch-portal-auth.service')",
  "import('./services/branch-subscription-v171.service')",
  "import('./services/admin-access.service')",
  "import('./services/car.service')",
]) {
  expect(routes.includes(marker), `Dynamic route guard dependency missing: ${marker}`);
}

expect(!navigation.includes("import { AuthService } from './auth.service'"), 'Public navigation service must not eagerly import admin AuthService.');
expect(!navigation.includes('private readonly auth = inject(AuthService)'), 'Public navigation service must not eagerly instantiate admin AuthService.');
expect(navigation.includes("await import('./auth.service')"), 'Admin navigation writes must dynamically load AuthService only when a token is required.');
expect(navigation.includes('this.injector.get(AuthService)'), 'Dynamic navigation auth must resolve through the existing Angular injector.');

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

console.log('V218 initial bundle ownership contract passed: root domains, route guards and admin-only navigation auth are lazy; success overlay is deferred; route-owned panels are isolated; and the 1MB hard ceiling is enforced.');
