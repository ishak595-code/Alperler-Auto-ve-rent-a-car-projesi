import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };

const app = read('src/app.component.ts');
const routes = read('src/app.routes.ts');
const angular = JSON.parse(read('angular.json'));

expect(app.includes('@defer (when showCheckoutLoyalty())'), 'Checkout loyalty panel must be deferred from the root initial graph.');
expect(app.includes('@defer (when showAdminCustomer360())'), 'Admin customer 360 panel must be deferred from the root initial graph.');
expect(!app.includes('@if (showCheckoutLoyalty()) { <app-checkout-loyalty-panel'), 'Checkout loyalty panel must not regress to eager root ownership.');
expect(!app.includes('@if (showAdminCustomer360()) { <app-admin-customer-lifetime-panel'), 'Admin customer 360 panel must not regress to eager root ownership.');

expect(
  routes.includes("{ path: 'booking-checkout', canActivate: [checkoutGuard], loadComponent: () => import('./pages/booking-checkout.component').then(m => m.BookingCheckoutComponent) }"),
  'Booking checkout must remain a lazy route.',
);
expect(
  routes.includes("{ path: 'customers/:userId', canActivate: [adminAreaGuard('operations')], loadComponent: () => import('./pages/admin/admin-customer-detail.component').then(m => m.AdminCustomerDetailComponent) }"),
  'Admin customer detail must remain a lazy route.',
);

const budgets = angular?.projects?.app?.architect?.build?.configurations?.production?.budgets || [];
const initial = budgets.find((budget) => budget.type === 'initial');
expect(initial?.maximumWarning === '950kb', 'Initial bundle warning ceiling must remain 950kb.');
expect(initial?.maximumError === '1000kb', 'Initial bundle hard ceiling must remain 1000kb.');

if (failures.length) {
  console.error('V218 initial bundle ownership contract failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('V218 initial bundle ownership contract passed: route-specific panels are deferred and the 1MB hard ceiling is enforced.');
