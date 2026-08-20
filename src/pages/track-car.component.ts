import { CommonModule, Location } from "@angular/common";
import { Component, OnDestroy, OnInit, computed, inject, signal } from "@angular/core";
import { MatIconModule } from "@angular/material/icon";
import { ActivatedRoute, Router } from "@angular/router";
import { BookingRecord } from "../models/booking.model";
import { AdminAccessService } from "../services/admin-access.service";
import { AuthService } from "../services/auth.service";
import { BookingService } from "../services/booking.service";

@Component({
  selector: "app-track-car",
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <main class="tracking-page">
      <header class="topbar">
        <button type="button" class="back" (click)="goBack()" aria-label="Rezervasyon takip ekranından geri dön">
          <mat-icon aria-hidden="true">arrow_back</mat-icon>
        </button>
        <div class="head-copy">
          <p>OPERASYON TAKİBİ</p>
          <h1>{{ bookingId() || 'Rezervasyon' }}</h1>
          <span>Gerçek rezervasyon kaydı · Supabase canlı veri</span>
        </div>
      </header>

      <section class="shell">
        @if (authorizing() || !bookingService.isAdminLoaded()) {
          <div class="state-card" role="status" aria-live="polite">
            <mat-icon class="spin" aria-hidden="true">progress_activity</mat-icon>
            <h2>Rezervasyon yükleniyor</h2>
            <p>Yönetici yetkisi ve canlı rezervasyon kaydı doğrulanıyor.</p>
          </div>
        } @else if (accessError()) {
          <div class="state-card error" role="alert">
            <mat-icon aria-hidden="true">lock</mat-icon>
            <h2>Erişim reddedildi</h2>
            <p>{{ accessError() }}</p>
          </div>
        } @else if (bookingService.lastAdminError()) {
          <div class="state-card error" role="alert">
            <mat-icon aria-hidden="true">cloud_off</mat-icon>
            <h2>Rezervasyon verisine ulaşılamadı</h2>
            <p>{{ bookingService.lastAdminError() }}</p>
          </div>
        } @else if (!booking()) {
          <div class="state-card" role="status">
            <mat-icon aria-hidden="true">search_off</mat-icon>
            <h2>Rezervasyon bulunamadı</h2>
            <p>{{ bookingId() }} referansına ait aktif kayıt bulunmuyor.</p>
            <button type="button" class="primary" (click)="openReservations()">Rezervasyonlara Dön</button>
          </div>
        } @else {
          @let record = booking()!;
          <section class="hero-card" aria-labelledby="tracking-item-title">
            <div class="vehicle-media">
              @if (record.image) {
                <img [src]="record.image" [alt]="record.itemName" />
              } @else {
                <div class="media-placeholder" aria-hidden="true"><mat-icon>directions_car</mat-icon></div>
              }
            </div>
            <div class="hero-copy">
              <div class="status-row">
                <span class="type-badge">{{ typeLabel(record) }}</span>
                <span [class]="statusClass(record.status)" class="status-badge">{{ statusLabel(record.status) }}</span>
              </div>
              <h2 id="tracking-item-title">{{ record.itemName }}</h2>
              <p class="reference">Referans: <strong>{{ record.id }}</strong></p>
              <div class="hero-actions">
                @if (record.customerPhone) {
                  <a [href]="phoneHref(record.customerPhone)" class="primary"><mat-icon aria-hidden="true">call</mat-icon>Müşteriyi Ara</a>
                  <a [href]="whatsappHref(record.customerPhone, record.id)" target="_blank" rel="noopener noreferrer" class="secondary"><mat-icon aria-hidden="true">chat</mat-icon>WhatsApp</a>
                }
                @if (record.itemId && record.type === 'RENTAL') {
                  <button type="button" class="secondary" (click)="openVehicle(record)"><mat-icon aria-hidden="true">open_in_new</mat-icon>Aracı Aç</button>
                }
              </div>
            </div>
          </section>

          <div class="grid">
            <section class="panel" aria-labelledby="customer-title">
              <div class="panel-head"><mat-icon aria-hidden="true">person</mat-icon><h2 id="customer-title">Müşteri</h2></div>
              <dl>
                <div><dt>Ad Soyad</dt><dd>{{ record.customerName }}</dd></div>
                <div><dt>Telefon</dt><dd><a [href]="phoneHref(record.customerPhone)">{{ record.customerPhone }}</a></dd></div>
                <div><dt>E-posta</dt><dd>{{ record.customerEmail || 'Belirtilmedi' }}</dd></div>
                <div><dt>Kaynak</dt><dd>{{ record.source || 'WEB' }}</dd></div>
              </dl>
            </section>

            <section class="panel" aria-labelledby="rental-title">
              <div class="panel-head"><mat-icon aria-hidden="true">event</mat-icon><h2 id="rental-title">Rezervasyon Detayı</h2></div>
              <dl>
                <div><dt>Başlangıç</dt><dd>{{ dateLabel(record.startDate) }}</dd></div>
                <div><dt>Bitiş</dt><dd>{{ dateLabel(record.endDate) }}</dd></div>
                <div><dt>Süre</dt><dd>{{ record.days ? record.days + ' gün' : (record.rentalDuration || 'Belirtilmedi') }}</dd></div>
                <div><dt>Şoför</dt><dd>{{ record.withDriver ? 'Şoförlü hizmet' : 'Şoförsüz kiralama' }}</dd></div>
              </dl>
            </section>

            <section class="panel" aria-labelledby="route-title">
              <div class="panel-head"><mat-icon aria-hidden="true">route</mat-icon><h2 id="route-title">Teslim ve Rota</h2></div>
              <div class="route-block">
                <span class="route-dot start" aria-hidden="true"></span>
                <div><small>Alış / Buluşma</small><strong>{{ record.pickupLocation || 'Belirtilmedi' }}</strong></div>
              </div>
              <div class="route-line" aria-hidden="true"></div>
              <div class="route-block">
                <span class="route-dot finish" aria-hidden="true"></span>
                <div><small>İade / Varış</small><strong>{{ record.dropoffLocation || record.pickupLocation || 'Belirtilmedi' }}</strong></div>
              </div>
            </section>

            <section class="panel" aria-labelledby="payment-title">
              <div class="panel-head"><mat-icon aria-hidden="true">payments</mat-icon><h2 id="payment-title">Ödeme</h2></div>
              <dl>
                <div><dt>Yöntem</dt><dd>{{ paymentMethodLabel(record.paymentMethod) }}</dd></div>
                <div><dt>Durum</dt><dd>{{ paymentStatusLabel(record.paymentStatus) }}</dd></div>
                <div><dt>Toplam</dt><dd class="price">{{ money(record.totalPrice || record.basePrice || 0, record.currency) }}</dd></div>
              </dl>
            </section>
          </div>

          <section class="telemetry" aria-labelledby="telemetry-title">
            <div class="telemetry-icon"><mat-icon aria-hidden="true">satellite_alt</mat-icon></div>
            <div>
              <p>CANLI GPS / TELEMETRİ</p>
              <h2 id="telemetry-title">Gerçek cihaz verisi henüz bağlı değil</h2>
              <span>Bu projede şu anda GPS/telemetri tablosu veya cihaz sağlayıcısı bulunmuyor. Bu nedenle konum, hız, yakıt, kapı ve motor durumu uydurulmuyor. Gerçek cihaz entegrasyonu eklendiğinde bu bölüm yalnız doğrulanmış telemetriyi gösterecek.</span>
            </div>
          </section>

          @if (record.notes) {
            <section class="notes" aria-labelledby="notes-title"><h2 id="notes-title">Operasyon Notu</h2><p>{{ record.notes }}</p></section>
          }
        }
      </section>
    </main>
  `,
  styles: [`
    :host{display:block;min-height:100vh;background:#f5f7fb;color:#0f172a}.tracking-page{min-height:100vh;background:radial-gradient(circle at 90% 0,#dbeafe 0,transparent 30%),#f5f7fb}.topbar{position:sticky;top:0;z-index:40;display:flex;align-items:center;gap:.8rem;border-bottom:1px solid #dbe4ef;background:rgba(7,16,31,.97);padding:.85rem 1rem;color:#fff;box-shadow:0 10px 30px rgba(15,23,42,.12);backdrop-filter:blur(12px)}.back{display:grid;width:44px;height:44px;flex:none;place-items:center;border:1px solid rgba(255,255,255,.15);border-radius:13px;background:rgba(255,255,255,.06);color:#fff}.head-copy p,.telemetry p{margin:0;color:#60a5fa;font-size:.62rem;font-weight:950;letter-spacing:.15em}.head-copy h1{margin:.1rem 0 0;font-size:1.18rem;font-weight:950}.head-copy span{display:block;margin-top:.12rem;color:#94a3b8;font-size:.66rem}.shell{width:min(100% - 1.2rem,76rem);margin:auto;padding:1rem 0 2rem}.state-card{margin:3rem auto;max-width:620px;border:1px solid #e2e8f0;border-radius:22px;background:#fff;padding:2.2rem;text-align:center;box-shadow:0 18px 50px rgba(15,23,42,.08)}.state-card mat-icon{color:#2563eb}.state-card h2{margin:.7rem 0 .25rem}.state-card p{margin:0;color:#64748b;font-size:.85rem;line-height:1.6}.state-card.error{border-color:#fecaca;background:#fff7f7}.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}.hero-card{display:grid;overflow:hidden;border:1px solid #dbe4ef;border-radius:24px;background:#07101f;color:#fff;box-shadow:0 24px 60px rgba(15,23,42,.14)}.vehicle-media{min-height:210px;background:#111827}.vehicle-media img{width:100%;height:100%;min-height:210px;max-height:330px;object-fit:cover}.media-placeholder{display:grid;min-height:210px;place-items:center;background:linear-gradient(145deg,#0f172a,#1e293b);color:#64748b}.media-placeholder mat-icon{width:56px;height:56px;font-size:56px}.hero-copy{padding:1.2rem}.status-row{display:flex;flex-wrap:wrap;gap:.45rem}.type-badge,.status-badge{display:inline-flex;align-items:center;border-radius:999px;padding:.35rem .55rem;font-size:.62rem;font-weight:950;letter-spacing:.06em;text-transform:uppercase}.type-badge{background:#1d4ed8;color:#dbeafe}.status-badge{background:#334155;color:#fff}.status-badge.approved{background:#065f46}.status-badge.pending{background:#92400e}.status-badge.rejected,.status-badge.cancelled{background:#991b1b}.status-badge.completed{background:#334155}.hero-copy h2{margin:.65rem 0 0;font:900 clamp(1.65rem,6vw,2.65rem)/1.05 Georgia,serif}.reference{margin:.45rem 0 0;color:#94a3b8;font-size:.75rem}.hero-actions{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:1rem}.primary,.secondary{display:inline-flex;min-height:44px;align-items:center;justify-content:center;gap:.35rem;border:0;border-radius:12px;padding:0 .85rem;font-size:.75rem;font-weight:950;text-decoration:none;cursor:pointer}.primary{background:#2563eb;color:#fff}.secondary{border:1px solid rgba(148,163,184,.25);background:#111c30;color:#e2e8f0}.grid{display:grid;gap:.8rem;margin-top:.8rem}.panel,.notes{border:1px solid #e2e8f0;border-radius:20px;background:#fff;padding:1rem;box-shadow:0 10px 28px rgba(15,23,42,.045)}.panel-head{display:flex;align-items:center;gap:.45rem}.panel-head mat-icon{color:#2563eb}.panel-head h2,.notes h2{margin:0;font-size:.85rem;font-weight:950;text-transform:uppercase;letter-spacing:.05em}.panel dl{display:grid;gap:.65rem;margin:.9rem 0 0}.panel dl>div{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;border-bottom:1px solid #f1f5f9;padding-bottom:.55rem}.panel dl>div:last-child{border-bottom:0;padding-bottom:0}.panel dt{color:#64748b;font-size:.72rem}.panel dd{margin:0;max-width:62%;text-align:right;font-size:.76rem;font-weight:850;overflow-wrap:anywhere}.panel dd a{color:#1d4ed8}.price{font-size:1rem!important;color:#0f172a}.route-block{display:flex;align-items:flex-start;gap:.65rem;margin-top:.8rem}.route-dot{width:13px;height:13px;flex:none;margin-top:.2rem;border:3px solid #fff;border-radius:999px;box-shadow:0 0 0 2px #2563eb;background:#2563eb}.route-dot.finish{box-shadow:0 0 0 2px #059669;background:#059669}.route-block small{display:block;color:#64748b;font-size:.65rem}.route-block strong{display:block;margin-top:.15rem;font-size:.78rem}.route-line{width:2px;height:24px;margin:.25rem 0 .25rem 5px;background:linear-gradient(#2563eb,#059669)}.telemetry{display:flex;gap:.9rem;margin-top:.8rem;border:1px solid #bfdbfe;border-radius:20px;background:linear-gradient(145deg,#eff6ff,#fff);padding:1rem}.telemetry-icon{display:grid;width:48px;height:48px;flex:none;place-items:center;border-radius:14px;background:#dbeafe;color:#1d4ed8}.telemetry h2{margin:.2rem 0 0;font-size:1rem}.telemetry span{display:block;margin-top:.35rem;color:#52627a;font-size:.75rem;line-height:1.55}.notes{margin-top:.8rem}.notes p{margin:.55rem 0 0;color:#475569;font-size:.78rem;line-height:1.6;white-space:pre-line}@media(min-width:720px){.hero-card{grid-template-columns:minmax(300px,.9fr) 1.1fr}.grid{grid-template-columns:1fr 1fr}.hero-copy{padding:1.5rem}}@media(min-width:1080px){.shell{padding-top:1.4rem}.grid{grid-template-columns:repeat(4,1fr)}.panel dl>div{display:block}.panel dd{max-width:none;margin-top:.2rem;text-align:left}}
  `],
})
export class TrackCarComponent implements OnInit, OnDestroy {
  readonly bookingService = inject(BookingService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly auth = inject(AuthService);
  private readonly access = inject(AdminAccessService);

  readonly bookingId = signal("");
  readonly authorizing = signal(true);
  readonly accessError = signal("");
  readonly booking = computed(() => {
    const reference = this.bookingId().trim().toUpperCase();
    return this.bookingService.records().find((record) => record.id.toUpperCase() === reference) || null;
  });

  async ngOnInit(): Promise<void> {
    const reference = String(this.route.snapshot.paramMap.get("id") || "").trim().toUpperCase();
    if (!reference) {
      await this.router.navigate(["/admin/reservations"], { replaceUrl: true });
      return;
    }
    this.bookingId.set(reference);
    await this.auth.waitUntilReady();
    if (!this.auth.isLoggedIn()) {
      await this.router.navigate(["/admin/login"], { queryParams: { returnUrl: `/track-car/${encodeURIComponent(reference)}` }, replaceUrl: true });
      return;
    }
    const allowed = await this.access.can("operations");
    if (!allowed) {
      this.accessError.set("Bu ekran yalnız rezervasyon operasyonu yetkisi olan yönetici hesaplarına açıktır.");
      this.authorizing.set(false);
      return;
    }
    this.bookingService.startAdminListener();
    this.authorizing.set(false);
  }

  ngOnDestroy(): void {
    this.bookingService.stopAdminListener();
  }

  goBack(): void {
    if (typeof window !== "undefined" && window.history.length > 1) this.location.back();
    else void this.router.navigate(["/admin/reservations"]);
  }

  openReservations(): void {
    void this.router.navigate(["/admin/reservations"]);
  }

  openVehicle(record: BookingRecord): void {
    if (!record.itemId) return;
    void this.router.navigate(["/fleet", record.itemId]);
  }

  phoneHref(phone: string): string {
    return `tel:${String(phone || "").replace(/[^+\d]/g, "")}`;
  }

  whatsappHref(phone: string, reference: string): string {
    let digits = String(phone || "").replace(/\D/g, "");
    if (digits.startsWith("0")) digits = `90${digits.slice(1)}`;
    const text = `Merhaba, ${reference} referanslı Alperler Auto rezervasyonunuz hakkında iletişime geçiyoruz.`;
    return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
  }

  typeLabel(record: BookingRecord): string {
    if (record.type === "RENTAL") return "Araç Kiralama";
    if (record.type === "TOUR") return "Tur";
    if (record.type === "SALE_INQUIRY") return "Satış Talebi";
    return "Randevu";
  }

  statusLabel(status: BookingRecord["status"]): string {
    return ({ PENDING: "Bekliyor", APPROVED: "Onaylandı", REJECTED: "Reddedildi", COMPLETED: "Tamamlandı", CANCELLED: "İptal" } as const)[status] || status;
  }

  statusClass(status: BookingRecord["status"]): string {
    return `status-badge ${status.toLowerCase()}`;
  }

  dateLabel(value?: string): string {
    if (!value) return "Belirtilmedi";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(date);
  }

  money(amount: number, currency = "TRY"): string {
    if (!Number.isFinite(amount) || amount <= 0) return "Belirtilmedi";
    return new Intl.NumberFormat("tr-TR", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
  }

  paymentMethodLabel(value?: string): string {
    return ({ CARD: "Kart", EFT: "Havale / EFT", OFFICE: "Ofiste Ödeme", NONE: "Ödeme seçilmedi" } as Record<string, string>)[String(value || "NONE")] || String(value || "Belirtilmedi");
  }

  paymentStatusLabel(value?: string): string {
    return ({ PAID: "Ödendi", PENDING: "Ödeme Bekliyor", FAILED: "Başarısız", REFUNDED: "İade Edildi", NOT_REQUIRED: "Ödeme Gerekmiyor" } as Record<string, string>)[String(value || "NOT_REQUIRED")] || String(value || "Belirtilmedi");
  }
}
