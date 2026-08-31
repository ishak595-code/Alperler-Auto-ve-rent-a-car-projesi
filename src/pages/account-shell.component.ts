import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AccountFavoritesV213Component } from '../components/account-favorites-v213.component';
import { AccountDashboardV150Component } from './account-dashboard-v150.component';

@Component({
  selector: 'app-account-shell',
  standalone: true,
  imports: [RouterLink, AccountDashboardV150Component, AccountFavoritesV213Component],
  template: `
    <nav class="account-shortcuts" aria-label="Hesap kısa yolları">
      <div>
        <a routerLink="/account">Hesabım</a>
        <a routerLink="/account/favorites">Favorilerim</a>
        <a routerLink="/account/wallet">Cüzdan ve Belgeler</a>
      </div>
    </nav>
    <app-account-favorites-v213></app-account-favorites-v213>
    <app-account-dashboard-v150></app-account-dashboard-v150>
  `,
  styles: [`
    :host{display:block;background:#060a12}.account-shortcuts{border-bottom:1px solid #263548;background:#08101c;padding:8px 12px}.account-shortcuts>div{display:flex;width:min(100%,1180px);margin:auto;gap:7px;overflow-x:auto;scrollbar-width:none}.account-shortcuts>div::-webkit-scrollbar{display:none}.account-shortcuts a{display:inline-flex;min-height:40px;flex:none;align-items:center;border:1px solid #304158;border-radius:10px;background:#0e1724;padding:0 12px;color:#dbe4ef;text-decoration:none;font-size:10px;font-weight:900}.account-shortcuts a:focus-visible{outline:3px solid #60a5fa;outline-offset:2px}:host ::ng-deep app-account-dashboard-v150 .overview header>button{display:none!important}:host ::ng-deep app-account-dashboard-v150 .overview header>div>span{display:none!important}@media(min-width:768px){.account-shortcuts{padding-block:10px}.account-shortcuts a{font-size:11px}}
  `],
})
export class AccountShellComponent {}
