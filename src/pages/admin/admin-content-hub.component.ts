import { CommonModule, Location } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminCatalogWorkspaceComponent } from './admin-catalog-workspace.component';
import { AdminCampaignsV167Component } from './admin-campaigns-v167.component';
import { AdminCommercialBenefitsComponent } from './admin-commercial-benefits.component';
import { AdminBlogComponent } from './admin-blog.component';
import { BlogAdminService } from '../../services/blog-admin.service';
import { BlogAdminResilientService } from '../../services/blog-admin-resilient.service';

type ContentSection='rental'|'sale'|'tour'|'campaigns'|'benefits'|'blog';

@Component({
  selector:'app-admin-content-hub',
  standalone:true,
  imports:[CommonModule,AdminCatalogWorkspaceComponent,AdminCampaignsV167Component,AdminCommercialBenefitsComponent,AdminBlogComponent],
  providers:[
    {provide:BlogAdminService,useClass:BlogAdminResilientService},
  ],
  template:`
    <div class="workspace">
      <header class="workspace-head">
        <div class="head-row">
          <button type="button" class="back" (click)="goBack()" aria-label="Önceki sayfaya dön">←</button>
          <h1>İçerik & Katalog</h1>
        </div>
        <nav class="tabs" aria-label="İçerik ve katalog bölümleri">
          <button type="button" [class.active]="active()==='rental'" [attr.aria-current]="active()==='rental' ? 'page' : null" (click)="select('rental')">Kiralık Araçlar</button>
          <button type="button" [class.active]="active()==='sale'" [attr.aria-current]="active()==='sale' ? 'page' : null" (click)="select('sale')">Satılık Araçlar</button>
          <button type="button" [class.active]="active()==='tour'" [attr.aria-current]="active()==='tour' ? 'page' : null" (click)="select('tour')">Turlar</button>
          <button type="button" [class.active]="active()==='campaigns'" [attr.aria-current]="active()==='campaigns' ? 'page' : null" (click)="select('campaigns')">Kampanyalar</button>
          <button type="button" [class.active]="active()==='blog'" [attr.aria-current]="active()==='blog' ? 'page' : null" (click)="select('blog')">Blog</button>
          <button type="button" (click)="openBranchModeration()">Şube İlan Onayları</button>
          <button type="button" [class.active]="active()==='benefits'" [attr.aria-current]="active()==='benefits' ? 'page' : null" (click)="select('benefits')">Fiyat & Sadakat</button>
        </nav>
      </header>
      <main class="content">
        @switch(active()){
          @case('sale'){<app-admin-catalog-workspace mode="SALE"/>}
          @case('tour'){<app-admin-catalog-workspace mode="TOUR"/>}
          @case('campaigns'){<app-admin-campaigns-v167/>}
          @case('blog'){<app-admin-blog/>}
          @case('benefits'){<app-admin-commercial-benefits/>}
          @default{<app-admin-catalog-workspace mode="RENTAL"/>}
        }
      </main>
    </div>`,
  styles:[`:host{display:block;min-height:100vh;background:#f8fafc}.workspace{min-height:100vh}.workspace-head{position:sticky;top:0;z-index:80;border-bottom:1px solid #e2e8f0;background:rgba(248,250,252,.97);padding:.45rem 3.4rem .45rem .7rem;box-shadow:0 4px 14px rgba(15,23,42,.05);backdrop-filter:blur(12px)}.head-row{display:flex;width:min(100%,1240px);margin:auto;align-items:center;gap:.6rem}.back{display:grid;width:38px;height:38px;flex:none;place-items:center;border:1px solid #dbe4ef;border-radius:10px;background:#fff;color:#0f172a;font-size:1.05rem;font-weight:950}.head-row h1{margin:0;font-size:1.05rem;font-weight:950;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tabs{display:flex;width:min(100%,1240px);margin:.4rem auto 0;gap:.35rem;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch}.tabs::-webkit-scrollbar{display:none}.tabs button{min-height:36px;flex:0 0 auto;border:1px solid #e2e8f0;border-radius:10px;background:#fff;padding:0 .75rem;color:#475569;font-size:.7rem;font-weight:900}.tabs button.active{border-color:#9E1B24;background:#eff6ff;color:#9E1B24}.tabs button:focus-visible{outline:2px solid #9E1B24;outline-offset:2px}.content{min-height:70vh}:host ::ng-deep .content .sticky.top-16,:host ::ng-deep .content .sticky.top-0{position:static!important;top:auto!important}:host ::ng-deep .content .cards{display:block!important;padding:0 13px 13px!important}:host ::ng-deep .content .cards>article{display:grid!important;grid-template-columns:72px 1fr!important;gap:10px!important;align-items:center!important;margin:0!important;padding:8px 0!important;border:0!important;border-bottom:1px solid #e2e8f0!important;border-radius:0!important;box-shadow:none!important}:host ::ng-deep .content .cards>article:last-child{border-bottom:0!important}:host ::ng-deep .content .cards .cover{width:72px!important;height:52px!important;aspect-ratio:auto!important;border-radius:8px!important;overflow:hidden!important}.content ::ng-deep .cards .copy{padding:0!important}.content ::ng-deep .cards .copy h3{margin:0!important;font-size:11px!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.content ::ng-deep .cards .copy p{min-height:0!important;margin:3px 0!important;font-size:9px!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.content ::ng-deep .cards .copy .row{margin-top:4px!important}.content ::ng-deep .cards .copy .row button{min-height:30px!important;padding:0 8px!important;font-size:8px!important}.content ::ng-deep .grid article{display:grid!important;grid-template-columns:72px 1fr!important;align-items:center!important;gap:10px!important;padding:8px 0!important;border:0!important;border-bottom:1px solid #e2e8f0!important;border-radius:0!important}.content ::ng-deep .grid article .cover{width:72px!important;height:52px!important;aspect-ratio:auto!important}.content ::ng-deep .grid article .copy{padding:0!important}.content ::ng-deep .grid article .copy h3{font-size:11px!important}.content ::ng-deep .grid article .copy p{min-height:0!important;margin:3px 0!important;font-size:9px!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.content ::ng-deep .grid article .copy>div{margin-top:4px!important}.content ::ng-deep .grid article .copy button{min-height:30px!important;font-size:8px!important}@media(max-width:520px){.workspace-head{padding-right:3.2rem}}`]
})
export class AdminContentHubComponent implements OnInit{
  private readonly route=inject(ActivatedRoute);
  private readonly router=inject(Router);
  private readonly location=inject(Location);
  readonly active=signal<ContentSection>('rental');

