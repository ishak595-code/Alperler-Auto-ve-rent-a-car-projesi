import { CommonModule, Location } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminAccessService, AdminArea } from '../../services/admin-access.service';
import { AdminSettingsV241Component } from './admin-settings-v241.component';
import { AdminAppearanceSettingsComponent } from './admin-appearance-settings.component';
import { AdminHomepageComponent } from './admin-homepage.component';
import { AdminHomepageDeviceVisibilityComponent } from './admin-homepage-device-visibility.component';
import { AdminHomepagePlannerCopyComponent } from './admin-homepage-planner-copy.component';
import { AdminHomepageBlockCopyV1742Component } from './admin-homepage-block-copy-v1742.component';
import { AdminNavigationComponent } from './admin-navigation.component';
import { AdminFooterV174Component } from './admin-footer-v174.component';
import { AdminLegalCenterComponent } from './admin-legal-center.component';
import { AdminSeoSettingsComponent } from './admin-seo-settings.component';
import { AdminFaqManagementComponent } from './admin-faq-management.component';
import { AdminWhatsappSettingsComponent } from './admin-whatsapp-settings.component';
import { AdminRentalPricingComponent } from './admin-rental-pricing.component';
import { AdminPaymentSettingsComponent } from './admin-payment-settings.component';

type SettingsSection='general'|'homepage'|'rental'|'payments'|'navigation'|'footer'|'legal'|'seo'|'faq'|'whatsapp';
type DetailPanel='appearance'|'home-device'|'home-planner'|'home-copy'|'home-content'|null;
interface SettingsTab{id:SettingsSection;label:string;shortLabel:string;description:string;area:AdminArea;}

