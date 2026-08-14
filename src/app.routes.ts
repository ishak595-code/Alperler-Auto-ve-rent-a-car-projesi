import { Routes, CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './services/auth.service';
import { HomeComponent } from './pages/home.component';
import { FleetComponent } from './pages/fleet.component';
import { AboutComponent } from './pages/about.component';
import { BlogDetailComponent } from './pages/blog-detail.component';
import { BlogListComponent } from './pages/blog-list.component';
import { FaqComponent } from './pages/faq.component';
import { LegalComponent } from './pages/legal.component';
import { MainLayoutComponent } from './components/main-layout.component';
import { RentalDetailShellComponent, SaleDetailShellComponent, TourDetailShellComponent } from './pages/catalog-detail-shells.component';

// Admin Pages
import { AdminLayoutComponent } from './pages/admin/admin-layout.component';
import { AdminDashboardComponent } from './pages/admin/admin-dashboard.component';
import { AdminCarsComponent } from './pages/admin/admin-cars.component';
import { AdminReservationsComponent } from './pages/admin/admin-reservations.component';
import { AdminBlogComponent } from './pages/admin/admin-blog.component';
import { AdminSettingsComponent } from './pages/admin/admin-settings.component';
import { AdminPartnerRequestsComponent } from './pages/admin/admin-partner-requests.component';
import { AdminToursComponent } from './pages/admin/admin-tours.component';
import { AdminFeedbackComponent } from './pages/admin/admin-feedback.component';
import { AdminHomepageComponent } from './pages/admin/admin-homepage.component';
import { AdminTeamComponent } from './pages/admin/admin-team.component';
import { AdminMediaComponent } from './pages/admin/admin-media.component';
import { AdminCampaignsComponent } from './pages/admin/admin-campaigns.component';

const adminGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.waitUntilReady();
  if (auth.isLoggedIn()) return true;
  return router.parseUrl('/admin/login');
};

export const routes: Routes = [
  {
    path: 'admin/login',
    loadComponent: () => import('./pages/admin/admin-login.component').then(m => m.AdminLoginComponent)
  },
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
  {
    path: '',
    component: MainLayoutComponent,
    children: [{ path: '', component: HomeComponent }]
  },
  {
    path: 'admin',
    component: AdminLayoutComponent,
    canActivate: [adminGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: AdminDashboardComponent },
      { path: 'homepage', component: AdminHomepageComponent },
      { path: 'campaigns', component: AdminCampaignsComponent },
      { path: 'media', component: AdminMediaComponent },
      { path: 'team', component: AdminTeamComponent },
      { path: 'cars', component: AdminCarsComponent },
      { path: 'reservations', component: AdminReservationsComponent },
      { path: 'sales', component: AdminCarsComponent },
      { path: 'tours', component: AdminToursComponent },
      { path: 'blog', component: AdminBlogComponent },
      { path: 'partner-requests', component: AdminPartnerRequestsComponent },
      { path: 'feedback', component: AdminFeedbackComponent },
      { path: 'subscribers', loadComponent: () => import('./pages/admin/admin-subscribers.component').then(m => m.AdminSubscribersComponent) },
      { path: 'settings', component: AdminSettingsComponent }
    ]
  },
  {
    path: '**',
    component: MainLayoutComponent,
    children: [
      { path: '', loadComponent: () => import('./pages/not-found.component').then(m => m.NotFoundComponent) }
    ]
  }
];
