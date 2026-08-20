import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CustomerAuthService } from '../services/customer-auth.service';

@Component({selector:'app-account-callback',standalone:true,template:`<main style="min-height:100vh;display:grid;place-items:center;background:#07101f;color:white;padding:1rem"><section role="status" aria-live="polite" style="text-align:center"><h1 style="margin:0 0 .5rem">Hesabınız hazırlanıyor</h1><p style="margin:0;color:#cbd5e1">Güvenli giriş tamamlanıyor…</p></section></main>`})
export class AccountCallbackComponent implements OnInit{
  private readonly auth=inject(CustomerAuthService);private readonly router=inject(Router);
  async ngOnInit(){await this.auth.waitUntilReady();await this.router.navigate([this.auth.isLoggedIn()?'/account':'/account/login'],{replaceUrl:true});}
}
