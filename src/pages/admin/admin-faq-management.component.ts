import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CarService, FaqItem } from '../../services/car.service';
import { CatalogService } from '../../services/catalog.service';
import { ConfirmService } from '../../services/confirm.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-admin-faq-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <main class="min-h-screen bg-slate-50 text-slate-950">
      <header class="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-4 shadow-sm backdrop-blur md:px-8">
        <div class="mx-auto flex max-w-6xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div><p class="text-[11px] font-black uppercase tracking-[.18em] text-emerald-600">Müşteri yardım içeriği</p><h1 class="mt-1 text-2xl font-black md:text-3xl">SSS Yönetimi</h1><p class="mt-1 max-w-3xl text-sm leading-6 text-slate-500">Müşterilerin Sık Sorulan Sorular bölümünde gördüğü soru ve cevapları buradan ekleyin, düzenleyin veya yayından kaldırın.</p></div>
          <div class="flex flex-wrap gap-2"><button type="button" (click)="toggleCreate()" class="min-h-11 rounded-xl bg-emerald-600 px-5 text-sm font-black text-white shadow-lg shadow-emerald-600/20">{{ createOpen() ? 'Yeni Soruyu Kapat' : '+ Yeni Soru' }}</button><button type="button" (click)="reload()" [disabled]="loading()" class="min-h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 disabled:opacity-50">{{ loading() ? 'Yenileniyor…' : 'Kayıtları Yenile' }}</button></div>
        </div>
        <div class="mx-auto mt-4 max-w-6xl"><label class="sr-only" for="faq-search">Sorularda ara</label><input id="faq-search" [ngModel]="search()" (ngModelChange)="search.set($event)" type="search" autocomplete="off" placeholder="Soru, cevap veya kategori ara…" class="min-h-12 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10" /></div>
      </header>

      <div class="mx-auto max-w-6xl space-y-5 p-4 pb-12 md:p-8">
        @if (createOpen()) {
          <section class="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm md:p-6">
            <div class="grid gap-4 md:grid-cols-2">
              <label class="grid gap-1.5 md:col-span-2"><span class="text-xs font-black uppercase tracking-wide text-emerald-800">Yeni Soru</span><input [(ngModel)]="newQuestion" name="newQuestion" class="min-h-12 rounded-xl border border-emerald-200 bg-white px-4 font-bold outline-none focus:border-emerald-500" /></label>
              <label class="grid gap-1.5 md:col-span-2"><span class="text-xs font-black uppercase tracking-wide text-emerald-800">Cevap</span><textarea [(ngModel)]="newAnswer" name="newAnswer" rows="5" class="rounded-xl border border-emerald-200 bg-white p-4 outline-none focus:border-emerald-500"></textarea></label>
              <label class="grid gap-1.5"><span class="text-xs font-black uppercase tracking-wide text-emerald-800">Kategori</span><input [(ngModel)]="newCategory" name="newCategory" class="min-h-12 rounded-xl border border-emerald-200 bg-white px-4 outline-none focus:border-emerald-500" placeholder="Genel, Kiralama, Satış…" /></label>
              <div class="flex items-end"><button type="button" (click)="createFaq()" [disabled]="creating()" class="min-h-12 w-full rounded-xl bg-emerald-700 px-5 text-sm font-black text-white disabled:opacity-50">{{ creating() ? 'Kaydediliyor…' : 'Soruyu Kaydet' }}</button></div>
            </div>
          </section>
        }

        <div class="flex items-center justify-between gap-3"><p class="text-sm font-bold text-slate-500">{{ filteredFaqs().length }} soru gösteriliyor</p><p class="text-xs text-slate-400">Her soru ayrı kaydedilir</p></div>

        <section class="space-y-4">
          @for (faq of filteredFaqs(); track faq.cloudId || faq.id) {
            <article class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
              <div class="grid gap-4">
                <div class="flex flex-wrap items-center justify-between gap-2"><span class="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-slate-500">{{ faq.category || 'Genel' }}</span></div>
                <label class="grid gap-1.5"><span class="text-xs font-black uppercase tracking-wide text-slate-500">Soru</span><input [(ngModel)]="faq.question" [ngModelOptions]="{standalone:true}" class="min-h-12 rounded-xl border border-slate-300 bg-slate-50 px-4 font-bold outline-none focus:border-emerald-500 focus:bg-white" /></label>
                <label class="grid gap-1.5"><span class="text-xs font-black uppercase tracking-wide text-slate-500">Cevap</span><textarea [(ngModel)]="faq.answer" [ngModelOptions]="{standalone:true}" rows="5" class="rounded-xl border border-slate-300 bg-slate-50 p-4 outline-none focus:border-emerald-500 focus:bg-white"></textarea></label>
                <label class="grid gap-1.5"><span class="text-xs font-black uppercase tracking-wide text-slate-500">Kategori</span><input [(ngModel)]="faq.category" [ngModelOptions]="{standalone:true}" class="min-h-11 rounded-xl border border-slate-300 bg-slate-50 px-4 outline-none focus:border-emerald-500 focus:bg-white" /></label>
                <div class="flex flex-wrap justify-end gap-2"><button type="button" (click)="deleteFaq(faq)" [disabled]="busyId() === keyOf(faq)" class="min-h-11 rounded-xl border border-red-200 bg-red-50 px-4 text-xs font-black text-red-700 disabled:opacity-50">Yayından Kaldır</button><button type="button" (click)="saveFaq(faq)" [disabled]="busyId() === keyOf(faq)" class="min-h-11 rounded-xl bg-slate-950 px-5 text-xs font-black text-white disabled:opacity-50">{{ busyId() === keyOf(faq) ? 'İşleniyor…' : 'Kaydet' }}</button></div>
              </div>
            </article>
          } @empty {
            <div class="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm font-bold text-slate-500">Aramanızla eşleşen soru bulunamadı.</div>
          }
        </section>
      </div>
    </main>
  `
})
export class AdminFaqManagementComponent implements OnInit {
  private readonly cars = inject(CarService);
  private readonly catalog = inject(CatalogService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  readonly faqs = this.cars.getFaqs();
  readonly loading = signal(false);
  readonly creating = signal(false);
  readonly createOpen = signal(false);
  readonly busyId = signal('');
  readonly search = signal('');
  newQuestion = '';
  newAnswer = '';
  newCategory = 'Genel';

  readonly filteredFaqs = computed(() => {
    const q = this.search().trim().toLocaleLowerCase('tr-TR');
    const list = this.faqs();
    if (!q) return list;
    return list.filter(faq => `${faq.question} ${faq.answer} ${faq.category || ''}`.toLocaleLowerCase('tr-TR').includes(q));
  });

  async ngOnInit(): Promise<void> { await this.reload(false); }
  toggleCreate(): void { this.createOpen.update(value => !value); }
  keyOf(faq: FaqItem): string { return String(faq.cloudId || faq.id); }

  async reload(showToast = true): Promise<void> {
    if (this.loading()) return;
    this.loading.set(true);
    try {
      await this.cars.refreshCloudCatalog(true);
      if (showToast) this.toast.show('Sık sorulan sorular yenilendi.', 'success');
    } catch (error) {
      console.error(error);
      this.toast.show('Sık sorulan sorular yenilenemedi.', 'error');
    } finally { this.loading.set(false); }
  }

  async createFaq(): Promise<void> {
    const question = this.newQuestion.trim();
    const answer = this.newAnswer.trim();
    if (!question || !answer || this.creating()) {
      if (!question || !answer) this.toast.show('Soru ve cevap alanlarını doldurun.', 'error');
      return;
    }
    this.creating.set(true);
    try {
      await this.catalog.saveFaq({ id: Date.now(), question, answer, category: this.newCategory.trim() || 'Genel' });
      await this.cars.refreshCloudCatalog(true);
      this.newQuestion = '';
      this.newAnswer = '';
      this.newCategory = 'Genel';
      this.createOpen.set(false);
      this.toast.show('Yeni soru eklendi ve müşteri yardım bölümünde kullanılmaya hazır.', 'success');
    } catch (error) {
      console.error(error);
      this.toast.show('Yeni soru eklenemedi.', 'error');
    } finally { this.creating.set(false); }
  }

  async saveFaq(faq: FaqItem): Promise<void> {
    const key = this.keyOf(faq);
    if (this.busyId()) return;
    if (!faq.question.trim() || !faq.answer.trim()) {
      this.toast.show('Soru ve cevap boş olamaz.', 'error');
      return;
    }
    this.busyId.set(key);
    try {
      await this.catalog.saveFaq({ ...faq });
      await this.cars.refreshCloudCatalog(true);
      this.toast.show('Soru ve cevap güncellendi.', 'success');
    } catch (error) {
      console.error(error);
      this.toast.show('Soru güncellenemedi.', 'error');
    } finally { this.busyId.set(''); }
  }

  async deleteFaq(faq: FaqItem): Promise<void> {
    const accepted = await this.confirm.confirm({ title: 'Soruyu Yayından Kaldır', message: 'Bu soru ve cevabı müşteri yardım bölümünden kaldırmak istediğinize emin misiniz?' });
    if (!accepted || this.busyId()) return;
    this.busyId.set(this.keyOf(faq));
    try {
      await this.catalog.disableFaq({ ...faq });
      await this.cars.refreshCloudCatalog(true);
      this.toast.show('Soru müşteri yardım bölümünden kaldırıldı.', 'success');
    } catch (error) {
      console.error(error);
      this.toast.show('Soru yayından kaldırılamadı.', 'error');
    } finally { this.busyId.set(''); }
  }
}
