import { Component, inject, signal } from "@angular/core";
import { CommonModule, Location } from "@angular/common";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { MatIconModule } from "@angular/material/icon";
import { CarService } from "../services/car.service";
import { ToastService } from "../services/toast.service";
import { Router, RouterModule } from "@angular/router";

@Component({
  selector: "app-list-your-car",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, RouterModule],
  template: `
    <div class="min-h-screen bg-slate-950 text-slate-300 font-sans pb-20 overflow-x-hidden">
      <!-- Sticky Module Header -->
      <div
        class="bg-slate-900 border-b border-slate-800 sticky top-[72px] md:top-[96px] z-40 shadow-lg"
      >
        <div class="max-w-7xl mx-auto px-4">
          <div class="min-h-16 flex items-center gap-2 sm:gap-3 py-2">
            <button
              (click)="goBack()"
              class="w-11 h-11 -ml-2 hover:bg-slate-800 hover:text-white rounded-full transition-colors text-slate-400 shrink-0 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              aria-label="Geri Dön"
            >
              <mat-icon>arrow_back</mat-icon>
            </button>
            <h1 class="text-lg font-bold text-white">
              Aracını Değerlendir
            </h1>
          </div>
        </div>
      </div>

      <!-- Hero Section -->
      <div class="bg-slate-900 text-white py-10 sm:py-16 mb-8 sm:mb-12">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 class="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 text-balance leading-tight">
            Aracınızı Satın veya Kiraya Verin
          </h1>
          <p class="text-base sm:text-lg md:text-xl text-slate-300 max-w-3xl mx-auto mb-8 text-pretty leading-relaxed">
            Aracınızı Alperler güvencesiyle en iyi fiyata satın veya
            kullanmadığınız zamanlarda kiraya vererek ek gelir elde edin. Tüm
            süreçleri biz yönetelim, siz kazancınıza odaklanın.
          </p>
          <div class="grid grid-cols-1 min-[360px]:grid-cols-3 justify-center gap-5 sm:gap-8 text-slate-300 text-sm sm:text-base">
            <div class="flex flex-col items-center">
              <mat-icon
                class="text-blue-500 mb-2"
                style="transform: scale(1.5);"
                >security</mat-icon
              >
              <span>Güvenli İşlem</span>
            </div>
            <div class="flex flex-col items-center">
              <mat-icon
                class="text-blue-500 mb-2"
                style="transform: scale(1.5);"
                >support_agent</mat-icon
              >
              <span>7/24 Destek</span>
            </div>
            <div class="flex flex-col items-center">
              <mat-icon
                class="text-blue-500 mb-2"
                style="transform: scale(1.5);"
                >payments</mat-icon
              >
              <span>Değerinde Fiyat</span>
            </div>
          </div>
        </div>
      </div>

      <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div class="p-4 sm:p-8">
            <h2 class="text-2xl font-bold text-slate-900 mb-6">
              Başvuru Formu
            </h2>

            @if (submitSuccess()) {
              <div
                class="bg-emerald-50 text-emerald-800 p-6 rounded-xl text-center"
              >
                <mat-icon
                  class="text-emerald-500 mb-4"
                  style="transform: scale(2);"
                  >check_circle</mat-icon
                >
                <h3 class="text-xl font-bold mb-2">Başvurunuz Alındı!</h3>
                <p>
                  Aracınızı filomuza katmak için yaptığınız başvuru başarıyla
                  bize ulaştı. Ekibimiz en kısa sürede sizinle iletişime
                  geçecektir.
                </p>
                <button
                  (click)="resetForm()"
                  class="mt-6 px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  Yeni Başvuru Yap
                </button>
              </div>
            } @else {
              <form
                [formGroup]="partnerForm"
                (ngSubmit)="onSubmit()"
                class="space-y-6"
              >
                <!-- İşlem Tipi -->
                <div class="space-y-4">
                  <h3
                    class="text-lg font-semibold text-slate-800 border-b pb-2"
                  >
                    İşlem Tipi
                  </h3>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <label class="flex-1 relative cursor-pointer">
                      <input
                        type="radio"
                        formControlName="intent"
                        value="sell"
                        class="peer sr-only"
                      />
                      <div
                        class="min-h-28 p-4 border-2 border-slate-200 rounded-xl text-center hover:bg-slate-50 peer-checked:border-blue-500 peer-checked:bg-blue-50 transition-all flex flex-col items-center justify-center"
                      >
                        <mat-icon
                          class="text-slate-400 peer-checked:text-blue-500 mb-2"
                          style="transform: scale(1.5);"
                          >sell</mat-icon
                        >
                        <div
                          class="font-bold text-slate-700 peer-checked:text-blue-700"
                        >
                          Aracımı Satmak İstiyorum
                        </div>
                      </div>
                    </label>
                    <label class="flex-1 relative cursor-pointer">
                      <input
                        type="radio"
                        formControlName="intent"
                        value="rent"
                        class="peer sr-only"
                      />
                      <div
                        class="min-h-28 p-4 border-2 border-slate-200 rounded-xl text-center hover:bg-slate-50 peer-checked:border-blue-500 peer-checked:bg-blue-50 transition-all flex flex-col items-center justify-center"
                      >
                        <mat-icon
                          class="text-slate-400 peer-checked:text-blue-500 mb-2"
                          style="transform: scale(1.5);"
                          >car_rental</mat-icon
                        >
                        <div
                          class="font-bold text-slate-700 peer-checked:text-blue-700"
                        >
                          Aracımı Kiraya Vermek İstiyorum
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                <!-- Kişisel Bilgiler -->
                <div class="space-y-4">
                  <h3
                    class="text-lg font-semibold text-slate-800 border-b pb-2"
                  >
                    Kişisel Bilgiler
                  </h3>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label
                        class="block text-sm font-medium text-slate-700 mb-1"
                        >Ad Soyad *</label
                      >
                      <input
                        type="text"
                        autocomplete="name"
                        aria-label="Ad Soyad"
                        formControlName="name"
                        class="w-full min-h-12 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        placeholder="Adınız Soyadınız"
                      />
                    </div>
                    <div>
                      <label
                        class="block text-sm font-medium text-slate-700 mb-1"
                        >Telefon *</label
                      >
                      <input
                        type="tel"
                        inputmode="tel"
                        autocomplete="tel"
                        aria-label="Telefon"
                        formControlName="phone"
                        class="w-full min-h-12 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        placeholder="05XX XXX XX XX"
                      />
                    </div>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-slate-700 mb-1"
                      >E-posta</label
                    >
                    <input
                      type="email"
                      inputmode="email"
                      autocomplete="email"
                      autocapitalize="none"
                      aria-label="E-posta"
                      formControlName="email"
                      class="w-full min-h-12 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="ornek@email.com"
                    />
                  </div>
                </div>

                <!-- Araç Bilgileri -->
                <div class="space-y-4 pt-4">
                  <h3
                    class="text-lg font-semibold text-slate-800 border-b pb-2"
                  >
                    Araç Bilgileri
                  </h3>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label
                        class="block text-sm font-medium text-slate-700 mb-1"
                        >Marka *</label
                      >
                      <input
                        type="text"
                        autocomplete="off"
                        aria-label="Araç markası"
                        formControlName="carBrand"
                        class="w-full min-h-12 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        placeholder="Örn: Renault"
                      />
                    </div>
                    <div>
                      <label
                        class="block text-sm font-medium text-slate-700 mb-1"
                        >Model *</label
                      >
                      <input
                        type="text"
                        autocomplete="off"
                        aria-label="Araç modeli"
                        formControlName="carModel"
                        class="w-full min-h-12 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        placeholder="Örn: Megane"
                      />
                    </div>
                    <div>
                      <label
                        class="block text-sm font-medium text-slate-700 mb-1"
                        >Yıl *</label
                      >
                      <input
                        type="number"
                        inputmode="numeric"
                        aria-label="Araç yılı"
                        formControlName="carYear"
                        class="w-full min-h-12 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        placeholder="Örn: 2022"
                      />
                    </div>
                    <div>
                      <label
                        class="block text-sm font-medium text-slate-700 mb-1"
                        >Kilometre *</label
                      >
                      <input
                        type="number"
                        inputmode="numeric"
                        min="0"
                        aria-label="Araç kilometresi"
                        formControlName="carMileage"
                        class="w-full min-h-12 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        placeholder="Örn: 45000"
                      />
                    </div>
                  </div>

                  <!-- With Driver Option -->
                  <div
                    class="bg-slate-50 p-4 rounded-xl border border-slate-200"
                  >
                    <label class="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        formControlName="withDriver"
                        class="w-5 h-5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                      />
                      <div class="flex flex-col">
                        <span class="font-bold text-slate-900"
                          >Şoförlü Hizmet Verebilir mi?</span
                        >
                        <span class="text-xs text-slate-500"
                          >Aracınızla birlikte şoförlük hizmeti de sunmak
                          istiyorsanız işaretleyin.</span
                        >
                      </div>
                    </label>
                  </div>

                  <!-- File Upload Section -->
                  <div class="space-y-2">
                    <label class="block text-sm font-medium text-slate-700"
                      >Araç Fotoğrafları, Video veya Belgeler</label
                    >
                    <div
                      class="border-2 border-dashed border-slate-300 rounded-xl p-6 sm:p-8 text-center hover:border-blue-500 transition-colors cursor-pointer bg-slate-50 relative group focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                      role="button"
                      tabindex="0"
                      aria-label="Araçla ilgili dosya listesini seç"
                      (click)="fileInput.click()"
                      (keydown.enter)="fileInput.click()"
                      (keydown.space)="$event.preventDefault(); fileInput.click()"
                    >
                      <input
                        #fileInput
                        type="file"
                        (change)="onFileSelected($event)"
                        multiple
                        class="hidden"
                        accept="image/*,video/*,.pdf,.doc,.docx"
                      />
                      <mat-icon
                        class="text-slate-400 group-hover:text-blue-500 mb-2"
                        style="transform: scale(2);"
                        >cloud_upload</mat-icon
                      >
                      <p class="text-slate-600 font-medium">
                        Dosyaları seçmek için dokunun veya tıklayın
                      </p>
                      <p class="text-xs text-slate-400 mt-1">
                        En fazla 10 dosya, dosya başına 50 MB. Dosya adları başvuruya eklenir; medya içeriği ekibimiz tarafından güvenli kanaldan ayrıca istenir.
                      </p>
                    </div>

                    @if (selectedFiles().length > 0) {
                      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                        @for (file of selectedFiles(); track $index) {
                          <div
                            class="relative bg-white border border-slate-200 rounded-lg p-2 flex items-center gap-2 group"
                          >
                            <mat-icon class="text-slate-400 text-sm">{{
                              getFileIcon(file.type)
                            }}</mat-icon>
                            <span
                              class="text-xs text-slate-600 truncate flex-1"
                              >{{ file.name }}</span
                            >
                            <button
                              type="button"
                              (click)="
                                removeFile($index); $event.stopPropagation()
                              "
                              class="w-11 h-11 shrink-0 text-rose-500 hover:bg-rose-50 rounded-full flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                              [attr.aria-label]="file.name + ' dosyasını listeden çıkar'"
                            >
                              <mat-icon class="text-sm">close</mat-icon>
                            </button>
                          </div>
                        }
                      </div>
                    }
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-slate-700 mb-1"
                      >Ek Notlar</label
                    >
                    <textarea
                      formControlName="notes"
                      rows="4"
                      aria-label="Ek notlar"
                      class="w-full min-h-12 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="Aracınız hakkında eklemek istedikleriniz..."
                    ></textarea>
                  </div>
                </div>

                <!-- Legal Checkboxes -->
                <div class="space-y-3 pt-4 border-t border-slate-200">
                  <label class="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      formControlName="acceptTerms"
                      class="mt-0.5 w-5 h-5 shrink-0 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                    />
                    <span class="text-sm text-slate-600">
                      <a
                        routerLink="/legal"
                        [queryParams]="{ type: 'terms' }"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-blue-500 hover:text-blue-400 font-bold ml-1 hover:underline"
                        >Kullanım Şartları</a
                      >'nı okudum ve kabul ediyorum. *
                    </span>
                  </label>
                  <label class="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      formControlName="acceptKvkk"
                      class="mt-0.5 w-5 h-5 shrink-0 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                    />
                    <span class="text-sm text-slate-600">
                      <a
                        routerLink="/legal"
                        [queryParams]="{ type: 'kvkk' }"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-blue-500 hover:text-blue-400 font-bold ml-1 hover:underline"
                        >KVKK Aydınlatma Metni</a
                      >'ni okudum ve kişisel verilerimin işlenmesini
                      onaylıyorum. *
                    </span>
                  </label>
                </div>

                <div class="pt-6">
                  @if (hasFormErrors()) {
                    <div role="alert" aria-live="assertive" class="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-800">
                      Lütfen zorunlu alanları kontrol edin, geçerli iletişim ve araç bilgilerini girin ve yasal onay kutularını işaretleyin.
                    </div>
                  }
                  <button
                    type="submit"
                    [disabled]="isSubmitting()"
                    class="w-full min-h-14 flex justify-center items-center gap-2 px-6 sm:px-8 py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                  >
                    @if (isSubmitting()) {
                      <mat-icon class="animate-spin">refresh</mat-icon>
                      Gönderiliyor...
                    } @else {
                      <mat-icon>send</mat-icon>
                      Başvuruyu Gönder
                    }
                  </button>
                </div>
              </form>
            }
          </div>
        </div>
      </div>
    </div>
  `,
})
export class ListYourCarComponent {
  private fb = inject(FormBuilder);
  private carService = inject(CarService);
  private toastService = inject(ToastService);
  private router = inject(Router);
  private location = inject(Location);

