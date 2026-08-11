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
    <div class="min-h-screen bg-slate-950 text-slate-300 font-sans pb-20">
      <!-- Sticky Module Header -->
      <div
        class="bg-slate-900 border-b border-slate-800 sticky top-0 z-50 shadow-lg"
      >
        <div class="max-w-7xl mx-auto px-4">
          <div class="h-16 flex items-center gap-3">
            <button
              (click)="goBack()"
              class="p-2 -ml-2 hover:bg-slate-800 hover:text-white rounded-full transition-colors text-slate-400 shrink-0"
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
      <div class="bg-slate-900 text-white py-16 mb-12">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 class="text-4xl md:text-5xl font-bold mb-6">
            Aracınızı Satın veya Kiraya Verin
          </h1>
          <p class="text-xl text-slate-300 max-w-3xl mx-auto mb-8">
            Aracınızı Alperler güvencesiyle en iyi fiyata satın veya
            kullanmadığınız zamanlarda kiraya vererek ek gelir elde edin. Tüm
            süreçleri biz yönetelim, siz kazancınıza odaklanın.
          </p>
          <div class="flex justify-center gap-8 text-slate-300">
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
          <div class="p-8">
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
                  <div class="flex gap-4">
                    <label class="flex-1 relative cursor-pointer">
                      <input
                        type="radio"
                        formControlName="intent"
                        value="sell"
                        class="peer sr-only"
                      />
                      <div
                        class="p-4 border-2 border-slate-200 rounded-xl text-center hover:bg-slate-50 peer-checked:border-blue-500 peer-checked:bg-blue-50 transition-all"
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
                        class="p-4 border-2 border-slate-200 rounded-xl text-center hover:bg-slate-50 peer-checked:border-blue-500 peer-checked:bg-blue-50 transition-all"
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
                        formControlName="name"
                        class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                        formControlName="phone"
                        class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                      formControlName="email"
                      class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                        formControlName="carBrand"
                        class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                        formControlName="carModel"
                        class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                        formControlName="carYear"
                        class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                        formControlName="carMileage"
                        class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                      class="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-500 transition-colors cursor-pointer bg-slate-50 relative group"
                      (click)="fileInput.click()"
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
                        Dosyaları buraya bırakın veya tıklayın
                      </p>
                      <p class="text-xs text-slate-400 mt-1">
                        Görsel, Video veya PDF (Maks. 50MB)
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
                              class="text-rose-500 hover:bg-rose-50 rounded-full p-1"
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
                      rows="3"
                      class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                      class="mt-1 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                    />
                    <span class="text-sm text-slate-600">
                      <a
                        routerLink="/legal"
                        [queryParams]="{ type: 'terms' }"
                        target="_blank"
                        class="text-blue-500 hover:text-blue-400 font-bold ml-1 hover:underline"
                        >Kullanım Şartları</a
                      >'nı okudum ve kabul ediyorum. *
                    </span>
                  </label>
                  <label class="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      formControlName="acceptKvkk"
                      class="mt-1 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                    />
                    <span class="text-sm text-slate-600">
                      <a
                        routerLink="/legal"
                        [queryParams]="{ type: 'kvkk' }"
                        target="_blank"
                        class="text-blue-500 hover:text-blue-400 font-bold ml-1 hover:underline"
                        >KVKK Aydınlatma Metni</a
                      >'ni okudum ve kişisel verilerimin işlenmesini
                      onaylıyorum. *
                    </span>
                  </label>
                </div>

                <div class="pt-6">
                  <button
                    type="submit"
                    [disabled]="!partnerForm.valid || isSubmitting()"
                    class="w-full flex justify-center items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
    name: ["", Validators.required],
    phone: ["", Validators.required],
    email: [""],
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
    carMileage: ["", Validators.required],
    withDriver: [false],
    notes: [""],
    acceptTerms: [false, Validators.requiredTrue],
    acceptKvkk: [false, Validators.requiredTrue],
  });

  onFileSelected(event: any) {
    const files = event.target.files;
    if (files) {
      this.selectedFiles.update((current) => [
        ...current,
        ...(Array.from(files) as File[]),
      ]);
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
          description: `${formValue.notes || ""} | Şoförlü: ${formValue.withDriver ? "Evet" : "Hayır"} | Dosya Sayısı: ${this.selectedFiles().length}`,
        };

        await this.carService.submitPartnerRequest(requestData as any);
        this.submitSuccess.set(true);
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
    this.partnerForm.reset({
      withDriver: false,
      acceptTerms: false,
      acceptKvkk: false,
    });
    this.selectedFiles.set([]);
    this.submitSuccess.set(false);
  }
}
