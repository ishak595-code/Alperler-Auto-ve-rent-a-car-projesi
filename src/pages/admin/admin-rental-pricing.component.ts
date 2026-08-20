import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RentalExtraOption, RentalRoutePricing, SiteConfig } from '../../models/site-config.model';
import { CarService } from '../../services/car.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-admin-rental-pricing',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <main class="page">
      <div class="shell">
        <header class="hero">
          <div>
            <p>Kiralama ve ek hizmet altyapısı</p>
            <h1>Fiyat, Ek Hizmet, Mesafe ve Yakıt</h1>
            <span>Tüm ek hizmetler müşteri için isteğe bağlıdır. Burada yalnız hangi hizmetlerin sunulacağını ve fiyatlarını yönetirsiniz.</span>
          </div>
          <button type="button" (click)="save()" [disabled]="saving">{{ saving ? 'Kaydediliyor…' : 'Kaydet ve Uygula' }}</button>
        </header>

        <section class="panel" aria-labelledby="extras-title">
          <div class="head route-head">
            <div>
              <h2 id="extras-title">İsteğe Bağlı Ek Hizmetler</h2>
              <p>Şoför, çocuk koltuğu, ek güvence, ek sürücü, teslimat ve benzeri hizmetlerin hiçbiri otomatik seçilmez. Müşteri isterse seçer, seçtiği anda ücret toplam fiyata eklenir.</p>
            </div>
            <button type="button" class="secondary" (click)="addExtra()">+ Yeni Hizmet</button>
          </div>

          @if (!extras.length) {
            <div class="empty">Aktif veya pasif ek hizmet tanımı bulunmuyor.</div>
          }

          <div class="extras">
            @for (extra of extras; track extra.id; let index = $index) {
              <article class="extra-card">
                <div class="extra-top">
                  <div class="extra-icon" aria-hidden="true">{{ iconPreview(extra) }}</div>
                  <div class="extra-title"><strong>{{ extra.label || 'Yeni hizmet' }}</strong><small>{{ extra.enabled ? 'Müşteriye gösterilir, seçim isteğe bağlıdır' : 'Müşteriye gösterilmez' }}</small></div>
                  <label class="switch"><input type="checkbox" [(ngModel)]="extra.enabled" [name]="'extra-enabled-' + extra.id" [attr.aria-label]="(extra.label || 'Ek hizmet') + ' aktif'" /><span>{{ extra.enabled ? 'Aktif' : 'Pasif' }}</span></label>
                </div>
                <div class="extra-grid">
                  <label><span>Hizmet adı</span><input [(ngModel)]="extra.label" [name]="'extra-label-' + extra.id" maxlength="80" /></label>
                  <label><span>İkon adı</span><input [(ngModel)]="extra.icon" [name]="'extra-icon-' + extra.id" placeholder="Örn. person_pin" maxlength="60" /></label>
                  <label class="wide"><span>Açıklama</span><input [(ngModel)]="extra.description" [name]="'extra-desc-' + extra.id" maxlength="180" /></label>
                  <label><span>Günlük ücret (TL)</span><input type="number" min="0" step="1" [(ngModel)]="extra.pricePerDay" [name]="'extra-day-' + extra.id" /></label>
                  <label><span>Tek seferlik ücret (TL)</span><input type="number" min="0" step="1" [(ngModel)]="extra.flatPrice" [name]="'extra-flat-' + extra.id" /></label>
                  <label><span>Sıralama</span><input type="number" min="0" step="1" [(ngModel)]="extra.sortOrder" [name]="'extra-order-' + extra.id" /></label>
                </div>
                <div class="extra-foot"><span>Rezervasyonda başlangıç durumu: <strong>Seçili değil</strong></span><button type="button" class="danger" (click)="removeExtra(index)" [attr.aria-label]="(extra.label || 'Ek hizmet') + ' hizmetini sil'">Sil</button></div>
              </article>
            }
          </div>
        </section>

        <section class="panel" aria-labelledby="fuel-pricing-title">
          <div class="head">
            <div><h2 id="fuel-pricing-title">Yakıt Hesabı</h2><p>Ortalama tüketim değeri 100 km başına litre olarak girilir. Tanımlı rota yoksa sisteme tahmini mesafe uydurulmaz.</p></div>
          </div>
          <div class="grid two">
            <label><span>Yakıt litre fiyatı (TL)</span><input type="number" min="0" step="0.1" [(ngModel)]="fuelPrice" name="fuelPrice" aria-label="Yakıt litre fiyatı" /></label>
            <label><span>Ortalama tüketim (L / 100 km)</span><input type="number" min="0" step="0.1" [(ngModel)]="consumption" name="consumption" aria-label="Ortalama yakıt tüketimi litre yüz kilometre" /></label>
          </div>
          <div class="formula" aria-live="polite">Örnek: 100 km için yaklaşık {{ sampleFuelCost() | number:'1.0-0' }} TL yakıt maliyeti hesaplanır.</div>
        </section>

        <section class="panel" aria-labelledby="route-pricing-title">
          <div class="head route-head">
            <div><h2 id="route-pricing-title">Rota Mesafeleri</h2><p>Teslim alma ve iade noktaları arasındaki gerçek kilometreyi girin. Aynı rota ters yönde seçilirse de eşleşir.</p></div>
            <button type="button" class="secondary" (click)="addRoute()" aria-label="Yeni rota mesafesi ekle">+ Yeni Rota</button>
          </div>

          @if (!routes.length) {
            <div class="empty">Henüz rota tanımlanmadı. Mesafe ücreti hesaplanmaz.</div>
          }

          <div class="routes">
            @for (route of routes; track route.id; let index = $index) {
              <article class="route-card">
                <div class="route-grid">
                  <label><span>Nereden</span><input [(ngModel)]="route.from" [name]="'from-' + route.id" placeholder="Örn. Yüksekova Havalimanı" [attr.aria-label]="(index + 1) + '. rota nereden'" /></label>
                  <label><span>Nereye</span><input [(ngModel)]="route.to" [name]="'to-' + route.id" placeholder="Örn. Yüksekova Merkez" [attr.aria-label]="(index + 1) + '. rota nereye'" /></label>
                  <label><span>Mesafe (km)</span><input type="number" min="0" step="0.1" [(ngModel)]="route.distanceKm" [name]="'distance-' + route.id" [attr.aria-label]="(index + 1) + '. rota mesafesi kilometre'" /></label>
                  <label class="toggle"><input type="checkbox" [(ngModel)]="route.enabled" [name]="'enabled-' + route.id" [attr.aria-label]="(index + 1) + '. rotayı aktif et'" /><span>Aktif</span></label>
                </div>
                <div class="route-foot">
                  <span>@if (route.distanceKm > 0) { Bu rota için yaklaşık {{ routeFuelCost(route) | number:'1.0-0' }} TL yakıt maliyeti oluşur. } @else { Mesafe girilmedi. }</span>
                  <button type="button" class="danger" (click)="removeRoute(index)" [attr.aria-label]="(index + 1) + '. rotayı sil'">Sil</button>
                </div>
              </article>
            }
          </div>
        </section>

        <section class="note" aria-label="Hesaplama açıklaması">
          <strong>Fiyat kuralı:</strong> Araç bedeli tarih aralığına göre hesaplanır. Ek hizmetler başlangıçta seçili değildir ve yalnız müşteri işaretlerse eklenir. Mesafe maliyeti yalnız admin tarafından tanımlanmış gerçek rota eşleşirse hesaplanır.
        </section>
      </div>
    </main>
  `,
  styles: [`
    :host{display:block}.page{min-height:100%;background:#f5f7fb;padding:1rem;color:#0f172a}.shell{width:min(100%,1080px);margin:auto}.hero{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;border-radius:22px;background:linear-gradient(135deg,#07101f,#0d1b34);padding:1.3rem;color:#fff}.hero p{margin:0;color:#60a5fa;font-size:.62rem;font-weight:950;letter-spacing:.14em;text-transform:uppercase}.hero h1{margin:.28rem 0 0;font-size:1.5rem}.hero span{display:block;margin-top:.4rem;max-width:760px;color:#aab7ca;font-size:.72rem;line-height:1.5}.hero button{min-height:46px;flex:none;border:0;border-radius:12px;background:#2563eb;padding:0 1rem;color:#fff;font-weight:950}.hero button:disabled{opacity:.55}.panel{margin-top:1rem;overflow:hidden;border:1px solid #e2e8f0;border-radius:18px;background:#fff;box-shadow:0 8px 24px rgba(15,23,42,.05)}.head{padding:1rem;border-bottom:1px solid #e2e8f0}.route-head{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem}.head h2{margin:0;font-size:1rem}.head p{margin:.25rem 0 0;color:#64748b;font-size:.68rem;line-height:1.5}.secondary{min-height:42px;flex:none;border:1px solid #bfdbfe;border-radius:11px;background:#eff6ff;padding:0 .8rem;color:#1d4ed8;font-size:.66rem;font-weight:950}.grid{display:grid;gap:.75rem;padding:1rem}.grid.two{grid-template-columns:1fr}.grid label,.route-grid label,.extra-grid label{display:grid;gap:.35rem}.grid label>span,.route-grid label>span,.extra-grid label>span{color:#475569;font-size:.6rem;font-weight:900;letter-spacing:.04em;text-transform:uppercase}.grid input,.route-grid input,.extra-grid input{min-height:46px;width:100%;border:1px solid #cbd5e1;border-radius:11px;background:#fff;padding:0 .72rem;color:#0f172a;font:inherit;font-size:.74rem;outline:none}.grid input:focus,.route-grid input:focus,.extra-grid input:focus{border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,.12)}.formula{margin:0 1rem 1rem;border-radius:12px;background:#eff6ff;padding:.8rem;color:#1e3a8a;font-size:.7rem;font-weight:800}.extras,.routes{display:grid;gap:.75rem;padding:1rem}.extra-card,.route-card{border:1px solid #e2e8f0;border-radius:15px;background:#fbfdff;padding:.85rem}.extra-top{display:flex;align-items:center;gap:.7rem}.extra-icon{display:grid;width:42px;height:42px;flex:none;place-items:center;border-radius:12px;background:#e0ecff;color:#1d4ed8;font-weight:950}.extra-title{min-width:0;flex:1}.extra-title strong,.extra-title small{display:block}.extra-title small{margin-top:.2rem;color:#64748b;font-size:.62rem}.switch{display:flex;align-items:center;gap:.4rem;font-size:.65rem;font-weight:900}.switch input{width:20px;height:20px}.extra-grid{display:grid;gap:.65rem;margin-top:.8rem}.extra-grid .wide{grid-column:1/-1}.extra-foot,.route-foot{display:flex;align-items:center;justify-content:space-between;gap:.8rem;margin-top:.7rem;border-top:1px solid #e2e8f0;padding-top:.7rem;color:#64748b;font-size:.64rem}.route-grid{display:grid;gap:.65rem}.route-grid .toggle{display:flex;min-height:46px;align-items:center;gap:.45rem;border:1px solid #cbd5e1;border-radius:11px;background:#fff;padding:0 .7rem}.route-grid .toggle input{width:20px;height:20px;min-height:0;padding:0}.danger{min-height:38px;border:1px solid #fecaca;border-radius:9px;background:#fff1f2;padding:0 .7rem;color:#be123c;font-size:.62rem;font-weight:900}.empty{padding:1rem;color:#64748b;font-size:.7rem}.note{margin-top:1rem;border:1px solid #dbeafe;border-radius:16px;background:#eff6ff;padding:1rem;color:#1e3a8a;font-size:.7rem;line-height:1.6}@media(min-width:720px){.grid.two{grid-template-columns:1fr 1fr}.extra-grid{grid-template-columns:1.2fr .7fr}.route-grid{grid-template-columns:1.2fr 1.2fr .65fr .5fr}}@media(min-width:980px){.extra-grid{grid-template-columns:1.2fr .7fr .7fr .7fr .5fr}.extra-grid .wide{grid-column:1/3}}@media(max-width:620px){.hero,.route-head{flex-direction:column}.hero button,.secondary{width:100%}.extra-top{align-items:flex-start;flex-wrap:wrap}.switch{width:100%}.extra-foot,.route-foot{align-items:stretch;flex-direction:column}.danger{width:100%}}
  `],
})
export class AdminRentalPricingComponent implements OnInit {
  private readonly cars = inject(CarService);
  private readonly toast = inject(ToastService);
  saving = false;
  fuelPrice = 85;
  consumption = 8.5;
  routes: RentalRoutePricing[] = [];
  extras: RentalExtraOption[] = [];

  async ngOnInit(): Promise<void> {
    try { await this.cars.refreshCloudCatalog(true); } catch { /* keep current config */ }
    this.loadFromConfig(this.cars.getConfig()());
  }

  addExtra(): void {
    const next = this.extras.length + 1;
    this.extras.push({ id: `extra-${Date.now()}-${Math.random().toString(36).slice(2,7)}`, label: `Yeni Ek Hizmet ${next}`, description: '', icon: 'add_circle', enabled: true, sortOrder: next * 10, pricePerDay: 0, flatPrice: 0 });
  }

  removeExtra(index: number): void { this.extras.splice(index, 1); }

  iconPreview(extra: RentalExtraOption): string {
    const icon = String(extra.icon || '').trim();
    if (icon === 'person_pin') return 'S';
    if (icon === 'child_friendly') return 'Ç';
    if (icon === 'verified_user') return 'G';
    if (icon === 'group_add') return '2';
    if (icon === 'flight') return '✈';
    if (icon === 'schedule') return '⏱';
    if (icon === 'ac_unit') return '❄';
    return '＋';
  }

  addRoute(): void { this.routes.push({ id: `route-${Date.now()}-${Math.random().toString(36).slice(2,7)}`, from: '', to: '', distanceKm: 0, enabled: true }); }
  removeRoute(index: number): void { this.routes.splice(index, 1); }
  sampleFuelCost(): number { return Math.max(0, Number(this.fuelPrice || 0)) * Math.max(0, Number(this.consumption || 0)); }
  routeFuelCost(route: RentalRoutePricing): number { return Math.max(0, Number(route.distanceKm || 0)) * Math.max(0, Number(this.consumption || 0)) / 100 * Math.max(0, Number(this.fuelPrice || 0)); }

  async save(): Promise<void> {
    if (this.saving) return;
    const cleanExtras = this.extras.map((extra, index) => ({
      id: String(extra.id || `extra-${index + 1}`).trim().replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 80),
      label: String(extra.label || '').replace(/\s+/g, ' ').trim().slice(0, 80),
      description: String(extra.description || '').replace(/\s+/g, ' ').trim().slice(0, 180),
      icon: String(extra.icon || 'add_circle').trim().slice(0, 60),
      enabled: extra.enabled !== false,
      sortOrder: Math.max(0, Math.round(Number(extra.sortOrder ?? (index + 1) * 10))),
      pricePerDay: Math.max(0, Number(extra.pricePerDay || 0)),
      pricePerHour: Math.max(0, Number(extra.pricePerHour || 0)),
      flatPrice: Math.max(0, Number(extra.flatPrice || 0)),
    })).filter((extra) => extra.label);

    if (cleanExtras.length !== this.extras.length) {
      this.toast.show('Her ek hizmetin bir adı olmalıdır.', 'error');
      return;
    }
    const extraIds = new Set(cleanExtras.map((extra) => extra.id));
    if (extraIds.size !== cleanExtras.length) {
      this.toast.show('Ek hizmet kimlikleri benzersiz olmalıdır.', 'error');
      return;
    }

    const cleanRoutes = this.routes.map((route, index) => ({
      id: String(route.id || `route-${index + 1}`).trim().slice(0, 80),
      from: String(route.from || '').replace(/\s+/g, ' ').trim().slice(0, 160),
      to: String(route.to || '').replace(/\s+/g, ' ').trim().slice(0, 160),
      distanceKm: Math.max(0, Number(route.distanceKm || 0)),
      enabled: route.enabled !== false,
    })).filter((route) => route.from && route.to && route.distanceKm > 0);

    if (this.routes.some((route) => (route.from || route.to || Number(route.distanceKm || 0) > 0) && (!String(route.from || '').trim() || !String(route.to || '').trim() || Number(route.distanceKm || 0) <= 0))) {
      this.toast.show('Rota satırlarında nereden, nereye ve sıfırdan büyük kilometre birlikte doldurulmalıdır.', 'error');
      return;
    }

    this.saving = true;
    try {
      const current = this.cars.getConfig()();
      await this.cars.updateConfig({
        ...current,
        rentalExtras: cleanExtras,
        rentalFuelPricePerLiter: Math.max(0, Number(this.fuelPrice || 0)),
        rentalAverageConsumptionPer100Km: Math.max(0, Number(this.consumption || 0)),
        rentalRoutePricing: cleanRoutes,
      });
      await this.cars.refreshCloudCatalog(true);
      this.loadFromConfig(this.cars.getConfig()());
      this.toast.show('Ek hizmet, mesafe ve yakıt ayarları kaydedildi. Müşteride hiçbir ek hizmet otomatik seçilmez.', 'success');
    } catch (error) {
      this.toast.show(error instanceof Error ? error.message : 'Kiralama fiyat ayarları kaydedilemedi.', 'error');
    } finally {
      this.saving = false;
    }
  }

  private loadFromConfig(config: SiteConfig): void {
    this.fuelPrice = Number(config.rentalFuelPricePerLiter ?? 85);
    this.consumption = Number(config.rentalAverageConsumptionPer100Km ?? 8.5);
    this.routes = Array.isArray(config.rentalRoutePricing) ? config.rentalRoutePricing.map((route) => ({ ...route })) : [];
    this.extras = Array.isArray(config.rentalExtras) ? config.rentalExtras.map((extra) => ({ ...extra })) : [];
  }
}