  isSubmitting = signal(false);
  submitSuccess = signal(false);
  hasFormErrors = signal(false);
  selectedFiles = signal<File[]>([]);

  goBack() {
    if (window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate(["/"]);
    }
  }

  partnerForm = this.fb.group({
    intent: ["rent", Validators.required],
    name: ["", [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    phone: ["", [Validators.required, Validators.pattern(/^[+0-9()\s-]{7,24}$/)]],
    email: ["", Validators.email],
    carBrand: ["", Validators.required],
    carModel: ["", Validators.required],
    carYear: [
      "",
      [
        Validators.required,
        Validators.min(2000),
        Validators.max(new Date().getFullYear() + 1),
      ],
    ],
    carMileage: ["", [Validators.required, Validators.min(0), Validators.max(3000000)]],
    withDriver: [false],
    notes: [""],
    acceptTerms: [false, Validators.requiredTrue],
    acceptKvkk: [false, Validators.requiredTrue],
  });

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const incoming = Array.from(input.files || []);
    const maxBytes = 50 * 1024 * 1024;
    const current = this.selectedFiles();
    const availableSlots = Math.max(0, 10 - current.length);
    const withinSize = incoming.filter((file) => file.size <= maxBytes);
    const accepted = withinSize.slice(0, availableSlots);
    const oversizedCount = incoming.length - withinSize.length;
    const overflowCount = withinSize.length - accepted.length;

    this.selectedFiles.set([...current, ...accepted]);
    input.value = "";

    if (oversizedCount > 0) {
      this.toastService.show(
        `${oversizedCount} dosya 50 MB sınırını aştığı için eklenmedi.`,
        "error",
      );
    }
    if (overflowCount > 0) {
      this.toastService.show("En fazla 10 dosya seçebilirsiniz.", "error");
    }
  }

  removeFile(index: number) {
    this.selectedFiles.update((current) =>
      current.filter((_, i) => i !== index),
    );
  }

  getFileIcon(type: string): string {
    if (type.includes("image")) return "image";
    if (type.includes("video")) return "videocam";
    if (type.includes("pdf")) return "picture_as_pdf";
    return "insert_drive_file";
  }

  async onSubmit() {
    this.hasFormErrors.set(!this.partnerForm.valid);
    if (this.partnerForm.valid) {
      this.isSubmitting.set(true);
      try {
        const formValue = this.partnerForm.value;
        const requestData = {
          name: formValue.name,
          phone: formValue.phone,
          email: formValue.email,
          carBrand: `${formValue.carBrand} ${formValue.carModel}`,
          modelYear: Number(formValue.carYear),
          km: Number(formValue.carMileage),
          description: `${formValue.notes || ""} | Şoförlü: ${formValue.withDriver ? "Evet" : "Hayır"} | Seçilen Dosya Listesi: ${this.selectedFiles().map((file) => file.name).join(", ") || "Yok"}`,
        };

        await this.carService.submitPartnerRequest(requestData as any);
        this.submitSuccess.set(true);
        this.hasFormErrors.set(false);
        this.selectedFiles.set([]);
      } catch (error) {
        console.error("Error submitting partner request:", error);
        this.toastService.show(
          "Başvuru gönderilirken bir hata oluştu. Lütfen daha sonra tekrar deneyin veya bizimle iletişime geçin.",
          "error",
        );
      } finally {
        this.isSubmitting.set(false);
      }
    } else {
      // Mark all as touched to show validation errors
      Object.keys(this.partnerForm.controls).forEach((key) => {
        const control = this.partnerForm.get(key);
        control?.markAsTouched();
      });
    }
  }

  resetForm() {
    this.hasFormErrors.set(false);
    this.partnerForm.reset({
      withDriver: false,
      acceptTerms: false,
      acceptKvkk: false,
    });
    this.selectedFiles.set([]);
    this.submitSuccess.set(false);
  }
}
