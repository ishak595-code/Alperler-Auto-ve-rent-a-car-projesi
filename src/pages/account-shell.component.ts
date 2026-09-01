import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { AccountFavoritesV213Component } from '../components/account-favorites-v213.component';
import { AccountProfileSettingsV225Component } from '../components/account-profile-settings-v225.component';
import { AccountDashboardV150Component } from './account-dashboard-v150.component';

type AccountSection = 'overview' | 'favorites' | 'profile';

@Component({
  selector:'app-account-shell',
  standalone:true,
  imports:[RouterLink,AccountDashboardV150Component,AccountFavoritesV213Component,AccountProfileSettingsV225Component],
  template:`
    <main class="account-shell" aria-labelledby="account-page-title">
      <header class="account-head">
        <a routerLink="/" class="home-link" aria-label="Ana sayfaya dön"><span aria-hidden="true">←</span><span>Ana Sayfa</span></a>
        <div>
          <p class="eyebrow">ALPERLER HESABIM</p>
          <h1 id="account-page-title">Hesabım</h1>
          <p>Rezervasyonlarınızı, favorilerinizi, profilinizi ve cüzdanınızı kolayca yönetin.</p>
        </div>
      </header>

      <nav class="account-shortcuts" aria-label="Hesap bölümleri">
        <a routerLink="/account" [attr.aria-current]="section()==='overview' ? 'page' : null" [class.active]="section()==='overview'">Genel Bakış</a>
        <a routerLink="/account" [queryParams]="{section:'favorites'}" [attr.aria-current]="section()==='favorites' ? 'page' : null" [class.active]="section()==='favorites'">Favorilerim</a>
        <a routerLink="/account" [queryParams]="{section:'profile'}" [attr.aria-current]="section()==='profile' ? 'page' : null" [class.active]="section()==='profile'">Profil Ayarları</a>
        <a routerLink="/account/wallet">Cüzdan ve Belgeler</a>
      </nav>

      <section class="account-content" aria-live="polite">
        @switch (section()) {
          @case ('favorites') { <app-account-favorites-v213 /> }
          @case ('profile') { <app-account-profile-settings-v225 /> }
          @default { <app-account-dashboard-v150 /> }
        }
      </section>
    </main>
  `,
  styles:[`
    :host{display:block;background:#060a12}.account-shell{min-height:100vh;background:#060a12;color:#f4f6f8}.account-head{width:min(100%,1180px);margin:auto;padding:clamp(18px,4vw,34px) clamp(14px,3vw,34px) 12px}.home-link{display:inline-flex;min-height:42px;align-items:center;gap:.45rem;border:1px solid #263548;border-radius:12px;background:#0b1420;padding:0 .85rem;color:#dbe7f5;text-decoration:none;font-size:.72rem;font-weight:900}.home-link:focus-visible,.account-shortcuts a:focus-visible{outline:3px solid #60a5fa;outline-offset:3px}.account-head>div{margin-top:18px}.eyebrow{margin:0;color:#c6a15b;font-size:.58rem;font-weight:950;letter-spacing:.14em}.account-head h1{margin:.3rem 0 0;font:700 clamp(1.85rem,6vw,3rem)/1.02 Georgia,serif}.account-head p:not(.eyebrow){max-width:720px;margin:.5rem 0 0;color:#9eacc0;font-size:.76rem;line-height:1.6}.account-shortcuts{display:flex;width:100%;gap:.55rem;overflow-x:auto;border-block:1px solid #263548;background:#07101b;padding:10px max(14px,calc((100vw - 1180px)/2 + 14px));scrollbar-width:none}.account-shortcuts::-webkit-scrollbar{display:none}.account-shortcuts a{display:inline-flex;min-height:44px;flex:0 0 auto;align-items:center;border:1px solid #304158;border-radius:12px;background:#0d1724;padding:0 14px;color:#dce6f2;text-decoration:none;font-size:.7rem;font-weight:900}.account-shortcuts a.active{border-color:#54779c;background:#13263a;color:#fff;box-shadow:inset 0 0 0 1px rgba(96,165,250,.12)}.account-content{padding-top:18px}@media(max-width:620px){.account-head{padding-top:14px}.account-shortcuts{padding-inline:14px}}
  `]
})
export class AccountShellComponent {
  private readonly route=inject(ActivatedRoute);
  private readonly requestedSection=toSignal(this.route.queryParamMap.pipe(map((params)=>params.get('section')||'overview')),{initialValue:'overview'});
  readonly section=computed<AccountSection>(()=>{
    const value=this.requestedSection();
    if(value==='favorites')return'favorites';
    if(value==='profile'||value==='security')return'profile';
    return'overview';
  });
}
