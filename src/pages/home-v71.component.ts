import { CommonModule } from "@angular/common";
import { Component, computed, effect, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatIconModule } from "@angular/material/icon";
import { Router, RouterLink } from "@angular/router";
import { VehicleListItemComponent } from "../components/vehicle-list-item.component";
import { DynamicHomeSectionComponent } from "../components/dynamic-home-section.component";
import { Branch } from "../models/branch.model";
import { Vehicle } from "../models/car.model";
import { CampaignRecord, CampaignService } from "../services/campaign.service";
import { BlogPost, CarService } from "../services/car.service";
import { BranchService } from "../services/branch.service";
import { HomepageLayoutService, PublicHomepageSection } from "../services/homepage-layout.service";
import { SeoService } from "../services/seo.service";

interface PickupChoice {
  key: string;
  branchId: string;
  label: string;
  branchName: string;
}

@Component({
  selector: "app-home-v71",
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, RouterLink, VehicleListItemComponent, DynamicHomeSectionComponent],
  template: `
    <main class="home-root">
      <section class="hero" [style.backgroundImage]="'url(' + heroImage() + ')'" aria-labelledby="home-title">
        <div class="hero-glow" aria-hidden="true"></div>
        <div class="hero-grid" aria-hidden="true"></div>
        <div class="hero-stage">
          <div class="hero-copy-block">
            <p class="eyebrow">{{ brandName() }} · Hakkâri'den yola çıkan güven</p>
            <h1 id="home-title">{{ homeContent().heroTitle || 'Yolculuğunuz doğru araçla başlasın.' }}</h1>
            <p class="hero-copy">{{ homeContent().heroSubtitle || 'Kiralama, satış ve seçili rotaları tek yerde keşfedin. Size uyan seçeneği bulun, ayrıntıları görün, kararınızı güvenle verin.' }}</p>

            <div class="desktop-search" role="search" aria-label="Araç, tur veya ilan ara">
              <label class="sr-only" for="home-search-v80">Araç, tur veya ilan ara</label>
              <div class="search-shell">
                <mat-icon aria-hidden="true">search</mat-icon>
                <input id="home-search-v80" type="search" [(ngModel)]="searchQuery" (keyup.enter)="performSearch()" autocomplete="off" placeholder="Marka, model, tur veya ilan no" />
                <button type="button" (click)="performSearch()">Ara</button>
              </div>
            </div>

            <div class="trust-row" aria-label="Alperler Auto hizmet güvenceleri">
              <span><mat-icon aria-hidden="true">verified</mat-icon> Açık fiyat</span>
              <span><mat-icon aria-hidden="true">support_agent</mat-icon> Yerel destek</span>
              <span><mat-icon aria-hidden="true">fact_check</mat-icon> Kontrol edilmiş ilan</span>
            </div>
          </div>

          <aside class="planner" aria-labelledby="planner-title">
            <div class="planner-head">
              <div>
                <p class="planner-kicker">Hızlı Planlama</p>
                <h2 id="planner-title">{{ homeContent().bookingTitle || 'Nereden başlayacağınızı seçin' }}</h2>
                <p class="planner-copy">{{ homeContent().bookingSubtitle || 'Teslim noktanızı ve tarihinizi belirleyin; size uygun seçenekleri birlikte gösterelim.' }}</p>
              </div>
              <span class="planner-icon" aria-hidden="true"><mat-icon>event_available</mat-icon></span>
            </div>

            <div class="field-grid">
              <label class="field">
                <span>Ne arıyorsunuz?</span>
                <select [(ngModel)]="serviceType" name="homeService" (ngModelChange)="clearPlannerError()">
                  <option value="individual">Şoförsüz araç kiralama</option>
                  <option value="driver">Şoförlü transfer</option>
                  <option value="wedding">Düğün / özel gün aracı</option>
                  <option value="tour">Özel tur</option>
                </select>
              </label>

              @if (serviceType !== 'tour') {
                <label class="field">
                  <span>Nereden?</span>
                  <select [(ngModel)]="selectedPickupKey" name="homePickup" (ngModelChange)="clearPlannerError()">
                    <option value="">Teslim almak istediğiniz yeri seçin</option>
                    @for (choice of pickupChoices(); track choice.key) {
                      <option [value]="choice.key">{{ choice.label }}</option>
                    }
                  </select>
                  @if (pickupChoices().length > 1) { <small>{{ pickupChoices().length }} teslim seçeneği mevcut</small> }
                </label>
              }

              <div class="date-grid">
                <label class="field">
                  <span>{{ serviceType === 'tour' ? 'Tur tarihi' : 'Alış tarihi' }}</span>
                  <input type="date" [(ngModel)]="startDate" name="homeStartDate" [min]="today" (ngModelChange)="onStartDateChanged($event)" />
                </label>
                @if (serviceType !== 'tour') {
                  <label class="field">
                    <span>İade tarihi</span>
                    <input type="date" [(ngModel)]="endDate" name="homeEndDate" [min]="startDate || today" (ngModelChange)="clearPlannerError()" />
                  </label>
                }
              </div>
            </div>

            @if (plannerError) { <p class="planner-error" role="alert">{{ plannerError }}</p> }
            <button type="button" class="planner-action" (click)="searchAvailability()">
              <span>{{ bookingButtonLabel() }}</span><mat-icon aria-hidden="true">arrow_forward</mat-icon>
            </button>
            @if (plannerSummary()) { <p class="planner-summary" aria-live="polite">{{ plannerSummary() }}</p> }
            <p class="planner-note">Teslim bölgesi ve kesin uygunluk rezervasyon öncesinde doğrulanır.</p>
          </aside>
        </div>
      </section>

      @if (homepageLayout.loading() && managedSections().length === 0) {
        <div class="loading" role="status"><mat-icon aria-hidden="true">sync</mat-icon><span>Size uygun vitrin hazırlanıyor...</span></div>
      }

      @for (section of managedSections(); track section.sectionKey) {
        <app-dynamic-home-section [section]="section"></app-dynamic-home-section>
      }
    </main>
  `,
  styles: [`
    :host{display:block}.home-root{min-height:100vh;padding-bottom:78px;background:#f8fafc;color:#0f172a}.hero{position:relative;isolation:isolate;overflow:hidden;background:#020617 center/cover no-repeat;color:#fff;perspective:1400px}.hero::before{content:"";position:absolute;inset:0;z-index:-3;background:linear-gradient(100deg,rgba(2,6,23,.96) 0%,rgba(2,6,23,.88) 48%,rgba(2,6,23,.64) 100%)}.hero-glow{position:absolute;inset:0;z-index:-2;background:radial-gradient(circle at 82% 12%,rgba(59,130,246,.3),transparent 34%),radial-gradient(circle at 13% 86%,rgba(14,165,233,.16),transparent 34%);pointer-events:none}.hero-grid{position:absolute;right:-18%;bottom:-42%;z-index:-1;width:76%;height:72%;opacity:.2;transform:rotateX(68deg) rotateZ(-4deg);transform-origin:center top;background-image:linear-gradient(rgba(148,163,184,.18) 1px,transparent 1px),linear-gradient(90deg,rgba(148,163,184,.16) 1px,transparent 1px);background-size:52px 52px;mask-image:linear-gradient(to bottom,#000,transparent 84%);pointer-events:none}.hero-stage{width:min(100% - 1.25rem,80rem);margin:auto;padding:1.3rem 0 1.6rem;display:grid;gap:1rem;transform-style:preserve-3d}.hero-copy-block{transform:translateZ(20px)}.eyebrow,.planner-kicker,.section-kicker,.branch-label,.offer-hook{margin:0;font-size:.62rem;font-weight:950;letter-spacing:.13em;text-transform:uppercase}.eyebrow,.planner-kicker{color:#93c5fd}.hero h1{margin:.7rem 0 0;max-width:820px;font-family:Georgia,"Times New Roman",serif;font-size:clamp(2.05rem,9.3vw,3rem);line-height:1.01;letter-spacing:-.025em}.hero-copy{margin:.7rem 0 0;max-width:700px;color:#d6deea;font-size:.86rem;line-height:1.62}.desktop-search{display:none;margin-top:1rem;max-width:650px}.search-shell{display:flex;align-items:center;gap:.45rem;border:1px solid rgba(255,255,255,.2);border-radius:16px;background:rgba(4,10,24,.7);padding:.38rem;box-shadow:0 22px 52px rgba(2,6,23,.25);backdrop-filter:blur(14px)}.search-shell input{min-width:0;flex:1;border:0;background:transparent;padding:.68rem .2rem;color:#fff;outline:none}.search-shell button{min-height:43px;border:0;border-radius:11px;background:#2563eb;padding:0 1.1rem;color:#fff;font-weight:900}.trust-row{display:flex;flex-wrap:wrap;gap:.45rem;margin-top:.9rem}.trust-row span{display:inline-flex;align-items:center;gap:.3rem;border:1px solid rgba(255,255,255,.1);border-radius:999px;background:rgba(255,255,255,.055);padding:.36rem .55rem;color:#cbd5e1;font-size:.62rem;font-weight:800}.trust-row mat-icon{width:14px;height:14px;font-size:14px;color:#93c5fd}
    .planner{transform:translateZ(34px);border:1px solid rgba(148,163,184,.25);border-radius:22px;background:rgba(6,14,29,.93);padding:1rem;box-shadow:0 34px 82px rgba(2,6,23,.42),inset 0 1px 0 rgba(255,255,255,.08);backdrop-filter:blur(18px)}.planner-head{display:flex;justify-content:space-between;gap:.75rem}.planner h2{margin:.22rem 0 0;font-family:Georgia,"Times New Roman",serif;font-size:1.5rem;line-height:1.08}.planner-copy{margin:.35rem 0 0;color:#aab7ca;font-size:.72rem;line-height:1.5}.planner-icon{display:grid;width:40px;height:40px;flex:none;place-items:center;border-radius:13px;background:rgba(37,99,235,.16);color:#93c5fd}.field-grid{display:grid;gap:.6rem;margin-top:.8rem}.date-grid{display:grid;grid-template-columns:1fr 1fr;gap:.55rem}.field{display:flex;min-width:0;flex-direction:column;gap:.28rem}.field>span{color:#b9c3d2;font-size:.61rem;font-weight:900;letter-spacing:.06em;text-transform:uppercase}.field small{color:#738096;font-size:.6rem}.field select,.field input{width:100%;min-height:47px;border:1px solid rgba(148,163,184,.22);border-radius:12px;background:#050c1a;padding:0 .72rem;color:#fff;font-size:.78rem;font-weight:750;outline:none}.field select:focus,.field input:focus{border-color:#60a5fa;box-shadow:0 0 0 3px rgba(96,165,250,.14)}.planner-action{display:flex;width:100%;min-height:50px;margin-top:.75rem;align-items:center;justify-content:center;gap:.35rem;border:0;border-radius:12px;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;font-size:.82rem;font-weight:950;box-shadow:0 14px 30px rgba(37,99,235,.22)}.planner-error{margin:.6rem 0 0;border-radius:10px;background:rgba(244,63,94,.12);padding:.58rem .65rem;color:#fecdd3;font-size:.7rem;font-weight:800}.planner-summary{margin:.5rem 0 0;color:#cbd5e1;font-size:.66rem;font-weight:800}.planner-note{margin:.45rem 0 0;color:#64748b;font-size:.58rem;line-height:1.45}.loading{display:flex;min-height:110px;align-items:center;justify-content:center;gap:.4rem;background:#fff;color:#475569;font-size:.78rem;font-weight:850}.loading mat-icon{color:#2563eb}
    .section{padding:2rem 0}.section-inner{width:min(100% - 1.25rem,80rem);margin:auto}.section-head{display:flex;align-items:end;justify-content:space-between;gap:1rem;margin-bottom:1rem}.section-kicker{color:#2563eb}.section h2,.vehicle-partner h2{margin:.25rem 0 0;font-family:Georgia,"Times New Roman",serif;font-size:clamp(1.6rem,6.6vw,2.7rem);line-height:1.05;letter-spacing:-.02em}.section-desc{margin:.45rem 0 0;max-width:760px;color:#64748b;font-size:.76rem;line-height:1.58}.view-all{display:none;align-items:center;gap:.18rem;color:#1d4ed8;font-size:.72rem;font-weight:900;text-decoration:none}.inventory{background:#fff}.sale-section{background:#f4f7fb}.vehicle-rail,.offer-rail,.tour-rail,.branch-rail,.blog-rail{display:flex;gap:.78rem;overflow-x:auto;overscroll-behavior-inline:contain;scroll-snap-type:x mandatory;padding:.15rem .05rem .8rem;scrollbar-width:none}.vehicle-rail::-webkit-scrollbar,.offer-rail::-webkit-scrollbar,.tour-rail::-webkit-scrollbar,.branch-rail::-webkit-scrollbar,.blog-rail::-webkit-scrollbar{display:none}.vehicle-shell{flex:0 0 min(78vw,310px);min-width:0;overflow:hidden;scroll-snap-align:start;border:1px solid #e2e8f0;border-radius:20px;background:#fff;box-shadow:0 12px 28px rgba(15,23,42,.075)}.mobile-view-all{display:flex;min-height:44px;margin:.2rem auto 0;width:max-content;align-items:center;gap:.2rem;border-radius:12px;background:#0f172a;padding:0 1rem;color:#fff;font-size:.7rem;font-weight:900;text-decoration:none}
    .offers{background:linear-gradient(145deg,#071124,#0b1529);color:#fff}.offers .section-kicker{color:#93c5fd}.offers .section-desc{color:#a8b4c7}.offers .view-all{color:#bfdbfe}.offer-card{flex:0 0 min(78vw,300px);scroll-snap-align:start;overflow:hidden;border:1px solid rgba(255,255,255,.11);border-radius:20px;background:#fff;color:#0f172a;box-shadow:0 18px 44px rgba(2,6,23,.24)}.offer-link{display:block;color:inherit;text-decoration:none}.offer-media{position:relative;aspect-ratio:16/9;overflow:hidden;background:#e2e8f0}.offer-media img{width:100%;height:100%;object-fit:cover}.offer-media::after{content:"";position:absolute;inset:0;background:linear-gradient(to top,rgba(2,6,23,.36),transparent 60%)}.offer-badge{position:absolute;z-index:2;left:.65rem;top:.65rem;max-width:calc(100% - 1.3rem);overflow:hidden;border-radius:999px;background:rgba(2,6,23,.88);padding:.34rem .55rem;color:#fff;font-size:.55rem;font-weight:950;letter-spacing:.04em;text-overflow:ellipsis;white-space:nowrap}.offer-body{padding:.85rem}.offer-hook{color:#2563eb}.offer-body h3{margin:.25rem 0 0;font-size:.93rem;line-height:1.28}.offer-copy{display:-webkit-box;overflow:hidden;margin:.4rem 0 0;color:#5b687b;font-size:.69rem;line-height:1.48;-webkit-box-orient:vertical;-webkit-line-clamp:2}.offer-bottom{display:flex;align-items:end;justify-content:space-between;gap:.5rem;margin-top:.65rem}.offer-price span{display:block;color:#94a3b8;font-size:.58rem;font-weight:800;text-decoration:line-through}.offer-price strong{font-size:1rem}.saving-chip{border-radius:999px;background:#ecfdf5;padding:.35rem .5rem;color:#047857;font-size:.58rem;font-weight:950}.validity{display:flex;align-items:center;gap:.25rem;margin:.52rem 0 0;color:#64748b;font-size:.59rem;font-weight:800}.validity mat-icon{width:14px;height:14px;font-size:14px}.offer-cta{display:flex;min-height:40px;margin-top:.65rem;align-items:center;justify-content:space-between;border-radius:11px;background:#0f172a;padding:0 .75rem;color:#fff;font-size:.66rem;font-weight:950}.offer-cta mat-icon,.mobile-view-all mat-icon,.view-all mat-icon,.tour-body span mat-icon,.branch-card strong mat-icon,.partner-inline mat-icon,.blog-body span mat-icon,.vehicle-partner a mat-icon{width:16px;height:16px;font-size:16px}
    .tours{background:#050b18;color:#fff}.tours .section-kicker{color:#fbbf24}.tours .section-desc{color:#9aa8bb}.tours .view-all{color:#fcd34d}.tour-card{flex:0 0 min(82vw,330px);scroll-snap-align:start;overflow:hidden;border:1px solid rgba(255,255,255,.1);border-radius:20px;background:#0d1728;color:#fff;text-decoration:none}.tour-media{aspect-ratio:16/10;overflow:hidden;background:#111827}.tour-media img{width:100%;height:100%;object-fit:cover}.tour-body{padding:.85rem}.tour-top{display:flex;align-items:start;justify-content:space-between;gap:.5rem}.tour-top h3{margin:0;font-size:.9rem}.tour-top strong{flex:none;color:#fcd34d;font-size:.78rem}.tour-body p{display:-webkit-box;overflow:hidden;margin:.4rem 0 0;color:#94a3b8;font-size:.68rem;line-height:1.45;-webkit-box-orient:vertical;-webkit-line-clamp:2}.tour-body span{display:flex;align-items:center;gap:.15rem;margin-top:.65rem;color:#fcd34d;font-size:.65rem;font-weight:900}
    .branches-section{background:#eef3f9}.branch-card{flex:0 0 min(82vw,330px);scroll-snap-align:start;border:1px solid #dbe3ee;border-radius:20px;background:#fff;padding:1rem;color:#0f172a;text-decoration:none;box-shadow:0 10px 28px rgba(15,23,42,.06)}.branch-icon{display:grid;width:42px;height:42px;place-items:center;border-radius:13px;background:#eff6ff;color:#2563eb}.branch-label{margin-top:.75rem;color:#2563eb}.branch-card h3{margin:.22rem 0 0;font-size:1rem}.branch-card>p:not(.branch-label){display:-webkit-box;overflow:hidden;margin:.4rem 0 0;color:#64748b;font-size:.7rem;line-height:1.5;-webkit-box-orient:vertical;-webkit-line-clamp:3}.branch-meta{display:flex;flex-wrap:wrap;gap:.3rem;margin-top:.65rem}.branch-meta span{border-radius:999px;background:#f1f5f9;padding:.3rem .45rem;color:#475569;font-size:.56rem;font-weight:850}.branch-card strong{display:flex;align-items:center;gap:.15rem;margin-top:.75rem;color:#1d4ed8;font-size:.66rem}.partner-inline{display:flex;margin-top:.45rem;flex-direction:column;gap:.55rem;border:1px dashed #93c5fd;border-radius:16px;background:#eff6ff;padding:.85rem;color:#1e3a8a;text-decoration:none}.partner-inline span,.partner-inline strong{display:flex;align-items:center;gap:.4rem}.partner-inline b{font-size:.72rem}.partner-inline strong{font-size:.68rem}
    .vehicle-partner{background:#050b18;padding:1.7rem .625rem}.vehicle-partner-card{width:min(100%,80rem);margin:auto;display:grid;gap:1rem;border:1px solid rgba(96,165,250,.2);border-radius:24px;background:linear-gradient(135deg,rgba(37,99,235,.15),rgba(15,23,42,.9));padding:1.25rem;color:#fff}.vehicle-partner .section-kicker{color:#93c5fd}.vehicle-partner p:not(.section-kicker){margin:.5rem 0 0;max-width:700px;color:#a8b4c7;font-size:.74rem;line-height:1.55}.vehicle-partner a{display:flex;min-height:46px;align-items:center;justify-content:center;gap:.2rem;border-radius:12px;background:#fff;padding:0 1rem;color:#0f172a;font-size:.7rem;font-weight:950;text-decoration:none}.blog-section{background:#fff}.blog-card{flex:0 0 min(82vw,330px);scroll-snap-align:start;overflow:hidden;border:1px solid #e2e8f0;border-radius:20px;background:#fff;color:#0f172a;text-decoration:none}.blog-media{aspect-ratio:16/9;overflow:hidden;background:#e2e8f0}.blog-media img{width:100%;height:100%;object-fit:cover}.blog-body{padding:.85rem}.blog-body h3{margin:0;font-size:.9rem}.blog-body p{display:-webkit-box;overflow:hidden;margin:.4rem 0 0;color:#64748b;font-size:.68rem;line-height:1.45;-webkit-box-orient:vertical;-webkit-line-clamp:2}.blog-body span{display:flex;align-items:center;gap:.15rem;margin-top:.65rem;color:#1d4ed8;font-size:.65rem;font-weight:900}
    @media(min-width:768px){.home-root{padding-bottom:0}.hero-stage{padding:3.4rem 0 4rem}.desktop-search{display:block}.section{padding:3rem 0}.view-all{display:flex}.mobile-view-all{display:none}.vehicle-rail,.offer-rail,.tour-rail,.branch-rail,.blog-rail{display:grid;overflow:visible;padding:0;scroll-snap-type:none}.vehicle-rail{grid-template-columns:repeat(3,minmax(0,1fr))}.offer-rail,.tour-rail,.branch-rail,.blog-rail{grid-template-columns:repeat(3,minmax(0,1fr))}.vehicle-shell,.offer-card,.tour-card,.branch-card,.blog-card{width:auto;flex:auto}.partner-inline{margin-top:1rem;flex-direction:row;align-items:center;justify-content:space-between}.vehicle-partner{padding:2.5rem 1rem}.vehicle-partner-card{grid-template-columns:1fr auto;align-items:center;padding:2rem}.vehicle-partner a{padding:0 1.4rem}}
    @media(min-width:1024px){.hero-stage{grid-template-columns:1.12fr .88fr;align-items:center;gap:3rem;padding:4.5rem 0 5.25rem}.hero h1{font-size:clamp(3.25rem,5vw,5.2rem)}.hero-copy{font-size:1rem}.planner{padding:1.25rem}.planner h2{font-size:1.85rem}.vehicle-rail{grid-template-columns:repeat(4,minmax(0,1fr))}.offer-rail,.tour-rail,.branch-rail,.blog-rail{gap:1rem}.offer-card:hover,.tour-card:hover,.branch-card:hover,.blog-card:hover,.vehicle-shell:hover{transform:translateY(-4px);box-shadow:0 20px 42px rgba(15,23,42,.12)}.offer-card,.tour-card,.branch-card,.blog-card,.vehicle-shell{transition:transform .22s ease,box-shadow .22s ease,border-color .22s ease}}
    @media(max-width:767px){.hero-grid{right:-55%;bottom:-25%;width:130%;height:52%;opacity:.12;background-size:42px 42px}.hero-copy-block,.planner{transform:none}.hero-stage{padding-top:1.05rem}.trust-row{margin-bottom:.15rem}.section-head{align-items:start}.date-grid{grid-template-columns:1fr 1fr}.offers{padding-top:1.7rem;padding-bottom:1.8rem}}
    @media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;transition:none!important;animation:none!important;transform:none!important}}
  `],
})
export class HomeV71Component {
  readonly carService = inject(CarService);
  readonly homepageLayout = inject(HomepageLayoutService);
  private readonly campaignService = inject(CampaignService);
  private readonly branchService = inject(BranchService);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);

  readonly fallbackImage = "https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=1200&auto=format&fit=crop";
  private readonly fallbackHero = "https://images.unsplash.com/photo-1503376713028-98e6cd35549d?q=82&w=2200&auto=format&fit=crop";
  readonly config = this.carService.getConfig();
  readonly homeContent = computed(() => this.config().homeContent || {});
  readonly brandName = computed(() => this.config().companyName || "Alperler Auto");
  readonly rentalCars = this.carService.getCars();
  readonly saleCars = this.carService.getSaleCars();
  readonly tours = this.carService.getTours();
  readonly blogPosts = this.carService.getBlogPosts();
  readonly branches = this.branchService.branches;
  readonly publicCampaigns = this.campaignService.publicCampaigns;

  searchQuery = "";
  startDate = "";
  endDate = "";
  serviceType: "individual" | "driver" | "wedding" | "tour" = "individual";
  selectedPickupKey = "";
  plannerError = "";
  readonly today = this.toDateInput(new Date());

  readonly heroImage = computed(() => {
    const home = this.homeContent() as Record<string, unknown>;
    const candidate = String(home["heroImage"] || this.config().seoOgImage || "").trim();
    return /^https:\/\//i.test(candidate) ? candidate : this.fallbackHero;
  });

  readonly pickupChoices = computed<PickupChoice[]>(() => {
    const choices: PickupChoice[] = [];
    for (const branch of this.branches().filter((item) => item.isPickupPoint)) {
      const raw = branch.serviceRules?.["pickupLocations"];
      const locations = Array.isArray(raw) ? raw.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 12) : [];
      if (locations.length) {
        locations.forEach((label, index) => choices.push({ key: `${branch.id}:${index}`, branchId: String(branch.cloudId || branch.id), label, branchName: branch.name }));
      } else {
        choices.push({ key: `${branch.id}:main`, branchId: String(branch.cloudId || branch.id), label: `${branch.name} · ${branch.district || branch.city}`, branchName: branch.name });
      }
    }
    return choices;
  });

  private readonly fallbackSections: PublicHomepageSection[] = [
    { sectionKey: "rental_featured", title: "Öne Çıkan Kiralık Araçlar", sectionType: "VEHICLES", isEnabled: true, sortOrder: 10, maxItems: 4, settings: { category: "RENTAL" } },
    { sectionKey: "campaigns", title: "Planınızı Avantaja Çeviren Fırsatlar", sectionType: "CAMPAIGN", isEnabled: true, sortOrder: 5, maxItems: 3, settings: {} },
    { sectionKey: "sale_featured", title: "Öne Çıkan İkinci El Araçlar", sectionType: "VEHICLES", isEnabled: true, sortOrder: 20, maxItems: 4, settings: { category: "SALE" } },
    { sectionKey: "tour_featured", title: "Rehberlerimizle Görmeniz Gereken Rotalar", sectionType: "TOURS", isEnabled: true, sortOrder: 30, maxItems: 4, settings: {} },
    { sectionKey: "branches", title: "Size En Yakın Alperler Auto", sectionType: "CUSTOM", isEnabled: true, sortOrder: 35, maxItems: 3, settings: {} },
    { sectionKey: "partner", title: "Aracınız Değerini Bulsun", sectionType: "CUSTOM", isEnabled: true, sortOrder: 40, maxItems: 1, settings: {} },
    { sectionKey: "blog_featured", title: "Yola Çıkmadan Önce", sectionType: "BLOG", isEnabled: true, sortOrder: 50, maxItems: 3, settings: {} },
  ];

  readonly managedSections = computed(() => {
    const sections = this.homepageLayout.sections();
    if (sections.length) return [...sections].filter((section) => section.isEnabled).sort((a, b) => a.sortOrder - b.sortOrder);
    if (this.homepageLayout.loaded()) return this.fallbackSections;
    return [] as PublicHomepageSection[];
  });

  constructor() {
    void this.homepageLayout.load();
    void this.branchService.refresh();
    void this.campaignService.loadPublic().catch(() => undefined);
    effect(() => {
      const cfg = this.config();
      this.seo.updateSeoTags({ title: cfg.seoTitle || `${cfg.companyName} | Araç Kiralama, Satış ve Turlar`, description: cfg.seoDescription || this.homeContent().heroSubtitle || cfg.companyName, keywords: cfg.seoKeywords, image: cfg.seoOgImage || cfg.logoUrl || this.fallbackHero });
    });
  }

  performSearch(): void {
    const q = this.searchQuery.trim();
    void this.router.navigate(["/search"], { queryParams: q ? { q } : undefined });
  }

  clearPlannerError(): void { this.plannerError = ""; }

  onStartDateChanged(value: string): void {
    if (this.endDate && value && this.endDate < value) this.endDate = "";
    this.clearPlannerError();
  }

  searchAvailability(): void {
    this.clearPlannerError();
    if (!this.startDate) { this.plannerError = this.serviceType === "tour" ? "Önce tur tarihini seçin." : "Önce alış tarihini seçin."; return; }
    if (this.serviceType !== "tour" && !this.endDate) { this.plannerError = "İade tarihini de seçin."; return; }
    if (this.serviceType !== "tour" && this.endDate < this.startDate) { this.plannerError = "İade tarihi alış tarihinden önce olamaz."; return; }

    if (this.serviceType === "tour") {
      void this.router.navigate(["/tours"], { queryParams: { start: this.startDate } });
      return;
    }

    const pickup = this.pickupChoices().find((item) => item.key === this.selectedPickupKey);
    if (!pickup) { this.plannerError = "Nereden teslim almak istediğinizi seçin."; return; }
    void this.router.navigate(["/fleet"], {
      queryParams: {
        start: this.startDate,
        end: this.endDate,
        pickup: pickup.branchId,
        pickupLocation: pickup.label,
        driver: this.serviceType === "driver" || this.serviceType === "wedding" ? "true" : undefined,
        occasion: this.serviceType === "wedding" ? "wedding" : undefined,
      },
    });
  }

  plannerSummary(): string {
    if (!this.startDate) return "";
    const start = this.formatShortDate(this.startDate);
    const end = this.serviceType === "tour" || !this.endDate ? "" : ` - ${this.formatShortDate(this.endDate)}`;
    const pickup = this.pickupChoices().find((item) => item.key === this.selectedPickupKey);
    return `${start}${end}${pickup ? ` · ${pickup.label}` : ""}`;
  }

  bookingButtonLabel(): string {
    if (this.serviceType === "tour") return "Bu Tarihe Uyan Turları Göster";
    if (this.serviceType === "driver") return "Şoförlü Araçları Göster";
    if (this.serviceType === "wedding") return "Özel Gün Araçlarını Göster";
    return "Tarihime Uyan Araçları Göster";
  }

  sectionVehicles(section: PublicHomepageSection): Vehicle[] {
    const source = this.vehicleSectionRoute(section) === "/sales" ? this.saleCars() : this.rentalCars();
    const ids = this.placementIds(section, "VEHICLE");
    if (!ids?.length) return source.slice(0, section.maxItems);
    const map = this.vehicleIndex(source);
    return ids.map((id) => map.get(id)).filter((item): item is Vehicle => Boolean(item)).slice(0, section.maxItems);
  }

  sectionTours(section: PublicHomepageSection): Vehicle[] {
    const source = this.tours();
    const ids = this.placementIds(section, "TOUR");
    if (!ids?.length) return source.slice(0, section.maxItems);
    const map = this.vehicleIndex(source);
    return ids.map((id) => map.get(id)).filter((item): item is Vehicle => Boolean(item)).slice(0, section.maxItems);
  }

  sectionBlogs(section: PublicHomepageSection): BlogPost[] {
    const source = this.blogPosts();
    const ids = this.placementIds(section, "BLOG");
    if (!ids?.length) return source.slice(0, section.maxItems);
    const map = new Map<string, BlogPost>();
    source.forEach((item) => { map.set(String(item.id), item); if (item.cloudId) map.set(String(item.cloudId), item); });
    return ids.map((id) => map.get(id)).filter((item): item is BlogPost => Boolean(item)).slice(0, section.maxItems);
  }

  campaignCards(section: PublicHomepageSection): CampaignRecord[] {
    const source = this.publicCampaigns().filter((item) => this.isLiveCampaign(item)).sort((a, b) => a.sortOrder - b.sortOrder);
    const ids = this.placementIds(section, "CAMPAIGN");
    if (!ids?.length) return source.slice(0, section.maxItems);
    const map = new Map(source.map((item) => [String(item.id), item]));
    return ids.map((id) => map.get(id)).filter((item): item is CampaignRecord => Boolean(item)).slice(0, section.maxItems);
  }

  branchCards(section: PublicHomepageSection): Branch[] { return this.branches().slice(0, Math.max(1, section.maxItems || 3)); }
  stableVehicleKey(item: Vehicle): string { return String(item.cloudId || item.id); }
  entityTitle(item: Vehicle): string { return item.title || [item.brand, item.model, item.year].filter(Boolean).join(" ") || `İlan ${item.id}`; }
  vehicleSectionRoute(section: PublicHomepageSection): string { return String(section.settings?.["category"] || "").toUpperCase() === "SALE" ? "/sales" : "/fleet"; }
  vehicleSectionBadge(section: PublicHomepageSection): string { return this.vehicleSectionRoute(section) === "/sales" ? this.homeContent().salesBadge || "Seçili İkinci El Araçlar" : this.homeContent().featuredBadge || "Seçili Kiralık Araçlar"; }
  vehicleSectionSubtitle(section: PublicHomepageSection): string { return this.vehicleSectionRoute(section) === "/sales" ? this.homeContent().salesDescription || "Beğendiğiniz aracı ayrıntıları, donanımı ve fiyatıyla birlikte inceleyin." : this.homeContent().featuredSubtitle || "Günlük planınıza, kişi sayınıza ve bütçenize uyan araçları karşılaştırın."; }
  vehicleSectionViewAll(section: PublicHomepageSection): string { return this.vehicleSectionRoute(section) === "/sales" ? this.homeContent().salesViewAll || "Tüm Satılık Araçlar" : this.homeContent().featuredViewAll || "Tüm Kiralık Araçlar"; }

  campaignSavings(campaign: CampaignRecord): number { return campaign.oldPrice != null && campaign.newPrice != null ? Math.max(0, campaign.oldPrice - campaign.newPrice) : 0; }
  campaignHook(campaign: CampaignRecord): string {
    const saving = this.campaignSavings(campaign);
    if (saving > 0) return `${this.formatPrice(saving)} cebinizde kalsın`;
    if (campaign.discountPercent) return `%${campaign.discountPercent} avantaj`;
    return "Planınıza değer katan fırsat";
  }
  campaignValidity(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Geçerlilik koşullarını inceleyin";
    return `${new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" }).format(date)} tarihine kadar`;
  }
  formatPrice(value: number): string { return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(value); }
  branchDemo(branch: Branch): boolean { return branch.serviceRules?.["demo"] === true || /\bdemo\b/i.test(branch.name); }

  campaignHref(campaign: CampaignRecord): string {
    const cta = (campaign.ctaUrl || "").trim();
    if (cta && (/^https:\/\//i.test(cta) || cta.startsWith("/"))) return cta;
    if (campaign.targetType === "TOUR" && campaign.targetId) return `/tour/${encodeURIComponent(campaign.targetId)}`;
    if (campaign.targetType === "VEHICLE" && campaign.targetId) {
      const vehicle = [...this.rentalCars(), ...this.saleCars()].find((item) => String(item.cloudId || item.id) === String(campaign.targetId) || String(item.id) === String(campaign.targetId));
      return vehicle?.category === "SALE" ? `/sales/${encodeURIComponent(vehicle.id)}` : `/fleet/${encodeURIComponent(vehicle?.id || campaign.targetId)}`;
    }
    return "/campaigns";
  }

  private placementIds(section: PublicHomepageSection, type: "VEHICLE" | "TOUR" | "BLOG" | "CAMPAIGN"): string[] | null {
    if (!this.homepageLayout.loaded() || this.homepageLayout.error()) return null;
    const values = this.homepageLayout.placementsFor(section.sectionKey).filter((item) => item.entityType === type).map((item) => item.entityId);
    return values.length ? values : null;
  }

  private vehicleIndex(source: Vehicle[]): Map<string, Vehicle> {
    const map = new Map<string, Vehicle>();
    for (const item of source) { map.set(String(item.id), item); if (item.cloudId) map.set(String(item.cloudId), item); if (item.cloudStockCode) map.set(String(item.cloudStockCode), item); }
    return map;
  }

  private isLiveCampaign(item: CampaignRecord): boolean {
    if (!item.isActive || item.publicationStatus !== "PUBLISHED") return false;
    const now = Date.now();
    const start = item.startsAt ? new Date(item.startsAt).getTime() : Number.NEGATIVE_INFINITY;
    const end = item.endsAt ? new Date(item.endsAt).getTime() : Number.POSITIVE_INFINITY;
    return (!item.startsAt || (Number.isFinite(start) && start <= now)) && (!item.endsAt || (Number.isFinite(end) && end > now));
  }

  private parseLocalDate(value: string): Date | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return null;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return Number.isNaN(date.getTime()) ? null : date;
  }
  private formatShortDate(value: string): string { const date = this.parseLocalDate(value); return date ? new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short" }).format(date) : value; }
  private toDateInput(date: Date): string { const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000); return local.toISOString().slice(0, 10); }
}
