import { CommonModule, Location } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminAccessService, AdminArea } from '../../services/admin-access.service';
import { AdminTeamComponent } from './admin-team.component';
import { AdminAssignmentCenterComponent } from './admin-assignment-center.component';
import { AdminAuditComponent } from './admin-audit.component';

type TeamSection = 'people' | 'assignments' | 'audit';
interface TeamTab { id: TeamSection; label: string; area: AdminArea; }

@Component({
  selector: 'app-admin-team-hub',
  standalone: true,
  imports: [CommonModule, AdminTeamComponent, AdminAssignmentCenterComponent, AdminAuditComponent],
  template: `
    <div class="workspace">
      <header class="workspace-head">
        <div class="head-row">
          <button type="button" class="back" (click)="goBack()" aria-label="Önceki sayfaya dön">←</button>
          <div><p>Yönetim Ekibi</p><h1>Ekip & Güvenlik</h1><span>Yöneticiler, çalışanlar, görevler ve işlem geçmişi burada yönetilir.</span></div>
        </div>
        <nav class="tabs" aria-label="Ekip ve güvenlik bölümleri">
          @for (tab of visibleTabs(); track tab.id) {
            <button type="button" [class.active]="active() === tab.id" (click)="select(tab.id)">{{ tab.label }}</button>
          }
        </nav>
      </header>
      <main class="content">
        @switch (active()) {
          @case ('assignments') { <app-admin-assignment-center /> }
          @case ('audit') { <app-admin-audit /> }
          @default { <app-admin-team /> }
        }
      </main>
    </div>
  `,
  styles: [`
    :host{display:block;min-height:100vh;background:#f8fafc}.workspace{min-height:100vh}.workspace-head{position:sticky;top:0;z-index:80;border-bottom:1px solid #e2e8f0;background:rgba(248,250,252,.97);padding:.8rem 3.7rem .7rem 1rem;box-shadow:0 6px 20px rgba(15,23,42,.05);backdrop-filter:blur(12px)}.head-row{display:flex;width:min(100%,1240px);margin:auto;align-items:flex-start;gap:.7rem}.back{display:grid;width:42px;height:42px;flex:none;place-items:center;border:1px solid #dbe4ef;border-radius:12px;background:#fff;color:#0f172a;font-size:1.15rem;font-weight:950}.head-row p{margin:0;color:#2563eb;font-size:.58rem;font-weight:950;letter-spacing:.14em;text-transform:uppercase}.head-row h1{margin:.12rem 0 0;font-size:1.4rem;font-weight:950;color:#0f172a}.head-row span{display:block;margin-top:.2rem;color:#64748b;font-size:.68rem}.tabs{display:flex;width:min(100%,1240px);margin:.65rem auto 0;gap:.4rem;overflow-x:auto}.tabs button{min-height:42px;flex:0 0 auto;border:1px solid #e2e8f0;border-radius:12px;background:#fff;padding:0 .9rem;color:#475569;font-size:.68rem;font-weight:900}.tabs button.active{border-color:#2563eb;background:#eff6ff;color:#1d4ed8}.content{min-height:70vh}:host ::ng-deep .content .sticky.top-16,:host ::ng-deep .content .sticky.top-0{position:static!important;top:auto!important}@media(max-width:520px){.workspace-head{padding-left:.7rem;padding-right:3.5rem}.head-row h1{font-size:1.25rem}}
  `],
})
export class AdminTeamHubComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly access = inject(AdminAccessService);
  readonly active = signal<TeamSection>('people');
  readonly ready = signal(false);

  readonly tabs: TeamTab[] = [
    { id:'people', label:'Ekip & Yetkiler', area:'team' },
    { id:'assignments', label:'Görevler', area:'team' },
    { id:'audit', label:'İşlem Geçmişi', area:'finance' },
  ];
  readonly visibleTabs = computed(() => this.tabs.filter((tab) => !this.ready() || this.access.canCached(tab.area)));

  async ngOnInit(): Promise<void> {
    await this.access.refresh();
    this.ready.set(true);
    const requested = this.resolveSection();
    const selected = this.visibleTabs().some((tab) => tab.id === requested) ? requested : (this.visibleTabs()[0]?.id || 'people');
    this.active.set(selected);
    if (!this.router.url.startsWith('/admin/team-center')) {
      await this.router.navigate(['/admin/team-center'], { queryParams: { section: selected }, replaceUrl: true });
    }
  }

  select(section: TeamSection): void {
    if (!this.visibleTabs().some((tab) => tab.id === section)) return;
    this.active.set(section);
    void this.router.navigate([], { relativeTo: this.route, queryParams: { section }, queryParamsHandling: 'merge', replaceUrl: true });
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  goBack(): void {
    if (typeof window !== 'undefined' && window.history.length > 1) this.location.back();
    else void this.router.navigate(['/admin/dashboard']);
  }

  private resolveSection(): TeamSection {
    const query = this.route.snapshot.queryParamMap.get('section') as TeamSection | null;
    if (query && this.tabs.some((tab) => tab.id === query)) return query;
    const data = this.route.snapshot.data['teamSection'] as TeamSection | undefined;
    return data && this.tabs.some((tab) => tab.id === data) ? data : 'people';
  }
}