  ngOnInit():void{this.active.set(this.resolveSection());}

  async select(section:ContentSection):Promise<void>{
    const direct:Record<ContentSection,string>={rental:'/admin/cars',sale:'/admin/sales',tour:'/admin/tours',campaigns:'/admin/campaigns',blog:'/admin/blog',benefits:'/admin/benefits'};
    await this.router.navigateByUrl(direct[section]);
    if(typeof window!=='undefined')window.scrollTo({top:0,behavior:'smooth'});
  }

  async openBranchModeration():Promise<void>{await this.router.navigateByUrl('/admin/branch-moderation');}
  goBack():void{if(typeof window!=='undefined'&&window.history.length>1)this.location.back();else void this.router.navigate(['/admin/dashboard']);}

  private resolveSection():ContentSection{
    const data=String(this.route.snapshot.data['contentSection']||'').toLowerCase();
    if(data==='sale'||data==='tour'||data==='campaigns'||data==='blog'||data==='benefits'||data==='rental')return data;
    const path=this.router.url.split('?')[0].replace(/\/$/,'');
    if(path==='/admin/sales')return'sale';
    if(path==='/admin/tours')return'tour';
    if(path==='/admin/blog')return'blog';
    if(path==='/admin/benefits')return'benefits';
    return'rental';
  }
}
