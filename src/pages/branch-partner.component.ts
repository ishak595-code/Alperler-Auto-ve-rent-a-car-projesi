import { CommonModule, Location } from "@angular/common";
import { Component, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatIconModule } from "@angular/material/icon";
import { RouterLink } from "@angular/router";
import {
  BranchPartnerBudgetRange,
  BranchPartnerListingModel,
  BranchPartnerOfficeStatus,
  BranchPartnerService,
  BranchPartnerServiceType,
} from "../services/branch-partner.service";

@Component({
  selector: "app-branch-partner",
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, RouterLink],
  template: `
    <main class="min-h-screen bg-slate-950 pb-24 text-slate-200">
      <header class="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div class="mx-auto flex min-h-16 max-w-6xl items-center gap-3 px-4">
          <button type="button" (click)="location.back()" class="grid h-11 w-11 place-items-center rounded-xl text-slate-300 hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400" aria-label="Geri dön">
            <mat-icon aria-hidden="true">arrow_back</mat-icon>
          </button>
          <div class="min-w-0">
            <h1 class="truncate text-lg font-black text-white">Alperler Auto İş Ortaklığı</h1>
            <p class="truncate text-xs text-slate-400">Şube ve bölgesel operasyon başvurusu</p>
          </div>
        </div>
      </header>

      <section class="mx-auto max-w-6xl px-4 py-8 sm:py-12">
        @if (successReference()) {
          <div class="mx-auto max-w-2xl rounded-3xl bg-white p-7 text-center text-slate-900 shadow-2xl sm:p-10" role="status" aria-live="polite">
            <div class="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-700"><mat-icon class="!h-9 !w-9 !text-[36px]">check_circle</mat-icon></div>
            <p class="mt-5 text-xs font-black uppercase tracking-[.16em] text-emerald-700">Başvuru kaydedildi</p>
            <h2 class="mt-2 text-3xl font-black">Şube adaylık süreciniz başladı</h2>
            <p class="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-600">Başvurunuz bölge, operasyon kapasitesi ve marka standartları açısından incelenecek. Bu ekran otomatik bayilik onayı anlamına gelmez.</p>
            <div class="mx-auto mt-6 max-w-md rounded-2xl bg-slate-100 px-5 py-4"><span class="text-xs font-black uppercase tracking-wider text-slate-500">Başvuru referansı</span><strong class="mt-1 block text-lg">{{ successReference() }}</strong></div>
            <div class="mt-7 grid gap-3 sm:grid-cols-2"><button type="button" (click)="reset()" class="min-h-12 rounded-xl border border-slate-200 font-black">Yeni Başvuru</button><a routerLink="/" class="flex min-h-12 items-center justify-center rounded-xl bg-slate-950 px-4 font-black text-white">Ana Sayfaya Dön</a></div>
          </div>
        } @else {
          <div class="grid gap-7 lg:grid-cols-[.9fr_1.1fr] lg:gap-10">
            <aside class="lg:sticky lg:top-24 lg:self-start">
              <p class="text-xs font-black uppercase tracking-[.18em] text-blue-400">Bölgenizde Alperler Auto</p>
              <h2 class="mt-3 font-serif text-3xl font-black leading-tight text-white sm:text-5xl">Teknoloji altyapısını kurmak yerine işinizi büyütün.</h2>
              <p class="mt-4 max-w-xl text-sm leading-7 text-slate-400">Kendi araçlarınızla veya bölgenizdeki araç sahipleriyle çalışabilirsiniz. Uygun adaylar Alperler Auto'nun ilan, müşteri talebi ve şube altyapısını marka standartları içinde kullanabilir.</p>

              <div class="mt-7 grid gap-3">
                <div class="benefit"><mat-icon aria-hidden="true">directions_car</mat-icon><div><strong>Kendi filonuzu yayınlayın</strong><span>Kiralık veya satılık araçlarınızı merkezi katalog üzerinden yönetin.</span></div></div>
                <div class="benefit"><mat-icon aria-hidden="true">hub</mat-icon><div><strong>Yerel ağınızı sisteme taşıyın</strong><span>Bölgenizdeki uygun araç sahipleriyle iş modeli geliştirin.</span></div></div>
                <div class="benefit"><mat-icon aria-hidden="true">storefront</mat-icon><div><strong>Şube görünürlüğü kazanın</strong><span>Onay sonrası hizmet noktanız şube ağına ve teslim seçeneklerine bağlanabilir.</span></div></div>
                <div class="benefit"><mat-icon aria-hidden="true">verified_user</mat-icon><div><strong>Kontrollü büyüme</strong><span>Her başvuru kimlik, operasyon, araç ve marka uygunluğu açısından incelenir.</span></div></div>
              </div>

              <div class="mt-6 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-xs leading-6 text-amber-100">
                Başvuru yapmak bayilik hakkı oluşturmaz. Marka kullanımı, araç yayını ve şube aktivasyonu yalnız inceleme ve sözleşme sonrasında açılır.
              </div>
            </aside>

            <form (ngSubmit)="submit()" class="rounded-3xl bg-white p-5 text-slate-900 shadow-2xl sm:p-7" novalidate>
              <div class="mb-6"><p class="text-xs font-black uppercase tracking-[.14em] text-blue-700">Ön değerlendirme formu</p><h3 class="mt-1 text-2xl font-black">Bölgenizi ve kapasitenizi tanıyalım</h3><p class="mt-2 text-sm leading-6 text-slate-500">Sadece karar vermek için gerekli bilgileri istiyoruz.</p></div>

              <div class="grid gap-4 sm:grid-cols-2">
                <label class="field"><span>Ad soyad *</span><input [(ngModel)]="fullName" name="fullName" autocomplete="name" maxlength="160" required /></label>
                <label class="field"><span>Telefon *</span><input [(ngModel)]="phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" maxlength="40" required /></label>
                <label class="field sm:col-span-2"><span>E-posta</span><input [(ngModel)]="email" name="email" type="email" inputmode="email" autocomplete="email" maxlength="160" /></label>
                <label class="field"><span>Şehir *</span><input [(ngModel)]="city" name="city" maxlength="80" required placeholder="Örn. Hakkari" /></label>
                <label class="field"><span>İlçe *</span><input [(ngModel)]="district" name="district" maxlength="80" required placeholder="Örn. Yüksekova" /></label>
                <label class="field sm:col-span-2"><span>Hedef çalışma bölgesi</span><input [(ngModel)]="operatingArea" name="operatingArea" maxlength="180" placeholder="İlçe, mahalle veya çevre ilçeler" /></label>
                <label class="field sm:col-span-2"><span>Mevcut işletme / şirket</span><input [(ngModel)]="currentBusiness" name="currentBusiness" maxlength="180" placeholder="Varsa işletme adı" /></label>
              </div>

              <fieldset class="group-box mt-6">
                <legend>Hangi hizmetleri sunmak istiyorsunuz? *</legend>
                <label class="check"><input type="checkbox" [(ngModel)]="serviceRental" name="serviceRental" /><span>Araç kiralama</span></label>
                <label class="check"><input type="checkbox" [(ngModel)]="serviceSales" name="serviceSales" /><span>İkinci el araç satışı</span></label>
                <label class="check"><input type="checkbox" [(ngModel)]="serviceTour" name="serviceTour" /><span>Tur / transfer</span></label>
              </fieldset>

              <div class="mt-6 grid gap-4 sm:grid-cols-2">
                <label class="field"><span>Otomotiv deneyimi</span><input type="number" inputmode="numeric" [(ngModel)]="experienceYears" name="experienceYears" min="0" max="60" /><small>Yıl</small></label>
                <label class="field"><span>Ofis durumu</span><select [(ngModel)]="officeStatus" name="officeStatus"><option value="OWN">Kendi yerim var</option><option value="RENT">Kiralanmış yerim var</option><option value="PLAN">Yer açmayı planlıyorum</option><option value="NONE">Şimdilik ofis düşünmüyorum</option></select></label>
                <label class="field"><span>Şu anki araç sayısı</span><input type="number" inputmode="numeric" [(ngModel)]="currentFleetSize" name="currentFleetSize" min="0" max="5000" /></label>
                <label class="field"><span>Planlanan araç sayısı *</span><input type="number" inputmode="numeric" [(ngModel)]="plannedFleetSize" name="plannedFleetSize" min="1" max="5000" required /></label>
                <label class="field"><span>İlan / filo modeli</span><select [(ngModel)]="listingModel" name="listingModel"><option value="OWN_FLEET">Kendi araçlarım</option><option value="REGIONAL_NETWORK">Bölgedeki araç sahipleri</option><option value="BOTH">Her ikisi</option></select></label>
                <label class="field"><span>Başlangıç bütçesi</span><select [(ngModel)]="budgetRange" name="budgetRange"><option value="DISCUSS">Görüşmede netleştirelim</option><option value="UNDER_100K">100.000 TL altı</option><option value="100K_250K">100.000 - 250.000 TL</option><option value="250K_500K">250.000 - 500.000 TL</option><option value="500K_PLUS">500.000 TL ve üzeri</option></select></label>
              </div>

              <label class="field mt-6"><span>Ek bilgi</span><textarea [(ngModel)]="notes" name="notes" rows="4" maxlength="4000" placeholder="Bölgedeki müşteri potansiyeli, araç erişiminiz veya planınız hakkında kısa bilgi"></textarea></label>

              <input class="hp" [(ngModel)]="website" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" />

              <div class="mt-6 space-y-3">
                <label class="consent"><input type="checkbox" [(ngModel)]="accuracyAccepted" name="accuracyAccepted" /><span>Verdiğim bilgilerin doğru olduğunu ve başvurunun ön değerlendirme olduğunu kabul ediyorum.</span></label>
                <label class="consent"><input type="checkbox" [(ngModel)]="privacyAccepted" name="privacyAccepted" /><span>Kişisel verilerimin başvurunun değerlendirilmesi ve iletişim amacıyla işlenmesini kabul ediyorum. <a routerLink="/legal" class="font-black text-blue-700 underline">Yasal bilgilendirmeler</a></span></label>
              </div>

              @if (errorMessage()) { <div class="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800" role="alert">{{ errorMessage() }}</div> }

              <button type="submit" [disabled]="submitting() || !formValid()" class="mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 font-black text-white shadow-lg hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-45 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                @if (submitting()) { <mat-icon class="animate-spin" aria-hidden="true">progress_activity</mat-icon>Başvuru kaydediliyor } @else { <mat-icon aria-hidden="true">send</mat-icon>Şube Başvurumu Gönder }
              </button>
              <p class="mt-3 text-center text-[11px] leading-5 text-slate-500">Başvuru kaydedildiğinde size benzersiz bir referans numarası verilir.</p>
            </form>
          </div>
        }
      </section>
    </main>
  `,
  styles: [`
    .benefit{display:flex;gap:.8rem;border:1px solid rgba(148,163,184,.14);border-radius:16px;background:rgba(15,23,42,.72);padding:1rem}.benefit mat-icon{flex:0 0 auto;color:#93c5fd}.benefit div{display:flex;flex-direction:column}.benefit strong{color:#fff;font-size:.86rem}.benefit span{margin-top:.2rem;color:#94a3b8;font-size:.75rem;line-height:1.5}
    .field{display:flex;flex-direction:column;gap:.38rem}.field>span,.group-box legend{font-size:.68rem;font-weight:900;letter-spacing:.065em;text-transform:uppercase;color:#475569}.field input,.field select,.field textarea{width:100%;min-height:48px;border:1px solid #cbd5e1;border-radius:12px;background:#f8fafc;padding:.72rem .8rem;color:#0f172a;outline:none}.field textarea{min-height:110px;resize:vertical}.field input:focus,.field select:focus,.field textarea:focus{border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,.12);background:#fff}.field small{color:#94a3b8;font-size:.68rem}
    .group-box{display:grid;gap:.55rem;border:1px solid #e2e8f0;border-radius:16px;padding:1rem}.group-box legend{padding:0 .35rem}.check,.consent{display:flex;align-items:flex-start;gap:.65rem;color:#475569;font-size:.78rem;line-height:1.5}.check input,.consent input{width:18px;height:18px;flex:0 0 18px;margin-top:.1rem}.hp{display:none!important}
  `],
})
export class BranchPartnerComponent {
  readonly location = inject(Location);
  private readonly service = inject(BranchPartnerService);

