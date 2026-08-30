import { Component } from '@angular/core';
import { AdminCustomerDetailComponent } from './admin-customer-detail.component';
import { AdminCustomerLifetimePanelComponent } from '../../components/admin-customer-lifetime-panel.component';

@Component({
  selector: 'app-admin-customer-detail-shell-v218',
  standalone: true,
  imports: [AdminCustomerDetailComponent, AdminCustomerLifetimePanelComponent],
  template: `
    <app-admin-customer-detail />
    <app-admin-customer-lifetime-panel />
  `,
})
export class AdminCustomerDetailShellV218Component {}
