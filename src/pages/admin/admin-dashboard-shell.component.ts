import { Component } from '@angular/core';
import { AdminOperationsDashboardComponent } from './admin-operations-dashboard.component';

@Component({
  selector: 'app-admin-dashboard-shell',
  standalone: true,
  imports: [AdminOperationsDashboardComponent],
  template: `<app-admin-operations-dashboard />`,
})
export class AdminDashboardShellComponent {}
