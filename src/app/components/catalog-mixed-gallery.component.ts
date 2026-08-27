import { CommonModule } from "@angular/common";
import { Component, ElementRef, HostListener, Input, OnChanges, SimpleChanges, ViewChild, computed, inject, signal } from "@angular/core";
import { MatIconModule } from "@angular/material/icon";
import { PublicCatalogMediaItem, PublicCatalogMediaOwnerType, PublicCatalogMediaService } from "../services/public-catalog-media.service";

type GalleryItem = {
  id: string;
  type: "IMAGE" | "VIDEO";
  url: string;
  posterUrl?: string;
  alt: string;
  attribution?: string;
  sourceUrl?: string;
  isCover?: boolean;
  sortOrder?: number;
};

@Component({
  selector: "app-catalog-mixed-gallery",
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <section class="catalog-gallery" [attr.aria-label]="galleryLabel">
      @if (activeItem(); as item) {
        <div class="hero">
          @if (item.type === 'VIDEO') {
            <video
              #heroVideo
              [src]="item.url"
              [poster]="item.posterUrl"
              controls
              playsinline
              preload="metadata"
              [attr.aria-label]="item.alt || 'Galeri videosu'"
            ></video>
          } @else {
            <button type="button" class="hero-open" (click)="open(activeIndex())" [attr.aria-label]="(item.alt || fallbackAlt) + ', tam ekran aç'">
              <img [src]="item.url" [alt]="item.alt || fallbackAlt" loading="eager" fetchpriority="high" decoding="async" />
            </button>
          }

          <div class="hero-shade" aria-hidden="true"></div>
          @if (badge || title || subtitle) {
            <div class="hero-copy">
              @if (badge) { <b>{{ badge }}</b> }
              @if (title) { <h2>{{ title }}</h2> }
              @if (subtitle) { <span>{{ subtitle }}</span> }
            </div>
          }

          <div class="hero-controls">
            <span class="counter" aria-live="polite">{{ activeIndex() + 1 }} / {{ items().length }}</span>
            <div class="buttons">
              @if (items().length > 1) {
                <button type="button" (click)="previous(); $event.stopPropagation()" aria-label="Önceki medya"><mat-icon aria-hidden="true">chevron_left</mat-icon></button>
                <button type="button" (click)="next(); $event.stopPropagation()" aria-label="Sonraki medya"><mat-icon aria-hidden="true">chevron_right</mat-icon></button>
              }
              <button type="button" (click)="open(activeIndex()); $event.stopPropagation()" aria-label="Fotoğraf ve videoları tam ekran aç"><mat-icon aria-hidden="true">fullscreen</mat-icon></button>
            </div>
          </div>
        </div>
      } @else {
        <div class="empty"><mat-icon aria-hidden="true">perm_media</mat-icon><strong>Medya henüz eklenmedi</strong></div>
      }
    </section>

    <dialog #dialog class="lightbox" (close)="onDialogClosed()" aria-labelledby="catalog-gallery-title">
      <div class="lightbox-shell">
        <header>
          <div>
            <strong id="catalog-gallery-title">Fotoğraf ve Video Galerisi</strong>
            <span aria-live="polite">{{ activeIndex() + 1 }} / {{ items().length }}</span>
          </div>
          <button #closeButton type="button" (click)="close()" aria-label="Tam ekran galeriyi kapat"><mat-icon aria-hidden="true">close</mat-icon></button>
        </header>

        @if (activeItem(); as item) {
          <div class="lightbox-media">
            @if (item.type === 'VIDEO') {
              <video #dialogVideo [src]="item.url" [poster]="item.posterUrl" controls playsinline preload="metadata" [attr.aria-label]="item.alt || 'Galeri videosu'"></video>
            } @else {
              <img [src]="item.url" [alt]="item.alt || fallbackAlt" decoding="async" />
            }
            @if (items().length > 1) {
              <button type="button" class="nav previous" (click)="previous()" aria-label="Önceki medya"><mat-icon aria-hidden="true">chevron_left</mat-icon></button>
              <button type="button" class="nav next" (click)="next()" aria-label="Sonraki medya"><mat-icon aria-hidden="true">chevron_right</mat-icon></button>
            }
          </div>
          <div class="meta">
            <strong>{{ item.alt || fallbackAlt }}</strong>
            @if (item.attribution) { <span>{{ item.attribution }}</span> }
            @if (item.sourceUrl) { <a [href]="item.sourceUrl" target="_blank" rel="noopener noreferrer">Kaynak bilgisi</a> }
          </div>
        }

        @if (items().length > 1) {
          <footer aria-label="Galeri küçük görselleri">
            @for (item of items(); track item.id; let i = $index) {
              <button type="button" (click)="goTo(i)" [class.active]="activeIndex() === i" [attr.aria-label]="(i + 1) + '. medyaya git'">
                @if (item.type === 'VIDEO') {
                  @if (item.posterUrl) { <img [src]="item.posterUrl" alt="" loading="lazy" /> }
                  <span class="video-thumb"><mat-icon aria-hidden="true">play_circle</mat-icon></span>
                } @else {
                  <img [src]="item.url" alt="" loading="lazy" />
                }
              </button>
            }
          </footer>
        }
      </div>
    </dialog>
  `,
  styles: [`
    :host{display:block}.catalog-gallery{position:relative;width:100%;background:#020617;color:#fff}.hero{position:relative;width:min(100%,1180px);margin:auto;aspect-ratio:16/10;overflow:hidden;background:#020617}.hero>video,.hero-open,.hero-open img{display:block;width:100%;height:100%}.hero>video,.hero-open img{object-fit:cover}.hero-open{border:0;background:#020617;padding:0;cursor:zoom-in}.hero-shade{pointer-events:none;position:absolute;inset:0;background:linear-gradient(to top,rgba(2,6,23,.76),transparent 54%)}.hero-copy{pointer-events:none;position:absolute;left:18px;right:92px;bottom:66px}.hero-copy b{display:inline-block;border-radius:999px;background:#fbbf24;padding:5px 8px;color:#451a03;font-size:8px;font-weight:950}.hero-copy h2{margin:6px 0 0;font:900 clamp(25px,7vw,48px)/1 Georgia,serif}.hero-copy span{display:block;margin-top:7px;color:#dbeafe;font-size:10px}.hero-controls{position:absolute;left:12px;right:12px;bottom:12px;display:flex;align-items:center;justify-content:space-between;gap:8px;pointer-events:none}.counter{border-radius:999px;background:rgba(2,6,23,.82);padding:7px 10px;font-size:10px;font-weight:950}.buttons{display:flex;gap:6px;pointer-events:auto}.buttons button,.lightbox header button,.nav{display:grid;width:44px;height:44px;place-items:center;border:1px solid rgba(255,255,255,.16);border-radius:50%;background:rgba(2,6,23,.82);color:#fff;cursor:pointer}.empty{display:grid;min-height:300px;place-content:center;gap:7px;text-align:center;color:#94a3b8}.empty mat-icon{margin:auto}.lightbox{width:100vw;max-width:none;height:100dvh;max-height:none;margin:0;border:0;background:#000;padding:0;color:#fff}.lightbox::backdrop{background:#000}.lightbox-shell{display:grid;height:100dvh;grid-template-rows:auto minmax(0,1fr) auto auto;background:#000}.lightbox header{display:flex;min-height:64px;align-items:center;justify-content:space-between;gap:12px;border-bottom:1px solid rgba(255,255,255,.12);padding:8px 12px;background:#050505}.lightbox header strong,.lightbox header span{display:block}.lightbox header strong{font-size:13px}.lightbox header span{margin-top:2px;color:#a3a3a3;font-size:10px}.lightbox-media{position:relative;display:flex;min-height:0;align-items:center;justify-content:center;overflow:hidden;background:#000}.lightbox-media>img,.lightbox-media>video{max-width:100%;max-height:100%;object-fit:contain}.nav{position:absolute;top:50%;transform:translateY(-50%);background:rgba(0,0,0,.64)}.nav.previous{left:10px}.nav.next{right:10px}.meta{display:flex;min-height:52px;flex-wrap:wrap;align-items:center;gap:7px 14px;border-top:1px solid rgba(255,255,255,.08);padding:8px 12px;color:#d4d4d4}.meta strong{font-size:11px}.meta span,.meta a{font-size:9px}.meta a{color:#93c5fd;font-weight:800}.lightbox footer{display:flex;gap:7px;overflow-x:auto;border-top:1px solid rgba(255,255,255,.1);padding:8px 10px calc(8px + env(safe-area-inset-bottom));background:#050505}.lightbox footer button{position:relative;width:82px;height:54px;flex:0 0 auto;overflow:hidden;border:2px solid transparent;border-radius:8px;background:#171717;padding:0}.lightbox footer button.active{border-color:#60a5fa}.lightbox footer img{width:100%;height:100%;object-fit:cover}.video-thumb{position:absolute;inset:0;display:grid;place-items:center;background:rgba(0,0,0,.42);color:#fff}.video-thumb mat-icon{width:26px;height:26px;font-size:26px}button:focus-visible,a:focus-visible{outline:3px solid #60a5fa;outline-offset:2px}@media(min-width:760px){.hero{aspect-ratio:16/9}.hero-copy{bottom:70px}}@media(min-width:1000px){.hero{aspect-ratio:21/9}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
  `],
})
export class CatalogMixedGalleryComponent implements OnChanges {
  @Input({ required: true }) entityType: PublicCatalogMediaOwnerType = "VEHICLE";
  @Input({ required: true }) entityId = "";
  @Input() fallbackImages: string[] = [];
  @Input() fallbackVideos: Array<{ url: string; posterUrl?: string; title?: string; attribution?: string }> = [];
  @Input() fallbackAlt = "Galeri medyası";
  @Input() galleryLabel = "Fotoğraf ve video galerisi";
  @Input() badge = "";
  @Input() title = "";
  @Input() subtitle = "";

  @ViewChild("dialog") private dialogRef?: ElementRef<HTMLDialogElement>;
  @ViewChild("closeButton") private closeButtonRef?: ElementRef<HTMLButtonElement>;

  private readonly media = inject(PublicCatalogMediaService);
  readonly items = signal<GalleryItem[]>([]);
  readonly activeIndex = signal(0);
  readonly activeItem = computed(() => this.items()[Math.min(this.activeIndex(), Math.max(0, this.items().length - 1))] || null);
  private previousFocus: HTMLElement | null = null;
  private loadVersion = 0;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["entityId"] || changes["entityType"] || changes["fallbackImages"] || changes["fallbackVideos"] || changes["fallbackAlt"]) void this.reload();
  }

  open(index = this.activeIndex()): void {
    if (!this.items().length || typeof document === "undefined") return;
    this.previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.goTo(index);
    const dialog = this.dialogRef?.nativeElement;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    queueMicrotask(() => this.closeButtonRef?.nativeElement.focus({ preventScroll: true }));
  }

  close(): void {
    this.pauseVideos();
    this.dialogRef?.nativeElement.close();
  }

  onDialogClosed(): void {
    this.pauseVideos();
    const focus = this.previousFocus;
    this.previousFocus = null;
    queueMicrotask(() => focus?.focus({ preventScroll: true }));
  }

  previous(): void {
    const length = this.items().length;
    if (length < 2) return;
    this.goTo((this.activeIndex() - 1 + length) % length);
  }

  next(): void {
    const length = this.items().length;
    if (length < 2) return;
    this.goTo((this.activeIndex() + 1) % length);
  }

  goTo(index: number): void {
    const length = this.items().length;
    if (!length) return;
    this.pauseVideos();
    this.activeIndex.set(Math.max(0, Math.min(index, length - 1)));
  }

  @HostListener("document:keydown", ["$event"])
  onKeydown(event: KeyboardEvent): void {
    if (!this.dialogRef?.nativeElement.open) return;
    if (event.key === "ArrowLeft") { event.preventDefault(); this.previous(); }
    if (event.key === "ArrowRight") { event.preventDefault(); this.next(); }
  }

  private async reload(): Promise<void> {
    const version = ++this.loadVersion;
    const fallback = this.fallbackItems();
    this.items.set(fallback);
    this.activeIndex.set(0);
    const ownerId = String(this.entityId || "").trim();
    if (!ownerId) return;
    try {
      const cloud = await this.media.load(this.entityType, ownerId);
      if (version !== this.loadVersion) return;
      const canonical = cloud
        .map((item) => this.fromCloud(item))
        .sort((a, b) => Number(Boolean(b.isCover)) - Number(Boolean(a.isCover)) || Number(a.sortOrder || 0) - Number(b.sortOrder || 0));
      this.items.set(this.dedupe([...canonical, ...fallback]).slice(0, 30));
      this.activeIndex.set(0);
    } catch {
      if (version === this.loadVersion) this.items.set(fallback);
    }
  }

  private fromCloud(item: PublicCatalogMediaItem): GalleryItem {
    return {
      id: item.id,
      type: item.kind,
      url: item.url,
      posterUrl: item.posterUrl,
      alt: item.altText || this.fallbackAlt,
      attribution: item.attribution || item.sourceName,
      sourceUrl: item.sourceUrl,
      isCover: item.isCover,
      sortOrder: item.sortOrder,
    };
  }

  private fallbackItems(): GalleryItem[] {
    const images = this.fallbackImages.filter(Boolean).map((url, index): GalleryItem => ({ id: `fallback-image-${index}-${url}`, type: "IMAGE", url, alt: this.fallbackAlt, sortOrder: 10_000 + index }));
    const videos = this.fallbackVideos.filter((item) => Boolean(item?.url)).map((item, index): GalleryItem => ({ id: `fallback-video-${index}-${item.url}`, type: "VIDEO", url: item.url, posterUrl: item.posterUrl, alt: item.title || this.fallbackAlt, attribution: item.attribution, sortOrder: 20_000 + index }));
    return this.dedupe([...images, ...videos]).slice(0, 30);
  }

  private dedupe(items: GalleryItem[]): GalleryItem[] {
    const seen = new Set<string>();
    return items.filter((item) => {
      const key = String(item.url || "").trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private pauseVideos(): void {
    if (typeof document === "undefined") return;
    document.querySelectorAll<HTMLVideoElement>("app-catalog-mixed-gallery video").forEach((video) => video.pause());
  }
}
