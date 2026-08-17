import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CarService } from '../../services/car.service';
import { ToastService } from '../../services/toast.service';
import { AdminMediaService } from '../../services/admin-media.service';
import { SiteConfig } from '../../models/site-config.model';

@Component({
  selector: 'app-admin-seo-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <main class="min-h-screen bg-slate-50 text-slate-950">
      <header class="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-4 shadow-sm backdrop-blur md:px-8">
        <div class="mx-auto flex max-w-6xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div><p class="text-[11px] font-black uppercase tracking-[.18em] text-violet-600">Canlı site_config</p><h1 class="mt-1 text-2xl font-black md:text-3xl">SEO ve Ölçüm</h1><p class="mt-1 max-w-3xl text-sm leading-6 text-slate-500">Arama görünürlüğü, sosyal paylaşım kartları ve ölçüm kimliklerini tek bir uzman ekranından yönetin.</p></div>
          <div class="flex flex-wrap gap-2"><button type="button" (click)="reload()" [disabled]="loading() || saving()" class="min-h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 disabled:opacity-50">{{ loading() ? 'Yenileniyor…' : 'Veritabanından Yenile' }}</button><button type="button" (click)="save()" [disabled]="loading() || saving()" class="min-h-11 rounded-xl bg-violet-600 px-5 text-sm font-black text-white shadow-lg shadow-violet-600/20 disabled:opacity-50">{{ saving() ? 'Kaydediliyor…' : 'Kaydet ve Yayınla' }}</button></div>
        </div>
      </header>

      <form class="mx-auto max-w-6xl space-y-6 p-4 pb-12 md:p-8" (submit)="$event.preventDefault(); save()">
        <section class="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <header class="border-b border-slate-200 p-5 md:p-6"><h2 class="text-xl font-black">Arama Motoru Kimliği</h2><p class="mt-1 text-sm leading-6 text-slate-500">Başlık ve açıklamalar müşteri sitesinin arama sonuçlarındaki temel kimliğidir.</p></header>
          <div class="grid gap-5 p-5 md:grid-cols-2 md:p-6">
            <label class="grid gap-1.5 md:col-span-2"><span class="text-xs font-black uppercase tracking-wide text-slate-500">SEO Başlığı</span><input [(ngModel)]="form.seoTitle" name="seoTitle" class="min-h-12 rounded-xl border border-slate-300 bg-slate-50 px-4 font-bold outline-none focus:border-violet-500 focus:bg-white" /></label>
            <label class="grid gap-1.5 md:col-span-2"><span class="text-xs font-black uppercase tracking-wide text-slate-500">Meta Açıklaması</span><textarea [(ngModel)]="form.seoDescription" name="seoDescription" rows="4" class="rounded-xl border border-slate-300 bg-slate-50 p-4 outline-none focus:border-violet-500 focus:bg-white"></textarea><small class="text-xs text-slate-400">{{ (form.seoDescription || '').length }} karakter</small></label>
            <label class="grid gap-1.5 md:col-span-2"><span class="text-xs font-black uppercase tracking-wide text-slate-500">Anahtar Kelimeler</span><textarea [(ngModel)]="form.seoKeywords" name="seoKeywords" rows="3" class="rounded-xl border border-slate-300 bg-slate-50 p-4 outline-none focus:border-violet-500 focus:bg-white"></textarea></label>
            <label class="grid gap-1.5"><span class="text-xs font-black uppercase tracking-wide text-slate-500">Yazar / Kurum</span><input [(ngModel)]="form.seoAuthor" name="seoAuthor" class="min-h-12 rounded-xl border border-slate-300 bg-slate-50 px-4 outline-none focus:border-violet-500 focus:bg-white" /></label>
            <label class="grid gap-1.5"><span class="text-xs font-black uppercase tracking-wide text-slate-500">X Kullanıcı Adı</span><input [(ngModel)]="form.seoTwitterHandle" name="seoTwitterHandle" class="min-h-12 rounded-xl border border-slate-300 bg-slate-50 px-4 outline-none focus:border-violet-500 focus:bg-white" placeholder="@alperlerauto" /></label>
          </div>
        </section>

        <section class="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <header class="border-b border-slate-200 p-5 md:p-6"><h2 class="text-xl font-black">Sosyal Paylaşım Kartı</h2><p class="mt-1 text-sm leading-6 text-slate-500">WhatsApp, Facebook, X ve diğer platformlarda link paylaşıldığında kullanılacak içerik.</p></header>
          <div class="grid gap-5 p-5 md:grid-cols-2 md:p-6">
            <label class="grid gap-1.5 md:col-span-2"><span class="text-xs font-black uppercase tracking-wide text-slate-500">OG Başlığı</span><input [(ngModel)]="form.seoOgTitle" name="seoOgTitle" class="min-h-12 rounded-xl border border-slate-300 bg-slate-50 px-4 font-bold outline-none focus:border-violet-500 focus:bg-white" /></label>
            <label class="grid gap-1.5 md:col-span-2"><span class="text-xs font-black uppercase tracking-wide text-slate-500">OG Açıklaması</span><textarea [(ngModel)]="form.seoOgDescription" name="seoOgDescription" rows="3" class="rounded-xl border border-slate-300 bg-slate-50 p-4 outline-none focus:border-violet-500 focus:bg-white"></textarea></label>
            <div class="grid gap-4 md:col-span-2 md:grid-cols-[220px_1fr]">
              <div class="grid aspect-[1200/630] w-full place-items-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">@if (form.seoOgImage) { <img [src]="form.seoOgImage" alt="Sosyal paylaşım görseli önizlemesi" class="h-full w-full object-cover" /> } @else { <span class="text-xs font-black text-slate-400">Görsel Yok</span> }</div>
              <div class="grid content-start gap-3"><label class="grid gap-1.5"><span class="text-xs font-black uppercase tracking-wide text-slate-500">OG Görsel URL</span><input [(ngModel)]="form.seoOgImage" name="seoOgImage" class="min-h-12 rounded-xl border border-slate-300 bg-slate-50 px-4 outline-none focus:border-violet-500 focus:bg-white" /></label><label class="inline-flex min-h-11 w-fit cursor-pointer items-center justify-center rounded-xl border border-violet-200 bg-violet-50 px-4 text-xs font-black text-violet-700">Görsel Yükle<input type="file" class="sr-only" accept="image/jpeg,image/png,image/webp,image/avif" (change)="onOgImageSelected($event)" aria-label="Sosyal paylaşım görseli seç" /></label>@if (imageUploading()) { <span class="text-xs font-bold text-violet-600">Görsel yükleniyor…</span> }</div>
            </div>
          </div>
        </section>

        <section class="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <header class="border-b border-slate-200 p-5 md:p-6"><h2 class="text-xl font-black">Ölçüm ve Reklam Kimlikleri</h2><p class="mt-1 text-sm leading-6 text-slate-500">Kimlikleri yalnız ilgili hesabınız gerçekten hazır olduğunda ekleyin. Boş alanlar entegrasyonu devre dışı bırakır.</p></header>
          <div class="grid gap-5 p-5 md:grid-cols-3 md:p-6">
            <label class="grid gap-1.5"><span class="text-xs font-black uppercase tracking-wide text-slate-500">Google Analytics</span><input [(ngModel)]="form.googleAnalyticsId" name="googleAnalyticsId" class="min-h-12 rounded-xl border border-slate-300 bg-slate-50 px-4 font-mono outline-none focus:border-violet-500 focus:bg-white" placeholder="G-XXXXXXXXXX" /></label>
            <label class="grid gap-1.5"><span class="text-xs font-black uppercase tracking-wide text-slate-500">Google Ads</span><input [(ngModel)]="form.googleAdsId" name="googleAdsId" class="min-h-12 rounded-xl border border-slate-300 bg-slate-50 px-4 font-mono outline-none focus:border-violet-500 focus:bg-white" placeholder="AW-XXXXXXXXXX" /></label>
            <label class="grid gap-1.5"><span class="text-xs font-black uppercase tracking-wide text-slate-500">Meta Pixel</span><input [(ngModel)]="form.metaPixelId" name="metaPixelId" class="min-h-12 rounded-xl border border-slate-300 bg-slate-50 px-4 font-mono outline-none focus:border-violet-500 focus:bg-white" placeholder="123456789012345" /></label>
          </div>
        </section>
      </form>
    </main>
  `
})
export class AdminSeoSettingsComponent implements OnInit {
  private readonly cars = inject(CarService);
  private readonly toast = inject(ToastService);
  private readonly media = inject(AdminMediaService);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly imageUploading = signal(false);
  readonly config = this.cars.getConfig();
  form: SiteConfig = this.clone(this.config());

  async ngOnInit(): Promise<void> { await this.reload(false); }

  async reload(showToast = true): Promise<void> {
    if (this.loading()) return;
    this.loading.set(true);
    try {
      await this.cars.refreshCloudCatalog(true);
      this.form = this.clone(this.config());
      if (showToast) this.toast.show('SEO ayarları canlı veritabanından yenilendi.', 'success');
    } catch (error) {
      console.error(error);
      this.toast.show('SEO ayarları yenilenemedi.', 'error');
    } finally { this.loading.set(false); }
  }

  async save(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    try {
      await this.cars.updateConfig(this.clone(this.form));
      await this.cars.refreshCloudCatalog(true);
      this.form = this.clone(this.config());
      this.toast.show('SEO ve ölçüm ayarları Supabase’e kaydedildi.', 'success');
    } catch (error) {
      console.error(error);
      this.toast.show('SEO ayarları kaydedilemedi.', 'error');
    } finally { this.saving.set(false); }
  }

  async onOgImageSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || this.imageUploading()) return;
    this.imageUploading.set(true);
    try {
      const uploaded = await this.media.uploadImage(file, 'SITE_CONFIG', 'main', 'og-image');
      this.form.seoOgImage = uploaded.publicUrl;
      this.toast.show('Paylaşım görseli yüklendi. Yayınlamak için Kaydet ve Yayınla düğmesine basın.', 'success');
    } catch (error) {
      this.toast.show(error instanceof Error ? error.message : 'Görsel yüklenemedi.', 'error');
    } finally {
      this.imageUploading.set(false);
      input.value = '';
    }
  }

  private clone(value: SiteConfig): SiteConfig { return JSON.parse(JSON.stringify(value)) as SiteConfig; }
}
