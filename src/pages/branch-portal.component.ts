import { CommonModule } from "@angular/common";
import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatIconModule } from "@angular/material/icon";
import { Router, RouterLink } from "@angular/router";
import { Vehicle } from "../models/car.model";
import { BranchPortalAuthService } from "../services/branch-portal-auth.service";
import { BranchPortalProfileService } from "../services/branch-portal-profile.service";
import { BranchPortalService, BranchVehicleDraft } from "../services/branch-portal.service";

type PortalTab = "OVERVIEW" | "LISTINGS" | "RULES" | "CUSTOMERS" | "PROFILE";

@Component({
  selector: "app-branch-portal",
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, RouterLink],
  template: `
    <main class="min-h-screen bg-slate-100 pb-24 text-slate-900">
      <header class="sticky top-0 z-40 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div class="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 md:px-8">
          <div class="flex min-w-0 items-center gap-3">
            <a routerLink="/" class="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-100" aria-label="Ana sayfaya dön"><mat-icon aria-hidden="true">home</mat-icon></a>
            <div class="min-w-0"><p class="text-[10px] font-black uppercase tracking-[.16em] text-blue-600">Alperler Auto Şube Portalı</p><h1 class="truncate text-lg font-black">{{ currentBranch()?.name || 'Şube çalışma alanı' }}</h1></div>
          </div>
          <div class="flex items-center gap-2">
            @if (portal.memberships().length > 1) {
              <select [ngModel]="portal.selectedBranchId()" (ngModelChange)="changeBranch($event)" aria-label="Yönetilecek şubeyi seç" class="hidden min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-black sm:block">@for (item of portal.memberships(); track item.branchId) {<option [value]="item.branchId">{{ item.branch.name }}</option>}</select>
            }
            <button type="button" (click)="logout()" class="grid h-11 w-11 place-items-center rounded-xl bg-slate-950 text-white" aria-label="Şube portalından çıkış yap"><mat-icon aria-hidden="true">logout</mat-icon></button>
          </div>
        </div>
      </header>

      @if (fatalError()) {
        <section class="mx-auto max-w-3xl px-4 py-14"><div role="alert" class="rounded-2xl border border-rose-200 bg-rose-50 p-6"><h2 class="text-xl font-black text-rose-950">Şube çalışma alanı açılamadı</h2><p class="mt-2 text-sm leading-6 text-rose-800">{{ fatalError() }}</p><button type="button" (click)="logout()" class="mt-5 min-h-12 rounded-xl bg-slate-950 px-5 font-black text-white">Giriş Ekranına Dön</button></div></section>
      } @else {
        <section class="border-b border-slate-200 bg-slate-950 text-white">
          <div class="mx-auto max-w-7xl px-4 py-6 md:px-8">
            <div class="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div><div class="flex flex-wrap items-center gap-2"><span [class]="branchStatusClass()" class="rounded-full px-3 py-1 text-xs font-black">{{ branchStatusLabel() }}</span><span class="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-slate-300">{{ currentMembership()?.role || '' }}</span></div><h2 class="mt-3 text-2xl font-black">{{ currentBranch()?.city }} / {{ currentBranch()?.district }}</h2><p class="mt-1 max-w-2xl text-sm leading-6 text-slate-400">{{ branchStatusExplanation() }}</p></div>
              <div class="grid grid-cols-3 gap-2 sm:min-w-[360px]"><div class="metric"><strong>{{ listingCount('PUBLISHED') }}</strong><span>Canlı</span></div><div class="metric"><strong>{{ listingCount('PENDING_REVIEW') }}</strong><span>Onay Bekliyor</span></div><div class="metric"><strong>{{ portal.bookings().length }}</strong><span>Müşteri Kaydı</span></div></div>
            </div>
          </div>
        </section>

        <nav class="border-b border-slate-200 bg-white" aria-label="Şube portalı bölümleri">
          <div class="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 py-2 md:px-8">
            @for (item of tabs; track item.key) {<button type="button" (click)="tab.set(item.key)" [class.bg-slate-950]="tab()===item.key" [class.text-white]="tab()===item.key" class="min-h-11 shrink-0 rounded-xl px-4 text-sm font-black text-slate-600">{{ item.label }}</button>}
          </div>
        </nav>

        <div class="mx-auto max-w-7xl px-4 py-6 md:px-8">
          @if (portal.loading()) {<p class="rounded-xl bg-white p-4 text-sm font-bold text-slate-500" role="status">Şube verileri güncelleniyor...</p>}
          @if (message()) {<p role="status" [class]="messageType()==='success' ? 'msg success' : 'msg error'">{{ message() }}</p>}

          @if (tab()==='OVERVIEW') {
            <section class="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
              <div class="space-y-5">
                <div class="card"><div class="card-head"><div><p class="kicker">Açılış Kontrolü</p><h2>Şubenin canlıya çıkma hazırlığı</h2></div><strong>{{ setupCompleted() }}/{{ setupRequired() }}</strong></div><div class="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"><div class="h-full bg-emerald-500" [style.width.%]="setupPercent()"></div></div><div class="mt-4 grid gap-2">@for (item of portal.setup(); track item.id) {<div class="check-item"><mat-icon [class.text-emerald-600]="item.completedAt" [class.text-slate-300]="!item.completedAt" aria-hidden="true">{{ item.completedAt ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon><div><strong>{{ item.label }}</strong>@if(item.notes){<p>{{ item.notes }}</p>}</div><span>{{ item.completedAt ? 'Tamam' : 'Bekliyor' }}</span></div>}</div><p class="mt-4 text-xs leading-5 text-slate-500">Bu kontrol listesi merkez yönetim tarafından tamamlanır. Zorunlu kuralların kabulü, fiyat ayarları, güvenlik kontrolü ve ilk ilan denetimi bitmeden şube aktive edilemez.</p></div>

                <div class="card"><div class="card-head"><div><p class="kicker">İlan Durumu</p><h2>Şubenize ait ilanlar</h2></div><button type="button" (click)="startNewListing()" class="primary-small"><mat-icon aria-hidden="true">add</mat-icon>Yeni İlan</button></div><div class="mt-4 grid gap-3 sm:grid-cols-4"><div class="summary"><strong>{{ portal.vehicles().length }}</strong><span>Toplam</span></div><div class="summary"><strong>{{ listingCount('DRAFT') }}</strong><span>Taslak</span></div><div class="summary"><strong>{{ listingCount('PENDING_REVIEW') }}</strong><span>İncelemede</span></div><div class="summary"><strong>{{ listingCount('REJECTED') }}</strong><span>Düzeltme</span></div></div></div>
              </div>

              <aside class="space-y-5">
                <div class="card"><p class="kicker">Merkezi Güvence</p><h2>Bayinin değiştiremeyeceği kurallar</h2><div class="mt-4 space-y-3"><div class="guard"><mat-icon aria-hidden="true">price_check</mat-icon><div><strong>Fiyat sınırları</strong><p>Merkez fiyat kuralı tanımlandıysa ilan bunun dışına kaydedilemez.</p></div></div><div class="guard"><mat-icon aria-hidden="true">fact_check</mat-icon><div><strong>Yayın onayı</strong><p>Şube ilanı doğrudan canlıya çıkamaz. Merkez kalite kontrolünden geçer.</p></div></div><div class="guard"><mat-icon aria-hidden="true">verified_user</mat-icon><div><strong>Müşteri standardı</strong><p>Gizli ücret, yanıltıcı ilan ve onaysız marka kullanımı kabul edilmez.</p></div></div><div class="guard"><mat-icon aria-hidden="true">hub</mat-icon><div><strong>Veri izolasyonu</strong><p>Bu portal başka bir şubenin ilan veya müşteri kaydını göstermez.</p></div></div></div></div>
                @if (currentBranch()?.slug && currentBranch()?.publicStatus==='ACTIVE') {<a [routerLink]="['/branches',currentBranch()?.slug]" class="flex min-h-14 items-center justify-between rounded-2xl bg-blue-600 px-5 font-black text-white">Canlı Şube Sayfasını Gör <mat-icon aria-hidden="true">open_in_new</mat-icon></a>}
              </aside>
            </section>
          }

          @if (tab()==='LISTINGS') {
            <section>
              <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p class="kicker">Kiralık ve Satılık</p><h2 class="text-2xl font-black">Şube İlanları</h2><p class="mt-1 text-sm text-slate-500">Burada yalnızca {{ currentBranch()?.name }} tarafından girilen ilanlar görünür.</p></div><button type="button" (click)="startNewListing()" class="primary"><mat-icon aria-hidden="true">add</mat-icon>Yeni İlan Oluştur</button></div>
              <div class="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">@for (item of portal.vehicles(); track item.cloudId || item.id) {<article class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div class="aspect-[16/9] bg-slate-900">@if(item.image){<img [src]="item.image" [alt]="vehicleTitle(item)" class="h-full w-full object-cover"/>}@else{<div class="grid h-full place-items-center text-slate-500"><mat-icon aria-hidden="true">directions_car</mat-icon></div>}</div><div class="p-4"><div class="flex items-start justify-between gap-3"><div><span [class]="listingStatusClass(item.publicationStatus)" class="rounded-full px-2 py-1 text-[10px] font-black">{{ listingStatusLabel(item.publicationStatus) }}</span><h3 class="mt-2 text-lg font-black">{{ vehicleTitle(item) }}</h3><p class="mt-1 text-xs text-slate-500">{{ item.category==='RENTAL' ? 'Kiralık' : 'Satılık' }} · {{ item.year || 'Yıl belirtilmedi' }}</p></div><strong class="text-right text-lg">{{ item.price | number:'1.0-0' }} ₺</strong></div>@if(item.rejectionReason){<p class="mt-3 rounded-xl bg-rose-50 p-3 text-xs font-bold leading-5 text-rose-800">Merkez notu: {{ item.rejectionReason }}</p>}<div class="mt-4 grid grid-cols-2 gap-2"><button type="button" (click)="editListing(item)" class="secondary">Düzenle</button><button type="button" (click)="hideListing(item)" class="secondary-danger">Yayından Çek</button></div></div></article>} @empty {<div class="col-span-full rounded-2xl border-2 border-dashed border-slate-300 bg-white p-10 text-center"><mat-icon class="text-slate-300" aria-hidden="true">directions_car</mat-icon><h3 class="mt-2 font-black">Henüz şube ilanı yok</h3><p class="mt-1 text-sm text-slate-500">İlk ilanınızı taslak olarak hazırlayabilir veya doğrudan merkez incelemesine gönderebilirsiniz.</p></div>}</div>
            </section>
          }

          @if (tab()==='RULES') {
            <section class="grid gap-5 lg:grid-cols-2">
              <div class="card"><p class="kicker">Zorunlu Ağ Kuralları</p><h2>Alperler Auto standartları</h2><p class="mt-2 text-sm leading-6 text-slate-500">Zorunlu kurallar şube aktive edilmeden önce yetkili kişi tarafından kabul edilmelidir.</p><div class="mt-5 space-y-3">@for (policy of portal.policies(); track policy.id) {<article class="rounded-xl border border-slate-200 p-4"><div class="flex items-start justify-between gap-3"><div><div class="text-[10px] font-black uppercase tracking-wider text-blue-600">{{ policy.category }} · v{{ policy.version }}</div><h3 class="mt-1 font-black">{{ policy.title }}</h3></div><span [class.bg-emerald-100]="policy.accepted" [class.text-emerald-800]="policy.accepted" [class.bg-amber-100]="!policy.accepted" [class.text-amber-800]="!policy.accepted" class="rounded-full px-2 py-1 text-[10px] font-black">{{ policy.accepted ? 'Kabul edildi' : 'Onay gerekli' }}</span></div><p class="mt-2 text-sm leading-6 text-slate-600">{{ policy.content }}</p>@if(!policy.accepted){<button type="button" (click)="acceptPolicy(policy.id)" [disabled]="saving()" class="mt-3 min-h-11 rounded-xl bg-slate-950 px-4 text-sm font-black text-white disabled:opacity-50">Okudum ve Kabul Ediyorum</button>}</article>}</div></div>

              <div class="card"><p class="kicker">Fiyat Kontrolü</p><h2>Merkezin belirlediği fiyat sınırları</h2><p class="mt-2 text-sm leading-6 text-slate-500">Şube fiyat girerken aşağıdaki kurallar veritabanında kontrol edilir. Arayüzü değiştirmek veya farklı bir istemci kullanmak bu kuralı aşmaz.</p><div class="mt-5 space-y-3">@for (rule of portal.pricing(); track rule.id) {<div class="rounded-xl bg-slate-50 p-4"><div class="flex items-center justify-between gap-3"><strong>{{ rule.category==='RENTAL' ? 'Kiralama' : rule.category==='SALE' ? 'Satış' : 'Tur' }} · {{ rule.vehicleClass==='*' ? 'Tüm sınıflar' : rule.vehicleClass }}</strong><span class="text-xs font-bold text-slate-500">{{ rule.branchId ? 'Şubeye özel' : 'Merkezi' }}</span></div><div class="mt-3 grid grid-cols-3 gap-2 text-xs"><div><span class="text-slate-500">Alt sınır</span><strong class="block">{{ rule.minPrice !== undefined ? (rule.minPrice | number:'1.0-0') + ' ₺' : 'Yok' }}</strong></div><div><span class="text-slate-500">Önerilen</span><strong class="block">{{ rule.recommendedPrice !== undefined ? (rule.recommendedPrice | number:'1.0-0') + ' ₺' : 'Yok' }}</strong></div><div><span class="text-slate-500">Üst sınır</span><strong class="block">{{ rule.maxPrice !== undefined ? (rule.maxPrice | number:'1.0-0') + ' ₺' : 'Yok' }}</strong></div></div></div>} @empty {<p class="rounded-xl bg-amber-50 p-4 text-sm font-bold text-amber-900">Bu şube için henüz özel fiyat kuralı tanımlanmamış. İlan fiyatları yine yayın kontrolünden geçer.</p>}</div></div>
            </section>
          }

          @if (tab()==='CUSTOMERS') {
            <section><div><p class="kicker">Yalnızca Bu Şube</p><h2 class="text-2xl font-black">Müşteri Talepleri</h2><p class="mt-1 text-sm text-slate-500">Bir şube ilanından gelen rezervasyon veya talep otomatik olarak o şubeye atanır.</p></div><div class="mt-5 space-y-3">@for (booking of portal.bookings(); track booking.id) {<article class="rounded-2xl border border-slate-200 bg-white p-5"><div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><div class="text-xs font-black uppercase text-blue-600">{{ booking.type || 'Müşteri talebi' }}</div><h3 class="mt-1 text-lg font-black">{{ booking.customerName || 'Müşteri' }}</h3><div class="mt-2 space-y-1 text-sm text-slate-600">@if(booking.customerPhone){<a [href]="'tel:'+booking.customerPhone" class="block font-bold text-blue-700">{{ booking.customerPhone }}</a>}@if(booking.customerEmail){<a [href]="'mailto:'+booking.customerEmail" class="block">{{ booking.customerEmail }}</a>}@if(booking.startDate){<p>{{ booking.startDate | date:'dd.MM.yyyy' }} @if(booking.endDate){ - {{ booking.endDate | date:'dd.MM.yyyy' }}}</p>}</div></div><div class="text-left sm:text-right"><span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-black">{{ booking.status }}</span>@if(booking.totalPrice !== undefined){<strong class="mt-3 block text-lg">{{ booking.totalPrice | number:'1.0-0' }} ₺</strong>}</div></div></article>} @empty {<div class="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-10 text-center"><h3 class="font-black">Henüz bu şubeye atanmış müşteri kaydı yok</h3><p class="mt-2 text-sm text-slate-500">Başka şubelerin müşteri kayıtları burada hiçbir zaman gösterilmez.</p></div>}</div></section>
          }

          @if (tab()==='PROFILE') {
            <section class="mx-auto max-w-3xl"><div class="card"><p class="kicker">Şube Sayfası</p><h2>Halka açık şube bilgileri</h2><p class="mt-2 text-sm leading-6 text-slate-500">Adres, iletişim, çalışma saatleri ve şube açıklamanızı düzenleyebilirsiniz. Marka kimliği, fiyat disiplini, yayın onayı ve güvence kuralları merkez tarafından kilitlidir.</p><div class="mt-5 space-y-4"><label class="block"><span class="field-label">Adres</span><textarea [(ngModel)]="profile.addressLabel" rows="3" class="field"></textarea></label><div class="grid gap-3 sm:grid-cols-2"><label class="block"><span class="field-label">Telefon</span><input [(ngModel)]="profile.phone" class="field" type="tel" /></label><label class="block"><span class="field-label">WhatsApp</span><input [(ngModel)]="profile.whatsapp" class="field" type="tel" /></label></div><label class="block"><span class="field-label">E-posta</span><input [(ngModel)]="profile.email" class="field" type="email" /></label><label class="block"><span class="field-label">Hizmet bölgesi</span><input [(ngModel)]="profile.territoryLabel" class="field" placeholder="Örn. Yüksekova merkez ve çevre köyler" /></label><label class="block"><span class="field-label">Şube açıklaması</span><textarea [(ngModel)]="profile.publicDescription" rows="5" class="field" maxlength="4000"></textarea></label><div class="grid gap-3 sm:grid-cols-2"><label class="block"><span class="field-label">Çalışma günleri</span><input [(ngModel)]="profile.hoursLabel" class="field" placeholder="Pazartesi - Cumartesi" /></label><label class="block"><span class="field-label">Saatler</span><input [(ngModel)]="profile.hoursValue" class="field" placeholder="08:30 - 19:00" /></label></div><button type="button" (click)="saveProfile()" [disabled]="saving()" class="primary w-full">{{ saving() ? 'Kaydediliyor...' : 'Şube Bilgilerini Kaydet' }}</button></div></div></section>
          }
        </div>
      }

      @if (listingEditor()) {
        <div class="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/75 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="listing-editor-title">
          <div class="mx-auto my-4 max-w-3xl rounded-3xl bg-white shadow-2xl">
            <div class="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4"><div><p class="kicker">{{ draft.cloudId ? 'İlanı Düzenle' : 'Yeni Şube İlanı' }}</p><h2 id="listing-editor-title" class="text-xl font-black">{{ draft.cloudId ? vehicleDraftTitle() : 'Araç bilgilerini girin' }}</h2></div><button type="button" (click)="closeEditor()" class="grid h-11 w-11 place-items-center rounded-xl bg-slate-100" aria-label="İlan düzenleyicisini kapat"><mat-icon aria-hidden="true">close</mat-icon></button></div>
            <div class="space-y-5 p-5 sm:p-6">
              <div class="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-950"><strong>Yayın kuralı:</strong> Bu ilan şube tarafından doğrudan canlıya çıkarılamaz. “Merkez İncelemesine Gönder” seçildiğinde kalite kontrol sırasına girer.</div>
              <div class="grid gap-4 sm:grid-cols-2"><label class="block"><span class="field-label">İlan türü</span><select [(ngModel)]="draft.category" class="field"><option value="RENTAL">Kiralık</option><option value="SALE">Satılık</option></select></label><label class="block"><span class="field-label">Araç sınıfı</span><input [(ngModel)]="draft.type" class="field" placeholder="SUV, Sedan, Hatchback..." /></label></div>
              <div class="grid gap-4 sm:grid-cols-2"><label class="block"><span class="field-label">Marka</span><input [(ngModel)]="draft.brand" class="field" required /></label><label class="block"><span class="field-label">Model</span><input [(ngModel)]="draft.model" class="field" required /></label></div>
              <div class="grid gap-4 sm:grid-cols-3"><label class="block"><span class="field-label">Model yılı</span><input [(ngModel)]="draft.year" class="field" type="number" min="1980" max="2100" /></label>@if(draft.category==='SALE'){<label class="block"><span class="field-label">Kilometre</span><input [(ngModel)]="draft.km" class="field" type="number" min="0" /></label>}<label class="block"><span class="field-label">Fiyat {{ draft.category==='RENTAL' ? '/ gün' : '' }}</span><input [(ngModel)]="draft.price" class="field" type="number" min="1" /></label></div>
              @if (priceHint(); as rule) {<div class="rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-950"><strong>Merkezi fiyat kuralı:</strong> @if(rule.minPrice!==undefined){Alt sınır {{ rule.minPrice | number:'1.0-0' }} ₺. }@if(rule.maxPrice!==undefined){Üst sınır {{ rule.maxPrice | number:'1.0-0' }} ₺. }@if(rule.recommendedPrice!==undefined){Önerilen {{ rule.recommendedPrice | number:'1.0-0' }} ₺.}</div>}
              <div class="grid gap-4 sm:grid-cols-3"><label class="block"><span class="field-label">Yakıt</span><input [(ngModel)]="draft.fuel" class="field" /></label><label class="block"><span class="field-label">Şanzıman</span><input [(ngModel)]="draft.transmission" class="field" /></label><label class="block"><span class="field-label">Renk</span><input [(ngModel)]="draft.color" class="field" /></label></div>
              <label class="block"><span class="field-label">Konum</span><input [(ngModel)]="draft.location" class="field" [placeholder]="(currentBranch()?.city || '') + ' / ' + (currentBranch()?.district || '')" /></label>
              <label class="block"><span class="field-label">Açıklama</span><textarea [(ngModel)]="draft.description" rows="5" class="field" maxlength="10000" placeholder="Aracın gerçek durumunu, önemli donanımlarını ve bilinmesi gerekenleri açıkça yazın."></textarea></label>
              <label class="block"><span class="field-label">Özellikler</span><input [(ngModel)]="featureText" class="field" placeholder="Klima, geri görüş kamerası, hız sabitleyici" /><span class="mt-1 block text-xs text-slate-500">Virgülle ayırabilirsiniz.</span></label>

              <fieldset class="rounded-2xl border border-slate-200 p-4"><legend class="px-1 text-xs font-black uppercase tracking-wider text-slate-500">Gerçek Araç Fotoğrafları</legend><p class="mt-1 text-xs leading-5 text-slate-500">JPG, PNG, WEBP veya AVIF. Fotoğraflar yalnızca bu şubenin klasörüne yüklenir. İlk fotoğraf kapak olur.</p><label class="mt-3 flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 font-black"><mat-icon aria-hidden="true">add_photo_alternate</mat-icon>{{ uploading() ? 'Fotoğraflar yükleniyor...' : 'Fotoğraf Seç' }}<input type="file" class="sr-only" multiple accept="image/jpeg,image/png,image/webp,image/avif" (change)="uploadImages($event)" [disabled]="uploading()" /></label>@if(draft.images?.length){<div class="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5">@for(image of draft.images; track image; let i=$index){<div class="relative aspect-square overflow-hidden rounded-xl bg-slate-100"><img [src]="image" [alt]="'Araç fotoğrafı ' + (i+1)" class="h-full w-full object-cover"/><button type="button" (click)="removeImage(i)" class="absolute right-1 top-1 grid h-8 w-8 place-items-center rounded-full bg-slate-950/80 text-white" [attr.aria-label]="'Fotoğraf ' + (i+1) + ' kaldır'"><mat-icon class="!text-[18px]" aria-hidden="true">close</mat-icon></button></div>}</div>}</fieldset>

              @if(editorError()){<p role="alert" class="rounded-xl bg-rose-50 p-4 text-sm font-bold leading-6 text-rose-800">{{ editorError() }}</p>}
              <div class="grid gap-3 sm:grid-cols-2"><button type="button" (click)="saveListing(false)" [disabled]="saving()" class="secondary min-h-13">Taslak Olarak Kaydet</button><button type="button" (click)="saveListing(true)" [disabled]="saving()" class="primary min-h-13">{{ saving() ? 'Kaydediliyor...' : 'Merkez İncelemesine Gönder' }}</button></div>
            </div>
          </div>
        </div>
      }
    </main>
  `,
  styles: [`
    .metric{display:flex;min-height:84px;flex-direction:column;align-items:center;justify-content:center;border:1px solid #1e293b;border-radius:14px;background:#020617}.metric strong{font-size:1.45rem}.metric span{margin-top:2px;font-size:.65rem;font-weight:800;color:#94a3b8}.card{border:1px solid #e2e8f0;border-radius:18px;background:white;padding:1.15rem;box-shadow:0 5px 18px rgba(15,23,42,.04)}.card-head{display:flex;align-items:start;justify-content:space-between;gap:1rem}.card h2{margin-top:.15rem;font-size:1.1rem;font-weight:900}.card-head>strong{font-size:1.2rem}.kicker{font-size:.62rem;font-weight:900;letter-spacing:.1em;text-transform:uppercase;color:#2563eb}.check-item{display:grid;grid-template-columns:auto 1fr auto;align-items:start;gap:.65rem;border-radius:12px;background:#f8fafc;padding:.75rem}.check-item strong{display:block;font-size:.78rem}.check-item p{margin-top:.15rem;font-size:.68rem;line-height:1.15rem;color:#64748b}.check-item>span{font-size:.65rem;font-weight:900;color:#64748b}.summary{display:flex;min-height:72px;flex-direction:column;align-items:center;justify-content:center;border-radius:12px;background:#f8fafc}.summary strong{font-size:1.2rem}.summary span{font-size:.65rem;font-weight:800;color:#64748b}.guard{display:flex;gap:.7rem}.guard mat-icon{flex:none;color:#2563eb}.guard strong{display:block;font-size:.8rem}.guard p{margin-top:.15rem;font-size:.7rem;line-height:1.2rem;color:#64748b}.field-label{display:block;margin-bottom:.4rem;font-size:.65rem;font-weight:900;letter-spacing:.07em;text-transform:uppercase;color:#64748b}.field{min-height:48px;width:100%;border:1px solid #cbd5e1;border-radius:12px;background:white;padding:.7rem .85rem;outline:none}.field:focus{border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,.12)}.primary,.primary-small,.secondary,.secondary-danger{display:flex;align-items:center;justify-content:center;gap:.3rem;border-radius:12px;font-weight:900}.primary{min-height:48px;background:#2563eb;padding:0 1rem;color:white}.primary-small{min-height:42px;background:#0f172a;padding:0 .8rem;color:white;font-size:.75rem}.secondary{min-height:44px;border:1px solid #cbd5e1;background:white;padding:0 .8rem;color:#0f172a}.secondary-danger{min-height:44px;border:1px solid #fecdd3;background:#fff1f2;padding:0 .8rem;color:#be123c}.msg{margin-bottom:1rem;border-radius:12px;padding:.8rem 1rem;font-size:.78rem;font-weight:800}.msg.success{background:#ecfdf5;color:#065f46}.msg.error{background:#fff1f2;color:#9f1239}
  `],
})
export class BranchPortalComponent implements OnInit {
  readonly auth = inject(BranchPortalAuthService);
  readonly portal = inject(BranchPortalService);
  private readonly profileService = inject(BranchPortalProfileService);
  private readonly router = inject(Router);

