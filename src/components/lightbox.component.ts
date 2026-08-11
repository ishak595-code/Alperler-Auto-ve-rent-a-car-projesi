import {
  Component,
  input,
  output,
  signal,
  HostListener,
  OnInit,
  OnDestroy,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatIconModule } from "@angular/material/icon";

@Component({
  selector: "app-lightbox",
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div
      class="fixed inset-0 z-[9999] bg-black/95 flex flex-col items-center justify-center p-4 md:p-8 animate-in fade-in duration-300"
      (click)="close.emit()"
    >
      <!-- Close Button -->
      <button
        (click)="close.emit(); $event.stopPropagation()"
        aria-label="Kapat"
        class="absolute top-4 right-4 text-white hover:text-blue-500 transition-colors z-50 p-2 bg-black/50 rounded-full"
      >
        <mat-icon class="text-3xl">close</mat-icon>
      </button>

      <!-- Main Content Area -->
      <div
        class="relative w-full max-w-6xl h-full flex items-center justify-center"
        (click)="$event.stopPropagation()"
      >
        <!-- Prev Button -->
        <button
          *ngIf="items().length > 1"
          (click)="prev($event)"
          aria-label="Önceki Görsel"
          class="absolute left-0 md:-left-16 top-1/2 -translate-y-1/2 text-white hover:text-blue-500 transition-all p-4 z-50"
        >
          <mat-icon class="text-5xl">chevron_left</mat-icon>
        </button>

        <!-- Media Container -->
        <div
          class="w-full h-full flex items-center justify-center overflow-hidden"
        >
          <ng-container [ngSwitch]="currentItem().type">
            <!-- Image -->
            <img
              *ngSwitchCase="'image'"
              [src]="currentItem().url"
              class="max-w-full max-h-full object-contain select-none shadow-2xl animate-in zoom-in-95 duration-300"
              [key]="currentIndex()"
            />

            <!-- Video -->
            <video
              *ngSwitchCase="'video'"
              [src]="currentItem().url"
              controls
              autoplay
              class="max-w-full max-h-full shadow-2xl animate-in zoom-in-95 duration-300"
              [key]="currentIndex()"
            ></video>
          </ng-container>
        </div>

        <!-- Next Button -->
        <button
          *ngIf="items().length > 1"
          (click)="next($event)"
          aria-label="Sonraki Görsel"
          class="absolute right-0 md:-right-16 top-1/2 -translate-y-1/2 text-white hover:text-blue-500 transition-all p-4 z-50"
        >
          <mat-icon class="text-5xl">chevron_right</mat-icon>
        </button>
      </div>

      <!-- Counter & Info -->
      <div class="absolute bottom-8 text-white text-center z-50">
        <p class="text-lg font-medium">
          {{ currentIndex() + 1 }} / {{ items().length }}
        </p>
        <p class="text-slate-400 text-sm mt-1" *ngIf="items().length > 1">
          Klavye ok tuşlarını kullanabilirsiniz
        </p>
      </div>

      <!-- Thumbnails (Optional, but good for UX) -->
      <div
        class="absolute bottom-20 left-0 w-full flex justify-center gap-2 px-4 overflow-x-auto py-2 scrollbar-hide"
        (click)="$event.stopPropagation()"
      >
        <div
          *ngFor="let item of items(); let i = index"
          (click)="goTo(i)"
          class="w-16 h-12 md:w-20 md:h-14 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all cursor-pointer"
          [class.border-blue-500]="i === currentIndex()"
          [class.border-transparent]="i !== currentIndex()"
          [class.opacity-50]="i !== currentIndex()"
        >
          <img
            *ngIf="item.type === 'image'"
            [src]="item.url"
            class="w-full h-full object-cover"
          />
          <div
            *ngIf="item.type === 'video'"
            class="w-full h-full bg-slate-800 flex items-center justify-center"
          >
            <mat-icon class="text-white text-sm">play_circle</mat-icon>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .scrollbar-hide::-webkit-scrollbar {
        display: none;
      }
      .scrollbar-hide {
        -ms-overflow-style: none;
        scrollbar-width: none;
      }
    `,
  ],
})
export class LightboxComponent implements OnInit, OnDestroy {
  items = input.required<{ url: string; type: "image" | "video" }[]>();
  initialIndex = input<number>(0);
  close = output<void>();

  currentIndex = signal(0);

  ngOnInit() {
    this.currentIndex.set(this.initialIndex());
    // Prevent scrolling when lightbox is open
    document.body.style.overflow = "hidden";
  }

  ngOnDestroy() {
    document.body.style.overflow = "";
  }

  currentItem() {
    return this.items()[this.currentIndex()];
  }

  next(e?: Event) {
    if (e) e.stopPropagation();
    this.currentIndex.update((i) => (i + 1) % this.items().length);
  }

  prev(e?: Event) {
    if (e) e.stopPropagation();
    this.currentIndex.update(
      (i) => (i - 1 + this.items().length) % this.items().length,
    );
  }

  goTo(index: number) {
    this.currentIndex.set(index);
  }

  @HostListener("window:keydown", ["$event"])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (event.key === "ArrowRight") {
      this.next();
    } else if (event.key === "ArrowLeft") {
      this.prev();
    } else if (event.key === "Escape") {
      this.close.emit();
    }
  }
}
