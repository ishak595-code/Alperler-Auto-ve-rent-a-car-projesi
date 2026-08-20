import { CommonModule, Location } from "@angular/common";
import { Component, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatIconModule } from "@angular/material/icon";
import { Router, RouterLink } from "@angular/router";
import { PartnerIntent, PartnerRequestService } from "../services/partner-request.service";

@Component({
  selector: "app-list-your-car-v2",
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, RouterLink],
  template: `
    <main class="min-h-screen bg-slate-950 pb-20 text-slate-200">
      <header class="sticky top-0 z-40 border-b border-slate-800 bg-slate-900/95 shadow-lg backdrop-blur">
        <div class="mx-auto flex min-h-16 max-w-7xl items-center gap-3 px-4">
          <button type="button" (click)="goBack()" class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-300 hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" aria-label="Aracını Değerlendir sayfasından geri dön"><mat-icon aria-hidden="true">arrow_back</mat-icon></button>
          <div class="min-w-0"><h1 class="font-black text-white">Aracını Değerlendir</h1><p class="truncate text-xs text-slate-400">Satış veya filo değerlendirme başvurusu</p></div>
        </div>
      </header>

      <section class="mx-auto max-w-5xl px-4 py-8 sm:py-12">
        @if (success()) {
          <div class="mx-auto max-w-2xl rounded-3xl border border-emerald-500/20 bg-white p-7 text-center text-slate-900 shadow-2xl sm:p-10" role="status" aria-live="polite">
            <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><mat-icon aria-hidden="true" class="!h-9 !w-9 !text-[36px]">check_circle</mat-icon></div>
            <p class="mt-5 text-xs font-black uppercase tracking-[.18em] text-emerald-700">Başvuru tamamlandı</p>
            <h2 class="mt-2 text-3xl font-black">Aracınız değerlendirmeye alındı</h2>
            <p class="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-600">Bilgileriniz ve eklediğiniz dosyalar kaydedildi. İnceleme sonrasında uygun seçenek sizinle paylaşılacaktır.</p>
            <div class="mx-auto mt-6 max-w-md rounded-2xl bg-slate-100 px-5 py-4"><span class="block text-xs font-black uppercase tracking-wider text-slate-500">Referans numarası</span><strong class="mt-1 block break-all text-lg text-slate-950">{{ reference() }}</strong></div>
            <div class="mt-7 grid gap-3 sm:grid-cols-2"><button type="button" (click)="reset()" class="min-h-12 rounded-xl border border-slate-200 px-5 font-black text-slate-700">Yeni Başvuru</button><a routerLink="/" class="flex min-h-12 items-center justify-center rounded-xl bg-slate-950 px-5 font-black text-white">Ana Sayfaya Dön</a></div>
          </div>
        } @else {
          <div class="mb-8 max-w-3xl">
            <span class="text-xs font-black uppercase tracking-[.18em] text-blue-400">Alperler Rent A Car</span>
            <h2 class="mt-2 font-serif text-3xl font-black text-white sm:text-5xl">Aracınız için doğru modeli birlikte netleştirelim</h2>
            <p class="mt-3 text-sm leading-relaxed text-slate-400 sm:text-base">Temel araç bilgilerini ve varsa fotoğraf veya belgeleri paylaşın. Satış ya da kiralama filosuna uygunluk, inceleme sonrasında değerlendirilir.</p>
          </div>

          <form (ngSubmit)="submit()" class="grid gap-6 lg:grid-cols-[1fr_.72fr]" novalidate>
            <div class="space-y-6">
              <section class="panel">
                <h3 class="section-title">1. Nasıl değerlendirelim?</h3>
                <div class="grid gap-3 sm:grid-cols-2">
                  <button type="button" (click)="intent='sell'" [class.selected-option]="intent==='sell'" [attr.aria-pressed]="intent==='sell'" class="option-button"><mat-icon aria-hidden="true">sell</mat-icon><span><strong>Satış için değerlendir</strong><small>Aracınız için satış talebi oluşturun</small></span></button>
                  <button type="button" (click)="intent='rent'" [class.selected-option]="intent==='rent'" [attr.aria-pressed]="intent==='rent'" class="option-button"><mat-icon aria-hidden="true">car_rental</mat-icon><span><strong>Kiralama filosu için değerlendir</strong><small>Uygunluk ve çalışma modeli incelensin</small></span></button>
                </div>
              </section>

              <section class="panel">
                <h3 class="section-title">2. Araç bilgileri</h3>
                <div class="grid gap-4 sm:grid-cols-2">
                  <label class="field"><span>Marka *</span><input [(ngModel)]="carBrand" name="carBrand" maxlength="100" required placeholder="Örn. Toyota" /></label>
                  <label class="field"><span>Model *</span><input [(ngModel)]="carModel" name="carModel" maxlength="100" required placeholder="Örn. Corolla" /></label>
                  <label class="field"><span>Model yılı *</span><input type="number" inputmode="numeric" [(ngModel)]="carYear" name="carYear" min="1950" [max]="maxYear" required /></label>
                  <label class="field"><span>Kilometre *</span><input type="number" inputmode="numeric" [(ngModel)]="carMileage" name="carMileage" min="0" max="5000000" required /></label>
                  <label class="field sm:col-span-2"><span>Beklenen fiyat (isteğe bağlı)</span><input type="number" inputmode="decimal" [(ngModel)]="askingPrice" name="askingPrice" min="0" placeholder="TL" /></label>
                </div>
                @if (intent === 'rent') {
                  <label class="mt-4 flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700"><input type="checkbox" [(ngModel)]="withDriver" name="withDriver" class="h-5 w-5" /> Araç şoförlü hizmet için de değerlendirilebilir</label>
                }
              </section>

              <section class="panel">
                <h3 class="section-title">3. İletişim bilgileri</h3>
                <div class="grid gap-4 sm:grid-cols-2">
                  <label class="field"><span>Ad soyad *</span><input [(ngModel)]="name" name="name" autocomplete="name" maxlength="160" required /></label>
                  <label class="field"><span>Telefon *</span><input [(ngModel)]="phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" maxlength="40" required /></label>
                  <label class="field sm:col-span-2"><span>E-posta</span><input [(ngModel)]="email" name="email" type="email" inputmode="email" autocomplete="email" maxlength="160" /></label>
                </div>
              </section>

              <section class="panel">
                <h3 class="section-title">4. Fotoğraf ve belgeler</h3>
                <p class="-mt-2 mb-4 text-sm leading-6 text-slate-500">Mevcut araç fotoğrafları, kısa video veya ilgili PDF belgeleri değerlendirmeyi kolaylaştırır. Bu alan isteğe bağlıdır.</p>
                <label class="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-5 text-center transition hover:border-blue-400 hover:bg-blue-50">
                  <mat-icon aria-hidden="true" class="!h-9 !w-9 !text-[36px] text-blue-600">cloud_upload</mat-icon>
                  <strong class="mt-2 text-slate-900">Dosya seç</strong>
                  <span class="mt-1 text-xs text-slate-500">JPG, PNG, WebP, MP4 veya PDF. En fazla 10 dosya.</span>
                  <input type="file" multiple accept="image/jpeg,image/png,image/webp,video/mp4,application/pdf" class="sr-only" (change)="selectFiles($event)" aria-label="Araç fotoğrafı, video veya belge seç" />
                </label>
                @if (files().length) {
                  <div class="mt-4 space-y-2">
                    @for (file of files(); track file.name + file.size + $index) {
                      <div class="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
                        <mat-icon aria-hidden="true" class="text-slate-400">{{ file.type.startsWith('image/') ? 'image' : file.type === 'video/mp4' ? 'videocam' : 'description' }}</mat-icon>
                        <div class="min-w-0 flex-1"><strong class="block truncate text-sm text-slate-800">{{ file.name }}</strong><small class="text-slate-500">{{ formatBytes(file.size) }}</small></div>
                        <button type="button" (click)="removeFile($index)" class="flex h-11 w-11 items-center justify-center rounded-xl text-rose-600 hover:bg-rose-50" [attr.aria-label]="file.name + ' dosyasını kaldır'"><mat-icon aria-hidden="true">close</mat-icon></button>
                      </div>
                    }
                    <div class="text-right text-xs font-bold text-slate-500">Toplam: {{ formatBytes(totalFileBytes()) }}</div>
                  </div>
                }
                @if (uploading()) {
                  <div class="mt-5 rounded-2xl bg-slate-950 p-4 text-white" aria-live="polite">
                    <div class="flex justify-between text-sm font-bold"><span>Dosyalar yükleniyor</span><span>{{ overallProgress() }}%</span></div>
                    <div class="mt-3 h-2 overflow-hidden rounded-full bg-slate-700"><div class="h-full rounded-full bg-blue-500 transition-all" [style.width.%]="overallProgress()"></div></div>
                    <p class="mt-2 text-xs leading-relaxed text-slate-400">Yükleme tamamlanana kadar bu ekranı açık tutun.</p>
                  </div>
                }
              </section>

              <section class="panel">
                <h3 class="section-title">5. Ek bilgi</h3>
                <label class="field"><span>Açıklama</span><textarea [(ngModel)]="notes" name="notes" rows="5" maxlength="4000" placeholder="Hasar, ekspertiz, donanım, bakım geçmişi veya belirtmek istediğiniz diğer bilgiler"></textarea></label>
              </section>
            </div>

            <aside class="space-y-5 lg:sticky lg:top-24 lg:self-start">
              <div class="panel">
                <h3 class="section-title">Başvuru özeti</h3>
                <div class="space-y-3 text-sm text-slate-600">
                  <div class="summary-row"><span>Değerlendirme</span><strong>{{ intent === 'sell' ? 'Satış' : 'Kiralama filosu' }}</strong></div>
                  <div class="summary-row"><span>Araç</span><strong>{{ carBrand || '-' }} {{ carModel || '' }}</strong></div>
                  <div class="summary-row"><span>Yıl / KM</span><strong>{{ carYear || '-' }} / {{ carMileage || 0 | number:'1.0-0' }}</strong></div>
                  <div class="summary-row"><span>Dosya</span><strong>{{ files().length }}</strong></div>
                </div>
              </div>

              <div class="panel space-y-3">
                <label class="consent"><input type="checkbox" [(ngModel)]="termsAccepted" name="termsAccepted" /><span><a routerLink="/legal" class="font-black text-blue-700 underline">Kullanım şartlarını</a> okudum ve kabul ediyorum.</span></label>
                <label class="consent"><input type="checkbox" [(ngModel)]="kvkkAccepted" name="kvkkAccepted" /><span>Kişisel verilerimin bu başvurunun değerlendirilmesi ve benimle iletişim kurulması amacıyla işlenmesini kabul ediyorum.</span></label>
              </div>

              @if (errorMessage()) {<div role="alert" class="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold leading-relaxed text-rose-800">{{ errorMessage() }}</div>}

              <button type="submit" [disabled]="submitting() || !formValid()" class="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 font-black text-white shadow-xl transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-45 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
                @if (submitting()) {<mat-icon aria-hidden="true" class="animate-spin">progress_activity</mat-icon>{{ uploading() ? 'Dosyalar yükleniyor...' : 'Başvuru kaydediliyor...' }}} @else {<mat-icon aria-hidden="true">send</mat-icon>Başvuruyu Gönder}
              </button>
              <p class="text-center text-[11px] leading-relaxed text-slate-500">Başvurunuz kaydedildiğinde size takip edebileceğiniz bir referans numarası verilir.</p>
            </aside>
          </form>
        }
      </section>
    </main>
  `,
  styles: [`
    .panel{border:1px solid rgb(226 232 240);border-radius:22px;background:white;padding:20px;color:rgb(15 23 42);box-shadow:0 12px 30px rgba(15,23,42,.08)}.section-title{margin-bottom:16px;font-size:.78rem;font-weight:900;text-transform:uppercase;letter-spacing:.12em;color:rgb(71 85 105)}.field{display:flex;flex-direction:column;gap:7px}.field>span{font-size:.72rem;font-weight:900;text-transform:uppercase;letter-spacing:.07em;color:rgb(71 85 105)}.field input,.field textarea{width:100%;border:1px solid rgb(203 213 225);border-radius:12px;background:rgb(248 250 252);padding:12px 14px;color:rgb(15 23 42);outline:none}.field input{min-height:48px}.field input:focus,.field textarea:focus{border-color:rgb(59 130 246);box-shadow:0 0 0 2px rgb(59 130 246/.15)}.option-button{display:flex;min-height:86px;align-items:center;gap:12px;border:2px solid rgb(226 232 240);border-radius:16px;background:rgb(248 250 252);padding:14px;text-align:left;color:rgb(30 41 59)}.option-button span{display:flex;flex-direction:column}.option-button small{margin-top:3px;color:rgb(100 116 139);font-size:.72rem}.selected-option{border-color:rgb(37 99 235);background:rgb(239 246 255);color:rgb(29 78 216)}.summary-row{display:flex;justify-content:space-between;gap:14px;border-bottom:1px solid rgb(241 245 249);padding-bottom:10px}.summary-row:last-child{border-bottom:0;padding-bottom:0}.consent{display:flex;cursor:pointer;align-items:flex-start;gap:10px;font-size:.78rem;line-height:1.55;color:rgb(71 85 105)}.consent input{margin-top:2px;height:18px;width:18px;flex:none}
  `],
})
export class ListYourCarV2Component {
  private readonly service = inject(PartnerRequestService);
  private readonly location = inject(Location);
  private readonly router = inject(Router);

