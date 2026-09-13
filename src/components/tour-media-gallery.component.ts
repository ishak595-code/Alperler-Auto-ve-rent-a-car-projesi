import { CommonModule } from "@angular/common";
import { Component, computed, inject, input, signal } from "@angular/core";
import { DomSanitizer, SafeResourceUrl } from "@angular/platform-browser";
import { MatIconModule } from "@angular/material/icon";
import { Tour } from "../models/car.model";
import { UiService } from "../services/ui.service";

interface GallerySlide {
  key: string;
  kind: "IMAGE" | "VIDEO";
  url: string;
  posterUrl?: string;
  title: string;
  attribution?: string;
}

@Component({
  selector: "app-tour-media-gallery",
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    @if (slides().length > 1 || hasVideo()) {
      <section class="mx-auto max-w-5xl px-4 pt-8 sm:px-6" aria-labelledby="tour-gallery-title">
        <div class="mb-4 flex items-end justify-between gap-4">
          <div>
            <p class="text-[10px] font-black uppercase tracking-[.18em] text-prestige-red">{{ t().tourMedia.kicker }}</p>
            <h3 id="tour-gallery-title" class="mt-1 text-xl font-black text-slate-950 sm:text-2xl">{{ t().tourMedia.title }}</h3>
          </div>
          <span class="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-600">{{ safeActiveIndex() + 1 }} / {{ slides().length }}</span>
        </div>

        @if (activeSlide(); as slide) {
          <div class="overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 shadow-xl">
            <div class="relative aspect-video w-full bg-black">
              @if (slide.kind === 'VIDEO') {
                @if (isYouTube(slide.url)) {
                  <iframe
                    class="h-full w-full"
                    [src]="youTubeEmbedUrl(slide.url)"
                    [title]="slide.title"
                    loading="lazy"
                    referrerpolicy="strict-origin-when-cross-origin"
                    allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowfullscreen
                  ></iframe>
                } @else {
                  <video
                    class="h-full w-full object-contain"
                    [src]="slide.url"
                    [poster]="slide.posterUrl || ''"
                    controls
                    playsinline
                    preload="metadata"
                    [attr.aria-label]="slide.title"
                  >
                    {{ t().tourMedia.videoUnsupported }}
                  </video>
                }
              } @else {
                <img [src]="slide.url" [alt]="slide.title" class="h-full w-full object-cover" loading="eager" decoding="async" />
              }
            </div>
            @if (slide.attribution) {
              <p class="border-t border-white/10 px-4 py-2 text-[10px] leading-4 text-slate-400">{{ attributionLabel(slide.attribution) }}</p>
            }
          </div>
        }

        @if (slides().length > 1) {
          <div class="mt-3 flex snap-x gap-2 overflow-x-auto pb-2" [attr.aria-label]="t().tourMedia.thumbsAria">
            @for (slide of slides(); track slide.key; let index = $index) {
              <button
                type="button"
                (click)="activeIndex.set(index)"
                [attr.aria-label]="thumbAria(slide)"
                [attr.aria-current]="safeActiveIndex() === index ? 'true' : null"
                class="relative min-h-16 min-w-24 snap-start overflow-hidden rounded-xl border-2 bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-prestige-red-light"
                [class.border-blue-600]="safeActiveIndex() === index"
                [class.border-transparent]="safeActiveIndex() !== index"
              >
                @if (slide.kind === 'VIDEO') {
                  @if (slide.posterUrl) {
                    <img [src]="slide.posterUrl" alt="" class="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                  }
                  <span class="absolute inset-0 flex items-center justify-center bg-slate-950/45 text-white"><mat-icon aria-hidden="true">play_circle</mat-icon></span>
                } @else {
                  <img [src]="slide.url" alt="" class="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                }
              </button>
            }
          </div>
        }
      </section>
    }
  `,
})
export class TourMediaGalleryComponent {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly ui = inject(UiService);
  readonly t = this.ui.translations;
  readonly tour = input.required<Tour>();
  readonly activeIndex = signal(0);

  readonly slides = computed<GallerySlide[]>(() => {
    const tour = this.tour();
    const seen = new Set<string>();
    const slides: GallerySlide[] = [];
    const images = [tour.image, ...(tour.images || []), ...(tour.gallery || [])]
      .filter((value): value is string => typeof value === "string" && value.startsWith("https://"));

    for (const url of images) {
      if (seen.has(`IMAGE:${url}`)) continue;
      seen.add(`IMAGE:${url}`);
      const fallback = this.t().tourMedia.tourFallback;
      slides.push({
        key: `IMAGE:${url}`,
        kind: "IMAGE",
        url,
        title: String(this.t().tourMedia.photoTitle || "").replace("{title}", String(tour.title || fallback)),
      });
    }

    for (const video of tour.videos || []) {
      if (!video.url?.startsWith("https://") || seen.has(`VIDEO:${video.url}`)) continue;
      seen.add(`VIDEO:${video.url}`);
      slides.push({
        key: `VIDEO:${video.url}`,
        kind: "VIDEO",
        url: video.url,
        posterUrl: video.posterUrl,
        title: video.title || String(this.t().tourMedia.videoTitle || "").replace("{title}", String(tour.title || this.t().tourMedia.tourFallback)),
        attribution: video.attribution,
      });
    }
    return slides;
  });

  readonly safeActiveIndex = computed(() =>
    Math.min(this.activeIndex(), Math.max(0, this.slides().length - 1)),
  );

  readonly activeSlide = computed(() => this.slides()[this.safeActiveIndex()] || null);
  readonly hasVideo = computed(() => this.slides().some((slide) => slide.kind === "VIDEO"));

  attributionLabel(value?: string): string {
    return String(this.t().tourMedia.attribution || "").replace("{value}", String(value || ""));
  }

  thumbAria(slide: GallerySlide): string {
    const key = slide.kind === "VIDEO" ? "openVideoAria" : "openPhotoAria";
    return String((this.t().tourMedia as any)[key] || "").replace("{title}", slide.title);
  }

  isYouTube(url: string): boolean {
    return Boolean(this.youtubeId(url));
  }

  youTubeEmbedUrl(url: string): SafeResourceUrl {
    const id = this.youtubeId(url);
    if (!id) return this.sanitizer.bypassSecurityTrustResourceUrl("about:blank");
    return this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?rel=0`);
  }

  private youtubeId(value: string): string {
    try {
      const url = new URL(value);
      if (url.hostname === "youtu.be") return url.pathname.replace(/^\//, "").split("/")[0]?.slice(0, 32) || "";
      if (url.hostname === "www.youtube.com" || url.hostname === "youtube.com" || url.hostname === "m.youtube.com") {
        if (url.pathname === "/watch") return (url.searchParams.get("v") || "").slice(0, 32);
        if (url.pathname.startsWith("/embed/") || url.pathname.startsWith("/shorts/")) return url.pathname.split("/")[2]?.slice(0, 32) || "";
      }
    } catch {
      return "";
    }
    return "";
  }
}