  fullName = "";
  phone = "";
  email = "";
  city = "";
  district = "";
  operatingArea = "";
  currentBusiness = "";
  experienceYears = 0;
  officeStatus: BranchPartnerOfficeStatus = "PLAN";
  currentFleetSize = 0;
  plannedFleetSize = 1;
  listingModel: BranchPartnerListingModel = "OWN_FLEET";
  budgetRange: BranchPartnerBudgetRange = "DISCUSS";
  notes = "";
  website = "";
  serviceRental = true;
  serviceSales = false;
  serviceTour = false;
  accuracyAccepted = false;
  privacyAccepted = false;

  readonly submitting = signal(false);
  readonly errorMessage = signal("");
  readonly successReference = signal("");

  readonly selectedServices = computed<BranchPartnerServiceType[]>(() => {
    const services: BranchPartnerServiceType[] = [];
    if (this.serviceRental) services.push("RENTAL");
    if (this.serviceSales) services.push("SALES");
    if (this.serviceTour) services.push("TOUR_TRANSFER");
    return services;
  });

  formValid(): boolean {
    return Boolean(
      this.fullName.trim() &&
      /^[+0-9()\s-]{7,24}$/.test(this.phone.trim()) &&
      this.city.trim() &&
      this.district.trim() &&
      this.plannedFleetSize >= 1 &&
      (this.serviceRental || this.serviceSales || this.serviceTour) &&
      this.accuracyAccepted &&
      this.privacyAccepted
    );
  }