  readonly tabs: { key: PortalTab; label: string }[] = [
    { key: "OVERVIEW", label: "Genel Durum" },
    { key: "LISTINGS", label: "İlanlarım" },
    { key: "RULES", label: "Kurallar ve Fiyatlar" },
    { key: "CUSTOMERS", label: "Müşteri Talepleri" },
    { key: "PROFILE", label: "Şube Sayfam" },
  ];
  readonly tab = signal<PortalTab>("OVERVIEW");
  readonly saving = signal(false);
  readonly uploading = signal(false);
  readonly listingEditor = signal(false);
  readonly editorError = signal("");
  readonly fatalError = signal("");
  readonly message = signal("");
  readonly messageType = signal<"success" | "error">("success");

  featureText = "";
  draft: BranchVehicleDraft = this.emptyDraft();
  profile = { addressLabel: "", phone: "", whatsapp: "", email: "", territoryLabel: "", publicDescription: "", hoursLabel: "", hoursValue: "" };

  readonly currentMembership = computed(() => this.portal.currentMembership());
  readonly currentBranch = computed(() => this.currentMembership()?.branch);
  readonly setupRequired = computed(() => this.portal.setup().filter((item) => item.required).length);
  readonly setupCompleted = computed(() => this.portal.setup().filter((item) => item.required && Boolean(item.completedAt)).length);
  readonly setupPercent = computed(() => this.setupRequired() ? Math.round(this.setupCompleted() / this.setupRequired() * 100) : 0);
  priceHint() { return this.portal.priceHint(this.draft.category, this.draft.type || "*"); }

