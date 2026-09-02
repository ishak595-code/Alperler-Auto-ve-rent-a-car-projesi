import { APP_BASE_HREF } from '@angular/common';
import { ErrorHandler, provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, RouteReuseStrategy, withInMemoryScrolling } from '@angular/router';
import { AppComponent } from './src/app.component';
import { provideLegacyWebhookSafety } from './src/providers/legacy-webhook-safety.provider';
import { bookingSuccessInterceptor } from './src/services/booking-success.interceptor';
import { BranchAwareCarService } from './src/services/branch-aware-car.service';
import { BranchAwarePublicDetailDataService } from './src/services/branch-aware-public-detail-data.service';
import { CarService } from './src/services/car.service';
import { GlobalErrorHandler } from './src/services/global-error-handler';
import { ParamAwareRouteReuseStrategy } from './src/services/param-aware-route-reuse.strategy';
import { PublicDetailDataService } from './src/services/public-detail-data.service';
import { startPwaRuntime } from './src/services/pwa-runtime.service';

const LEGACY_CATALOG_STORAGE_KEY = /^db_(?:cars|rental_?cars?|sale_?cars?|sales?|vehicles?|tours?|inventory|config|faqs?|blog)(?:_|$)/i;

function isLegacyCatalogStorageKey(key: string | null): boolean {
  return Boolean(key && LEGACY_CATALOG_STORAGE_KEY.test(key));
}

function purgeLegacyCatalogStorage(): void {
  try {
    const keys: string[] = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (isLegacyCatalogStorageKey(key) && key) keys.push(key);
    }
    keys.forEach((key) => localStorage.removeItem(key));
  } catch (error) {
    console.warn('Legacy catalogue storage could not be cleared.', error);
  }
}

// Chrome owns the native Install app / Add to Home screen experience. The
// application deliberately does not intercept beforeinstallprompt or render a
// competing in-page installer. V162 owns only worker lifecycle, offline fallback
// and installed display-mode state.

// The published Supabase catalogue is authoritative. Old schema snapshots must
// never win over current vehicle data during bootstrap or from another stale tab.
purgeLegacyCatalogStorage();
window.addEventListener('storage', (event) => {
  if (!isLegacyCatalogStorageKey(event.key) || !event.key) return;
  try {
    localStorage.removeItem(event.key);
  } catch {
    // Storage can be unavailable in hardened/private browser modes.
  }
});

startPwaRuntime();

if (window.self !== window.top) {
  window.location.hash = '';
}

async function bootstrap(): Promise<void> {
  // Route configuration is intentionally split from the bootstrap core. This keeps
  // route-only customer/admin domains out of the static initial graph while still
  // preserving Angular's canonical router ownership before the app starts.
  const { routes } = await import('./src/app.routes');

  await bootstrapApplication(AppComponent, {
    providers: [
      provideZonelessChangeDetection(),
      provideHttpClient(withInterceptors([bookingSuccessInterceptor])),
      provideLegacyWebhookSafety(),
      { provide: ErrorHandler, useClass: GlobalErrorHandler },
      { provide: APP_BASE_HREF, useValue: '/' },
      { provide: RouteReuseStrategy, useClass: ParamAwareRouteReuseStrategy },
      { provide: CarService, useClass: BranchAwareCarService },
      { provide: PublicDetailDataService, useClass: BranchAwarePublicDetailDataService },
      provideRouter(
        routes,
        withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' })
      )
    ]
  });
}

void bootstrap().catch(err => console.error(err));
