import { Component } from '@angular/core';
import { AccountDashboardV150Component } from './account-dashboard-v150.component';

@Component({
  selector: 'app-account-shell',
  standalone: true,
  imports: [AccountDashboardV150Component],
  template: `<app-account-dashboard-v150></app-account-dashboard-v150>`,
})
export class AccountShellComponent {}
