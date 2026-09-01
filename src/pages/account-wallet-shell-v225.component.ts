import { Component } from '@angular/core';
import { CustomerSavedCardsV225Component } from '../components/customer-saved-cards-v225.component';
import { AccountWalletComponent } from './account-wallet.component';

@Component({
  selector:'app-account-wallet-shell-v225',
  standalone:true,
  imports:[CustomerSavedCardsV225Component,AccountWalletComponent],
  template:`<div class="wallet-shell"><app-customer-saved-cards-v225/><app-account-wallet/></div>`,
  styles:[`:host{display:block;background:#060a12;min-height:100dvh}.wallet-shell{min-height:100dvh}`]
})
export class AccountWalletShellV225Component{}
