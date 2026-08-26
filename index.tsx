import { APP_BASE_HREF } from '@angular/common';
import { ErrorHandler, provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { AppComponent } from './src/app.component';
import { routes } from './src/app.routes';
import { provideLegacyWebhookSafety } from './src/providers/legacy-webhook-safety.provider';
import { bookingSuccessInterceptor } from './src/services/booking-success.interceptor';
import { installCampaignSocialProofFetchBroker } from './src/services/campaign-social-proof-fetch-broker';
import { GlobalErrorHandler } from './src/services/global-error-handler';
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

// Multiple dynamic homepage sections can coexist, but the anonymous campaign
// social-proof read must remain a single bounded network flow on mobile.
installCampaignSocialProofFetchBroker();
startPwaRuntime();

if (window.self !== window.top) {
  window.location.hash = '';
}

bootstrapApplication(AppComponent, {
  providers: [
    provideZonelessChangeDetection(),
    provideHttpClient(withInterceptors([bookingSuccessInterceptor])),
    provideLegacyWebhookSafety(),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    { provide: APP_BASE_HREF, useValue: '/' },
    provideRouter(
      routes,
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' })
    )
  ]
}).catch(err => console.error(err));
