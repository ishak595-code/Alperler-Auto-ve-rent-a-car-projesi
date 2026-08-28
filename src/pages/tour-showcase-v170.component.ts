import { CommonModule, Location } from "@angular/common";
import { Component, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatIconModule } from "@angular/material/icon";
import { RouterLink } from "@angular/router";
import { TourPublicDataV170Service, TourV170 } from "../services/tour-public-data-v170.service";

@Component({
  selector: "app-tour-showcase-v170",
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, RouterLink],
  template: `
    <main class="page">
      <header class="topbar">
        <div class="bar">
          <button type="button" class="round" (click)="back()" aria-label="Önceki sayfaya dön"><mat-icon aria-hidden="true">arrow_back</mat-icon></button>
          <label class="search"><mat-icon aria-hidden="true">search</mat-icon><span class="sr-only">Tur ara</span><input type="search" [ngModel]="query()" (ngModelChange)="query.set($event)" placeholder="Tur, rota, konum veya kategori ara" /></label>
          <button type="button" class="round" (click)="filterOpen.set(!filterOpen())" [attr.aria-expanded]="filterOpen()" aria-controls="tour-filter-v170" aria-label="Tur filtrelerini aç"><mat-icon aria-hidden="true">tune</mat-icon>@if(activeFilters()){<b>{{activeFilters()}}</b>}</button>
        </div>
      </header>

      <section class="hero">
        <div><p>ALPERLER TUR</p><h1>Rotanı seç, unutulmaz bir gün planla</h1><span>Doğa, kültür ve özel rotalar arasından size uygun deneyimi seçin. Süreyi, konumu ve programı tur detayında kolayca karşılaştırın.</span></div>
        @if(bounds();as range){<aside><small>Fiyat aralığı</small><strong>{{range.min|number:'1.0-0'}} - {{range.max|number:'1.0-0'}} TL</strong><em>{{tours().length}} tur seçeneği</em></aside>}
      </section>

      @if(filterOpen()){
        <section id="tour-filter-v170" class="filters" aria-label="Tur filtreleri">
          @if(bounds();as range){
            <label><span>En düşük fiyat</span><input type="number" [min]="range.min" [max]="range.max" [ngModel]="minPrice()" (ngModelChange)="setMin($event)" /></label>
            <label><span>En yüksek fiyat</span><input type="number" [min]="range.min" [max]="range.max" [ngModel]="maxPrice()" (ngModelChange)="setMax($event)" /></label>
          }
          <label><span>Süre</span><select [ngModel]="duration()" (ngModelChange)="duration.set($event)"><option value="ALL">Tümü</option>@for(value of durations();track value){<option [value]="value">{{value}}</option>}</select></label>
          <label><span>Tur türü</span><select [ngModel]="category()" (ngModelChange)="category.set($event)"><option value="ALL">Tümü</option>@for(value of categories();track value){<option [value]="value">{{value}}</option>}</select></label>
          <label><span>Konum</span><select [ngModel]="locationFilter()" (ngModelChange)="locationFilter.set($event)"><option value="ALL">Tümü</option>@for(value of locations();track value){<option [value]="value">{{value}}</option>}</select></label>
          <label><span>Sıralama</span><select [ngModel]="sort()" (ngModelChange)="sort.set($event)"><option value="featured">Öne çıkanlar</option><option value="priceAsc">Fiyat: düşükten yükseğe</option><option value="priceDesc">Fiyat: yüksekten düşüğe</option><option value="title">Ada göre</option></select></label>
          <button type="button" (click)="reset()">Filtreleri temizle</button>
        </section>
      }

      <section class="content">
        <div class="head"><div><p>{{results().length}} tur bulundu</p><h2>Sana uygun rotalar</h2></div>@if(activeFilters()){<button type="button" (click)="reset()">Temizle</button>}</div>
        @if(loading()){
          <div class="state"><div class="spinner"></div><strong>Turlar hazırlanıyor</strong></div>
        }@else if(error()){
          <div class="state" role="alert"><mat-icon aria-hidden="true">error_outline</mat-icon><strong>Turlara şu anda ulaşılamıyor</strong><span>Lütfen kısa bir süre sonra yeniden deneyin.</span><button type="button" (click)="reload()">Tekrar dene</button></div>
        }@else if(results().length){
          <div class="grid">
            @for(tour of results();track tour.cloudId||tour.id){
              <a class="card" [routerLink]="['/tour',tour.cloudSlug||tour.cloudId||tour.id]" [attr.aria-label]="tour.title + ' turunu incele'">
                <div class="media">
                  @if(tour.image){<img [src]="tour.image" [alt]="tour.title + ' kapak görseli'" loading="lazy" decoding="async" />}@else{<div class="media-empty"><mat-icon aria-hidden="true">landscape</mat-icon><span>Tur görseli yakında</span></div>}
                  <div class="shade"></div>
                  <div class="badges">
                    @if(tour.badge){<span class="badge">{{tour.badge}}</span>}
                    @if(tour.isFeatured){<span class="featured">ÖNE ÇIKAN</span>}
                  </div>
                  @if(tour.videos?.length){<span class="video"><mat-icon aria-hidden="true">play_circle</mat-icon>{{tour.videos?.length}} video</span>}
                </div>
                <div class="body">
                  <div class="meta"><span><mat-icon aria-hidden="true">schedule</mat-icon>{{tour.duration}}</span><span><mat-icon aria-hidden="true">location_on</mat-icon>{{tour.locationName||tour.meetingPoint}}</span></div>
                  <h3>{{tour.title}}</h3>
                  <p>{{tour.shortDescription||tour.description}}</p>
                  <div class="facts">
                    @if(tour.capacity){<span><mat-icon aria-hidden="true">groups</mat-icon>{{tour.capacity}} kişiye kadar</span>}
                    @if(tour.categoryName){<span><mat-icon aria-hidden="true">explore</mat-icon>{{tour.categoryName}}</span>}
                    @if(tour.images?.length){<span><mat-icon aria-hidden="true">photo_library</mat-icon>{{tour.images?.length}} fotoğraf</span>}
                  </div>
                  <div class="foot"><div><small>Kişi başı</small><strong>{{tour.price|number:'1.0-0'}} TL</strong></div><span>Turu İncele <mat-icon aria-hidden="true">arrow_forward</mat-icon></span></div>
                </div>
              </a>
            }
          </div>
        }@else{
          <div class="state"><mat-icon aria-hidden="true">travel_explore</mat-icon><strong>Bu seçimlere uygun tur bulunamadı</strong><button type="button" (click)="reset()">Tüm Turları Göster</button></div>
        }
      </section>
    </main>
  `,
  styles: [`
    :host{display:block;background:#050b18;color:#fff}.page{min-height:100dvh;background:radial-gradient(circle at 90% 0,rgba(198,161,91,.15),transparent 30%),#050b18;padding-bottom:70px;font-family:Inter,system-ui,sans-serif}.topbar{position:sticky;top:0;z-index:70;border-bottom:1px solid #1e293b;background:rgba(5,11,24,.96);backdrop-filter:blur(16px)}.bar{display:flex;width:min(100% - 24px,1240px);min-height:70px;margin:auto;align-items:center;gap:9px}.round{display:grid;position:relative;width:46px;height:46px;flex:none;place-items:center;border:1px solid #26354d;border-radius:14px;background:#0d1729;color:#fff}.round b{position:absolute;right:-5px;top:-5px;display:grid;min-width:20px;height:20px;place-items:center;border-radius:999px;background:#9f1d1d;color:#fff;font-size:10px}.search{position:relative;flex:1}.search mat-icon{position:absolute;left:13px;top:12px;color:#64748b}.search input{width:100%;min-height:46px;border:1px solid #26354d;border-radius:14px;background:#0d1729;padding:0 14px 0 44px;color:#fff;outline:none}.search input:focus{border-color:#c6a15b;box-shadow:0 0 0 3px rgba(198,161,91,.16)}.hero{display:grid;width:min(100% - 28px,1240px);margin:auto;gap:20px;padding:42px 0 28px}.hero p{margin:0;color:#e7c777;font-size:10px;font-weight:950;letter-spacing:.16em}.hero h1{margin:6px 0 0;font:900 clamp(34px,7vw,68px)/.98 Georgia,serif}.hero>div>span{display:block;max-width:720px;margin-top:14px;color:#94a3b8;line-height:1.65}.hero aside{align-self:end;border:1px solid #26354d;border-radius:20px;background:#0d1729;padding:17px}.hero aside small,.hero aside em{display:block;color:#8190a6;font-size:9px;font-style:normal;font-weight:850;text-transform:uppercase}.hero aside strong{display:block;margin:5px 0;font-size:21px}.filters{display:grid;width:min(100% - 28px,1240px);margin:0 auto 22px;gap:10px;border:1px solid #26354d;border-radius:20px;background:#0c1526;padding:14px}.filters label{display:grid;gap:5px;color:#94a3b8;font-size:9px;font-weight:850}.filters input,.filters select{width:100%;min-height:44px;border:1px solid #334155;border-radius:11px;background:#111c30;padding:0 10px;color:#fff}.filters>button,.head button,.state button{min-height:44px;border:1px solid #334155;border-radius:11px;background:#111c30;padding:0 14px;color:#fff;font-weight:850}.content{width:min(100% - 28px,1240px);margin:auto}.head{display:flex;align-items:end;justify-content:space-between;gap:10px;border-top:1px solid #1e293b;padding:20px 0}.head p{margin:0;color:#e7c777;font-size:10px;font-weight:900}.head h2{margin:4px 0 0}.grid{display:grid;grid-template-columns:1fr;gap:18px}.card{display:flex;min-width:0;flex-direction:column;overflow:hidden;border:1px solid #26354d;border-radius:22px;background:#0c1526;color:#fff;text-decoration:none;box-shadow:0 16px 40px rgba(0,0,0,.2);transition:.2s}.card:hover{transform:translateY(-3px);border-color:#c6a15b}.card:focus-visible{outline:3px solid #c6a15b;outline-offset:3px}.media{position:relative;aspect-ratio:16/10;overflow:hidden;background:#111827}.media>img{width:100%;height:100%;object-fit:cover;transition:.4s}.card:hover .media>img{transform:scale(1.035)}.media-empty{display:grid;height:100%;place-items:center;color:#64748b}.shade{position:absolute;inset:0;background:linear-gradient(to top,rgba(2,6,23,.75),transparent 60%)}.badges{position:absolute;left:10px;top:10px;display:flex;gap:6px}.badge,.featured,.video{border-radius:999px;padding:6px 8px;font-size:8px;font-weight:950}.badge{background:#fff;color:#0f172a}.featured{background:#fbbf24;color:#451a03}.video{position:absolute;right:10px;bottom:10px;display:flex;align-items:center;gap:4px;background:rgba(2,6,23,.78)}.video mat-icon{width:15px;height:15px;font-size:15px}.body{display:flex;flex:1;flex-direction:column;padding:16px}.meta{display:flex;flex-wrap:wrap;gap:8px}.meta span,.facts span{display:flex;align-items:center;gap:4px;color:#aebed1;font-size:9px;font-weight:800}.meta mat-icon,.facts mat-icon{width:15px;height:15px;font-size:15px;color:#e7c777}.body h3{margin:9px 0 0;font-size:19px;line-height:1.25}.body>p{display:-webkit-box;overflow:hidden;margin:8px 0 0;color:#94a3b8;font-size:11px;line-height:1.6;-webkit-line-clamp:3;-webkit-box-orient:vertical}.facts{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.foot{display:flex;align-items:end;justify-content:space-between;gap:10px;margin-top:auto;border-top:1px solid #26354d;padding-top:14px}.foot small{display:block;color:#8190a6;font-size:8px;text-transform:uppercase}.foot strong{display:block;margin-top:2px;font-size:20px}.foot>span{display:flex;align-items:center;color:#e7c777;font-size:9px;font-weight:900;text-transform:uppercase}.foot mat-icon{width:16px;height:16px;font-size:16px}.state{display:grid;min-height:260px;place-items:center;border:1px dashed #334155;border-radius:22px;background:#0c1526;padding:35px;text-align:center;color:#94a3b8}.state mat-icon{width:48px;height:48px;font-size:48px}.state strong{color:#fff}.spinner{width:38px;height:38px;border:3px solid #334155;border-top-color:#c6a15b;border-radius:50%;animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}@media(min-width:700px){.hero{grid-template-columns:1fr auto}.filters{grid-template-columns:repeat(3,minmax(0,1fr))}.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(min-width:1080px){.filters{grid-template-columns:repeat(6,minmax(0,1fr))}.grid{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(prefers-reduced-motion:reduce){.card,.media>img{transition:none}.spinner{animation:none}}
  `],
})
export class TourShowcaseV170Component {
  private readonly data = inject(TourPublicDataV170Service);
  private readonly location = inject(Location);
  readonly tours = signal<TourV170[]>([]);
  readonly loading = signal(true);
  readonly error = signal("");
  readonly query = signal("");
  readonly duration = signal("ALL");
  readonly category = signal("ALL");
  readonly locationFilter = signal("ALL");
  readonly sort = signal<"featured"|"priceAsc"|"priceDesc"|"title">("featured");
  readonly minPrice = signal<number|null>(null);
  readonly maxPrice = signal<number|null>(null);
  readonly filterOpen = signal(false);

