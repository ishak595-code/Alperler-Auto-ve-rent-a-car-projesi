
import { Routes, CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './services/auth.service';
import { HomeComponent } from './pages/home.component';
import { FleetComponent } from './pages/fleet.component';
import { SalesComponent } from './pages/sales.component';
import { AboutComponent } from './pages/about.component';
import { ContactComponent } from './pages/contact.component';
import { BlogDetailComponent } from './pages/blog-detail.component';
import { BlogListComponent } from './pages/blog-list.component';
import { FaqComponent } from './pages/faq.component';
import { LegalComponent } from './pages/legal.component';
import { MainLayoutComponent } from './components/main-layout.component';
import { CarDetailComponent } from './pages/car-detail.component';
import { SaleCarDetailComponent } from './pages/sale-car-detail.component';

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

const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn()) {
    return true;
  }
  return router.parseUrl('/admin/login');
};

export const routes: Routes = [
  // Standalone Admin Login (No Main Layout)
  { 
    path: 'admin/login', 
    loadComponent: () => import('./pages/admin/admin-login.component').then(m => m.AdminLoginComponent)
  },

  // Standalone Detail Routes (No Main Layout)
  { path: 'fleet', component: FleetComponent },
  { path: 'fleet/:id', component: CarDetailComponent },
  { path: 'sales', component: SalesComponent },
  { path: 'sales/:id', component: SaleCarDetailComponent },
  { path: 'tours', loadComponent: () => import('./pages/tours.component').then(m => m.ToursComponent) },
  { path: 'tour/:id', loadComponent: () => import('./pages/tour-detail.component').then(m => m.TourDetailComponent) },
  { path: 'blog', component: BlogListComponent },
  { path: 'blog/:id', component: BlogDetailComponent },
  { path: 'about', component: AboutComponent },
  { path: 'contact', component: ContactComponent },
  { path: 'faq', component: FaqComponent },
  { path: 'legal', component: LegalComponent },
  { path: 'appointment', loadComponent: () => import('./pages/appointment.component').then(m => m.AppointmentComponent) },
  { path: 'list-your-car', loadComponent: () => import('./pages/list-your-car.component').then(m => m.ListYourCarComponent) },
  { path: 'track-car/:id', loadComponent: () => import('./pages/track-car.component').then(m => m.TrackCarComponent) },
  { path: 'track-car', loadComponent: () => import('./pages/track-car.component').then(m => m.TrackCarComponent) },

  // Public Routes (Wrapped in MainLayout)
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      { path: '', component: HomeComponent }
    ]
  },
  
  // Admin Routes (Separate Layout)
  { 
    path: 'admin', 
    component: AdminLayoutComponent,
    canActivate: [adminGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: AdminDashboardComponent },
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
