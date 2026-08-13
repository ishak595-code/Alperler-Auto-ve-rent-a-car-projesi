import { bootstrapApplication } from '@angular/platform-browser';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { AppComponent } from './src/app.component';
import { routes } from './src/app.routes';
import { APP_BASE_HREF } from '@angular/common';
import { provideLegacyWebhookSafety } from './src/providers/legacy-webhook-safety.provider';
import { CarService } from './src/services/car.service';
import { PersistentCarService } from './src/services/persistent-car.service';

// AI Studio önizleme ekranında (iframe) sayfa yenilendiğinde her zaman ana sayfadan başlaması için:
if (window.self !== window.top) {
  window.location.hash = '';
}

bootstrapApplication(AppComponent, {
  providers: [
    provideZonelessChangeDetection(),
    provideHttpClient(),
    provideLegacyWebhookSafety(),
    { provide: CarService, useClass: PersistentCarService },
    { provide: APP_BASE_HREF, useValue: '/' },
    provideRouter(
      routes,
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' })
    )
  ]
}).catch(err => console.error(err));

// AI Studio always uses an `index.tsx` file for all project types.
