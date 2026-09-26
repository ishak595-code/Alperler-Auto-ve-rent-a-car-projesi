import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs/operators';
import { FooterSettingsService } from '../services/footer-settings.service';
import { UiService } from '../services/ui.service';
import { modernizeLegacyCtaCase } from "../services/legacy-cta-casing";

@Component({
  selector:'app-customer-prefooter-v174',standalone:true,imports:[CommonModule,MatIconModule,RouterLink],
  template:`
    @if(visible()){
      <section class="prefooter" aria-labelledby="prefooter-v174-title">
        <div class="shell">
          <div class="copy"><p>{{chrome().badge}}</p><h2 id="prefooter-v174-title">{{chrome().title}}</h2><span>{{chrome().description}}</span></div>
          <div class="actions"><a class="primary" [routerLink]="settings().primaryRoute">{{chrome().primaryLabel}} <mat-icon aria-hidden="true">arrow_forward</mat-icon></a>@if(chrome().secondaryLabel&&settings().secondaryRoute){<a class="secondary" [routerLink]="settings().secondaryRoute">{{chrome().secondaryLabel}}</a>}</div>
          @if(chrome().trustItems.length){<ul class="trust" [attr.aria-label]="t().prefooter.trustAria">@for(item of chrome().trustItems;track item){<li><mat-icon aria-hidden="true">check_circle</mat-icon><span>{{item}}</span></li>}</ul>}
        </div>
      </section>
    }
  `,
  styles:[`
    :host{display:block}.prefooter{padding:clamp(1.25rem,1rem + 1.5vw,2.25rem) clamp(.75rem,3vw,1.25rem) 0;background:#06080D}.shell{width:min(100%,80rem);margin:auto;display:grid;gap:1.1rem;border:1px solid rgba(212,175,55,.2);border-radius:24px;background:radial-gradient(ellipse at 90% 0,rgba(212,175,55,.1),transparent 55%),linear-gradient(145deg,#10131A,#0A0C11);padding:clamp(1.25rem,1rem + 1.2vw,2rem);color:#F4F1EA;box-shadow:0 22px 52px rgba(0,0,0,.38),inset 0 1px 0 rgba(255,255,255,.04)}.copy p{margin:0;color:#DDBE63;font-size:.75rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase}.copy h2{margin:.35rem 0 0;font:600 clamp(1.6rem,1.3rem + 1.4vw,2.4rem)/1.12 "Playfair Display",Georgia,"Times New Roman",serif}.copy span{display:block;margin-top:.6rem;max-width:780px;color:#BDB8AC;font-size:clamp(.9375rem,.9rem + .15vw,1rem);line-height:1.6}.actions{display:flex;flex-wrap:wrap;gap:.65rem}.actions a{display:inline-flex;min-height:48px;align-items:center;justify-content:center;gap:.4rem;border-radius:12px;padding:0 1.2rem;font-size:.9375rem;font-weight:800;text-decoration:none;transition:filter .16s ease,border-color .16s ease,background-color .16s ease}.primary{background:linear-gradient(135deg,#b3202a,#8a141c);color:#fff;box-shadow:0 10px 26px rgba(158,27,36,.28)}.primary:hover{filter:brightness(1.08)}.secondary{border:1px solid rgba(212,175,55,.38);background:rgba(212,175,55,.06);color:#F4F1EA}.secondary:hover{border-color:#D4AF37;background:rgba(212,175,55,.12)}.trust{display:grid;gap:.6rem;margin:0;padding:0;list-style:none}.trust li{display:flex;align-items:center;gap:.5rem;color:#DCD8CE;font-size:.875rem;font-weight:600;line-height:1.4}.trust mat-icon{width:20px;height:20px;flex:none;font-size:20px;color:#D4AF37}.actions a:focus-visible{outline:3px solid #D4AF37;outline-offset:3px}@media(min-width:760px){.shell{grid-template-columns:minmax(0,1fr) auto;align-items:center}.trust{grid-column:1/-1;grid-template-columns:repeat(3,minmax(0,1fr))}}@media(prefers-reduced-motion:reduce){.actions a{transition:none}}
  `]
})
export class CustomerPrefooterV174Component{
  private readonly footer=inject(FooterSettingsService);private readonly router=inject(Router);private readonly ui=inject(UiService);readonly t=this.ui.translations;private readonly path=signal(this.router.url.split('?')[0]);readonly settings=this.footer.prefooter;
  readonly visible=computed(()=>{const cfg=this.settings();if(!cfg.isEnabled)return false;const home=this.path()==='/';return home?cfg.showOnHome:cfg.showOnInner;});
  readonly chrome=computed(()=>{const admin=this.settings();const pack=this.ui.publicPrefooterChrome();if(this.ui.currentLang()==='TR')return{badge:admin.badge,title:admin.title,description:admin.description,primaryLabel:modernizeLegacyCtaCase(admin.primaryLabel),secondaryLabel:modernizeLegacyCtaCase(admin.secondaryLabel),trustItems:admin.trustItems};return{badge:pack.badge||admin.badge,title:pack.title||admin.title,description:pack.description||admin.description,primaryLabel:pack.primaryLabel||admin.primaryLabel,secondaryLabel:pack.secondaryLabel||admin.secondaryLabel,trustItems:(pack.trustItems&&pack.trustItems.length)?pack.trustItems:admin.trustItems};});
  constructor(){this.router.events.pipe(filter(event=>event instanceof NavigationEnd)).subscribe(()=>this.path.set(this.router.url.split('?')[0]));}
}
