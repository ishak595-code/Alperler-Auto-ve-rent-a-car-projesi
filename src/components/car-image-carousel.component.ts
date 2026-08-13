import { Component, HostListener, OnDestroy, input, output, signal } from "@angular/core";
import { CommonModule } from "@angular/common";

@Component({
  selector: "app-car-image-carousel",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="relative w-full h-full group overflow-hidden bg-slate-200 touch-pan-y"
      (touchstart)="onTouchStart($event)"
      (touchend)="onTouchEnd($event)"
    >
      @for (img of images(); track $index; let i = $index) {
        <button
          type="button"
          class="absolute inset-0 w-full h-full transition-opacity duration-500 ease-in-out will-change-[opacity] cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset"
          [class.opacity-100]="i === currentIndex()"
          [class.opacity-0]="i !== currentIndex()"
          [class.pointer-events-none]="i !== currentIndex()"
          [attr.tabindex]="i === currentIndex() ? 0 : -1"
          [attr.aria-hidden]="i !== currentIndex()"
          [attr.aria-label]="altText() + ' görselini büyüt'"
          (click)="onImageClick($event, i)"
        >
          <img
            [src]="img"
            [alt]="altText()"
            [loading]="i === 0 ? 'eager' : 'lazy'"
            referrerpolicy="no-referrer"
            class="object-cover w-full h-full"
          />
        </button>
      }

      @if (images().length > 1) {
        <button
          type="button"
          (click)="prev($event)"
          aria-label="Önceki görsel"
          class="absolute left-2 top-1/2 -translate-y-1/2 bg-black/45 hover:bg-black/70 text-white w-11 h-11 flex items-center justify-center rounded-full opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 backdrop-blur-sm z-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <button
          type="button"
          (click)="next($event)"
          aria-label="Sonraki görsel"
          class="absolute right-2 top-1/2 -translate-y-1/2 bg-black/45 hover:bg-black/70 text-white w-11 h-11 flex items-center justify-center rounded-full opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 backdrop-blur-sm z-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <div
          class="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-0.5 z-10 max-w-[75%] overflow-x-auto"
          aria-label="Görsel seçimi"
        >
          @for (img of images(); track $index; let i = $index) {
            <button
              type="button"
              (click)="goTo($event, i)"
              [attr.aria-label]="(i + 1) + '. görsele git'"
              [attr.aria-current]="i === currentIndex() ? 'true' : null"
              class="w-8 h-8 shrink-0 flex items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <span
                class="block h-2 rounded-full transition-all shadow-sm"
                [class.bg-white]="i === currentIndex()"
                [class.w-4]="i === currentIndex()"
                [class.w-2]="i !== currentIndex()"
                [class.bg-white/50]="i !== currentIndex()"
                aria-hidden="true"
              ></span>
            </button>
          }
        </div>
      }

      @if (showGallery()) {
        <div
          class="fixed inset-0 z-[9999] bg-black/95 flex flex-col items-center justify-center"
          role="dialog"
          aria-modal="true"
          [attr.aria-label]="altText() + ' tam ekran galerisi'"
          (click)="closeGallery($event)"
        >
          <span class="sr-only" aria-live="polite">{{ currentIndex() + 1 }} / {{ images().length }} görsel</span>
          <button
            type="button"
            (click)="closeGallery($event)"
            aria-label="Galeriyi kapat"
            class="absolute top-[max(1rem,env(safe-area-inset-top))] right-[max(1rem,env(safe-area-inset-right))] text-white/80 hover:text-white w-12 h-12 flex items-center justify-center rounded-full bg-black/30 transition-colors z-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div
            class="relative w-full h-full flex items-center justify-center p-3 sm:p-4 md:p-12 pb-24"
            (click)="$event.stopPropagation()"
            (touchstart)="onTouchStart($event)"
            (touchend)="onTouchEnd($event)"
          >
            <img
              [src]="images()[currentIndex()]"
              [alt]="altText()"
              class="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
            />

            @if (images().length > 1) {
              <button
                type="button"
                (click)="prev($event)"
                aria-label="Önceki görsel"
                class="absolute left-2 sm:left-4 md:left-8 top-1/2 -translate-y-1/2 bg-black/45 sm:bg-white/10 hover:bg-white/20 text-white w-12 h-12 flex items-center justify-center rounded-full backdrop-blur-md transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                type="button"
                (click)="next($event)"
                aria-label="Sonraki görsel"
                class="absolute right-2 sm:right-4 md:right-8 top-1/2 -translate-y-1/2 bg-black/45 sm:bg-white/10 hover:bg-white/20 text-white w-12 h-12 flex items-center justify-center rounded-full backdrop-blur-md transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            }
          </div>

          <div
            class="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-0 right-0 flex flex-col items-center gap-2 px-4"
          >
            <span class="text-white/70 text-sm font-bold tracking-widest">
              {{ currentIndex() + 1 }} / {{ images().length }}
            </span>
            <div
              class="flex gap-2 overflow-x-auto max-w-full pb-2 custom-scrollbar"
              aria-label="Galeri küçük görselleri"
            >
              @for (img of images(); track $index; let i = $index) {
                <button
                  type="button"
                  (click)="goTo($event, i)"
                  [attr.aria-label]="(i + 1) + '. görseli göster'"
                  [attr.aria-current]="i === currentIndex() ? 'true' : null"
                  class="w-16 h-12 rounded-md overflow-hidden border-2 transition-all shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  [class.border-blue-500]="i === currentIndex()"
                  [class.border-transparent]="i !== currentIndex()"
                  [class.opacity-60]="i !== currentIndex()"
                >
                  <img [src]="img" [alt]="(i + 1) + '. küçük görsel'" class="w-full h-full object-cover" />
                </button>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class CarImageCarouselComponent implements OnDestroy {
  images = input.required<string[]>();
  altText = input<string>("Araç görseli");
  disableInternalGallery = input<boolean>(false);
  imageClick = output<number>();

  currentIndex = signal(0);
  showGallery = signal(false);

  private touchStartX = 0;
  private touchStartY = 0;
  private previousBodyOverflow: string | null = null;
  private lastTrigger: HTMLElement | null = null;

  onImageClick(e: Event, index: number) {
    e.stopPropagation();
    this.currentIndex.set(index);
    this.lastTrigger = e.currentTarget instanceof HTMLElement ? e.currentTarget : null;
    if (!this.disableInternalGallery()) {
      this.showGallery.set(true);
      if (typeof document !== "undefined") {
        if (this.previousBodyOverflow === null) {
          this.previousBodyOverflow = document.body.style.overflow;
        }
        document.body.style.overflow = "hidden";
      }
    }
    this.imageClick.emit(index);
  }

  closeGallery(e?: Event) {
    e?.stopPropagation();
    this.showGallery.set(false);
    this.restoreBodyScroll();
    queueMicrotask(() => this.lastTrigger?.focus());
  }

  next(e?: Event) {
    e?.stopPropagation();
    if (!this.images().length) return;
    this.currentIndex.update((i) => (i + 1) % this.images().length);
  }

  prev(e?: Event) {
    e?.stopPropagation();
    if (!this.images().length) return;
    this.currentIndex.update(
      (i) => (i - 1 + this.images().length) % this.images().length,
    );
  }

  goTo(e: Event, index: number) {
    e.stopPropagation();
    this.currentIndex.set(index);
  }

  onTouchStart(event: TouchEvent) {
    const touch = event.changedTouches[0];
    this.touchStartX = touch?.clientX ?? 0;
    this.touchStartY = touch?.clientY ?? 0;
  }

  onTouchEnd(event: TouchEvent) {
    const touch = event.changedTouches[0];
    const deltaX = (touch?.clientX ?? this.touchStartX) - this.touchStartX;
    const deltaY = (touch?.clientY ?? this.touchStartY) - this.touchStartY;

    if (this.images().length < 2) return;
    if (Math.abs(deltaX) < 45 || Math.abs(deltaY) > Math.abs(deltaX)) return;

    if (deltaX < 0) {
      this.next();
    } else {
      this.prev();
    }
  }

  @HostListener("document:keydown.escape")
  onEscape() {
    if (this.showGallery()) this.closeGallery();
  }

  @HostListener("document:keydown.arrowright")
  onArrowRight() {
    if (this.showGallery()) this.next();
  }

  @HostListener("document:keydown.arrowleft")
  onArrowLeft() {
    if (this.showGallery()) this.prev();
  }

  ngOnDestroy() {
    this.restoreBodyScroll();
  }

  private restoreBodyScroll() {
    if (typeof document !== "undefined" && this.previousBodyOverflow !== null) {
      document.body.style.overflow = this.previousBodyOverflow;
      this.previousBodyOverflow = null;
    }
  }
}
