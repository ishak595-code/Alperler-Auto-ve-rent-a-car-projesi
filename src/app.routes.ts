import { Routes, CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './services/auth.service';
import { AdminAccessService, AdminArea } from './services/admin-access.service';
import { HomeV39Component } from './pages/home-v39.component';
import { FleetComponent } from './pages/fleet.component';
import { AboutComponent } from './pages/about.component';
import { BlogDetailComponent } from './pages/blog-detail.component';
import { BlogListComponent } from './pages/blog-list.component';
import { FaqComponent } from './pages/faq.component';
import { LegalComponent } from './pages/legal.component';
import { MainLayoutComponent } from './components/main-layout.component';
import { RentalDetailShellComponent, SaleDetailShellComponent, TourDetailShellComponent } from './pages/catalog-detail-shells.component';

import { AdminLayoutComponent } from './pages/admin/admin-layout.component';
import { AdminDashboardShellComponent } from './pages/admin/admin-dashboard-shell.component';
import { AdminReservationsComponent } from './pages/admin/admin-reservations.component';
import { AdminBlogComponent } from './pages/admin/admin-blog.component';
import { AdminSettingsComponent } from './pages/admin/admin-settings.component';
import { AdminPartnerRequestsComponent } from './pages/admin/admin-partner-requests.component';
import { AdminFeedbackComponent } from './pages/admin/admin-feedback.component';
import { AdminHomepageComponent } from './pages/admin/admin-homepage.component';
import { AdminTeamComponent } from './pages/admin/admin-team.component';
import { AdminBranchesComponent } from './pages/admin/admin-branches.component';
import { AdminCampaignsComponent } from './pages/admin/admin-campaigns.component';
import { AdminCatalogEditorComponent } from './pages/admin/admin-catalog-editor.component';
import { AdminMediaComponent } from './pages/admin/admin-media.component';
import { AdminAuditComponent } from './pages/admin/admin-audit.component';
import { AdminWhatsappSettingsComponent } from './pages/admin/admin-whatsapp-settings.component';
import { AdminSystemHealthComponent } from './pages/admin/admin-system-health.component';

const adminGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.waitUntilReady();
  if (auth.isLoggedIn()) return true;
  return router.parseUrl('/admin/login');
};

const adminAreaGuard = (area: AdminArea): CanActivateFn => async () => {
  const auth = inject(AuthService);
  const access = inject(AdminAccessService);
  const router = inject(Router);
  await auth.waitUntilReady();
  if (!auth.isLoggedIn()) return router.parseUrl('/admin/login');
  if (await access.can(area)) return true;
  return router.parseUrl(`/admin/dashboard?denied=${encodeURIComponent(area)}`);
};

export const routes: Routes = [
  { path: 'admin/login', loadComponent: () => import('./pages/admin/admin-login.component').then(m => m.AdminLoginComponent) },
  { path: 'fleet', component: FleetComponent },
  { path: 'fleet/:id', component: RentalDetailShellComponent },
  { path: 'sales', loadComponent: () => import('./pages/sales-results.component').then(m => m.SalesResultsComponent) },
  { path: 'sales/:id', component: SaleDetailShellComponent },
  { path: 'tours', loadComponent: () => import('./pages/tours.component').then(m => m.ToursComponent) },
  { path: 'tour/:id', component: TourDetailShellComponent },
  { path: 'branches', loadComponent: () => import('./pages/branches.component').then(m => m.BranchesComponent) },
  { path: 'blog', component: BlogListComponent },
  { path: 'blog/:id', component: BlogDetailComponent },
  { path: 'about', component: AboutComponent },
  { path: 'contact', loadComponent: () => import('./pages/contact-entry.component').then(m => m.ContactEntryComponent) },
  { path: 'faq', component: FaqComponent },
  { path: 'legal', component: LegalComponent },
  { path: 'appointment', loadComponent: () => import('./pages/appointment.component').then(m => m.AppointmentComponent) },
  { path: 'list-your-car', loadComponent: () => import('./pages/list-your-car.component').then(m => m.ListYourCarComponent) },
  { path: 'track-car/:id', loadComponent: () => import('./pages/track-car.component').then(m => m.TrackCarComponent) },
  { path: 'track-car', loadComponent: () => import('./pages/track-car.component').then(m => m.TrackCarComponent) },
  { path: '', component: MainLayoutComponent, children: [{ path: '', component: HomeV39Component }] },
  {
    path: 'admin',
    component: AdminLayoutComponent,
    canActivate: [adminGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: AdminDashboardShellComponent },
      { path: 'homepage', component: AdminHomepageComponent, canActivate: [adminAreaGuard('content')] },
      { path: 'campaigns', component: AdminCampaignsComponent, canActivate: [adminAreaGuard('content')] },
      { path: 'media', component: AdminMediaComponent, canActivate: [adminAreaGuard('content')] },
      { path: 'catalog-editor', component: AdminCatalogEditorComponent, canActivate: [adminAreaGuard('content')] },
      { path: 'whatsapp', component: AdminWhatsappSettingsComponent, canActivate: [adminAreaGuard('settings')] },
      { path: 'team', component: AdminTeamComponent, canActivate: [adminAreaGuard('team')] },
      { path: 'assignments', canActivate: [adminAreaGuard('team')], loadComponent: () => import('./pages/admin/admin-assignment-center.component').then(m => m.AdminAssignmentCenterComponent) },
      { path: 'branches', component: AdminBranchesComponent, canActivate: [adminAreaGuard('settings')] },
      { path: 'audit', component: AdminAuditComponent, canActivate: [adminAreaGuard('finance')] },
      { path: 'system-health', component: AdminSystemHealthComponent, canActivate: [adminAreaGuard('settings')] },
      { path: 'cars', redirectTo: 'catalog-editor', pathMatch: 'full' },
      { path: 'sales', redirectTo: 'catalog-editor', pathMatch: 'full' },
      { path: 'tours', redirectTo: 'catalog-editor', pathMatch: 'full' },
      { path: 'reservations', component: AdminReservationsComponent, canActivate: [adminAreaGuard('operations')] },
      { path: 'blog', component: AdminBlogComponent, canActivate: [adminAreaGuard('content')] },
      { path: 'partner-requests', component: AdminPartnerRequestsComponent, canActivate: [adminAreaGuard('operations')] },
      { path: 'feedback', component: AdminFeedbackComponent, canActivate: [adminAreaGuard('operations')] },
      { path: 'subscribers', canActivate: [adminAreaGuard('operations')], loadComponent: () => import('./pages/admin/admin-subscribers.component').then(m => m.AdminSubscribersComponent) },
      { path: 'settings', component: AdminSettingsComponent, canActivate: [adminAreaGuard('settings')] }
    ]
  },
  { path: '**', component: MainLayoutComponent, children: [{ path: '', loadComponent: () => import('./pages/not-found.component').then(m => m.NotFoundComponent) }] }
];
