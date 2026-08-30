import { Routes, CanActivateFn, Router } from '@angular/router';
import { Injector, inject } from '@angular/core';
import type { AdminArea } from './services/admin-access.service';
import { HomeV71Component } from './pages/home-v71.component';
import { MainLayoutComponent } from './components/main-layout.component';

const adminGuard: CanActivateFn = async (_route, state) => {
  const injector = inject(Injector); const router = inject(Router);
  const { AuthService } = await import('./services/auth.service');
  const auth = injector.get(AuthService); await auth.waitUntilReady();
  if (auth.isLoggedIn()) return true;
  return router.createUrlTree(['/account/login'], { queryParams: { returnUrl: state.url || '/admin' } });
};
const adminAreaGuard = (area: AdminArea): CanActivateFn => async (_route, state) => {
  const injector = inject(Injector); const router = inject(Router);
  const [{ AuthService }, { AdminAccessService }] = await Promise.all([
    import('./services/auth.service'),
    import('./services/admin-access.service'),
  ]);
  const auth = injector.get(AuthService); const access = injector.get(AdminAccessService);
  await auth.waitUntilReady();
  if (!auth.isLoggedIn()) return router.createUrlTree(['/account/login'], { queryParams: { returnUrl: state.url || '/admin' } });
  if (await access.can(area)) return true;
  return router.parseUrl(`/admin/dashboard?denied=${encodeURIComponent(area)}`);
};
const customerGuard: CanActivateFn = async (_route, state) => {
  const injector = inject(Injector); const router = inject(Router);
  const { CustomerAuthService } = await import('./services/customer-auth.service');
  const auth = injector.get(CustomerAuthService);
  await auth.waitUntilReady();
  if (auth.isLoggedIn()) return true;
  return router.createUrlTree(['/account/login'], { queryParams: { returnUrl: state.url } });
};
const branchPortalSessionGuard: CanActivateFn = async (_route, state) => {
  const injector=inject(Injector);const router=inject(Router);
  const { BranchPortalAuthService }=await import('./services/branch-portal-auth.service');
  const auth=injector.get(BranchPortalAuthService);
  const token=await auth.getAccessToken();
  return token?true:router.createUrlTree(['/branch-portal/login'],{queryParams:{returnUrl:state.url||'/branch-portal'}});
};
const branchPortalOperatingGuard: CanActivateFn = async (_route,state) => {
  const injector=inject(Injector);const router=inject(Router);
  const [{ BranchPortalAuthService }, { BranchSubscriptionV171Service }]=await Promise.all([
    import('./services/branch-portal-auth.service'),
    import('./services/branch-subscription-v171.service'),
  ]);
  const auth=injector.get(BranchPortalAuthService);const subscription=injector.get(BranchSubscriptionV171Service);
  const token=await auth.getAccessToken();
  if(!token)return router.createUrlTree(['/branch-portal/login'],{queryParams:{returnUrl:state.url||'/branch-portal'}});
  try{return await subscription.canOpenPortal()?true:router.parseUrl('/branch-portal/subscription');}
  catch{return router.parseUrl('/branch-portal/subscription');}
};
const checkoutGuard: CanActivateFn = async () => {
  const injector = inject(Injector); const router = inject(Router);
  const { CarService } = await import('./services/car.service');
  const carService = injector.get(CarService);
  return carService.getBookingRequest() ? true : router.parseUrl('/');
};

const loadAdminOverviewHub = () => import('./pages/admin/admin-overview-hub.component').then(m => m.AdminOverviewHubComponent);
const loadAdminSiteSettingsHub = () => import('./pages/admin/admin-site-settings-hub.component').then(m => m.AdminSiteSettingsHubComponent);
const loadAdminContentHub = () => import('./pages/admin/admin-content-hub.component').then(m => m.AdminContentHubComponent);
const loadAdminOperationsHub = () => import('./pages/admin/admin-operations-hub.component').then(m => m.AdminOperationsHubComponent);
const loadAdminTeamHub = () => import('./pages/admin/admin-team-hub.component').then(m => m.AdminTeamHubComponent);