  readonly bounds = computed(() => {
    const prices = this.tours().map((tour) => Number(tour.price)).filter((value) => Number.isFinite(value) && value >= 0);
    return prices.length ? { min: Math.min(...prices), max: Math.max(...prices) } : null;
  });
  readonly durations = computed(() => this.unique(this.tours().map((tour) => tour.duration)));
  readonly categories = computed(() => this.unique(this.tours().map((tour) => tour.categoryName)));
  readonly locations = computed(() => this.unique(this.tours().map((tour) => tour.locationName || tour.meetingPoint)));
  readonly activeFilters = computed(() => Number(Boolean(this.query().trim())) + Number(this.duration() !== "ALL") + Number(this.category() !== "ALL") + Number(this.locationFilter() !== "ALL") + Number(this.minPrice() !== null || this.maxPrice() !== null));
  readonly results = computed(() => {
    const q = this.query().trim().toLocaleLowerCase("tr-TR");
    const min = this.minPrice(); const max = this.maxPrice();
    const rows = this.tours().filter((tour) => {
      const haystack = `${tour.title} ${tour.shortDescription||""} ${tour.description||""} ${tour.locationName||""} ${tour.meetingPoint||""} ${tour.categoryName||""}`.toLocaleLowerCase("tr-TR");
      if (q && !haystack.includes(q)) return false;
      if (this.duration() !== "ALL" && tour.duration !== this.duration()) return false;
      if (this.category() !== "ALL" && tour.categoryName !== this.category()) return false;
      if (this.locationFilter() !== "ALL" && (tour.locationName || tour.meetingPoint) !== this.locationFilter()) return false;
      if (min !== null && Number(tour.price) < min) return false;
      if (max !== null && Number(tour.price) > max) return false;
      return true;
    });
    return rows.slice().sort((a,b) => this.sort() === "priceAsc" ? a.price-b.price : this.sort() === "priceDesc" ? b.price-a.price : this.sort() === "title" ? String(a.title).localeCompare(String(b.title),"tr") : Number(Boolean(b.isFeatured))-Number(Boolean(a.isFeatured)) || String(a.title).localeCompare(String(b.title),"tr"));
  });

  constructor(){ void this.reload(); }
  async reload(): Promise<void> { this.loading.set(true); this.error.set(""); try { this.tours.set(await this.data.list()); } catch { this.error.set("TOURS_UNAVAILABLE"); } finally { this.loading.set(false); } }
  setMin(value: unknown): void { const n=Number(value); this.minPrice.set(value === "" || value == null || !Number.isFinite(n) ? null : n); }
  setMax(value: unknown): void { const n=Number(value); this.maxPrice.set(value === "" || value == null || !Number.isFinite(n) ? null : n); }
  reset(): void { this.query.set(""); this.duration.set("ALL"); this.category.set("ALL"); this.locationFilter.set("ALL"); this.minPrice.set(null); this.maxPrice.set(null); this.sort.set("featured"); }
  back(): void { this.location.back(); }
  private unique(values: Array<string|undefined>): string[] { return [...new Set(values.map((value)=>String(value||"").trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"tr")); }
}
