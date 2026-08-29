import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { Vehicle } from '../models/car.model';
import { CarService } from '../services/car.service';

@Component({
  selector: 'app-account-favorites-v213',
  standalone: true,
  imports: [CommonModule, MatIconModule, RouterLink],
  template: `
    <section id="account-favorites" class="favorites-section" aria-labelledby="account-favorites-title">
      <header>
        <div><p>HESABIM</p><h2 id="account-favorites-title">Favorilerim</h2><span>Kiralık ve satılık araçlarda kaydettiğiniz seçimler hesabınızla birlikte korunur.</span></div>
        @if (favorites().length) {<strong>{{ favorites().length }}</strong>}
      </header>

      @if (favorites().length) {
        <div class="favorite-grid">
          @for (item of favorites(); track stableKey(item)) {
            <a class="favorite-card" [routerLink]="routeFor(item)" [attr.aria-label]="titleFor(item) + ' favorisini aç'">
              <div class="media">
                @if (item.image || item.images?.[0]) {<img [src]="item.image || item.images?.[0]" [alt]="titleFor(item)" loading="lazy" decoding="async" />}
                @else {<mat-icon aria-hidden="true">directions_car</mat-icon>}
                <span>{{ item.category === 'SALE' ? 'SATILIK' : 'KİRALIK' }}</span>
              </div>
              <div class="copy"><h3>{{ titleFor(item) }}</h3><p>{{ metaFor(item) }}</p>@if (item.price) {<strong>{{ priceFor(item) }}</strong>}<span class="open">İncele <mat-icon aria-hidden="true">arrow_forward</mat-icon></span></div>
            </a>
          }
        </div>
      } @else {
        <div class="empty-state"><mat-icon aria-hidden="true">favorite_border</mat-icon><strong>Henüz favori aracınız yok</strong><span>Beğendiğiniz kiralık veya satılık araçları kalp simgesiyle kaydedebilirsiniz.</span><div><a routerLink="/fleet">Kiralık Araçlar</a><a routerLink="/sales">Satılık Araçlar</a></div></div>
      }
    </section>
  `,
  styles: [`
    :host{display:block;background:#060a12;color:#f8fafc}.favorites-section{width:min(100% - 20px,1180px);margin:0 auto;padding:22px 0 34px;scroll-margin-top:110px}.favorites-section>header{display:flex;align-items:end;justify-content:space-between;gap:12px;margin-bottom:12px}.favorites-section header p{margin:0;color:#c6a15b;font-size:9px;font-weight:950;letter-spacing:.15em}.favorites-section header h2{margin:4px 0 0;font:750 clamp(26px,6vw,38px)/1 Georgia,serif}.favorites-section header span{display:block;max-width:650px;margin-top:7px;color:#8fa0b5;font-size:11px;line-height:1.55}.favorites-section header>strong{display:grid;min-width:38px;height:38px;place-items:center;border-radius:999px;background:#182338;color:#dbeafe;font-size:11px}.favorite-grid{display:grid;grid-template-columns:1fr;gap:10px}.favorite-card{display:grid;grid-template-columns:112px minmax(0,1fr);overflow:hidden;border:1px solid #28364b;border-radius:18px;background:#0c1524;color:#f8fafc;text-decoration:none;box-shadow:0 12px 30px rgba(2,6,23,.18)}.favorite-card:focus-visible,.empty-state a:focus-visible{outline:3px solid #60a5fa;outline-offset:2px}.media{position:relative;display:grid;min-height:120px;place-items:center;overflow:hidden;background:#141f31;color:#6f829d}.media img{width:100%;height:100%;object-fit:cover}.media>mat-icon{width:42px;height:42px;font-size:42px}.media span{position:absolute;left:7px;top:7px;border-radius:999px;background:rgba(2,6,23,.86);padding:5px 7px;color:#f7e5b7;font-size:7px;font-weight:950;letter-spacing:.08em}.copy{min-width:0;padding:12px}.copy h3{margin:0;font-size:14px;line-height:1.25}.copy p{margin:6px 0 0;color:#8fa0b5;font-size:9px;line-height:1.5}.copy>strong{display:block;margin-top:7px;color:#f3d58b;font-size:12px}.open{display:inline-flex!important;align-items:center;gap:3px;margin-top:8px!important;color:#93c5fd!important;font-size:8px!important;font-weight:950;text-transform:uppercase}.open mat-icon{width:14px;height:14px;font-size:14px}.empty-state{display:grid;min-height:220px;place-content:center;justify-items:center;border:1px dashed #2c3a50;border-radius:20px;background:#0a1321;padding:24px;text-align:center;color:#8190a6}.empty-state>mat-icon{width:46px;height:46px;font-size:46px}.empty-state strong{margin-top:8px;color:#f8fafc}.empty-state>span{max-width:480px;margin-top:7px;font-size:10px;line-height:1.6}.empty-state>div{display:flex;flex-wrap:wrap;justify-content:center;gap:7px;margin-top:13px}.empty-state a{display:inline-flex;min-height:40px;align-items:center;border:1px solid #34445d;border-radius:10px;background:#111c2d;padding:0 12px;color:#e5edf7;text-decoration:none;font-size:9px;font-weight:900}@media(min-width:640px){.favorite-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.favorite-card{grid-template-columns:130px minmax(0,1fr)}}@media(min-width:1000px){.favorite-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.favorite-card{display:block}.media{aspect-ratio:16/10;min-height:0}.copy{padding:14px}.copy h3{font-size:15px}}
  `],
})
export class AccountFavoritesV213Component {
  private readonly cars = inject(CarService);
  readonly favorites = computed(() => [...this.cars.getCars()(), ...this.cars.getSaleCars()()].filter((item) => this.cars.isFavorite(item.id)));

  stableKey(item: Vehicle): string { return String(item.cloudId || item.id); }
  routeFor(item: Vehicle): any[] { return item.category === 'SALE' ? ['/sales', item.id] : ['/fleet', item.id]; }
  titleFor(item: Vehicle): string { return item.title || [item.brand, item.model, item.series, item.year].filter(Boolean).join(' ') || `Araç ${item.id}`; }
  metaFor(item: Vehicle): string { return [item.year, item.transmission, item.fuel, item.location].filter(Boolean).join(' · '); }
  priceFor(item: Vehicle): string { const price = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(Number(item.price || 0)); return item.category === 'RENTAL' ? `${price} / gün` : price; }
}
