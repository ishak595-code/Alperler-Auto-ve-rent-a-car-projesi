import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CustomerFavoritesV217Service } from '../services/customer-favorites-v217.service';
import { PublicDetailDataService } from '../services/public-detail-data.service';

@Component({
  selector: 'app-tour-favorite-action-v2192',
  standalone: true,
  template: `
    <button
      type="button"
      class="favorite-action"
      [class.active]="active()"
      [disabled]="working()"
      [attr.aria-pressed]="active()"
      [attr.aria-label]="active() ? 'Turu favorilerimden çıkar' : 'Turu favorilerime ekle'"
      (click)="toggle()"
    >
      <span aria-hidden="true">{{ active() ? '♥' : '♡' }}</span>
      <b>{{ active() ? 'Favorimde' : 'Favori' }}</b>
    </button>
  `,
  styles: [`
    :host{position:absolute;z-index:140;top:16px;right:18px;display:block}.favorite-action{display:inline-flex;min-height:46px;align-items:center;gap:7px;border:1px solid rgba(255,255,255,.28);border-radius:999px;background:rgba(6,10,18,.88);backdrop-filter:blur(12px);padding:0 14px;color:#fff;box-shadow:0 8px 24px rgba(0,0,0,.24);font:inherit}.favorite-action span{font-size:23px;line-height:1}.favorite-action b{font-size:11px;font-weight:900}.favorite-action.active{border-color:rgba(248,113,113,.55);background:rgba(127,29,29,.9);color:#fee2e2}.favorite-action:disabled{opacity:.6}.favorite-action:focus-visible{outline:3px solid #60a5fa;outline-offset:3px}@media(max-width:480px){:host{top:12px;right:12px}.favorite-action{min-height:44px;padding:0 12px}.favorite-action b{font-size:10px}}
  `],
})
export class TourFavoriteActionV2192Component implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly favorites = inject(CustomerFavoritesV217Service);
  private readonly details = inject(PublicDetailDataService);
  private readonly routeId = String(this.route.snapshot.paramMap.get('id') || '').trim();
  private metadata: Record<string, unknown> = {};

  readonly active = signal(false);
  readonly working = signal(false);

  async ngOnInit(): Promise<void> {
    if (!this.routeId) return;
    try {
      const tour = await this.details.load('TOUR', this.routeId);
      this.metadata = {
        title: String((tour as any).title || 'Tur'),
        image: String(tour.image || tour.images?.[0] || ''),
        href: `/tour/${encodeURIComponent(this.routeId)}`,
      };
    } catch {
      this.metadata = { href: `/tour/${encodeURIComponent(this.routeId)}` };
    }
    await this.favorites.hydrateVisible('TOUR', [this.routeId]).catch(() => undefined);
    this.active.set(this.favorites.isFavorite('TOUR', this.routeId));
  }

  async toggle(): Promise<void> {
    if (!this.routeId || this.working()) return;
    this.working.set(true);
    try {
      this.active.set(await this.favorites.toggle('TOUR', this.routeId, this.metadata));
    } finally {
      this.working.set(false);
    }
  }
}
