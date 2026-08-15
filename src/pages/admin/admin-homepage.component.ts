import { CommonModule } from "@angular/common";
import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { CarService } from "../../services/car.service";
import {
  AdminManagementService,
  HomepagePlacement,
  HomepageSection,
} from "../../services/admin-management.service";
import { CampaignService } from "../../services/campaign.service";
import { ToastService } from "../../services/toast.service";

interface Candidate {
  id: string;
  type: "VEHICLE" | "TOUR" | "BLOG" | "CAMPAIGN";
  label: string;
  image?: string;
  meta?: string;
}

@Component({
  selector: "app-admin-homepage",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <main class="min-h-full bg-slate-50 p-4 md:p-8">
      <div class="mx-auto max-w-7xl space-y-6">
        <header class="rounded-3xl bg-slate-950 p-6 text-white shadow-xl md:p-8">
          <p class="text-xs font-black uppercase tracking-[.2em] text-blue-400">Canlı içerik yerleşimi</p>
          <div class="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 class="text-3xl font-black md:text-4xl">Ana Sayfa Vitrin Yönetimi</h1>
              <p class="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300">Kiralık, satılık, kampanya, tur ve blog bölümlerinin sırasını; hangi içeriklerin görüneceğini ve her bölümün kart limitini buradan yönetin. Değişiklikler Supabase veritabanına kaydedilir.</p>
            </div>
            <button type="button" (click)="refresh()" [disabled]="loading()" class="min-h-12 rounded-xl bg-white px-5 font-black text-slate-950 disabled:opacity-50">{{ loading() ? 'Yükleniyor…' : 'Veriyi Yenile' }}</button>
          </div>
        </header>

        @if (error()) {
          <div role="alert" class="rounded-2xl border border-rose-200 bg-rose-50 p-4 font-bold text-rose-800">{{ error() }}</div>
        }

        <section class="grid gap-4 xl:grid-cols-[360px_1fr]">
          <aside class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm xl:sticky xl:top-20 xl:self-start">
            <h2 class="text-lg font-black text-slate-900">Bölüm Sırası</h2>
            <p class="mt-1 text-xs leading-relaxed text-slate-500">Yukarı ve aşağı düğmeleri ana sayfadaki bölüm sırasını değiştirir.</p>
            <div class="mt-4 space-y-2">
              @for (section of sections(); track section.sectionKey; let i = $index) {
                <div class="rounded-2xl border border-slate-200 p-3" [class.opacity-50]="!section.isEnabled">
                  <div class="flex items-start gap-3">
                    <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 font-black text-slate-500">{{ i + 1 }}</div>
                    <div class="min-w-0 flex-1">
                      <strong class="block truncate text-sm text-slate-900">{{ section.title }}</strong>
                      <small class="text-slate-500">{{ section.sectionKey }}</small>
                    </div>
                    <div class="flex gap-1">
                      <button type="button" (click)="moveSection(i,-1)" [disabled]="i===0" class="h-9 w-9 rounded-lg border border-slate-200 disabled:opacity-30" aria-label="Bölümü yukarı taşı">↑</button>
                      <button type="button" (click)="moveSection(i,1)" [disabled]="i===sections().length-1" class="h-9 w-9 rounded-lg border border-slate-200 disabled:opacity-30" aria-label="Bölümü aşağı taşı">↓</button>
                    </div>
                  </div>
                  <div class="mt-3 grid grid-cols-2 gap-2">
                    <label class="flex min-h-10 items-center gap-2 rounded-xl bg-slate-50 px-3 text-xs font-bold"><input type="checkbox" [(ngModel)]="section.isEnabled" (change)="saveSection(section)" /> Aktif</label>
                    <label class="flex items-center gap-2 rounded-xl bg-slate-50 px-3 text-xs font-bold">Kart <input type="number" min="1" max="24" [(ngModel)]="section.maxItems" (change)="saveSection(section)" class="w-14 rounded border border-slate-200 px-2 py-1" /></label>
                  </div>
                </div>
              }
            </div>
          </aside>

          <div class="space-y-5">
            @for (section of sections(); track section.sectionKey) {
              <article class="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <header class="flex flex-col gap-3 border-b border-slate-100 p-5 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p class="text-[10px] font-black uppercase tracking-[.16em] text-blue-600">{{ section.sectionType }}</p>
                    <h2 class="text-xl font-black text-slate-900">{{ section.title }}</h2>
                    <p class="text-xs text-slate-500">En fazla {{ section.maxItems }} içerik gösterilecek</p>
                  </div>
                  <div class="flex min-w-0 flex-1 gap-2 md:max-w-xl">
                    <select [ngModel]="candidateSelection()[section.sectionKey] || ''" (ngModelChange)="selectCandidate(section.sectionKey,$event)" class="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold">
                      <option value="">İçerik seç…</option>
                      @for (candidate of candidatesFor(section); track candidate.type + candidate.id) {
                        <option [value]="candidate.type + ':' + candidate.id">{{ candidate.label }}</option>
                      }
                    </select>
                    <button type="button" (click)="addSelected(section)" class="min-h-11 rounded-xl bg-blue-600 px-4 text-sm font-black text-white">Ekle</button>
                  </div>
                </header>

                <div class="p-4 md:p-5">
                  @for (placement of placementsFor(section.sectionKey); track placement.id; let i = $index) {
                    <div class="mb-2 flex items-center gap-3 rounded-2xl border border-slate-200 p-3 last:mb-0" [class.bg-slate-50]="!placement.isActive">
                      <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 font-black text-white">{{ i + 1 }}</div>
                      @if (candidateByPlacement(placement)?.image) {
                        <img [src]="candidateByPlacement(placement)?.image" [alt]="candidateByPlacement(placement)?.label || ''" class="h-14 w-20 shrink-0 rounded-xl object-cover" referrerpolicy="no-referrer" />
                      }
                      <div class="min-w-0 flex-1">
                        <strong class="block truncate text-sm text-slate-900">{{ candidateByPlacement(placement)?.label || placement.entityId }}</strong>
                        <small class="block truncate text-slate-500">{{ placement.entityType }} · {{ candidateByPlacement(placement)?.meta || placement.entityId }}</small>
                      </div>
                      <label class="hidden items-center gap-1 text-xs font-bold text-slate-600 sm:flex"><input type="checkbox" [(ngModel)]="placement.isActive" (change)="savePlacement(placement)" /> Göster</label>
                      <div class="flex gap-1">
                        <button type="button" (click)="movePlacement(section.sectionKey,i,-1)" [disabled]="i===0" class="h-10 w-10 rounded-xl border border-slate-200 disabled:opacity-30" aria-label="İçeriği yukarı taşı">↑</button>
                        <button type="button" (click)="movePlacement(section.sectionKey,i,1)" [disabled]="i===placementsFor(section.sectionKey).length-1" class="h-10 w-10 rounded-xl border border-slate-200 disabled:opacity-30" aria-label="İçeriği aşağı taşı">↓</button>
                        <button type="button" (click)="removePlacement(placement)" class="h-10 rounded-xl bg-rose-50 px-3 text-xs font-black text-rose-700">Çıkar</button>
                      </div>
                    </div>
                  } @empty {
                    <div class="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">Bu bölümde henüz içerik yok.</div>
                  }
                </div>
              </article>
            }
          </div>
        </section>
      </div>
    </main>
  `,
})
export class AdminHomepageComponent implements OnInit {
  private readonly management = inject(AdminManagementService);
  private readonly cars = inject(CarService);
  private readonly campaigns = inject(CampaignService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(false);
  readonly error = signal("");
  readonly candidateSelection = signal<Record<string, string>>({});
  readonly sections = computed(() => [...this.management.sections()].sort((a,b) => a.sortOrder-b.sortOrder));

  ngOnInit(): void { void this.refresh(); }

  async refresh(): Promise<void> {
    this.loading.set(true); this.error.set("");
    try {
      await Promise.all([this.management.refreshHomepage(), this.campaigns.refreshAdmin()]);
    } catch (error) { this.error.set(this.message(error)); }
    finally { this.loading.set(false); }
  }

  placementsFor(sectionKey: string): HomepagePlacement[] {
    return this.management.placements().filter((row) => row.sectionKey === sectionKey).sort((a,b) => a.sortOrder-b.sortOrder);
  }

  candidatesFor(section: HomepageSection): Candidate[] {
    const placed = new Set(this.placementsFor(section.sectionKey).map((row) => `${row.entityType}:${row.entityId}`));
    return this.allCandidates(section).filter((candidate) => !placed.has(`${candidate.type}:${candidate.id}`));
  }

  candidateByPlacement(placement: HomepagePlacement): Candidate | undefined {
    return this.allCandidates().find((candidate) => candidate.type === placement.entityType && candidate.id === placement.entityId);
  }

  selectCandidate(sectionKey: string, value: string): void {
    this.candidateSelection.update((state) => ({ ...state, [sectionKey]: value }));
  }

  async addSelected(section: HomepageSection): Promise<void> {
    const raw = this.candidateSelection()[section.sectionKey];
    if (!raw) return;
    const separator = raw.indexOf(":");
    const type = raw.slice(0, separator) as Candidate["type"];
    const id = raw.slice(separator + 1);
    const next = this.placementsFor(section.sectionKey).length + 1;
    try {
      await this.management.addPlacement({ sectionKey: section.sectionKey, entityType: type, entityId: id, sortOrder: next, isActive: true, metadata: {} });
      this.selectCandidate(section.sectionKey, "");
      this.toast.show("İçerik vitrine eklendi.", "success");
    } catch (error) { this.toast.show(this.message(error), "error"); }
  }

  async moveSection(index: number, delta: number): Promise<void> {
    const rows = this.sections(); const target = index + delta;
    if (target < 0 || target >= rows.length) return;
    [rows[index], rows[target]] = [rows[target], rows[index]];
    try { await this.management.reorderSections(rows.map((row) => row.sectionKey)); }
    catch (error) { this.toast.show(this.message(error), "error"); }
  }

  async saveSection(section: HomepageSection): Promise<void> {
    try { await this.management.updateSection(section); this.toast.show("Bölüm ayarı kaydedildi.", "success"); }
    catch (error) { this.toast.show(this.message(error), "error"); }
  }

  async movePlacement(sectionKey: string, index: number, delta: number): Promise<void> {
    const rows = this.placementsFor(sectionKey); const target = index + delta;
    if (target < 0 || target >= rows.length) return;
    [rows[index], rows[target]] = [rows[target], rows[index]];
    try { await this.management.reorderPlacements(sectionKey, rows.map((row) => row.id)); }
    catch (error) { this.toast.show(this.message(error), "error"); }
  }

  async savePlacement(placement: HomepagePlacement): Promise<void> {
    try { await this.management.updatePlacement(placement); }
    catch (error) { this.toast.show(this.message(error), "error"); }
  }

  async removePlacement(placement: HomepagePlacement): Promise<void> {
    try { await this.management.removePlacement(placement.id); this.toast.show("İçerik vitrinden çıkarıldı ve sıra otomatik sıkıştırıldı.", "info"); }
    catch (error) { this.toast.show(this.message(error), "error"); }
  }

  private allCandidates(section?: HomepageSection): Candidate[] {
    const vehicles = this.cars.getAllVehicles()().filter((item) => item.category !== "TOUR" && item.cloudId).map((item) => ({
      id: item.cloudId!, type: "VEHICLE" as const, label: `${item.brand || ''} ${item.model || ''}`.trim(), image: item.image,
      meta: `${item.category === 'RENTAL' ? 'Kiralık' : 'Satılık'} · ${item.year || ''}`,
    }));
    const tours = this.cars.getTours()().filter((item) => item.cloudId).map((item) => ({ id: item.cloudId!, type: "TOUR" as const, label: item.title || "Tur", image: item.image, meta: item.duration || "Tur" }));
    const blogs = this.cars.getBlogPosts()().map((item: any) => ({ id: String(item.cloudId || ""), type: "BLOG" as const, label: item.title, image: item.image, meta: item.date })).filter((item) => item.id);
    const campaigns = this.campaigns.campaigns().map((item) => ({ id: item.id, type: "CAMPAIGN" as const, label: item.title, image: item.coverImage, meta: `${item.publicationStatus} · ${item.campaignType}` }));
    if (!section) return [...vehicles, ...tours, ...blogs, ...campaigns];
    if (section.sectionType === "TOURS") return tours;
    if (section.sectionType === "BLOG") return blogs;
    if (section.sectionType === "CAMPAIGN" || section.sectionKey === "campaigns") return campaigns;
    const category = String(section.settings?.["category"] || "");
    if (category === "RENTAL" || section.sectionKey === "rental_featured") return vehicles.filter((item) => item.meta?.startsWith("Kiralık"));
    if (category === "SALE" || section.sectionKey === "sale_featured") return vehicles.filter((item) => item.meta?.startsWith("Satılık"));
    return vehicles;
  }

  private message(error: unknown): string { return error instanceof Error ? error.message : "İşlem tamamlanamadı."; }
}