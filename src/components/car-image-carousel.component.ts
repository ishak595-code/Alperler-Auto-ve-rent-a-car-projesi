import { Component, input, output, signal } from "@angular/core";
import { CommonModule } from "@angular/common";

@Component({
  selector: "app-car-image-carousel",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative w-full h-full group overflow-hidden bg-slate-200">
      <!-- Images -->
      @for (img of images(); track img; let i = $index) {
        <div
          class="absolute inset-0 transition-opacity duration-500 ease-in-out will-change-[opacity] cursor-zoom-in"
          [class.opacity-100]="i === currentIndex()"
          [class.opacity-0]="i !== currentIndex()"
          (click)="onImageClick($event, i)"
        >
          <img
            [src]="img"
            [alt]="altText()"
            [loading]="i === 0 ? 'eager' : 'lazy'"
            referrerpolicy="no-referrer"
            class="object-cover w-full h-full"
          />
        </div>
      }

      <!-- Controls (Only if multiple images) -->
      @if (images().length > 1) {
        <!-- Prev Button -->
        <button
          (click)="prev($event)"
          aria-label="Önceki Görsel"
          class="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/60 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-sm z-10"
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
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        <!-- Next Button -->
        <button
          (click)="next($event)"
          aria-label="Sonraki Görsel"
          class="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/60 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-sm z-10"
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
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>

        <!-- Dots -->
        <div
          class="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10"
        >
          @for (img of images(); track img; let i = $index) {
            <button
              (click)="goTo($event, i)"
              aria-label="Görsele Git"
              class="w-2 h-2 rounded-full transition-all shadow-sm"
              [class.bg-white]="i === currentIndex()"
              [class.w-4]="i === currentIndex()"
              [class.bg-white/50]="i !== currentIndex()"
            ></button>
          }
        </div>
      }

      <!-- Fullscreen Gallery Modal -->
      @if (showGallery()) {
        <div
          class="fixed inset-0 z-[9999] bg-black/95 flex flex-col items-center justify-center"
          (click)="closeGallery($event)"
        >
          <!-- Close Button -->
          <button
            (click)="closeGallery($event)"
            aria-label="Kapat"
            class="absolute top-6 right-6 text-white/70 hover:text-white transition-colors z-50"
          >
            <svg
              class="w-8 h-8"
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

          <!-- Main Image -->
          <div
            class="relative w-full h-full flex items-center justify-center p-4 md:p-12"
            (click)="$event.stopPropagation()"
          >
            <img
              [src]="images()[currentIndex()]"
              [alt]="altText()"
              class="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
            />

            <!-- Gallery Controls -->
            @if (images().length > 1) {
              <button
                (click)="prev($event)"
                aria-label="Önceki Görsel"
                class="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-4 rounded-full backdrop-blur-md transition-all"
              >
                <svg
                  class="w-8 h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <button
                (click)="next($event)"
                aria-label="Sonraki Görsel"
                class="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-4 rounded-full backdrop-blur-md transition-all"
              >
                <svg
                  class="w-8 h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            }
          </div>

          <!-- Thumbnails / Counter -->
          <div
            class="absolute bottom-8 left-0 right-0 flex flex-col items-center gap-4 px-4"
          >
            <span
              class="text-white/50 text-sm font-bold tracking-widest uppercase"
              >{{ currentIndex() + 1 }} / {{ images().length }}</span
            >
            <div
              class="flex gap-2 overflow-x-auto max-w-full pb-2 custom-scrollbar"
            >
              @for (img of images(); track img; let i = $index) {
                <button
                  (click)="goTo($event, i)"
                  aria-label="Görsele Git"
                  class="w-16 h-12 rounded-md overflow-hidden border-2 transition-all shrink-0"
                  [class.border-blue-500]="i === currentIndex()"
                  [class.border-transparent]="i !== currentIndex()"
                  [class.opacity-50]="i !== currentIndex()"
                >
                  <img [src]="img" class="w-full h-full object-cover" />
                </button>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class CarImageCarouselComponent {
  images = input.required<string[]>();
  altText = input<string>("Car Image");
  disableInternalGallery = input<boolean>(false);
  imageClick = output<number>();

  currentIndex = signal(0);
  showGallery = signal(false);

  onImageClick(e: Event, index: number) {
    e.stopPropagation();
    this.currentIndex.set(index);
    if (!this.disableInternalGallery()) {
      this.showGallery.set(true);
    }
    this.imageClick.emit(index);
  }

  closeGallery(e: Event) {
    e.stopPropagation();
    this.showGallery.set(false);
  }

  next(e: Event) {
    e.stopPropagation();
    this.currentIndex.update((i) => (i + 1) % this.images().length);
  }

  prev(e: Event) {
    e.stopPropagation();
    this.currentIndex.update(
      (i) => (i - 1 + this.images().length) % this.images().length,
    );
  }

  goTo(e: Event, index: number) {
    e.stopPropagation();
    this.currentIndex.set(index);
  }
}
