import { Component, Input } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink } from "@angular/router";
import { MatIconModule } from "@angular/material/icon";

@Component({
  selector: "app-premium-showcase-card",
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  host: { class: "block shrink-0 w-[252px] sm:w-[280px]" },
  template: `
    <a
      [routerLink]="route"
      [attr.aria-label]="ariaLabel || title + ' detaylarını aç'"
      class="group flex h-full min-h-[330px] flex-col overflow-hidden rounded-[22px] border border-slate-200 bg-white p-3 shadow-[0_8px_30px_rgba(15,23,42,0.06)] transition-[box-shadow,border-color] duration-200 hover:border-slate-300 hover:shadow-[0_14px_36px_rgba(15,23,42,0.11)] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
    >
      <div class="relative h-[154px] overflow-hidden rounded-[16px] bg-slate-100 sm:h-[168px]">
        <img
          [src]="image"
          [alt]="title"
          loading="lazy"
          decoding="async"
          (error)="imageError($event)"
          class="h-full w-full object-cover transition-transform duration-300 motion-reduce:transition-none group-hover:scale-[1.025] motion-reduce:group-hover:scale-100"
        />
        <div class="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/55 via-transparent to-transparent"></div>

        @if (badge) {
          <span class="absolute left-2.5 top-2.5 max-w-[70%] truncate rounded-full border border-white/20 bg-slate-950/80 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-white backdrop-blur-sm">{{ badge }}</span>
        }

        @if (topMeta) {
          <span class="absolute right-2.5 top-2.5 rounded-full bg-white/92 px-2.5 py-1 text-[10px] font-black text-slate-800 shadow-sm backdrop-blur-sm">{{ topMeta }}</span>
        }

        <div class="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 rounded-full bg-white/92 px-2.5 py-1 text-[10px] font-black text-slate-800 shadow-sm backdrop-blur-sm">
          <mat-icon aria-hidden="true" class="!h-3.5 !w-3.5 !text-[14px] text-blue-600">{{ icon }}</mat-icon>
          {{ eyebrow }}
        </div>
      </div>

      <div class="flex flex-1 flex-col px-1 pb-1 pt-3">
        <h3 class="line-clamp-2 min-h-[42px] font-serif text-[17px] font-black leading-[1.25] text-slate-950 transition-colors duration-200 group-hover:text-blue-700">{{ title }}</h3>

        @if (description) {
          <p class="mt-2 line-clamp-2 text-xs font-medium leading-relaxed text-slate-500">{{ description }}</p>
        }

        <div class="mt-3 flex flex-wrap gap-1.5">
          @if (metaPrimary) {
            <span class="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">{{ metaPrimary }}</span>
          }
          @if (metaSecondary) {
            <span class="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">{{ metaSecondary }}</span>
          }
        </div>

        <div class="mt-auto flex items-end justify-between gap-3 border-t border-slate-100 pt-3">
          <div class="min-w-0">
            <span class="block text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">{{ priceCaption }}</span>
            <span class="mt-0.5 block truncate text-[17px] font-black text-slate-950">{{ priceLabel }}</span>
          </div>
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white transition-colors duration-200 group-hover:bg-blue-600" aria-hidden="true">
            <mat-icon class="!h-5 !w-5 !text-[20px]">arrow_forward</mat-icon>
          </span>
        </div>
      </div>
    </a>
  `,
})
export class PremiumShowcaseCardComponent {
  @Input({ required: true }) route: (string | number)[] = ["/"];
  @Input({ required: true }) image = "";
  @Input({ required: true }) title = "";
  @Input() eyebrow = "Öne Çıkan";
  @Input() icon = "auto_awesome";
  @Input() description = "";
  @Input() badge = "";
  @Input() topMeta = "";
  @Input() metaPrimary = "";
  @Input() metaSecondary = "";
  @Input() priceCaption = "Fiyat";
  @Input() priceLabel = "";
  @Input() ariaLabel = "";

  imageError(event: Event) {
    const image = event.target as HTMLImageElement;
    image.onerror = null;
    image.src = "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?q=80&w=1000&auto=format&fit=crop";
  }
}
