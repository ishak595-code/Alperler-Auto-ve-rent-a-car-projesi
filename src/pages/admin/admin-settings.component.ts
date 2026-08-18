import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { CarService } from '../../services/car.service';
import { ToastService } from '../../services/toast.service';
import { AdminMediaService } from '../../services/admin-media.service';
import { SiteConfig } from '../../models/site-config.model';

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <main class="min-h-screen bg-slate-50 text-slate-950">
      <header class="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-4 shadow-sm backdrop-blur md:px-8">
        <div class="mx-auto flex max-w-6xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p class="text-[11px] font-black uppercase tracking-[.18em] text-blue-600">Profil ve temel site bilgileri</p>
            <h1 class="mt-1 text-2xl font-black md:text-3xl">Genel Ayarlar ve Profil</h1>
            <p class="mt-1 max-w-3xl text-sm leading-6 text-slate-500">Yönetici profilinizi, marka bilgilerini, logoyu ve temel iletişim bilgilerini buradan düzenleyin.</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button type="button" (click)="reload()" [disabled]="loading() || saving()" class="min-h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 disabled:opacity-50">{{ loading() ? 'Yenileniyor…' : 'Kayıtlı Bilgileri Yenile' }}</button>
            <button type="button" (click)="save()" [disabled]="loading() || saving()" class="min-h-11 rounded-xl bg-blue-600 px-5 text-sm font-black text-white shadow-lg shadow-blue-600/20 disabled:opacity-50">{{ saving() ? 'Kaydediliyor…' : 'Kaydet ve Uygula' }}</button>
          </div>
        </div>
      </header>

      <form class="mx-auto max-w-6xl space-y-6 p-4 pb-12 md:p-8" (submit)="$event.preventDefault(); save()">
        <section class="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <header class="border-b border-slate-200 p-5 md:p-6">
            <h2 class="text-xl font-black">Yönetici Profili</h2>
            <p class="mt-1 text-sm leading-6 text-slate-500">Bu bilgiler yalnız yönetim ekranında sizi tanımak ve hesabınızı ayırt etmek için kullanılır.</p>
          </header>
          <div class="grid gap-6 p-5 md:grid-cols-[180px_1fr] md:p-6">
            <div class="space-y-3">
              <div class="grid aspect-square w-36 place-items-center overflow-hidden rounded-3xl border border-slate-200 bg-slate-100">
                @if (formConfig.adminProfileUrl) {
                  <img [src]="formConfig.adminProfileUrl" alt="Yönetici profil önizlemesi" class="h-full w-full object-cover" />
                } @else {
                  <span class="text-4xl font-black text-slate-400" aria-hidden="true">A</span>
                }
              </div>
              <label class="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-4 text-xs font-black text-blue-700">
                Profil Fotoğrafı Yükle
                <input type="file" class="sr-only" accept="image/jpeg,image/png,image/webp,image/avif" (change)="onAdminProfileSelected($event)" aria-label="Yönetici profil fotoğrafı seç" />
              </label>
              @if (profileUploading()) { <p class="text-xs font-bold text-blue-600" role="status">Görsel yükleniyor…</p> }
            </div>
            <div class="grid content-start gap-4 md:grid-cols-2">
              <label class="grid gap-1.5 md:col-span-2"><span class="text-xs font-black uppercase tracking-wide text-slate-500">Yönetimde Görünen Ad</span><input [(ngModel)]="formConfig.adminDisplayName" name="adminDisplayName" autocomplete="name" class="min-h-12 rounded-xl border border-slate-300 bg-slate-50 px-4 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10" placeholder="Yönetici adı" /></label>
              <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4"><span class="text-[10px] font-black uppercase tracking-wide text-slate-400">Aktif Hesap</span><p class="mt-2 break-all text-sm font-black">{{ auth.getCurrentEmail() }}</p></div>
              <div class="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><span class="text-[10px] font-black uppercase tracking-wide text-emerald-600">Hesap Durumu</span><p class="mt-2 text-sm font-black text-emerald-950">Yönetici hesabı doğrulandı</p></div>
            </div>
          </div>
        </section>

        <section class="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <header class="border-b border-slate-200 p-5 md:p-6"><h2 class="text-xl font-black">Marka ve Kimlik</h2><p class="mt-1 text-sm leading-6 text-slate-500">Bu alanlar müşterilerin sitede gördüğü şirket adını, sloganı, logoyu ve görünüm tercihlerini belirler.</p></header>
          <div class="grid gap-5 p-5 md:grid-cols-2 md:p-6">
            <div class="md:col-span-2 grid gap-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[150px_1fr]">
              <div class="grid h-32 w-32 place-items-center overflow-hidden rounded-2xl border border-slate-200 bg-white">
                @if (formConfig.logoUrl) { <img [src]="formConfig.logoUrl" alt="Site logosu önizlemesi" class="h-full w-full object-contain p-3" /> } @else { <span class="text-sm font-black text-slate-400">Logo Yok</span> }
              </div>
              <div class="grid content-start gap-3">
                <label class="grid gap-1.5"><span class="text-xs font-black uppercase tracking-wide text-slate-500">Logo URL</span><input [(ngModel)]="formConfig.logoUrl" name="logoUrl" class="min-h-12 rounded-xl border border-slate-300 bg-white px-4 outline-none focus:border-blue-500" placeholder="https://…" /></label>
                <div class="flex flex-wrap gap-2"><label class="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-xs font-black text-slate-700">Logo Dosyası Yükle<input type="file" class="sr-only" accept="image/*" (change)="onLogoSelected($event)" aria-label="Logo dosyası seç" /></label>@if (logoUploading()) { <span class="self-center text-xs font-bold text-blue-600">Yükleniyor…</span> }</div>
              </div>
            </div>

            <label class="grid gap-1.5"><span class="text-xs font-black uppercase tracking-wide text-slate-500">Şirket Adı</span><input [(ngModel)]="formConfig.companyName" name="companyName" required class="min-h-12 rounded-xl border border-slate-300 bg-slate-50 px-4 font-bold outline-none focus:border-blue-500 focus:bg-white" /></label>
            <label class="grid gap-1.5"><span class="text-xs font-black uppercase tracking-wide text-slate-500">Slogan</span><input [(ngModel)]="formConfig.tagline" name="tagline" class="min-h-12 rounded-xl border border-slate-300 bg-slate-50 px-4 outline-none focus:border-blue-500 focus:bg-white" /></label>
            <label class="grid gap-1.5"><span class="text-xs font-black uppercase tracking-wide text-slate-500">Masaüstü Logo Genişliği</span><input [(ngModel)]="formConfig.logoWidthDesktop" name="logoWidthDesktop" type="number" min="40" max="500" class="min-h-12 rounded-xl border border-slate-300 bg-slate-50 px-4 outline-none focus:border-blue-500 focus:bg-white" /></label>
            <label class="grid gap-1.5"><span class="text-xs font-black uppercase tracking-wide text-slate-500">Mobil Logo Genişliği</span><input [(ngModel)]="formConfig.logoWidthMobile" name="logoWidthMobile" type="number" min="40" max="400" class="min-h-12 rounded-xl border border-slate-300 bg-slate-50 px-4 outline-none focus:border-blue-500 focus:bg-white" /></label>
            <label class="grid gap-1.5"><span class="text-xs font-black uppercase tracking-wide text-slate-500">Tema</span><select [(ngModel)]="formConfig.theme" name="theme" class="min-h-12 rounded-xl border border-slate-300 bg-slate-50 px-4 outline-none focus:border-blue-500 focus:bg-white"><option value="light">Açık</option><option value="dark">Koyu</option><option value="luxury">Lüks</option><option value="corporate">Kurumsal</option></select></label>
          </div>
        </section>

        <section class="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <header class="border-b border-slate-200 p-5 md:p-6"><h2 class="text-xl font-black">Temel İletişim</h2><p class="mt-1 text-sm leading-6 text-slate-500">Telefon, e-posta ve adres müşterilerin iletişim alanlarında kullanılır. WhatsApp ayarını üstteki WhatsApp sekmesinden yönetebilirsiniz.</p></header>
          <div class="grid gap-5 p-5 md:grid-cols-2 md:p-6">
            <label class="grid gap-1.5"><span class="text-xs font-black uppercase tracking-wide text-slate-500">Telefon</span><input [(ngModel)]="formConfig.phone" name="phone" autocomplete="tel" class="min-h-12 rounded-xl border border-slate-300 bg-slate-50 px-4 outline-none focus:border-blue-500 focus:bg-white" /></label>
            <label class="grid gap-1.5"><span class="text-xs font-black uppercase tracking-wide text-slate-500">E-posta</span><input [(ngModel)]="formConfig.email" name="email" type="email" autocomplete="email" class="min-h-12 rounded-xl border border-slate-300 bg-slate-50 px-4 outline-none focus:border-blue-500 focus:bg-white" /></label>
            <label class="grid gap-1.5 md:col-span-2"><span class="text-xs font-black uppercase tracking-wide text-slate-500">Adres</span><textarea [(ngModel)]="formConfig.address" name="address" rows="3" class="rounded-xl border border-slate-300 bg-slate-50 p-4 outline-none focus:border-blue-500 focus:bg-white"></textarea></label>
          </div>
        </section>

        <section class="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <header class="border-b border-slate-200 p-5 md:p-6"><h2 class="text-xl font-black">Hesap Güvenliği</h2><p class="mt-1 text-sm leading-6 text-slate-500">Buradan yönetici hesabınızın giriş şifresini değiştirebilirsiniz.</p></header>
          <div class="grid gap-5 p-5 md:grid-cols-2 md:p-6">
            <label class="grid gap-1.5"><span class="text-xs font-black uppercase tracking-wide text-slate-500">Yeni Şifre</span><input [(ngModel)]="newPassword" name="newPassword" [type]="showPassword() ? 'text' : 'password'" autocomplete="new-password" class="min-h-12 rounded-xl border border-slate-300 bg-slate-50 px-4 outline-none focus:border-blue-500 focus:bg-white" /></label>
            <label class="grid gap-1.5"><span class="text-xs font-black uppercase tracking-wide text-slate-500">Yeni Şifre Tekrar</span><input [(ngModel)]="confirmPassword" name="confirmPassword" [type]="showPassword() ? 'text' : 'password'" autocomplete="new-password" class="min-h-12 rounded-xl border border-slate-300 bg-slate-50 px-4 outline-none focus:border-blue-500 focus:bg-white" /></label>
            <div class="flex flex-wrap gap-2 md:col-span-2"><button type="button" (click)="showPassword.update(v => !v)" class="min-h-11 rounded-xl border border-slate-200 bg-slate-50 px-4 text-xs font-black text-slate-700">{{ showPassword() ? 'Şifreyi Gizle' : 'Şifreyi Göster' }}</button><button type="button" (click)="changePassword()" [disabled]="changingPassword()" class="min-h-11 rounded-xl bg-slate-950 px-5 text-xs font-black text-white disabled:opacity-50">{{ changingPassword() ? 'Güncelleniyor…' : 'Şifreyi Güncelle' }}</button></div>
          </div>
        </section>

        <div class="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-950">
          <strong class="font-black">Diğer site ayarları:</strong> Ana sayfa, menü, footer, sosyal medya, yasal metinler, SEO, SSS ve WhatsApp için üstteki ilgili sekmeyi seçin. Böylece her ayarı doğru yerde bulabilir ve aynı bilgiyle iki farklı yerde uğraşmak zorunda kalmazsınız.
        </div>
      </form>
    </main>
  `
})
export class AdminSettingsComponent implements OnInit {
  private readonly cars = inject(CarService);
  readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly media = inject(AdminMediaService);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly profileUploading = signal(false);
  readonly logoUploading = signal(false);
  readonly changingPassword = signal(false);
  readonly showPassword = signal(false);
  readonly config = this.cars.getConfig();

  formConfig: SiteConfig = this.cloneConfig(this.config());
  newPassword = '';
  confirmPassword = '';

  async ngOnInit(): Promise<void> {
    await this.reload(false);
  }

  async reload(showToast = true): Promise<void> {
    if (this.loading()) return;
    this.loading.set(true);
    try {
      await this.cars.refreshCloudCatalog(true);
      this.formConfig = this.cloneConfig(this.config());
      if (showToast) this.toast.show('Kayıtlı genel ayarlar yenilendi.', 'success');
    } catch (error) {
      console.error(error);
      this.toast.show('Kayıtlı ayarlar yüklenemedi. Mevcut değerler korunuyor.', 'error');
    } finally {
      this.loading.set(false);
    }
  }

  async save(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    try {
      await this.cars.updateConfig(this.cloneConfig(this.formConfig));
      await this.cars.refreshCloudCatalog(true);
      this.formConfig = this.cloneConfig(this.config());
      this.toast.show('Genel ayarlar kaydedildi ve siteye uygulandı.', 'success');
    } catch (error) {
      console.error(error);
      this.toast.show('Ayarlar kaydedilemedi. Bağlantınızı kontrol edip yeniden deneyin.', 'error');
    } finally {
      this.saving.set(false);
    }
  }

  async onAdminProfileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || this.profileUploading()) return;
    this.profileUploading.set(true);
    try {
      const uploaded = await this.media.uploadImage(file, 'SITE_CONFIG', 'main', 'admin-profile');
      this.formConfig.adminProfileUrl = uploaded.publicUrl;
      this.toast.show('Profil görseli yüklendi. Kaydet ve Uygula düğmesine bastığınızda yönetici profilinde kullanılacak.', 'success');
    } catch (error) {
      this.toast.show(error instanceof Error ? error.message : 'Profil görseli yüklenemedi.', 'error');
    } finally {
      this.profileUploading.set(false);
      input.value = '';
    }
  }

  async onLogoSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || this.logoUploading()) return;
    this.logoUploading.set(true);
    try {
      const uploaded = await this.media.uploadImage(file, 'SITE_CONFIG', 'main', 'logo');
      this.formConfig.logoUrl = uploaded.publicUrl;
      this.toast.show('Logo yüklendi. Kaydet ve Uygula düğmesine bastığınızda sitede kullanılacak.', 'success');
    } catch (error) {
      this.toast.show(error instanceof Error ? error.message : 'Logo yüklenemedi.', 'error');
    } finally {
      this.logoUploading.set(false);
      input.value = '';
    }
  }

  async changePassword(): Promise<void> {
    if (this.changingPassword()) return;
    if (this.newPassword !== this.confirmPassword) {
      this.toast.show('Yeni şifreler birbiriyle eşleşmiyor.', 'error');
      return;
    }
    const validationError = this.auth.validateStrongPassword(this.newPassword);
    if (validationError) {
      this.toast.show(validationError, 'error');
      return;
    }
    this.changingPassword.set(true);
    try {
      const ok = await this.auth.changeCurrentPassword(this.newPassword);
      if (!ok) throw new Error(this.auth.lastErrorMessage() || 'Şifre güncellenemedi.');
      this.newPassword = '';
      this.confirmPassword = '';
      this.toast.show('Yönetici şifresi başarıyla güncellendi.', 'success');
    } catch (error) {
      this.toast.show(error instanceof Error ? error.message : 'Şifre güncellenemedi.', 'error');
    } finally {
      this.changingPassword.set(false);
    }
  }

  private cloneConfig(value: SiteConfig): SiteConfig {
    return JSON.parse(JSON.stringify(value)) as SiteConfig;
  }
}
