import { Component, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { CarService, Feedback } from "../services/car.service";
import { UiService } from "../services/ui.service";

@Component({
  selector: "app-feedback",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (uiService.isFeedbackOpen()) {
      <div class="fixed inset-0 z-50 flex justify-end">
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
          (click)="close()"
        ></div>

        <!-- Panel -->
        <div
          class="relative w-full max-w-md bg-white shadow-2xl h-full flex flex-col animate-slide-in-right"
        >
          <!-- Header -->
          <div
            class="p-6 bg-slate-900 text-white flex justify-between items-center shadow-md"
          >
            <div>
              <h2 class="text-xl font-serif font-bold text-blue-500">
                {{ t().feedback.title }}
              </h2>
              <p class="text-slate-400 text-sm">{{ t().feedback.subtitle }}</p>
            </div>
            <button
              (click)="close()"
              class="text-slate-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full"
            >
              <svg
                class="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <!-- Content -->
          <div class="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
            @if (!isSuccess()) {
              <!-- Form -->
              <form (submit)="submitFeedback($event)" class="space-y-6">
                <!-- Category -->
                <div>
                  <label
                    class="block text-sm font-medium text-slate-700 mb-2"
                    >{{ t().feedback.category }}</label
                  >
                  <select
                    [(ngModel)]="category"
                    name="category"
                    class="w-full bg-white border border-slate-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  >
                    <option value="GENERAL">
                      {{ t().feedback.categories.GENERAL }}
                    </option>
                    <option value="BUG">
                      {{ t().feedback.categories.BUG }}
                    </option>
                    <option value="FEATURE">
                      {{ t().feedback.categories.FEATURE }}
                    </option>
                    <option value="CONTENT">
                      {{ t().feedback.categories.CONTENT }}
                    </option>
                    <option value="OTHER">
                      {{ t().feedback.categories.OTHER }}
                    </option>
                  </select>
                </div>

                <!-- Rating -->
                <div>
                  <label
                    class="block text-sm font-medium text-slate-700 mb-2"
                    >{{ t().feedback.rating }}</label
                  >
                  <div class="flex gap-2">
                    @for (star of [1, 2, 3, 4, 5]; track star) {
                      <button
                        type="button"
                        (click)="rating.set(star)"
                        class="text-2xl transition-transform hover:scale-110 focus:outline-none"
                        [class.text-blue-400]="star <= rating()"
                        [class.text-slate-300]="star > rating()"
                      >
                        ★
                      </button>
                    }
                  </div>
                </div>

                <!-- Message -->
                <div>
                  <label
                    class="block text-sm font-medium text-slate-700 mb-2"
                    >{{ t().feedback.message }}</label
                  >
                  <textarea
                    [(ngModel)]="message"
                    name="message"
                    rows="5"
                    [placeholder]="t().feedback.placeholder"
                    class="w-full bg-white border border-slate-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
                    required
                  ></textarea>
                </div>

                <!-- Submit -->
                <button
                  type="submit"
                  [disabled]="!message.trim()"
                  class="w-full bg-slate-900 text-white font-bold py-4 rounded-lg hover:bg-blue-500 hover:text-slate-900 transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95"
                >
                  {{ t().feedback.submit }}
                </button>
              </form>

              <!-- Admin / Analysis Section (Hidden by default, toggleable) -->
              <div class="mt-12 pt-8 border-t border-slate-200">
                <button
                  (click)="showAnalysis.update((v) => !v)"
                  class="text-xs text-slate-400 hover:text-slate-600 underline"
                >
                  {{
                    showAnalysis() ? "Analizi Gizle" : "Yönetici Analizi (AI)"
                  }}
                </button>

                @if (showAnalysis()) {
                  <div
                    class="mt-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm animate-fade-in"
                  >
                    <h3
                      class="font-bold text-slate-800 mb-3 flex items-center gap-2"
                    >
                      <span
                        class="w-2 h-2 bg-green-500 rounded-full animate-pulse"
                      ></span>
                      {{ t().feedback.analysis.title }}
                    </h3>

                    <div class="mb-4 text-sm text-slate-600">
                      Toplam Geri Bildirim:
                      <span class="font-bold text-slate-900">{{
                        carService.getFeedbacks().length
                      }}</span>
                    </div>

                    @if (analysisResult()) {
                      <div
                        class="bg-slate-50 p-3 rounded-lg text-sm text-slate-700 whitespace-pre-line border border-slate-200"
                      >
                        {{ analysisResult() }}
                      </div>
                    }

                    <button
                      (click)="analyze()"
                      [disabled]="isAnalyzing()"
                      class="mt-4 w-full bg-blue-50 text-blue-600 font-medium py-2 rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
                    >
                      @if (isAnalyzing()) {
                        <svg
                          class="animate-spin h-4 w-4 text-blue-600"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            class="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            stroke-width="4"
                          ></circle>
                          <path
                            class="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        {{ t().feedback.analysis.loading }}
                      } @else {
                        {{ t().feedback.analysis.btn }}
                      }
                    </button>
                  </div>
                }
              </div>
            } @else {
              <!-- Success State -->
              <div
                class="h-full flex flex-col items-center justify-center text-center animate-fade-in"
              >
                <div
                  class="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mb-6"
                >
                  <svg
                    class="w-10 h-10"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h3 class="text-2xl font-bold text-slate-900 mb-2">
                  {{ t().feedback.success }}
                </h3>
                <p class="text-slate-500 mb-8">
                  Görüşleriniz hizmet kalitemizi artırmamıza yardımcı oluyor.
                </p>
                <button
                  (click)="close()"
                  class="bg-slate-900 text-white font-bold py-3 px-8 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  {{ t().buttons.close }}
                </button>
              </div>
            }
          </div>
        </div>
      </div>
    }
  `,
})
export class FeedbackComponent {
  carService = inject(CarService);
  uiService = inject(UiService);
  t = this.uiService.translations;

  category: Feedback["category"] = "GENERAL";
  rating = signal(5);
  message = "";

  isSuccess = signal(false);
  showAnalysis = signal(false);
  isAnalyzing = signal(false);
  analysisResult = signal<string | null>(null);

  close() {
    this.uiService.toggleFeedback(false);
    setTimeout(() => {
      this.isSuccess.set(false);
      this.message = "";
      this.rating.set(5);
      this.category = "GENERAL";
    }, 300);
  }

  submitFeedback(e: Event) {
    e.preventDefault();
    if (!this.message.trim()) return;

    this.carService.addFeedback({
      category: this.category,
      rating: this.rating(),
      message: this.message,
    });

    this.isSuccess.set(true);
  }

  async analyze() {
    this.isAnalyzing.set(true);
    const result = await this.carService.analyzeFeedback();
    this.analysisResult.set(result);
    this.isAnalyzing.set(false);
  }
}
