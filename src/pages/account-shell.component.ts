import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { AccountBookingsV225Component } from './account-bookings-v225.component';
import { AccountOverviewV225Component } from './account-overview-v225.component';
import { AccountSettingsV225Component } from './account-settings-v225.component';

type AccountViewV225='overview'|'bookings'|'settings';

@Component({
  selector:'app-account-shell',
  standalone:true,
  imports:[RouterLink,AccountOverviewV225Component,AccountBookingsV225Component,AccountSettingsV225Component],
  template:`
    <nav class="account-shortcuts" aria-label="Hesap bölümleri">
      <div>
        <a routerLink="/account" [class.active]="view()==='overview'" [attr.aria-current]="view()==='overview'?'page':null">Genel Bakış</a>
        <a [routerLink]="['/account']" [queryParams]="{view:'bookings'}" [class.active]="view()==='bookings'" [attr.aria-current]="view()==='bookings'?'page':null">Rezervasyonlarım</a>
        <a routerLink="/fleet" [queryParams]="{favs:true}">Favorilerim</a>
        <a [routerLink]="['/account']" [queryParams]="{view:'settings'}" [class.active]="view()==='settings'" [attr.aria-current]="view()==='settings'?'page':null">Profil Ayarları</a>
        <a routerLink="/account/wallet">Cüzdan ve Belgeler</a>
      </div>
    </nav>
    @switch(view()){
      @case('bookings'){<app-account-bookings-v225/>}
      @case('settings'){<app-account-settings-v225/>}
      @default{<app-account-overview-v225/>}
    }
  `,
  styles:[`
    :host{display:block;min-height:100dvh;background:#060a12}.account-shortcuts{position:sticky;top:0;z-index:55;border-bottom:1px solid #263548;background:rgba(8,16,28,.97);padding:8px 12px;backdrop-filter:blur(14px)}.account-shortcuts>div{display:flex;width:min(100%,1080px);margin:auto;gap:7px;overflow-x:auto;scrollbar-width:none}.account-shortcuts>div::-webkit-scrollbar{display:none}.account-shortcuts a{display:inline-flex;min-height:42px;flex:none;align-items:center;border:1px solid #304158;border-radius:11px;background:#0e1724;padding:0 13px;color:#dbe4ef;text-decoration:none;font-size:10px;font-weight:900}.account-shortcuts a.active{border-color:#c6a15b;background:#1b1a16;color:#f7df9b}.account-shortcuts a:focus-visible{outline:3px solid #60a5fa;outline-offset:2px}@media(min-width:768px){.account-shortcuts{padding-block:10px}.account-shortcuts a{font-size:11px}}
  `]
})
export class AccountShellComponent{
  private readonly route=inject(ActivatedRoute);
  private readonly rawView=toSignal(this.route.queryParamMap.pipe(map(params=>String(params.get('view')||'overview').toLowerCase())),{initialValue:'overview'});
  readonly view=computed<AccountViewV225>(()=>this.rawView()==='bookings'?'bookings':this.rawView()==='settings'?'settings':'overview');
}
