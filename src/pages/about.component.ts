import { Component, inject } from "@angular/core";
import { CarService } from "../services/car.service";
import { UiService } from "../services/ui.service";
import { CommonModule, Location } from "@angular/common";
import { Router } from "@angular/router";
import { MatIconModule } from "@angular/material/icon";

@Component({
  selector: "app-about",
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="bg-slate-950 font-sans min-h-screen pb-20">
      <!-- Sticky Module Header -->
      <div
        class="bg-slate-900 border-b border-slate-800 sticky top-0 z-50 shadow-lg"
      >
        <div class="max-w-7xl mx-auto px-4">
          <div class="h-16 flex items-center gap-3">
            <button
              (click)="goBack()"
              class="p-2 -ml-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors shrink-0"
              aria-label="Geri Dön"
            >
              <mat-icon>arrow_back</mat-icon>
            </button>
            <h1 class="text-lg font-bold text-white">
              {{ t().nav.about }}
            </h1>
          </div>
        </div>
      </div>

      <!-- Header -->
      <div
        class="relative bg-slate-900 h-[500px] flex items-center justify-center overflow-hidden"
      >
        <div class="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1560179707-f14e90ef3623?q=80&w=2500"
            alt="Alperler Kurumsal"
            class="w-full h-full object-cover opacity-40 mix-blend-overlay"
          />
        </div>
        <div
          class="absolute inset-0 bg-gradient-to-t from-white via-slate-900/40 to-slate-900/90"
        ></div>
        <div class="relative z-10 text-center px-4 animate-fade-in-up mt-10">
          <span
            class="bg-blue-600/20 border border-blue-500/30 text-blue-100 px-6 py-2 rounded-full text-xs font-bold uppercase tracking-[0.2em] mb-8 inline-block shadow-[0_0_20px_rgba(37,99,235,0.2)] backdrop-blur-sm"
          >
            {{ config().companyName }}
          </span>
          <h1
            class="font-serif text-5xl md:text-7xl font-bold mb-6 text-white drop-shadow-lg"
          >
            {{ config().aboutTitle }}
          </h1>
        </div>
      </div>

      <!-- Founding Story -->
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24 relative">
        <div
          class="absolute -left-20 top-40 w-40 h-40 bg-blue-100 rounded-full opacity-50 blur-3xl"
        ></div>

        <h2
          class="text-blue-600 font-bold tracking-[0.2em] uppercase text-sm mb-4 text-center"
        >
          Hakkımızda
        </h2>

        <div
          class="prose prose-lg text-slate-600 leading-relaxed mx-auto text-justify whitespace-pre-line"
        >
          {{ config().aboutText }}
        </div>
      </div>

      <!-- Team Grid -->
      <div class="bg-slate-50 py-24 border-t border-slate-200">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="text-center mb-16">
            <h2
              class="font-serif text-4xl md:text-5xl font-bold text-slate-900 mb-4"
            >
              Yönetim ve Operasyon
            </h2>
            <p class="text-slate-500 max-w-2xl mx-auto">
              Profesyonel hizmet, aile sıcaklığı.
            </p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            @for (member of config().team; track member.id) {
              <div
                class="bg-white p-8 rounded-sm shadow-lg border-t-4 border-slate-900 hover:border-blue-500 transition-all duration-300 text-center group"
              >
                <div
                  class="w-32 h-32 bg-slate-200 rounded-full mx-auto mb-6 overflow-hidden border-4 border-white shadow-md"
                >
                  <img
                    [src]="member.image"
                    width="200"
                    height="200"
                    [alt]="member.name"
                    class="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all"
                  />
                </div>
                <h3 class="font-bold text-2xl text-slate-900 font-serif">
                  {{ member.name }}
                </h3>
                <p
                  class="text-blue-600 text-xs uppercase font-bold tracking-widest mb-2"
                >
                  {{ member.role }}
                </p>
                <p class="text-slate-500 text-sm">{{ member.description }}</p>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
})
export class AboutComponent {
  carService = inject(CarService);
  uiService = inject(UiService);
  router = inject(Router);
  config = this.carService.getConfig();
  t = this.uiService.translations;

  location = inject(Location);

  goBack() {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      this.router.navigate(["/"]);
    }
  }
}
