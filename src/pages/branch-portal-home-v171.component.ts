import { CommonModule } from "@angular/common";
import { Component, OnInit, inject, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { BranchPortalFinanceV225Component } from "./branch-portal-finance-v225.component";
import { BranchPortalProfileV225Component } from "./branch-portal-profile-v225.component";
import { BranchPortalService } from "../services/branch-portal.service";
import { BranchSubscriptionV171Service } from "../services/branch-subscription-v171.service";

type PortalTool="NONE"|"PROFILE"|"FINANCE";

@Component({
  selector:"app-branch-portal-home-v171",
  standalone:true,
  imports:[CommonModule,RouterLink,BranchPortalProfileV225Component,BranchPortalFinanceV225Component],
  template:`
    <main class="min-h-screen bg-slate-100 pb-20 text-slate-900">
      <header class="border-b border-slate-200 bg-white"><div class="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 md:px-8"><div><p class="text-[10px] font-black uppercase tracking-[.16em] text-blue-600">Alperler Auto Şube Portalı</p><h1 class="text-lg font-black">Şube Kontrol Merkezi</h1></div><a routerLink="/" class="rounded-xl border border-slate-200 px-4 py-2 text-sm font-black no-underline">Ana Site</a></div></header>
      <section class="mx-auto max-w-7xl px-4 py-8 md:px-8">
        @if(error()){<p role="alert" class="rounded-xl bg-rose-50 p-3 font-bold text-rose-800">{{error()}}</p>}
        <div class="rounded-3xl bg-slate-950 p-6 text-white shadow-xl"><p class="text-xs font-black uppercase tracking-wider text-blue-300">{{branchName()}}</p><h2 class="mt-2 text-3xl font-black">Araç, tur, profil, finans ve aboneliğinizi tek yerden yönetin.</h2><p class="mt-3 max-w-3xl text-sm leading-6 text-slate-300">Taslaklar müşteriye görünmez. Merkeze gönderilen araç ve turlar kalite kontrolünden sonra yayınlanır. Şube profili ve finans verileri yalnız yetkili üyeler tarafından, şube kapsamı dışına çıkmadan yönetilir.</p><div class="mt-5 flex flex-wrap gap-2 text-xs font-black"><span class="rounded-full bg-white/10 px-3 py-1">{{cityDistrict()}}</span><span class="rounded-full bg-white/10 px-3 py-1">{{subscriptionLabel()}}</span></div></div>

        <div class="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <a routerLink="/branch-portal/vehicles" class="tile"><strong>Araç İlanları</strong><span>Kiralık ve satılık araç oluşturun, fiyat ve detayları güncelleyin.</span></a>
          <a routerLink="/branch-portal/vehicle-media" class="tile"><strong>Araç Fotoğraf / Video</strong><span>Canonical galeri, kapak fotoğrafı ve video yönetimi.</span></a>
          <a routerLink="/branch-portal/tours" class="tile"><strong>Tur Stüdyosu</strong><span>Tur programı, fiyat, tarihli rezervasyon altyapısı ve medya.</span></a>
          <button type="button" class="tile text-left" (click)="openTool('PROFILE')" [attr.aria-expanded]="activeTool()==='PROFILE'"><strong>Şube Profili ve Sosyal</strong><span>Hakkında, adres, iletişim, çalışma saatleri ve sosyal hesapları yönetin.</span></button>
          <button type="button" class="tile text-left" (click)="openTool('FINANCE')" [attr.aria-expanded]="activeTool()==='FINANCE'"><strong>Şube Finansı</strong><span>Gelir, gider, banka/vergi profili, ödeme ve kimlik doğrulama.</span></button>
          <a routerLink="/branch-portal/subscription" class="tile"><strong>Abonelik ve Faturalar</strong><span>Paket, dönem, fatura ve güvenli ödeme bilgileri.</span></a>
        </div>

        @if(activeTool()!=='NONE'){
          <section class="tool-shell" aria-label="Şube yönetim aracı">
            <div class="tool-bar"><strong>{{activeTool()==='PROFILE'?'Şube Profili ve Sosyal':'Şube Finansı'}}</strong><button type="button" (click)="activeTool.set('NONE')">Kapat</button></div>
            @if(activeTool()==='PROFILE'){<app-branch-portal-profile-v225 />}
            @if(activeTool()==='FINANCE'){<app-branch-portal-finance-v225 />}
          </section>
        }

        <div class="mt-6 rounded-3xl border border-slate-200 bg-white p-5"><h3 class="text-xl font-black">Yayın Akışı</h3><div class="mt-4 grid gap-3 sm:grid-cols-4"><div class="step"><strong>1. Taslak</strong><span>Bilgileri ve medyayı hazırlayın.</span></div><div class="step"><strong>2. Gönderim</strong><span>Merkez incelemesine gönderin.</span></div><div class="step"><strong>3. Kalite Kontrolü</strong><span>Fiyat, medya ve işletme kimliği incelenir.</span></div><div class="step"><strong>4. Yayın</strong><span>Onay sonrası il/ilçe ve şube kataloğunda görünür.</span></div></div></div>
      </section>
    </main>
  `,
  styles:[`
    .tile{display:flex;min-height:155px;flex-direction:column;gap:.5rem;border:1px solid #e2e8f0;border-radius:22px;background:#fff;padding:1.25rem;text-decoration:none;color:#0f172a;box-shadow:0 8px 24px rgba(15,23,42,.05);cursor:pointer}.tile strong{font-size:1.1rem}.tile span,.step span{font-size:.8rem;line-height:1.5;color:#64748b}.tile:focus-visible,.tool-bar button:focus-visible{outline:3px solid #60a5fa;outline-offset:3px}.step{display:flex;flex-direction:column;gap:.35rem;border-radius:16px;background:#f8fafc;padding:1rem}.tool-shell{margin-top:24px;border:1px solid #dbe4ef;border-radius:24px;background:#f8fafc;padding:16px}.tool-bar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}.tool-bar button{min-height:42px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;padding:0 14px;font-weight:900}
  `]
})
export class BranchPortalHomeV171Component implements OnInit{
  private readonly portal=inject(BranchPortalService);private readonly subscription=inject(BranchSubscriptionV171Service);
  readonly error=signal("");readonly branchName=signal("Şube");readonly cityDistrict=signal("");readonly subscriptionLabel=signal("Abonelik kontrol ediliyor");readonly activeTool=signal<PortalTool>('NONE');
  async ngOnInit(){try{const memberships=await this.portal.loadMemberships();const first=memberships[0];if(!first)throw new Error("BRANCH_MEMBERSHIP_REQUIRED");this.branchName.set(first.branch.name);this.cityDistrict.set(`${first.branch.city||""} / ${first.branch.district||""}`);const entitlements=await this.subscription.myEntitlements();const entitlement=entitlements.find(row=>row.branch_id===first.branchId)||entitlements[0];this.subscriptionLabel.set(entitlement?`${entitlement.plan_name} · ${entitlement.status}`:"Abonelik bulunamadı");}catch(error){this.error.set(error instanceof Error?error.message:"Şube kontrol merkezi açılamadı.");}}
  openTool(tool:Exclude<PortalTool,'NONE'>){this.activeTool.update(current=>current===tool?'NONE':tool);}
}
