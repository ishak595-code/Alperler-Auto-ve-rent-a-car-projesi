import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs/operators';
import { FooterSettingsService } from '../services/footer-settings.service';

@Component({
  selector:'app-customer-prefooter-v174',standalone:true,imports:[CommonModule,MatIconModule,RouterLink],
  template:`
    @if(visible()){
      <section class="prefooter" aria-labelledby="prefooter-v174-title">
        <div class="shell">
          <div class="copy"><p>{{settings().badge}}</p><h2 id="prefooter-v174-title">{{settings().title}}</h2><span>{{settings().description}}</span></div>
          <div class="actions"><a class="primary" [routerLink]="settings().primaryRoute">{{settings().primaryLabel}} <mat-icon aria-hidden="true">arrow_forward</mat-icon></a>@if(settings().secondaryLabel&&settings().secondaryRoute){<a class="secondary" [routerLink]="settings().secondaryRoute">{{settings().secondaryLabel}}</a>}</div>
          @if(settings().trustItems.length){<ul class="trust" aria-label="Hizmet güven bilgileri">@for(item of settings().trustItems;track item){<li><mat-icon aria-hidden="true">check_circle</mat-icon><span>{{item}}</span></li>}</ul>}
        </div>
      </section>
    }
  `,
  styles:[`
    :host{display:block}.prefooter{padding:1.25rem .75rem 0;background:#f8fafc}.shell{width:min(100%,80rem);margin:auto;display:grid;gap:1rem;border-radius:24px;background:linear-gradient(135deg,#07111f,#0f172a 62%,#064e3b);padding:1.25rem;color:#fff;box-shadow:0 18px 48px rgba(15,23,42,.16)}.copy p{margin:0;color:#6ee7b7;font-size:.6rem;font-weight:950;letter-spacing:.15em;text-transform:uppercase}.copy h2{margin:.25rem 0 0;font:900 clamp(1.45rem,4vw,2.35rem)/1.05 Georgia,"Times New Roman",serif}.copy span{display:block;margin-top:.55rem;max-width:780px;color:#cbd5e1;font-size:.75rem;line-height:1.55}.actions{display:flex;flex-wrap:wrap;gap:.55rem}.actions a{display:inline-flex;min-height:46px;align-items:center;justify-content:center;gap:.35rem;border-radius:12px;padding:0 .95rem;font-size:.72rem;font-weight:950;text-decoration:none}.primary{background:#34d399;color:#052e16}.secondary{border:1px solid rgba(255,255,255,.23);background:rgba(255,255,255,.08);color:#fff}.trust{display:grid;gap:.5rem;margin:0;padding:0;list-style:none}.trust li{display:flex;align-items:center;gap:.42rem;color:#dbeafe;font-size:.66rem;font-weight:800}.trust mat-icon{width:18px;height:18px;font-size:18px;color:#6ee7b7}.actions a:focus-visible{outline:3px solid #93c5fd;outline-offset:3px}@media(min-width:760px){.shell{grid-template-columns:minmax(0,1fr) auto;align-items:center;padding:1.5rem}.trust{grid-column:1/-1;grid-template-columns:repeat(3,minmax(0,1fr))}}@media(prefers-reduced-motion:reduce){.actions a{transition:none}}
  `]
})
export class CustomerPrefooterV174Component{
  private readonly footer=inject(FooterSettingsService);private readonly router=inject(Router);private readonly path=signal(this.router.url.split('?')[0]);readonly settings=this.footer.prefooter;
  readonly visible=computed(()=>{const cfg=this.settings();if(!cfg.isEnabled)return false;const home=this.path()==='/';return home?cfg.showOnHome:cfg.showOnInner;});
  constructor(){this.router.events.pipe(filter(event=>event instanceof NavigationEnd)).subscribe(()=>this.path.set(this.router.url.split('?')[0]));}
}
