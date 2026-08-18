import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HomepageAdminService, HomepageSectionRecord } from '../../services/homepage-admin.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-admin-homepage-device-visibility',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="device-panel" aria-labelledby="device-visibility-title">
      <div class="panel-head">
        <div>
          <p>Responsive görünürlük</p>
          <h2 id="device-visibility-title">Telefon, Tablet ve Bilgisayar</h2>
          <span>Her ana sayfa bölümünün hangi cihazlarda görüneceğini ayrı ayrı seçin. Mevcut bölümler varsayılan olarak üç cihazda da açıktır.</span>
        </div>
        <button type="button" (click)="refresh()" aria-label="Cihaz görünürlüğü ayarlarını yenile">Yenile</button>
      </div>

      @if (homepage.loading()) {
        <p class="status" role="status">Ana sayfa bölümleri hazırlanıyor…</p>
      } @else {
        <div class="rows">
          @for (section of sections(); track section.sectionKey) {
            <article class="row" [class.disabled]="!section.isEnabled">
              <div class="section-copy">
                <strong>{{ section.title }}</strong>
                <small>{{ section.isEnabled ? 'Ana sayfada aktif' : 'Ana sayfada kapalı' }}</small>
              </div>
              <fieldset [attr.aria-label]="section.title + ' cihaz görünürlüğü'">
                <legend class="sr-only">{{ section.title }} cihaz görünürlüğü</legend>
                <label>
                  <input type="checkbox" [ngModel]="visibleOn(section, 'showOnMobile')" (ngModelChange)="setVisibility(section, 'showOnMobile', $event)" [name]="section.sectionKey + '-phone'" [attr.aria-label]="section.title + ' bölümünü telefonda göster'" />
                  <span>Telefon</span>
                </label>
                <label>
                  <input type="checkbox" [ngModel]="visibleOn(section, 'showOnTablet')" (ngModelChange)="setVisibility(section, 'showOnTablet', $event)" [name]="section.sectionKey + '-tablet'" [attr.aria-label]="section.title + ' bölümünü tablette göster'" />
                  <span>Tablet</span>
                </label>
                <label>
                  <input type="checkbox" [ngModel]="visibleOn(section, 'showOnDesktop')" (ngModelChange)="setVisibility(section, 'showOnDesktop', $event)" [name]="section.sectionKey + '-desktop'" [attr.aria-label]="section.title + ' bölümünü bilgisayarda göster'" />
                  <span>Bilgisayar</span>
                </label>
              </fieldset>
            </article>
          }
        </div>
      }
    </section>
  `,
  styles: [`
    :host{display:block;padding:1rem 1rem 0}.device-panel{width:min(100%,1180px);margin:auto;border:1px solid #dbe4ef;border-radius:20px;background:#fff;box-shadow:0 8px 24px rgba(15,23,42,.05);overflow:hidden}.panel-head{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;padding:1rem;border-bottom:1px solid #e2e8f0}.panel-head p{margin:0;color:#2563eb;font-size:.6rem;font-weight:950;letter-spacing:.13em;text-transform:uppercase}.panel-head h2{margin:.2rem 0 0;font-size:1.05rem}.panel-head span{display:block;margin-top:.3rem;max-width:760px;color:#64748b;font-size:.7rem;line-height:1.5}.panel-head button{min-height:42px;border:1px solid #cbd5e1;border-radius:11px;background:#f8fafc;padding:0 .8rem;color:#0f172a;font-size:.68rem;font-weight:900}.rows{display:grid;gap:.55rem;padding:.8rem}.row{display:flex;align-items:center;justify-content:space-between;gap:.8rem;border:1px solid #e2e8f0;border-radius:14px;background:#fbfdff;padding:.7rem}.row.disabled{opacity:.62}.section-copy{min-width:0;flex:1}.section-copy strong{display:block;font-size:.75rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.section-copy small{display:block;margin-top:.15rem;color:#64748b;font-size:.58rem}.row fieldset{display:flex;flex-wrap:wrap;gap:.35rem;border:0;padding:0}.row label{display:flex;min-height:40px;align-items:center;gap:.35rem;border:1px solid #dbe4ef;border-radius:10px;background:#fff;padding:0 .6rem;font-size:.62rem;font-weight:900}.row input{width:18px;height:18px}.status{margin:0;padding:1rem;color:#64748b;font-size:.72rem;font-weight:800}.sr-only{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}@media(max-width:680px){:host{padding:.7rem .7rem 0}.panel-head{align-items:stretch;flex-direction:column}.panel-head button{width:100%}.row{align-items:stretch;flex-direction:column}.row fieldset{width:100%}.row label{flex:1;justify-content:center}}
  `],
})
export class AdminHomepageDeviceVisibilityComponent implements OnInit {
  readonly homepage = inject(HomepageAdminService);
  private readonly toast = inject(ToastService);
  readonly sections = computed(() => this.homepage.sections());

  async ngOnInit(): Promise<void> { await this.refresh(); }

  async refresh(): Promise<void> {
    try { await this.homepage.refresh(); }
    catch (error) { this.toast.show(this.message(error), 'error'); }
  }

  visibleOn(section: HomepageSectionRecord, key: 'showOnMobile' | 'showOnTablet' | 'showOnDesktop'): boolean {
    const value = section.settings?.[key];
    return typeof value === 'boolean' ? value : true;
  }

  async setVisibility(section: HomepageSectionRecord, key: 'showOnMobile' | 'showOnTablet' | 'showOnDesktop', value: boolean): Promise<void> {
    const previous = { ...(section.settings || {}) };
    section.settings = { ...previous, [key]: Boolean(value) };
    try {
      await this.homepage.updateSection(section);
      this.toast.show(`${section.title}: cihaz görünürlüğü güncellendi.`, 'success');
    } catch (error) {
      section.settings = previous;
      this.toast.show(this.message(error), 'error');
    }
  }

  private message(error: unknown): string { return error instanceof Error ? error.message : 'İşlem tamamlanamadı.'; }
}
