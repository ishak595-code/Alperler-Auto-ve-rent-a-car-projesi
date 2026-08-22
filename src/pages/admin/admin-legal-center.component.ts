import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { SiteConfig } from '../../models/site-config.model';
import { CarService } from '../../services/car.service';
import { ToastService } from '../../services/toast.service';

interface LegalField { key:keyof SiteConfig; title:string; description:string; icon:string; }

@Component({
  selector:'app-admin-legal-center',standalone:true,imports:[CommonModule,FormsModule,MatIconModule,RouterLink],
  template:`
    <main class="min-h-full bg-slate-50 p-4 md:p-8"><div class="mx-auto max-w-6xl space-y-5">
      <header class="rounded-3xl bg-slate-950 p-6 text-white shadow-xl md:p-8"><div class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div class="max-w-3xl"><p class="text-[11px] font-black uppercase tracking-[.18em] text-blue-400">Yasal içerik yönetimi</p><h1 class="mt-2 text-3xl font-black">Yasal Metin Merkezi</h1><p class="mt-2 text-sm leading-6 text-slate-300">Saatlik ve günlük kiralama, satış, tur, araç değerlendirme, şube, bülten ve genel kullanım süreçlerinde müşteriye gösterilecek metinleri buradan yönetin.</p></div><div class="flex flex-wrap gap-2"><a routerLink="/legal" target="_blank" class="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 text-sm font-black text-white" aria-label="Müşteri yasal sayfasını yeni sekmede aç"><mat-icon aria-hidden="true">open_in_new</mat-icon>Müşteri Sayfasını Aç</a><button type="button" (click)="reload()" class="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-black text-slate-950" aria-label="Kayıtlı yasal metinleri yeniden yükle"><mat-icon aria-hidden="true">refresh</mat-icon>Yenile</button></div></div></header>
      <nav class="sticky top-0 z-20 overflow-x-auto rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-sm backdrop-blur" aria-label="Yasal metin sekmeleri"><div class="flex min-w-max gap-2">@for(field of fields;track field.key){<button type="button" (click)="activeKey.set(field.key)" [class.bg-slate-950]="activeKey()===field.key" [class.text-white]="activeKey()===field.key" class="min-h-10 rounded-xl bg-slate-100 px-3 text-xs font-black text-slate-700" [attr.aria-pressed]="activeKey()===field.key" [attr.aria-label]="field.title+' metnini düzenle'">{{field.title}}</button>}</div></nav>
      @if(activeField();as field){<section class="rounded-3xl border border-slate-200 bg-white shadow-sm"><header class="flex items-start gap-4 border-b border-slate-200 p-5 md:p-6"><span class="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-700"><mat-icon aria-hidden="true">{{field.icon}}</mat-icon></span><div><h2 class="text-xl font-black text-slate-950">{{field.title}}</h2><p class="mt-1 text-sm leading-6 text-slate-500">{{field.description}}</p></div></header><div class="p-5 md:p-6"><label [for]="'legal-'+field.key" class="mb-2 block text-xs font-black uppercase tracking-wider text-slate-600">Müşteriye gösterilecek metin</label><textarea [id]="'legal-'+field.key" [ngModel]="fieldValue(field.key)" (ngModelChange)="setFieldValue(field.key,$event)" rows="24" class="min-h-[520px] w-full resize-y rounded-2xl border border-slate-300 bg-slate-50 p-4 text-sm leading-7 text-slate-800 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10" [attr.aria-label]="field.title+' içeriği'"></textarea><div class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p class="text-xs leading-5 text-slate-500">{{fieldValue(field.key).length}} karakter · Kaydettiğinizde bu içerik müşterilerin gördüğü yasal bilgilendirme sayfasında güncellenir.</p><button type="button" (click)="save()" [disabled]="saving()" class="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-black text-white shadow-lg disabled:opacity-50" aria-label="Yasal metin değişikliklerini kaydet ve yayınla"><mat-icon aria-hidden="true">save</mat-icon>{{saving()?'Kaydediliyor…':'Kaydet ve Uygula'}}</button></div></div></section>}
      <section class="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950"><strong class="block font-black">Resmî belge hatırlatması</strong>Bu bölüm müşteriye gösterilecek açıklama ve koşulları düzenler. Vergi levhası, ticaret sicili, ikinci el araç ticareti yetki belgesi, EİDS yetkilendirmesi veya faaliyet türüne göre gereken diğer resmî belgelerin yerine geçmez. Sahip olmadığınız belge veya izin numarasını metinlere eklemeyin.</section>
    </div></main>
  `
})
export class AdminLegalCenterComponent implements OnInit {
  private readonly cars=inject(CarService);private readonly toast=inject(ToastService);readonly saving=signal(false);readonly activeKey=signal<keyof SiteConfig>('rentalTermsText');form!:SiteConfig;
  readonly fields:LegalField[]=[
    {key:'rentalTermsText',title:'Kiralama',description:'Rezervasyon, teslim/iade, sürücü, depozito, kilometre, hasar ve yasak kullanım koşulları.',icon:'key'},
    {key:'hourlyRentalTermsText',title:'Saatlik Kiralama',description:'Saatlik süre, minimum saat, saat bazlı müsaitlik, gecikme, kilometre ve fiyatlandırma kuralları.',icon:'schedule'},
    {key:'salesTermsText',title:'Satış & İlan',description:'İkinci el araç ilanı, yetki/kimlik doğrulaması, ekspertiz, resmi satış ve beyan sorumluluğu.',icon:'directions_car'},
    {key:'tourTermsText',title:'Tur & Transfer',description:'Günübirlik tur, transfer, program değişikliği, güvenlik ve varsa paket tur niteliği.',icon:'explore'},
    {key:'partnerTermsText',title:'Aracını Değerlendir',description:'Araç sahibi başvurusu, mülkiyet/yetki beyanı, inceleme ve yayın onayı koşulları.',icon:'handshake'},
    {key:'branchTermsText',title:'Şube & Bayilik',description:'Başvurunun sözleşme olmadığı, belge/standart/onay ve merkezi moderasyon şartları.',icon:'storefront'},
    {key:'commercialCommunicationText',title:'Bülten & İleti',description:'Ticari elektronik ileti onayı, ret/abonelikten çıkma ve izin kayıtları.',icon:'mark_email_read'},
    {key:'termsText',title:'Genel Şartlar',description:'Platformun genel kullanım çerçevesi.',icon:'gavel'},
    {key:'kvkkText',title:'KVKK',description:'Kişisel veri işleme faaliyetine ilişkin aydınlatma.',icon:'policy'},
    {key:'privacyText',title:'Gizlilik',description:'Platform gizlilik yaklaşımı.',icon:'privacy_tip'},
    {key:'cookiesText',title:'Çerez',description:'Zorunlu ve isteğe bağlı teknoloji tercihleri.',icon:'cookie'},
    {key:'distanceSellingText',title:'Mesafeli İşlem',description:'Uzaktan kurulan tüketici işlemlerine ilişkin ön bilgilendirme çerçevesi.',icon:'receipt_long'},
    {key:'cancellationText',title:'İptal & İade',description:'Hizmet türüne göre iptal/değişiklik/iade esasları.',icon:'assignment_return'},
    {key:'insuranceText',title:'Sigorta',description:'Araç sigortası, muafiyet ve sorumluluk bilgilendirmesi.',icon:'health_and_safety'}
  ];
  ngOnInit():void{this.copyConfig();}activeField():LegalField|undefined{return this.fields.find((field)=>field.key===this.activeKey());}fieldValue(key:keyof SiteConfig):string{const value=this.form?.[key];return typeof value==='string'?value:'';}setFieldValue(key:keyof SiteConfig,value:string):void{(this.form as unknown as Record<string,unknown>)[String(key)]=value;}
  async reload():Promise<void>{await this.cars.refreshCloudCatalog(true);this.copyConfig();this.toast.show('Kayıtlı yasal metinler yenilendi.','success');}
  async save():Promise<void>{if(this.saving())return;this.saving.set(true);try{await this.cars.updateConfig({...this.form});this.copyConfig();this.toast.show('Yasal metinler kaydedildi ve müşteri sayfasına uygulandı.','success');}catch(error){console.error(error);this.toast.show('Yasal metinler kaydedilemedi. Bağlantınızı kontrol edip yeniden deneyin.','error');}finally{this.saving.set(false);}}
  private copyConfig():void{const cfg=this.cars.getConfig()();this.form={...cfg,homeContent:cfg.homeContent?{...cfg.homeContent}:undefined,team:[...(cfg.team||[])],rentalExtras:cfg.rentalExtras?[...cfg.rentalExtras]:undefined};}
}
