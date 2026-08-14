import { CommonModule } from "@angular/common";
import { Component, Input, OnChanges, SimpleChanges, inject, signal } from "@angular/core";
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
              <p class="mt-1 text-sm text-slate-400">Yüklenen veya kaynak bilgisiyle doğrulanan videolar.</p>
            </div>
            <span class="rounded-full border border-slate-700 px-3 py-1 text-xs font-bold text-slate-300">{{ videos().length }} video</span>
          </div>
          <div class="grid gap-5 lg:grid-cols-2">
            @for (video of videos(); track video.id) {
              <article class="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl">
                <video
                  [src]="video.url"
                  [poster]="video.posterUrl"
                  controls
                  playsinline
                  preload="metadata"
                  class="aspect-video w-full bg-black object-contain"
                  [attr.aria-label]="video.altText || 'Video'"
                ></video>
                <div class="p-4">
                  <strong class="block text-sm text-white">{{ video.altText || 'Araç / tur videosu' }}</strong>
                  @if (video.sourceName || video.attribution || video.license) {
                    <p class="mt-2 text-xs leading-relaxed text-slate-400">
                      {{ video.sourceName || 'Kaynak' }}
                      @if (video.attribution) { · {{ video.attribution }} }
                      @if (video.license) { · {{ video.license }} }
                    </p>
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
  readonly videos = signal<CatalogMediaItem[]>([]);

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes["entityId"] || changes["entityType"]) && this.entityId) {
      void this.load();
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
