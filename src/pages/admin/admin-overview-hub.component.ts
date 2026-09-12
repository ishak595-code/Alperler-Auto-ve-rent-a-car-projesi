import { CommonModule, Location } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminAccessService, AdminArea } from '../../services/admin-access.service';
import { AdminDashboardShellComponent } from './admin-dashboard-shell.component';
import { AdminAnalyticsComponent } from './admin-analytics.component';
import { AdminSystemHealthComponent } from './admin-system-health.component';

type OverviewSection = 'summary' | 'analytics' | 'health';
interface OverviewTab { id: OverviewSection; label: string; area?: AdminArea; }

@Component({
  selector: 'app-admin-overview-hub',
  standalone: true,
  imports: [CommonModule, AdminDashboardShellComponent, AdminAnalyticsComponent, AdminSystemHealthComponent],
  template: `
    <div class="workspace">
      <header class="workspace-head">
        <div class="head-row">
          <button type="button" class="back" (click)="goBack()" aria-label="Önceki sayfaya dön">←</button>
          <h1>Kontrol Merkezi</h1>
        </div>
        <nav class="tabs" aria-label="Kontrol merkezi bölümleri">
          @for (tab of visibleTabs(); track tab.id) {
            <button type="button" [class.active]="active() === tab.id" [attr.aria-current]="(active() === tab.id) ? 'page' : null" (click)="select(tab.id)">{{ tab.label }}</button>
          }
        </nav>
      </header>
      <main class="content">
        @if (ready()) {
          @switch (active()) {
            @case ('analytics') { <app-admin-analytics /> }
            @case ('health') { <app-admin-system-health /> }
            @default { <app-admin-dashboard-shell /> }
          }
        } @else {
          <div class="loading">Yönetim alanı hazırlanıyor…</div>
        }
      </main>
    </div>
  `,
  styles: [`
    :host{display:block;min-height:100vh;background:#f8fafc}.workspace{min-height:100vh}.workspace-head{position:sticky;top:0;z-index:80;border-bottom:1px solid #e2e8f0;background:rgba(248,250,252,.97);padding:.45rem 3.4rem .45rem .7rem;box-shadow:0 4px 14px rgba(15,23,42,.05);backdrop-filter:blur(12px)}.head-row{display:flex;width:min(100%,1240px);margin:auto;align-items:center;gap:.6rem}.back{display:grid;width:38px;height:38px;flex:none;place-items:center;border:1px solid #dbe4ef;border-radius:10px;background:#fff;color:#0f172a;font-size:1.05rem;font-weight:950}.head-row h1{margin:0;font-size:1.05rem;font-weight:950;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tabs{display:flex;width:min(100%,1240px);margin:.4rem auto 0;gap:.35rem;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch}.tabs button{min-height:36px;flex:0 0 auto;border:1px solid #e2e8f0;border-radius:10px;background:#fff;padding:0 .75rem;color:#475569;font-size:.7rem;font-weight:900}.tabs button.active{border-color:#9E1B24;background:#eff6ff;color:#9E1B24}.tabs button:focus-visible{outline:2px solid #9E1B24;outline-offset:2px}.content{min-height:70vh}.loading{margin:2rem auto;width:min(calc(100% - 2rem),1240px);border:1px solid #e2e8f0;border-radius:18px;background:#fff;padding:2rem;text-align:center;color:#64748b;font-size:.75rem;font-weight:800}:host ::ng-deep .content>app-admin-analytics>main>header.sticky,:host ::ng-deep .content>app-admin-system-health>main>header.sticky{position:static!important;top:auto!important}@media(max-width:520px){.workspace-head{padding-left:.7rem;padding-right:3.5rem}.head-row h1{font-size:1.25rem}}
  `],
})
export class AdminOverviewHubComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly access = inject(AdminAccessService);
  readonly active = signal<OverviewSection>('summary');
  readonly ready = signal(false);
  readonly tabs: OverviewTab[] = [
    { id:'summary', label:'Özet' },
    { id:'analytics', label:'Ziyaretçiler', area:'analytics' },
    { id:'health', label:'Sistem Durumu', area:'settings' },
  ];
  readonly visibleTabs = computed(() => this.tabs.filter((tab) => !tab.area || (this.ready() && this.access.canCached(tab.area))));

  async ngOnInit(): Promise<void> {
    await this.access.refresh();
    this.ready.set(true);
    const requested = this.resolveSection();
    const selected = this.visibleTabs().some((tab) => tab.id === requested) ? requested : 'summary';
    this.active.set(selected);
    if (!this.router.url.startsWith('/admin/dashboard')) {
      await this.router.navigate(['/admin/dashboard'], { queryParams: { section: selected }, replaceUrl: true });
    }
  }

  select(section: OverviewSection): void {
    if (!this.visibleTabs().some((tab) => tab.id === section)) return;
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
