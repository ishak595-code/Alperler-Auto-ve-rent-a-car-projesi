import { Routes, CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './services/auth.service';
import { CustomerAuthService } from './services/customer-auth.service';
import { BranchPortalAuthService } from './services/branch-portal-auth.service';
import { BranchSubscriptionV171Service } from './services/branch-subscription-v171.service';
import { AdminAccessService, AdminArea } from './services/admin-access.service';
import { CarService } from './services/car.service';
import { HomeV71Component } from './pages/home-v71.component';
import { FleetComponent } from './pages/fleet.component';
import { AboutComponent } from './pages/about.component';
import { BlogDetailComponent } from './pages/blog-detail.component';
import { BlogListComponent } from './pages/blog-list.component';
import { FaqComponent } from './pages/faq.component';
import { LegalComponent } from './pages/legal.component';
import { MainLayoutComponent } from './components/main-layout.component';
import { RentalDetailShellComponent, SaleDetailShellComponent, TourDetailShellComponent } from './pages/catalog-detail-shells.component';

import { AdminLayoutComponent } from './pages/admin/admin-layout.component';
import { AdminOverviewHubComponent } from './pages/admin/admin-overview-hub.component';
import { AdminSiteSettingsHubComponent } from './pages/admin/admin-site-settings-hub.component';
import { AdminContentHubComponent } from './pages/admin/admin-content-hub.component';
import { AdminOperationsHubComponent } from './pages/admin/admin-operations-hub.component';
import { AdminTeamHubComponent } from './pages/admin/admin-team-hub.component';

const adminGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService); const router = inject(Router); await auth.waitUntilReady();
  if (auth.isLoggedIn()) return true;
  return router.createUrlTree(['/account/login'], { queryParams: { returnUrl: state.url || '/admin' } });
};
const adminAreaGuard = (area: AdminArea): CanActivateFn => async (_route, state) => {
  const auth = inject(AuthService); const access = inject(AdminAccessService); const router = inject(Router);
  await auth.waitUntilReady();
  if (!auth.isLoggedIn()) return router.createUrlTree(['/account/login'], { queryParams: { returnUrl: state.url || '/admin' } });
  if (await access.can(area)) return true;
  return router.parseUrl(`/admin/dashboard?denied=${encodeURIComponent(area)}`);
};
const customerGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(CustomerAuthService); const router = inject(Router);
  await auth.waitUntilReady();
  if (auth.isLoggedIn()) return true;
  return router.createUrlTree(['/account/login'], { queryParams: { returnUrl: state.url } });
};
const branchPortalSessionGuard: CanActivateFn = async (_route, state) => {
  const auth=inject(BranchPortalAuthService);const router=inject(Router);
  const token=await auth.getAccessToken();
  return token?true:router.createUrlTree(['/branch-portal/login'],{queryParams:{returnUrl:state.url||'/branch-portal'}});
};
const branchPortalOperatingGuard: CanActivateFn = async (_route,state) => {
  const auth=inject(BranchPortalAuthService);const subscription=inject(BranchSubscriptionV171Service);const router=inject(Router);
  const token=await auth.getAccessToken();
  if(!token)return router.createUrlTree(['/branch-portal/login'],{queryParams:{returnUrl:state.url||'/branch-portal'}});
  try{return await subscription.canOpenPortal()?true:router.parseUrl('/branch-portal/subscription');}
  catch{return router.parseUrl('/branch-portal/subscription');}
};
const checkoutGuard: CanActivateFn = () => {
  const carService = inject(CarService); const router = inject(Router);
  return carService.getBookingRequest() ? true : router.parseUrl('/');
};

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
  { path: 'fleet', component: FleetComponent },
  { path: 'fleet/:id', component: RentalDetailShellComponent },
  { path: 'sales', loadComponent: () => import('./pages/sales-results.component').then(m => m.SalesResultsComponent) },
  { path: 'sales/:id', component: SaleDetailShellComponent },
  { path: 'tours', loadComponent: () => import('./pages/tours.component').then(m => m.ToursComponent) },
  { path: 'tour/:id', component: TourDetailShellComponent },
  { path: 'branches/:slug', loadComponent: () => import('./pages/branch-detail.component').then(m => m.BranchDetailComponent) },
  { path: 'branches', loadComponent: () => import('./pages/branches.component').then(m => m.BranchesComponent) },
  { path: 'branch-partner', loadComponent: () => import('./pages/branch-partner-v171.component').then(m => m.BranchPartnerV171Component) },
  { path: 'branch-plans', loadComponent: () => import('./pages/branch-plans-v171.component').then(m => m.BranchPlansV171Component) },
  { path: 'blog', component: BlogListComponent },
  { path: 'blog/:id', component: BlogDetailComponent },
  { path: 'about', component: AboutComponent },
  { path: 'booking-checkout', canActivate: [checkoutGuard], loadComponent: () => import('./pages/booking-checkout.component').then(m => m.BookingCheckoutComponent) },
  { path: 'contact', loadComponent: () => import('./pages/contact-entry.component').then(m => m.ContactEntryComponent) },
  { path: 'faq', component: FaqComponent },
  { path: 'legal', component: LegalComponent },
  { path: 'appointment', loadComponent: () => import('./pages/appointment.component').then(m => m.AppointmentComponent) },
  { path: 'list-your-car', loadComponent: () => import('./pages/list-your-car.component').then(m => m.ListYourCarComponent) },
  { path: 'track-car/:id', canActivate: [adminAreaGuard('telematics')], loadComponent: () => import('./pages/track-car.component').then(m => m.TrackCarComponent) },
  { path: 'track-car', redirectTo: 'admin/telematics', pathMatch: 'full' },
  { path: '', component: MainLayoutComponent, children: [{ path: '', component: HomeV71Component }] },

  { path: 'admin', component: AdminLayoutComponent, canActivate: [adminGuard], children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: AdminOverviewHubComponent, data: { overviewSection: 'summary' } },
      { path: 'analytics', component: AdminOverviewHubComponent, data: { overviewSection: 'analytics' }, canActivate: [adminAreaGuard('analytics')] },
      { path: 'system-health', component: AdminOverviewHubComponent, data: { overviewSection: 'health' }, canActivate: [adminAreaGuard('settings')] },
      { path: 'settings', component: AdminSiteSettingsHubComponent, data: { settingsSection: 'general' }, canActivate: [adminAreaGuard('settings')] },
      { path: 'company', canActivate: [adminAreaGuard('settings')], loadComponent: () => import('./pages/admin/admin-company-profile.component').then(m => m.AdminCompanyProfileComponent) },
      { path: 'homepage', component: AdminSiteSettingsHubComponent, data: { settingsSection: 'homepage' }, canActivate: [adminAreaGuard('content')] },
      { path: 'navigation', component: AdminSiteSettingsHubComponent, data: { settingsSection: 'navigation' }, canActivate: [adminAreaGuard('settings')] },
      { path: 'footer', component: AdminSiteSettingsHubComponent, data: { settingsSection: 'footer' }, canActivate: [adminAreaGuard('settings')] },
      { path: 'legal', component: AdminSiteSettingsHubComponent, data: { settingsSection: 'legal' }, canActivate: [adminAreaGuard('settings')] },
      { path: 'seo', component: AdminSiteSettingsHubComponent, data: { settingsSection: 'seo' }, canActivate: [adminAreaGuard('settings')] },
      { path: 'faq-management', component: AdminSiteSettingsHubComponent, data: { settingsSection: 'faq' }, canActivate: [adminAreaGuard('content')] },
      { path: 'whatsapp', component: AdminSiteSettingsHubComponent, data: { settingsSection: 'whatsapp' }, canActivate: [adminAreaGuard('settings')] },
      { path: 'content', component: AdminContentHubComponent, data: { contentSection: 'catalog' }, canActivate: [adminAreaGuard('content')] },
      { path: 'catalog-editor', component: AdminContentHubComponent, data: { contentSection: 'catalog' }, canActivate: [adminAreaGuard('content')] },
      { path: 'campaigns', component: AdminContentHubComponent, data: { contentSection: 'campaigns' }, canActivate: [adminAreaGuard('content')] },
      { path: 'blog', component: AdminContentHubComponent, data: { contentSection: 'blog' }, canActivate: [adminAreaGuard('content')] },
      { path: 'media', component: AdminContentHubComponent, data: { contentSection: 'catalog' }, canActivate: [adminAreaGuard('content')] },
      { path: 'cars', component: AdminContentHubComponent, data: { contentSection: 'catalog' }, canActivate: [adminAreaGuard('content')] },
      { path: 'sales', component: AdminContentHubComponent, data: { contentSection: 'catalog' }, canActivate: [adminAreaGuard('content')] },
      { path: 'tours', component: AdminContentHubComponent, data: { contentSection: 'catalog' }, canActivate: [adminAreaGuard('content')] },
      { path: 'branch-moderation', canActivate:[adminAreaGuard('content')], loadComponent:()=>import('./pages/admin/admin-branch-moderation-v171.component').then(m=>m.AdminBranchModerationV171Component) },
      { path: 'operations', component: AdminOperationsHubComponent, data: { operationsSection: 'reservations' } },
      { path: 'reservations', component: AdminOperationsHubComponent, data: { operationsSection: 'reservations' }, canActivate: [adminAreaGuard('operations')] },
      { path: 'customers', canActivate: [adminAreaGuard('operations')], loadComponent: () => import('./pages/admin/admin-customers.component').then(m => m.AdminCustomersComponent) },
      { path: 'customers/:userId', canActivate: [adminAreaGuard('operations')], loadComponent: () => import('./pages/admin/admin-customer-detail.component').then(m => m.AdminCustomerDetailComponent) },
      { path: 'partner-requests', component: AdminOperationsHubComponent, data: { operationsSection: 'vehicles' }, canActivate: [adminAreaGuard('operations')] },
      { path: 'branch-partner-requests', component: AdminOperationsHubComponent, data: { operationsSection: 'branches-requests' }, canActivate: [adminAreaGuard('operations')] },
      { path: 'feedback', component: AdminOperationsHubComponent, data: { operationsSection: 'messages' }, canActivate: [adminAreaGuard('operations')] },
      { path: 'subscribers', component: AdminOperationsHubComponent, data: { operationsSection: 'newsletter' }, canActivate: [adminAreaGuard('operations')] },
      { path: 'branches', component: AdminOperationsHubComponent, data: { operationsSection: 'branches' }, canActivate: [adminAreaGuard('settings')] },
      { path: 'branch-network/:id', canActivate: [adminAreaGuard('settings')], loadComponent: () => import('./pages/admin/admin-branch-network.component').then(m => m.AdminBranchNetworkComponent) },
      { path: 'branch-identities', canActivate:[adminAreaGuard('settings')], loadComponent:()=>import('./pages/admin/admin-branch-identities-v171.component').then(m=>m.AdminBranchIdentitiesV171Component) },
      { path: 'telematics', canActivate: [adminAreaGuard('telematics')], loadComponent: () => import('./pages/admin/admin-telematics.component').then(m => m.AdminTelematicsComponent) },
      { path: 'finance', canActivate: [adminAreaGuard('finance')], loadComponent: () => import('./pages/admin/admin-finance.component').then(m => m.AdminFinanceComponent) },
      { path: 'branch-subscriptions', canActivate: [adminAreaGuard('finance')], loadComponent: () => import('./pages/admin/admin-branch-subscriptions-v171.component').then(m => m.AdminBranchSubscriptionsV171Component) },
      { path: 'marketing', canActivate: [adminAreaGuard('marketing')], loadComponent: () => import('./pages/admin/admin-marketing.component').then(m => m.AdminMarketingComponent) },
      { path: 'team-center', component: AdminTeamHubComponent, data: { teamSection: 'people' } },
      { path: 'team', component: AdminTeamHubComponent, data: { teamSection: 'people' }, canActivate: [adminAreaGuard('team')] },
      { path: 'assignments', component: AdminTeamHubComponent, data: { teamSection: 'assignments' }, canActivate: [adminAreaGuard('team')] },
      { path: 'audit', component: AdminTeamHubComponent, data: { teamSection: 'audit' }, canActivate: [adminAreaGuard('team')] }
    ] },
  { path: '**', component: MainLayoutComponent, children: [{ path: '', loadComponent: () => import('./pages/not-found.component').then(m => m.NotFoundComponent) }] }
];
