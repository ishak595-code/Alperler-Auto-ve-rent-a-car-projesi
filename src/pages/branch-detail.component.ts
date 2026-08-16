import { CommonModule, Location } from "@angular/common";
import { Component, OnInit, inject, signal } from "@angular/core";
import { MatIconModule } from "@angular/material/icon";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { Branch } from "../models/branch.model";
import { Vehicle } from "../models/car.model";

interface BranchNetworkResponse {
  ok: boolean;
  code?: string;
  branch?: Branch;
  vehicles?: Vehicle[];
  tours?: Vehicle[];
  counts?: { rentals: number; sales: number; tours: number };
  standards?: { centralPricing: boolean; listingApproval: boolean; customerGuarantee: boolean };
}

@Component({
  selector: "app-branch-detail",
  standalone: true,
  imports: [CommonModule, MatIconModule, RouterLink],
  template: `
    <main class="min-h-screen bg-slate-950 pb-24 text-slate-200">
      <header class="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div class="mx-auto flex min-h-16 max-w-6xl items-center gap-3 px-4">
          <button type="button" (click)="location.back()" aria-label="Şubeden geri dön" class="grid h-11 w-11 place-items-center rounded-full hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"><mat-icon aria-hidden="true">arrow_back</mat-icon></button>
          <div class="min-w-0"><div class="text-[10px] font-black uppercase tracking-[.18em] text-blue-400">Alperler Auto Şube Ağı</div><div class="truncate text-lg font-black text-white">{{ branch()?.name || 'Şube' }}</div></div>
        </div>
      </header>

      @if (loading()) {
        <section class="mx-auto max-w-6xl px-4 py-20 text-center" aria-live="polite"><p class="font-bold text-slate-400">Şube bilgileri yükleniyor...</p></section>
      } @else if (error()) {
        <section class="mx-auto max-w-3xl px-4 py-20"><div role="alert" class="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6"><h1 class="text-xl font-black text-white">Şube şu anda görüntülenemiyor</h1><p class="mt-2 text-sm leading-6 text-rose-100">Bu şube aktif olmayabilir veya bağlantı geçici olarak kurulamadı.</p><a routerLink="/branches" class="mt-5 inline-flex min-h-12 items-center rounded-xl bg-white px-5 font-black text-slate-950">Tüm Şubelere Dön</a></div></section>
      } @else if (branch(); as current) {
        <section class="border-b border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950/30">
          <div class="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[1.35fr_.65fr] lg:py-14">
            <div>
              <div class="flex flex-wrap items-center gap-2"><span class="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-300">Aktif Alperler Auto Noktası</span>@if(current.networkType === 'FRANCHISE'){<span class="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-black text-blue-300">Yetkili İş Ortağı</span>}</div>
              <h1 class="mt-4 text-3xl font-black text-white sm:text-5xl">{{ current.name }}</h1>
              <p class="mt-3 text-lg font-bold text-slate-300">{{ current.city }} / {{ current.district }}</p>
              <p class="mt-4 max-w-3xl leading-7 text-slate-400">{{ current.publicDescription || 'Bu şubede yayınlanan araçlar ve hizmetler yalnızca bu şubenin operasyon alanına aittir. Fiyat, güvenlik ve müşteri standartları Alperler Auto merkezi kurallarına tabidir.' }}</p>
              @if(current.territoryLabel){<p class="mt-3 text-sm text-slate-500"><strong class="text-slate-300">Hizmet bölgesi:</strong> {{ current.territoryLabel }}</p>}
              <div class="mt-6 flex flex-wrap gap-3"><a [href]="'tel:' + current.phone" class="inline-flex min-h-12 items-center gap-2 rounded-xl bg-blue-500 px-5 font-black text-slate-950"><mat-icon aria-hidden="true">call</mat-icon>Şubeyi Ara</a>@if(current.whatsapp){<a [href]="whatsappUrl(current.whatsapp)" target="_blank" rel="noopener noreferrer" class="inline-flex min-h-12 items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 font-black text-emerald-200"><mat-icon aria-hidden="true">chat</mat-icon>WhatsApp</a>}</div>
            </div>
            <aside class="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
              <div class="text-xs font-black uppercase tracking-wider text-slate-500">Şube Özeti</div>
              <div class="mt-4 grid grid-cols-3 gap-2 text-center"><div class="stat"><strong>{{ counts().rentals }}</strong><span>Kiralık</span></div><div class="stat"><strong>{{ counts().sales }}</strong><span>Satılık</span></div><div class="stat"><strong>{{ counts().tours }}</strong><span>Tur</span></div></div>
              <div class="mt-5 space-y-3 text-sm"><div class="flex gap-3"><mat-icon class="text-slate-500" aria-hidden="true">location_on</mat-icon><span>{{ current.addressLabel }}</span></div>@if(current.email){<div class="flex gap-3"><mat-icon class="text-slate-500" aria-hidden="true">mail</mat-icon><a [href]="'mailto:' + current.email" class="break-all">{{ current.email }}</a></div>}</div>
            </aside>
          </div>
        </section>

        <section class="mx-auto max-w-6xl px-4 py-8">
          <h2 class="text-xl font-black text-white">Bu şubede hangi standartlar geçerli?</h2>
          <div class="mt-4 grid gap-3 md:grid-cols-3">
            <div class="standard"><mat-icon aria-hidden="true">verified_user</mat-icon><div><strong>Müşteri Güvencesi</strong><p>{{ standards().customerGuarantee ? 'İlan, fiyat ve hizmet koşulları merkezi müşteri standardına tabidir.' : 'Şube hizmet koşulları işlem öncesi açıkça gösterilir.' }}</p></div></div>
            <div class="standard"><mat-icon aria-hidden="true">price_check</mat-icon><div><strong>Merkezi Fiyat Disiplini</strong><p>{{ standards().centralPricing ? 'Şube, merkez tarafından tanımlanan fiyat sınırlarının dışına çıkamaz.' : 'Fiyat koşulları ilan üzerinde açıkça gösterilir.' }}</p></div></div>
            <div class="standard"><mat-icon aria-hidden="true">fact_check</mat-icon><div><strong>Yayın Kontrolü</strong><p>{{ standards().listingApproval ? 'Şube kaynaklı yeni ilanlar merkez kontrolünden geçmeden canlıya çıkmaz.' : 'İlanlar yayın kurallarına uygun olarak yönetilir.' }}</p></div></div>
          </div>
        </section>

        @if (rentals().length) {
          <section class="mx-auto max-w-6xl px-4 py-7" aria-labelledby="branch-rentals"><div class="mb-4 flex items-end justify-between gap-3"><div><div class="text-xs font-black uppercase tracking-wider text-blue-400">Sadece bu şube</div><h2 id="branch-rentals" class="mt-1 text-2xl font-black text-white">Kiralık Araçlar</h2></div><span class="text-sm font-bold text-slate-500">{{ rentals().length }} araç</span></div><div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">@for(item of rentals(); track item.cloudId || item.id){<a [routerLink]="['/fleet',item.id]" class="listing"><img [src]="item.image || '/assets/car-placeholder.jpg'" [alt]="vehicleTitle(item)" loading="lazy"/><div class="p-4"><div class="text-xs font-black uppercase text-blue-400">{{ current.district }} Şubesi</div><h3 class="mt-1 text-lg font-black text-white">{{ vehicleTitle(item) }}</h3><p class="mt-2 text-sm text-slate-400">{{ item.transmission || 'Şanzıman bilgisi' }} · {{ item.fuel || 'Yakıt bilgisi' }}</p><div class="mt-4 text-xl font-black text-white">{{ item.price | number:'1.0-0' }} ₺ <span class="text-xs font-semibold text-slate-500">/ gün</span></div></div></a>}</div></section>
        }

        @if (sales().length) {
          <section class="mx-auto max-w-6xl px-4 py-7" aria-labelledby="branch-sales"><div class="mb-4 flex items-end justify-between gap-3"><div><div class="text-xs font-black uppercase tracking-wider text-amber-400">Sadece bu şube</div><h2 id="branch-sales" class="mt-1 text-2xl font-black text-white">Satılık Araçlar</h2></div><span class="text-sm font-bold text-slate-500">{{ sales().length }} araç</span></div><div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">@for(item of sales(); track item.cloudId || item.id){<a [routerLink]="['/sales',item.id]" class="listing"><img [src]="item.image || '/assets/car-placeholder.jpg'" [alt]="vehicleTitle(item)" loading="lazy"/><div class="p-4"><div class="text-xs font-black uppercase text-amber-400">{{ current.district }} Şubesi</div><h3 class="mt-1 text-lg font-black text-white">{{ vehicleTitle(item) }}</h3><p class="mt-2 text-sm text-slate-400">{{ item.year || '' }} @if(item.km !== undefined){· {{ item.km | number:'1.0-0' }} km}</p><div class="mt-4 text-xl font-black text-white">{{ item.price | number:'1.0-0' }} ₺</div></div></a>}</div></section>
        }

        @if (tours().length) {
          <section class="mx-auto max-w-6xl px-4 py-7" aria-labelledby="branch-tours"><div class="mb-4"><div class="text-xs font-black uppercase tracking-wider text-emerald-400">Bu şubenin operasyonu</div><h2 id="branch-tours" class="mt-1 text-2xl font-black text-white">Tur ve Deneyimler</h2></div><div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">@for(item of tours(); track item.cloudId || item.id){<a [routerLink]="['/tour',item.id]" class="listing"><img [src]="item.image || '/assets/car-placeholder.jpg'" [alt]="item.title || 'Tur'" loading="lazy"/><div class="p-4"><h3 class="text-lg font-black text-white">{{ item.title }}</h3><p class="mt-2 text-sm text-slate-400">{{ item.duration || 'Süre bilgisi için şubeyle görüşün' }}</p><div class="mt-4 text-xl font-black text-white">{{ item.price | number:'1.0-0' }} ₺</div></div></a>}</div></section>
        }

        @if (!rentals().length && !sales().length && !tours().length) {
          <section class="mx-auto max-w-6xl px-4 py-10"><div class="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center"><h2 class="text-xl font-black text-white">Bu şubede henüz canlı ilan yok</h2><p class="mt-2 text-sm leading-6 text-slate-400">Şube kaynaklı ilanlar merkezi kalite ve yayın kontrolünü tamamladıktan sonra burada görünür.</p></div></section>
        }
      }
    </main>
  `,
  styles: [`
    .stat{display:flex;min-height:84px;flex-direction:column;align-items:center;justify-content:center;border:1px solid #1e293b;border-radius:14px;background:#020617}.stat strong{font-size:1.35rem;color:#fff}.stat span{margin-top:3px;font-size:.68rem;font-weight:800;color:#64748b}.standard{display:flex;gap:.8rem;border:1px solid #1e293b;border-radius:16px;background:#0f172a;padding:1rem}.standard mat-icon{flex:none;color:#60a5fa}.standard strong{display:block;color:#fff}.standard p{margin-top:.25rem;font-size:.78rem;line-height:1.35rem;color:#94a3b8}.listing{overflow:hidden;border:1px solid #1e293b;border-radius:16px;background:#0f172a;transition:.18s ease}.listing:hover{transform:translateY(-2px);border-color:#334155}.listing:focus-visible{outline:2px solid #60a5fa;outline-offset:3px}.listing img{width:100%;height:190px;object-fit:cover;background:#020617}
  `],
})
export class BranchDetailComponent implements OnInit {
  readonly location = inject(Location);
  private readonly route = inject(ActivatedRoute);
  readonly branch = signal<Branch | null>(null);
  readonly rentals = signal<Vehicle[]>([]);
  readonly sales = signal<Vehicle[]>([]);
  readonly tours = signal<Vehicle[]>([]);
  readonly counts = signal({ rentals: 0, sales: 0, tours: 0 });
  readonly standards = signal({ centralPricing: true, listingApproval: true, customerGuarantee: true });
  readonly loading = signal(true);
  readonly error = signal(false);

