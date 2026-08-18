import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminAccessService, AdminArea } from '../../services/admin-access.service';
import { AdminSettingsComponent } from './admin-settings.component';
import { AdminHomepageComponent } from './admin-homepage.component';
import { AdminNavigationComponent } from './admin-navigation.component';
import { AdminFooterComponent } from './admin-footer.component';
import { AdminLegalCenterComponent } from './admin-legal-center.component';
import { AdminSeoSettingsComponent } from './admin-seo-settings.component';
import { AdminFaqManagementComponent } from './admin-faq-management.component';
import { AdminWhatsappSettingsComponent } from './admin-whatsapp-settings.component';

type SettingsSection = 'general' | 'homepage' | 'navigation' | 'footer' | 'legal' | 'seo' | 'faq' | 'whatsapp';

interface SettingsTab {
  id: SettingsSection;
  label: string;
  shortLabel: string;
  description: string;
  area: AdminArea;
}

@Component({
  selector: 'app-admin-site-settings-hub',
  standalone: true,
  imports: [
    CommonModule,
    AdminSettingsComponent,
    AdminHomepageComponent,
    AdminNavigationComponent,
    AdminFooterComponent,
    AdminLegalCenterComponent,
    AdminSeoSettingsComponent,
    AdminFaqManagementComponent,
    AdminWhatsappSettingsComponent,
  ],
  template: `
    <div class="settings-workspace">
      <header class="settings-header">
        <div class="title-row">
          <div>
            <p class="eyebrow">Site Yönetimi</p>
            <h1>Site Ayarları</h1>
            <p class="intro">Sitenin görünümünü, iletişim bilgilerini ve yayınlanan içeriklerini tek ekrandan yönetin. Bir bölüm seçtiğinizde yalnız o ayarlar aşağıda açılır.</p>
          </div>
        </div>

        <nav class="settings-tabs" aria-label="Site ayarları bölümleri">
          @for (tab of visibleTabs(); track tab.id) {
            <button
              type="button"
              class="settings-tab"
              [class.active]="activeSection() === tab.id"
              (click)="select(tab.id)"
              [attr.aria-current]="activeSection() === tab.id ? 'page' : null"
              [attr.aria-label]="tab.label + '. ' + tab.description"
            >
              <strong>{{ tab.shortLabel }}</strong>
              <span>{{ tab.description }}</span>
            </button>
          }
        </nav>
      </header>

      <section class="section-context" aria-live="polite">
        <strong>{{ currentTab()?.label }}</strong>
        <span>{{ currentTab()?.description }}</span>
      </section>

      <div class="settings-content">
        @switch (activeSection()) {
          @case ('homepage') { <app-admin-homepage /> }
          @case ('navigation') { <app-admin-navigation /> }
          @case ('footer') { <app-admin-footer /> }
          @case ('legal') { <app-admin-legal-center /> }
          @case ('seo') { <app-admin-seo-settings /> }
          @case ('faq') { <app-admin-faq-management /> }
          @case ('whatsapp') { <app-admin-whatsapp-settings /> }
          @default { <app-admin-settings /> }
        }
      </div>
    </div>
  `,
  styles: [`
    :host{display:block;min-height:100vh;background:#f8fafc;color:#0f172a}.settings-workspace{min-height:100vh}.settings-header{position:sticky;top:0;z-index:70;border-bottom:1px solid #e2e8f0;background:rgba(248,250,252,.97);box-shadow:0 8px 24px rgba(15,23,42,.06);backdrop-filter:blur(14px)}.title-row{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;width:min(100%,1240px);margin:auto;padding:1rem 3.7rem .75rem 1rem}.eyebrow{margin:0;color:#2563eb;font-size:.62rem;font-weight:950;letter-spacing:.16em;text-transform:uppercase}.title-row h1{margin:.18rem 0 0;font-size:1.55rem;font-weight:950}.intro{max-width:760px;margin:.35rem 0 0;color:#64748b;font-size:.72rem;line-height:1.55}.settings-tabs{display:flex;gap:.45rem;width:min(100%,1240px);margin:auto;overflow-x:auto;padding:0 1rem .85rem;scrollbar-width:thin}.settings-tab{min-width:145px;max-width:190px;min-height:64px;flex:0 0 auto;border:1px solid #e2e8f0;border-radius:14px;background:#fff;padding:.62rem .72rem;color:#334155;text-align:left;cursor:pointer}.settings-tab strong{display:block;font-size:.72rem;font-weight:950}.settings-tab span{display:block;margin-top:.2rem;color:#64748b;font-size:.57rem;line-height:1.35}.settings-tab.active{border-color:#2563eb;background:#eff6ff;color:#1d4ed8;box-shadow:0 0 0 2px rgba(37,99,235,.08)}.settings-tab.active span{color:#475569}.settings-tab:focus-visible{outline:3px solid #60a5fa;outline-offset:2px}.section-context{display:flex;width:min(calc(100% - 2rem),1240px);margin:.8rem auto 0;align-items:center;gap:.6rem;border:1px solid #dbeafe;border-radius:14px;background:#eff6ff;padding:.65rem .8rem;color:#1e3a8a}.section-context strong{font-size:.7rem;white-space:nowrap}.section-context span{font-size:.65rem;line-height:1.45;color:#475569}.settings-content{min-height:60vh}:host ::ng-deep .settings-content>app-admin-settings>main>header.sticky,:host ::ng-deep .settings-content>app-admin-seo-settings>main>header.sticky,:host ::ng-deep .settings-content>app-admin-faq-management>main>header.sticky,:host ::ng-deep .settings-content>app-admin-homepage .sticky.top-0,:host ::ng-deep .settings-content>app-admin-legal-center .sticky.top-0{position:static!important;top:auto!important}:host ::ng-deep .settings-content .sticky.top-16{position:static!important;top:auto!important}@media(max-width:640px){.title-row{padding-right:3.7rem}.title-row h1{font-size:1.35rem}.intro{font-size:.67rem}.settings-tabs{padding-bottom:.7rem}.settings-tab{min-width:132px;min-height:60px}.section-context{align-items:flex-start;flex-direction:column;gap:.2rem}}
  `],
})
export class AdminSiteSettingsHubComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly access = inject(AdminAccessService);
  readonly activeSection = signal<SettingsSection>('general');
  readonly accessReady = signal(false);

  readonly tabs: SettingsTab[] = [
    { id:'general', label:'Profil ve Genel Ayarlar', shortLabel:'Profil & Genel', description:'Profil, marka, logo, temel iletişim ve şifre.', area:'settings' },
    { id:'homepage', label:'Ana Sayfa Vitrini', shortLabel:'Ana Sayfa', description:'Ana sayfadaki bölümler, sıralama ve öne çıkan içerikler.', area:'content' },
    { id:'navigation', label:'Menü ve Alt Bar', shortLabel:'Menü & Alt Bar', description:'Mobil menü ve hızlı erişim butonları.', area:'settings' },
    { id:'footer', label:'Footer ve Sosyal Medya', shortLabel:'Footer & Sosyal', description:'Alt bilgi, sosyal hesaplar ve bülten görünümü.', area:'settings' },
    { id:'legal', label:'Yasal Metinler', shortLabel:'Yasal', description:'Kiralama, satış, tur, gizlilik ve diğer yasal metinler.', area:'settings' },
    { id:'seo', label:'SEO ve Ölçüm', shortLabel:'SEO & Ölçüm', description:'Arama görünürlüğü ve ziyaret ölçüm ayarları.', area:'settings' },
    { id:'faq', label:'Sık Sorulan Sorular', shortLabel:'SSS', description:'Müşterilerin gördüğü soru ve cevaplar.', area:'content' },
    { id:'whatsapp', label:'WhatsApp', shortLabel:'WhatsApp', description:'İletişim numarası ve varsayılan mesaj.', area:'settings' },
  ];

  readonly visibleTabs = computed(() => this.tabs.filter((tab) => !this.accessReady() || this.access.canCached(tab.area)));
  readonly currentTab = computed(() => this.tabs.find((tab) => tab.id === this.activeSection()) || this.tabs[0]);

  async ngOnInit(): Promise<void> {
    await this.access.refresh();
    this.accessReady.set(true);
    const requested = this.sectionFromRoute();
    const allowed = this.visibleTabs().some((tab) => tab.id === requested);
    const selected = allowed ? requested : (this.visibleTabs()[0]?.id || 'general');
    this.activeSection.set(selected);

    if (!this.router.url.startsWith('/admin/settings')) {
      await this.router.navigate(['/admin/settings'], { queryParams: { section: selected }, replaceUrl: true });
    }
  }

  select(section: SettingsSection): void {
    if (!this.visibleTabs().some((tab) => tab.id === section)) return;
    this.activeSection.set(section);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { section },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private sectionFromRoute(): SettingsSection {
    const querySection = String(this.route.snapshot.queryParamMap.get('section') || '').trim() as SettingsSection;
    if (this.tabs.some((tab) => tab.id === querySection)) return querySection;

    const explicit = String(this.route.snapshot.data['settingsSection'] || '').trim() as SettingsSection;
    if (this.tabs.some((tab) => tab.id === explicit)) return explicit;

    const map: Record<string, SettingsSection> = {
      homepage:'homepage', navigation:'navigation', footer:'footer', legal:'legal', seo:'seo', 'faq-management':'faq', whatsapp:'whatsapp', settings:'general'
    };
    const segment = this.route.snapshot.url[0]?.path || 'settings';
    return map[segment] || 'general';
  }
}
