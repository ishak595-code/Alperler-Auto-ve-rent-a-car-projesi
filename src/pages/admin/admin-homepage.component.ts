import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CarService } from '../../services/car.service';
import { CampaignService } from '../../services/campaign.service';
import {
  HomepageAdminService,
  HomepagePlacementRecord,
  HomepageSectionRecord,
  HomepageSectionSettings,
  HomepageSectionType,
} from '../../services/homepage-admin.service';
import { ToastService } from '../../services/toast.service';

interface Candidate {
  id: string;
  type: 'VEHICLE' | 'TOUR' | 'BLOG' | 'CAMPAIGN';
  label: string;
  image?: string;
  meta?: string;
}

type NewSectionKind = 'RENTAL' | 'SALE' | 'TOURS' | 'CAMPAIGN' | 'BLOG' | 'PROMO';

@Component({
  selector: 'app-admin-homepage',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <main class="min-h-full bg-slate-50 p-4 md:p-8">
      <div class="mx-auto max-w-7xl space-y-6">
        <header class="rounded-3xl bg-slate-950 p-6 text-white shadow-xl md:p-8">
          <p class="text-xs font-black uppercase tracking-[.2em] text-blue-400">Dinamik ana sayfa builder</p>
          <div class="mt-2 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h1 class="text-3xl font-black md:text-4xl">Ana Sayfa Bölümleri</h1>
              <p class="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300">Bölüm oluşturun, sırasını değiştirin, görünümünü düzenleyin ve istediğiniz kadar içerik ekleyin. Kaydettiğiniz değişiklikler Supabase üzerinden canlı siteye Realtime ile yansır.</p>
            </div>
            <div class="flex flex-wrap gap-2">
              <button type="button" (click)="creating.set(!creating())" class="min-h-12 rounded-xl bg-blue-600 px-5 font-black text-white">{{ creating() ? 'Yeni Bölümü Kapat' : '+ Yeni Bölüm' }}</button>
              <button type="button" (click)="refresh()" [disabled]="loading()" class="min-h-12 rounded-xl bg-white px-5 font-black text-slate-950 disabled:opacity-50">{{ loading() ? 'Yükleniyor…' : 'Veriyi Yenile' }}</button>
            </div>
          </div>
        </header>

        @if (error()) { <div role="alert" class="rounded-2xl border border-rose-200 bg-rose-50 p-4 font-bold text-rose-800">{{ error() }}</div> }

        @if (creating()) {
          <section class="rounded-3xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
            <div class="grid gap-4 lg:grid-cols-[1.3fr_1fr_auto] lg:items-end">
              <label class="block"><span class="label">Bölüm başlığı</span><input [(ngModel)]="newTitle" name="newTitle" maxlength="120" placeholder="Örn. Hafta Sonu İçin Seçtiklerimiz" class="control" /></label>
              <label class="block"><span class="label">Bölüm türü</span><select [(ngModel)]="newKind" name="newKind" class="control"><option value="RENTAL">Kiralık araç vitrini</option><option value="SALE">Satılık araç vitrini</option><option value="TOURS">Tur vitrini</option><option value="CAMPAIGN">Kampanya vitrini</option><option value="BLOG">Blog / rehber vitrini</option><option value="PROMO">Özel tanıtım bölümü</option></select></label>
              <button type="button" (click)="createSection()" [disabled]="!newTitle.trim()" class="min-h-12 rounded-xl bg-slate-950 px-5 font-black text-white disabled:opacity-40">Bölümü Oluştur</button>
            </div>
            <p class="mt-3 text-xs leading-relaxed text-blue-800">Yeni bölüm en alta eklenir. Oluşturduktan sonra soldaki sıra düğmeleriyle istediğiniz konuma taşıyabilirsiniz.</p>
          </section>
        }

        <section class="grid gap-5 xl:grid-cols-[350px_1fr]">
          <aside class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm xl:sticky xl:top-20 xl:self-start">
            <div class="flex items-center justify-between gap-3"><div><h2 class="text-lg font-black text-slate-900">Bölüm Sırası</h2><p class="mt-1 text-xs text-slate-500">{{ sections().length }} bölüm</p></div></div>
            <div class="mt-4 space-y-2">
              @for (section of sections(); track section.sectionKey; let i = $index) {
                <div class="rounded-2xl border border-slate-200 p-3" [class.opacity-55]="!section.isEnabled">
                  <div class="flex items-start gap-3">
                    <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 font-black text-slate-600">{{ i + 1 }}</span>
                    <div class="min-w-0 flex-1"><strong class="block truncate text-sm text-slate-900">{{ section.title }}</strong><small class="text-slate-500">{{ typeLabel(section) }} · {{ section.maxItems }} öğe</small></div>
                    <div class="flex gap-1"><button type="button" (click)="moveSection(i,-1)" [disabled]="i===0" class="move" aria-label="Bölümü yukarı taşı">↑</button><button type="button" (click)="moveSection(i,1)" [disabled]="i===sections().length-1" class="move" aria-label="Bölümü aşağı taşı">↓</button></div>
                  </div>
                  <label class="mt-3 flex min-h-10 items-center gap-2 rounded-xl bg-slate-50 px-3 text-xs font-bold"><input type="checkbox" [(ngModel)]="section.isEnabled" (change)="saveSection(section)" /> Ana sayfada göster</label>
                </div>
              }
            </div>
          </aside>

          <div class="space-y-5">
            @for (section of sections(); track section.sectionKey) {
              <article class="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <header class="border-b border-slate-100 p-5">
                  <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div><p class="text-[10px] font-black uppercase tracking-[.16em] text-blue-600">{{ typeLabel(section) }}</p><h2 class="text-xl font-black text-slate-900">{{ section.title }}</h2><p class="mt-1 text-xs text-slate-500">{{ section.sectionKey }} · {{ placementsFor(section.sectionKey).length }} bağlı içerik</p></div>
                    <div class="flex flex-wrap gap-2"><button type="button" (click)="saveSection(section)" class="min-h-10 rounded-xl bg-blue-600 px-4 text-xs font-black text-white">Bölümü Kaydet</button><button type="button" (click)="deleteSection(section)" class="min-h-10 rounded-xl bg-rose-50 px-4 text-xs font-black text-rose-700">Bölümü Sil</button></div>
                  </div>
                </header>

                <div class="grid gap-5 p-5 lg:grid-cols-2">
                  <section class="space-y-3">
                    <h3 class="text-sm font-black text-slate-900">Metin ve içerik</h3>
                    <label class="block"><span class="label">Başlık</span><input [(ngModel)]="section.title" [name]="section.sectionKey + '-title'" maxlength="140" class="control" /></label>
                    <label class="block"><span class="label">Üst rozet / kısa etiket</span><input [ngModel]="setting(section,'badge')" (ngModelChange)="setSetting(section,'badge',$event)" [name]="section.sectionKey + '-badge'" maxlength="80" class="control" placeholder="Örn. Seçili Kiralık Araçlar" /></label>
                    <label class="block"><span class="label">Açıklama</span><textarea [ngModel]="setting(section,'description')" (ngModelChange)="setSetting(section,'description',$event)" [name]="section.sectionKey + '-description'" rows="4" maxlength="600" class="control py-3" placeholder="Müşterinin bu bölümde ne bulacağını kısa ve etkileyici biçimde anlatın."></textarea></label>

                    @if (section.sectionType === 'VEHICLES') {
                      <label class="block"><span class="label">Araç kategorisi</span><select [ngModel]="setting(section,'category','RENTAL')" (ngModelChange)="setSetting(section,'category',$event)" [name]="section.sectionKey + '-category'" class="control"><option value="RENTAL">Kiralık</option><option value="SALE">Satılık</option></select></label>
                    }
                    @if (section.sectionType === 'CUSTOM') {
                      <label class="block"><span class="label">Özel bölüm davranışı</span><select [ngModel]="setting(section,'renderer','PROMO')" (ngModelChange)="setSetting(section,'renderer',$event)" [name]="section.sectionKey + '-renderer'" class="control"><option value="PROMO">Tanıtım / CTA</option><option value="BRANCHES">Şubeler</option><option value="PARTNER">Aracını Değerlendir</option></select></label>
                    }
                  </section>

                  <section class="space-y-3">
                    <h3 class="text-sm font-black text-slate-900">Görünüm</h3>
                    <div class="grid grid-cols-2 gap-3">
                      <label class="block"><span class="label">Gösterilecek öğe</span><input type="number" min="1" [(ngModel)]="section.maxItems" [name]="section.sectionKey + '-max'" class="control" /></label>
                      <label class="block"><span class="label">Düzen</span><select [ngModel]="setting(section,'layout','rail')" (ngModelChange)="setSetting(section,'layout',$event)" [name]="section.sectionKey + '-layout'" class="control"><option value="rail">Yatay vitrin</option><option value="grid">Izgara</option><option value="wide">Geniş blok</option></select></label>
                      <label class="block"><span class="label">Genişlik</span><select [ngModel]="setting(section,'width','wide')" (ngModelChange)="setSetting(section,'width',$event)" [name]="section.sectionKey + '-width'" class="control"><option value="standard">Standart</option><option value="wide">Geniş</option><option value="full">Tam genişlik</option></select></label>
                      <label class="block"><span class="label">Tema</span><select [ngModel]="setting(section,'theme','light')" (ngModelChange)="setSetting(section,'theme',$event)" [name]="section.sectionKey + '-theme'" class="control"><option value="light">Açık</option><option value="soft">Yumuşak</option><option value="dark">Koyu</option><option value="brand">Marka</option></select></label>
                    </div>
                    <label class="block"><span class="label">Arka plan görseli URL</span><input type="url" [ngModel]="setting(section,'backgroundImage')" (ngModelChange)="setSetting(section,'backgroundImage',$event)" [name]="section.sectionKey + '-background'" class="control" placeholder="https://..." /></label>
                    <label class="block"><span class="label">Kapak / bölüm görseli URL</span><input type="url" [ngModel]="setting(section,'coverImage')" (ngModelChange)="setSetting(section,'coverImage',$event)" [name]="section.sectionKey + '-cover'" class="control" placeholder="https://..." /></label>
                    <label class="block"><span class="label">Arka plan rengi</span><div class="flex gap-2"><input type="color" [ngModel]="colorValue(section)" (ngModelChange)="setSetting(section,'backgroundColor',$event)" [name]="section.sectionKey + '-color'" class="h-12 w-16 rounded-xl border border-slate-200 bg-white p-1" /><input [ngModel]="setting(section,'backgroundColor')" (ngModelChange)="setSetting(section,'backgroundColor',$event)" [name]="section.sectionKey + '-color-text'" class="control" placeholder="#ffffff" /></div></label>
                  </section>
                </div>

                <div class="border-t border-slate-100 p-5">
                  <div class="grid gap-3 md:grid-cols-2">
                    <label class="block"><span class="label">“Tümünü gör” metni</span><input [ngModel]="setting(section,'viewAllLabel')" (ngModelChange)="setSetting(section,'viewAllLabel',$event)" [name]="section.sectionKey + '-view-label'" class="control" placeholder="Tüm Kiralık Araçlar" /></label>
                    <label class="block"><span class="label">“Tümünü gör” bağlantısı</span><input [ngModel]="setting(section,'viewAllUrl')" (ngModelChange)="setSetting(section,'viewAllUrl',$event)" [name]="section.sectionKey + '-view-url'" class="control" placeholder="/fleet" /></label>
                    @if (section.sectionType === 'CUSTOM') {
                      <label class="block"><span class="label">CTA metni</span><input [ngModel]="setting(section,'ctaLabel')" (ngModelChange)="setSetting(section,'ctaLabel',$event)" [name]="section.sectionKey + '-cta-label'" class="control" placeholder="Detayları İncele" /></label>
                      <label class="block"><span class="label">CTA bağlantısı</span><input [ngModel]="setting(section,'ctaUrl')" (ngModelChange)="setSetting(section,'ctaUrl',$event)" [name]="section.sectionKey + '-cta-url'" class="control" placeholder="/contact" /></label>
                    }
                  </div>
                </div>

                @if (sectionSupportsPlacements(section)) {
                  <div class="border-t border-slate-100 p-5">
                    <div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                      <div><h3 class="text-sm font-black text-slate-900">Vitrin İçerikleri</h3><p class="mt-1 text-xs text-slate-500">İlk {{ section.maxItems }} aktif kayıt görünür. Daha fazlasını ekleyebilir, sıralayabilir ve limitinizi istediğiniz zaman büyütebilirsiniz.</p></div>
                      <div class="flex min-w-0 gap-2 md:w-[520px]"><select [ngModel]="candidateSelection()[section.sectionKey] || ''" (ngModelChange)="selectCandidate(section.sectionKey,$event)" class="control min-w-0 flex-1"><option value="">İçerik seç…</option>@for (candidate of candidatesFor(section); track candidate.type + candidate.id) { <option [value]="candidate.type + ':' + candidate.id">{{ candidate.label }}</option> }</select><button type="button" (click)="addSelected(section)" class="min-h-12 rounded-xl bg-slate-950 px-4 text-sm font-black text-white">Ekle</button></div>
                    </div>

                    <div class="mt-4 space-y-2">
                      @for (placement of placementsFor(section.sectionKey); track placement.id; let i = $index) {
                        <div class="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                          <div class="flex items-center gap-3">
                            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 font-black text-white">{{ i + 1 }}</span>
                            @if (candidateByPlacement(placement)?.image) { <img [src]="candidateByPlacement(placement)?.image" [alt]="candidateByPlacement(placement)?.label || ''" class="h-14 w-20 shrink-0 rounded-xl object-cover" /> }
                            <div class="min-w-0 flex-1"><strong class="block truncate text-sm text-slate-900">{{ candidateByPlacement(placement)?.label || placement.entityId }}</strong><small class="text-slate-500">{{ placement.entityType }} · {{ i < section.maxItems && placement.isActive ? 'Vitrinde' : placement.isActive ? 'Yedek' : 'Kapalı' }}</small></div>
                            <label class="hidden items-center gap-1 text-xs font-bold sm:flex"><input type="checkbox" [(ngModel)]="placement.isActive" (change)="savePlacement(placement)" /> Göster</label>
                            <div class="flex gap-1"><button type="button" (click)="movePlacement(section.sectionKey,i,-1)" [disabled]="i===0" class="move" aria-label="İçeriği yukarı taşı">↑</button><button type="button" (click)="movePlacement(section.sectionKey,i,1)" [disabled]="i===placementsFor(section.sectionKey).length-1" class="move" aria-label="İçeriği aşağı taşı">↓</button><button type="button" (click)="removePlacement(placement)" class="min-h-10 rounded-xl bg-rose-50 px-3 text-xs font-black text-rose-700">Çıkar</button></div>
                          </div>
                          <div class="mt-3 grid gap-2 border-t border-slate-200 pt-3 sm:grid-cols-2"><label class="block"><span class="label">Başlangıç</span><input type="datetime-local" [ngModel]="localDateTime(placement.startsAt)" (ngModelChange)="setPlacementWindow(placement,'startsAt',$event)" class="control" /></label><label class="block"><span class="label">Bitiş</span><input type="datetime-local" [ngModel]="localDateTime(placement.endsAt)" (ngModelChange)="setPlacementWindow(placement,'endsAt',$event)" class="control" /></label></div>
                        </div>
                      } @empty { <div class="rounded-2xl border border-dashed border-slate-300 p-7 text-center text-sm text-slate-500">Bu bölümde henüz içerik yok.</div> }
                    </div>
                  </div>
                }
              </article>
            }
          </div>
        </section>
      </div>
    </main>
  `,
  styles: [`
    .label{display:block;margin-bottom:.35rem;color:#64748b;font-size:.65rem;font-weight:900;letter-spacing:.07em;text-transform:uppercase}.control{width:100%;min-height:48px;border:1px solid #cbd5e1;border-radius:12px;background:#fff;padding:0 .8rem;color:#0f172a;font-size:.82rem;font-weight:700;outline:none}.control:focus{border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,.12)}textarea.control{padding-top:.7rem}.move{display:grid;width:40px;height:40px;place-items:center;border:1px solid #cbd5e1;border-radius:10px;background:#fff;color:#334155;font-weight:950}.move:disabled{opacity:.3}
  `],
})
export class AdminHomepageComponent implements OnInit {
  private readonly homepage = inject(HomepageAdminService);
  private readonly cars = inject(CarService);
  private readonly campaigns = inject(CampaignService);
  private readonly toast = inject(ToastService);

  readonly loading = this.homepage.loading;
  readonly error = signal('');
  readonly creating = signal(false);
  readonly candidateSelection = signal<Record<string, string>>({});
  readonly sections = computed(() => [...this.homepage.sections()].sort((a, b) => a.sortOrder - b.sortOrder));

  newTitle = '';
  newKind: NewSectionKind = 'RENTAL';

  ngOnInit(): void { void this.refresh(); }

  async refresh(): Promise<void> {
    this.error.set('');
    try { await Promise.all([this.homepage.refresh(), this.campaigns.refreshAdmin()]); }
    catch (error) { this.error.set(this.message(error)); }
  }

  async createSection(): Promise<void> {
    const title = this.newTitle.trim();
    if (!title) return;
    const spec = this.newSectionSpec(this.newKind);
    try {
      await this.homepage.createSection({ title, sectionType: spec.type, maxItems: 4, settings: spec.settings });
      this.newTitle = '';
      this.creating.set(false);
      this.toast.show('Yeni ana sayfa bölümü oluşturuldu.', 'success');
    } catch (error) { this.toast.show(this.message(error), 'error'); }
  }

  async deleteSection(section: HomepageSectionRecord): Promise<void> {
    if (!window.confirm(`“${section.title}” bölümünü silmek istiyor musunuz? Bu bölümdeki vitrin yerleşimleri de kaldırılır.`)) return;
    try { await this.homepage.deleteSection(section.sectionKey); this.toast.show('Bölüm kaldırıldı.', 'info'); }
    catch (error) { this.toast.show(this.message(error), 'error'); }
  }

  async saveSection(section: HomepageSectionRecord): Promise<void> {
    if (!section.title.trim()) { this.toast.show('Bölüm başlığı boş olamaz.', 'error'); return; }
    section.maxItems = Math.max(1, Math.floor(Number(section.maxItems || 1)));
    try { await this.homepage.updateSection(section); this.toast.show('Bölüm kaydedildi ve canlı vitrine gönderildi.', 'success'); }
    catch (error) { this.toast.show(this.message(error), 'error'); }
  }

  async moveSection(index: number, delta: number): Promise<void> {
    const rows = this.sections(); const target = index + delta; if (target < 0 || target >= rows.length) return;
    [rows[index], rows[target]] = [rows[target], rows[index]];
    try { await this.homepage.reorderSections(rows.map((item) => item.sectionKey)); }
    catch (error) { this.toast.show(this.message(error), 'error'); }
  }

  placementsFor(sectionKey: string): HomepagePlacementRecord[] { return this.homepage.placements().filter((item) => item.sectionKey === sectionKey).sort((a, b) => a.sortOrder - b.sortOrder); }
  sectionSupportsPlacements(section: HomepageSectionRecord): boolean { return section.sectionType !== 'CUSTOM'; }
  setting(section: HomepageSectionRecord, key: string, fallback = ''): string { const value = section.settings?.[key]; return value == null ? fallback : String(value); }
  setSetting(section: HomepageSectionRecord, key: string, value: unknown): void { section.settings = { ...(section.settings || {}), [key]: value }; }
  colorValue(section: HomepageSectionRecord): string { const value = this.setting(section, 'backgroundColor', '#ffffff'); return /^#[0-9a-f]{6}$/i.test(value) ? value : '#ffffff'; }

  typeLabel(section: HomepageSectionRecord): string {
    if (section.sectionType === 'VEHICLES') return this.setting(section, 'category', 'RENTAL') === 'SALE' ? 'Satılık Araç Vitrini' : 'Kiralık Araç Vitrini';
    if (section.sectionType === 'TOURS') return 'Tur Vitrini'; if (section.sectionType === 'CAMPAIGN') return 'Kampanya Vitrini'; if (section.sectionType === 'BLOG') return 'Blog / Rehber';
    const renderer = this.setting(section, 'renderer', 'PROMO'); return renderer === 'BRANCHES' ? 'Şubeler' : renderer === 'PARTNER' ? 'Araç Sahipleri' : 'Özel Tanıtım';
  }

  candidatesFor(section: HomepageSectionRecord): Candidate[] {
    const placed = new Set(this.placementsFor(section.sectionKey).map((item) => `${item.entityType}:${item.entityId}`));
    return this.allCandidates(section).filter((item) => !placed.has(`${item.type}:${item.id}`));
  }

  candidateByPlacement(placement: HomepagePlacementRecord): Candidate | undefined { return this.allCandidates().find((item) => item.type === placement.entityType && item.id === placement.entityId); }
  selectCandidate(sectionKey: string, value: string): void { this.candidateSelection.update((state) => ({ ...state, [sectionKey]: value })); }

  async addSelected(section: HomepageSectionRecord): Promise<void> {
    const raw = this.candidateSelection()[section.sectionKey]; if (!raw) return;
    const separator = raw.indexOf(':'); if (separator < 1) return;
    const entityType = raw.slice(0, separator) as Candidate['type']; const entityId = raw.slice(separator + 1);
    try {
      await this.homepage.addPlacement({ sectionKey: section.sectionKey, entityType, entityId, sortOrder: this.placementsFor(section.sectionKey).length + 1, isActive: true, metadata: {} });
      this.selectCandidate(section.sectionKey, ''); this.toast.show('İçerik bölüme eklendi.', 'success');
    } catch (error) { this.toast.show(this.message(error), 'error'); }
  }

  async movePlacement(sectionKey: string, index: number, delta: number): Promise<void> {
    const rows = this.placementsFor(sectionKey); const target = index + delta; if (target < 0 || target >= rows.length) return;
    [rows[index], rows[target]] = [rows[target], rows[index]];
    try { await this.homepage.reorderPlacements(rows.map((item) => item.id)); }
    catch (error) { this.toast.show(this.message(error), 'error'); }
  }

  async savePlacement(placement: HomepagePlacementRecord): Promise<void> {
    if (!this.validWindow(placement)) { this.toast.show('Bitiş zamanı başlangıçtan sonra olmalı.', 'error'); return; }
    try { await this.homepage.updatePlacement(placement); this.toast.show('Vitrin kaydı güncellendi.', 'success'); }
    catch (error) { this.toast.show(this.message(error), 'error'); }
  }

  async removePlacement(placement: HomepagePlacementRecord): Promise<void> {
    try { await this.homepage.removePlacement(placement.id); this.toast.show('İçerik vitrinden çıkarıldı.', 'info'); }
    catch (error) { this.toast.show(this.message(error), 'error'); }
  }

  async setPlacementWindow(placement: HomepagePlacementRecord, key: 'startsAt' | 'endsAt', value: string): Promise<void> {
    const previous = placement[key]; placement[key] = this.toIso(value);
    if (!this.validWindow(placement)) { placement[key] = previous; this.toast.show('Bitiş zamanı başlangıçtan sonra olmalı.', 'error'); return; }
    await this.savePlacement(placement);
  }

  localDateTime(value?: string): string { if (!value) return ''; const date = new Date(value); if (!Number.isFinite(date.getTime())) return ''; const offset = date.getTimezoneOffset() * 60_000; return new Date(date.getTime() - offset).toISOString().slice(0, 16); }

  private newSectionSpec(kind: NewSectionKind): { type: HomepageSectionType; settings: HomepageSectionSettings } {
    if (kind === 'RENTAL') return { type: 'VEHICLES', settings: { category: 'RENTAL', badge: 'Seçili Kiralık Araçlar', description: 'Planınıza uyan seçili kiralık araçları karşılaştırın.', layout: 'rail', width: 'wide', theme: 'light', viewAllLabel: 'Tüm Kiralık Araçlar', viewAllUrl: '/fleet' } };
    if (kind === 'SALE') return { type: 'VEHICLES', settings: { category: 'SALE', badge: 'Seçili İkinci El Araçlar', description: 'Öne çıkan ikinci el araçları karşılaştırın.', layout: 'rail', width: 'wide', theme: 'soft', viewAllLabel: 'Tüm Satılık Araçlar', viewAllUrl: '/sales' } };
    if (kind === 'TOURS') return { type: 'TOURS', settings: { badge: 'Yerel Rotalar', description: 'Yerel rehberlerle öne çıkan rotaları keşfedin.', layout: 'rail', width: 'wide', theme: 'dark', viewAllLabel: 'Tüm Turlar', viewAllUrl: '/tours' } };
    if (kind === 'CAMPAIGN') return { type: 'CAMPAIGN', settings: { badge: 'Seçili Avantajlar', description: 'Planınıza uyan güncel avantajları keşfedin.', layout: 'rail', width: 'wide', theme: 'dark', viewAllLabel: 'Tüm Fırsatlar', viewAllUrl: '/campaigns' } };
    if (kind === 'BLOG') return { type: 'BLOG', settings: { badge: 'Rehber & İpuçları', description: 'Yola çıkmadan önce seçili içeriklere göz atın.', layout: 'rail', width: 'wide', theme: 'light', viewAllLabel: 'Tüm Yazılar', viewAllUrl: '/blog' } };
    return { type: 'CUSTOM', settings: { renderer: 'PROMO', badge: 'AlperAuto', description: 'Bu bölümün açıklamasını düzenleyin.', layout: 'wide', width: 'wide', theme: 'brand', ctaLabel: 'Detayları İncele', ctaUrl: '/contact' } };
  }

  private allCandidates(section?: HomepageSectionRecord): Candidate[] {
    const vehicles = this.cars.getAllVehicles()().filter((item) => item.category !== 'TOUR' && item.cloudId).map((item) => ({ id: item.cloudId!, type: 'VEHICLE' as const, label: `${item.brand || ''} ${item.model || ''}`.trim(), image: item.image, meta: `${item.category === 'RENTAL' ? 'Kiralık' : 'Satılık'} · ${item.year || ''}`, category: item.category }));
    const tours = this.cars.getTours()().filter((item) => item.cloudId).map((item) => ({ id: item.cloudId!, type: 'TOUR' as const, label: item.title || 'Tur', image: item.image, meta: item.duration || 'Tur' }));
    const blogs = this.cars.getBlogPosts()().map((item: any) => ({ id: String(item.cloudId || ''), type: 'BLOG' as const, label: item.title, image: item.image, meta: item.date })).filter((item) => item.id);
    const campaigns = this.campaigns.adminCampaigns().map((item) => ({ id: item.id, type: 'CAMPAIGN' as const, label: item.title, image: item.coverImage, meta: item.publicationStatus }));
    if (!section) return [...vehicles, ...tours, ...blogs, ...campaigns];
    if (section.sectionType === 'VEHICLES') { const category = this.setting(section, 'category', 'RENTAL'); return vehicles.filter((item: any) => item.category === category); }
    if (section.sectionType === 'TOURS') return tours; if (section.sectionType === 'BLOG') return blogs; if (section.sectionType === 'CAMPAIGN') return campaigns; return [];
  }

  private validWindow(placement: HomepagePlacementRecord): boolean { if (!placement.startsAt || !placement.endsAt) return true; const start = new Date(placement.startsAt).getTime(); const end = new Date(placement.endsAt).getTime(); return Number.isFinite(start) && Number.isFinite(end) && end > start; }
  private toIso(value: string): string | undefined { if (!value?.trim()) return undefined; const date = new Date(value); return Number.isFinite(date.getTime()) ? date.toISOString() : undefined; }
  private message(error: unknown): string { return error instanceof Error ? error.message : 'İşlem tamamlanamadı.'; }
}
