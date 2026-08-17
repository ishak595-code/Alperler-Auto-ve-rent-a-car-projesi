import { Component, inject, signal, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { CarService, FaqItem } from "../../services/car.service";
import { AuthService } from "../../services/auth.service";
import { ToastService } from "../../services/toast.service";
import { ConfirmService } from "../../services/confirm.service";
import { AdminMediaService } from "../../services/admin-media.service";
import { SiteConfig, TeamMember } from "../../models/site-config.model";

@Component({
  selector: "app-admin-settings",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="px-4 py-6 md:px-8 bg-white border-b border-slate-200 shadow-sm sticky top-0 z-20 flex items-center justify-between">
      <div class="flex items-center gap-4">
        <button (click)="goBack()" aria-label="Kontrol Paneline Dön" class="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
        </button>
        <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Web Site Ayarları</h1>
      </div>
      <div class="hidden md:flex space-x-2"><span class="text-xs font-bold bg-blue-100 text-blue-800 px-3 py-1 rounded-full flex items-center"><span class="w-2 h-2 rounded-full bg-blue-500 mr-2 animate-pulse"></span>Sistem Aktif</span></div>
    </div>

    <div class="w-full bg-white min-h-[calc(100vh-10rem)] p-4 md:p-8">
      <div class="flex space-x-4 border-b border-slate-200 mb-6 overflow-x-auto" role="tablist" aria-label="Site ayarları bölümleri">
        <button type="button" (click)="switchTab('general')" [class.border-blue-500]="activeTab() === 'general'" [class.text-blue-600]="activeTab() === 'general'" class="pb-2 px-4 font-bold text-slate-500 hover:text-slate-800 border-b-2 border-transparent transition-colors whitespace-nowrap" aria-label="Genel bilgiler ve iletişim ayarlarını aç">Genel Bilgiler & İletişim</button>
        <button type="button" (click)="switchTab('home')" [class.border-blue-500]="activeTab() === 'home'" [class.text-blue-600]="activeTab() === 'home'" class="pb-2 px-4 font-bold text-slate-500 hover:text-slate-800 border-b-2 border-transparent transition-colors whitespace-nowrap" aria-label="Ana sayfa yapısı ayarlarını aç">Ana Sayfa Yapısı</button>
        <button type="button" (click)="switchTab('team')" [class.border-blue-500]="activeTab() === 'team'" [class.text-blue-600]="activeTab() === 'team'" class="pb-2 px-4 font-bold text-slate-500 hover:text-slate-800 border-b-2 border-transparent transition-colors whitespace-nowrap" aria-label="Hakkımızda ve ekip ayarlarını aç">Hakkımızda & Ekip</button>
        <button type="button" (click)="switchTab('legal')" [class.border-blue-500]="activeTab() === 'legal'" [class.text-blue-600]="activeTab() === 'legal'" class="pb-2 px-4 font-bold text-slate-500 hover:text-slate-800 border-b-2 border-transparent transition-colors whitespace-nowrap" aria-label="Yasal sayfa ayarlarını aç">Yasal Sayfalar</button>
        <button type="button" (click)="switchTab('faq')" [class.border-blue-500]="activeTab() === 'faq'" [class.text-blue-600]="activeTab() === 'faq'" class="pb-2 px-4 font-bold text-slate-500 hover:text-slate-800 border-b-2 border-transparent transition-colors whitespace-nowrap" aria-label="Sık sorulan sorular ayarlarını aç">Sık Sorulan Sorular (SSS)</button>
        <button type="button" (click)="switchTab('seo')" [class.border-blue-500]="activeTab() === 'seo'" [class.text-blue-600]="activeTab() === 'seo'" class="pb-2 px-4 font-bold text-slate-500 hover:text-slate-800 border-b-2 border-transparent transition-colors whitespace-nowrap" aria-label="SEO ve uygulama ayarlarını aç">SEO & Uygulama</button>
        <button type="button" (click)="switchTab('integrations')" [class.border-blue-500]="activeTab() === 'integrations'" [class.text-blue-600]="activeTab() === 'integrations'" class="pb-2 px-4 font-bold text-slate-500 hover:text-slate-800 border-b-2 border-transparent transition-colors whitespace-nowrap" aria-label="Google ve reklam entegrasyon ayarlarını aç">Google & Reklam</button>
        <button type="button" (click)="switchTab('account')" [class.border-blue-500]="activeTab() === 'account'" [class.text-blue-600]="activeTab() === 'account'" class="pb-2 px-4 font-bold text-slate-500 hover:text-slate-800 border-b-2 border-transparent transition-colors whitespace-nowrap" aria-label="Admin hesabı ayarlarını aç">Admin Hesapları</button>
      </div>

      <form (submit)="saveConfig($event)" class="space-y-8">
        @if (activeTab() === "general") {
          <div class="space-y-4">
            <h3 class="font-bold text-lg border-b pb-2 text-slate-700">Şirket Bilgileri & Logo</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="md:col-span-2 flex items-center gap-6 bg-slate-50 p-4 rounded border">
                <div class="w-32 h-32 bg-white border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center overflow-hidden relative">
                  @if (formConfig.logoUrl) { <img [src]="formConfig.logoUrl" alt="Şirket logosu önizlemesi" class="w-full h-full object-contain p-2" /> }
                  @else { <div class="text-center text-slate-400"><span class="text-xs font-bold">Logo Yok</span></div> }
                </div>
                <div class="flex-1">
                  <label class="block text-xs font-bold text-slate-500 uppercase mb-1" for="site-logo-url">Logo URL veya Dosya Seç</label>
                  <div class="flex gap-2">
                    <input id="site-logo-url" [(ngModel)]="formConfig.logoUrl" name="logoUrl" class="w-full p-3 bg-white border rounded text-sm text-slate-600" placeholder="https://..." aria-label="Şirket logo URL adresi" />
                    <label class="flex items-center justify-center cursor-pointer text-slate-600 bg-slate-100 border border-slate-200 hover:bg-blue-50 hover:text-blue-600 px-4 py-2 rounded text-xs font-bold transition-colors whitespace-nowrap">Dosya Seç<input type="file" (change)="onLogoSelected($event)" accept="image/jpeg,image/png,image/webp,image/avif" class="sr-only" aria-label="Şirket logosu dosyası seç" /></label>
                  </div>
                  <div class="grid grid-cols-2 gap-4 mt-3">
                    <label><span class="block text-[10px] uppercase font-bold text-slate-400 mb-1">Masaüstü Logo Genişliği</span><input [(ngModel)]="formConfig.logoWidthDesktop" name="logoWidthDesktop" type="number" class="w-full p-2 bg-white border rounded text-sm font-mono" /></label>
                    <label><span class="block text-[10px] uppercase font-bold text-slate-400 mb-1">Mobil Logo Genişliği</span><input [(ngModel)]="formConfig.logoWidthMobile" name="logoWidthMobile" type="number" class="w-full p-2 bg-white border rounded text-sm font-mono" /></label>
                  </div>
                </div>
              </div>

              <label><span class="block text-xs font-bold text-slate-500 uppercase mb-1">Şirket Adı</span><input [(ngModel)]="formConfig.companyName" name="companyName" class="w-full p-3 bg-slate-50 border rounded font-bold" /></label>
              <label><span class="block text-xs font-bold text-slate-500 uppercase mb-1">Slogan / Logo Altı Metin</span><input [(ngModel)]="formConfig.tagline" name="tagline" class="w-full p-3 bg-slate-50 border rounded" /></label>
              <label><span class="block text-xs font-bold text-slate-500 uppercase mb-1">Telefon</span><input [(ngModel)]="formConfig.phone" name="phone" class="w-full p-3 bg-slate-50 border rounded font-bold" /></label>
              <label><span class="block text-xs font-bold text-slate-500 uppercase mb-1">E-Posta</span><input [(ngModel)]="formConfig.email" name="email" class="w-full p-3 bg-slate-50 border rounded" /></label>
              <label><span class="block text-xs font-bold text-slate-500 uppercase mb-1">WhatsApp</span><input [(ngModel)]="formConfig.whatsapp" name="whatsapp" class="w-full p-3 bg-slate-50 border rounded" /></label>
              <label><span class="block text-xs font-bold text-slate-500 uppercase mb-1">WhatsApp Karşılama Mesajı</span><input [(ngModel)]="formConfig.whatsappMessage" name="whatsappMessage" class="w-full p-3 bg-slate-50 border rounded" /></label>
              <label class="md:col-span-2"><span class="block text-xs font-bold text-slate-500 uppercase mb-1">Adres</span><input [(ngModel)]="formConfig.address" name="address" class="w-full p-3 bg-slate-50 border rounded" /></label>
            </div>
          </div>

          <div class="space-y-4">
            <h3 class="font-bold text-lg border-b pb-2 text-slate-700">Sosyal Medya Linkleri</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label><span class="block text-xs font-bold text-slate-500 uppercase mb-1">Instagram URL</span><input [(ngModel)]="formConfig.instagramUrl" name="instagram" class="w-full p-3 bg-slate-50 border rounded" /></label>
              <label><span class="block text-xs font-bold text-slate-500 uppercase mb-1">X URL</span><input [(ngModel)]="formConfig.twitterUrl" name="twitter" class="w-full p-3 bg-slate-50 border rounded" /></label>
              <label><span class="block text-xs font-bold text-slate-500 uppercase mb-1">YouTube URL</span><input [(ngModel)]="formConfig.youtubeUrl" name="youtube" class="w-full p-3 bg-slate-50 border rounded" /></label>
              <label><span class="block text-xs font-bold text-slate-500 uppercase mb-1">TikTok URL</span><input [(ngModel)]="formConfig.tiktokUrl" name="tiktok" class="w-full p-3 bg-slate-50 border rounded" /></label>
            </div>
          </div>
        }

        @if (activeTab() === "home") {
          <div class="rounded-xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-900">Ana sayfa bölümlerinin sıra, tema, görsel, içerik ve gösterim ayarları artık <a routerLink="/admin/homepage" class="font-black underline">Ana Sayfa Vitrini</a> ekranından yönetilir.</div>
        }

        @if (activeTab() === "team") {
          <div class="space-y-5">
            <label><span class="block text-xs font-bold text-slate-500 uppercase mb-1">Hakkımızda Başlığı</span><input [(ngModel)]="formConfig.aboutTitle" name="aboutTitle" class="w-full p-3 bg-slate-50 border rounded" /></label>
            <label><span class="block text-xs font-bold text-slate-500 uppercase mb-1">Hakkımızda Metni</span><textarea [(ngModel)]="formConfig.aboutText" name="aboutText" rows="10" class="w-full p-3 bg-slate-50 border rounded"></textarea></label>
            <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              @for (member of formConfig.team; track member.id; let i = $index) {
                <article class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div class="flex items-center gap-3">
                    <div class="h-20 w-20 overflow-hidden rounded-full bg-white border">@if(member.image){<img [src]="member.image" [alt]="member.name || 'Ekip üyesi'" class="h-full w-full object-cover"/>}</div>
                    <label class="cursor-pointer rounded-lg bg-white border px-3 py-2 text-xs font-black">Dosya Seç<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" class="sr-only" (change)="onFileSelected($event, member)" [attr.aria-label]="(member.name || 'Ekip üyesi') + ' profil fotoğrafı dosyası seç'" /></label>
                  </div>
                  <label class="mt-3 block"><span class="block text-xs font-bold text-slate-500">Fotoğraf URL</span><input [(ngModel)]="member.image" [name]="'img-'+i" class="w-full p-2 bg-white border rounded" /></label>
                  <label class="mt-3 block"><span class="block text-xs font-bold text-slate-500">Ad Soyad</span><input [(ngModel)]="member.name" [name]="'name-'+i" class="w-full p-2 bg-white border rounded" /></label>
                  <label class="mt-3 block"><span class="block text-xs font-bold text-slate-500">Görev</span><input [(ngModel)]="member.role" [name]="'role-'+i" class="w-full p-2 bg-white border rounded" /></label>
                  <label class="mt-3 block"><span class="block text-xs font-bold text-slate-500">Açıklama</span><textarea [(ngModel)]="member.description" [name]="'desc-'+i" rows="3" class="w-full p-2 bg-white border rounded"></textarea></label>
                  <button type="button" (click)="removeTeamMember(i)" class="mt-3 min-h-10 rounded-lg bg-rose-50 px-3 text-xs font-black text-rose-700" [attr.aria-label]="(member.name || 'Ekip üyesi') + ' kaydını sil'">Sil</button>
                </article>
              }
              <button type="button" (click)="addTeamMember()" class="min-h-48 rounded-2xl border-2 border-dashed border-slate-300 text-sm font-black text-slate-500" aria-label="Yeni ekip üyesi ekle">Yeni Ekip Üyesi Ekle</button>
            </div>
          </div>
        }

        @if (activeTab() === "legal") {
          <div class="space-y-6">
            <label><span class="block text-xs font-bold text-slate-500 uppercase mb-1">KVKK Metni</span><textarea [(ngModel)]="formConfig.kvkkText" name="kvkkText" rows="10" class="w-full p-3 bg-slate-50 border rounded font-mono text-sm"></textarea></label>
            <label><span class="block text-xs font-bold text-slate-500 uppercase mb-1">Gizlilik Politikası</span><textarea [(ngModel)]="formConfig.privacyText" name="privacyText" rows="10" class="w-full p-3 bg-slate-50 border rounded font-mono text-sm"></textarea></label>
            <label><span class="block text-xs font-bold text-slate-500 uppercase mb-1">Çerez Politikası</span><textarea [(ngModel)]="formConfig.cookiesText" name="cookiesText" rows="10" class="w-full p-3 bg-slate-50 border rounded font-mono text-sm"></textarea></label>
            <label><span class="block text-xs font-bold text-slate-500 uppercase mb-1">Kullanım Şartları</span><textarea [(ngModel)]="formConfig.termsText" name="termsText" rows="10" class="w-full p-3 bg-slate-50 border rounded font-mono text-sm"></textarea></label>
            <label><span class="block text-xs font-bold text-slate-500 uppercase mb-1">Mesafeli İşlem</span><textarea [(ngModel)]="formConfig.distanceSellingText" name="distanceSellingText" rows="10" class="w-full p-3 bg-slate-50 border rounded font-mono text-sm"></textarea></label>
            <label><span class="block text-xs font-bold text-slate-500 uppercase mb-1">İade ve İptal</span><textarea [(ngModel)]="formConfig.cancellationText" name="cancellationText" rows="10" class="w-full p-3 bg-slate-50 border rounded font-mono text-sm"></textarea></label>
            <label><span class="block text-xs font-bold text-slate-500 uppercase mb-1">Araç Sigorta ve Sorumluluk</span><textarea [(ngModel)]="formConfig.insuranceText" name="insuranceText" rows="10" class="w-full p-3 bg-slate-50 border rounded font-mono text-sm"></textarea></label>
          </div>
        }

        @if (activeTab() === "faq") {
          <div class="space-y-4">
            @for (faq of faqs(); track faq.id) {
              <div class="bg-slate-50 p-4 rounded border border-slate-200">
                <input [(ngModel)]="faq.question" [ngModelOptions]="{standalone:true}" (change)="updateFaq(faq)" class="w-full font-bold bg-transparent border-b mb-2" aria-label="Sık sorulan soru" />
                <textarea [(ngModel)]="faq.answer" [ngModelOptions]="{standalone:true}" (change)="updateFaq(faq)" rows="2" class="w-full bg-transparent text-sm" aria-label="Sık sorulan soru cevabı"></textarea>
                <button type="button" (click)="deleteFaq(faq.id)" class="mt-2 text-red-600 text-xs font-bold" aria-label="Sık sorulan soruyu sil">Sil</button>
              </div>
            }
            <div class="bg-slate-50 p-4 rounded border border-dashed"><input [(ngModel)]="newFaq.question" name="newQuestion" class="w-full p-2 bg-white border rounded mb-2" placeholder="Soru" aria-label="Yeni sık sorulan soru" /><textarea [(ngModel)]="newFaq.answer" name="newAnswer" rows="2" class="w-full p-2 bg-white border rounded mb-2" placeholder="Cevap" aria-label="Yeni sık sorulan soru cevabı"></textarea><button type="button" (click)="addFaq()" class="bg-slate-900 text-white px-4 py-2 rounded text-xs font-bold" aria-label="Yeni sık sorulan soruyu ekle">Ekle</button></div>
          </div>
        }

        @if (activeTab() === "seo") {
          <div class="space-y-5">
            <label><span class="block text-xs font-bold text-slate-500 uppercase mb-1">Site Başlığı</span><input [(ngModel)]="formConfig.seoTitle" name="seoTitle" class="w-full p-3 border rounded" /></label>
            <label><span class="block text-xs font-bold text-slate-500 uppercase mb-1">Meta Açıklaması</span><textarea [(ngModel)]="formConfig.seoDescription" name="seoDescription" rows="3" class="w-full p-3 border rounded"></textarea></label>
            <label><span class="block text-xs font-bold text-slate-500 uppercase mb-1">Anahtar Kelimeler</span><textarea [(ngModel)]="formConfig.seoKeywords" name="seoKeywords" rows="2" class="w-full p-3 border rounded"></textarea></label>
            <label><span class="block text-xs font-bold text-slate-500 uppercase mb-1">Yazar / Kurum</span><input [(ngModel)]="formConfig.seoAuthor" name="seoAuthor" class="w-full p-3 border rounded" /></label>
            <label><span class="block text-xs font-bold text-slate-500 uppercase mb-1">Sosyal Medya Başlığı</span><input [(ngModel)]="formConfig.seoOgTitle" name="seoOgTitle" class="w-full p-3 border rounded" /></label>
            <label><span class="block text-xs font-bold text-slate-500 uppercase mb-1">Sosyal Medya Açıklaması</span><textarea [(ngModel)]="formConfig.seoOgDescription" name="seoOgDescription" rows="2" class="w-full p-3 border rounded"></textarea></label>
            <div><label for="og-image-url" class="block text-xs font-bold text-slate-500 uppercase mb-1">Paylaşım Görseli URL veya Dosya Seç</label><input id="og-image-url" [(ngModel)]="formConfig.seoOgImage" name="seoOgImage" class="w-full p-3 border rounded" /><label class="mt-2 inline-flex min-h-11 cursor-pointer items-center rounded-lg bg-blue-50 px-4 text-xs font-black text-blue-700">Dosya Seç<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" class="sr-only" (change)="onOgImageSelected($event)" aria-label="Sosyal medya paylaşım görseli dosyası seç" /></label></div>
            <label><span class="block text-xs font-bold text-slate-500 uppercase mb-1">X Kullanıcı Adı</span><input [(ngModel)]="formConfig.seoTwitterHandle" name="seoTwitterHandle" class="w-full p-3 border rounded" /></label>
          </div>
        }

        @if (activeTab() === "integrations") {
          <div class="space-y-4"><label><span class="block text-xs font-bold text-slate-500 uppercase mb-1">Google Analytics ID</span><input [(ngModel)]="formConfig.googleAnalyticsId" name="googleAnalyticsId" class="w-full p-3 bg-slate-50 border rounded font-mono" /></label><label><span class="block text-xs font-bold text-slate-500 uppercase mb-1">Google Ads ID</span><input [(ngModel)]="formConfig.googleAdsId" name="googleAdsId" class="w-full p-3 bg-slate-50 border rounded font-mono" /></label><label><span class="block text-xs font-bold text-slate-500 uppercase mb-1">Meta Pixel ID</span><input [(ngModel)]="formConfig.metaPixelId" name="metaPixelId" class="w-full p-3 bg-slate-50 border rounded font-mono" /></label></div>
        }

        @if (activeTab() === "account") {
          <div class="space-y-6">
            <div class="rounded-2xl border border-slate-200 bg-slate-50 p-5"><h3 class="font-black">Admin Hesabı ve Güvenlik</h3><p class="mt-1 text-sm text-slate-500">Aktif yönetici: {{ authService.getCurrentEmail() }}</p></div>
            <div class="grid gap-4 md:grid-cols-2"><label><span class="block text-xs font-bold text-slate-500">Yeni Şifre</span><input [type]="showAdminPassword()?'text':'password'" [(ngModel)]="newAdminPassword" name="newAdminPassword" class="w-full p-3 border rounded" /></label><label><span class="block text-xs font-bold text-slate-500">Yeni Şifre Tekrar</span><input [type]="showAdminPassword()?'text':'password'" [(ngModel)]="confirmAdminPassword" name="confirmAdminPassword" class="w-full p-3 border rounded" /></label></div>
            <button type="button" (click)="changeAdminPassword()" [disabled]="changingAdminPassword()" class="min-h-11 rounded-xl bg-slate-900 px-5 text-sm font-black text-white" aria-label="Yönetici şifresini değiştir">Şifreyi Değiştir</button>
            <button type="button" (click)="generateAdminPassword()" [disabled]="changingAdminPassword()" class="min-h-11 rounded-xl bg-blue-600 px-5 text-sm font-black text-white" aria-label="Güçlü şifre oluştur ve kaydet">Güçlü Şifre Oluştur ve Kaydet</button>
            @if(generatedAdminPassword()){<div class="rounded-xl border p-4"><input [value]="generatedAdminPassword()" readonly class="w-full p-3 border rounded font-mono" aria-label="Oluşturulan yeni yönetici şifresi"/><button type="button" (click)="copyGeneratedAdminPassword()" class="mt-2 min-h-10 rounded-lg bg-slate-100 px-4 font-bold" aria-label="Oluşturulan şifreyi kopyala">Kopyala</button></div>}
            <div class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h4 class="mb-4 font-black text-slate-800">Admin Profil Fotoğrafı</h4>
              <div class="flex items-center gap-5">
                <div class="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-white">@if(formConfig.adminProfileUrl){<img [src]="formConfig.adminProfileUrl" alt="Admin profil" class="h-full w-full object-cover"/>}</div>
                <div class="min-w-0 flex-1">
                  <label for="admin-profile-url" class="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-500">Profil fotoğrafı URL veya Dosya Seç</label>
                  <input id="admin-profile-url" [(ngModel)]="formConfig.adminProfileUrl" name="adminProfileUrl" class="w-full rounded-lg border bg-white p-3 text-sm" placeholder="https://..." />
                  <label class="mt-2 inline-flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-4 text-xs font-black text-blue-700">Dosya Seç<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" class="sr-only" (change)="onAdminProfileSelected($event)" aria-label="Admin profil fotoğrafı dosyası seç" /></label>
                </div>
              </div>
            </div>
          </div>
        }

        <div class="sticky bottom-4 bg-white/90 backdrop-blur p-4 border-t border-slate-200 shadow-lg rounded-xl mt-8 z-10"><button type="submit" class="w-full py-4 bg-slate-900 hover:bg-blue-500 text-white font-bold rounded-lg uppercase tracking-widest" aria-label="Tüm site ayarlarını kaydet ve yayınla">Tüm Ayarları Kaydet ve Yayınla</button></div>
      </form>
    </div>
  `,
})
export class AdminSettingsComponent implements OnInit {
  carService = inject(CarService);
  authService = inject(AuthService);
  toastService = inject(ToastService);
  confirmService = inject(ConfirmService);
  mediaService = inject(AdminMediaService);
  router = inject(Router);
  currentConfig = this.carService.getConfig();
  faqs = this.carService.getFaqs();
  formConfig: SiteConfig = { ...this.currentConfig() };
  saveSuccess = signal(false);
  activeTab = signal<"general"|"home"|"team"|"legal"|"faq"|"seo"|"integrations"|"account">("general");
  previousTab: any = "general";
  newFaq: Partial<FaqItem> = {};

  ngOnInit() {
    this.formConfig = { ...this.currentConfig(), team: [...(this.currentConfig().team || [])] };
    if (!this.formConfig.homeContent) this.formConfig.homeContent = {} as SiteConfig['homeContent'];
  }

  switchTab(tab: any) { if(tab!==this.activeTab()){this.previousTab=this.activeTab();this.activeTab.set(tab);} }

  async onFileSelected(event: Event, member: TeamMember) {
    const input=event.target as HTMLInputElement; const file=input.files?.[0]; if(!file)return;
    try{const uploaded=await this.mediaService.uploadImage(file,"TEAM_MEMBER",String(member.id),"profile");member.image=uploaded.publicUrl;this.toastService.show("Ekip fotoğrafı Supabase Storage'a yüklendi.","success");}catch(error){this.toastService.show(error instanceof Error?error.message:"Fotoğraf yüklenemedi.","error");}finally{input.value="";}
  }
  async onLogoSelected(event: Event) { const input=event.target as HTMLInputElement;const file=input.files?.[0];if(!file)return;try{const uploaded=await this.mediaService.uploadImage(file,"SITE_CONFIG","main","logo");this.formConfig.logoUrl=uploaded.publicUrl;this.toastService.show("Logo Supabase Storage'a yüklendi.","success");}catch(error){this.toastService.show(error instanceof Error?error.message:"Logo yüklenemedi.","error");}finally{input.value="";} }
  async onAdminProfileSelected(event: Event) { const input=event.target as HTMLInputElement;const file=input.files?.[0];if(!file)return;try{const uploaded=await this.mediaService.uploadImage(file,"SITE_CONFIG","main","admin-profile");this.formConfig.adminProfileUrl=uploaded.publicUrl;this.toastService.show("Admin profil fotoğrafı Supabase Storage'a yüklendi.","success");}catch(error){this.toastService.show(error instanceof Error?error.message:"Profil fotoğrafı yüklenemedi.","error");}finally{input.value="";} }
  async onOgImageSelected(event: Event) { const input=event.target as HTMLInputElement;const file=input.files?.[0];if(!file)return;try{const uploaded=await this.mediaService.uploadImage(file,"SITE_CONFIG","main","og-image");this.formConfig.seoOgImage=uploaded.publicUrl;this.toastService.show("Paylaşım görseli Supabase Storage'a yüklendi.","success");}catch(error){this.toastService.show(error instanceof Error?error.message:"Paylaşım görseli yüklenemedi.","error");}finally{input.value="";} }

  newAdminPassword="";confirmAdminPassword="";showAdminPassword=signal(false);changingAdminPassword=signal(false);generatedAdminPassword=signal("");
  async changeAdminPassword(){this.generatedAdminPassword.set("");if(this.newAdminPassword!==this.confirmAdminPassword){this.toastService.show("Yeni şifreler birbiriyle eşleşmiyor.","error");return;}const validationError=this.authService.validateStrongPassword(this.newAdminPassword);if(validationError){this.toastService.show(validationError,"error");return;}this.changingAdminPassword.set(true);const success=await this.authService.changeCurrentPassword(this.newAdminPassword);this.changingAdminPassword.set(false);if(success){this.newAdminPassword="";this.confirmAdminPassword="";this.toastService.show("Yönetici şifresi güncellendi.","success");return;}this.toastService.show(this.authService.lastErrorMessage()||"Şifre değiştirilemedi.","error");}
  async generateAdminPassword(){this.generatedAdminPassword.set("");this.changingAdminPassword.set(true);const password=await this.authService.createStrongPasswordForCurrentUser();this.changingAdminPassword.set(false);if(password){this.generatedAdminPassword.set(password);this.toastService.show("Güçlü şifre oluşturuldu ve kaydedildi.","success");return;}this.toastService.show(this.authService.lastErrorMessage()||"Güçlü şifre oluşturulamadı.","error");}
  async copyGeneratedAdminPassword(){const password=this.generatedAdminPassword();if(!password)return;try{await navigator.clipboard.writeText(password);this.toastService.show("Şifre panoya kopyalandı.","success");}catch{this.toastService.show("Otomatik kopyalama engellendi.","error");}}
  saveConfig(event:Event){event.preventDefault();this.carService.updateConfig(this.formConfig);this.toastService.show("Ayarlar kaydedildi.","success");window.scrollTo({top:0,behavior:"smooth"});}
  addTeamMember(){const member:TeamMember={id:Date.now(),name:"",role:"",description:"",image:""};this.formConfig.team=[...(this.formConfig.team||[]),member];}
  async removeTeamMember(index:number){if(await this.confirmService.confirm({title:"Üyeyi Sil",message:"Bu ekip üyesini silmek istediğinize emin misiniz?"})){const rows=[...(this.formConfig.team||[])];rows.splice(index,1);this.formConfig.team=rows;this.toastService.show("Ekip üyesi silindi.","info");}}
  addFaq(){if(this.newFaq.question&&this.newFaq.answer){this.carService.addFaq(this.newFaq as FaqItem);this.newFaq={};}}
  async deleteFaq(id:number){if(await this.confirmService.confirm({title:"SSS Sil",message:"Silmek istediğinize emin misiniz?"})){this.carService.deleteFaq(id);this.toastService.show("Soru silindi.","info");}}
  updateFaq(faq:FaqItem){this.carService.addFaq(faq);}
  goBack(){this.router.navigate(["/admin/dashboard"]);}
}
