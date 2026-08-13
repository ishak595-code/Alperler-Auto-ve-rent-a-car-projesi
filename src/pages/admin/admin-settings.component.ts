import { Component, inject, signal, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { CarService, FaqItem } from "../../services/car.service";
import { AuthService } from "../../services/auth.service";
import { ToastService } from "../../services/toast.service";
import { ConfirmService } from "../../services/confirm.service";
import { SiteConfig, TeamMember } from "../../models/site-config.model";

@Component({
  selector: "app-admin-settings",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div
      class="px-4 py-6 md:px-8 bg-white border-b border-slate-200 shadow-sm sticky top-0 z-20 flex items-center justify-between"
    >
      <div class="flex items-center gap-4">
        <button
          (click)="goBack()"
          aria-label="Kontrol Paneline Dön"
          class="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
        >
          <svg
            class="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
        </button>
        <h1 class="text-2xl font-bold text-slate-900 tracking-tight">
          Web Site Ayarları
        </h1>
      </div>
      <div class="hidden md:flex space-x-2">
        <span
          class="text-xs font-bold bg-blue-100 text-blue-800 px-3 py-1 rounded-full flex items-center"
          ><span
            class="w-2 h-2 rounded-full bg-blue-500 mr-2 animate-pulse"
          ></span>
          Sistem Aktif</span
        >
      </div>
    </div>

    <div class="w-full bg-white min-h-[calc(100vh-10rem)] p-4 md:p-8">
      <div
        class="flex space-x-4 border-b border-slate-200 mb-6 overflow-x-auto"
      >
        <button
          type="button"
          (click)="switchTab('general')"
          [class.border-blue-500]="activeTab() === 'general'"
          [class.text-blue-600]="activeTab() === 'general'"
          class="pb-2 px-4 font-bold text-slate-500 hover:text-slate-800 border-b-2 border-transparent transition-colors whitespace-nowrap"
        >
          Genel Bilgiler & İletişim
        </button>
        <button
          type="button"
          (click)="switchTab('home')"
          [class.border-blue-500]="activeTab() === 'home'"
          [class.text-blue-600]="activeTab() === 'home'"
          class="pb-2 px-4 font-bold text-slate-500 hover:text-slate-800 border-b-2 border-transparent transition-colors whitespace-nowrap"
        >
          Ana Sayfa Yapısı
        </button>
        <button
          type="button"
          (click)="switchTab('team')"
          [class.border-blue-500]="activeTab() === 'team'"
          [class.text-blue-600]="activeTab() === 'team'"
          class="pb-2 px-4 font-bold text-slate-500 hover:text-slate-800 border-b-2 border-transparent transition-colors whitespace-nowrap"
        >
          Hakkımızda & Ekip
        </button>
        <button
          type="button"
          (click)="switchTab('legal')"
          [class.border-blue-500]="activeTab() === 'legal'"
          [class.text-blue-600]="activeTab() === 'legal'"
          class="pb-2 px-4 font-bold text-slate-500 hover:text-slate-800 border-b-2 border-transparent transition-colors whitespace-nowrap"
        >
          Yasal Sayfalar
        </button>
        <button
          type="button"
          (click)="switchTab('faq')"
          [class.border-blue-500]="activeTab() === 'faq'"
          [class.text-blue-600]="activeTab() === 'faq'"
          class="pb-2 px-4 font-bold text-slate-500 hover:text-slate-800 border-b-2 border-transparent transition-colors whitespace-nowrap"
        >
          Sık Sorulan Sorular (SSS)
        </button>
        <button
          type="button"
          (click)="switchTab('seo')"
          [class.border-blue-500]="activeTab() === 'seo'"
          [class.text-blue-600]="activeTab() === 'seo'"
          class="pb-2 px-4 font-bold text-slate-500 hover:text-slate-800 border-b-2 border-transparent transition-colors whitespace-nowrap"
        >
          SEO & Uygulama
        </button>
        <button
          type="button"
          (click)="switchTab('integrations')"
          [class.border-blue-500]="activeTab() === 'integrations'"
          [class.text-blue-600]="activeTab() === 'integrations'"
          class="pb-2 px-4 font-bold text-slate-500 hover:text-slate-800 border-b-2 border-transparent transition-colors whitespace-nowrap"
        >
          Google & Reklam
        </button>
        <button
          type="button"
          (click)="switchTab('account')"
          [class.border-blue-500]="activeTab() === 'account'"
          [class.text-blue-600]="activeTab() === 'account'"
          class="pb-2 px-4 font-bold text-slate-500 hover:text-slate-800 border-b-2 border-transparent transition-colors whitespace-nowrap"
        >
          Admin Hesapları
        </button>
      </div>

      <form (submit)="saveConfig($event)" class="space-y-8">
        <!-- GENERAL TAB -->
        @if (activeTab() === "general") {
          <!-- Contact Info -->
          <div class="space-y-4">
            <h3 class="font-bold text-lg border-b pb-2 text-slate-700">
              Şirket Bilgileri & Logo
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                class="md:col-span-2 flex items-center gap-6 bg-slate-50 p-4 rounded border"
              >
                <div
                  class="w-32 h-32 bg-white border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center overflow-hidden relative"
                >
                  @if (formConfig.logoUrl) {
                    <img
                      [src]="formConfig.logoUrl"
                      class="w-full h-full object-contain p-2"
                    />
                  } @else {
                    <div class="text-center text-slate-400">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke-width="1.5"
                        stroke="currentColor"
                        class="w-8 h-8 mx-auto mb-1"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                        />
                      </svg>
                      <span class="text-xs font-bold">Logo Yok</span>
                    </div>
                  }
                </div>
                <div class="flex-1">
                  <label
                    class="block text-xs font-bold text-slate-500 uppercase mb-1"
                    >Logo URL (veya Dosya Seçin)</label
                  >
                  <div class="flex gap-2">
                    <input
                      [(ngModel)]="formConfig.logoUrl"
                      name="logoUrl"
                      class="w-full p-3 bg-white border rounded text-sm text-slate-600"
                      placeholder="https://..."
                    />

                    <label
                      class="flex items-center justify-center cursor-pointer text-slate-600 bg-slate-100 border border-slate-200 hover:bg-blue-50 hover:text-blue-600 px-4 py-2 rounded text-xs font-bold transition-colors whitespace-nowrap"
                    >
                      Dosya Yükle
                      <input
                        type="file"
                        (change)="onLogoSelected($event)"
                        accept="image/*"
                        class="hidden"
                      />
                    </label>
                  </div>

                  <div class="grid grid-cols-2 gap-4 mt-3">
                    <div>
                      <label
                        class="block text-[10px] uppercase font-bold text-slate-400 mb-1"
                        >Masaüstü Logo Genişliği (px)</label
                      >
                      <input
                        [(ngModel)]="formConfig.logoWidthDesktop"
                        name="logoWidthDesktop"
                        type="number"
                        class="w-full p-2 bg-white border rounded text-sm font-mono"
                        placeholder="Örn: 200"
                      />
                    </div>
                    <div>
                      <label
                        class="block text-[10px] uppercase font-bold text-slate-400 mb-1"
                        >Mobil Logo Genişliği (px)</label
                      >
                      <input
                        [(ngModel)]="formConfig.logoWidthMobile"
                        name="logoWidthMobile"
                        type="number"
                        class="w-full p-2 bg-white border rounded text-sm font-mono"
                        placeholder="Örn: 150"
                      />
                    </div>
                  </div>
                  <p class="text-xs text-slate-500 mt-2">
                    Şeffaf arka planlı PNG tercih edin. Ekranlardaki boyutunu
                    optimize etmek için px değerleri girebilirsiniz.
                  </p>
                </div>
              </div>
              <div>
                <label
                  class="block text-xs font-bold text-slate-500 uppercase mb-1"
                  >Şirket Adı</label
                >
                <input
                  [(ngModel)]="formConfig.companyName"
                  name="companyName"
                  class="w-full p-3 bg-slate-50 border rounded font-bold"
                />
              </div>
              <div>
                <label
                  class="block text-xs font-bold text-slate-500 uppercase mb-1"
                  >Slogan / Logo Altı Metin</label
                >
                <input
                  [(ngModel)]="formConfig.tagline"
                  name="tagline"
                  class="w-full p-3 bg-slate-50 border rounded"
                  placeholder="Premium Araç Kiralama"
                />
              </div>
              <div>
                <label
                  class="block text-xs font-bold text-slate-500 uppercase mb-1"
                  >Telefon</label
                >
                <input
                  [(ngModel)]="formConfig.phone"
                  name="phone"
                  class="w-full p-3 bg-slate-50 border rounded font-bold"
                />
              </div>
              <div>
                <label
                  class="block text-xs font-bold text-slate-500 uppercase mb-1"
                  >E-Posta</label
                >
                <input
                  [(ngModel)]="formConfig.email"
                  name="email"
                  class="w-full p-3 bg-slate-50 border rounded"
                />
              </div>
              <div>
                <label
                  class="block text-xs font-bold text-slate-500 uppercase mb-1"
                  >WhatsApp (Sadece Numara)</label
                >
                <input
                  [(ngModel)]="formConfig.whatsapp"
                  name="whatsapp"
                  class="w-full p-3 bg-slate-50 border rounded"
                />
              </div>
              <div class="md:col-span-1">
                <label
                  class="block text-xs font-bold text-slate-500 uppercase mb-1"
                  >WhatsApp Karşılama Mesajı</label
                >
                <input
                  [(ngModel)]="formConfig.whatsappMessage"
                  name="whatsappMessage"
                  placeholder="Merhaba, detaylı bilgi almak istiyorum."
                  class="w-full p-3 bg-slate-50 border rounded"
                />
              </div>
              <div class="md:col-span-2">
                <label
                  class="block text-xs font-bold text-slate-500 uppercase mb-1"
                  >Adres</label
                >
                <input
                  [(ngModel)]="formConfig.address"
                  name="address"
                  class="w-full p-3 bg-slate-50 border rounded"
                />
              </div>
            </div>
          </div>

          <!-- Social Media -->
          <div class="space-y-4">
            <h3 class="font-bold text-lg border-b pb-2 text-slate-700">
              Sosyal Medya Linkleri
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  class="block text-xs font-bold text-slate-500 uppercase mb-1"
                  >Instagram URL</label
                >
                <input
                  [(ngModel)]="formConfig.instagramUrl"
                  name="instagram"
                  class="w-full p-3 bg-slate-50 border rounded"
                />
              </div>
              <div>
                <label
                  class="block text-xs font-bold text-slate-500 uppercase mb-1"
                  >Twitter (X) URL</label
                >
                <input
                  [(ngModel)]="formConfig.twitterUrl"
                  name="twitter"
                  class="w-full p-3 bg-slate-50 border rounded"
                />
              </div>
              <div>
                <label
                  class="block text-xs font-bold text-slate-500 uppercase mb-1"
                  >YouTube URL</label
                >
                <input
                  [(ngModel)]="formConfig.youtubeUrl"
                  name="youtube"
                  class="w-full p-3 bg-slate-50 border rounded"
                />
              </div>
              <div>
                <label
                  class="block text-xs font-bold text-slate-500 uppercase mb-1"
                  >TikTok URL</label
                >
                <input
                  [(ngModel)]="formConfig.tiktokUrl"
                  name="tiktok"
                  class="w-full p-3 bg-slate-50 border rounded"
                />
              </div>
            </div>
          </div>

          <div class="pt-4 border-slate-200 mt-6">
            <h4 class="font-bold text-sm text-slate-700 mb-2">İstatistikler</h4>
            <button
              type="button"
              (click)="resetStats()"
              class="bg-red-100 text-red-600 hover:bg-red-200 px-4 py-2 rounded font-bold text-sm transition-colors"
            >
              Ziyaretçi Sayacını Sıfırla
            </button>
          </div>

          <!-- Theme Selection -->
          <div class="space-y-4 mt-6">
            <h3 class="font-bold text-lg border-b pb-2 text-slate-700">
              Tema Seçimi
            </h3>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button
                type="button"
                (click)="setTheme('light')"
                [class.ring-2]="formConfig.theme === 'light'"
                class="p-4 border rounded bg-white hover:bg-slate-50 text-slate-900 font-bold ring-blue-500 transition-all"
              >
                Açık Tema
              </button>
              <button
                type="button"
                (click)="setTheme('dark')"
                [class.ring-2]="formConfig.theme === 'dark'"
                class="p-4 border rounded bg-slate-900 hover:bg-slate-800 text-white font-bold ring-blue-500 transition-all"
              >
                Koyu Tema
              </button>
              <button
                type="button"
                (click)="setTheme('luxury')"
                [class.ring-2]="formConfig.theme === 'luxury'"
                class="p-4 border rounded bg-stone-900 hover:bg-stone-800 text-blue-500 font-bold ring-blue-500 transition-all"
              >
                Luxury
              </button>
              <button
                type="button"
                (click)="setTheme('corporate')"
                [class.ring-2]="formConfig.theme === 'corporate'"
                class="p-4 border rounded bg-blue-900 hover:bg-blue-800 text-white font-bold ring-blue-500 transition-all"
              >
                Kurumsal
              </button>
            </div>
          </div>
        }

        <!-- HOME CONTENT TAB -->
        @if (activeTab() === "home") {
          <div class="space-y-6">
            <div
              class="bg-blue-50 border border-blue-200 text-blue-800 rounded-xl p-4 text-sm font-medium flex items-start"
            >
              <mat-icon class="mr-2 text-blue-500">info</mat-icon>
              <div>
                Aşağıdaki ayarlar, ana sayfanızdaki bölümlerin gerçek sırasıyla birebir aynı listelenmiştir. Düzenlemelerinizi sayfadaki akışa göre adım adım yapabilirsiniz. Herhangi bir değişiklik anında ziyaretçilerinize yansıyacaktır.
              </div>
            </div>

            <!-- 1. Hero -->
            <h3 class="font-bold text-lg border-b pb-2 text-slate-700">
              1. Hero (Ana Karşılama) Bölümü
            </h3>
            <div
              class="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-6 rounded-xl border border-slate-200"
            >
              <div class="md:col-span-2">
                <label
                  class="block text-xs font-bold text-slate-500 uppercase mb-1"
                  >Ana Başlık</label
                >
                <input
                  *ngIf="formConfig.homeContent"
                  [(ngModel)]="formConfig.homeContent.heroTitle"
                  name="heroTitle"
                  class="w-full p-3 border rounded font-bold"
                />
              </div>
              <div class="md:col-span-2">
                <label
                  class="block text-xs font-bold text-slate-500 uppercase mb-1"
                  >Alt Başlık Açıklama</label
                >
                <textarea
                  *ngIf="formConfig.homeContent"
                  [(ngModel)]="formConfig.homeContent.heroSubtitle"
                  name="heroSub"
                  rows="3"
                  class="w-full p-3 border rounded"
                ></textarea>
              </div>
              <div class="md:col-span-1">
                <label
                  class="block text-xs font-bold text-slate-500 uppercase mb-1"
                  >Güven Etiketi Metni</label
                >
                <input
                  *ngIf="formConfig.homeContent"
                  [(ngModel)]="formConfig.homeContent.heroTrustLine"
                  name="heroTrust"
                  class="w-full p-3 border rounded"
                />
              </div>
              <div class="md:col-span-1">
                <label
                  class="block text-xs font-bold text-slate-500 uppercase mb-1"
                  >Arama Butonu (CTA) Alt Metni</label
                >
                <input
                  *ngIf="formConfig.homeContent"
                  [(ngModel)]="formConfig.homeContent.heroCtaSubtext"
                  name="heroCtaSubtext"
                  class="w-full p-3 border rounded"
                />
              </div>
              <div class="md:col-span-2">
                <label
                  class="block text-xs font-bold text-slate-500 uppercase mb-1"
                  >Buton Metni (CTA)</label
                >
                <input
                  *ngIf="formConfig.homeContent"
                  [(ngModel)]="formConfig.homeContent.heroCta"
                  name="heroCta"
                  class="w-full p-3 border rounded font-bold"
                />
              </div>
            </div>

            <!-- 2. Quick Actions -->
            <h3 class="font-bold text-lg border-b pb-2 text-slate-700 mt-6">
              2. Hızlı İşlemler Açılır Menüsü
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-6 rounded-xl border border-slate-200">
               <div class="md:col-span-2">
                 <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Açılır Menü Buton Metni</label>
                 <input
                  *ngIf="formConfig.homeContent"
                  [(ngModel)]="formConfig.homeContent.quickActionLabel"
                  name="quickActionLabel"
                  class="w-full p-3 border rounded text-sm font-bold"
                  placeholder="Örn: Hızlı İşlemler"
                />
               </div>

               <div class="md:col-span-1 space-y-2 border border-slate-200 p-4 rounded-lg bg-white shadow-sm">
                 <h4 class="font-bold text-sm text-blue-600 mb-2 border-b pb-1">1. Araç Kiralama Seçeneği</h4>
                 <div>
                   <label class="block text-[10px] text-slate-500 font-bold uppercase">Başlık</label>
                   <input
                    *ngIf="formConfig.homeContent"
                    [(ngModel)]="formConfig.homeContent.quickActionRentTitle"
                    name="qaRentTitle"
                    class="w-full p-2 border rounded text-sm font-bold bg-slate-50"
                    placeholder="Araç Kiralama"
                   />
                 </div>
                 <div>
                   <label class="block text-[10px] text-slate-500 font-bold uppercase">Açıklama</label>
                   <input
                    *ngIf="formConfig.homeContent"
                    [(ngModel)]="formConfig.homeContent.quickActionRentDesc"
                    name="qaRentDesc"
                    class="w-full p-2 border rounded text-xs text-slate-600 bg-slate-50"
                    placeholder="Hemen araç kiralayın"
                   />
                 </div>
               </div>

               <div class="md:col-span-1 space-y-2 border border-slate-200 p-4 rounded-lg bg-white shadow-sm">
                 <h4 class="font-bold text-sm text-emerald-600 mb-2 border-b pb-1">2. Satılık Araçlar Seçeneği</h4>
                 <div>
                   <label class="block text-[10px] text-slate-500 font-bold uppercase">Başlık</label>
                   <input
                    *ngIf="formConfig.homeContent"
                    [(ngModel)]="formConfig.homeContent.quickActionSalesTitle"
                    name="qaSalesTitle"
                    class="w-full p-2 border rounded text-sm font-bold bg-slate-50"
                    placeholder="2. El Satılık Araçlar"
                   />
                 </div>
                 <div>
                   <label class="block text-[10px] text-slate-500 font-bold uppercase">Açıklama</label>
                   <input
                    *ngIf="formConfig.homeContent"
                    [(ngModel)]="formConfig.homeContent.quickActionSalesDesc"
                    name="qaSalesDesc"
                    class="w-full p-2 border rounded text-xs text-slate-600 bg-slate-50"
                    placeholder="Ekspertiz güvenceli filo"
                   />
                 </div>
               </div>

               <div class="md:col-span-1 space-y-2 border border-slate-200 p-4 rounded-lg bg-white shadow-sm">
                 <h4 class="font-bold text-sm text-purple-600 mb-2 border-b pb-1">3. Aracını Değerlendir Seçeneği</h4>
                 <div>
                   <label class="block text-[10px] text-slate-500 font-bold uppercase">Başlık</label>
                   <input
                    *ngIf="formConfig.homeContent"
                    [(ngModel)]="formConfig.homeContent.quickActionSellTitle"
                    name="qaSellTitle"
                    class="w-full p-2 border rounded text-sm font-bold bg-slate-50"
                    placeholder="Aracını Değerlendir"
                   />
                 </div>
                 <div>
                   <label class="block text-[10px] text-slate-500 font-bold uppercase">Açıklama</label>
                   <input
                    *ngIf="formConfig.homeContent"
                    [(ngModel)]="formConfig.homeContent.quickActionSellDesc"
                    name="qaSellDesc"
                    class="w-full p-2 border rounded text-xs text-slate-600 bg-slate-50"
                    placeholder="Havuz sistemine katılın"
                   />
                 </div>
               </div>

               <div class="md:col-span-1 space-y-2 border border-slate-200 p-4 rounded-lg bg-white shadow-sm">
                 <h4 class="font-bold text-sm text-amber-600 mb-2 border-b pb-1">4. Özel Turlar Seçeneği</h4>
                 <div>
                   <label class="block text-[10px] text-slate-500 font-bold uppercase">Başlık</label>
                   <input
                    *ngIf="formConfig.homeContent"
                    [(ngModel)]="formConfig.homeContent.quickActionToursTitle"
                    name="qaToursTitle"
                    class="w-full p-2 border rounded text-sm font-bold bg-slate-50"
                    placeholder="Özel Turlar"
                   />
                 </div>
                 <div>
                   <label class="block text-[10px] text-slate-500 font-bold uppercase">Açıklama</label>
                   <input
                    *ngIf="formConfig.homeContent"
                    [(ngModel)]="formConfig.homeContent.quickActionToursDesc"
                    name="qaToursDesc"
                    class="w-full p-2 border rounded text-xs text-slate-600 bg-slate-50"
                    placeholder="VIP şoförlü geziler"
                   />
                 </div>
               </div>
            </div>

            <!-- 3. Booking Form -->
            <h3 class="font-bold text-lg border-b pb-2 text-slate-700 mt-6">
              3. Araç Arama / Kiralama Formu
            </h3>
            <div
              class="bg-slate-50 p-6 rounded-xl border border-slate-200"
            >
              <div>
                <label
                  class="block text-xs font-bold text-slate-500 uppercase mb-1"
                  >Form Başlığı</label
                >
                <input
                  *ngIf="formConfig.homeContent"
                  [(ngModel)]="formConfig.homeContent.bookingTitle"
                  name="bookTitle"
                  class="w-full p-3 border rounded font-bold"
                />
              </div>
            </div>

            <!-- 4. Campaign Banner -->
            <h3 class="font-bold text-lg border-b pb-2 text-slate-700">
              4. Fırsat & Kampanya Afişi
            </h3>
            <div
              class="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-6 rounded-xl border border-slate-200"
            >
              <div class="md:col-span-2">
                <label
                  class="block text-xs font-bold text-slate-500 uppercase mb-1"
                  >Afiş Rozeti (Örn: Ayın Fırsatı)</label
                >
                <input
                  *ngIf="formConfig.homeContent"
                  [(ngModel)]="formConfig.homeContent.campaignBannerBadge"
                  name="campaignBannerBadge"
                  class="w-full p-3 border rounded text-amber-600 font-bold"
                />
              </div>
              <div class="md:col-span-2">
                <label
                  class="block text-xs font-bold text-slate-500 uppercase mb-1"
                  >Afiş Başlığı</label
                >
                <input
                  *ngIf="formConfig.homeContent"
                  [(ngModel)]="formConfig.homeContent.campaignBannerTitle"
                  name="campaignBannerTitle"
                  class="w-full p-3 border rounded font-bold"
                  placeholder="Örn: 7 Gün Kirala, Sadece 6 Gün Öde!"
                />
              </div>
              <div class="md:col-span-2">
                <label
                  class="block text-xs font-bold text-slate-500 uppercase mb-1"
                  >Alt Açıklama</label
                >
                <textarea
                  *ngIf="formConfig.homeContent"
                  [(ngModel)]="formConfig.homeContent.campaignBannerSubtitle"
                  name="campaignBannerSubtitle"
                  rows="2"
                  class="w-full p-3 border rounded"
                  placeholder="Seçili araçlarda 1 günlük kiralama bedeli bizden hediye..."
                ></textarea>
              </div>
              <div class="md:col-span-2">
                <label
                  class="block text-xs font-bold text-slate-500 uppercase mb-1"
                  >Buton Metni</label
                >
                <input
                  *ngIf="formConfig.homeContent"
                  [(ngModel)]="formConfig.homeContent.campaignBannerButtonText"
                  name="campaignBannerButtonText"
                  class="w-full p-3 border rounded"
                  placeholder="Kampanyalı Araçları Gör"
                />
              </div>
            </div>

            <!-- 5. Featured Rentals -->
            <h3 class="font-bold text-lg border-b pb-2 text-slate-700">
              5. Kiralık Araçlar - Öne Çıkanlar (Featured Rentals)
            </h3>
            <div
              class="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-6 rounded-xl border border-slate-200"
            >
              <div class="md:col-span-2">
                <label
                  class="block text-xs font-bold text-slate-500 uppercase mb-1"
                  >Üst Etiket (Badge)</label
                >
                <input
                  *ngIf="formConfig.homeContent"
                  [(ngModel)]="formConfig.homeContent.featuredBadge"
                  name="featBadge"
                  class="w-full p-3 border rounded"
                />
              </div>
              <div class="md:col-span-2">
                <label
                  class="block text-xs font-bold text-slate-500 uppercase mb-1"
                  >Başlık</label
                >
                <input
                  *ngIf="formConfig.homeContent"
                  [(ngModel)]="formConfig.homeContent.featuredTitle"
                  name="featTitle"
                  class="w-full p-3 border rounded font-bold"
                />
              </div>
              <div class="md:col-span-2">
                <label
                  class="block text-xs font-bold text-slate-500 uppercase mb-1"
                  >Alt Açıklama</label
                >
                <input
                  *ngIf="formConfig.homeContent"
                  [(ngModel)]="formConfig.homeContent.featuredSubtitle"
                  name="featSub"
                  class="w-full p-3 border rounded"
                />
              </div>
              <div class="md:col-span-2">
                <label
                  class="block text-xs font-bold text-slate-500 uppercase mb-1"
                  >Tümünü İncele Buton Metni</label
                >
                <input
                  *ngIf="formConfig.homeContent"
                  [(ngModel)]="formConfig.homeContent.featuredViewAll"
                  name="featViewAll"
                  class="w-full p-3 border rounded"
                />
              </div>
            </div>

            <!-- 6. Why Us -->
            <h3 class="font-bold text-lg border-b pb-2 text-slate-700">
              6. Neden Biz (Kusursuz Deneyim)
            </h3>
            <div
              class="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-6 rounded-xl border border-slate-200"
            >
              <div class="md:col-span-2">
                <label
                  class="block text-xs font-bold text-slate-500 uppercase mb-1"
                  >Ana Başlık</label
                >
                <input
                  *ngIf="formConfig.homeContent"
                  [(ngModel)]="formConfig.homeContent.whyUsTitle"
                  name="whyUsTitle"
                  class="w-full p-3 border rounded font-bold"
                />
              </div>
              <div class="md:col-span-2">
                <label
                  class="block text-xs font-bold text-slate-500 uppercase mb-1"
                  >Ana Alt Açıklama</label
                >
                <input
                  *ngIf="formConfig.homeContent"
                  [(ngModel)]="formConfig.homeContent.whyUsSubtitle"
                  name="whyUsSub"
                  class="w-full p-3 border rounded text-slate-600"
                />
              </div>
              <div class="md:col-span-2 mt-4 space-y-4">
                <div
                  class="bg-white p-4 rounded-lg border border-slate-200 shadow-sm"
                >
                  <label
                    class="block text-xs font-bold text-slate-500 uppercase mb-1"
                    >Güven Maddesi - Başlığı</label
                  >
                  <input
                    *ngIf="formConfig.homeContent"
                    [(ngModel)]="formConfig.homeContent.whyUsTrustTitle"
                    name="whyTrustT"
                    class="w-full p-2 border border-b-0 rounded-t font-bold"
                  />
                  <label
                    class="block text-xs font-bold text-slate-500 uppercase mb-1 mt-2"
                    >Güven Maddesi - Açıklaması</label
                  >
                  <textarea
                    *ngIf="formConfig.homeContent"
                    [(ngModel)]="formConfig.homeContent.whyUsTrustDesc"
                    name="whyTrustD"
                    rows="2"
                    class="w-full p-2 border rounded-b"
                  ></textarea>
                </div>
                <div
                  class="bg-white p-4 rounded-lg border border-slate-200 shadow-sm"
                >
                  <label
                    class="block text-xs font-bold text-slate-500 uppercase mb-1"
                    >Destek Maddesi - Başlığı</label
                  >
                  <input
                    *ngIf="formConfig.homeContent"
                    [(ngModel)]="formConfig.homeContent.whyUsSupportTitle"
                    name="whySupT"
                    class="w-full p-2 border border-b-0 rounded-t font-bold"
                  />
                  <label
                    class="block text-xs font-bold text-slate-500 uppercase mb-1 mt-2"
                    >Destek Maddesi - Açıklaması</label
                  >
                  <textarea
                    *ngIf="formConfig.homeContent"
                    [(ngModel)]="formConfig.homeContent.whyUsSupportDesc"
                    name="whySupD"
                    rows="2"
                    class="w-full p-2 border rounded-b"
                  ></textarea>
                </div>
                <div
                  class="bg-white p-4 rounded-lg border border-slate-200 shadow-sm"
                >
                  <label
                    class="block text-xs font-bold text-slate-500 uppercase mb-1"
                    >Konfor Maddesi - Başlığı</label
                  >
                  <input
                    *ngIf="formConfig.homeContent"
                    [(ngModel)]="formConfig.homeContent.whyUsComfortTitle"
                    name="whyComfT"
                    class="w-full p-2 border border-b-0 rounded-t font-bold"
                  />
                  <label
                    class="block text-xs font-bold text-slate-500 uppercase mb-1 mt-2"
                    >Konfor Maddesi - Açıklaması</label
                  >
                  <textarea
                    *ngIf="formConfig.homeContent"
                    [(ngModel)]="formConfig.homeContent.whyUsComfortDesc"
                    name="whyComfD"
                    rows="2"
                    class="w-full p-2 border rounded-b"
                  ></textarea>
                </div>
              </div>
            </div>

            <!-- 7. Partner / Fleet -->
            <h3 class="font-bold text-lg border-b pb-2 text-slate-700">
              7. Aracını Bizimle Çalıştır (Filo Yönetimi)
            </h3>
            <div
              class="grid grid-cols-1 gap-4 bg-slate-50 p-6 rounded-xl border border-slate-200"
            >
              <div>
                <label
                  class="block text-xs font-bold text-slate-500 uppercase mb-1"
                  >Ana Başlık</label
                >
                <input
                  *ngIf="formConfig.homeContent"
                  [(ngModel)]="formConfig.homeContent.partnerTitle"
                  name="pTitle"
                  class="w-full p-3 border rounded font-bold"
                />
              </div>
              <div>
                <label
                  class="block text-xs font-bold text-slate-500 uppercase mb-1"
                  >Açıklama</label
                >
                <textarea
                  *ngIf="formConfig.homeContent"
                  [(ngModel)]="formConfig.homeContent.partnerSubtitle"
                  name="pSub"
                  rows="3"
                  class="w-full p-3 border rounded"
                ></textarea>
              </div>
              <div>
                <label
                  class="block text-xs font-bold text-slate-500 uppercase mb-1"
                  >Şartlar Başlığı</label
                >
                <input
                  *ngIf="formConfig.homeContent"
                  [(ngModel)]="formConfig.homeContent.partnerReqTitle"
                  name="pReqTitle"
                  class="w-full p-3 border rounded"
                />
              </div>
              <div>
                <label
                  class="block text-xs font-bold text-slate-500 uppercase mb-1"
                  >Form Başlığı</label
                >
                <input
                  *ngIf="formConfig.homeContent"
                  [(ngModel)]="formConfig.homeContent.partnerFormTitle"
                  name="pFormTitle"
                  class="w-full p-3 border rounded"
                />
              </div>
            </div>

            <!-- 8. Sales -->
            <h3 class="font-bold text-lg border-b pb-2 text-slate-700">
              8. İkinci El Satış (Sales)
            </h3>
            <div
              class="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-6 rounded-xl border border-slate-200"
            >
              <div class="md:col-span-2">
                <label
                  class="block text-xs font-bold text-slate-500 uppercase mb-1"
                  >Üst Etiket (Badge)</label
                >
                <input
                  *ngIf="formConfig.homeContent"
                  [(ngModel)]="formConfig.homeContent.salesBadge"
                  name="salesBadge"
                  class="w-full p-3 border rounded"
                />
              </div>
              <div class="md:col-span-2">
                <label
                  class="block text-xs font-bold text-slate-500 uppercase mb-1"
                  >Başlık</label
                >
                <input
                  *ngIf="formConfig.homeContent"
                  [(ngModel)]="formConfig.homeContent.salesTitle"
                  name="salesTitle"
                  class="w-full p-3 border rounded font-bold"
                />
              </div>
              <div class="md:col-span-2">
                <label
                  class="block text-xs font-bold text-slate-500 uppercase mb-1"
                  >Alt Açıklama</label
                >
                <input
                  *ngIf="formConfig.homeContent"
                  [(ngModel)]="formConfig.homeContent.salesDescription"
                  name="salesSub"
                  class="w-full p-3 border rounded"
                />
              </div>
              <div class="md:col-span-2">
                <label
                  class="block text-xs font-bold text-slate-500 uppercase mb-1"
                  >Tümünü İncele Buton Metni</label
                >
                <input
                  *ngIf="formConfig.homeContent"
                  [(ngModel)]="formConfig.homeContent.salesViewAll"
                  name="salesViewAll"
                  class="w-full p-3 border rounded"
                />
              </div>
            </div>

            <!-- 9. Tours -->
            <h3 class="font-bold text-lg border-b pb-2 text-slate-700">
              9. Özel Turlar (Tours)
            </h3>
            <div
              class="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-6 rounded-xl border border-slate-200"
            >
              <div class="md:col-span-2">
                <label
                  class="block text-xs font-bold text-slate-500 uppercase mb-1"
                  >Başlık</label
                >
                <input
                  *ngIf="formConfig.homeContent"
                  [(ngModel)]="formConfig.homeContent.toursTitle"
                  name="toursTitle"
                  class="w-full p-3 border rounded font-bold"
                />
              </div>
              <div class="md:col-span-2">
                <label
                  class="block text-xs font-bold text-slate-500 uppercase mb-1"
                  >Alt Açıklama</label
                >
                <input
                  *ngIf="formConfig.homeContent"
                  [(ngModel)]="formConfig.homeContent.toursSubtitle"
                  name="toursSub"
                  class="w-full p-3 border rounded"
                />
              </div>
              <div class="md:col-span-1">
                <label
                  class="block text-xs font-bold text-slate-500 uppercase mb-1"
                  >Tümünü İncele Buton Metni</label
                >
                <input
                  *ngIf="formConfig.homeContent"
                  [(ngModel)]="formConfig.homeContent.toursViewAll"
                  name="toursView"
                  class="w-full p-3 border rounded"
                />
              </div>
              <div class="md:col-span-1">
                <label
                  class="block text-xs font-bold text-slate-500 uppercase mb-1"
                  >Rezervasyon Buton Metni</label
                >
                <input
                  *ngIf="formConfig.homeContent"
                  [(ngModel)]="formConfig.homeContent.toursBookBtn"
                  name="toursBook"
                  class="w-full p-3 border rounded"
                />
              </div>
            </div>

            <!-- 10. Campaigns/Bottom Stats -->
            <h3 class="font-bold text-lg border-b pb-2 text-slate-700">
              10. Teslimat & Hizmet Özeti Bölümü (Sayfa Sonu)
            </h3>
            <div
              class="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-6 rounded-xl border border-slate-200"
            >
              <div class="md:col-span-1">
                <label class="block text-[10px] text-slate-500 font-bold uppercase mb-1">%15 Sembolü Alt Metni</label>
                <input
                  *ngIf="formConfig.homeContent"
                  [(ngModel)]="formConfig.homeContent.campaignsEarly"
                  name="campEarly2"
                  class="w-full p-2 border rounded font-bold text-sm"
                  placeholder="Erken Rezervasyon"
                />
              </div>
              <div class="md:col-span-1">
                <label class="block text-[10px] text-slate-500 font-bold uppercase mb-1">7/24 Sembolü Alt Metni</label>
                <input
                  *ngIf="formConfig.homeContent"
                  [(ngModel)]="formConfig.homeContent.campaignsRoadside"
                  name="campRoadside2"
                  class="w-full p-2 border rounded font-bold text-sm"
                  placeholder="Kesintisiz Yol Yardım"
                />
              </div>
              <div class="md:col-span-1">
                <label class="block text-[10px] text-slate-500 font-bold uppercase mb-1">ÜCRETSİZ Yazısı Alt Metni</label>
                <input
                  *ngIf="formConfig.homeContent"
                  [(ngModel)]="formConfig.homeContent.campaignsDelivery"
                  name="campDelivery2"
                  class="w-full p-2 border rounded font-bold text-sm"
                  placeholder="Havalimanı & Otogar Teslimat"
                />
              </div>
            </div>

          </div>
        }

        <!-- TEAM & ABOUT TAB -->
        @if (activeTab() === "team") {
          <div class="space-y-6">
            <div>
              <label
                class="block text-xs font-bold text-slate-500 uppercase mb-1"
                >Hakkımızda Başlığı</label
              >
              <input
                [(ngModel)]="formConfig.aboutTitle"
                name="aboutTitle"
                class="w-full p-3 bg-slate-50 border rounded font-bold"
              />
            </div>
            <div>
              <label
                class="block text-xs font-bold text-slate-500 uppercase mb-1"
                >Hakkımızda Metni</label
              >
              <textarea
                [(ngModel)]="formConfig.aboutText"
                name="aboutText"
                rows="8"
                class="w-full p-3 bg-slate-50 border rounded"
              ></textarea>
            </div>

            <h3 class="font-bold text-lg border-b pb-2 text-slate-700 mt-8">
              Ekip Yönetimi
            </h3>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              @for (
                member of formConfig.team;
                track member.id;
                let i = $index
              ) {
                <div
                  class="bg-slate-50 p-4 rounded-lg border border-slate-200 relative group"
                >
                  <button
                    type="button"
                    (click)="removeTeamMember(i)"
                    class="absolute top-2 right-2 text-red-500 hover:text-red-700 bg-white rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke-width="1.5"
                      stroke="currentColor"
                      class="w-5 h-5"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>

                  <div class="flex items-center gap-4 mb-4">
                    <img
                      [src]="member.image"
                      class="w-16 h-16 rounded-full object-cover border-2 border-white shadow-sm"
                    />
                    <div class="flex-1">
                      <input
                        [(ngModel)]="member.name"
                        [name]="'name-' + i"
                        class="w-full font-bold bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none mb-1"
                        placeholder="İsim Soyisim"
                      />
                      <input
                        [(ngModel)]="member.role"
                        [name]="'role-' + i"
                        class="w-full text-sm text-blue-600 font-medium bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none"
                        placeholder="Ünvan"
                      />
                    </div>
                  </div>

                  <textarea
                    [(ngModel)]="member.description"
                    [name]="'desc-' + i"
                    rows="2"
                    class="w-full text-sm text-slate-600 bg-white p-2 rounded border border-slate-200 focus:border-blue-500 focus:outline-none"
                    placeholder="Kısa açıklama..."
                  ></textarea>

                  <div class="mt-2">
                    <label
                      class="text-xs font-bold text-slate-400 uppercase block mb-1"
                      >Fotoğraf</label
                    >
                    <div class="flex items-center gap-2">
                      <input
                        type="file"
                        (change)="onFileSelected($event, member)"
                        accept="image/*"
                        class="text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                    </div>
                    <input
                      [(ngModel)]="member.image"
                      [name]="'img-' + i"
                      class="w-full text-xs p-1 bg-white border rounded text-slate-500 mt-1"
                      placeholder="veya URL girin"
                    />
                  </div>
                </div>
              }

              <!-- Add New Member Card -->
              <button
                type="button"
                (click)="addTeamMember()"
                class="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-300 rounded-lg text-slate-400 hover:border-blue-500 hover:text-blue-500 hover:bg-blue-50 transition-all min-h-[200px]"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                  class="w-10 h-10 mb-2"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M12 4.5v15m7.5-7.5h-15"
                  />
                </svg>
                <span class="font-bold">Yeni Ekip Üyesi Ekle</span>
              </button>
            </div>
          </div>
        }

        <!-- LEGAL TEXTS TAB -->
        @if (activeTab() === "legal") {
          <div class="space-y-6">
            <div>
              <label
                class="block text-xs font-bold text-slate-500 uppercase mb-1"
                >KVKK Metni</label
              >
              <textarea
                [(ngModel)]="formConfig.kvkkText"
                name="kvkkText"
                rows="10"
                class="w-full p-3 bg-slate-50 border rounded font-mono text-sm"
              ></textarea>
            </div>
            <div>
              <label
                class="block text-xs font-bold text-slate-500 uppercase mb-1"
                >Gizlilik Politikası</label
              >
              <textarea
                [(ngModel)]="formConfig.privacyText"
                name="privacyText"
                rows="10"
                class="w-full p-3 bg-slate-50 border rounded font-mono text-sm"
              ></textarea>
            </div>
            <div>
              <label
                class="block text-xs font-bold text-slate-500 uppercase mb-1"
                >Çerez Politikası</label
              >
              <textarea
                [(ngModel)]="formConfig.cookiesText"
                name="cookiesText"
                rows="10"
                class="w-full p-3 bg-slate-50 border rounded font-mono text-sm"
              ></textarea>
            </div>
            <div>
              <label
                class="block text-xs font-bold text-slate-500 uppercase mb-1"
                >Kiralama Sözleşmesi & Şartlar</label
              >
              <textarea
                [(ngModel)]="formConfig.termsText"
                name="termsText"
                rows="10"
                class="w-full p-3 bg-slate-50 border rounded font-mono text-sm"
              ></textarea>
            </div>
            <div>
              <label
                class="block text-xs font-bold text-slate-500 uppercase mb-1"
                >Mesafeli Satış Sözleşmesi</label
              >
              <textarea
                [(ngModel)]="formConfig.distanceSellingText"
                name="distanceSellingText"
                rows="10"
                class="w-full p-3 bg-slate-50 border rounded font-mono text-sm"
              ></textarea>
            </div>
            <div>
              <label
                class="block text-xs font-bold text-slate-500 uppercase mb-1"
                >İade ve İptal Politikası</label
              >
              <textarea
                [(ngModel)]="formConfig.cancellationText"
                name="cancellationText"
                rows="10"
                class="w-full p-3 bg-slate-50 border rounded font-mono text-sm"
              ></textarea>
            </div>
            <div>
              <label
                class="block text-xs font-bold text-slate-500 uppercase mb-1"
                >Araç Sigorta ve Sorumluluk Metinleri</label
              >
              <textarea
                [(ngModel)]="formConfig.insuranceText"
                name="insuranceText"
                rows="10"
                class="w-full p-3 bg-slate-50 border rounded font-mono text-sm"
              ></textarea>
            </div>
          </div>
        }

        <!-- FAQ TAB -->
        @if (activeTab() === "faq") {
          <div class="space-y-4">
            <h3 class="font-bold text-lg border-b pb-2 text-slate-700">
              Sıkça Sorulan Sorular (SSS)
            </h3>

            <div class="space-y-4">
              @for (faq of faqs(); track faq.id) {
                <div class="bg-slate-50 p-4 rounded border border-slate-200">
                  <input
                    [(ngModel)]="faq.question"
                    [ngModelOptions]="{ standalone: true }"
                    (change)="updateFaq(faq)"
                    class="w-full font-bold bg-transparent border-b border-slate-300 mb-2 focus:outline-none focus:border-blue-500"
                    placeholder="Soru"
                  />
                  <textarea
                    [(ngModel)]="faq.answer"
                    [ngModelOptions]="{ standalone: true }"
                    (change)="updateFaq(faq)"
                    rows="2"
                    class="w-full bg-transparent text-sm text-slate-600 focus:outline-none"
                    placeholder="Cevap"
                  ></textarea>
                  <div class="text-right mt-2">
                    <button
                      type="button"
                      (click)="deleteFaq(faq.id)"
                      class="text-red-500 text-xs font-bold hover:underline"
                    >
                      Sil
                    </button>
                  </div>
                </div>
              }
            </div>

            <div
              class="bg-slate-50 p-4 rounded border border-slate-200 border-dashed"
            >
              <h4 class="font-bold text-sm text-slate-900 mb-2">
                Yeni Soru Ekle
              </h4>
              <input
                [(ngModel)]="newFaq.question"
                name="newQuestion"
                class="w-full p-2 bg-white border rounded mb-2 text-sm"
                placeholder="Soru"
              />
              <textarea
                [(ngModel)]="newFaq.answer"
                name="newAnswer"
                rows="2"
                class="w-full p-2 bg-white border rounded mb-2 text-sm"
                placeholder="Cevap"
              ></textarea>
              <button
                type="button"
                (click)="addFaq()"
                class="bg-slate-900 text-white px-4 py-2 rounded text-xs font-bold hover:bg-blue-500 hover:text-slate-900 transition-colors"
              >
                Ekle
              </button>
            </div>
          </div>
        }

        <!-- SEO TAB -->
        @if (activeTab() === "seo") {
          <div class="space-y-4">
            <h3 class="font-bold text-lg border-b pb-2 text-slate-700">
              SEO & Arama Motoru Optimizasyonu (Kapsamlı)
            </h3>

            <div
              class="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-6 rounded-xl border border-slate-200"
            >
              <div class="md:col-span-2">
                <label
                  class="block text-xs font-bold text-slate-500 uppercase mb-1"
                  >Site Başlığı (Browser Title)</label
                >
                <input
                  [(ngModel)]="formConfig.seoTitle"
                  name="seoTitle"
                  class="w-full p-3 border rounded font-bold"
                  placeholder="Örn: Alperler Auto - Güvenilir Araç Kiralama"
                />
              </div>

              <div class="md:col-span-2">
                <label
                  class="block text-xs font-bold text-slate-500 uppercase mb-1"
                  >Meta Açıklaması (Description)</label
                >
                <textarea
                  [(ngModel)]="formConfig.seoDescription"
                  name="seoDescription"
                  rows="3"
                  class="w-full p-3 border rounded"
                  placeholder="Google arama sonuçlarında çıkacak 150-160 karakterlik açıklama"
                ></textarea>
              </div>

              <div class="md:col-span-2">
                <label
                  class="block text-xs font-bold text-slate-500 uppercase mb-1"
                  >Anahtar Kelimeler (Keywords)</label
                >
                <textarea
                  [(ngModel)]="formConfig.seoKeywords"
                  name="seoKeywords"
                  rows="2"
                  class="w-full p-3 border rounded"
                  placeholder="Örn: Yüksekova Araç Kiralama, Hakkari Rent A Car"
                ></textarea>
                <p class="text-xs text-slate-500 mt-1">
                  Anahtar kelimeleri virgülle ayırarak yazın.
                </p>
              </div>

              <div class="md:col-span-2">
                <label
                  class="block text-xs font-bold text-slate-500 uppercase mb-1"
                  >Yazar / Kurum (Author)</label
                >
                <input
                  [(ngModel)]="formConfig.seoAuthor"
                  name="seoAuthor"
                  class="w-full p-3 border rounded"
                  placeholder="Örn: Alperler Auto"
                />
              </div>
            </div>

            <h3 class="font-bold text-lg border-b pb-2 text-slate-700 pt-6">
              Sosyal Medya & Paylaşım Ek Özellikleri (Open Graph)
            </h3>
            <div
              class="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-6 rounded-xl border border-slate-200"
            >
              <div class="md:col-span-2">
                <label
                  class="block text-xs font-bold text-slate-500 uppercase mb-1"
                  >Sosyal Medya Başlığı (OG Title)</label
                >
                <input
                  [(ngModel)]="formConfig.seoOgTitle"
                  name="seoOgTitle"
                  class="w-full p-3 border rounded text-sm"
                  placeholder="WhatsApp ve Facebook'ta site linki atıldığında çıkacak başlık"
                />
              </div>
              <div class="md:col-span-2">
                <label
                  class="block text-xs font-bold text-slate-500 uppercase mb-1"
                  >Sosyal Medya Açıklaması (OG Description)</label
                >
                <textarea
                  [(ngModel)]="formConfig.seoOgDescription"
                  name="seoOgDescription"
                  rows="2"
                  class="w-full p-3 border rounded text-sm"
                  placeholder="WhatsApp ve Facebook paylaşımlarında çıkacak kısa açıklama"
                ></textarea>
              </div>
              <div class="md:col-span-2">
                <label
                  class="block text-xs font-bold text-slate-500 uppercase mb-1"
                  >Paylaşım Görseli URL (OG Image)</label
                >
                <input
                  [(ngModel)]="formConfig.seoOgImage"
                  name="seoOgImage"
                  class="w-full p-3 border rounded text-sm"
                  placeholder="https://... (önerilen boyut: 1200x630)"
                />
              </div>
              <div class="md:col-span-2">
                <label
                  class="block text-xs font-bold text-slate-500 uppercase mb-1"
                  >Twitter Kullanıcı Adı (Handle)</label
                >
                <input
                  [(ngModel)]="formConfig.seoTwitterHandle"
                  name="seoTwitterHandle"
                  class="w-full p-3 border rounded text-sm"
                  placeholder="@alperlerauto"
                />
              </div>
            </div>
          </div>
        }

        <!-- INTEGRATIONS TAB -->
        @if (activeTab() === "integrations") {
          <div class="space-y-6">
            <h3 class="font-bold text-lg border-b pb-2 text-slate-700">
              Entegrasyonlar ve Pazarlama Araçları
            </h3>
            <div
              class="bg-indigo-50 border border-indigo-100 p-4 rounded-lg mb-6"
            >
              <p
                class="text-sm text-indigo-800 font-medium tracking-wide leading-relaxed"
              >
                Sitenizin trafik analizlerini ve reklam kampanyalarını bu
                alandan yönetebilirsiniz. Google Analytics ziyaretçilerinizi
                detaylı bir şekilde takip etmenizi sağlarken, Google Ads
                kimliğiniz doğrudan dönüşüm ve reklam ağlarına bağlanmanızı
                sağlar.
              </p>
            </div>
            <div>
              <label
                class="block text-xs font-bold text-slate-500 uppercase mb-1"
                >Google Analytics ID (Örn: G-XXXXXXXXXX)</label
              >
              <input
                [(ngModel)]="formConfig.googleAnalyticsId"
                name="googleAnalyticsId"
                class="w-full p-3 bg-slate-50 border rounded font-mono text-sm"
                placeholder="G-1A2B3C4D5E"
              />
            </div>
            <div>
              <label
                class="block text-xs font-bold text-slate-500 uppercase mb-1"
                >Google Ads / GTM Dönüşüm ID (Örn: AW-XXXXXXXXXX)</label
              >
              <input
                [(ngModel)]="formConfig.googleAdsId"
                name="googleAdsId"
                class="w-full p-3 bg-slate-50 border rounded font-mono text-sm"
                placeholder="AW-123456789"
              />
            </div>
            <div>
              <label
                class="block text-xs font-bold text-slate-500 uppercase mb-1"
                >Meta (Facebook) Pixel ID (Örn: 123456789012345)</label
              >
              <input
                [(ngModel)]="formConfig.metaPixelId"
                name="metaPixelId"
                class="w-full p-3 bg-slate-50 border rounded font-mono text-sm"
                placeholder="123456789012345"
              />
            </div>
          </div>
        }

        <!-- ACCOUNT TAB -->
        @if (activeTab() === "account") {
          <div class="space-y-6">
            <div>
              <h3 class="text-lg font-black text-slate-900">Admin Hesabı ve Güvenlik</h3>
              <p class="mt-1 text-sm leading-relaxed text-slate-500">
                Yönetici erişimi Firebase Authentication ile doğrulanır. Görsel ayar listeleri güvenlik yetkisi vermez.
              </p>
            </div>

            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <span class="text-[10px] font-black uppercase tracking-wider text-slate-400">Aktif yönetici</span>
                <p class="mt-2 break-all text-sm font-black text-slate-900">{{ authService.getCurrentEmail() }}</p>
              </div>
              <div class="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                <span class="text-[10px] font-black uppercase tracking-wider text-emerald-600">Birincil yetkili hesap</span>
                <p class="mt-2 break-all text-sm font-black text-emerald-900">{{ authService.getPrimaryAdminEmail() }}</p>
              </div>
            </div>

            <div class="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-relaxed text-amber-900">
              <strong>Güvenlik notu:</strong> Ek yönetici yetkisi yalnızca güvenli Firestore <code>admins</code> kaydıyla verilir. Bu ekranda yalnızca bir e-posta yazarak yönetici yetkisi oluşturulmaz.
            </div>

            <div class="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
              <div class="mb-5">
                <h4 class="font-black text-slate-900">Şifreyi Değiştir</h4>
                <p class="mt-1 text-xs leading-relaxed text-slate-500">En az 16 karakter, büyük harf, küçük harf, rakam ve özel karakter gerekir.</p>
              </div>

              <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label class="block">
                  <span class="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-500">Yeni şifre</span>
                  <input
                    [type]="showAdminPassword() ? 'text' : 'password'"
                    [(ngModel)]="newAdminPassword"
                    name="newAdminPassword"
                    autocomplete="new-password"
                    class="w-full rounded-xl border-2 border-slate-200 bg-slate-50 p-3.5 font-mono text-sm font-bold text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
                  />
                </label>
                <label class="block">
                  <span class="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-500">Yeni şifre tekrar</span>
                  <input
                    [type]="showAdminPassword() ? 'text' : 'password'"
                    [(ngModel)]="confirmAdminPassword"
                    name="confirmAdminPassword"
                    autocomplete="new-password"
                    class="w-full rounded-xl border-2 border-slate-200 bg-slate-50 p-3.5 font-mono text-sm font-bold text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
                  />
                </label>
              </div>

              <div class="mt-4 flex flex-col gap-2 sm:flex-row">
                <button type="button" (click)="showAdminPassword.update(v => !v)" class="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-black text-slate-600 transition hover:bg-slate-50">
                  {{ showAdminPassword() ? 'Şifreyi Gizle' : 'Şifreyi Göster' }}
                </button>
                <button type="button" (click)="changeAdminPassword()" [disabled]="changingAdminPassword()" class="min-h-11 flex-1 rounded-xl bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-blue-600 disabled:opacity-50">
                  {{ changingAdminPassword() ? 'Güncelleniyor...' : 'Yeni Şifreyi Kaydet' }}
                </button>
              </div>
            </div>

            <div class="rounded-2xl border border-blue-200 bg-blue-50 p-5 sm:p-6">
              <h4 class="font-black text-blue-950">Otomatik Güçlü Şifre</h4>
              <p class="mt-1 text-xs leading-relaxed text-blue-800">Sistem 24 karakterlik kriptografik güçlü bir şifre üretir ve doğrudan Firebase hesabınıza kaydeder. Şifre yalnızca bu ekranda gösterilir.</p>

              <button type="button" (click)="generateAdminPassword()" [disabled]="changingAdminPassword()" class="mt-4 min-h-11 rounded-xl bg-blue-600 px-5 text-sm font-black text-white transition hover:bg-blue-700 disabled:opacity-50">
                Güçlü Şifre Oluştur ve Kaydet
              </button>

              @if (generatedAdminPassword()) {
                <div class="mt-4 rounded-xl border border-blue-200 bg-white p-4">
                  <label class="block text-[10px] font-black uppercase tracking-wider text-slate-500">Yeni yönetici şifreniz</label>
                  <div class="mt-2 flex flex-col gap-2 sm:flex-row">
                    <input [value]="generatedAdminPassword()" readonly class="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-sm font-black text-slate-950" />
                    <button type="button" (click)="copyGeneratedAdminPassword()" class="min-h-11 rounded-lg bg-slate-100 px-4 text-sm font-black text-slate-700 hover:bg-slate-200">Kopyala</button>
                  </div>
                  <p class="mt-2 text-xs font-bold text-red-600">Bu şifreyi güvenli bir yere kaydedin. Sayfadan ayrıldıktan sonra tekrar gösterilmez.</p>
                </div>
              }
            </div>

            <div class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h4 class="mb-4 font-black text-slate-800">Admin Profil Fotoğrafı</h4>
              <div class="flex items-center gap-5">
                <div class="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-300 bg-white shadow-sm">
                  @if (formConfig.adminProfileUrl) {
                    <img [src]="formConfig.adminProfileUrl" alt="Admin profil" class="h-full w-full object-cover" />
                  } @else {
                    <mat-icon class="text-slate-400">person</mat-icon>
                  }
                </div>
                <label class="min-w-0 flex-1">
                  <span class="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-500">Profil fotoğrafı URL</span>
                  <input [(ngModel)]="formConfig.adminProfileUrl" name="adminProfileUrl" class="w-full rounded-lg border bg-white p-3 text-sm text-slate-700" placeholder="https://..." />
                </label>
              </div>
            </div>
          </div>
        }

        <div
          class="sticky bottom-4 bg-white/80 backdrop-blur p-4 border-t border-slate-200 shadow-lg rounded-xl mt-8 z-10"
        >
          <button
            type="submit"
            class="w-full py-4 bg-slate-900 hover:bg-blue-500 hover:text-slate-900 text-white font-bold rounded-lg uppercase tracking-widest transition-colors shadow-lg text-sm"
          >
            Tüm Ayarları Kaydet ve Yayınla
          </button>
        </div>
      </form>
    </div>
  `,
})
export class AdminSettingsComponent implements OnInit {
  carService = inject(CarService);
  authService = inject(AuthService);
  toastService = inject(ToastService);
  confirmService = inject(ConfirmService);
  router = inject(Router);
  currentConfig = this.carService.getConfig();
  faqs = this.carService.getFaqs();

  formConfig: SiteConfig = { ...this.currentConfig() };
  saveSuccess = signal(false);
  activeTab = signal<
    | "general"
    | "home"
    | "team"
    | "legal"
    | "faq"
    | "seo"
    | "integrations"
    | "account"
  >("general");
  previousTab: any = "general";

  switchTab(tab: any) {
    if (tab !== this.activeTab()) {
      this.previousTab = this.activeTab();
      this.activeTab.set(tab);
    }
  }



  newFaq: Partial<FaqItem> = {};

  ngOnInit() {
    // Sync form when signal changes from outside (initial load)
    this.formConfig = { ...this.currentConfig() };

    // Ensure team array exists
    if (!this.formConfig.team) {
      this.formConfig.team = [];
    }

    // Ensure homeContent object exists so inputs render and defaults are pre-filled
    if (!this.formConfig.homeContent) {
      this.formConfig.homeContent = {
        heroTitle: "Beklemek Yok: 5 Dakikada Onayla, Anında Yola Çık",
        heroSubtitle:
          "Uzun prosedürlere ve gizli ücretlere son. Aracını Seç, 5 Dakikada Yola Çık.",
        heroTrustLine:
          "1001+ MUTLU MÜŞTERİ • SIFIR GİZLİ ÜCRET • GÜVENİLİR FİLO",
        heroCtaSubtext: "Kefilsiz, evraksız, hızlı çözüm",
        heroCta: "Şimdi Kirala",

        bookingTitle: "Saniyeler İçinde Araç Bul & Zirvenin Tadını Çıkar",

        featuredBadge: "KİRALIK ARAÇLAR",
        featuredTitle: "Güvenli ve Temiz Kiralık Araçlar",
        featuredSubtitle:
          "Günlük işleriniz ya da tatil planınız için bakımları tamsa yapılmış, bütçenize uygun kiralık arabalar. Gizli masraf veya karmaşık prosedürler yok.",
        featuredViewAll: "TÜM KİRALIK ARABALARI İNCELE",

        salesBadge: "İKİNCİ EL ARAÇLAR",
        salesTitle: "Sorunsuz ve Garantili İkinci El Arabalar",
        salesDescription:
          "Şeffaf geçmişli, ekspertiz garantili ve tüm kontrolleri yapılmış arabalarımızla bütçenize uygun aracı güvenle alın.",
        salesViewAll: "TÜM SATILIK ARABALARI GÖR",

        whyUsTitle: "Neden Bizi Seçmelisiniz?",
        whyUsSubtitle:
          "Yüksekova'da araç kiralama standartlarını yeniden belirliyoruz.",
        whyUsTrustTitle: "Güvenilir & Şeffaf",
        whyUsTrustDesc:
          "Gizli ücretler yok, sürpriz maliyetler yok. Tamamen şeffaf ve güvenilir kiralama deneyimi.",
        whyUsSupportTitle: "7/24 Kesintisiz Destek",
        whyUsSupportDesc:
          "Yolculuğunuz boyunca her an yanınızdayız. 7/24 yol yardım ve müşteri hizmetleri.",
        whyUsComfortTitle: "Üstün Konfor",
        whyUsComfortDesc:
          "Son model araçlar, düzenli bakımlar ve VIP hizmet anlayışıyla yolculuğunuzun tadını çıkarın.",

        partnerTitle: "Aracınız Boş Durmasın, Ek Gelir Getirsin",
        partnerSubtitle:
          "Aracınızı güvenilir filomuza katarak kullanmadığınız zamanlarda düzenli ödemelerle kazanç elde edebilirsiniz. Tüm bakım ve takip süreçleriyle biz ilgileniyoruz.",
        partnerReqTitle: "Araç Kabul Şartlarımız",
        partnerFormTitle: "Hemen Başvur, Değerlendirelim",

        campaignsEarly: "Erken Rezervasyon",
        campaignsRoadside: "Yol Yardımı",
        campaignsFree: "ÜCRETSİZ",
        campaignsDelivery: "Adrese Teslimat",

        toursTitle: "Yüksekova ve Çevresi İçin Kaliteli Turlar",
        toursSubtitle:
          "Bölgeyi çok iyi bilen rehberlerimiz ve geniş araçlarımızla Hakkari'nin doğasını ailenizle veya arkadaşlarınızla güvenle gezin.",
        toursViewAll: "TÜM TURLARI İNCELE",
        toursBookBtn: "Hemen Rezervasyon Yap",
        toursBottomNote:
          "* Fiyatlandırma ve rezervasyonla ilgili ek bilgiler için bize ulaşın.",
      };
    } else {
      // Fill in any missing keys in existing homeContent
      const defaults = {
        heroTitle: "Beklemek Yok: 5 Dakikada Onayla, Anında Yola Çık",
        heroSubtitle:
          "Uzun prosedürlere ve gizli ücretlere son. Aracını Seç, 5 Dakikada Yola Çık.",
        heroTrustLine:
          "1001+ MUTLU MÜŞTERİ • SIFIR GİZLİ ÜCRET • GÜVENİLİR FİLO",
        heroCtaSubtext: "Kefilsiz, evraksız, hızlı çözüm",
        heroCta: "Şimdi Kirala",
        bookingTitle: "Saniyeler İçinde Araç Bul & Zirvenin Tadını Çıkar",
        featuredBadge: "KİRALIK ARAÇLAR",
        featuredTitle: "Güvenli ve Temiz Kiralık Araçlar",
        featuredSubtitle:
          "Günlük işleriniz ya da tatil planınız için bakımları tamsa yapılmış, bütçenize uygun kiralık arabalar. Gizli masraf veya karmaşık prosedürler yok.",
        featuredViewAll: "TÜM KİRALIK ARABALARI İNCELE",
        salesBadge: "İKİNCİ EL ARAÇLAR",
        salesTitle: "Sorunsuz ve Garantili İkinci El Arabalar",
        salesDescription:
          "Şeffaf geçmişli, ekspertiz garantili ve tüm kontrolleri yapılmış arabalarımızla bütçenize uygun aracı güvenle alın.",
        salesViewAll: "TÜM SATILIK ARABALARI GÖR",
        whyUsTitle: "Neden Bizi Seçmelisiniz?",
        whyUsSubtitle:
          "Yüksekova'da araç kiralama standartlarını yeniden belirliyoruz.",
        whyUsTrustTitle: "Güvenilir & Şeffaf",
        whyUsTrustDesc:
          "Gizli ücretler yok, sürpriz maliyetler yok. Tamamen şeffaf ve güvenilir kiralama deneyimi.",
        whyUsSupportTitle: "7/24 Kesintisiz Destek",
        whyUsSupportDesc:
          "Yolculuğunuz boyunca her an yanınızdayız. 7/24 yol yardım ve müşteri hizmetleri.",
        whyUsComfortTitle: "Üstün Konfor",
        whyUsComfortDesc:
          "Son model araçlar, düzenli bakımlar ve VIP hizmet anlayışıyla yolculuğunuzun tadını çıkarın.",
        partnerTitle: "Aracınız Boş Durmasın, Ek Gelir Getirsin",
        partnerSubtitle:
          "Aracınızı güvenilir filomuza katarak kullanmadığınız zamanlarda düzenli ödemelerle kazanç elde edebilirsiniz. Tüm bakım ve takip süreçleriyle biz ilgileniyoruz.",
        partnerReqTitle: "Araç Kabul Şartlarımız",
        partnerFormTitle: "Hemen Başvur, Değerlendirelim",
        campaignsEarly: "Erken Rezervasyon",
        campaignsRoadside: "Yol Yardımı",
        campaignsFree: "ÜCRETSİZ",
        campaignsDelivery: "Adrese Teslimat",
        toursTitle: "Yüksekova ve Çevresi İçin Kaliteli Turlar",
        toursSubtitle:
          "Bölgeyi çok iyi bilen rehberlerimiz ve geniş araçlarımızla Hakkari'nin doğasını ailenizle veya arkadaşlarınızla güvenle gezin.",
        toursViewAll: "TÜM TURLARI İNCELE",
        toursBookBtn: "Hemen Rezervasyon Yap",
        toursBottomNote:
          "* Fiyatlandırma ve rezervasyonla ilgili ek bilgiler için bize ulaşın.",
      };
      for (const [k, v] of Object.entries(defaults)) {
        if (
          !(k in (this.formConfig.homeContent as any)) ||
          !(this.formConfig.homeContent as any)[k]
        ) {
          (this.formConfig.homeContent as any)[k] = v;
        }
      }
    }
  }

  onFileSelected(event: any, member: TeamMember) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        member.image = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  onLogoSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.formConfig.logoUrl = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }



  newAdminPassword = "";
  confirmAdminPassword = "";
  showAdminPassword = signal(false);
  changingAdminPassword = signal(false);
  generatedAdminPassword = signal("");

  async changeAdminPassword() {
    this.generatedAdminPassword.set("");
    if (this.newAdminPassword !== this.confirmAdminPassword) {
      this.toastService.show("Yeni şifreler birbiriyle eşleşmiyor.", "error");
      return;
    }

    const validationError = this.authService.validateStrongPassword(this.newAdminPassword);
    if (validationError) {
      this.toastService.show(validationError, "error");
      return;
    }

    this.changingAdminPassword.set(true);
    const success = await this.authService.changeCurrentPassword(this.newAdminPassword);
    this.changingAdminPassword.set(false);

    if (success) {
      this.newAdminPassword = "";
      this.confirmAdminPassword = "";
      this.toastService.show("Yönetici şifresi Firebase hesasında güncellendi.", "success");
      return;
    }

    this.toastService.show(
      this.authService.lastErrorMessage() || "Şifre değiştirilemedi.",
      "error",
    );
  }

  async generateAdminPassword() {
    this.generatedAdminPassword.set("");
    this.changingAdminPassword.set(true);
    const password = await this.authService.createStrongPasswordForCurrentUser();
    this.changingAdminPassword.set(false);

    if (password) {
      this.generatedAdminPassword.set(password);
      this.toastService.show("Güçlü şifre oluşturuldu ve Firebase hesabına kaydedildi.", "success");
      return;
    }

    this.toastService.show(
      this.authService.lastErrorMessage() || "Güçlü şifre oluşturulamadı.",
      "error",
    );
  }

  async copyGeneratedAdminPassword() {
    const password = this.generatedAdminPassword();
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      this.toastService.show("Şifre panoya kopyalandı.", "success");
    } catch {
      this.toastService.show("Otomatik kopyalama engellendi. şifreyi seçerek kopyalayın.", "error");
    }
  }

  saveConfig(event: Event) {
    event.preventDefault();

    this.carService.updateConfig(this.formConfig);

    this.toastService.show("Ayarlar başarıyla kaydedildi!", "success");
    // Stay focused on same tab
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  setTheme(theme: "light" | "dark" | "luxury" | "corporate") {
    this.formConfig.theme = theme;
  }

  addTeamMember() {
    const newMember: TeamMember = {
      id: Date.now(),
      name: "",
      role: "",
      description: "",
      image: "https://picsum.photos/200/200",
    };
    this.formConfig.team = [...this.formConfig.team, newMember];
  }

  async removeTeamMember(index: number) {
    const confirmed = await this.confirmService.confirm({
      title: "Üyeyi Sil",
      message: "Bu ekip üyesini silmek istediğinize emin misiniz?",
    });
    if (confirmed) {
      const newTeam = [...this.formConfig.team];
      newTeam.splice(index, 1);
      this.formConfig.team = newTeam;
      this.toastService.show("Ekip üyesi silindi.", "info");
    }
  }

  async resetStats() {
    const confirmed = await this.confirmService.confirm({
      title: "Sayacı Sıfırla",
      message:
        "Ziyaretçi sayacını sıfırlamak istediğinize emin misiniz? Bu işlem geri alınamaz.",
    });
    if (confirmed) {
      this.carService.resetStats();
      this.toastService.show("İstatistikler sıfırlandı.", "success");
    }
  }

  addFaq() {
    if (this.newFaq.question && this.newFaq.answer) {
      this.carService.addFaq(this.newFaq as FaqItem);
      this.newFaq = {};
    }
  }

  async deleteFaq(id: number) {
    const confirmed = await this.confirmService.confirm({
      title: "SSS Sil",
      message: "Silmek istediğinize emin misiniz?",
    });
    if (confirmed) {
      this.carService.deleteFaq(id);
      this.toastService.show("Soru silindi.", "info");
    }
  }

  updateFaq(faq: FaqItem) {
    this.carService.addFaq(faq);
  }

  goBack() {
    this.router.navigate(["/admin/dashboard"]);
  }
}
