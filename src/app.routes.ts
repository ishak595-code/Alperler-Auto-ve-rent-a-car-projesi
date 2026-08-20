import { Routes, CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './services/auth.service';
import { AdminAccessService, AdminArea } from './services/admin-access.service';
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

const adminGuard: CanActivateFn = async () => {
  const auth = inject(AuthService); const router = inject(Router); await auth.waitUntilReady();
  if (auth.isLoggedIn()) return true; return router.parseUrl('/admin/login');
};
const adminAreaGuard = (area: AdminArea): CanActivateFn => async () => {
  const auth = inject(AuthService); const access = inject(AdminAccessService); const router = inject(Router);
  await auth.waitUntilReady(); if (!auth.isLoggedIn()) return router.parseUrl('/admin/login');
  if (await access.can(area)) return true; return router.parseUrl(`/admin/dashboard?denied=${encodeURIComponent(area)}`);
};

export const routes: Routes = [
  { path: 'admin/login', loadComponent: () => import('./pages/admin/admin-login.component').then(m => m.AdminLoginComponent) },
  { path: 'branch-portal/login', loadComponent: () => import('./pages/branch-portal-login.component').then(m => m.BranchPortalLoginComponent) },
  { path: 'branch-portal', loadComponent: () => import('./pages/branch-portal.component').then(m => m.BranchPortalComponent) },
  { path: 'search', loadComponent: () => import('./pages/search.component').then(m => m.SearchComponent) },
  { path: 'campaigns', loadComponent: () => import('./pages/campaigns.component').then(m => m.CampaignsComponent) },
  { path: 'fleet', component: FleetComponent },
  { path: 'fleet/:id', component: RentalDetailShellComponent },
  { path: 'sales', loadComponent: () => import('./pages/sales-results.component').then(m => m.SalesResultsComponent) },
  { path: 'sales/:id', component: SaleDetailShellComponent },
  { path: 'tours', loadComponent: () => import('./pages/tours.component').then(m => m.ToursComponent) },
  { path: 'tour/:id', component: TourDetailShellComponent },
  { path: 'branches/:slug', loadComponent: () => import('./pages/branch-detail.component').then(m => m.BranchDetailComponent) },
  { path: 'branches', loadComponent: () => import('./pages/branches.component').then(m => m.BranchesComponent) },
  { path: 'branch-partner', loadComponent: () => import('./pages/branch-partner.component').then(m => m.BranchPartnerComponent) },
  { path: 'blog', component: BlogListComponent }, { path: 'blog/:id', component: BlogDetailComponent },
  { path: 'about', component: AboutComponent },
  { path: 'contact', loadComponent: () => import('./pages/contact-entry.component').then(m => m.ContactEntryComponent) },
  { path: 'faq', component: FaqComponent }, { path: 'legal', component: LegalComponent },
  { path: 'appointment', loadComponent: () => import('./pages/appointment.component').then(m => m.AppointmentComponent) },
  { path: 'list-your-car', loadComponent: () => import('./pages/list-your-car.component').then(m => m.ListYourCarComponent) },
  { path: 'track-car/:id', canActivate: [adminAreaGuard('operations')], loadComponent: () => import('./pages/track-car.component').then(m => m.TrackCarComponent) },
  { path: 'track-car', redirectTo: 'admin/reservations', pathMatch: 'full' },
  { path: '', component: MainLayoutComponent, children: [{ path: '', component: HomeV71Component }] },

  { path: 'admin', component: AdminLayoutComponent, canActivate: [adminGuard], children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

      { path: 'dashboard', component: AdminOverviewHubComponent, data: { overviewSection: 'summary' } },
      { path: 'analytics', component: AdminOverviewHubComponent, data: { overviewSection: 'analytics' }, canActivate: [adminAreaGuard('analytics')] },
      { path: 'system-health', component: AdminOverviewHubComponent, data: { overviewSection: 'health' }, canActivate: [adminAreaGuard('settings')] },

      { path: 'settings', component: AdminSiteSettingsHubComponent, data: { settingsSection: 'general' }, canActivate: [adminAreaGuard('settings')] },
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

      { path: 'operations', component: AdminOperationsHubComponent, data: { operationsSection: 'reservations' } },
      { path: 'reservations', component: AdminOperationsHubComponent, data: { operationsSection: 'reservations' }, canActivate: [adminAreaGuard('operations')] },
      { path: 'partner-requests', component: AdminOperationsHubComponent, data: { operationsSection: 'vehicles' }, canActivate: [adminAreaGuard('operations')] },
      { path: 'branch-partner-requests', component: AdminOperationsHubComponent, data: { operationsSection: 'branches-requests' }, canActivate: [adminAreaGuard('operations')] },
      { path: 'feedback', component: AdminOperationsHubComponent, data: { operationsSection: 'messages' }, canActivate: [adminAreaGuard('operations')] },
      { path: 'subscribers', component: AdminOperationsHubComponent, data: { operationsSection: 'newsletter' }, canActivate: [adminAreaGuard('operations')] },
      { path: 'branches', component: AdminOperationsHubComponent, data: { operationsSection: 'branches' }, canActivate: [adminAreaGuard('settings')] },
      { path: 'branch-network/:id', canActivate: [adminAreaGuard('settings')], loadComponent: () => import('./pages/admin/admin-branch-network.component').then(m => m.AdminBranchNetworkComponent) },

      { path: 'team-center', component: AdminTeamHubComponent, data: { teamSection: 'people' } },
      { path: 'team', component: AdminTeamHubComponent, data: { teamSection: 'people' }, canActivate: [adminAreaGuard('team')] },
      { path: 'assignments', component: AdminTeamHubComponent, data: { teamSection: 'assignments' }, canActivate: [adminAreaGuard('team')] },
      { path: 'audit', component: AdminTeamHubComponent, data: { teamSection: 'audit' }, canActivate: [adminAreaGuard('finance')] }
    ] },

  { path: '**', component: MainLayoutComponent, children: [{ path: '', loadComponent: () => import('./pages/not-found.component').then(m => m.NotFoundComponent) }] }
];