@Component({
  selector:'app-admin-site-settings-hub',standalone:true,
  imports:[CommonModule,AdminSettingsV241Component,AdminAppearanceSettingsComponent,AdminHomepageComponent,AdminHomepageDeviceVisibilityComponent,AdminHomepagePlannerCopyComponent,AdminHomepageBlockCopyV1742Component,AdminRentalPricingComponent,AdminPaymentSettingsComponent,AdminNavigationComponent,AdminFooterV174Component,AdminLegalCenterComponent,AdminSeoSettingsComponent,AdminFaqManagementComponent,AdminWhatsappSettingsComponent],
  template:`
    <div class="workspace">
      <header class="workspace-head"><div class="head-row"><button type="button" class="back" (click)="goBack()" aria-label="Önceki sayfaya dön">←</button><div><p>Site Yönetimi</p><h1>Site Ayarları</h1><span>Önce ayar grubunu seçin, sonra yalnız düzenleyeceğiniz bölümü açın.</span></div></div><nav class="tabs" aria-label="Site ayarları bölümleri">@for(tab of visibleTabs();track tab.id){<button type="button" [class.active]="activeSection()===tab.id" (click)="select(tab.id)" [attr.aria-current]="activeSection()===tab.id?'page':null"><strong>{{tab.shortLabel}}</strong><small>{{tab.description}}</small></button>}</nav></header>
      <main class="content">
        @if(accessReady()){
          @switch(activeSection()){
            @case('homepage'){
              <div class="accordion-stack">
                <section class="accordion"><button type="button" (click)="toggleDetail('home-device')" [attr.aria-expanded]="detailPanel()==='home-device'"><span><strong>Cihaz Görünürlüğü</strong><small>Mobil, tablet ve masaüstünde hangi bölümlerin görüneceğini yönetin.</small></span><b>{{detailPanel()==='home-device'?'−':'+'}}</b></button>@if(detailPanel()==='home-device'){<div class="accordion-body"><app-admin-homepage-device-visibility /></div>}</section>
                <section class="accordion"><button type="button" (click)="toggleDetail('home-planner')" [attr.aria-expanded]="detailPanel()==='home-planner'"><span><strong>Hızlı Planlama</strong><small>Planlama alanının metinlerini, seçeneklerini ve davranışını yönetin.</small></span><b>{{detailPanel()==='home-planner'?'−':'+'}}</b></button>@if(detailPanel()==='home-planner'){<div class="accordion-body"><app-admin-homepage-planner-copy /></div>}</section>
                <section class="accordion"><button type="button" (click)="toggleDetail('home-copy')" [attr.aria-expanded]="detailPanel()==='home-copy'"><span><strong>Ana Sayfa Metinleri</strong><small>Bölüm başlıkları, açıklamalar ve dönüşüm metinlerini düzenleyin.</small></span><b>{{detailPanel()==='home-copy'?'−':'+'}}</b></button>@if(detailPanel()==='home-copy'){<div class="accordion-body"><app-admin-homepage-block-copy-v1742 /></div>}</section>
                <section class="accordion"><button type="button" (click)="toggleDetail('home-content')" [attr.aria-expanded]="detailPanel()==='home-content'"><span><strong>Vitrin ve İçerik</strong><small>Öne çıkan alanlar, sıralama ve ana sayfa içeriklerini yönetin.</small></span><b>{{detailPanel()==='home-content'?'−':'+'}}</b></button>@if(detailPanel()==='home-content'){<div class="accordion-body"><app-admin-homepage /></div>}</section>
              </div>
            }
            @case('rental'){<app-admin-rental-pricing />}
            @case('payments'){<app-admin-payment-settings />}
            @case('navigation'){<app-admin-navigation />}
            @case('footer'){<app-admin-footer-v174 />}
            @case('legal'){<app-admin-legal-center />}
            @case('seo'){<app-admin-seo-settings />}
            @case('faq'){<app-admin-faq-management />}
            @case('whatsapp'){<app-admin-whatsapp-settings />}
            @default{
              <app-admin-settings-v241 />
              <div class="accordion-stack general-extra"><section class="accordion"><button type="button" (click)="toggleDetail('appearance')" [attr.aria-expanded]="detailPanel()==='appearance'"><span><strong>Görünüm ve Tema Ayrıntıları</strong><small>Renk, ölçü, hareket ve ayrıntılı görünüm tercihlerini yalnız gerektiğinde açın.</small></span><b>{{detailPanel()==='appearance'?'−':'+'}}</b></button>@if(detailPanel()==='appearance'){<div class="accordion-body"><app-admin-appearance-settings /></div>}</section></div>
            }
          }
        }@else{<div class="loading">Yönetim alanı hazırlanıyor...</div>}
      </main>
    </div>
  `,
  styles:[`
    :host{display:block;min-height:100vh;background:#f8fafc;color:#0f172a}.workspace{min-height:100vh}.workspace-head{position:sticky;top:0;z-index:80;border-bottom:1px solid #e2e8f0;background:rgba(248,250,252,.97);padding:.8rem 3.7rem .7rem 1rem;box-shadow:0 6px 20px rgba(15,23,42,.05);backdrop-filter:blur(12px)}.head-row{display:flex;width:min(100%,1240px);margin:auto;align-items:flex-start;gap:.7rem}.back{display:grid;width:42px;height:42px;flex:none;place-items:center;border:1px solid #dbe4ef;border-radius:12px;background:#fff;color:#0f172a;font-size:1.15rem;font-weight:950}.head-row p{margin:0;color:#2563eb;font-size:.58rem;font-weight:950;letter-spacing:.14em;text-transform:uppercase}.head-row h1{margin:.12rem 0 0;font-size:1.4rem;font-weight:950}.head-row span{display:block;margin-top:.2rem;color:#64748b;font-size:.68rem;line-height:1.45}.tabs{display:flex;width:min(100%,1240px);margin:.65rem auto 0;gap:.4rem;overflow-x:auto;scrollbar-width:none}.tabs::-webkit-scrollbar{display:none}.tabs button{min-width:128px;min-height:50px;flex:0 0 auto;border:1px solid #e2e8f0;border-radius:12px;background:#fff;padding:.45rem .7rem;color:#475569;text-align:left}.tabs button strong,.tabs button small{display:block}.tabs button strong{font-size:.67rem;font-weight:950}.tabs button small{margin-top:.15rem;color:#64748b;font-size:.54rem;line-height:1.25}.tabs button.active{border-color:#2563eb;background:#eff6ff;color:#1d4ed8}.content{min-height:70vh}.accordion-stack{display:grid;width:min(100% - 24px,1000px);margin:16px auto 28px;gap:.55rem}.general-extra{margin-top:-10px}.accordion{overflow:hidden;border:1px solid #dbe4ef;border-radius:15px;background:#fff}.accordion>button{display:flex;width:100%;min-height:70px;align-items:center;justify-content:space-between;gap:1rem;border:0;background:#fff;padding:13px 14px;color:#0f172a;text-align:left}.accordion>button strong,.accordion>button small{display:block}.accordion>button strong{font-size:.78rem;font-weight:950}.accordion>button small{margin-top:.2rem;color:#64748b;font-size:.58rem;line-height:1.4}.accordion>button b{flex:none;color:#64748b;font-size:1.2rem}.accordion-body{border-top:1px solid #e2e8f0}.loading{padding:2rem;text-align:center;color:#64748b;font-size:.7rem;font-weight:850}:host ::ng-deep .content>app-admin-seo-settings>main>header.sticky,:host ::ng-deep .content>app-admin-faq-management>main>header.sticky,:host ::ng-deep .content app-admin-homepage .sticky.top-0,:host ::ng-deep .content>app-admin-legal-center .sticky.top-0,:host ::ng-deep .content .sticky.top-16{position:static!important;top:auto!important}.back:focus-visible,.tabs button:focus-visible,.accordion>button:focus-visible{outline:3px solid #2563eb;outline-offset:3px}@media(max-width:520px){.workspace-head{padding-left:.7rem;padding-right:3.5rem}.head-row h1{font-size:1.25rem}.tabs button{min-width:118px}}
  `]
})
export class AdminSiteSettingsHubComponent implements OnInit {
  private readonly route=inject(ActivatedRoute);private readonly router=inject(Router);private readonly location=inject(Location);private readonly access=inject(AdminAccessService);
  readonly activeSection=signal<SettingsSection>('general');readonly detailPanel=signal<DetailPanel>(null);readonly accessReady=signal(false);
  readonly tabs:SettingsTab[]=[{id:'general',label:'Profil ve Genel Ayarlar',shortLabel:'Profil & Genel',description:'Profil, marka, logo, görünüm ve iletişim.',area:'settings'},{id:'homepage',label:'Ana Sayfa Vitrini',shortLabel:'Ana Sayfa',description:'Bölümler, metinler, cihazlar, sıra ve öne çıkanlar.',area:'content'},{id:'rental',label:'Kiralama, Ek Hizmet ve Mesafe',shortLabel:'Kiralama',description:'İsteğe bağlı hizmetler, yakıt ve rota ücretleri.',area:'settings'},{id:'payments',label:'Ödeme ve Depozito',shortLabel:'Ödeme',description:'Kart, EFT, teslimde ödeme ve depozito.',area:'settings'},{id:'navigation',label:'Menü ve Alt Bar',shortLabel:'Menü & Alt Bar',description:'Mobil menü ve hızlı erişim.',area:'settings'},{id:'footer',label:'Alt Dönüşüm, Footer ve Sosyal',shortLabel:'Alt Alan & Footer',description:'Pre-footer, linkler, sosyal hesap ve bülten.',area:'settings'},{id:'legal',label:'Yasal Metinler',shortLabel:'Yasal',description:'Kiralama, satış ve politikalar.',area:'settings'},{id:'seo',label:'SEO ve Ölçüm',shortLabel:'SEO & Ölçüm',description:'Arama görünürlüğü ve ölçüm.',area:'settings'},{id:'faq',label:'Sık Sorulan Sorular',shortLabel:'SSS',description:'Müşterilerin gördüğü soru ve cevaplar.',area:'content'},{id:'whatsapp',label:'WhatsApp',shortLabel:'WhatsApp',description:'Numara ve başlangıç mesajı.',area:'settings'}];
  readonly visibleTabs=computed(()=>this.tabs.filter(tab=>!this.accessReady()||this.access.canCached(tab.area)));
  async ngOnInit(){await this.access.refresh();this.accessReady.set(true);const requested=this.sectionFromRoute();const selected=this.visibleTabs().some(tab=>tab.id===requested)?requested:(this.visibleTabs()[0]?.id||'general');this.activeSection.set(selected);if(!this.router.url.startsWith('/admin/settings'))await this.router.navigate(['/admin/settings'],{queryParams:{section:selected},replaceUrl:true});}
  toggleDetail(panel:Exclude<DetailPanel,null>){this.detailPanel.set(this.detailPanel()===panel?null:panel);}
  select(section:SettingsSection){if(!this.visibleTabs().some(tab=>tab.id===section))return;this.activeSection.set(section);this.detailPanel.set(null);void this.router.navigate([],{relativeTo:this.route,queryParams:{section},queryParamsHandling:'merge',replaceUrl:true});if(typeof window!=='undefined')window.scrollTo({top:0,behavior:'smooth'});}
  goBack(){if(typeof window!=='undefined'&&window.history.length>1)this.location.back();else void this.router.navigate(['/admin/dashboard']);}
  private sectionFromRoute():SettingsSection{const query=this.route.snapshot.queryParamMap.get('section') as SettingsSection|null;if(query&&this.tabs.some(tab=>tab.id===query))return query;const data=this.route.snapshot.data['settingsSection'] as SettingsSection|undefined;return data&&this.tabs.some(tab=>tab.id===data)?data:'general';}
}
