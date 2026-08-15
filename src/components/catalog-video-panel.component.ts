import { CommonModule } from "@angular/common";
import { Component, Input, OnChanges, SimpleChanges, inject, signal } from "@angular/core";
import { DomSanitizer, SafeResourceUrl } from "@angular/platform-browser";
import { MatIconModule } from "@angular/material/icon";
import {
  CatalogEntityType,
  CatalogMediaItem,
  CatalogMediaService,
} from "../services/catalog-media.service";

@Component({
  selector: "app-catalog-video-panel",
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    @if (videos().length) {
      <section class="bg-slate-950 px-4 py-8 text-white sm:py-10" aria-labelledby="catalog-video-title">
        <div class="mx-auto max-w-6xl">
          <div class="mb-5 flex items-end justify-between gap-4">
            <div>
              <p class="text-[10px] font-black uppercase tracking-[.2em] text-blue-400">Doğrulanmış medya</p>
              <h2 id="catalog-video-title" class="mt-1 text-2xl font-black sm:text-3xl">Video Galerisi</h2>
              <p class="mt-1 text-sm text-slate-400">İşletme tarafından yüklenen veya kaynak bilgisiyle eklenen videolar.</p>
            </div>
            <span class="rounded-full border border-slate-700 px-3 py-1 text-xs font-bold text-slate-300">{{ videos().length }} video</span>
          </div>
          <div class="grid gap-5 lg:grid-cols-2">
            @for (video of videos(); track video.id) {
              <article class="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl">
                @if (isYouTube(video.url)) {
                  <div class="aspect-video w-full bg-black">
                    <iframe
                      [src]="safeYouTubeUrl(video.url)"
                      [title]="video.altText || 'YouTube videosu'"
                      class="h-full w-full border-0"
                      loading="lazy"
                      referrerpolicy="strict-origin-when-cross-origin"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowfullscreen
                    ></iframe>
                  </div>
                } @else {
                  <video
                    [src]="video.url"
                    [poster]="video.posterUrl"
                    controls
                    playsinline
                    preload="metadata"
                    class="aspect-video w-full bg-black object-contain"
                    [attr.aria-label]="video.altText || 'Video'"
                  ></video>
                }
                <div class="p-4">
                  <strong class="block text-sm text-white">{{ video.altText || 'Araç / tur videosu' }}</strong>
                  @if (video.sourceName || video.attribution || video.license) {
                    <p class="mt-2 text-xs leading-relaxed text-slate-400">
                      {{ video.sourceName || 'Kaynak' }}
                      @if (video.attribution) { · {{ video.attribution }} }
                      @if (video.license) { · {{ video.license }} }
                    </p>
                  }
                  @if (video.sourceUrl) {
                    <a [href]="video.sourceUrl" target="_blank" rel="noopener noreferrer" class="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-700 px-3 text-xs font-black text-slate-200 hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
                      <mat-icon class="!h-4 !w-4 !text-[16px]">open_in_new</mat-icon>
                      Kaynağı aç
                    </a>
                  }
                </div>
              </article>
            }
          </div>
        </div>
      </section>
    }
  `,
})
export class CatalogVideoPanelComponent implements OnChanges {
  @Input({ required: true }) entityType: CatalogEntityType = "VEHICLE";
  @Input({ required: true }) entityId = "";

  private readonly media = inject(CatalogMediaService);
  private readonly sanitizer = inject(DomSanitizer);
  readonly videos = signal<CatalogMediaItem[]>([]);
  private readonly youtubeCache = new Map<string, SafeResourceUrl>();

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes["entityId"] || changes["entityType"]) && this.entityId) {
      void this.load();
    }
  }

  isYouTube(url: string): boolean {
    return Boolean(this.youtubeId(url));
  }

  safeYouTubeUrl(url: string): SafeResourceUrl {
    const cached = this.youtubeCache.get(url);
    if (cached) return cached;
    const id = this.youtubeId(url);
    if (!id) return this.sanitizer.bypassSecurityTrustResourceUrl("about:blank");
    const safe = this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`,
    );
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
    } catch {
      return null;
    }
  }

  private async load(): Promise<void> {
    try {
      const items = await this.media.load(this.entityType, this.entityId);
      this.videos.set(items.filter((item) => item.kind === "VIDEO" && item.isActive));
    } catch (error) {
      console.warn("Catalog video panel could not load media", error);
      this.videos.set([]);
    }
  }
}
