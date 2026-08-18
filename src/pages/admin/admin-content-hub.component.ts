import { CommonModule, Location } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminCatalogEditorComponent } from './admin-catalog-editor.component';
import { AdminCampaignsComponent } from './admin-campaigns.component';
import { AdminBlogComponent } from './admin-blog.component';

type ContentSection = 'catalog' | 'campaigns' | 'blog';

@Component({
  selector: 'app-admin-content-hub',
  standalone: true,
  imports: [CommonModule, AdminCatalogEditorComponent, AdminCampaignsComponent, AdminBlogComponent],
  template: `
    <div class="workspace">
      <header class="workspace-head">
        <div class="head-row">
          <button type="button" class="back" (click)="goBack()" aria-label="Önceki sayfaya dön">←</button>
          <div><p>İçerik Yönetimi</p><h1>İçerik & Katalog</h1><span>Araçlar, turlar, kampanyalar ve blog içerikleri burada yönetilir.</span></div>
        </div>
        <nav class="tabs" aria-label="İçerik ve katalog bölümleri">
          <button type="button" [class.active]="active() === 'catalog'" (click)="select('catalog')">Araçlar & Turlar</button>
          <button type="button" [class.active]="active() === 'campaigns'" (click)="select('campaigns')">Kampanyalar</button>
          <button type="button" [class.active]="active() === 'blog'" (click)="select('blog')">Blog</button>
        </nav>
      </header>
      <main class="content">
        @switch (active()) {
          @case ('campaigns') { <app-admin-campaigns /> }
          @case ('blog') { <app-admin-blog /> }
          @default { <app-admin-catalog-editor /> }
        }
      </main>
    </div>
  `,
  styles: [`
    :host{display:block;min-height:100vh;background:#f8fafc}.workspace{min-height:100vh}.workspace-head{position:sticky;top:0;z-index:80;border-bottom:1px solid #e2e8f0;background:rgba(248,250,252,.97);padding:.8rem 3.7rem .7rem 1rem;box-shadow:0 6px 20px rgba(15,23,42,.05);backdrop-filter:blur(12px)}.head-row{display:flex;width:min(100%,1240px);margin:auto;align-items:flex-start;gap:.7rem}.back{display:grid;width:42px;height:42px;flex:none;place-items:center;border:1px solid #dbe4ef;border-radius:12px;background:#fff;color:#0f172a;font-size:1.15rem;font-weight:950}.head-row p{margin:0;color:#2563eb;font-size:.58rem;font-weight:950;letter-spacing:.14em;text-transform:uppercase}.head-row h1{margin:.12rem 0 0;font-size:1.4rem;font-weight:950;color:#0f172a}.head-row span{display:block;margin-top:.2rem;color:#64748b;font-size:.68rem}.tabs{display:flex;width:min(100%,1240px);margin:.65rem auto 0;gap:.4rem;overflow-x:auto}.tabs button{min-height:42px;flex:0 0 auto;border:1px solid #e2e8f0;border-radius:12px;background:#fff;padding:0 .9rem;color:#475569;font-size:.68rem;font-weight:900}.tabs button.active{border-color:#2563eb;background:#eff6ff;color:#1d4ed8}.content{min-height:70vh}:host ::ng-deep .content .sticky.top-16,:host ::ng-deep .content .sticky.top-0{position:static!important;top:auto!important}@media(max-width:520px){.workspace-head{padding-left:.7rem;padding-right:3.5rem}.head-row h1{font-size:1.25rem}}
  `],
})
export class AdminContentHubComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  readonly active = signal<ContentSection>('catalog');

  async ngOnInit(): Promise<void> {
    const selected = this.resolveSection();
    this.active.set(selected);
    if (!this.router.url.startsWith('/admin/content')) {
      await this.router.navigate(['/admin/content'], { queryParams: { section: selected }, replaceUrl: true });
    }
  }

  select(section: ContentSection): void {
    this.active.set(section);
    void this.router.navigate([], { relativeTo: this.route, queryParams: { section }, queryParamsHandling: 'merge', replaceUrl: true });
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  goBack(): void {
    if (typeof window !== 'undefined' && window.history.length > 1) this.location.back();
    else void this.router.navigate(['/admin/dashboard']);
  }

  private resolveSection(): ContentSection {
    const query = this.route.snapshot.queryParamMap.get('section');
    if (query === 'campaigns' || query === 'blog' || query === 'catalog') return query;
    const data = this.route.snapshot.data['contentSection'];
    return data === 'campaigns' || data === 'blog' ? data : 'catalog';
  }
}
