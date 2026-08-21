import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CustomerAuthService } from '../services/customer-auth.service';

@Component({
  selector:'app-account-callback',
  standalone:true,
  template:`<main style="min-height:100vh;display:grid;place-items:center;background:#050a18;color:#f8fafc;padding:1rem"><section role="status" aria-live="polite" style="text-align:center;max-width:420px"><div style="width:42px;height:42px;margin:0 auto 1rem;border-radius:13px;background:#eabf35;color:#111827;display:grid;place-items:center;font-weight:900">A</div><h1 style="margin:0 0 .5rem;font-family:Georgia,serif;font-size:1.6rem">Giriş tamamlanıyor</h1><p style="margin:0;color:#94a3b8;line-height:1.6">Hesabınız güvenli şekilde hazırlanıyor…</p></section></main>`
})
export class AccountCallbackComponent implements OnInit{
  private readonly auth=inject(CustomerAuthService);
  private readonly router=inject(Router);
  async ngOnInit(){
    await this.auth.waitUntilReady();
    const target=this.auth.isLoggedIn()?this.auth.consumePostAuthReturnUrl('/account'):'/account/login';
    await this.router.navigateByUrl(target,{replaceUrl:true});
  }
}
