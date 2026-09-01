import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AccountSecurityV223Component } from '../components/account-security-v223.component';
import { AccountDashboardV150Component } from './account-dashboard-v150.component';

@Component({
  selector: 'app-account-shell',
  standalone: true,
  imports: [RouterLink, AccountDashboardV150Component, AccountSecurityV223Component],
  template: `
    <nav class="account-shortcuts" aria-label="Hesap menüsü">
      <div>
        <a routerLink="/">Ana Sayfa</a>
        <a routerLink="/account">Genel Bakış</a>
        <a routerLink="/fleet" [queryParams]="{favs:true}">Favorilerim</a>
        <a routerLink="/account/wallet">Cüzdan ve Belgeler</a>
      </div>
    </nav>

    <app-account-dashboard-v150></app-account-dashboard-v150>

    <section class="security-section" aria-label="Hesap güvenliği">
      <details>
        <summary>Hesap Güvenliği <span>Parolanızı ve oturum güvenliğinizi yönetin</span></summary>
        <app-account-security-v223></app-account-security-v223>
      </details>
    </section>
  `,
  styles: [`
    :host{display:block;background:#060a12}.account-shortcuts{border-bottom:1px solid #263548;background:#08101c;padding:8px 12px}.account-shortcuts>div{display:flex;width:min(100%,1180px);margin:auto;gap:7px;overflow-x:auto;scrollbar-width:none}.account-shortcuts>div::-webkit-scrollbar{display:none}.account-shortcuts a{display:inline-flex;min-height:44px;flex:none;align-items:center;border:1px solid #304158;border-radius:10px;background:#0e1724;padding:0 13px;color:#dbe4ef;text-decoration:none;font-size:10px;font-weight:900}.security-section{width:min(calc(100% - 28px),1180px);margin:0 auto;padding:0 0 38px}.security-section details{border:1px solid #29394e;border-radius:17px;background:#0b1420;overflow:hidden}.security-section summary{display:flex;min-height:58px;cursor:pointer;align-items:center;justify-content:space-between;gap:12px;padding:0 16px;color:#f8fafc;font-size:12px;font-weight:900;list-style:none}.security-section summary::-webkit-details-marker{display:none}.security-section summary::after{content:'+';font-size:22px;color:#c6a15b}.security-section details[open] summary::after{content:'−'}.security-section summary span{color:#8fa0b5;font-size:10px;font-weight:650}.security-section app-account-security-v223{display:block;border-top:1px solid #29394e}.account-shortcuts a:focus-visible,.security-section summary:focus-visible{outline:3px solid #60a5fa;outline-offset:2px}@media(min-width:768px){.account-shortcuts{padding-block:10px}.account-shortcuts a{font-size:11px}.security-section summary{font-size:13px}}
  `],
})
export class AccountShellComponent {}