  async ngOnInit(): Promise<void> {
    try {
      if (!this.auth.isLoggedIn()) { await this.router.navigate(["/branch-portal/login"]); return; }
      const memberships = await this.portal.loadMemberships();
      if (!memberships.length) throw new Error("Bu hesap için aktif şube yetkisi bulunmuyor.");
      await this.portal.refreshWorkspace();
      this.populateProfile();
    } catch (error) {
      this.fatalError.set(error instanceof Error ? error.message : "Şube verileri yüklenemedi.");
    }
  }

  async changeBranch(branchId: string): Promise<void> {
    try { await this.portal.selectBranch(branchId); this.populateProfile(); this.flash("Şube çalışma alanı değiştirildi.", "success"); }
    catch { this.flash("Şube değiştirilemedi.", "error"); }
  }

  async logout(): Promise<void> {
    await this.auth.signOut();
    await this.router.navigate(["/branch-portal/login"]);
  }

  branchStatusLabel(): string {
    const status = this.currentBranch()?.publicStatus;
    if (status === "ACTIVE") return "Canlı Şube";
    if (status === "SUSPENDED") return "Merkez Tarafından Durduruldu";
    if (status === "CLOSED") return "Kapalı";
    return "Kurulum Aşamasında";
  }

  branchStatusClass(): string {
    const status = this.currentBranch()?.publicStatus;
    if (status === "ACTIVE") return "bg-emerald-500/15 text-emerald-300";
    if (status === "SUSPENDED" || status === "CLOSED") return "bg-rose-500/15 text-rose-300";
    return "bg-amber-500/15 text-amber-300";
  }