  async submit(): Promise<void> {
    if (!this.formValid() || this.submitting()) return;
    this.submitting.set(true);
    this.errorMessage.set("");
    try {
      const result = await this.service.submit({
        fullName: this.fullName,
        phone: this.phone,
        email: this.email || undefined,
        city: this.city,
        district: this.district,
        operatingArea: this.operatingArea || undefined,
        currentBusiness: this.currentBusiness || undefined,
        experienceYears: this.experienceYears,
        officeStatus: this.officeStatus,
        currentFleetSize: this.currentFleetSize,
        plannedFleetSize: this.plannedFleetSize,
        services: this.services(),
        listingModel: this.listingModel,
        budgetRange: this.budgetRange,
        notes: this.notes || undefined,
        website: this.website,
      });
      this.successReference.set(result.reference);
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      const code = error instanceof Error ? error.message : "BRANCH_PARTNER_CREATE_FAILED";
      this.errorMessage.set(this.errorText(code));
    } finally {
      this.submitting.set(false);
    }
  }

  reset(): void {
    this.successReference.set("");
    this.errorMessage.set("");
    this.fullName = "";
    this.phone = "";
    this.email = "";
    this.city = "";
    this.district = "";
    this.operatingArea = "";
    this.currentBusiness = "";
    this.experienceYears = 0;
    this.officeStatus = "PLAN";
    this.currentFleetSize = 0;
    this.plannedFleetSize = 1;
    this.listingModel = "OWN_FLEET";
    this.budgetRange = "DISCUSS";
    this.notes = "";
    this.serviceRental = true;
    this.serviceSales = false;
    this.serviceTour = false;
    this.accuracyAccepted = false;
    this.privacyAccepted = false;
  }

  private services(): BranchPartnerServiceType[] {
    const values: BranchPartnerServiceType[] = [];
    if (this.serviceRental) values.push("RENTAL");
    if (this.serviceSales) values.push("SALES");
    if (this.serviceTour) values.push("TOUR_TRANSFER");
    return values;
  }

  private errorText(code: string): string {
    if (code.includes("RATE_LIMITED")) return "Kısa sürede çok fazla başvuru gönderildi. Bir süre sonra tekrar deneyin.";
    if (code.includes("INVALID_EMAIL")) return "E-posta adresini kontrol edin.";
    if (code.includes("INVALID_REQUIRED_FIELDS")) return "Zorunlu alanları ve telefon numarasını kontrol edin.";
    return "Başvuru şu anda kaydedilemedi. Bilgileriniz silinmedi, tekrar deneyebilirsiniz.";
  }
}
