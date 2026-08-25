import { CommonModule, Location } from "@angular/common";
import { Component, ElementRef, ViewChild, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatIconModule } from "@angular/material/icon";
import { RouterLink } from "@angular/router";
import { CarService } from "../services/car.service";

@Component({
  selector: "app-tour-showcase-v169",
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, RouterLink],
  template: `
    <main class="page">
      <header class="topbar">
        <div class="topbar-inner">
          <button type="button" class="icon" (click)="goBack()" aria-label="Önceki sayfaya dön"><mat-icon aria-hidden="true">arrow_back</mat-icon></button>
          <label class="search"><span class="sr-only">Tur ara</span><mat-icon aria-hidden="true">search</mat-icon><input [ngModel]="query()" (ngModelChange)="query.set($event)" type="search" placeholder="Tur, rota veya konum ara" /></label>
          <button #filterTrigger type="button" class="icon filter" (click)="openFilter()" aria-label="Tur filtrelerini aç" aria-haspopup="dialog" [attr.aria-expanded]="filterOpen()" aria-controls="tour-v169-filter"><mat-icon aria-hidden="true">tune</mat-icon>@if(activeFilterCount()){<b>{{activeFilterCount()}}</b>}</button>
          <button #sortTrigger type="button" class="icon" (click)="openSort()" aria-label="Tur sıralamasını aç" aria-haspopup="dialog" [attr.aria-expanded]="sortOpen()" aria-controls="tour-v169-sort"><mat-icon aria-hidden="true">sort</mat-icon></button>
        </div>
      </header>

      <section class="hero">
        <div><p>ALPERLER TUR DENEYİMLERİ</p><h1>Gerçek rotalar, gerçek tur kayıtları</h1><span>Fiyat, süre, kapasite ve buluşma bilgileri canlı tur kataloğundan gelir. Sabit fiyat aralığı veya örnek tur kullanılmaz.</span></div>
        @if(priceBounds(); as bounds){<aside><small>Canlı fiyat aralığı</small><strong>{{bounds.min|number:'1.0-0'}} - {{bounds.max|number:'1.0-0'}} TL</strong><em>{{allTours().length}} aktif tur</em></aside>}
      </section>

      <section class="content">
        <div class="result-head"><div><p>{{filteredTours().length}} tur bulundu</p><h2>{{durationFilter()==='ALL'?'Tüm rotalar':durationFilter()}}</h2></div>@if(activeFilterCount()){<button type="button" (click)="resetFilters()">Filtreleri temizle</button>}</div>
        @if(filteredTours().length){
          <div class="grid">
            @for(tour of filteredTours();track tour.id){
              <a class="card" [routerLink]="['/tour',tour.cloudSlug||tour.cloudId||tour.id]" [attr.aria-label]="tour.title + ' tur detayını aç'">
                <div class="media">
                  @if(tour.image){<img [src]="tour.image" [alt]="tour.title + ' kapak görseli'" loading="lazy" decoding="async" />}@else{<div class="placeholder"><mat-icon aria-hidden="true">landscape</mat-icon><span>Kapak görseli eklenmedi</span></div>}
                  <div class="shade"></div>
                  @if(tour.duration){<span class="duration">{{tour.duration}}</span>}
                  @if(tour.isFeatured){<span class="featured">ÖNE ÇIKAN</span>}
                </div>
                <div class="body">
                  <h3>{{tour.title}}</h3>
                  <p class="description">{{tour.description}}</p>
                  <div class="facts">
                    <span><mat-icon aria-hidden="true">group</mat-icon>{{tour.capacity ? tour.capacity + ' kişi' : 'Kapasite belirtilmedi'}}</span>
                    <span><mat-icon aria-hidden="true">location_on</mat-icon>{{tour.location||tour.meetingPoint||'Konum belirtilmedi'}}</span>
                  </div>
                  <div class="foot"><div><small>Kişi başı</small><strong>{{tour.price|number:'1.0-0'}} TL</strong></div><span>Programı incele <mat-icon aria-hidden="true">arrow_forward</mat-icon></span></div>
                </div>
              </a>
            }
          </div>
        }@else{
          <div class="empty"><mat-icon aria-hidden="true">explore_off</mat-icon><h2>Bu filtrelerde tur bulunamadı</h2><p>Canlı fiyat aralığına dönüp tekrar deneyin.</p><button type="button" (click)="resetFilters()">Filtreleri temizle</button></div>
        }
      </section>

      <dialog #filterDialog id="tour-v169-filter" class="dialog" (close)="filterClosed()" (cancel)="cancelFilter($event)">
        <div class="dialog-card">
          <header><div><p>CANLI KATALOG FİLTRESİ</p><h2>Tur seçenekleri</h2></div><button type="button" (click)="closeFilter()" aria-label="Filtre penceresini kapat"><mat-icon aria-hidden="true">close</mat-icon></button></header>
          <div class="dialog-body">
            @if(priceBounds();as bounds){
              <fieldset><legend>Fiyat aralığı TL</legend><div class="range"><label><span>Minimum</span><input type="number" [min]="bounds.min" [max]="bounds.max" [ngModel]="tempMin()" (ngModelChange)="setTempMin($event)" /></label><label><span>Maksimum</span><input type="number" [min]="bounds.min" [max]="bounds.max" [ngModel]="tempMax()" (ngModelChange)="setTempMax($event)" /></label></div><small>Katalog: {{bounds.min|number:'1.0-0'}} - {{bounds.max|number:'1.0-0'}} TL</small></fieldset>
            }
            <fieldset><legend>Süre</legend><div class="chips"><button type="button" [class.active]="tempDuration()==='ALL'" (click)="tempDuration.set('ALL')">Tümü</button>@for(value of durationOptions();track value){<button type="button" [class.active]="tempDuration()===value" (click)="tempDuration.set(value)">{{value}}</button>}</div></fieldset>
          </div>
          <footer><button type="button" class="secondary" (click)="resetTemp()">Sıfırla</button><button type="button" class="primary" (click)="applyFilters()">Uygula</button></footer>
        </div>
      </dialog>

      <dialog #sortDialog id="tour-v169-sort" class="dialog sort-dialog" (close)="sortClosed()" (cancel)="cancelSort($event)">
        <div class="dialog-card"><header><div><p>SIRALAMA</p><h2>Turları sırala</h2></div><button type="button" (click)="closeSort()" aria-label="Sıralama penceresini kapat"><mat-icon aria-hidden="true">close</mat-icon></button></header><div class="sorts">@for(item of sortOptions;track item.id){<button type="button" [class.active]="sort()===item.id" (click)="setSort(item.id)">{{item.label}}@if(sort()===item.id){<mat-icon aria-hidden="true">check</mat-icon>}</button>}</div></div>
      </dialog>
    </main>
  `,
  styles: [`
    :host{display:block;background:#050b18;color:#fff}.page{min-height:100dvh;background:radial-gradient(circle at 85% 5%,rgba(37,99,235,.18),transparent 30%),#050b18;padding-bottom:72px;font-family:Inter,system-ui,sans-serif}.topbar{position:sticky;top:0;z-index:60;border-bottom:1px solid #1e293b;background:rgba(5,11,24,.96);backdrop-filter:blur(16px)}.topbar-inner{display:flex;width:min(100% - 24px,1240px);min-height:72px;margin:auto;align-items:center;gap:9px}.icon{display:grid;width:48px;height:48px;flex:none;place-items:center;border:1px solid #26354d;border-radius:14px;background:#0d1729;color:#e2e8f0;position:relative}.filter b{position:absolute;right:-5px;top:-5px;display:grid;min-width:20px;height:20px;place-items:center;border-radius:999px;background:#2563eb;color:#fff;font-size:10px}.search{position:relative;flex:1;min-width:0}.search mat-icon{position:absolute;left:13px;top:13px;color:#64748b}.search input{width:100%;min-height:48px;border:1px solid #26354d;border-radius:14px;background:#0d1729;padding:0 14px 0 45px;color:#fff;outline:none}.search input:focus{border-color:#60a5fa;box-shadow:0 0 0 3px rgba(96,165,250,.14)}.hero{display:grid;width:min(100% - 28px,1240px);margin:auto;padding:44px 0 30px;gap:22px}.hero p,.dialog header p{margin:0;color:#60a5fa;font-size:10px;font-weight:950;letter-spacing:.16em}.hero h1{margin:7px 0 0;max-width:820px;font:900 clamp(34px,7vw,68px)/.98 Georgia,serif}.hero>div>span{display:block;max-width:720px;margin-top:16px;color:#94a3b8;line-height:1.7}.hero aside{align-self:end;border:1px solid #26354d;border-radius:20px;background:#0d1729;padding:18px}.hero aside small,.hero aside em{display:block;color:#8190a6;font-size:10px;font-style:normal;font-weight:850;text-transform:uppercase}.hero aside strong{display:block;margin:5px 0;color:#f8fafc;font-size:22px}.content{width:min(100% - 28px,1240px);margin:auto}.result-head{display:flex;align-items:end;justify-content:space-between;gap:12px;border-top:1px solid #1e293b;padding:22px 0}.result-head p{margin:0;color:#60a5fa;font-size:11px;font-weight:900}.result-head h2{margin:4px 0 0;font-size:20px}.result-head button,.empty button{min-height:42px;border:1px solid #334155;border-radius:12px;background:#0d1729;padding:0 13px;color:#cbd5e1;font-weight:850}.grid{display:grid;grid-template-columns:1fr;gap:18px}.card{display:flex;min-width:0;flex-direction:column;overflow:hidden;border:1px solid #26354d;border-radius:22px;background:#0c1526;color:#f8fafc;text-decoration:none;box-shadow:0 16px 38px rgba(0,0,0,.2);transition:.2s}.card:hover{transform:translateY(-3px);border-color:#60a5fa}.card:focus-visible{outline:3px solid #60a5fa;outline-offset:3px}.media{position:relative;aspect-ratio:16/10;overflow:hidden;background:#111827}.media img{width:100%;height:100%;object-fit:cover;transition:transform .45s}.card:hover .media img{transform:scale(1.035)}.placeholder{display:grid;height:100%;place-items:center;color:#64748b}.placeholder mat-icon{font-size:48px;width:48px;height:48px}.placeholder span{font-size:11px}.shade{position:absolute;inset:0;background:linear-gradient(to top,rgba(2,6,23,.78),transparent 62%)}.duration,.featured{position:absolute;top:10px;border-radius:999px;padding:6px 9px;font-size:9px;font-weight:950}.duration{left:10px;background:rgba(255,255,255,.94);color:#0f172a}.featured{right:10px;background:#fbbf24;color:#451a03}.body{display:flex;flex:1;flex-direction:column;padding:16px}.body h3{margin:0;font-size:18px;line-height:1.25}.description{display:-webkit-box;overflow:hidden;margin:8px 0 0;color:#94a3b8;font-size:12px;line-height:1.6;-webkit-line-clamp:3;-webkit-box-orient:vertical}.facts{display:grid;gap:7px;margin-top:13px}.facts span{display:flex;min-width:0;align-items:center;gap:6px;color:#b8c5d6;font-size:10px;font-weight:750}.facts mat-icon{width:16px;height:16px;font-size:16px;color:#60a5fa}.foot{display:flex;align-items:end;justify-content:space-between;gap:10px;margin-top:auto;border-top:1px solid #26354d;padding-top:14px}.foot small{display:block;color:#8190a6;font-size:9px;text-transform:uppercase}.foot strong{display:block;margin-top:2px;font-size:20px}.foot>span{display:flex;align-items:center;gap:3px;color:#60a5fa;font-size:10px;font-weight:900;text-transform:uppercase}.foot mat-icon{width:16px;height:16px;font-size:16px}.empty{margin-top:20px;border:1px dashed #334155;border-radius:24px;background:#0c1526;padding:54px 20px;text-align:center}.empty>mat-icon{width:54px;height:54px;font-size:54px;color:#475569}.empty h2{margin:12px 0 0}.empty p{color:#94a3b8}.dialog{width:min(92vw,520px);max-height:88dvh;margin:auto;border:0;border-radius:24px;background:transparent;padding:0;color:#0f172a}.dialog::backdrop{background:rgba(2,6,23,.76);backdrop-filter:blur(5px)}.dialog-card{overflow:hidden;border-radius:24px;background:#fff;box-shadow:0 25px 70px rgba(0,0,0,.4)}.dialog header{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e2e8f0;padding:19px}.dialog header h2{margin:3px 0 0;font-size:21px}.dialog header button{display:grid;width:44px;height:44px;place-items:center;border:0;border-radius:12px;background:#f1f5f9}.dialog-body{display:grid;gap:20px;max-height:60dvh;overflow:auto;padding:19px}.dialog fieldset{border:0;padding:0}.dialog legend{margin-bottom:10px;font-size:12px;font-weight:900}.range{display:grid;grid-template-columns:1fr 1fr;gap:9px}.range label span{display:block;margin-bottom:5px;color:#64748b;font-size:10px;font-weight:800}.range input{width:100%;min-height:46px;border:1px solid #cbd5e1;border-radius:12px;padding:0 11px;font-weight:850}.dialog fieldset>small{display:block;margin-top:8px;color:#64748b}.chips{display:flex;flex-wrap:wrap;gap:7px}.chips button,.sorts button{min-height:42px;border:1px solid #cbd5e1;border-radius:11px;background:#fff;padding:0 12px;color:#334155;font-weight:800}.chips button.active,.sorts button.active{border-color:#0f172a;background:#0f172a;color:#fff}.dialog footer{display:grid;grid-template-columns:1fr 1fr;gap:9px;border-top:1px solid #e2e8f0;padding:16px}.dialog footer button{min-height:48px;border:0;border-radius:12px;font-weight:900}.secondary{background:#f1f5f9;color:#334155}.primary{background:#0f172a;color:#fff}.sort-dialog{width:min(92vw,390px)}.sorts{display:grid;gap:7px;padding:15px}.sorts button{display:flex;align-items:center;justify-content:space-between;text-align:left}.sorts mat-icon{width:18px;height:18px;font-size:18px}@media(min-width:640px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(min-width:960px){.hero{grid-template-columns:minmax(0,1fr) 280px}.grid{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(min-width:1220px){.grid{grid-template-columns:repeat(4,minmax(0,1fr))}}@media(prefers-reduced-motion:reduce){.card,.media img{transition:none}}
  `],
})
export class TourShowcaseV169Component {
  private readonly carService = inject(CarService);
  private readonly location = inject(Location);
  @ViewChild("filterDialog") private filterDialog?: ElementRef<HTMLDialogElement>;
  @ViewChild("sortDialog") private sortDialog?: ElementRef<HTMLDialogElement>;
  @ViewChild("filterTrigger") private filterTrigger?: ElementRef<HTMLButtonElement>;
  @ViewChild("sortTrigger") private sortTrigger?: ElementRef<HTMLButtonElement>;

