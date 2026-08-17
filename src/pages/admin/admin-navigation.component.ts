import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { NavigationConfigService, NavigationItem, NavigationPreset, NavigationSettings, NavigationSurface } from '../../services/navigation-config.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-admin-navigation',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <main class="page">
      <div class="shell">
        <header class="hero">
          <p>Mobil arayüz yönetimi</p>
          <h1>Alt Bar ve Hamburger Menü</h1>
          <span>Butonları kod yazmadan ekle, kaldır, geri yükle, sırala ve canlı siteye gönder.</span>
        </header>

        <section class="master" aria-labelledby="visibility-title">
          <div>
            <h2 id="visibility-title">Görünürlük ve davranış</h2>
            <p>Alt barı veya hamburger menüyü tamamen kapatabilirsin. Otomatik gizleme açıksa alt bar aşağı kaydırırken gizlenir, yukarı kaydırırken geri gelir.</p>
          </div>
          <div class="switches">
            <label><input type="checkbox" [ngModel]="settings().mobileDockEnabled" (ngModelChange)="setEnabled('dock',$event)" aria-label="Mobil alt barı aç veya kapat" /><span>Mobil alt bar</span></label>
            <label><input type="checkbox" [ngModel]="settings().mobileDockAutoHide" (ngModelChange)="setEnabled('autoHide',$event)" aria-label="Mobil alt barı kaydırırken otomatik gizle veya sabit tut" /><span>Kaydırırken gizle</span></label>
            <label><input type="checkbox" [ngModel]="settings().mobileMenuEnabled" (ngModelChange)="setEnabled('menu',$event)" aria-label="Mobil hamburger menüyü aç veya kapat" /><span>Hamburger menü</span></label>
          </div>
        </section>

        <div class="surface-grid">
          <ng-container *ngTemplateOutlet="surfaceEditor; context: { surface: 'MOBILE_DOCK', title: 'Mobil Alt Bar', description: 'Ekranın altındaki hızlı erişim butonları. Beşten fazla öğede kartlar sıkışmaz, yatay kaydırma devreye girer.' }"></ng-container>
          <ng-container *ngTemplateOutlet="surfaceEditor; context: { surface: 'MOBILE_MENU', title: 'Hamburger Menü', description: 'Mobil hamburger açıldığında görünen ana navigasyon bağlantıları.' }"></ng-container>
        </div>

        <ng-template #surfaceEditor let-surface="surface" let-title="title" let-description="description">
          <section class="surface" [attr.aria-labelledby]="surface + '-title'">
            <header><div><h2 [id]="surface + '-title'">{{ title }}</h2><p>{{ description }}</p></div><span>{{ itemsFor(surface).length }} buton</span></header>

            <div class="add-box">
              <label [for]="surface + '-preset'">Hazır buton ekle</label>
              <div class="add-row">
                <select [id]="surface + '-preset'" [ngModel]="selectedPreset()[surface] || ''" (ngModelChange)="selectPreset(surface,$event)" [attr.aria-label]="title + ' için hazır buton seç'">
                  <option value="">Buton seç…</option>
                  @for (preset of availablePresets(surface); track preset.key) { <option [value]="preset.key">{{ preset.label }}</option> }
                </select>
                <button type="button" class="primary" (click)="addPreset(surface)" [disabled]="!selectedPreset()[surface]" [attr.aria-label]="title + ' bölümüne seçili butonu ekle'">Ekle</button>
              </div>
              <button type="button" class="text-button" (click)="toggleCustom(surface)" [attr.aria-expanded]="customSurface() === surface" [attr.aria-controls]="surface + '-custom'">+ Özel site içi buton</button>
              @if (customSurface() === surface) {
                <div class="custom" [id]="surface + '-custom'">
                  <label><span>Buton adı</span><input [(ngModel)]="customLabel" [name]="surface + '-custom-label'" maxlength="60" placeholder="Örn. SSS" /></label>
                  <label><span>İkon adı</span><input [(ngModel)]="customIcon" [name]="surface + '-custom-icon'" maxlength="60" placeholder="help_outline" /></label>
                  <label><span>Site içi bağlantı</span><input [(ngModel)]="customRoute" [name]="surface + '-custom-route'" maxlength="180" placeholder="/faq" /></label>
                  <button type="button" class="primary dark" (click)="addCustom(surface)" [attr.aria-label]="title + ' bölümüne özel buton ekle'">Özel Butonu Ekle</button>
                </div>
              }
            </div>

            <div class="items">
              @for (item of itemsFor(surface); track item.id; let i = $index) {
                <article class="item" [class.inactive]="!item.isActive">
                  <div class="item-summary">
                    <span class="order">{{ i + 1 }}</span><span class="icon"><mat-icon aria-hidden="true">{{ item.icon }}</mat-icon></span>
                    <div class="copy"><strong>{{ item.label }}</strong><small>{{ item.route }} · {{ item.isActive ? 'Aktif' : 'Pasif' }}</small></div>
                    <div class="actions" role="group" [attr.aria-label]="item.label + ' buton işlemleri'">
                      <button type="button" class="mini" (click)="move(surface,i,-1)" [disabled]="i===0" [attr.aria-label]="item.label + ' butonunu yukarı taşı'">↑</button>
                      <button type="button" class="mini" (click)="move(surface,i,1)" [disabled]="i===itemsFor(surface).length-1" [attr.aria-label]="item.label + ' butonunu aşağı taşı'">↓</button>
                      <button type="button" class="edit" (click)="toggleEdit(item.id)" [attr.aria-expanded]="editingId() === item.id" [attr.aria-controls]="'nav-edit-' + item.id" [attr.aria-label]="item.label + ' butonunu düzenle'">{{ editingId() === item.id ? 'Kapat' : 'Düzenle' }}</button>
                      <button type="button" class="remove" (click)="remove(item)" [attr.aria-label]="item.label + ' butonunu kaldır ve geri yüklenebilir alana taşı'">Kaldır</button>
                    </div>
                  </div>
                  @if (editingId() === item.id) {
                    <div class="item-editor" [id]="'nav-edit-' + item.id">
                      <label class="active"><input type="checkbox" [(ngModel)]="item.isActive" [name]="item.id + '-active'" [attr.aria-label]="item.label + ' butonunu aktif veya pasif yap'" /><span>Aktif</span></label>
                      <label><span>Buton adı</span><input [(ngModel)]="item.label" [name]="item.id + '-label'" maxlength="60" /></label>
                      <label><span>İkon</span><input [(ngModel)]="item.icon" [name]="item.id + '-icon'" maxlength="60" /></label>
                      <label><span>Bağlantı</span><input [(ngModel)]="item.route" [name]="item.id + '-route'" maxlength="180" /></label>
                      <button type="button" class="save" (click)="saveItem(item)" [attr.aria-label]="item.label + ' buton değişikliklerini kaydet'">Kaydet ve Yayınla</button>
                    </div>
                  }
                </article>
              } @empty {
                <div class="empty">Bu alanda buton yok. Yukarıdan yeni bir buton ekleyebilirsin.</div>
              }
            </div>

            @if (removedFor(surface).length > 0) {
              <details class="archive-box">
                <summary [attr.aria-label]="title + ' kaldırılan butonları göster'">Kaldırılanlar · {{ removedFor(surface).length }}</summary>
                <div class="archive-list">
                  @for (item of removedFor(surface); track item.id) {
                    <div class="archive-item"><span><strong>{{ item.label }}</strong><small>{{ item.route }}</small></span><button type="button" (click)="restore(item)" [attr.aria-label]="item.label + ' butonunu geri yükle'">Geri Yükle</button></div>
                  }
                </div>
              </details>
            }
          </section>
        </ng-template>
      </div>
    </main>
  `,
  styles: [`
    :host{display:block}.page{min-height:100%;background:#f5f7fb;padding:1rem;color:#0f172a}.shell{width:min(100%,1120px);margin:auto;display:grid;gap:1rem}.hero{border-radius:22px;background:#07101f;padding:1.25rem;color:#fff}.hero p{margin:0;color:#60a5fa;font-size:.65rem;font-weight:950;text-transform:uppercase;letter-spacing:.14em}.hero h1{margin:.25rem 0 0;font-size:1.55rem}.hero span{display:block;margin-top:.4rem;color:#aab7ca;font-size:.75rem;line-height:1.5}.master,.surface{border:1px solid #e2e8f0;border-radius:20px;background:#fff;box-shadow:0 8px 24px rgba(15,23,42,.05)}.master{display:grid;gap:.8rem;padding:1rem}.master h2,.surface h2{margin:0;font-size:1rem}.master p,.surface header p{margin:.25rem 0 0;color:#64748b;font-size:.68rem;line-height:1.5}.switches{display:flex;flex-wrap:wrap;gap:.5rem}.switches label{display:flex;min-height:44px;align-items:center;gap:.5rem;border-radius:12px;background:#f1f5f9;padding:0 .8rem;font-size:.72rem;font-weight:900}.surface-grid{display:grid;gap:1rem}.surface{overflow:hidden}.surface>header{display:flex;align-items:flex-start;justify-content:space-between;gap:.75rem;padding:1rem;border-bottom:1px solid #e2e8f0}.surface>header>span{flex:none;border-radius:999px;background:#eff6ff;padding:.35rem .55rem;color:#1d4ed8;font-size:.6rem;font-weight:900}.add-box{padding:.9rem;border-bottom:1px solid #e2e8f0;background:#fbfdff}.add-box>label,.custom label,.item-editor label{display:grid;gap:.3rem;color:#475569;font-size:.62rem;font-weight:900}.add-row{display:flex;gap:.45rem;margin-top:.35rem}.add-row select{min-width:0;flex:1}.text-button{margin-top:.55rem;border:0;background:transparent;padding:.3rem 0;color:#1d4ed8;font-size:.68rem;font-weight:900}.custom{display:grid;gap:.55rem;margin-top:.6rem;padding:.7rem;border:1px dashed #bfdbfe;border-radius:14px;background:#eff6ff}.items{display:grid;gap:.5rem;padding:.8rem}.item{border:1px solid #e2e8f0;border-radius:14px;background:#fff;overflow:hidden}.item.inactive{opacity:.62}.item-summary{display:flex;align-items:center;gap:.5rem;padding:.6rem}.order,.icon{display:grid;place-items:center;flex:none;border-radius:9px}.order{width:30px;height:30px;background:#eef2ff;color:#3730a3;font-size:.64rem;font-weight:950}.icon{width:34px;height:34px;background:#f1f5f9;color:#1d4ed8}.icon mat-icon{font-size:20px;width:20px;height:20px}.copy{min-width:0;flex:1}.copy strong{display:block;font-size:.72rem}.copy small{display:block;margin-top:.15rem;color:#64748b;font-size:.57rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.actions{display:flex;flex-wrap:wrap;gap:.25rem}.mini,.edit,.remove,.primary,.save{border:0;border-radius:10px;min-height:38px;padding:0 .55rem;font:inherit;font-size:.63rem;font-weight:900;cursor:pointer}.mini{min-width:36px;background:#f1f5f9;color:#334155}.edit{background:#dbeafe;color:#1d4ed8}.remove{background:#fff1f2;color:#be123c}.primary{background:#2563eb;color:#fff;min-height:44px;padding:0 .85rem}.primary.dark{background:#0f172a}.save{background:#16a34a;color:#fff;min-height:44px}.mini:disabled,.primary:disabled{opacity:.4}.item-editor{display:grid;gap:.6rem;border-top:1px solid #e2e8f0;background:#f8fafc;padding:.75rem}.item-editor .active{display:flex;align-items:center;gap:.4rem}.empty{border:1px dashed #cbd5e1;border-radius:14px;padding:1rem;color:#64748b;font-size:.7rem;line-height:1.5}.archive-box{margin:.2rem .8rem .8rem;border:1px solid #fed7aa;border-radius:13px;background:#fff7ed}.archive-box summary{min-height:44px;display:flex;align-items:center;padding:0 .75rem;color:#9a3412;font-size:.68rem;font-weight:900;cursor:pointer}.archive-list{display:grid;gap:.4rem;padding:0 .65rem .65rem}.archive-item{display:flex;align-items:center;gap:.5rem;border-radius:10px;background:#fff;padding:.5rem}.archive-item span{min-width:0;flex:1}.archive-item strong,.archive-item small{display:block}.archive-item strong{font-size:.68rem}.archive-item small{margin-top:.12rem;color:#78716c;font-size:.57rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.archive-item button{min-height:38px;border:0;border-radius:9px;background:#0f172a;padding:0 .65rem;color:#fff;font-size:.62rem;font-weight:900}input:not([type=checkbox]),select{width:100%;min-height:44px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;padding:.6rem;color:#0f172a;font:inherit;font-size:.72rem;outline:none}input:focus,select:focus,button:focus-visible,summary:focus-visible{outline:3px solid rgba(59,130,246,.35);outline-offset:2px}@media(max-width:680px){.item-summary{align-items:flex-start;flex-wrap:wrap}.copy{min-width:calc(100% - 80px)}.actions{width:100%;padding-left:72px}.actions button{flex:1}.add-row{align-items:stretch}.add-row .primary{flex:none}.custom .primary{width:100%}}@media(min-width:760px){.master{grid-template-columns:1fr auto;align-items:center}.surface-grid{grid-template-columns:1fr 1fr}.item-editor{grid-template-columns:auto 1fr 1fr 1.4fr auto;align-items:end}.custom{grid-template-columns:1fr .8fr 1.3fr auto;align-items:end}}
  `],
})
export class AdminNavigationComponent implements OnInit {
  readonly navigation = inject(NavigationConfigService);
  private readonly toast = inject(ToastService);
  readonly settings = computed(() => this.navigation.settings());
  readonly selectedPreset = signal<Record<NavigationSurface,string>>({ MOBILE_DOCK:'', MOBILE_MENU:'' });
  readonly editingId = signal<string | null>(null);
  readonly customSurface = signal<NavigationSurface | null>(null);
  customLabel = '';
  customIcon = 'link';
  customRoute = '/';

  async ngOnInit(): Promise<void> { try { await this.navigation.refreshAdmin(); } catch (error) { this.toast.show(this.message(error),'error'); } }
  itemsFor(surface: NavigationSurface): NavigationItem[] { return this.navigation.itemsFor(surface,true); }
  removedFor(surface: NavigationSurface): NavigationItem[] { return this.navigation.archivedItemsFor(surface); }
  availablePresets(surface: NavigationSurface): NavigationPreset[] { const existing = new Set(this.itemsFor(surface).map((item) => item.itemKey)); return this.navigation.presets.filter((preset) => !existing.has(preset.key)); }
  selectPreset(surface: NavigationSurface, key: string): void { this.selectedPreset.update((state) => ({ ...state, [surface]:key })); }
  toggleEdit(id: string): void { this.editingId.update((current) => current === id ? null : id); }
  toggleCustom(surface: NavigationSurface): void { this.customSurface.update((current) => current === surface ? null : surface); }

  async setEnabled(target: 'dock'|'menu'|'autoHide', enabled: boolean): Promise<void> {
    const current = this.settings();
    const next: NavigationSettings = {
      mobileDockEnabled: target === 'dock' ? enabled : current.mobileDockEnabled,
      mobileMenuEnabled: target === 'menu' ? enabled : current.mobileMenuEnabled,
      mobileDockAutoHide: target === 'autoHide' ? enabled : current.mobileDockAutoHide,
    };
    try { await this.navigation.saveSettings(next); this.toast.show('Mobil navigasyon ayarı güncellendi.','success'); } catch (error) { this.toast.show(this.message(error),'error'); }
  }

  async addPreset(surface: NavigationSurface): Promise<void> { const key=this.selectedPreset()[surface]; const preset=this.navigation.presets.find((item)=>item.key===key); if(!preset)return; try{await this.navigation.addPreset(surface,preset);this.selectPreset(surface,'');this.toast.show('Buton eklendi ve canlıya gönderildi.','success');}catch(error){this.toast.show(this.message(error),'error');} }
  async addCustom(surface: NavigationSurface): Promise<void> { try{await this.navigation.addCustom(surface,{label:this.customLabel,icon:this.customIcon,route:this.customRoute});this.customLabel='';this.customIcon='link';this.customRoute='/';this.customSurface.set(null);this.toast.show('Özel buton eklendi.','success');}catch(error){this.toast.show(this.message(error),'error');} }
  async saveItem(item: NavigationItem): Promise<void> { try{await this.navigation.updateItem(item);this.editingId.set(null);this.toast.show('Buton güncellendi ve canlıya gönderildi.','success');}catch(error){this.toast.show(this.message(error),'error');} }
  async remove(item: NavigationItem): Promise<void> { if(typeof window!=='undefined'&&!window.confirm(`“${item.label}” butonunu kaldırmak istiyor musunuz? Sonradan geri yükleyebilirsiniz.`))return; try{await this.navigation.archiveItem(item.id);if(this.editingId()===item.id)this.editingId.set(null);this.toast.show('Buton kaldırıldı. Kaldırılanlar bölümünden geri yüklenebilir.','success');}catch(error){this.toast.show(this.message(error),'error');} }
  async restore(item: NavigationItem): Promise<void> { try{await this.navigation.restoreItem(item.id);this.toast.show('Buton geri yüklendi ve listenin sonuna eklendi.','success');}catch(error){this.toast.show(this.message(error),'error');} }
  async move(surface: NavigationSurface,index:number,delta:number):Promise<void>{const list=[...this.itemsFor(surface)];const target=index+delta;if(target<0||target>=list.length)return;[list[index],list[target]]=[list[target],list[index]];try{await this.navigation.reorder(surface,list.map((item)=>item.id));}catch(error){this.toast.show(this.message(error),'error');}}
  private message(error:unknown):string{return error instanceof Error?error.message:'İşlem tamamlanamadı.';}
}