  branchStatusExplanation(): string {
    const status = this.currentBranch()?.publicStatus;
    if (status === "ACTIVE") return "Şube sayfanız yayında. Yeni veya değiştirilmiş ilanlar yine merkez onayından geçer.";
    if (status === "SUSPENDED") return "Şube halka kapalıdır. İlan ve müşteri akışı merkez tarafından yeniden açılana kadar durdurulmuştur.";
    if (status === "CLOSED") return "Bu şube kapatılmıştır.";
    return "Şube alanınız hazır ancak henüz halka açık değil. Kurallar, fiyatlar ve açılış kontrolleri tamamlandıktan sonra merkez aktive eder.";
  }

  listingCount(status: string): number { return this.portal.vehicles().filter((item) => item.publicationStatus === status).length; }

  startNewListing(): void {
    this.draft = this.emptyDraft();
    const branch = this.currentBranch();
    this.draft.location = [branch?.city, branch?.district].filter(Boolean).join(" / ");
    this.featureText = "";
    this.editorError.set("");
    this.listingEditor.set(true);
  }

  editListing(item: Vehicle): void {
    this.draft = {
      cloudId: item.cloudId,
      category: item.category === "SALE" ? "SALE" : "RENTAL",
      brand: item.brand || "",
      model: item.model || "",
      year: item.year,
      price: item.price || 0,
      km: item.km,
      fuel: item.fuel,
      transmission: item.transmission,
      type: item.type,
      color: item.color,
      seats: item.seats,
      location: item.location,
      description: item.description,
      features: [...(item.features || [])],
      images: [...(item.images || (item.image ? [item.image] : []))],
      coverImage: item.image,
    };
    this.featureText = (item.features || []).join(", ");
    this.editorError.set("");
    this.listingEditor.set(true);
  }

