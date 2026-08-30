import { Component, inject, OnInit, signal } from "@angular/core";
import { CommonModule, Location } from "@angular/common";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";
import { CarService } from "../services/car.service";
import { MatIconModule } from "@angular/material/icon";

@Component({
  selector:"app-legal",standalone:true,imports:[CommonModule,MatIconModule,RouterModule],
  template:`
    <div class="min-h-screen bg-slate-950 pb-20 font-sans text-slate-300"><div class="sticky top-0 z-50 border-b border-slate-800 bg-slate-900 shadow-lg"><div class="mx-auto max-w-7xl px-4"><div class="flex h-16 items-center gap-3"><button type="button" (click)="goBack()" class="-ml-2 shrink-0 rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white" aria-label="Geri dön"><mat-icon aria-hidden="true">arrow_back</mat-icon></button><h1 class="text-lg font-bold text-white">Kurumsal & Yasal</h1></div></div></div>
      <div class="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">@if(!currentType()){<div class="mb-10 text-center"><h1 class="mb-4 font-serif text-4xl font-bold text-slate-100">Hizmete Göre Açık Yasal Bilgilendirme</h1><p class="mx-auto max-w-3xl text-base leading-7 text-slate-400">Genel veri ve kullanım politikalarının yanında saatlik ve günlük kiralama, satış, tur, araç değerlendirme, şube ağı ve ticari ileti süreçlerine özel koşulları ayrı ayrı inceleyebilirsiniz.</p></div><div class="grid grid-cols-1 gap-4 md:grid-cols-2">@for(doc of documents;track doc.id){<a [routerLink]="doc.path" [queryParams]="doc.query" [attr.aria-label]="doc.title+' belgesini aç'" class="group flex cursor-pointer items-center justify-between rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-sm transition-all hover:border-blue-500 hover:shadow-md"><div class="flex min-w-0 items-center gap-4"><div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-800 transition-colors group-hover:bg-blue-900"><mat-icon class="text-slate-400 group-hover:text-blue-400" aria-hidden="true">{{doc.icon}}</mat-icon></div><h2 class="font-bold text-slate-200 transition-colors group-hover:text-white">{{doc.title}}</h2></div><mat-icon class="text-slate-600 transition-colors group-hover:text-blue-500" aria-hidden="true">chevron_right</mat-icon></a>}</div>}@else{<article class="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-xl"><div class="p-6 sm:p-10"><button type="button" (click)="clearType()" class="mb-8 flex min-h-11 items-center rounded-xl px-2 text-sm font-bold text-slate-400 transition-colors hover:bg-slate-800 hover:text-white" aria-label="Yasal belgeler listesine dön"><mat-icon class="mr-1 text-sm" aria-hidden="true">arrow_back</mat-icon>Yasal Belgeler Listesine Dön</button><h1 class="mb-8 font-serif text-3xl font-bold text-white">{{title()}}</h1>@if(content()){<div class="prose prose-invert max-w-none whitespace-pre-line leading-relaxed text-slate-300" [innerHTML]="content()"></div>}@else{<div role="status" class="rounded-2xl border border-amber-500/30 bg-amber-950/30 p-5 text-sm font-bold text-amber-100">Bu belge henüz yönetim panelinden yayımlanmamış.</div>}</div></article>}</div>
    </div>
  `
})
export class LegalComponent implements OnInit {
  private readonly route=inject(ActivatedRoute);private readonly router=inject(Router);private readonly carService=inject(CarService);private readonly location=inject(Location);readonly config=this.carService.getConfig();readonly currentType=signal<string|null>(null);readonly title=signal("");readonly content=signal("");
  readonly documents=[
    {id:"rental",title:"Araç Kiralama Koşulları",icon:"key",path:["/legal"],query:{type:"rental"}},
    {id:"hourly-rental",title:"Saatlik Araç Kiralama Koşulları",icon:"schedule",path:["/legal"],query:{type:"hourly-rental"}},
    {id:"sales",title:"İkinci El Satış & İlan Koşulları",icon:"directions_car",path:["/legal"],query:{type:"sales"}},
    {id:"tour",title:"Tur & Transfer Hizmet Koşulları",icon:"explore",path:["/legal"],query:{type:"tour"}},
    {id:"partner",title:"Aracını Değerlendir Başvuru Koşulları",icon:"handshake",path:["/legal"],query:{type:"partner"}},
    {id:"branch",title:"Şube & Bayilik Başvuru Koşulları",icon:"storefront",path:["/legal"],query:{type:"branch"}},
    {id:"commercial-communication",title:"Bülten & Ticari Elektronik İleti",icon:"mark_email_read",path:["/legal"],query:{type:"commercial-communication"}},
    {id:"terms",title:"Genel Kullanım Şartları",icon:"gavel",path:["/legal"],query:{type:"terms"}},
    {id:"kvkk",title:"KVKK Aydınlatma Metni",icon:"policy",path:["/legal"],query:{type:"kvkk"}},
    {id:"privacy",title:"Gizlilik Politikası",icon:"privacy_tip",path:["/legal"],query:{type:"privacy"}},
    {id:"cookies",title:"Çerez Politikası",icon:"cookie",path:["/legal"],query:{type:"cookies"}},
    {id:"distance-selling",title:"Mesafeli İşlem Bilgilendirmesi",icon:"receipt_long",path:["/legal"],query:{type:"distance-selling"}},
    {id:"cancellation",title:"İade ve İptal Politikası",icon:"assignment_return",path:["/legal"],query:{type:"cancellation"}},
    {id:"insurance",title:"Araç Sigorta ve Sorumluluk",icon:"health_and_safety",path:["/legal"],query:{type:"insurance"}},
    {id:"faq",title:"Sıkça Sorulan Sorular",icon:"help_outline",path:["/faq"],query:{}}
  ];
  ngOnInit():void{this.route.queryParams.subscribe((params)=>{const type=typeof params["type"]==="string"?params["type"]:null;this.currentType.set(type);if(type)this.setContent(type);if(typeof window!=="undefined")window.scrollTo(0,0);});}
  goBack():void{if(typeof window!=="undefined"&&window.history.length>1)this.location.back();else void this.router.navigate(["/"]);}clearType():void{void this.router.navigate(["/legal"]);}
  private setContent(type:string):void{const cfg=this.config();const docs:Record<string,{title:string;content:string}>={rental:{title:"Araç Kiralama Koşulları",content:cfg.rentalTermsText||""},"hourly-rental":{title:"Saatlik Araç Kiralama Koşulları",content:cfg.hourlyRentalTermsText||""},sales:{title:"İkinci El Satış & İlan Koşulları",content:cfg.salesTermsText||""},tour:{title:"Tur & Transfer Hizmet Koşulları",content:cfg.tourTermsText||""},partner:{title:"Aracını Değerlendir Başvuru Koşulları",content:cfg.partnerTermsText||""},branch:{title:"Şube & Bayilik Başvuru Koşulları",content:cfg.branchTermsText||""},"commercial-communication":{title:"Bülten & Ticari Elektronik İleti Bilgilendirmesi",content:cfg.commercialCommunicationText||""},kvkk:{title:"KVKK Aydınlatma Metni",content:cfg.kvkkText||""},privacy:{title:"Gizlilik Politikası",content:cfg.privacyText||""},cookies:{title:"Çerez Politikası",content:cfg.cookiesText||""},terms:{title:"Genel Kullanım Şartları",content:cfg.termsText||""},"distance-selling":{title:"Mesafeli İşlem Bilgilendirmesi",content:cfg.distanceSellingText||""},cancellation:{title:"İade ve İptal Politikası",content:cfg.cancellationText||""},insurance:{title:"Araç Sigorta ve Sorumluluk Metni",content:cfg.insuranceText||""}};const selected=docs[type]||{title:"Yasal Bilgilendirme",content:""};this.title.set(selected.title);this.content.set(selected.content);}
}
