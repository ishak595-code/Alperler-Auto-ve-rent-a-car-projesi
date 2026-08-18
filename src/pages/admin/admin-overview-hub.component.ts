import { CommonModule, Location } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminDashboardShellComponent } from './admin-dashboard-shell.component';
import { AdminAnalyticsComponent } from './admin-analytics.component';
import { AdminSystemHealthComponent } from './admin-system-health.component';

type OverviewSection = 'summary' | 'analytics' | 'health';

@Component({
  selector: 'app-admin-overview-hub',
  standalone: true,
  imports: [CommonModule, AdminDashboardShellComponent, AdminAnalyticsComponent, AdminSystemHealthComponent],
  template: `
    <div class="workspace">
      <header class="workspace-head">
        <div class="head-row">
          <button type="button" class="back" (click)="goBack()" aria-label="Önceki sayfaya dön">←</button>
          <div><p>Yönetim</p><h1>Kontrol Merkezi</h1><span>İşletmenin genel durumunu tek ekrandan takip edin.</span></div>
        </div>
        <nav class="tabs" aria-label="Kontrol merkezi bölümleri">
          <button type="button" [class.active]="active() === 'summary'" (click)="select('summary')">Özet</button>
          <button type="button" [class.active]="active() === 'analytics'" (click)="select('analytics')">Ziyaretçiler</button>
          <button type="button" [class.active]="active() === 'health'" (click)="select('health')">Sistem Durumu</button>
        </nav>
      </header>
      <main class="content">
        @switch (active()) {
          @case ('analytics') { <app-admin-analytics /> }
          @case ('health') { <app-admin-system-health /> }
          @default { <app-admin-dashboard-shell /> }
        }
      </main>
    </div>
  `,
  styles: [`
    :host{display:block;min-height:100vh;background:#f8fafc}.workspace{min-height:100vh}.workspace-head{position:sticky;top:0;z-index:80;border-bottom:1px solid #e2e8f0;background:rgba(248,250,252,.97);padding:.8rem 3.7rem .7rem 1rem;box-shadow:0 6px 20px rgba(15,23,42,.05);backdrop-filter:blur(12px)}.head-row{display:flex;width:min(100%,1240px);margin:auto;align-items:flex-start;gap:.7rem}.back{display:grid;width:42px;height:42px;flex:none;place-items:center;border:1px solid #dbe4ef;border-radius:12px;background:#fff;color:#0f172a;font-size:1.15rem;font-weight:950}.head-row p{margin:0;color:#2563eb;font-size:.58rem;font-weight:950;letter-spacing:.14em;text-transform:uppercase}.head-row h1{margin:.12rem 0 0;font-size:1.4rem;font-weight:950;color:#0f172a}.head-row span{display:block;margin-top:.2rem;color:#64748b;font-size:.68rem}.tabs{display:flex;width:min(100%,1240px);margin:.65rem auto 0;gap:.4rem;overflow-x:auto}.tabs button{min-height:42px;flex:0 0 auto;border:1px solid #e2e8f0;border-radius:12px;background:#fff;padding:0 .9rem;color:#475569;font-size:.68rem;font-weight:900}.tabs button.active{border-color:#2563eb;background:#eff6ff;color:#1d4ed8}.content{min-height:70vh}:host ::ng-deep .content>app-admin-analytics>main>header.sticky,:host ::ng-deep .content>app-admin-system-health>main>header.sticky{position:static!important;top:auto!important}@media(max-width:520px){.workspace-head{padding-left:.7rem;padding-right:3.5rem}.head-row h1{font-size:1.25rem}}
  `],
})
export class AdminOverviewHubComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  readonly active = signal<OverviewSection>('summary');

  async ngOnInit(): Promise<void> {
    const selected = this.resolveSection();
    this.active.set(selected);
    if (!this.router.url.startsWith('/admin/dashboard')) {
      await this.router.navigate(['/admin/dashboard'], { queryParams: { section: selected }, replaceUrl: true });
    }
  }

  select(section: OverviewSection): void {
    this.active.set(section);
    void this.router.navigate([], { relativeTo: this.route, queryParams: { section }, queryParamsHandling: 'merge', replaceUrl: true });
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  goBack(): void {
    if (typeof window !== 'undefined' && window.history.length > 1) this.location.back();
    else void this.router.navigate(['/']);
  }

  private resolveSection(): OverviewSection {
    const query = this.route.snapshot.queryParamMap.get('section');
    if (query === 'analytics' || query === 'health' || query === 'summary') return query;
    const data = this.route.snapshot.data['overviewSection'];
    return data === 'analytics' || data === 'health' ? data : 'summary';
  }
}
