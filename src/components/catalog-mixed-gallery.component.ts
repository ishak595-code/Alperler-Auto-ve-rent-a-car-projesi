import { CommonModule } from "@angular/common";
import { Component, HostListener, Input, OnChanges, SimpleChanges, inject, signal } from "@angular/core";
import { DomSanitizer, SafeResourceUrl } from "@angular/platform-browser";
import { MatIconModule } from "@angular/material/icon";
import { CatalogEntityType, CatalogMediaItem, CatalogMediaService } from "../services/catalog-media.service";

type GalleryItem = {
  id: string;
  type: "IMAGE" | "VIDEO";
  url: string;
  posterUrl?: string;
  alt: string;
  attribution?: string;
  sourceUrl?: string;
  verificationScope?: string;
  isCover?: boolean;
  sortOrder?: number;
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
        Medya {{ items().length }}/30
      </button>
    }

    @if (isOpen()) {
      <div class="fixed inset-0 z-[200] flex flex-col bg-black text-white" role="dialog" aria-modal="true" aria-label="Fotoğraf ve video galerisi">
        <header class="flex min-h-16 items-center justify-between gap-4 border-b border-white/10 bg-black/90 px-4 backdrop-blur">
          <div class="min-w-0"><strong class="block truncate text-sm">Fotoğraf & Video Galerisi</strong><span class="text-xs text-white/60">{{ activeIndex() + 1 }} / {{ items().length }}</span></div>
          <button type="button" (click)="close()" class="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white" aria-label="Galeriyi kapat"><mat-icon>close</mat-icon></button>
        </header>

        <div #scroller class="flex flex-1 snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-smooth" (scroll)="onScroll($event)">
          @for (item of items(); track item.id; let i = $index) {
            <section class="flex min-w-full snap-center flex-col items-center justify-center px-2 py-3 sm:px-6">
              <div class="relative flex w-full max-w-6xl flex-1 items-center justify-center overflow-hidden rounded-2xl bg-slate-950">
                @if (item.type === 'VIDEO') {
                  @if (isYouTube(item.url)) {
                    @if (activeIndex() === i) {
                      <iframe
                        [src]="safeYouTubeUrl(item.url)"
                        [title]="item.alt || 'YouTube videosu'"
                        class="aspect-video max-h-[72dvh] w-full border-0 bg-black"
                        loading="lazy"
                        referrerpolicy="strict-origin-when-cross-origin"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowfullscreen
                      ></iframe>
                    } @else {
                      <div class="flex aspect-video w-full items-center justify-center bg-black text-white/70" aria-hidden="true"><mat-icon class="!h-16 !w-16 !text-[64px]">play_circle</mat-icon></div>
                    }
                  } @else {
                    <video [src]="item.url" [poster]="item.posterUrl" controls playsinline preload="metadata" class="max-h-[72dvh] w-full object-contain" [attr.aria-label]="item.alt || 'Galeri videosu'"></video>
                  }
                } @else {
                  <img [src]="item.url" [alt]="item.alt" class="max-h-[72dvh] w-full object-contain" referrerpolicy="no-referrer" />
                }
                <div class="absolute left-3 top-3 flex flex-wrap gap-2">
                  @if (item.type === 'VIDEO') { <span class="rounded-full bg-red-600 px-3 py-1 text-[10px] font-black tracking-wider">VİDEO</span> }
                  @if (verificationLabel(item)) { <span class="rounded-full bg-black/75 px-3 py-1 text-[10px] font-black tracking-wide text-white ring-1 ring-white/25">{{ verificationLabel(item) }}</span> }
                </div>
              </div>
              <div class="mt-3 w-full max-w-6xl px-1 text-sm text-white/80">
                <p class="font-bold text-white">{{ item.alt || (item.type === 'VIDEO' ? 'Video' : 'Fotoğraf') }}</p>
                @if (item.attribution) { <p class="mt-1 text-xs text-white/60">{{ item.attribution }}</p> }
                @if (item.sourceUrl) { <a [href]="item.sourceUrl" target="_blank" rel="noopener noreferrer" class="mt-1 inline-flex min-h-8 items-center text-xs font-bold text-blue-300 underline decoration-blue-300/50 underline-offset-4">Kaynak ve lisans bilgisi</a> }
              </div>
            </section>
          }
        </div>

        <footer class="border-t border-white/10 bg-black/90 px-3 py-3">
          <div class="mx-auto flex max-w-6xl gap-2 overflow-x-auto pb-1">
            @for (item of items(); track item.id; let i = $index) {
              <button type="button" (click)="goTo(i)" class="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400" [class.border-blue-500]="activeIndex() === i" [class.border-transparent]="activeIndex() !== i" [attr.aria-label]="(i + 1) + '. medyaya git, ' + (verificationLabel(item) || 'galeri medyası')">
                @if (item.type === 'VIDEO') {
                  @if (item.posterUrl) { <img [src]="item.posterUrl" alt="" class="h-full w-full object-cover" /> }
                  <span class="absolute inset-0 flex items-center justify-center bg-black/55"><mat-icon>play_circle</mat-icon></span>
                } @else { <img [src]="item.url" alt="" class="h-full w-full object-cover" referrerpolicy="no-referrer" /> }
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
  private readonly sanitizer = inject(DomSanitizer);
  readonly items = signal<GalleryItem[]>([]);
  readonly isOpen = signal(false);
  readonly activeIndex = signal(0);
  private readonly youtubeCache = new Map<string, SafeResourceUrl>();

  ngOnChanges(changes: SimpleChanges): void { if (changes["entityId"] || changes["entityType"] || changes["fallbackImages"]) void this.reload(); }
  open(index: number): void { this.activeIndex.set(Math.max(0, Math.min(index, this.items().length - 1))); this.isOpen.set(true); queueMicrotask(() => this.goTo(this.activeIndex(), false)); }
  close(): void { this.pauseVideos(); this.isOpen.set(false); }
  goTo(index: number, smooth = true): void { this.activeIndex.set(index); this.pauseVideos(index); const scroller = document.querySelector<HTMLElement>("app-catalog-mixed-gallery [role='dialog'] .snap-x"); if (!scroller) return; scroller.scrollTo({ left: scroller.clientWidth * index, behavior: smooth ? "smooth" : "auto" }); }
  onScroll(event: Event): void { const target = event.target as HTMLElement; if (!target.clientWidth) return; const index = Math.round(target.scrollLeft / target.clientWidth); if (index !== this.activeIndex()) { this.activeIndex.set(index); this.pauseVideos(index); } }
  @HostListener("document:keydown.escape") onEscape(): void { if (this.isOpen()) this.close(); }

  isYouTube(url: string): boolean { return Boolean(this.youtubeId(url)); }

  verificationLabel(item: GalleryItem): string {
    const scope = item.verificationScope || "";
    if (this.entityType === "VEHICLE") {
      if (scope === "ACTUAL_ASSET") return item.type === "VIDEO" ? "GERÇEK ARAÇ VİDEOSU" : "GERÇEK ARAÇ FOTOĞRAFI";
      if (scope === "EXACT_MODEL_YEAR") return "AYNI MODEL / YIL REFERANSI";
      if (scope === "MODEL_FAMILY") return "TEMSİLİ MODEL GÖRSELİ";
      if (scope === "REFERENCE") return "REFERANS GÖRSEL";
    }
    if (this.entityType === "TOUR") {
      if (scope === "ACTUAL_ASSET" || scope === "EXACT_LOCATION") return "GERÇEK LOKASYON";
      if (scope === "NEARBY_LOCATION" || scope === "NEARBY_LOCATION_VERIFIED") return "YAKIN LOKASYON";
      if (scope === "REFERENCE") return "REFERANS GÖRSEL";
    }
    return "";
  }

  safeYouTubeUrl(url: string): SafeResourceUrl {
    const cached = this.youtubeCache.get(url);
    if (cached) return cached;
    const id = this.youtubeId(url);
    if (!id) return this.sanitizer.bypassSecurityTrustResourceUrl("about:blank");
    const safe = this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`);
    this.youtubeCache.set(url, safe);
    return safe;
  }

  private youtubeId(url: string): string | null {
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
      let candidate = "";
      if (host === "youtu.be") candidate = parsed.pathname.split("/").filter(Boolean)[0] || "";
      if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
        if (parsed.pathname === "/watch") candidate = parsed.searchParams.get("v") || "";
        else if (parsed.pathname.startsWith("/embed/") || parsed.pathname.startsWith("/shorts/")) candidate = parsed.pathname.split("/")[2] || "";
      }
      return /^[A-Za-z0-9_-]{11}$/.test(candidate) ? candidate : null;
    } catch { return null; }
  }

  private async reload(): Promise<void> {
    const fallback = this.fallbackImages.filter(Boolean).slice(0, 30).map((url, index): GalleryItem => ({ id: `legacy-${index}-${url}`, type: "IMAGE", url, alt: this.fallbackAlt, sortOrder: 10_000 + index }));
    if (!this.entityId) { this.items.set(this.dedupe(fallback).slice(0, 30)); return; }
    try {
      const cloud = await this.media.load(this.entityType, this.entityId);
      const verified: GalleryItem[] = cloud
        .map((item: CatalogMediaItem) => ({
          id: item.id,
          type: item.kind,
          url: item.url,
          posterUrl: item.posterUrl,
          alt: item.altText || this.fallbackAlt,
          attribution: [item.sourceName, item.attribution, item.license].filter(Boolean).join(" · ") || undefined,
          sourceUrl: item.sourceUrl,
          verificationScope: String(item.metadata?.["verificationScope"] || item.metadata?.["verification_status"] || ""),
          isCover: item.isCover,
          sortOrder: item.sortOrder,
        }))
        .sort((a, b) => this.mediaRank(a) - this.mediaRank(b) || Number(Boolean(b.isCover)) - Number(Boolean(a.isCover)) || Number(a.sortOrder || 0) - Number(b.sortOrder || 0));
      this.items.set(this.dedupe([...verified, ...fallback]).slice(0, 30));
    } catch { this.items.set(this.dedupe(fallback).slice(0, 30)); }
  }

  private mediaRank(item: GalleryItem): number {
    const scope = item.verificationScope || "";
    if (this.entityType === "VEHICLE") {
      if (scope === "ACTUAL_ASSET") return 0;
      if (scope === "EXACT_MODEL_YEAR") return 10;
      if (scope === "MODEL_FAMILY") return 20;
      if (scope === "REFERENCE") return 30;
      return 40;
    }
    if (this.entityType === "TOUR") {
      if (scope === "ACTUAL_ASSET" || scope === "EXACT_LOCATION") return 0;
      if (scope === "NEARBY_LOCATION" || scope === "NEARBY_LOCATION_VERIFIED") return 10;
      if (scope === "REFERENCE") return 20;
      return 30;
    }
    return 0;
  }

  private dedupe(items: GalleryItem[]): GalleryItem[] { const seen = new Set<string>(); return items.filter((item) => { const key = item.url.trim(); if (!key || seen.has(key)) return false; seen.add(key); return true; }); }
  private pauseVideos(exceptIndex = -1): void { document.querySelectorAll<HTMLVideoElement>("app-catalog-mixed-gallery video").forEach((video, index) => { if (index !== exceptIndex) video.pause(); }); }
}
