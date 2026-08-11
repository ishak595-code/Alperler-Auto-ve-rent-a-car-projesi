import { Component, inject } from "@angular/core";
import { CommonModule, Location } from "@angular/common";
import { CarService } from "../services/car.service";
import { Router } from "@angular/router";
import { MatIconModule } from "@angular/material/icon";

@Component({
  selector: "app-faq",
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="bg-slate-950 text-slate-300 min-h-screen font-sans pb-20">
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
              Sıkça Sorulan Sorular
            </h1>
          </div>
        </div>
      </div>

      <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div class="text-center mb-12">
          <p class="text-slate-400">
            Aklınıza takılan tüm soruların cevapları burada.
          </p>
        </div>

        <div class="space-y-4">
          @for (faq of faqs(); track faq.id) {
            <div
              class="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-sm transition-all duration-300 hover:shadow-md group hover:border-blue-500"
            >
              <button
                (click)="toggleFaq(faq.id)"
                class="w-full flex justify-between items-center p-6 text-left focus:outline-none bg-slate-900 hover:bg-slate-800 transition-colors"
              >
                <span
                  class="font-bold text-slate-100 text-lg group-hover:text-blue-400 transition-colors"
                  >{{ faq.question }}</span
                >
                <span
                  class="text-slate-400 transform transition-transform duration-300 bg-slate-800 rounded-full p-1"
                  [class.rotate-180]="faq.isOpen"
                >
                  <svg
                    class="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </span>
              </button>
              <div
                class="bg-slate-900 text-slate-400 leading-relaxed overflow-hidden transition-all duration-300"
                [style.max-height]="faq.isOpen ? '500px' : '0'"
                [style.opacity]="faq.isOpen ? '1' : '0'"
              >
                <div class="p-6 pt-0 border-t border-slate-800 mt-2">
                  {{ faq.answer }}
                </div>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class FaqComponent {
  carService = inject(CarService);
  router = inject(Router);
  location = inject(Location);
  
  faqs = this.carService.getFaqs();

  goBack() {
    if (window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate(["/"]);
    }
  }

  toggleFaq(id: number) {
    // We need to update the local state or service state.
    // Since isOpen is UI state, we can handle it by mutating a local copy or updating the service if we want persistence of open state (unlikely).
    // Better approach for signals: create a local signal or just update the object in the array if it's mutable enough for this view.
    // However, signals are immutable by default.
    // Let's just use a local set of open IDs.
    this.carService.addFaq({
      ...this.faqs().find((f) => f.id === id)!,
      isOpen: !this.faqs().find((f) => f.id === id)!.isOpen,
    });
  }
}
