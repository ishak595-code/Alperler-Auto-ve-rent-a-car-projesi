import { CommonModule } from "@angular/common";
import { Component, HostListener, Input, OnChanges, SimpleChanges, inject, signal } from "@angular/core";
import { MatIconModule } from "@angular/material/icon";
import { CatalogEntityType, CatalogMediaItem, CatalogMediaService } from "../services/catalog-media.service";

type GalleryItem = {
  id: string;
  type: "IMAGE" | "VIDEO";
  url: string;
  posterUrl?: string;
  alt: string;
  attribution?: string;
};

@Component({
  selector: "app-catalog-mixed-gallery",
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    @if (items().length) {
      <button
        type="button"
        (click)="open(0)"
        class="fixed bottom-24 right-4 z-40 flex min-h-12 items-center gap-2 rounded-full bg-slate-950 px-4 font-black text-white shadow-2xl ring-1 ring-white/20 hover:bg-slate-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500 lg:bottom-8 lg:right-8"
        [attr.aria-label]="items().length + ' fotoğraf ve videoyu aç'"
      >
        <mat-icon>photo_library</mat-icon>
        Medya {{ items().length }}/{{ mediaPolicy().maxItemsPerEntity }}
      </button>
    }

    @if (isOpen()) {
      <div
        class="fixed inset-0 z-[200] flex flex-col bg-black text-white"
        role="dialog"
        aria-modal="true"
        aria-label="Fotoğraf ve video galerisi"
      >
        <header class="flex min-h-16 items-center justify-between gap-4 border-b border-white/10 bg-black/90 px-4 backdrop-blur">
          <div class="min-w-0">
            <strong class="block truncate text-sm">Fotoğraf & Video Galerisi</strong>
            <span class="text-xs text-white/60">{{ activeIndex() + 1 }} / {{ items().length }}</span>
          </div>
          <button type="button" (click)="close()" class="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Galeriyi kapat">
            <mat-icon>close</mat-icon>
          </button>
        </header>

        <div
          class="flex flex-1 snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-smooth"
          (scroll)="onScroll($event)"
        >
          @for (item of items(); track item.id; let i = $index) {
            <section class="flex min-w-full snap-center flex-col items-center justify-center px-2 py-3 sm:px-6">
              <div class="relative flex w-full max-w-6xl flex-1 items-center justify-center overflow-hidden rounded-2xl bg-slate-950">
                @if (item.type === 'VIDEO') {
                  <video
                    [src]="item.url"
                    [poster]="item.posterUrl"
                    controls
                    playsinline
                    preload="metadata"
                    class="max-h-[72dvh] w-full object-contain"
                    [attr.aria-label]="item.alt || 'Galeri videosu'"
                  ></video>
                } @else {
                  <img
                    [src]="item.url"
                    [alt]="item.alt"
                    class="max-h-[72dvh] w-full object-contain"
                    referrerpolicy="no-referrer"
                  />
                }
                @if (item.type === 'VIDEO') {
                  <span class="absolute left-3 top-3 rounded-full bg-red-600 px-3 py-1 text-[10px] font-black tracking-wider">VİDEO</span>
                }
              </div>
              <div class="mt-3 w-full max-w-6xl px-1 text-sm text-white/80">
                <p class="font-bold text-white">{{ item.alt || (item.type === 'VIDEO' ? 'Video' : 'Fotoğraf') }}</p>
                @if (item.attribution) { <p class="mt-1 text-xs text-white/50">{{ item.attribution }}</p> }
              </div>
            </section>
          }
        </div>

        <footer class="border-t border-white/10 bg-black/90 px-3 py-3">
          <div class="mx-auto flex max-w-6xl gap-2 overflow-x-auto pb-1">
            @for (item of items(); track item.id; let i = $index) {
              <button
                type="button"
                (click)="goTo(i)"
                class="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2"
                [class.border-blue-500]="activeIndex() === i"
                [class.border-transparent]="activeIndex() !== i"
                [attr.aria-label]="(i + 1) + '. medyaya git'"
              >
                @if (item.type === 'VIDEO') {
                  @if (item.posterUrl) { <img [src]="item.posterUrl" alt="" class="h-full w-full object-cover" /> }
                  <span class="absolute inset-0 flex items-center justify-center bg-black/40"><mat-icon>play_circle</mat-icon></span>
                } @else {
                  <img [src]="item.url" alt="" class="h-full w-full object-cover" referrerpolicy="no-referrer" />
                }
              </button>
            }
          </div>
        </footer>
      </div>
    }
  `,
})
export class CatalogMixedGalleryComponent implements OnChanges {
  @Input({ required: true }) entityType: CatalogEntityType = "VEHICLE";
  @Input({ required: true }) entityId = "";
  @Input() fallbackImages: string[] = [];
  @Input() fallbackAlt = "Galeri görseli";

  private readonly media = inject(CatalogMediaService);
  readonly mediaPolicy = this.media.policy;
  readonly items = signal<GalleryItem[]>([]);
  readonly isOpen = signal(false);
  readonly activeIndex = signal(0);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["entityId"] || changes["entityType"] || changes["fallbackImages"]) void this.reload();
  }

  open(index: number): void {
    this.activeIndex.set(Math.max(0, Math.min(index, this.items().length - 1)));
    this.isOpen.set(true);
    queueMicrotask(() => this.goTo(this.activeIndex(), false));
  }

  close(): void {
    this.pauseVideos();
    this.isOpen.set(false);
  }

  goTo(index: number, smooth = true): void {
    this.activeIndex.set(index);
    const scroller = document.querySelector<HTMLElement>("app-catalog-mixed-gallery [role='dialog'] .snap-x");
    if (!scroller) return;
    scroller.scrollTo({ left: scroller.clientWidth * index, behavior: smooth ? "smooth" : "auto" });
  }

  onScroll(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.clientWidth) return;
    const index = Math.round(target.scrollLeft / target.clientWidth);
    if (index !== this.activeIndex()) {
      this.activeIndex.set(index);
      this.pauseVideos(index);
    }
  }

  @HostListener("document:keydown.escape") onEscape(): void {
    if (this.isOpen()) this.close();
  }

  private async reload(): Promise<void> {
    await this.media.refreshPolicy();
    const maxItems = this.mediaPolicy().maxItemsPerEntity;
    const fallback = this.fallbackImages.filter(Boolean).slice(0, maxItems).map((url, index): GalleryItem => ({
      id: `legacy-${index}-${url}`,
      type: "IMAGE",
      url,
      alt: this.fallbackAlt,
    }));
    if (!this.entityId) {
      this.items.set(this.dedupe(fallback).slice(0, maxItems));
      return;
    }
    try {
      const cloud = await this.media.load(this.entityType, this.entityId);
      const mediaRows: GalleryItem[] = cloud.map((item: CatalogMediaItem) => ({
        id: item.id,
        type: item.kind,
        url: item.url,
        posterUrl: item.posterUrl,
        alt: item.altText || this.fallbackAlt,
        attribution: [item.sourceName, item.attribution, item.license].filter(Boolean).join(" · ") || undefined,
      }));
      this.items.set(this.dedupe([...mediaRows, ...fallback]).slice(0, maxItems));
    } catch {
      this.items.set(this.dedupe(fallback).slice(0, maxItems));
    }
  }

  private dedupe(items: GalleryItem[]): GalleryItem[] {
    const seen = new Set<string>();
    return items.filter((item) => {
      const key = item.url.trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private pauseVideos(exceptIndex = -1): void {
    document.querySelectorAll<HTMLVideoElement>("app-catalog-mixed-gallery video").forEach((video, index) => {
      if (index !== exceptIndex) video.pause();
    });
  }
}
