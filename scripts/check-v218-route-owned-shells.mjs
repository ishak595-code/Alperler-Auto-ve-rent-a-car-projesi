import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const failures = [];

const app = read('src/app.component.ts');
const routes = read('src/app.routes.ts');
const checkoutShell = read('src/pages/booking-checkout-shell-v218.component.ts');
const adminShell = read('src/pages/admin/admin-customer-detail-shell-v218.component.ts');

for (const forbidden of [
  'CheckoutLoyaltyPanelComponent',
  'AdminCustomerLifetimePanelComponent',
  '<app-checkout-loyalty-panel',
  '<app-admin-customer-lifetime-panel',
  'showCheckoutLoyalty',
  'showAdminCustomer360',
]) {
  if (app.includes(forbidden)) failures.push(`ROOT_EAGER_ROUTE_DOMAIN ${forbidden}`);
}

const requiredRoutes = [
  "import('./pages/booking-checkout-shell-v218.component').then(m => m.BookingCheckoutShellV218Component)",
  "import('./pages/admin/admin-customer-detail-shell-v218.component').then(m => m.AdminCustomerDetailShellV218Component)",
];
for (const marker of requiredRoutes) {
  if (!routes.includes(marker)) failures.push(`ROUTE_SHELL_MISSING ${marker}`);
}

const forbiddenDirectRoutes = [
  "path: 'booking-checkout', canActivate: [checkoutGuard], loadComponent: () => import('./pages/booking-checkout.component')",
  "path: 'customers/:userId', canActivate: [adminAreaGuard('operations')], loadComponent: () => import('./pages/admin/admin-customer-detail.component')",
];
for (const marker of forbiddenDirectRoutes) {
  if (routes.includes(marker)) failures.push(`DIRECT_ROUTE_OWNERSHIP_REGRESSION ${marker}`);
}

for (const marker of ['BookingCheckoutComponent', 'CheckoutLoyaltyPanelComponent', '<app-booking-checkout', '<app-checkout-loyalty-panel']) {
  if (!checkoutShell.includes(marker)) failures.push(`CHECKOUT_SHELL_INCOMPLETE ${marker}`);
}
for (const marker of ['AdminCustomerDetailComponent', 'AdminCustomerLifetimePanelComponent', '<app-admin-customer-detail', '<app-admin-customer-lifetime-panel']) {
  if (!adminShell.includes(marker)) failures.push(`ADMIN_CUSTOMER_SHELL_INCOMPLETE ${marker}`);
}

if (failures.length) {
  console.error(`V218 route-owned shell contract: FAIL (${failures.length})`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('V218 route-owned shell contract: PASS');
