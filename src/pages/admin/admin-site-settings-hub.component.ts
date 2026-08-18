import { CommonModule, Location } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminAccessService, AdminArea } from '../../services/admin-access.service';
import { AdminSettingsComponent } from './admin-settings.component';
import { AdminHomepageComponent } from './admin-homepage.component';
import { AdminHomepageDeviceVisibilityComponent } from './admin-homepage-device-visibility.component';
import { AdminNavigationComponent } from './admin-navigation.component';
import { AdminFooterComponent } from './admin-footer.component';
import { AdminLegalCenterComponent } from './admin-legal-center.component';
import { AdminSeoSettingsComponent } from './admin-seo-settings.component';
import { AdminFaqManagementComponent } from './admin-faq-management.component';
import { AdminWhatsappSettingsComponent } from './admin-whatsapp-settings.component';
import { AdminRentalPricingComponent } from './admin-rental-pricing.component';

type SettingsSection = 'general' | 'homepage' | 'rental' | 'navigation' | 'footer' | 'legal' | 'seo' | 'faq' | 'whatsapp';
interface SettingsTab { id: SettingsSection; label: string; shortLabel: string; description: string; area: AdminArea; }

@Component({
  selector: 'app-admin-site-settings-hub',
  standalone: true,
  imports: [CommonModule, AdminSettingsComponent, AdminHomepageComponent, AdminHomepageDeviceVisibilityComponent, AdminRentalPricingComponent, AdminNavigationComponent, AdminFooterComponent, AdminLegalCenterComponent, AdminSeoSettingsComponent, AdminFaqManagementComponent, AdminWhatsappSettingsComponent],
  template: `
    <div class="workspace">
      <header class="workspace-head">
        <div class="head-row">
          <button type="button" class="back" (click)="goBack()" aria-label="Önceki sayfaya dön">←</button>
          <div>
            <p>Site Yönetimi</p>
            <h1>Site Ayarları</h1>
            <span>Sitenin görünümünü, kiralama hesaplarını, iletişim bilgilerini ve yayınlanan içeriklerini tek alanda yönetin.</span>
          </div>
        </div>
        <nav class="tabs" aria-label="Site ayarları bölümleri">
          @for (tab of visibleTabs(); track tab.id) {
            <button type="button" [class.active]="activeSection() === tab.id" (click)="select(tab.id)" [attr.aria-current]="activeSection() === tab.id ? 'page' : null" [attr.aria-label]="tab.label + '. ' + tab.description">
              <strong>{{ tab.shortLabel }}</strong><small>{{ tab.description }}</small>
            </button>
          }
        </nav>
      </header>

      <main class="content">
        @if (accessReady()) {
        @switch (activeSection()) {
          @case ('homepage') { <app-admin-homepage-device-visibility /><app-admin-homepage /> }
          @case ('rental') { <app-admin-rental-pricing /> }
          @case ('navigation') { <app-admin-navigation /> }
          @case ('footer') { <app-admin-footer /> }
          @case ('legal') { <app-admin-legal-center /> }
          @case ('seo') { <app-admin-seo-settings /> }
          @case ('faq') { <app-admin-faq-management /> }
          @case ('whatsapp') { <app-admin-whatsapp-settings /> }
          @default { <app-admin-settings /> }
        }
        } @else {
          <div class="p-8 text-center text-sm font-bold text-slate-500">Yönetim alanı hazırlanıyor…</div>
        }
      </main>
    </div>
  `,
  styles: [`
    :host{display:block;min-height:100vh;background:#f8fafc;color:#0f172a}.workspace{min-height:100vh}.workspace-head{position:sticky;top:0;z-index:80;border-bottom:1px solid #e2e8f0;background:rgba(248,250,252,.97);padding:.8rem 3.7rem .7rem 1rem;box-shadow:0 6px 20px rgba(15,23,42,.05);backdrop-filter:blur(12px)}.head-row{display:flex;width:min(100%,1240px);margin:auto;align-items:flex-start;gap:.7rem}.back{display:grid;width:42px;height:42px;flex:none;place-items:center;border:1px solid #dbe4ef;border-radius:12px;background:#fff;color:#0f172a;font-size:1.15rem;font-weight:950}.head-row p{margin:0;color:#2563eb;font-size:.58rem;font-weight:950;letter-spacing:.14em;text-transform:uppercase}.head-row h1{margin:.12rem 0 0;font-size:1.4rem;font-weight:950}.head-row span{display:block;margin-top:.2rem;color:#64748b;font-size:.68rem;line-height:1.45}.tabs{display:flex;width:min(100%,1240px);margin:.65rem auto 0;gap:.4rem;overflow-x:auto}.tabs button{min-width:128px;min-height:50px;flex:0 0 auto;border:1px solid #e2e8f0;border-radius:12px;background:#fff;padding:.45rem .7rem;color:#475569;text-align:left}.tabs button strong{display:block;font-size:.67rem;font-weight:950}.tabs button small{display:block;margin-top:.15rem;color:#64748b;font-size:.54rem;line-height:1.25}.tabs button.active{border-color:#2563eb;background:#eff6ff;color:#1d4ed8}.content{min-height:70vh}:host ::ng-deep .content>app-admin-settings>main>header.sticky,:host ::ng-deep .content>app-admin-seo-settings>main>header.sticky,:host ::ng-deep .content>app-admin-faq-management>main>header.sticky,:host ::ng-deep .content>app-admin-homepage .sticky.top-0,:host ::ng-deep .content>app-admin-legal-center .sticky.top-0,:host ::ng-deep .content .sticky.top-16{position:static!important;top:auto!important}@media(max-width:520px){.workspace-head{padding-left:.7rem;padding-right:3.5rem}.head-row h1{font-size:1.25rem}.tabs button{min-width:118px}}
  `],
})
export class AdminSiteSettingsHubComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly access = inject(AdminAccessService);
  readonly activeSection = signal<SettingsSection>('general');
  readonly accessReady = signal(false);

  readonly tabs: SettingsTab[] = [
    { id:'general', label:'Profil ve Genel Ayarlar', shortLabel:'Profil & Genel', description:'Profil, marka, logo ve iletişim.', area:'settings' },
    { id:'homepage', label:'Ana Sayfa Vitrini', shortLabel:'Ana Sayfa', description:'Bölümler, cihazlar, sıra ve öne çıkanlar.', area:'content' },
    { id:'rental', label:'Kiralama ve Mesafe Ücretleri', shortLabel:'Kiralama Ücretleri', description:'Yakıt, tüketim ve rota kilometreleri.', area:'settings' },
    { id:'navigation', label:'Menü ve Alt Bar', shortLabel:'Menü & Alt Bar', description:'Mobil menü ve hızlı erişim.', area:'settings' },
    { id:'footer', label:'Footer ve Sosyal Medya', shortLabel:'Footer & Sosyal', description:'Alt bilgi, sosyal hesap ve bülten.', area:'settings' },
    { id:'legal', label:'Yasal Metinler', shortLabel:'Yasal', description:'Kiralama, satış ve politikalar.', area:'settings' },
    { id:'seo', label:'SEO ve Ölçüm', shortLabel:'SEO & Ölçüm', description:'Arama görünürlüğü ve ölçüm.', area:'settings' },
    { id:'faq', label:'Sık Sorulan Sorular', shortLabel:'SSS', description:'Müşterilerin gördüğü soru ve cevaplar.', area:'content' },
    { id:'whatsapp', label:'WhatsApp', shortLabel:'WhatsApp', description:'Numara ve başlangıç mesajı.', area:'settings' },
  ];

  readonly visibleTabs = computed(() => this.tabs.filter((tab) => !this.accessReady() || this.access.canCached(tab.area)));

  async ngOnInit(): Promise<void> {
    await this.access.refresh();
    this.accessReady.set(true);
    const requested = this.sectionFromRoute();
    const selected = this.visibleTabs().some((tab) => tab.id === requested) ? requested : (this.visibleTabs()[0]?.id || 'general');
    this.activeSection.set(selected);
    if (!this.router.url.startsWith('/admin/settings')) {
      await this.router.navigate(['/admin/settings'], { queryParams: { section: selected }, replaceUrl: true });
    }
  }

  select(section: SettingsSection): void {
    if (!this.visibleTabs().some((tab) => tab.id === section)) return;
    this.activeSection.set(section);
    void this.router.navigate([], { relativeTo: this.route, queryParams: { section }, queryParamsHandling: 'merge', replaceUrl: true });
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  goBack(): void {
    if (typeof window !== 'undefined' && window.history.length > 1) this.location.back();
    else void this.router.navigate(['/admin/dashboard']);
  }

  private sectionFromRoute(): SettingsSection {
    const query = this.route.snapshot.queryParamMap.get('section') as SettingsSection | null;
    if (query && this.tabs.some((tab) => tab.id === query)) return query;
    const data = this.route.snapshot.data['settingsSection'] as SettingsSection | undefined;
    return data && this.tabs.some((tab) => tab.id === data) ? data : 'general';
  }
}
