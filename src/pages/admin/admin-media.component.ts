import { CommonModule } from "@angular/common";
import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { DomSanitizer, SafeResourceUrl } from "@angular/platform-browser";
import { MatIconModule } from "@angular/material/icon";
import { CarService } from "../../services/car.service";
import {
  CatalogEntityType,
  CatalogMediaItem,
  CatalogMediaService,
} from "../../services/catalog-media.service";
import { ToastService } from "../../services/toast.service";

interface EntityOption {
  type: CatalogEntityType;
  id: string;
  label: string;
  image?: string;
}

type VerificationScope =
  | "ACTUAL_ASSET"
  | "EXACT_MODEL_YEAR"
  | "MODEL_FAMILY"
  | "EXACT_LOCATION"
  | "NEARBY_LOCATION"
  | "REFERENCE";

@Component({
  selector: "app-admin-media",
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <main class="min-h-full bg-slate-50 p-4 md:p-8">
      <div class="mx-auto max-w-7xl space-y-6">
        <header class="rounded-3xl bg-slate-950 p-6 text-white shadow-xl md:p-8">
          <p class="text-xs font-black uppercase tracking-[.2em] text-blue-400">Görsel ve video kütüphanesi</p>
          <h1 class="mt-2 text-3xl font-black md:text-4xl">Araç ve Tur Medya Yönetimi</h1>
          <p class="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300">Fotoğraf, kısa MP4/WebM video ve kaynaklı YouTube videosu yönetin. Kapak, sıra, erişilebilir alt metin, kaynak, lisans ve doğrulama kapsamı veritabanında saklanır.</p>
        </header>

        <section class="grid gap-5 xl:grid-cols-[390px_1fr]">
          <aside class="space-y-5 xl:sticky xl:top-20 xl:self-start">
            <div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 class="text-lg font-black text-slate-900">İçerik Seç</h2>
              <label class="field mt-4"><span>Araç veya tur</span><select [(ngModel)]="selectedEntityKey" (ngModelChange)="entityChanged()"><option value="">Seç…</option>@for (option of entityOptions(); track option.type + option.id) { <option [value]="option.type + ':' + option.id">{{ option.label }}</option> }</select></label>
            </div>

            <div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 class="text-lg font-black text-slate-900">Dosya Yükle</h2>
              <p class="mt-1 text-xs leading-relaxed text-slate-500">Production Storage sınırı dosya başına 50 MB. Daha uzun videoları aşağıdaki kaynaklı video alanından YouTube olarak ekleyin.</p>
              <label class="mt-4 flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-5 text-center hover:border-blue-400 hover:bg-blue-50">
                <mat-icon class="!h-9 !w-9 !text-[36px] text-blue-600">cloud_upload</mat-icon>
                <strong class="mt-2 text-sm text-slate-900">Fotoğraf veya video seç</strong>
                <input type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm" class="sr-only" (change)="selectFiles($event)" />
              </label>
              @if (files().length) {
                <div class="mt-3 space-y-2">@for (file of files(); track file.name + file.size) { <div class="flex items-center gap-2 rounded-xl bg-slate-50 p-3"><mat-icon class="text-slate-400">{{ file.type.startsWith('video/') ? 'videocam' : 'image' }}</mat-icon><div class="min-w-0 flex-1"><strong class="block truncate text-xs text-slate-800">{{ file.name }}</strong><span class="text-[10px]" [class.text-rose-600]="file.size > maxUploadBytes" [class.text-slate-500]="file.size <= maxUploadBytes">{{ formatBytes(file.size) }}{{ file.size > maxUploadBytes ? ' · 50 MB sınırını aşıyor' : '' }}</span></div></div> }</div>
              }
              <label class="field mt-4"><span>Alt metin</span><input [(ngModel)]="uploadAlt" maxlength="300" placeholder="Örn. 2023 Renault Clio ön üç çeyrek görünüm" /></label>
              <label class="mt-3 flex min-h-11 items-center gap-2 rounded-xl bg-slate-50 px-3 text-sm font-bold"><input type="checkbox" [(ngModel)]="uploadAsCover" /> İlk dosyayı kapak yap</label>
              @if (uploading()) {
                <div class="mt-4 rounded-xl bg-slate-950 p-3 text-white"><div class="flex justify-between text-xs font-bold"><span>Yükleniyor</span><span>{{ progress() }}%</span></div><div class="mt-2 h-2 overflow-hidden rounded-full bg-slate-700"><div class="h-full bg-blue-500" [style.width.%]="progress()"></div></div></div>
              }
              <button type="button" (click)="uploadFiles()" [disabled]="uploading() || !selectedEntityKey || !files().length || hasOversizedFile()" class="mt-4 min-h-12 w-full rounded-xl bg-blue-600 font-black text-white disabled:opacity-40">Dosyaları Yükle</button>
            </div>

            <div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 class="text-lg font-black text-slate-900">Kaynaklı Dış Medya</h2>
              <p class="mt-1 text-xs leading-relaxed text-slate-500">Yalnız doğrulanmış ve kullanım hakkı açık medyayı ekleyin. YouTube videosu için lisans alanına EMBED_ONLY yazabilirsiniz.</p>
              <div class="mt-4 space-y-3">
                <label class="field"><span>Tür</span><select [(ngModel)]="externalKind"><option value="IMAGE">Görsel</option><option value="VIDEO">Video / YouTube</option></select></label>
                <label class="field"><span>HTTPS medya URL</span><input [(ngModel)]="externalUrl" type="url" placeholder="https://…" /></label>
                <label class="field"><span>Kaynak sayfası</span><input [(ngModel)]="sourceUrl" type="url" placeholder="Dosyanın lisans bilgisinin bulunduğu sayfa" /></label>
                <label class="field"><span>Kaynak adı</span><input [(ngModel)]="sourceName" placeholder="Wikimedia Commons, YouTube kanal adı…" /></label>
                <label class="field"><span>Lisans / kullanım biçimi</span><input [(ngModel)]="license" placeholder="CC BY-SA 4.0 veya EMBED_ONLY" /></label>
                <label class="field"><span>Atıf</span><input [(ngModel)]="attribution" placeholder="Fotoğrafçı / yayıncı" /></label>
                <label class="field"><span>Doğrulama kapsamı</span><select [(ngModel)]="verificationScope"><option value="ACTUAL_ASSET">Gerçek araç / işletmeye ait çekim</option><option value="EXACT_MODEL_YEAR">Aynı model ve model yılı</option><option value="MODEL_FAMILY">Aynı model ailesi / nesil</option><option value="EXACT_LOCATION">Turun gerçek lokasyonu</option><option value="NEARBY_LOCATION">Yakın lokasyon</option><option value="REFERENCE">Eğitsel / genel referans</option></select></label>
                <label class="field"><span>Alt metin</span><input [(ngModel)]="externalAlt" maxlength="300" /></label>
                <label class="flex min-h-11 items-center gap-2 rounded-xl bg-slate-50 px-3 text-sm font-bold"><input type="checkbox" [(ngModel)]="externalAsCover" /> Kapak yap</label>
                <button type="button" (click)="addExternal()" [disabled]="!canAddExternal()" class="min-h-12 w-full rounded-xl bg-slate-950 font-black text-white disabled:opacity-40">Kaynaklı Medyayı Ekle</button>
              </div>
            </div>
          </aside>

          <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div><h2 class="text-xl font-black text-slate-900">Galeri</h2><p class="text-xs text-slate-500">{{ activeCount() }} canlı · {{ reviewCount() }} inceleme bekliyor</p></div>
              <button type="button" (click)="refresh()" class="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-black">Yenile</button>
            </div>
            @if (!selectedEntityKey) {
              <div class="mt-6 rounded-3xl border border-dashed border-slate-300 p-14 text-center text-slate-500">Soldan bir araç veya tur seçin.</div>
            } @else {
              <div class="mt-5 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                @for (item of currentItems(); track item.id) {
                  <article class="overflow-hidden rounded-3xl border bg-white shadow-sm" [class.border-amber-300]="!item.isActive" [class.border-slate-200]="item.isActive">
                    <div class="relative aspect-video bg-slate-950">
                      @if (item.kind === 'VIDEO') {
                        @if (isYouTube(item.url)) {
                          <iframe [src]="safeYouTubeUrl(item.url)" [title]="item.altText || 'YouTube videosu'" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen class="h-full w-full border-0"></iframe>
                        } @else {
                          <video [src]="item.url" [poster]="item.posterUrl" controls playsinline preload="metadata" class="h-full w-full object-contain"></video>
                        }
                      } @else { <img [src]="item.url" [alt]="item.altText" class="h-full w-full object-cover" referrerpolicy="no-referrer" /> }
                      <div class="absolute left-3 top-3 flex flex-wrap gap-2">
                        @if (item.isCover) { <span class="rounded-full bg-blue-600 px-3 py-1 text-[10px] font-black text-white shadow">KAPAK</span> }
                        @if (!item.isActive) { <span class="rounded-full bg-amber-400 px-3 py-1 text-[10px] font-black text-slate-950 shadow">İNCELEME BEKLİYOR</span> }
                      </div>
                      <span class="absolute right-3 top-3 rounded-full bg-black/70 px-2 py-1 text-[10px] font-black text-white">{{ item.kind }}</span>
                    </div>
                    <div class="space-y-3 p-4">
                      <label class="field"><span>Alt metin</span><input [(ngModel)]="item.altText" maxlength="300" /></label>
                      @if (!item.storageBucket) {
                        <label class="field"><span>Kaynak sayfası</span><input [(ngModel)]="item.sourceUrl" type="url" placeholder="https://…" /></label>
                        <label class="field"><span>Kaynak adı</span><input [(ngModel)]="item.sourceName" /></label>
                        <label class="field"><span>Lisans / kullanım</span><input [(ngModel)]="item.license" placeholder="CC BY-SA 4.0, EMBED_ONLY…" /></label>
                        <label class="field"><span>Atıf</span><input [(ngModel)]="item.attribution" /></label>
                        <label class="field"><span>Doğrulama kapsamı</span><select [ngModel]="itemScope(item)" (ngModelChange)="setItemScope(item,$event)"><option value="ACTUAL_ASSET">Gerçek işletme varlığı</option><option value="EXACT_MODEL_YEAR">Aynı model ve yıl</option><option value="MODEL_FAMILY">Model ailesi / nesil</option><option value="EXACT_LOCATION">Gerçek tur lokasyonu</option><option value="NEARBY_LOCATION">Yakın lokasyon</option><option value="REFERENCE">Referans medya</option></select></label>
                      } @else {
                        <div class="rounded-xl bg-emerald-50 p-3 text-[11px] font-bold leading-relaxed text-emerald-800">İşletme tarafından yüklenen gerçek medya · BUSINESS_OWNED</div>
                      }
                      <div class="grid grid-cols-2 gap-2"><label class="field"><span>Sıra</span><input type="number" [(ngModel)]="item.sortOrder" min="0" /></label><label class="flex items-end"><span class="flex min-h-11 w-full items-center gap-2 rounded-xl bg-slate-50 px-3 text-xs font-black"><input type="checkbox" [(ngModel)]="item.isCover" /> Kapak</span></label></div>
                      <div class="rounded-xl bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-500"><strong class="block text-slate-700">{{ item.sourceName || 'İşletme yüklemesi' }}</strong><span>{{ item.attribution || 'Alperler Auto' }}</span><span class="block">{{ item.license || 'Lisans bilgisi yok' }}</span><span class="mt-1 block font-bold text-slate-700">{{ scopeLabel(item) }}</span></div>
                      <div class="grid grid-cols-2 gap-2"><button type="button" (click)="saveItem(item)" class="min-h-11 rounded-xl bg-slate-950 font-black text-white">{{ item.isActive ? 'Kaydet' : 'Doğrula & Etkinleştir' }}</button><button type="button" (click)="removeItem(item)" class="min-h-11 rounded-xl bg-rose-50 font-black text-rose-700">Sil</button></div>
                    </div>
                  </article>
                } @empty { <div class="col-span-full rounded-3xl border border-dashed border-slate-300 p-14 text-center text-slate-500">Bu içerik için henüz medya eklenmedi.</div> }
              </div>
            }
          </section>
        </section>
      </div>
    </main>
  `,
  styles: [`
    .field{display:flex;flex-direction:column;gap:7px}.field>span{font-size:.68rem;font-weight:900;text-transform:uppercase;letter-spacing:.08em;color:rgb(71 85 105)}.field input,.field select{width:100%;min-height:44px;border:1px solid rgb(203 213 225);border-radius:12px;background:rgb(248 250 252);padding:9px 11px;color:rgb(15 23 42);outline:none}.field input:focus,.field select:focus{border-color:rgb(59 130 246);box-shadow:0 0 0 2px rgb(59 130 246/.15)}
  `],
})
export class AdminMediaComponent implements OnInit {
  private readonly media = inject(CatalogMediaService);
  private readonly cars = inject(CarService);
  private readonly toast = inject(ToastService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly youtubeCache = new Map<string, SafeResourceUrl>();

  readonly allItems = signal<CatalogMediaItem[]>([]);
  readonly files = signal<File[]>([]);
  readonly uploading = signal(false);
  readonly progress = this.media.uploadProgress;
  readonly maxUploadBytes = this.media.maxUploadBytes;
  selectedEntityKey = "";
  uploadAlt = "";
  uploadAsCover = false;
  externalKind: "IMAGE" | "VIDEO" = "IMAGE";
  externalUrl = "";
  sourceUrl = "";
  sourceName = "";
  license = "";
  attribution = "";
  externalAlt = "";
  externalAsCover = false;
  verificationScope: VerificationScope = "MODEL_FAMILY";

  readonly entityOptions = computed<EntityOption[]>(() => [
    ...this.cars.getAllVehicles()().filter((row) => row.category !== "TOUR" && row.cloudId).map((row) => ({ type: "VEHICLE" as const, id: row.cloudId!, label: `${row.category === 'RENTAL' ? 'Kiralık' : 'Satılık'} · ${row.brand || ''} ${row.model || ''}`.trim(), image: row.image })),
    ...this.cars.getTours()().filter((row) => row.cloudId).map((row) => ({ type: "TOUR" as const, id: row.cloudId!, label: `Tur · ${row.title || row.id}`, image: row.image })),
  ]);
  readonly currentItems = computed(() => { const entity = this.selectedEntity(); if (!entity) return []; return this.allItems().filter((item) => entity.type === "VEHICLE" ? item.vehicleId === entity.id : item.tourId === entity.id).sort((a,b) => Number(b.isCover)-Number(a.isCover) || Number(b.isActive)-Number(a.isActive) || a.sortOrder-b.sortOrder); });

  ngOnInit(): void { void this.refresh(); }
  entityChanged(): void {
    this.files.set([]);
    this.uploadAlt = "";
    this.uploadAsCover = false;
    const entity = this.selectedEntity();
    this.verificationScope = entity?.type === "TOUR" ? "EXACT_LOCATION" : "MODEL_FAMILY";
  }

  activeCount(): number { return this.currentItems().filter((item) => item.isActive).length; }
  reviewCount(): number { return this.currentItems().filter((item) => !item.isActive).length; }
  async refresh(): Promise<void> { try { this.allItems.set(await this.media.loadAllAdmin()); } catch (error) { this.toast.show(this.message(error), "error"); } }
  selectFiles(event: Event): void { const input = event.target as HTMLInputElement; this.files.set(Array.from(input.files || []).slice(0,20)); input.value = ""; }
  hasOversizedFile(): boolean { return this.files().some((file) => file.size > this.maxUploadBytes); }
  canAddExternal(): boolean { return Boolean(this.selectedEntityKey && this.externalUrl.trim() && this.sourceUrl.trim() && this.sourceName.trim() && this.license.trim() && this.attribution.trim() && this.externalAlt.trim()); }

  async uploadFiles(): Promise<void> {
    const entity = this.selectedEntity(); if (!entity) return;
    if (this.hasOversizedFile()) return this.toast.show("Dosyalardan biri 50 MB production Storage sınırını aşıyor.", "error");
    this.uploading.set(true);
    try {
      for (let index = 0; index < this.files().length; index += 1) {
        const file = this.files()[index];
        await this.media.upload(entity.type, entity.id, file, { altText: this.uploadAlt || file.name, isCover: this.uploadAsCover && index === 0, sortOrder: this.currentItems().length + index + 1 });
      }
      this.files.set([]); this.uploadAlt = ""; this.uploadAsCover = false; await this.refresh(); this.toast.show("Medya güvenli şekilde yüklendi.", "success");
    } catch (error) { this.toast.show(this.message(error), "error"); }
    finally { this.uploading.set(false); }
  }

  async addExternal(): Promise<void> {
    const entity = this.selectedEntity(); if (!entity || !this.canAddExternal()) return;
    try {
      await this.media.addExternal({
        entityType: entity.type,
        entityId: entity.id,
        kind: this.externalKind,
        url: this.externalUrl.trim(),
        sourceUrl: this.sourceUrl.trim(),
        sourceName: this.sourceName.trim(),
        license: this.license.trim(),
        attribution: this.attribution.trim(),
        altText: this.externalAlt.trim(),
        isCover: this.externalAsCover,
        sortOrder: this.currentItems().length + 1,
        metadata: { verificationScope: this.verificationScope, verifiedAt: new Date().toISOString().slice(0, 10), sourceVerified: true },
      });
      this.externalUrl = ""; this.sourceUrl = ""; this.sourceName = ""; this.license = ""; this.attribution = ""; this.externalAlt = ""; this.externalAsCover = false; await this.refresh(); this.toast.show("Kaynaklı ve doğrulanmış medya eklendi.", "success");
    } catch (error) { this.toast.show(this.message(error), "error"); }
  }

  async saveItem(item: CatalogMediaItem): Promise<void> {
    try {
      if (item.storageBucket) {
        await this.media.update(item, { altText: item.altText, sortOrder: item.sortOrder, isCover: item.isCover });
      } else {
        if (!this.externalProvenanceComplete(item)) {
          this.toast.show("Etkinleştirmek için kaynak sayfası, kaynak adı, gerçek lisans, atıf ve alt metin zorunludur.", "error");
          return;
        }
        const metadata = {
          ...(item.metadata || {}),
          verificationScope: this.itemScope(item),
          provenanceComplete: true,
          sourceVerified: true,
          reviewStatus: "VERIFIED",
          verifiedAt: new Date().toISOString().slice(0, 10),
        };
        await this.media.update(item, {
          altText: item.altText,
          sortOrder: item.sortOrder,
          isCover: item.isCover,
          isActive: true,
          sourceUrl: item.sourceUrl,
          sourceName: item.sourceName,
          license: item.license,
          attribution: item.attribution,
          metadata,
        });
      }
      await this.refresh(); this.toast.show("Medya bilgileri kaydedildi.", "success");
    } catch (error) { this.toast.show(this.message(error), "error"); }
  }

  async removeItem(item: CatalogMediaItem): Promise<void> { try { await this.media.remove(item); await this.refresh(); this.toast.show("Medya kaldırıldı.", "info"); } catch (error) { this.toast.show(this.message(error), "error"); } }
  itemScope(item: CatalogMediaItem): VerificationScope { const value = String(item.metadata?.["verificationScope"] || item.metadata?.["verification_status"] || "REFERENCE"); return (["ACTUAL_ASSET","EXACT_MODEL_YEAR","MODEL_FAMILY","EXACT_LOCATION","NEARBY_LOCATION","REFERENCE"] as string[]).includes(value) ? value as VerificationScope : "REFERENCE"; }
  setItemScope(item: CatalogMediaItem, value: VerificationScope): void { item.metadata = { ...(item.metadata || {}), verificationScope: value }; }
  externalProvenanceComplete(item: CatalogMediaItem): boolean { return Boolean(item.sourceUrl?.trim() && item.sourceName?.trim() && item.license?.trim() && item.license.trim() !== "REVIEW_REQUIRED" && item.attribution?.trim() && item.altText.trim()); }

  isYouTube(url: string): boolean { return Boolean(this.youtubeId(url)); }
  safeYouTubeUrl(url: string): SafeResourceUrl {
    const cached = this.youtubeCache.get(url); if (cached) return cached;
    const id = this.youtubeId(url);
    const safe = this.sanitizer.bypassSecurityTrustResourceUrl(id ? `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1` : "about:blank");
    this.youtubeCache.set(url, safe); return safe;
  }
  scopeLabel(item: CatalogMediaItem): string {
    const scope = String(item.metadata?.["verificationScope"] || item.metadata?.["verification_status"] || "");
    const labels: Record<string,string> = { ACTUAL_ASSET: "Doğrulama: gerçek işletme varlığı", EXACT_MODEL_YEAR: "Doğrulama: aynı model ve yıl", MODEL_FAMILY: "Doğrulama: aynı model ailesi", EXACT_LOCATION: "Doğrulama: gerçek tur lokasyonu", NEARBY_LOCATION: "Doğrulama: yakın lokasyon", NEARBY_LOCATION_VERIFIED: "Doğrulama: yakın lokasyon", REFERENCE: "Doğrulama: referans medya", PENDING_EXACT_LICENSED_MEDIA: "Doğrulama: kesin lokasyon medyası bekleniyor" };
    return labels[scope] || "Doğrulama kapsamı eski kayıtta belirtilmemiş";
  }
  formatBytes(bytes: number): string { if (bytes < 1024) return `${bytes} B`; if (bytes < 1024*1024) return `${(bytes/1024).toFixed(1)} KB`; return `${(bytes/1024/1024).toFixed(1)} MB`; }
  private youtubeId(url: string): string | null { try { const parsed = new URL(url); const host = parsed.hostname.toLowerCase().replace(/^www\./, ""); let candidate = ""; if (host === "youtu.be") candidate = parsed.pathname.split("/").filter(Boolean)[0] || ""; if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") { if (parsed.pathname === "/watch") candidate = parsed.searchParams.get("v") || ""; else if (parsed.pathname.startsWith("/embed/") || parsed.pathname.startsWith("/shorts/")) candidate = parsed.pathname.split("/")[2] || ""; } return /^[A-Za-z0-9_-]{11}$/.test(candidate) ? candidate : null; } catch { return null; } }
  private selectedEntity(): { type: CatalogEntityType; id: string } | null { const separator = this.selectedEntityKey.indexOf(":"); if (separator < 1) return null; return { type: this.selectedEntityKey.slice(0, separator) as CatalogEntityType, id: this.selectedEntityKey.slice(separator + 1) }; }
  private message(error: unknown): string { return error instanceof Error ? error.message : "Medya işlemi tamamlanamadı."; }
}