  async ngOnInit(): Promise<void> {
    const slug = (this.route.snapshot.paramMap.get("slug") || "").trim().toLowerCase();
    if (!slug) { this.loading.set(false); this.error.set(true); return; }
    try {
      const response = await fetch(`/api/branch-network?slug=${encodeURIComponent(slug)}`, { headers: { accept: "application/json" }, cache: "no-store" });
      const payload = (await response.json().catch(() => ({}))) as BranchNetworkResponse;
      if (!response.ok || !payload.ok || !payload.branch) throw new Error(payload.code || "BRANCH_LOAD_FAILED");
      const vehicles = Array.isArray(payload.vehicles) ? payload.vehicles : [];
      this.branch.set(payload.branch);
      this.rentals.set(vehicles.filter((item) => item.category === "RENTAL"));
      this.sales.set(vehicles.filter((item) => item.category === "SALE"));
      this.tours.set(Array.isArray(payload.tours) ? payload.tours : []);
      this.counts.set(payload.counts || { rentals: this.rentals().length, sales: this.sales().length, tours: this.tours().length });
      this.standards.set(payload.standards || this.standards());
    } catch {
      this.error.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  vehicleTitle(item: Vehicle): string { return [item.brand, item.model].filter(Boolean).join(" ") || item.title || "Araç"; }
  whatsappUrl(value: string): string { return `https://wa.me/${value.replace(/\D/g, "")}`; }
}