  readonly files = signal<File[]>([]);
  readonly submitting = signal(false);
  readonly uploading = signal(false);
  readonly errorMessage = signal("");
  readonly success = signal(false);
  readonly reference = signal("");
  readonly maxYear = new Date().getFullYear() + 1;
  readonly totalFileBytes = computed(() => this.files().reduce((sum, file) => sum + file.size, 0));
  readonly overallProgress = computed(() => {
    const values = Object.values(this.service.uploadProgress());
    if (!values.length) return this.uploading() ? 0 : 100;
    return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  });

  intent: PartnerIntent = "sell";
  name = "";
  phone = "";
  email = "";
  carBrand = "";
  carModel = "";
  carYear = new Date().getFullYear();
  carMileage = 0;
  askingPrice: number | undefined;
  withDriver = false;
  notes = "";
  termsAccepted = false;
  kvkkAccepted = false;

  formValid(): boolean {
    return Boolean(
      this.name.trim().length >= 2 &&
        /^[+0-9()\s-]{7,24}$/.test(this.phone.trim()) &&
        (!this.email.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim())) &&
        this.carBrand.trim() &&
        this.carModel.trim() &&
        Number.isInteger(Number(this.carYear)) &&
        Number(this.carYear) >= 1950 &&
        Number(this.carYear) <= this.maxYear &&
        Number(this.carMileage) >= 0 &&
        this.files().length <= 10 &&
        this.totalFileBytes() <= 200 * 1024 * 1024 &&
        this.termsAccepted &&
        this.kvkkAccepted,
    );
  }

  selectFiles(event: Event): void {
    const input = event.target as HTMLInputElement;
    const selected = Array.from(input.files || []);
    input.value = "";
    if (!selected.length) return;
    const allowed = new Set(["image/jpeg", "image/png", "image/webp", "video/mp4", "application/pdf"]);
    const merged = [...this.files(), ...selected];
    if (merged.length > 10) { this.errorMessage.set("En fazla 10 dosya ekleyebilirsiniz."); return; }
    if (merged.some((file) => !allowed.has(file.type))) { this.errorMessage.set("Yalnız JPG, PNG, WebP, MP4 ve PDF dosyaları kabul edilir."); return; }
    if (merged.some((file) => file.size <= 0 || file.size > 50 * 1024 * 1024)) { this.errorMessage.set("Her dosya en fazla 50 MB olabilir."); return; }
    if (merged.reduce((sum, file) => sum + file.size, 0) > 200 * 1024 * 1024) { this.errorMessage.set("Toplam dosya boyutu 200 MB sınırını aşamaz."); return; }
    this.errorMessage.set("");
    this.files.set(merged);
  }

  removeFile(index: number): void { this.files.update((files) => files.filter((_, current) => current !== index)); }

  async submit(): Promise<void> {
    if (!this.formValid() || this.submitting()) return;
    this.errorMessage.set("");
    this.submitting.set(true);
    this.uploading.set(this.files().length > 0);
    try {
      const result = await this.service.submit({
        intent: this.intent,
        name: this.name.trim(),
        phone: this.phone.trim(),
        email: this.email.trim() || undefined,
        carBrand: this.carBrand.trim(),
        carModel: this.carModel.trim(),
        modelYear: Number(this.carYear),
        km: Number(this.carMileage),
        askingPrice: this.askingPrice === undefined || this.askingPrice === null || Number(this.askingPrice) < 0 ? undefined : Number(this.askingPrice),
        withDriver: this.intent === "rent" ? this.withDriver : false,
        notes: this.notes.trim() || undefined,
        files: this.files(),
      });
      this.reference.set(result.reference);
      this.success.set(true);
    } catch (error) {
      const code = error instanceof Error ? error.message : "PARTNER_REQUEST_FAILED";
      this.errorMessage.set(
        code.includes("RATE_LIMITED")
          ? "Kısa sürede çok fazla başvuru yapıldı. Lütfen biraz sonra tekrar deneyin."
          : code.includes("UPLOAD") || code.includes("TUS")
            ? "Başvuru kaydı oluşturuldu ancak dosyalardan biri tamamlanamadı. Aynı formu tekrar gönderdiğinizde sistem çift kayıt oluşturmadan işlemi yeniden deneyecektir."
            : "Başvuru tamamlanamadı. Lütfen bağlantınızı kontrol edip tekrar deneyin.",
      );
    } finally {
      this.uploading.set(false);
      this.submitting.set(false);
    }
  }

  reset(): void {
    this.intent = "sell"; this.name = ""; this.phone = ""; this.email = ""; this.carBrand = ""; this.carModel = ""; this.carYear = new Date().getFullYear(); this.carMileage = 0; this.askingPrice = undefined; this.withDriver = false; this.notes = ""; this.termsAccepted = false; this.kvkkAccepted = false;
    this.files.set([]); this.errorMessage.set(""); this.reference.set(""); this.success.set(false); this.service.resetSubmissionKey();
  }

  formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  goBack(): void {
    if (window.history.length > 1) this.location.back();
    else void this.router.navigate(["/"]);
  }
}
