import { CommonModule, Location } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Params } from '@angular/router';
import { RentalVehicleCardV167Component } from '../components/rental-vehicle-card-v167.component';
import { Car } from '../models/car.model';
import { CampaignRecord } from '../services/campaign.service';
import { CustomerFavoriteIdsV217Service } from '../services/customer-favorite-ids-v217.service';
import { ScalablePublicCatalogV217Service } from '../services/scalable-public-catalog-v217.service';
import { VisibleCampaignsV217Service } from '../services/visible-campaigns-v217.service';

@Component({
  selector: 'app-rental-favorites-v217',
  standalone: true,
  imports: [CommonModule, RentalVehicleCardV167Component],
  template: `
    <main class="page">
      <header class="hero">
        <div class="shell">
          <button type="button" (click)="back()" aria-label="Geri dön">←</button>
          <div><p>FAVORİLERİM</p><h1>Kaydettiğiniz Kiralık Araçlar</h1><span>Favoriler yalnız ihtiyaç duyulan araç kimlikleri üzerinden, kontrollü sayfalar halinde yüklenir.</span></div>
        </div>
      </header>

      <section class="summary shell"><strong>{{items().length}} favori araç yüklendi</strong><span>Toplam favori: {{total()}}</span></section>

      <section class="results shell" aria-live="polite">
        @for (car of items(); track car.id) {
          <app-rental-vehicle-card-v167 [car]="car" [queryParams]="detailParams" [campaign]="campaignFor(car)" [available]="car.isAvailable !== false" />
        } @empty {
          @if (!loading() && !error()) {
            <div class="state"><strong>Henüz favori kiralık aracınız yok</strong><span>Beğendiğiniz araçları favorilere eklediğinizde burada görünecek.</span></div>
          }
        }
      </section>

      @if (error()) {
        <div class="state error shell" role="alert"><strong>Favoriler yüklenemedi</strong><span>{{error()}}</span><button type="button" (click)="reload()">Tekrar dene</button></div>
      }
      @if (hasMore() && !error()) {
        <div class="load"><button type="button" (click)="loadMore()" [disabled]="loading()">{{loading() ? 'Yükleniyor...' : 'Daha Fazla Favori Göster'}}</button></div>
      }
    </main>
  `,
  styles: [`
    :host{display:block}.page{min-height:100dvh;padding-bottom:95px;background:#050a14;color:#e5edf7}.shell{width:min(100% - 20px,1240px);margin-inline:auto}.hero{border-bottom:1px solid #1e2b42;background:radial-gradient(circle at 85% 0,rgba(198,161,91,.16),transparent 36%),#07101e;padding:28px 0}.hero .shell{display:flex;align-items:flex-start;gap:12px}.hero button{display:grid;width:46px;height:46px;flex:none;place-items:center;border:1px solid #334155;border-radius:13px;background:#101a2b;color:#fff;font-size:20px}.hero p{margin:0;color:#e7c777;font-size:10px;font-weight:950;letter-spacing:.14em}.hero h1{margin:5px 0 0;font:900 clamp(28px,6vw,46px)/1 Georgia,serif}.hero span{display:block;max-width:760px;margin-top:9px;color:#8ea0b8;font-size:12px;line-height:1.6}.summary{display:flex;justify-content:space-between;gap:12px;padding-block:16px;color:#94a3b8;font-size:11px}.summary strong{color:#fff}.results{display:grid;grid-template-columns:1fr;gap:12px}.state{display:grid;min-height:250px;place-content:center;justify-items:center;gap:8px;border:1px dashed #334155;border-radius:20px;background:#0c1526;padding:28px;text-align:center;color:#94a3b8}.state strong{color:#fff}.state.error{margin-top:14px;border-color:#7f1d1d}.state button,.load button{min-height:46px;border:0;border-radius:11px;background:#9f1d1d;padding:0 20px;color:#fff;font-weight:900}.load{display:flex;justify-content:center;padding:22px}@media(min-width:620px){.results{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(min-width:900px){.results{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(min-width:1180px){.results{grid-template-columns:repeat(4,minmax(0,1fr))}}button:focus-visible{outline:3px solid #c6a15b;outline-offset:2px}
  `],
})
export class RentalFavoritesV217Component implements OnInit {
  private readonly favoriteIds = inject(CustomerFavoriteIdsV217Service);
  private readonly data = inject(ScalablePublicCatalogV217Service);
  private readonly campaigns = inject(VisibleCampaignsV217Service);
  private readonly location = inject(Location);
  readonly items = signal<Car[]>([]);
  readonly campaignMap = signal(new Map<string, CampaignRecord>());
  readonly loading = signal(false);
  readonly error = signal('');
  readonly hasMore = signal(false);
  readonly total = signal(0);
  readonly detailParams: Params = { favs: true };
  private page = 0;
  private readonly pageSize = 24;

  async ngOnInit(): Promise<void> { await this.reload(); }
  async reload(): Promise<void> { this.page = 0; this.items.set([]); await this.load(false); }
  async loadMore(): Promise<void> { if (this.loading() || !this.hasMore()) return; this.page += 1; await this.load(true); }
  back(): void { this.location.back(); }
  campaignFor(car: Car): CampaignRecord | null { return this.campaignMap().get(String(car.cloudId || car.id)) || null; }

  private async load(append: boolean): Promise<void> {
    this.loading.set(true); this.error.set('');
    try {
      const favoritePage = this.favoriteIds.page(this.page, this.pageSize);
      this.total.set(favoritePage.total);
      const cars = await this.data.vehiclesByIdentifiers(favoritePage.ids, 'RENTAL');
      this.items.set(append ? [...this.items(), ...cars] : cars);
      this.hasMore.set(favoritePage.hasMore);
      this.campaignMap.set(await this.campaigns.forVehicleIds(this.items().map((car) => String(car.cloudId || car.id))));
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Favoriler yüklenemedi.');
    } finally {
      this.loading.set(false);
    }
  }
}
