import { CommonModule } from "@angular/common";
import { Component, OnDestroy, OnInit, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
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

interface SelectedUpload {
  key: string;
  file: File;
  kind: "IMAGE" | "VIDEO";
  previewUrl: string;
}

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
          <p class="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300">Telefon, tablet veya bilgisayardan fotoğraf ve video ekleyin. Dosyalar yeniden sıkıştırılmaz; orijinal kalite korunur. Büyük yüklemeler parçalı ve yeniden denenebilir şekilde gönderilir.</p>
        </header>

        <section class="grid gap-5 xl:grid-cols-[430px_1fr]">
          <aside class="space-y-5 xl:sticky xl:top-20 xl:self-start">
            <div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 class="text-lg font-black text-slate-900">İçerik Seç</h2>
              <label class="field mt-4">
                <span>Araç veya tur</span>
                <select [ngModel]="selectedEntityKey()" (ngModelChange)="entityChanged($event)">
                  <option value="">Seç…</option>
                  @for (option of entityOptions(); track option.type + option.id) {
                    <option [value]="option.type + ':' + option.id">{{ option.label }}</option>
                  }
                </select>
              </label>
              @if (selectedEntityKey()) {
                <div class="mt-3 rounded-2xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
                  <strong class="text-slate-900">Galeri:</strong> {{ currentItems().length }} / {{ mediaPolicy().maxItemsPerEntity }} medya.
                  <br />Dosya başına üst sınır: <strong>{{ formatBytes(mediaPolicy().maxFileBytes) }}</strong>.
                </div>
              }
            </div>

            <div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <h2 class="text-lg font-black text-slate-900">Fotoğraf ve Video Ekle</h2>
                  <p class="mt-1 text-xs leading-relaxed text-slate-500">Dosya ve galeri yolları çoklu seçim destekler. Mobilde ayrıca doğrudan kamera ile çekim yapabilirsiniz.</p>
                </div>
                <span class="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black text-emerald-700">ORİJİNAL KALİTE</span>
              </div>

              <div class="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <label class="picker-button">
                  <mat-icon>folder_open</mat-icon>
                  <span><strong>Dosyalardan Seç</strong><small>Fotoğraf + video · çoklu</small></span>
                  <input type="file" multiple [accept]="acceptedTypes()" class="sr-only" (change)="selectFiles($event)" />
                </label>
                <label class="picker-button">
                  <mat-icon>photo_library</mat-icon>
                  <span><strong>Galeriden Fotoğraf</strong><small>Çoklu seçim</small></span>
                  <input type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif,image/*" class="sr-only" (change)="selectFiles($event)" />
                </label>
                <label class="picker-button">
                  <mat-icon>video_library</mat-icon>
                  <span><strong>Galeriden Video</strong><small>Çoklu seçim</small></span>
                  <input type="file" multiple accept="video/mp4,video/webm,video/*" class="sr-only" (change)="selectFiles($event)" />
                </label>
                <label class="picker-button">
                  <mat-icon>photo_camera</mat-icon>
                  <span><strong>Kamerayla Fotoğraf Çek</strong><small>Mobil/tablet arka kamera</small></span>
                  <input type="file" accept="image/*" capture="environment" class="sr-only" (change)="selectFiles($event)" />
                </label>
                <label class="picker-button sm:col-span-2 xl:col-span-1 2xl:col-span-2">
                  <mat-icon>videocam</mat-icon>
                  <span><strong>Kamerayla Video Çek</strong><small>Çekim bittikten sonra seçime eklenir</small></span>
                  <input type="file" accept="video/*" capture="environment" class="sr-only" (change)="selectFiles($event)" />
                </label>
              </div>

              <div
                class="mt-3 flex min-h-24 items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-4 text-center text-xs font-bold text-slate-500 transition hover:border-blue-400 hover:bg-blue-50"
                (dragover)="allowDrop($event)"
                (drop)="dropFiles($event)"
              >
                <span><mat-icon class="align-middle text-blue-600">upload_file</mat-icon> Bilgisayarda fotoğraf ve videoları buraya da sürükleyip bırakabilirsiniz.</span>
              </div>

              @if (selectionErrors().length) {
                <div class="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900" role="alert">
                  @for (error of selectionErrors(); track error) { <p>• {{ error }}</p> }
                </div>
              }

              @if (selectedUploads().length) {
                <div class="mt-4">
                  <div class="mb-2 flex items-center justify-between gap-3 text-xs">
                    <strong class="text-slate-900">Seçilen {{ selectedUploads().length }} dosya</strong>
                    <button type="button" (click)="clearSelection()" class="font-black text-rose-700">Seçimi Temizle</button>
                  </div>
                  <div class="grid max-h-[420px] gap-3 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                    @for (selected of selectedUploads(); track selected.key) {
                      <article class="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                        <div class="relative aspect-video bg-slate-950">
                          @if (selected.kind === 'VIDEO') {
                            <video [src]="selected.previewUrl" muted playsinline preload="metadata" class="h-full w-full object-contain"></video>
                            <span class="absolute left-2 top-2 rounded-full bg-red-600 px-2 py-1 text-[10px] font-black text-white">VİDEO</span>
                          } @else {
                            <img [src]="selected.previewUrl" alt="Yüklenecek fotoğraf önizlemesi" class="h-full w-full object-cover" />
                          }
                          <button type="button" (click)="removeSelected(selected.key)" class="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-black/75 text-white" aria-label="Seçilen dosyayı kaldır"><mat-icon>close</mat-icon></button>
                        </div>
                        <div class="p-3">
                          <strong class="block truncate text-xs text-slate-900">{{ selected.file.name }}</strong>
                          <span class="text-[10px] text-slate-500">{{ formatBytes(selected.file.size) }} · {{ selected.file.type || 'Dosya' }}</span>
                        </div>
                      </article>
                    }
                  </div>
                </div>
              }

              <label class="field mt-4"><span>Alt metin</span><input [(ngModel)]="uploadAlt" maxlength="300" placeholder="Örn. 2023 Renault Clio ön üç çeyrek görünüm" /></label>
              <label class="mt-3 flex min-h-11 items-center gap-2 rounded-xl bg-slate-50 px-3 text-sm font-bold"><input type="checkbox" [(ngModel)]="uploadAsCover" /> Seçilen ilk fotoğrafı kapak yap</label>

              @if (uploading()) {
                <div class="mt-4 rounded-xl bg-slate-950 p-3 text-white">
                  <div class="flex justify-between text-xs font-bold"><span>{{ uploadStatus() }}</span><span>{{ progress() }}%</span></div>
                  <div class="mt-2 h-2 overflow-hidden rounded-full bg-slate-700"><div class="h-full bg-blue-500" [style.width.%]="progress()"></div></div>
                </div>
              }

              <button type="button" (click)="uploadFiles()" [disabled]="uploading() || !selectedEntityKey() || !selectedUploads().length || remainingCapacity() < selectedUploads().length" class="mt-4 min-h-12 w-full rounded-xl bg-blue-600 font-black text-white disabled:opacity-40">{{ uploading() ? 'Yükleniyor…' : selectedUploads().length + ' Dosyayı Yükle' }}</button>
              @if (remainingCapacity() < selectedUploads().length) {
                <p class="mt-2 text-xs font-bold text-rose-700">Bu galeride yalnız {{ remainingCapacity() }} boş medya alanı kaldı.</p>
              }
            </div>

            <div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 class="text-lg font-black text-slate-900">Kaynaklı Dış Medya</h2>
              <p class="mt-1 text-xs leading-relaxed text-slate-500">HTTPS üzerinden harici fotoğraf veya video ekleyebilirsiniz. Kaynak bilgisi veritabanında saklanır.</p>
              <div class="mt-4 space-y-3">
                <label class="field"><span>Tür</span><select [(ngModel)]="externalKind"><option value="IMAGE">Görsel</option><option value="VIDEO">Video</option></select></label>
                <label class="field"><span>HTTPS medya URL</span><input [(ngModel)]="externalUrl" type="url" /></label>
                @if (externalKind === 'VIDEO') {
                  <label class="field"><span>Video poster görseli URL</span><input [(ngModel)]="externalPosterUrl" type="url" placeholder="https://...jpg" /></label>
                }
                <label class="field"><span>Kaynak sayfası</span><input [(ngModel)]="sourceUrl" type="url" /></label>
                <label class="field"><span>Kaynak adı</span><input [(ngModel)]="sourceName" /></label>
                <label class="field"><span>Lisans</span><input [(ngModel)]="license" /></label>
                <label class="field"><span>Atıf</span><input [(ngModel)]="attribution" /></label>
                <label class="field"><span>Alt metin</span><input [(ngModel)]="externalAlt" maxlength="300" /></label>
                <label class="flex min-h-11 items-center gap-2 rounded-xl bg-slate-50 px-3 text-sm font-bold"><input type="checkbox" [(ngModel)]="externalAsCover" [disabled]="externalKind === 'VIDEO' && !externalPosterUrl.trim()" /> Kapak yap</label>
                @if (externalKind === 'VIDEO' && externalAsCover && !externalPosterUrl.trim()) {
                  <p class="text-xs font-bold text-amber-700">Video kapak seçilecekse poster görseli gerekir.</p>
                }
                <button type="button" (click)="addExternal()" [disabled]="!selectedEntityKey() || !externalUrl.trim() || !externalAlt.trim() || remainingCapacity() < 1 || (externalAsCover && externalKind === 'VIDEO' && !externalPosterUrl.trim())" class="min-h-12 w-full rounded-xl bg-slate-950 font-black text-white disabled:opacity-40">Kaynaklı Medyayı Ekle</button>
              </div>
            </div>
          </aside>

          <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div><h2 class="text-xl font-black text-slate-900">Galeri</h2><p class="text-xs text-slate-500">{{ currentItems().length }} aktif medya · fotoğraf ve video birlikte sıralanır</p></div>
              <button type="button" (click)="refresh()" class="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-black">Yenile</button>
            </div>
            @if (!selectedEntityKey()) {
              <div class="mt-6 rounded-3xl border border-dashed border-slate-300 p-14 text-center text-slate-500">Soldan bir araç veya tur seçin.</div>
            } @else {
              <div class="mt-5 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                @for (item of currentItems(); track item.id) {
                  <article class="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <div class="relative aspect-video bg-slate-950">
                      @if (item.kind === 'VIDEO') { <video [src]="item.url" [poster]="item.posterUrl" controls playsinline preload="metadata" class="h-full w-full object-contain"></video> } @else { <img [src]="item.url" [alt]="item.altText" class="h-full w-full object-cover" referrerpolicy="no-referrer" /> }
                      @if (item.isCover) { <span class="absolute left-3 top-3 rounded-full bg-blue-600 px-3 py-1 text-[10px] font-black text-white shadow">KAPAK</span> }
                      <span class="absolute right-3 top-3 rounded-full bg-black/70 px-2 py-1 text-[10px] font-black text-white">{{ item.kind === 'VIDEO' ? 'VİDEO' : 'FOTOĞRAF' }}</span>
                    </div>
                    <div class="space-y-3 p-4">
                      <label class="field"><span>Alt metin</span><input [(ngModel)]="item.altText" maxlength="300" /></label>
                      <div class="grid grid-cols-2 gap-2"><label class="field"><span>Sıra</span><input type="number" [(ngModel)]="item.sortOrder" min="0" /></label><label class="flex items-end"><span class="flex min-h-11 w-full items-center gap-2 rounded-xl bg-slate-50 px-3 text-xs font-black"><input type="checkbox" [(ngModel)]="item.isCover" [disabled]="item.kind === 'VIDEO' && !item.posterUrl" /> Kapak</span></label></div>
                      @if (item.metadata?.['width'] || item.metadata?.['height'] || item.metadata?.['durationSeconds']) {
                        <div class="rounded-xl bg-slate-50 p-3 text-[11px] text-slate-600">
                          @if (item.metadata?.['width'] && item.metadata?.['height']) { <span>{{ item.metadata?.['width'] }} × {{ item.metadata?.['height'] }} px</span> }
                          @if (item.metadata?.['durationSeconds']) { <span> · {{ item.metadata?.['durationSeconds'] }} sn</span> }
                        </div>
                      }
                      <div class="grid grid-cols-2 gap-2"><button type="button" (click)="saveItem(item)" class="min-h-11 rounded-xl bg-slate-950 font-black text-white">Kaydet</button><button type="button" (click)="removeItem(item)" class="min-h-11 rounded-xl bg-rose-50 font-black text-rose-700">Sil</button></div>
                    </div>
                  </article>
                } @empty {
                  <div class="col-span-full rounded-3xl border border-dashed border-slate-300 p-14 text-center text-slate-500">Bu içerik için henüz medya eklenmedi.</div>
                }
              </div>
            }
          </section>
        </section>
      </div>
    </main>
  `,
  styles: [`
    .field{display:flex;flex-direction:column;gap:7px}.field>span{font-size:.68rem;font-weight:900;text-transform:uppercase;letter-spacing:.08em;color:rgb(71 85 105)}.field input,.field select{width:100%;min-height:44px;border:1px solid rgb(203 213 225);border-radius:12px;background:rgb(248 250 252);padding:9px 11px;color:rgb(15 23 42);outline:none}.field input:focus,.field select:focus{border-color:rgb(59 130 246);box-shadow:0 0 0 2px rgb(59 130 246/.15)}
    .picker-button{display:flex;min-height:82px;cursor:pointer;align-items:center;gap:10px;border:1px solid rgb(203 213 225);border-radius:16px;background:white;padding:12px;transition:.15s}.picker-button:hover,.picker-button:focus-within{border-color:rgb(59 130 246);background:rgb(239 246 255);box-shadow:0 0 0 3px rgb(59 130 246/.12)}.picker-button mat-icon{color:rgb(37 99 235)}.picker-button span{display:flex;min-width:0;flex-direction:column;text-align:left}.picker-button strong{font-size:.75rem;color:rgb(15 23 42)}.picker-button small{font-size:.65rem;color:rgb(100 116 139)}
  `],
})
export class AdminMediaComponent implements OnInit, OnDestroy {
  private readonly media = inject(CatalogMediaService);
  private readonly cars = inject(CarService);
  private readonly toast = inject(ToastService);

  readonly allItems = signal<CatalogMediaItem[]>([]);
  readonly selectedUploads = signal<SelectedUpload[]>([]);
  readonly selectionErrors = signal<string[]>([]);
  readonly uploading = signal(false);
  readonly uploadStatus = signal("Hazırlanıyor");
  readonly selectedEntityKey = signal("");
  readonly progress = this.media.uploadProgress;
  readonly mediaPolicy = this.media.policy;

  uploadAlt = "";
  uploadAsCover = false;
  externalKind: "IMAGE" | "VIDEO" = "IMAGE";
  externalUrl = "";
  externalPosterUrl = "";
  sourceUrl = "";
  sourceName = "";
  license = "";
  attribution = "";
  externalAlt = "";
  externalAsCover = false;

  readonly entityOptions = computed<EntityOption[]>(() => [
    ...this.cars.getAllVehicles()().filter((row) => row.category !== "TOUR" && row.cloudId).map((row) => ({ type: "VEHICLE" as const, id: row.cloudId!, label: `${row.category === 'RENTAL' ? 'Kiralık' : 'Satılık'} · ${row.brand || ''} ${row.model || ''}`.trim(), image: row.image })),
    ...this.cars.getTours()().filter((row) => row.cloudId).map((row) => ({ type: "TOUR" as const, id: row.cloudId!, label: `Tur · ${row.title || row.id}`, image: row.image })),
  ]);

  readonly currentItems = computed(() => {
    const entity = this.selectedEntity();
    if (!entity) return [];
    return this.allItems()
      .filter((item) => entity.type === "VEHICLE" ? item.vehicleId === entity.id : item.tourId === entity.id)
      .sort((a,b) => Number(b.isCover)-Number(a.isCover) || a.sortOrder-b.sortOrder);
  });

  readonly remainingCapacity = computed(() => Math.max(0, this.mediaPolicy().maxItemsPerEntity - this.currentItems().length));
  readonly acceptedTypes = computed(() => this.mediaPolicy().acceptedMimeTypes.join(","));

  ngOnInit(): void { void this.initialize(); }
  ngOnDestroy(): void { this.revokeAllPreviews(); }

  async initialize(): Promise<void> {
    await this.media.refreshPolicy();
    await this.refresh();
  }

  entityChanged(value: string): void {
    this.selectedEntityKey.set(value || "");
    this.clearSelection();
    this.uploadAlt = "";
    this.uploadAsCover = false;
  }

  async refresh(): Promise<void> {
    try { this.allItems.set(await this.media.loadAllAdmin()); }
    catch (error) { this.toast.show(this.message(error), "error"); }
  }

  selectFiles(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.addFiles(Array.from(input.files || []));
    input.value = "";
  }

  allowDrop(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
  }

  dropFiles(event: DragEvent): void {
    event.preventDefault();
    this.addFiles(Array.from(event.dataTransfer?.files || []));
  }

  addFiles(incoming: File[]): void {
    if (!incoming.length) return;
    const policy = this.mediaPolicy();
    const errors: string[] = [];
    const existing = new Map(this.selectedUploads().map((entry) => [entry.key, entry]));
    const hardLimit = Math.min(policy.maxBatchFiles, this.remainingCapacity());

    for (const file of incoming) {
      const key = this.fileKey(file);
      if (existing.has(key)) continue;
      if (existing.size >= hardLimit) {
        errors.push(`En fazla ${hardLimit} yeni dosya seçebilirsiniz; galeri veya toplu seçim sınırına ulaşıldı.`);
        break;
      }
      const validation = this.media.validateSelection(file);
      if (validation === "CATALOG_MEDIA_SIZE_NOT_ALLOWED") {
        errors.push(`${file.name}: dosya ${formatBytesStatic(file.size)}, üst sınır ${formatBytesStatic(policy.maxFileBytes)}.`);
        continue;
      }
      if (validation === "CATALOG_MEDIA_TYPE_NOT_ALLOWED") {
        errors.push(`${file.name}: bu dosya türü desteklenmiyor.`);
        continue;
      }
      existing.set(key, {
        key,
        file,
        kind: file.type.startsWith("video/") ? "VIDEO" : "IMAGE",
        previewUrl: URL.createObjectURL(file),
      });
    }

    this.selectedUploads.set(Array.from(existing.values()));
    this.selectionErrors.set(Array.from(new Set(errors)));
  }

  removeSelected(key: string): void {
    const target = this.selectedUploads().find((entry) => entry.key === key);
    if (target) URL.revokeObjectURL(target.previewUrl);
    this.selectedUploads.update((rows) => rows.filter((entry) => entry.key !== key));
  }

  clearSelection(): void {
    this.revokeAllPreviews();
    this.selectedUploads.set([]);
    this.selectionErrors.set([]);
  }

  async uploadFiles(): Promise<void> {
    const entity = this.selectedEntity();
    if (!entity || !this.selectedUploads().length) return;
    if (this.selectedUploads().length > this.remainingCapacity()) {
      this.toast.show("Galeri kapasitesi bu dosyaların tamamı için yeterli değil.", "error");
      return;
    }

    this.uploading.set(true);
    try {
      const queue = [...this.selectedUploads()];
      const baseOrder = this.currentItems().length;
      const coverCandidate = this.uploadAsCover ? queue.find((entry) => entry.kind === "IMAGE") : undefined;
      for (let index = 0; index < queue.length; index += 1) {
        const selected = queue[index];
        this.uploadStatus.set(`${index + 1} / ${queue.length}: ${selected.file.name}`);
        await this.media.upload(entity.type, entity.id, selected.file, {
          altText: this.uploadAlt || selected.file.name,
          isCover: selected.key === coverCandidate?.key,
          sortOrder: baseOrder + index + 1,
        });
        this.removeSelected(selected.key);
      }
      this.uploadAlt = "";
      this.uploadAsCover = false;
      await this.refresh();
      this.toast.show("Tüm medya dosyaları orijinal kalitesi korunarak yüklendi.", "success");
    } catch (error) {
      await this.refresh();
      this.toast.show(`${this.message(error)} Tamamlanan dosyalar korundu; kalanları yeniden deneyebilirsiniz.`, "error");
    } finally {
      this.uploadStatus.set("Hazırlanıyor");
      this.uploading.set(false);
    }
  }

  async addExternal(): Promise<void> {
    const entity = this.selectedEntity();
    if (!entity || this.remainingCapacity() < 1) return;
    try {
      await this.media.addExternal({
        entityType: entity.type,
        entityId: entity.id,
        kind: this.externalKind,
        url: this.externalUrl.trim(),
        posterUrl: this.externalKind === "VIDEO" ? this.externalPosterUrl.trim() || undefined : undefined,
        sourceUrl: this.sourceUrl.trim() || undefined,
        sourceName: this.sourceName.trim() || undefined,
        license: this.license.trim() || undefined,
        attribution: this.attribution.trim() || undefined,
        altText: this.externalAlt.trim(),
        isCover: this.externalAsCover,
        sortOrder: this.currentItems().length + 1,
      });
      this.externalUrl = "";
      this.externalPosterUrl = "";
      this.sourceUrl = "";
      this.sourceName = "";
      this.license = "";
      this.attribution = "";
      this.externalAlt = "";
      this.externalAsCover = false;
      await this.refresh();
      this.toast.show("Kaynaklı medya eklendi.", "success");
    } catch (error) {
      this.toast.show(this.message(error), "error");
    }
  }

  async saveItem(item: CatalogMediaItem): Promise<void> {
    try {
      await this.media.update(item, { altText: item.altText, sortOrder: item.sortOrder, isCover: item.isCover });
      await this.refresh();
      this.toast.show("Medya bilgileri kaydedildi.", "success");
    } catch (error) { this.toast.show(this.message(error), "error"); }
  }

  async removeItem(item: CatalogMediaItem): Promise<void> {
    try {
      await this.media.remove(item);
      await this.refresh();
      this.toast.show("Medya kaldırıldı.", "info");
    } catch (error) { this.toast.show(this.message(error), "error"); }
  }

  formatBytes(bytes: number): string { return formatBytesStatic(bytes); }

  private selectedEntity(): { type: CatalogEntityType; id: string } | null {
    const key = this.selectedEntityKey();
    const separator = key.indexOf(":");
    if (separator < 1) return null;
    return { type: key.slice(0, separator) as CatalogEntityType, id: key.slice(separator + 1) };
  }

  private fileKey(file: File): string { return `${file.name}|${file.size}|${file.type}|${file.lastModified}`; }
  private revokeAllPreviews(): void { this.selectedUploads().forEach((entry) => URL.revokeObjectURL(entry.previewUrl)); }
  private message(error: unknown): string { return error instanceof Error ? error.message : "Medya işlemi tamamlanamadı."; }
}

function formatBytesStatic(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
