import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AccountDashboardComponent } from './account-dashboard.component';

@Component({
  selector:'app-account-shell',
  standalone:true,
  imports:[RouterLink,AccountDashboardComponent],
  template:`
    <div class="account-shell">
      <nav class="account-dock" aria-label="Hesap hızlı menüsü">
        <div class="dock-inner">
          <a href="#settings" class="primary-link"><span aria-hidden="true">👤</span><b>Profil Düzenle</b><small>Kişisel bilgiler</small></a>
          <a routerLink="/account/wallet"><span aria-hidden="true">▣</span><b>Cüzdan</b><small>Belge ve ödeme</small></a>
          <a href="#loyalty"><span aria-hidden="true">★</span><b>Sadakat</b><small>Puan ve avantajlar</small></a>
          <a href="#history"><span aria-hidden="true">↺</span><b>İşlemlerim</b><small>Geçmiş ve durum</small></a>
        </div>
      </nav>

      <section class="services" aria-labelledby="account-services-title">
        <div class="services-head"><p>HIZLI HİZMETLER</p><h2 id="account-services-title">Tek dokunuşla işleminize geçin</h2></div>
        <div class="service-grid">
          <a routerLink="/fleet"><b>Araç Kirala</b><span>Kiralık araçları aç</span></a>
          <a routerLink="/sales"><b>Araç Satın Al</b><span>Satılık araçları aç</span></a>
          <a routerLink="/tours"><b>Tur Planla</b><span>Turları keşfet</span></a>
          <a routerLink="/list-your-car" class="valuation"><b>Arabanı Değerlendir</b><span>Aracın için teklif iste</span></a>
        </div>
      </section>

      <app-account-dashboard></app-account-dashboard>
    </div>
  `,
  styles:[`
    :host{display:block;background:var(--alper-bg,#060a12);color:var(--alper-text,#f4f6f8)}.account-shell{min-height:100vh}.account-dock{position:sticky;top:0;z-index:40;border-bottom:1px solid var(--alper-border,#27364a);background:color-mix(in srgb,var(--alper-bg,#060a12) 94%,transparent);backdrop-filter:blur(16px);padding:10px 14px}.dock-inner,.services{width:min(100%,1220px);margin:auto}.dock-inner{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.dock-inner a{display:grid;grid-template-columns:auto 1fr;grid-template-rows:auto auto;column-gap:9px;align-items:center;min-height:56px;border:1px solid var(--alper-border,#27364a);border-radius:13px;background:var(--alper-card,#0e1724);padding:8px 10px;color:var(--alper-text,#fff);text-decoration:none}.dock-inner a>span{grid-row:1/3;display:grid;width:30px;height:30px;place-items:center;border-radius:9px;background:var(--alper-elevated,#121d2c);font-size:.9rem}.dock-inner b{font-size:.68rem;line-height:1.15}.dock-inner small{color:var(--alper-muted,#a2adba);font-size:.55rem}.dock-inner .primary-link{border-color:color-mix(in srgb,var(--alper-gold,#c6a15b) 55%,var(--alper-border,#27364a))}.services{padding:18px clamp(16px,3vw,38px) 0}.services-head p{margin:0;color:var(--alper-gold,#c6a15b);font-size:.56rem;font-weight:950;letter-spacing:.15em}.services-head h2{margin:.3rem 0 .8rem;font:650 clamp(1.05rem,3vw,1.45rem)/1.15 Georgia,serif}.service-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.service-grid a{display:block;min-height:72px;border:1px solid var(--alper-border,#27364a);border-radius:14px;background:var(--alper-surface,#0b1420);padding:12px;color:var(--alper-text,#fff);text-decoration:none}.service-grid b,.service-grid span{display:block}.service-grid b{font-size:.72rem}.service-grid span{margin-top:5px;color:var(--alper-muted,#a2adba);font-size:.58rem}.service-grid .valuation{border-color:color-mix(in srgb,var(--alper-gold,#c6a15b) 45%,var(--alper-border,#27364a));background:color-mix(in srgb,var(--alper-gold,#c6a15b) 7%,var(--alper-surface,#0b1420))}a:focus-visible{outline:3px solid var(--alper-blue-light,#7899b8);outline-offset:2px}@media(max-width:720px){.account-dock{padding:8px}.dock-inner{grid-template-columns:repeat(4,minmax(0,1fr));gap:5px}.dock-inner a{display:flex;min-width:0;min-height:54px;justify-content:center;padding:6px 3px;text-align:center}.dock-inner a>span{display:none}.dock-inner b{font-size:.58rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.dock-inner small{display:none}.services{padding:14px 10px 0}.service-grid{grid-template-columns:1fr 1fr}.service-grid a{min-height:66px}.services-head h2{font-size:1rem}}
  `]
})
export class AccountShellComponent{}
