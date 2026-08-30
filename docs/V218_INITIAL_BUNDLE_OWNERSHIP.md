# V218 Initial Bundle Ownership

V218 reduces the customer initial JavaScript graph by moving route-specific domains out of the application root and keeping route-guard service dependencies lazy.

## Ownership

- `/booking-checkout` owns both the booking checkout page and checkout loyalty panel through `BookingCheckoutShellV218Component`.
- `/admin/customers/:userId` owns both the customer detail page and customer lifetime panel through `AdminCustomerDetailShellV218Component`.
- `AppComponent` must not import or render either route-specific panel.
- Authentication, admin-access, branch-portal, subscription and booking-request guard services are resolved through dynamic imports rather than the initial route graph.

## Budget

Production builds keep a 950 kB initial warning ceiling and a 1000 kB hard error ceiling. The V218 workflow runs the ownership invariant, high-severity dependency audit, TypeScript validation and production build on both pull requests and main pushes when this boundary changes.

The goal is a real reduction in bytes loaded before the first customer route becomes interactive. Raising the budget is not an accepted fix for a regression.
