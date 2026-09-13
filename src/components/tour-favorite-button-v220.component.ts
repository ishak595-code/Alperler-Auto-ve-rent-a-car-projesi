import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { CustomerFavoritesV217Service } from '../services/customer-favorites-v217.service';
import { PublicDetailDataService } from '../services/public-detail-data.service';
import { UiService } from '../services/ui.service';

@Component({
  selector:'app-tour-favorite-button-v220',
  standalone:true,
  imports:[MatIconModule],
  template:`
    @if(ready()){
      <button
        type="button"
        class="tour-favorite"
        [class.active]="active()"
        [disabled]="working()"
        [attr.aria-pressed]="active()"
        [attr.aria-label]="active() ? t().tourFavorite.removeAria : t().tourFavorite.addAria"
        (click)="toggle()"
      >
        <mat-icon aria-hidden="true">{{active()?'favorite':'favorite_border'}}</mat-icon>
        <span>{{active()? t().tourFavorite.active : t().tourFavorite.add}}</span>
      </button>
      <span class="sr-status" aria-live="polite">{{status()}}</span>
    }
  `,
  styles:[`
    :host{position:fixed;z-index:72;top:max(14px,env(safe-area-inset-top));right:14px;pointer-events:none}.tour-favorite{pointer-events:auto;display:flex;min-height:44px;align-items:center;gap:7px;border:1px solid rgba(255,255,255,.24);border-radius:999px;background:rgba(7,16,30,.92);padding:0 13px;color:#fff;box-shadow:0 10px 30px rgba(0,0,0,.3);backdrop-filter:blur(12px);font:850 11px/1 system-ui,sans-serif}.tour-favorite mat-icon{width:20px;height:20px;font-size:20px;color:#f8fafc}.tour-favorite.active{border-color:rgba(248,113,113,.65);background:rgba(127,29,29,.92)}.tour-favorite.active mat-icon{color:#fecaca}.tour-favorite:disabled{opacity:.65}.tour-favorite:focus-visible{outline:3px solid #E15A62;outline-offset:3px}.sr-status{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap}@media(max-width:420px){.tour-favorite span:not(.sr-status){display:none}.tour-favorite{width:44px;justify-content:center;padding:0}}@media(prefers-reduced-motion:reduce){.tour-favorite{transition:none}}
  `],
})
export class TourFavoriteButtonV220Component implements OnInit {
  private readonly route=inject(ActivatedRoute);
  private readonly detail=inject(PublicDetailDataService);
  private readonly favorites=inject(CustomerFavoritesV217Service);
  private readonly ui=inject(UiService);
  readonly t=this.ui.translations;
  readonly ready=signal(false);
  readonly active=signal(false);
  readonly working=signal(false);
  readonly status=signal('');
  private entityId='';
  private metadata:Record<string,unknown>={};

  async ngOnInit():Promise<void>{
    const routeId=String(this.route.snapshot.paramMap.get('id')||'').trim();
    if(!routeId)return;
    try{
      const tour=await this.detail.load('TOUR',routeId);
      this.entityId=String(tour.cloudId||tour.id||'').trim();
      if(!this.entityId)return;
      const F=this.t().tourFavorite;
      this.metadata={
        title:String(tour.title||F.fallbackTitle),
        subtitle:[tour.duration,tour.location||tour.meetingPoint].filter(Boolean).join(' · '),
        imageUrl:String(tour.image||tour.images?.[0]||''),
        route:`/tour/${encodeURIComponent(String(tour.cloudSlug||tour.cloudId||tour.id))}`,
        priceText:tour.price?F.pricePerPerson.replace('{price}', new Intl.NumberFormat(this.numberLocale()).format(Number(tour.price))):'',
      };
      await this.favorites.hydrateVisible('TOUR',[this.entityId]).catch(()=>undefined);
      this.active.set(this.favorites.isFavorite('TOUR',this.entityId));
      this.ready.set(true);
    }catch{
      this.ready.set(false);
    }
  }

  async toggle():Promise<void>{
    if(!this.entityId||this.working())return;
    this.working.set(true);
    this.status.set('');
    try{
      const active=await this.favorites.toggle('TOUR',this.entityId,this.metadata);
      this.active.set(active);
      this.status.set(active?this.t().tourFavorite.added:this.t().tourFavorite.removed);
    }catch{
      this.status.set(this.t().tourFavorite.fail);
    }finally{
      this.working.set(false);
    }
  }

  private numberLocale():string{
    const map:Record<string,string>={TR:'tr-TR',EN:'en-US',DE:'de-DE',FR:'fr-FR',ES:'es-ES',RU:'ru-RU',KU:'ku',ZH:'zh-CN',AR:'ar'};
    return map[this.ui.currentLang()]||'tr-TR';
  }
}
