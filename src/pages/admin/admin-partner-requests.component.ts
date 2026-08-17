import { CommonModule } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { ConfirmService } from "../../services/confirm.service";
import {
  PartnerMediaItem,
  PartnerMediaService,
} from "../../services/partner-media.service";
import {
  PartnerAdminRecord,
  PartnerRequestService,
  PartnerStatus,
} from "../../services/partner-request.service";
import { ToastService } from "../../services/toast.service";

@Component({
  selector: "app-admin-partner-requests",
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="min-h-screen bg-slate-50 text-slate-900">
      <header class="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-5 shadow-sm backdrop-blur md:px-8">
        <div class="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div class="flex items-center gap-3">
            <button
              type="button"
              (click)="goBack()"
              aria-label="Kontrol paneline dön"
              class="flex min-h-12 min-w-12 items-center justify-center rounded-xl bg-slate-100 text-xl font-black text-slate-700 hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              ←
            </button>
            <div>
              <p class="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">Araç Değerlendirme</p>
              <h1 class="text-2xl font-black tracking-tight text-slate-950">Başvuru Yönetimi</h1>
              <p class="mt-1 text-xs text-slate-500">Satış ve filoya katılım talepleri Supabase üzerinden güvenli yönetilir.</p>
            </div>
          </div>

          <div class="grid w-full gap-2 lg:w-auto lg:grid-cols-[minmax(240px,1fr)_180px_auto]">
            <input [ngModel]="searchQuery()" (ngModelChange)="searchQuery.set($event)" type="search" autocomplete="off" placeholder="Müşteri, telefon, araç ara…" aria-label="Araç başvurularında ara" class="min-h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold outline-none focus:border-blue-500" />
            <select [ngModel]="filter()" (ngModelChange)="filter.set($event)" aria-label="Araç başvurusu durum filtresi" class="min-h-12 rounded-xl border border-slate-200 bg-white px-3 text-sm font-black"><option value="ALL">Tüm durumlar</option><option value="UPLOADING">Dosya yükleniyor</option><option value="NEW">Yeni</option><option value="REVIEWING">İnceleniyor</option><option value="CONTACTED">İletişim kuruldu</option><option value="OFFERED">Teklif verildi</option><option value="ACCEPTED">Kabul edildi</option><option value="REJECTED">Reddedildi</option><option value="CLOSED">Kapalı</option></select>
            <button type="button" (click)="refresh()" [disabled]="partnerService.loading()" class="min-h-12 rounded-xl bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-blue-600 disabled:opacity-50">{{ partnerService.loading() ? "Yenileniyor..." : "Yenile" }}</button>
          </div>
        </div>
      </header>

      <section class="mx-auto max-w-7xl space-y-5 p-4 md:p-8">
        @if (partnerService.error()) {
          <div role="alert" class="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800">
            Başvuru kaynağına ulaşılamadı: {{ partnerService.error() }}
          </div>
        }

        @if (partnerService.loading() && partnerService.records().length === 0) {
          <div class="rounded-2xl border border-slate-200 bg-white p-12 text-center font-bold text-slate-500">
            Başvurular yükleniyor...
          </div>
        } @else {
          <div class="grid gap-4">
            @for (req of filteredRequests(); track req.id) {
              <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
                <div class="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div class="min-w-0 flex-1">
                    <div class="flex flex-wrap items-center gap-2">
                      <span [class]="statusClass(req.status)" class="rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider">
                        {{ statusLabel(req.status) }}
                      </span>
                      <span class="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-700">
                        {{ req.intent === "SELL" ? "Satmak istiyor" : "Kiraya vermek istiyor" }}
                      </span>
                      <span class="font-mono text-xs font-black text-slate-500">{{ req.reference }}</span>
                      <span class="text-xs text-slate-400">{{ req.createdAt | date:'dd.MM.yyyy HH:mm' }}</span>
                    </div>

                    <div class="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <div>
                        <span class="field-label">Müşteri</span>
                        <strong class="mt-1 block break-words text-slate-950">{{ req.customerName }}</strong>
                        <a [href]="'tel:' + req.customerPhone" class="mt-1 block text-sm font-bold text-blue-700 hover:underline">{{ req.customerPhone }}</a>
                        @if (req.customerEmail) {
                          <a [href]="'mailto:' + req.customerEmail" class="mt-1 block break-all text-xs font-bold text-slate-500 hover:underline">{{ req.customerEmail }}</a>
                        }
                      </div>
                      <div>
                        <span class="field-label">Araç</span>
                        <strong class="mt-1 block text-slate-950">{{ req.carBrand }} {{ req.carModel }}</strong>
                        <p class="mt-1 text-sm text-slate-500">{{ req.modelYear || '-' }} model · {{ req.km ?? '-' }} km</p>
                        @if (req.withDriver) {
                          <p class="mt-1 text-xs font-black text-blue-700">Şoförlü hizmet sunabilir</p>
                        }
                      </div>
                      <div>
                        <span class="field-label">Teklif beklentisi</span>
                        <strong class="mt-1 block text-slate-950">
                          {{ req.askingPrice ? (req.askingPrice | number:'1.0-0') + ' TL' : 'Belirtilmedi' }}
                        </strong>
                        <p class="mt-1 text-sm text-slate-500">{{ req.mediaPaths.length }} özel dosya</p>
                      </div>
                    </div>

                    @if (req.description) {
                      <div class="mt-5 rounded-xl bg-slate-50 p-4">
                        <span class="field-label">Başvuru notu</span>
                        <p class="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">{{ req.description }}</p>
                      </div>
                    }

                    @if (mediaByReference()[req.reference]?.length) {
                      <div class="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4">
                        <div class="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <span class="field-label text-blue-700">Özel dosyalar</span>
                            <p class="mt-1 text-xs text-blue-800">Bu bağlantılar yaklaşık 10 dakika geçerlidir.</p>
                          </div>
                          <button type="button" (click)="hideMedia(req.reference)" class="min-h-10 rounded-lg bg-white px-3 text-xs font-black text-slate-700">Gizle</button>
                        </div>
                        <div class="mt-3 grid gap-2 sm:grid-cols-2">
                          @for (media of mediaByReference()[req.reference]; track media.path) {
                            <a
                              [href]="media.signedUrl"
                              target="_blank"
                              rel="noopener noreferrer"
                              class="flex min-h-12 items-center justify-between gap-3 rounded-lg border border-blue-100 bg-white px-3 text-sm font-bold text-blue-800 hover:border-blue-300"
                            >
                              <span class="min-w-0 truncate">{{ media.originalName || 'Dosyayı Aç' }}</span>
                              <span class="shrink-0 text-[10px] text-slate-400">{{ formatBytes(media.size) }}</span>
                            </a>
                          }
                        </div>
                      </div>
                    }
                  </div>

                  <aside class="w-full space-y-3 xl:w-80">
                    <label class="block">
                      <span class="field-label">Durum</span>
                      <select
                        [ngModel]="req.status === 'UPLOADING' ? 'NEW' : req.status"
                        (ngModelChange)="changeStatus(req, $event)"
                        [disabled]="savingReference() === req.reference || req.status === 'UPLOADING'"
                        class="mt-1 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-black disabled:bg-slate-100 disabled:text-slate-400"
                      >
                        <option value="NEW">Yeni</option>
                        <option value="REVIEWING">İnceleniyor</option>
                        <option value="CONTACTED">İletişim kuruldu</option>
                        <option value="OFFERED">Teklif verildi</option>
                        <option value="ACCEPTED">Kabul edildi</option>
                        <option value="REJECTED">Reddedildi</option>
                        <option value="CLOSED">Kapalı</option>
                      </select>
                    </label>

                    <label class="block">
                      <span class="field-label">İç not</span>
                      <textarea
                        #noteBox
                        rows="4"
                        [value]="req.internalNotes || ''"
                        maxlength="4000"
                        [disabled]="req.status === 'UPLOADING'"
                        class="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:border-blue-500 focus:bg-white disabled:opacity-50"
                        placeholder="Müşteriye gösterilmez"
                      ></textarea>
                    </label>

                    <button
                      type="button"
                      (click)="saveNote(req, noteBox.value)"
                      [disabled]="savingReference() === req.reference || req.status === 'UPLOADING'"
                      class="min-h-12 w-full rounded-xl bg-slate-100 px-4 text-sm font-black text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                    >
                      Notu Kaydet
                    </button>

                    @if (req.mediaPaths.length > 0) {
                      <button
                        type="button"
                        (click)="showMedia(req)"
                        [disabled]="mediaLoadingReference() === req.reference"
                        class="min-h-12 w-full rounded-xl bg-blue-50 px-4 text-sm font-black text-blue-800 hover:bg-blue-100 disabled:opacity-50"
                      >
                        {{ mediaLoadingReference() === req.reference ? "Dosyalar Hazırlanıyor..." : "Özel Dosyaları Gör" }}
                      </button>
                    }

                    <button
                      type="button"
                      (click)="closeRequest(req)"
                      [disabled]="savingReference() === req.reference || req.status === 'CLOSED'"
                      class="min-h-12 w-full rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-black text-rose-700 hover:bg-rose-100 disabled:opacity-40"
                    >
                      Başvuruyu Kapat
                    </button>

                    @if (req.status === 'UPLOADING') {
                      <p class="rounded-lg bg-amber-50 p-3 text-xs font-semibold leading-relaxed text-amber-800">
                        Müşteri dosya yükleme/finalize adımını henüz tamamlamamış. Eksik dosyalar doğrulanmadan inceleme başlatılmaz.
                      </p>
                    }
                  </aside>
                </div>
              </article>
            } @empty {
              <div class="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
                <h2 class="text-lg font-black text-slate-800">Başvuru bulunamadı</h2>
                <p class="mt-2 text-sm text-slate-500">Seçili filtre veya arama için kayıt yok.</p>
              </div>
            }
          </div>
        }
      </section>
    </main>
  `,
  styles: [`
    .field-label{font-size:.625rem;font-weight:900;text-transform:uppercase;letter-spacing:.08em;color:rgb(100 116 139)}
  `],
})
export class AdminPartnerRequestsComponent implements OnInit {
  readonly partnerService = inject(PartnerRequestService);
  private readonly mediaService = inject(PartnerMediaService);
  private readonly toastService = inject(ToastService);
  private readonly confirmService = inject(ConfirmService);
  private readonly router = inject(Router);

  readonly searchQuery = signal("");
  readonly filter = signal<"ALL" | PartnerStatus>("ALL");
  readonly savingReference = signal("");
  readonly mediaLoadingReference = signal("");
  readonly mediaByReference = signal<Record<string, PartnerMediaItem[]>>({});

  readonly filteredRequests = computed(() => {
    const query = this.searchQuery().trim().toLocaleLowerCase("tr-TR");
    const status = this.filter();
    return this.partnerService.records().filter((req) => {
      if (status !== "ALL" && req.status !== status) return false;
      if (!query) return true;
      return `${req.reference} ${req.customerName} ${req.customerPhone} ${req.customerEmail || ""} ${req.carBrand} ${req.carModel}`
        .toLocaleLowerCase("tr-TR")
        .includes(query);
    });
  });

  async ngOnInit(): Promise<void> {
    await this.refresh();
  }

  async refresh(): Promise<void> {
    try {
      await this.partnerService.refreshAdmin();
    } catch {
      this.toastService.show("Araç başvuruları yüklenemedi.", "error");
    }
  }

  async changeStatus(
    req: PartnerAdminRecord,
    status: Exclude<PartnerStatus, "UPLOADING">,
  ): Promise<void> {
    if (req.status === "UPLOADING" || req.status === status || this.savingReference()) return;
    this.savingReference.set(req.reference);
    try {
      await this.partnerService.updateStatus(
        req.reference,
        status,
        req.internalNotes || "",
      );
      this.toastService.show("Başvuru durumu kaydedildi.", "success");
    } catch {
      this.toastService.show("Başvuru durumu güncellenemedi.", "error");
    } finally {
      this.savingReference.set("");
    }
  }

  async saveNote(req: PartnerAdminRecord, note: string): Promise<void> {
    if (req.status === "UPLOADING" || this.savingReference()) return;
    this.savingReference.set(req.reference);
    try {
      await this.partnerService.updateStatus(
        req.reference,
        req.status,
        note.trim().slice(0, 4000),
      );
      this.toastService.show("İç not güvenli şekilde kaydedildi.", "success");
    } catch {
      this.toastService.show("İç not kaydedilemedi.", "error");
    } finally {
      this.savingReference.set("");
    }
  }

  async showMedia(req: PartnerAdminRecord): Promise<void> {
    if (this.mediaLoadingReference()) return;
    this.mediaLoadingReference.set(req.reference);
    try {
      const media = await this.mediaService.getSignedMedia(req.reference);
      this.mediaByReference.update((current) => ({
        ...current,
        [req.reference]: media,
      }));
      if (media.length === 0) {
        this.toastService.show("Doğrulanmış özel dosya bulunamadı.", "info");
      }
    } catch {
      this.toastService.show("Özel dosya bağlantıları oluşturulamadı.", "error");
    } finally {
      this.mediaLoadingReference.set("");
    }
  }

  hideMedia(reference: string): void {
    this.mediaByReference.update((current) => {
      const next = { ...current };
      delete next[reference];
      return next;
    });
  }

  async closeRequest(req: PartnerAdminRecord): Promise<void> {
    if (req.status === "CLOSED" || this.savingReference()) return;
    const confirmed = await this.confirmService.confirm({
      title: "Başvuruyu Kapat",
      message:
        "Bu başvuru silinmeyecek, kapalı duruma alınacak ve kayıt geçmişi korunacaktır. Devam edilsin mi?",
    });
    if (!confirmed) return;

    this.savingReference.set(req.reference);
    try {
      await this.partnerService.updateStatus(
        req.reference,
        "CLOSED",
        req.internalNotes || "",
      );
      this.toastService.show("Başvuru kapatıldı.", "success");
    } catch {
      this.toastService.show("Başvuru kapatılamadı.", "error");
    } finally {
      this.savingReference.set("");
    }
  }

  statusLabel(status: PartnerStatus): string {
    const labels: Record<PartnerStatus, string> = {
      UPLOADING: "Dosya yükleniyor",
      NEW: "Yeni",
      REVIEWING: "İnceleniyor",
      CONTACTED: "İletişim kuruldu",
      OFFERED: "Teklif verildi",
      ACCEPTED: "Kabul edildi",
      REJECTED: "Reddedildi",
      CLOSED: "Kapalı",
    };
    return labels[status];
  }

  statusClass(status: PartnerStatus): string {
    const classes: Record<PartnerStatus, string> = {
      UPLOADING: "bg-amber-100 text-amber-800",
      NEW: "bg-blue-100 text-blue-800",
      REVIEWING: "bg-indigo-100 text-indigo-800",
      CONTACTED: "bg-cyan-100 text-cyan-800",
      OFFERED: "bg-violet-100 text-violet-800",
      ACCEPTED: "bg-emerald-100 text-emerald-800",
      REJECTED: "bg-rose-100 text-rose-800",
      CLOSED: "bg-slate-200 text-slate-700",
    };
    return classes[status];
  }

  formatBytes(size: number): string {
    if (!Number.isFinite(size) || size <= 0) return "";
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  goBack(): void {
    void this.router.navigate(["/admin/dashboard"]);
  }
}
