import { CommonModule, Location } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminCatalogWorkspaceComponent } from './admin-catalog-workspace.component';
import { AdminCampaignsV167Component } from './admin-campaigns-v167.component';
import { AdminCommercialBenefitsComponent } from './admin-commercial-benefits.component';
import { AdminBlogComponent } from './admin-blog.component';
import { CatalogAdminEditorService } from '../../services/catalog-admin-editor.service';
import { CatalogAdminResilientService } from '../../services/catalog-admin-resilient.service';
import { CatalogMediaService } from '../../services/catalog-media.service';
import { CatalogMediaHighCapacityService } from '../../services/catalog-media-high-capacity.service';
import { BlogAdminService } from '../../services/blog-admin.service';
import { BlogAdminResilientService } from '../../services/blog-admin-resilient.service';

type ContentSection='rental'|'sale'|'tour'|'campaigns'|'benefits'|'blog';

@Component({
  selector:'app-admin-content-hub',
  standalone:true,
  imports:[CommonModule,AdminCatalogWorkspaceComponent,AdminCampaignsV167Component,AdminCommercialBenefitsComponent,AdminBlogComponent],
  providers:[
    {provide:CatalogAdminEditorService,useClass:CatalogAdminResilientService},
    {provide:CatalogMediaService,useClass:CatalogMediaHighCapacityService},
    {provide:BlogAdminService,useClass:BlogAdminResilientService},
  ],
  template:`
    <div class="workspace">
      <header class="workspace-head">
        <div class="head-row"><button type="button" class="back" (click)="goBack()" aria-label="Önceki sayfaya dön">←</button><div><p>İçerik Yönetimi</p><h1>İçerik & Katalog</h1><span>Vitrindeki tüm katalog içerikleri tek yönetim alanından açılır. Liste satırları kompakt tutulur, ayrıntılar tıklanınca açılır.</span></div></div>
        <nav class="tabs" aria-label="İçerik ve katalog bölümleri">
          <button type="button" [class.active]="active()==='rental'" (click)="select('rental')">Kiralık Araçlar</button>
          <button type="button" [class.active]="active()==='sale'" (click)="select('sale')">Satılık Araçlar</button>
          <button type="button" [class.active]="active()==='tour'" (click)="select('tour')">Turlar</button>
          <button type="button" [class.active]="active()==='campaigns'" (click)="select('campaigns')">Kampanyalar</button>
          <button type="button" [class.active]="active()==='blog'" (click)="select('blog')">Blog</button>
          <button type="button" (click)="openBranchModeration()">Şube İlan Onayları</button>
          <button type="button" [class.active]="active()==='benefits'" (click)="select('benefits')">Fiyat & Sadakat</button>
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
  styles:[`:host{display:block;min-height:100vh;background:#f8fafc}.workspace{min-height:100vh}.workspace-head{position:sticky;top:0;z-index:80;border-bottom:1px solid #e2e8f0;background:rgba(248,250,252,.97);padding:.8rem 3.7rem .7rem 1rem;box-shadow:0 6px 20px rgba(15,23,42,.05);backdrop-filter:blur(12px)}.head-row{display:flex;width:min(100%,1240px);margin:auto;align-items:flex-start;gap:.7rem}.back{display:grid;width:42px;height:42px;flex:none;place-items:center;border:1px solid #dbe4ef;border-radius:12px;background:#fff;color:#0f172a;font-size:1.15rem;font-weight:950}.head-row p{margin:0;color:#2563eb;font-size:.58rem;font-weight:950;letter-spacing:.14em;text-transform:uppercase}.head-row h1{margin:.12rem 0 0;font-size:1.4rem;font-weight:950;color:#0f172a}.head-row span{display:block;margin-top:.2rem;color:#64748b;font-size:.68rem}.tabs{display:flex;width:min(100%,1240px);margin:.65rem auto 0;gap:.4rem;overflow-x:auto}.tabs button{min-height:42px;flex:0 0 auto;border:1px solid #e2e8f0;border-radius:12px;background:#fff;padding:0 .9rem;color:#475569;font-size:.68rem;font-weight:900}.tabs button.active{border-color:#2563eb;background:#eff6ff;color:#1d4ed8}.content{min-height:70vh}:host ::ng-deep .content .sticky.top-16,:host ::ng-deep .content .sticky.top-0{position:static!important;top:auto!important}:host ::ng-deep .content .record-grid{display:block!important;padding:0 13px 13px}:host ::ng-deep .content .record-card{width:100%!important;display:grid!important;grid-template-columns:72px 1fr auto!important;align-items:center!important;gap:10px!important;margin:0!important;padding:7px!important;border:0!important;border-bottom:1px solid #e2e8f0!important;border-radius:0!important;text-align:left!important;background:#fff!important}:host ::ng-deep .content .record-card:last-child{border-bottom:0!important}:host ::ng-deep .content .record-card .thumb{width:72px!important;height:50px!important;aspect-ratio:auto!important;border-radius:8px!important;overflow:hidden!important}:host ::ng-deep .content .record-card .thumb img{width:100%!important;height:100%!important;object-fit:cover!important}:host ::ng-deep .content .record-card .copy{min-width:0!important;padding:0!important}:host ::ng-deep .content .record-card .copy strong{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:11px}:host ::ng-deep .content .record-card .copy small{display:block;margin-top:2px;color:#64748b;font-size:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}:host ::ng-deep .content .record-card .thumb span{font-size:7px!important;padding:3px 5px!important}:host ::ng-deep .content .cards{display:block!important;padding:0 13px 13px!important}:host ::ng-deep .content .cards>article{display:grid!important;grid-template-columns:72px 1fr!important;gap:10px!important;align-items:center!important;margin:0!important;padding:8px 0!important;border:0!important;border-bottom:1px solid #e2e8f0!important;border-radius:0!important;box-shadow:none!important}:host ::ng-deep .content .cards>article:last-child{border-bottom:0!important}:host ::ng-deep .content .cards .cover{width:72px!important;height:52px!important;aspect-ratio:auto!important;border-radius:8px!important;overflow:hidden!important}.content ::ng-deep .cards .copy{padding:0!important}.content ::ng-deep .cards .copy h3{margin:0!important;font-size:11px!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.content ::ng-deep .cards .copy p{min-height:0!important;margin:3px 0!important;font-size:9px!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.content ::ng-deep .cards .copy .row{margin-top:4px!important}.content ::ng-deep .cards .copy .row button{min-height:30px!important;padding:0 8px!important;font-size:8px!important}.content ::ng-deep .grid article{display:grid!important;grid-template-columns:72px 1fr!important;align-items:center!important;gap:10px!important;padding:8px 0!important;border:0!important;border-bottom:1px solid #e2e8f0!important;border-radius:0!important}.content ::ng-deep .grid article .cover{width:72px!important;height:52px!important;aspect-ratio:auto!important}.content ::ng-deep .grid article .copy{padding:0!important}.content ::ng-deep .grid article .copy h3{font-size:11px!important}.content ::ng-deep .grid article .copy p{min-height:0!important;margin:3px 0!important;font-size:9px!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.content ::ng-deep .grid article .copy>div{margin-top:4px!important}.content ::ng-deep .grid article .copy button{min-height:30px!important;font-size:8px!important}@media(max-width:520px){.workspace-head{padding-left:.7rem;padding-right:3.5rem}.head-row h1{font-size:1.25rem}}`]
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