export const routes: Routes = [
  { path: 'admin/login', loadComponent: () => import('./pages/account-login.component').then(m => m.AccountLoginComponent) },
  { path: 'account/login', loadComponent: () => import('./pages/account-login.component').then(m => m.AccountLoginComponent) },
  { path: 'account/callback', loadComponent: () => import('./pages/account-callback.component').then(m => m.AccountCallbackComponent) },
  { path: 'account', canActivate: [customerGuard], loadComponent: () => import('./pages/account-shell.component').then(m => m.AccountShellComponent) },
  { path: 'account/wallet', canActivate: [customerGuard], loadComponent: () => import('./pages/account-wallet.component').then(m => m.AccountWalletComponent) },
  { path: 'branch-portal/login', loadComponent: () => import('./pages/branch-portal-login.component').then(m => m.BranchPortalLoginComponent) },
  { path: 'branch-portal/subscription', canActivate:[branchPortalSessionGuard], loadComponent: () => import('./pages/branch-subscription-v171.component').then(m => m.BranchSubscriptionV171Component) },
  { path: 'branch-portal/vehicles', canActivate:[branchPortalOperatingGuard], loadComponent: () => import('./pages/branch-portal.component').then(m => m.BranchPortalComponent) },
  { path: 'branch-portal/vehicle-media', canActivate:[branchPortalOperatingGuard], loadComponent: () => import('./pages/branch-portal-vehicle-media-v171.component').then(m => m.BranchPortalVehicleMediaV171Component) },
  { path: 'branch-portal/tours', canActivate:[branchPortalOperatingGuard], loadComponent: () => import('./pages/branch-portal-tours-v171.component').then(m => m.BranchPortalToursV171Component) },
  { path: 'branch-portal', canActivate:[branchPortalOperatingGuard], loadComponent: () => import('./pages/branch-portal-home-v171.component').then(m => m.BranchPortalHomeV171Component) },
  { path: 'search', loadComponent: () => import('./pages/search.component').then(m => m.SearchComponent) },
  { path: 'branch-marketplace', loadComponent: () => import('./pages/branch-marketplace-v171.component').then(m => m.BranchMarketplaceV171Component) },
  { path: 'campaigns', loadComponent: () => import('./pages/campaigns.component').then(m => m.CampaignsComponent) },
  { path: 'fleet', loadComponent: () => import('./pages/fleet.component').then(m => m.FleetComponent) },
  { path: 'fleet/:id', loadComponent: () => import('./pages/catalog-detail-shells.component').then(m => m.RentalDetailShellComponent) },
  { path: 'sales', loadComponent: () => import('./pages/sales-results.component').then(m => m.SalesResultsComponent) },
  { path: 'sales/:id', loadComponent: () => import('./pages/catalog-detail-shells.component').then(m => m.SaleDetailShellComponent) },
  { path: 'tours', loadComponent: () => import('./pages/tours.component').then(m => m.ToursComponent) },
  { path: 'tour/:id', loadComponent: () => import('./pages/catalog-detail-shells.component').then(m => m.TourDetailShellComponent) },
  { path: 'branches/:slug', loadComponent: () => import('./pages/branch-detail.component').then(m => m.BranchDetailComponent) },
  { path: 'branches', loadComponent: () => import('./pages/branches.component').then(m => m.BranchesComponent) },
  { path: 'branch-partner', loadComponent: () => import('./pages/branch-partner-v171.component').then(m => m.BranchPartnerV171Component) },
  { path: 'branch-plans', loadComponent: () => import('./pages/branch-plans-v171.component').then(m => m.BranchPlansV171Component) },
  { path: 'blog', loadComponent: () => import('./pages/blog-list.component').then(m => m.BlogListComponent) },
  { path: 'blog/:id', loadComponent: () => import('./pages/blog-detail.component').then(m => m.BlogDetailComponent) },
  { path: 'about', loadComponent: () => import('./pages/about.component').then(m => m.AboutComponent) },
  { path: 'booking-checkout', canActivate: [checkoutGuard], loadComponent: () => import('./pages/booking-checkout.component').then(m => m.BookingCheckoutComponent) },
  { path: 'contact', loadComponent: () => import('./pages/contact-entry.component').then(m => m.ContactEntryComponent) },
  { path: 'faq', loadComponent: () => import('./pages/faq.component').then(m => m.FaqComponent) },
  { path: 'legal', loadComponent: () => import('./pages/legal.component').then(m => m.LegalComponent) },
  { path: 'appointment', loadComponent: () => import('./pages/appointment.component').then(m => m.AppointmentComponent) },
  { path: 'list-your-car', loadComponent: () => import('./pages/list-your-car.component').then(m => m.ListYourCarComponent) },
  { path: 'track-car/:id', canActivate: [adminAreaGuard('telematics')], loadComponent: () => import('./pages/track-car.component').then(m => m.TrackCarComponent) },
  { path: 'track-car', redirectTo: 'admin/telematics', pathMatch: 'full' },
  { path: '', component: MainLayoutComponent, children: [{ path: '', component: HomeV71Component }] },

  { path: 'admin', loadComponent: () => import('./pages/admin/admin-layout.component').then(m => m.AdminLayoutComponent), canActivate: [adminGuard], children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: loadAdminOverviewHub, data: { overviewSection: 'summary' } },
      { path: 'analytics', loadComponent: loadAdminOverviewHub, data: { overviewSection: 'analytics' }, canActivate: [adminAreaGuard('analytics')] },
      { path: 'system-health', loadComponent: loadAdminOverviewHub, data: { overviewSection: 'health' }, canActivate: [adminAreaGuard('settings')] },
      { path: 'settings', loadComponent: loadAdminSiteSettingsHub, data: { settingsSection: 'general' }, canActivate: [adminAreaGuard('settings')] },
      { path: 'company', canActivate: [adminAreaGuard('settings')], loadComponent: () => import('./pages/admin/admin-company-profile.component').then(m => m.AdminCompanyProfileComponent) },
      { path: 'homepage', loadComponent: loadAdminSiteSettingsHub, data: { settingsSection: 'homepage' }, canActivate: [adminAreaGuard('content')] },
      { path: 'navigation', loadComponent: loadAdminSiteSettingsHub, data: { settingsSection: 'navigation' }, canActivate: [adminAreaGuard('settings')] },
      { path: 'footer', loadComponent: loadAdminSiteSettingsHub, data: { settingsSection: 'footer' }, canActivate: [adminAreaGuard('settings')] },
      { path: 'legal', loadComponent: loadAdminSiteSettingsHub, data: { settingsSection: 'legal' }, canActivate: [adminAreaGuard('settings')] },
      { path: 'seo', loadComponent: loadAdminSiteSettingsHub, data: { settingsSection: 'seo' }, canActivate: [adminAreaGuard('settings')] },
      { path: 'faq-management', loadComponent: loadAdminSiteSettingsHub, data: { settingsSection: 'faq' }, canActivate: [adminAreaGuard('content')] },
      { path: 'whatsapp', loadComponent: loadAdminSiteSettingsHub, data: { settingsSection: 'whatsapp' }, canActivate: [adminAreaGuard('settings')] },
      { path: 'content', redirectTo: 'cars', pathMatch: 'full' },
      { path: 'catalog-editor', redirectTo: 'cars', pathMatch: 'full' },
      { path: 'media', redirectTo: 'cars', pathMatch: 'full' },
      { path: 'cars', loadComponent: loadAdminContentHub, data: { contentSection: 'rental' }, canActivate: [adminAreaGuard('content')] },
      { path: 'sales', loadComponent: loadAdminContentHub, data: { contentSection: 'sale' }, canActivate: [adminAreaGuard('content')] },
      { path: 'tours', loadComponent: loadAdminContentHub, data: { contentSection: 'tour' }, canActivate: [adminAreaGuard('content')] },
      { path: 'campaigns', loadComponent: loadAdminContentHub, data: { contentSection: 'campaigns' }, canActivate: [adminAreaGuard('content')] },
      { path: 'blog', loadComponent: loadAdminContentHub, data: { contentSection: 'blog' }, canActivate: [adminAreaGuard('content')] },
      { path: 'benefits', loadComponent: loadAdminContentHub, data: { contentSection: 'benefits' }, canActivate: [adminAreaGuard('content')] },
      { path: 'branch-moderation', canActivate:[adminAreaGuard('content')], loadComponent:()=>import('./pages/admin/admin-branch-moderation-v171.component').then(m=>m.AdminBranchModerationV171Component) },
      { path: 'operations', loadComponent: loadAdminOperationsHub, data: { operationsSection: 'reservations' } },
      { path: 'reservations', loadComponent: loadAdminOperationsHub, data: { operationsSection: 'reservations' }, canActivate: [adminAreaGuard('operations')] },
      { path: 'customers', canActivate: [adminAreaGuard('operations')], loadComponent: () => import('./pages/admin/admin-customers.component').then(m => m.AdminCustomersComponent) },
      { path: 'customers/:userId', canActivate: [adminAreaGuard('operations')], loadComponent: () => import('./pages/admin/admin-customer-detail.component').then(m => m.AdminCustomerDetailComponent) },
      { path: 'partner-requests', loadComponent: loadAdminOperationsHub, data: { operationsSection: 'vehicles' }, canActivate: [adminAreaGuard('operations')] },
      { path: 'branch-partner-requests', loadComponent: loadAdminOperationsHub, data: { operationsSection: 'branches-requests' }, canActivate: [adminAreaGuard('operations')] },
      { path: 'feedback', loadComponent: loadAdminOperationsHub, data: { operationsSection: 'messages' }, canActivate: [adminAreaGuard('operations')] },
      { path: 'subscribers', loadComponent: loadAdminOperationsHub, data: { operationsSection: 'newsletter' }, canActivate: [adminAreaGuard('operations')] },
      { path: 'branches', loadComponent: loadAdminOperationsHub, data: { operationsSection: 'branches' }, canActivate: [adminAreaGuard('settings')] },
      { path: 'branch-network/:id', canActivate: [adminAreaGuard('settings')], loadComponent: () => import('./pages/admin/admin-branch-network.component').then(m => m.AdminBranchNetworkComponent) },
      { path: 'branch-identities', canActivate:[adminAreaGuard('settings')], loadComponent:()=>import('./pages/admin/admin-branch-identities-v171.component').then(m=>m.AdminBranchIdentitiesV171Component) },
      { path: 'telematics', canActivate: [adminAreaGuard('telematics')], loadComponent: () => import('./pages/admin/admin-telematics.component').then(m => m.AdminTelematicsComponent) },
      { path: 'finance', canActivate: [adminAreaGuard('finance')], loadComponent: () => import('./pages/admin/admin-finance.component').then(m => m.AdminFinanceComponent) },
      { path: 'branch-subscriptions', canActivate: [adminAreaGuard('finance')], loadComponent: () => import('./pages/admin/admin-branch-subscriptions-v171.component').then(m=>m.AdminBranchSubscriptionsV171Component) },
      { path: 'marketing', canActivate: [adminAreaGuard('marketing')], loadComponent: () => import('./pages/admin/admin-marketing.component').then(m => m.AdminMarketingComponent) },
      { path: 'team-center', loadComponent: loadAdminTeamHub, data: { teamSection: 'people' } },
      { path: 'team', loadComponent: loadAdminTeamHub, data: { teamSection: 'people' }, canActivate: [adminAreaGuard('team')] },
      { path: 'assignments', loadComponent: loadAdminTeamHub, data: { teamSection: 'assignments' }, canActivate: [adminAreaGuard('team')] },
      { path: 'audit', loadComponent: loadAdminTeamHub, data: { teamSection: 'audit' }, canActivate: [adminAreaGuard('team')] }
    ] },
  { path: '**', component: MainLayoutComponent, children: [{ path: '', loadComponent: () => import('./pages/not-found.component').then(m => m.NotFoundComponent) }] }
];