  closeEditor(): void { if (!this.saving() && !this.uploading()) this.listingEditor.set(false); }

  async saveListing(submit: boolean): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    this.editorError.set("");
    try {
      this.draft.features = this.featureText.split(",").map((item) => item.trim()).filter(Boolean);
      this.draft.coverImage = this.draft.images?.[0];
      await this.portal.saveVehicle(this.draft, submit);
      this.listingEditor.set(false);
      this.tab.set("LISTINGS");
      this.flash(submit ? "İlan merkez incelemesine gönderildi." : "İlan taslak olarak kaydedildi.", "success");
    } catch (error) {
      const code = error instanceof Error ? error.message : "SAVE_FAILED";
      this.editorError.set(code === "BRANCH_PRICE_OUTSIDE_CENTRAL_RULE" ? "Girdiğiniz fiyat merkez tarafından bu şube için belirlenen fiyat sınırının dışında. Fiyatı kurallara göre düzeltin." : code === "BRANCH_NOT_ACTIVE" ? "Şube merkez tarafından durdurulduğu için ilan değişikliği yapılamıyor." : code === "VEHICLE_REQUIRED_FIELDS" ? "Marka, model ve geçerli fiyat zorunludur." : "İlan kaydedilemedi. Bilgileri kontrol edip tekrar deneyin.");
    } finally { this.saving.set(false); }
  }

  async hideListing(item: Vehicle): Promise<void> {
    if (!item.cloudId || this.saving()) return;
    this.saving.set(true);
    try { await this.portal.hideVehicle(item.cloudId); this.flash("İlan şube tarafından görünümden çekildi ve merkez kaydında tutuldu.", "success"); }
    catch { this.flash("İlan yayından çekilemedi.", "error"); }
    finally { this.saving.set(false); }
  }

  async uploadImages(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []).slice(0, 12);
    if (!files.length || this.uploading()) return;
    this.uploading.set(true);
    this.editorError.set("");
    try {
      const uploaded: string[] = [];
      for (const file of files) uploaded.push(await this.portal.uploadVehicleImage(file));
      this.draft.images = [...(this.draft.images || []), ...uploaded].slice(0, 30);
      this.draft.coverImage = this.draft.images[0];
    } catch (error) {
      const code = error instanceof Error ? error.message : "UPLOAD_FAILED";
      this.editorError.set(code === "IMAGE_TOO_LARGE" ? "Her fotoğraf en fazla 10 MB olabilir." : code === "IMAGE_TYPE_NOT_ALLOWED" ? "Yalnızca JPG, PNG, WEBP veya AVIF fotoğraf yüklenebilir." : "Fotoğraf yüklenemedi. Lütfen tekrar deneyin.");
    } finally { this.uploading.set(false); input.value = ""; }
  }

  removeImage(index: number): void {
    const images = [...(this.draft.images || [])];
    images.splice(index, 1);
    this.draft.images = images;
    this.draft.coverImage = images[0];
  }

  async acceptPolicy(policyId: string): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    try { await this.portal.acceptPolicy(policyId); this.flash("Kural kabulü kaydedildi.", "success"); }
    catch { this.flash("Kural kabulü kaydedilemedi.", "error"); }
    finally { this.saving.set(false); }
  }

  async saveProfile(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    try {
      await this.profileService.save({
        addressLabel: this.profile.addressLabel,
        phone: this.profile.phone,
        whatsapp: this.profile.whatsapp,
        email: this.profile.email,
        territoryLabel: this.profile.territoryLabel,
        publicDescription: this.profile.publicDescription,
        workingHours: this.profile.hoursLabel && this.profile.hoursValue ? [{ label: this.profile.hoursLabel, value: this.profile.hoursValue }] : [],
      });
      this.populateProfile();
      this.flash("Şube sayfası bilgileri kaydedildi.", "success");
    } catch { this.flash("Şube bilgileri kaydedilemedi. Adres ve telefon zorunludur.", "error"); }
    finally { this.saving.set(false); }
  }

  listingStatusLabel(status?: string): string {
    return ({ DRAFT: "Taslak", PENDING_REVIEW: "Merkez Onayı Bekliyor", PUBLISHED: "Canlı", REJECTED: "Düzeltme İstendi", SUSPENDED: "Durduruldu", ARCHIVED: "Arşiv" } as Record<string,string>)[status || ""] || status || "Taslak";
  }
  listingStatusClass(status?: string): string {
    if (status === "PUBLISHED") return "bg-emerald-100 text-emerald-800";
    if (status === "PENDING_REVIEW") return "bg-blue-100 text-blue-800";
    if (status === "REJECTED" || status === "SUSPENDED") return "bg-rose-100 text-rose-800";
    return "bg-slate-100 text-slate-700";
  }
  vehicleTitle(item: Vehicle): string { return [item.brand,item.model].filter(Boolean).join(" ") || item.title || "Araç"; }
  vehicleDraftTitle(): string { return [this.draft.brand,this.draft.model].filter(Boolean).join(" ") || "Araç İlanı"; }

  private populateProfile(): void {
    const branch = this.currentBranch();
    const hours = branch?.workingHours?.[0];
    this.profile = { addressLabel: branch?.addressLabel || "", phone: branch?.phone || "", whatsapp: branch?.whatsapp || "", email: branch?.email || "", territoryLabel: branch?.territoryLabel || "", publicDescription: branch?.publicDescription || "", hoursLabel: hours?.label || "Çalışma saatleri", hoursValue: hours?.value || "" };
  }

  private emptyDraft(): BranchVehicleDraft { return { category: "RENTAL", brand: "", model: "", price: 0, features: [], images: [] }; }
  private flash(text: string, type: "success" | "error"): void { this.message.set(text); this.messageType.set(type); if (typeof window !== "undefined") window.setTimeout(() => { if (this.message() === text) this.message.set(""); }, 4500); }
}