  readonly allTours = this.carService.getTours();
  readonly query = signal("");
  readonly minPrice = signal<number | null>(null);
  readonly maxPrice = signal<number | null>(null);
  readonly tempMin = signal<number | null>(null);
  readonly tempMax = signal<number | null>(null);
  readonly durationFilter = signal("ALL");
  readonly tempDuration = signal("ALL");
  readonly sort = signal("default");
  readonly filterOpen = signal(false);
  readonly sortOpen = signal(false);
  readonly sortOptions = [
    { id: "default", label: "Öne çıkanlar / güncel sıra" },
    { id: "priceAsc", label: "Fiyat: düşükten yükseğe" },
    { id: "priceDesc", label: "Fiyat: yüksekten düşüğe" },
    { id: "capacityDesc", label: "Kapasite: yüksekten düşüğe" },
  ];

  readonly priceBounds = computed(() => {
    const prices = this.allTours().map((tour) => Number(tour.price)).filter((value) => Number.isFinite(value) && value > 0);
    if (!prices.length) return null;
    return { min: Math.min(...prices), max: Math.max(...prices) };
  });
  readonly durationOptions = computed(() => Array.from(new Set(this.allTours().map((tour) => String(tour.duration || "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, "tr")));
  readonly activeFilterCount = computed(() => Number(this.minPrice() !== null || this.maxPrice() !== null) + Number(this.durationFilter() !== "ALL"));
  readonly filteredTours = computed(() => {
    const text = this.query().trim().toLocaleLowerCase("tr-TR");
    const min = this.minPrice();
    const max = this.maxPrice();
    const duration = this.durationFilter();
    const rows = this.allTours().filter((tour) => {
      const price = Number(tour.price || 0);
      const haystack = `${tour.title || ""} ${tour.description || ""} ${tour.location || ""} ${tour.meetingPoint || ""} ${tour.duration || ""}`.toLocaleLowerCase("tr-TR");
      return (!text || haystack.includes(text)) && (min === null || price >= min) && (max === null || price <= max) && (duration === "ALL" || tour.duration === duration);
    });
    if (this.sort() === "priceAsc") rows.sort((a, b) => Number(a.price) - Number(b.price));
    if (this.sort() === "priceDesc") rows.sort((a, b) => Number(b.price) - Number(a.price));
    if (this.sort() === "capacityDesc") rows.sort((a, b) => Number(b.capacity || 0) - Number(a.capacity || 0));
    return rows;
  });

  goBack(): void { this.location.back(); }
  openFilter(): void { this.tempMin.set(this.minPrice()); this.tempMax.set(this.maxPrice()); this.tempDuration.set(this.durationFilter()); this.filterOpen.set(true); queueMicrotask(() => this.filterDialog?.nativeElement.showModal()); }
  closeFilter(): void { this.filterDialog?.nativeElement.close(); }
  cancelFilter(event: Event): void { event.preventDefault(); this.closeFilter(); }
  filterClosed(): void { this.filterOpen.set(false); queueMicrotask(() => this.filterTrigger?.nativeElement.focus()); }
  setTempMin(value: unknown): void { this.tempMin.set(this.clampPrice(value)); }
  setTempMax(value: unknown): void { this.tempMax.set(this.clampPrice(value)); }
  applyFilters(): void { const a = this.tempMin(), b = this.tempMax(); if (a !== null && b !== null && a > b) { this.minPrice.set(b); this.maxPrice.set(a); } else { this.minPrice.set(a); this.maxPrice.set(b); } this.durationFilter.set(this.tempDuration()); this.closeFilter(); }
  resetTemp(): void { this.tempMin.set(null); this.tempMax.set(null); this.tempDuration.set("ALL"); }
  resetFilters(): void { this.query.set(""); this.minPrice.set(null); this.maxPrice.set(null); this.tempMin.set(null); this.tempMax.set(null); this.durationFilter.set("ALL"); this.tempDuration.set("ALL"); this.sort.set("default"); }
  openSort(): void { this.sortOpen.set(true); queueMicrotask(() => this.sortDialog?.nativeElement.showModal()); }
  closeSort(): void { this.sortDialog?.nativeElement.close(); }
  cancelSort(event: Event): void { event.preventDefault(); this.closeSort(); }
  sortClosed(): void { this.sortOpen.set(false); queueMicrotask(() => this.sortTrigger?.nativeElement.focus()); }
  setSort(value: string): void { this.sort.set(value); this.closeSort(); }
  private clampPrice(value: unknown): number | null { if (value === "" || value === null || value === undefined) return null; const number = Number(value); if (!Number.isFinite(number) || number < 0) return null; const bounds = this.priceBounds(); return bounds ? Math.min(bounds.max, Math.max(bounds.min, number)) : number; }
}
