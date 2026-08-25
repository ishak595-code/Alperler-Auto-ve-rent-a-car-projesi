import { CommonModule, Location } from "@angular/common";
import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatIconModule } from "@angular/material/icon";
import { ActivatedRoute, Router } from "@angular/router";
import { AccessibleNativeDateComponent } from "../components/accessible-native-date.component";
import { Tour } from "../models/car.model";
import { TurkishCurrencyPipe } from "../pipes/turkish-currency.pipe";
import { BookingService } from "../services/booking.service";
import { CarService } from "../services/car.service";
import { PublicDetailDataService } from "../services/public-detail-data.service";
import { TourAvailabilityService, TourAvailabilityV169 } from "../services/tour-availability.service";

@Component({
  selector: "app-tour-detail-v169",
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, AccessibleNativeDateComponent, TurkishCurrencyPipe],
  template: `
    <main class="page">
      @if(tour();as item){
        <header class="topbar" [attr.inert]="reservationOpen()?'':null"><div class="topbar-inner"><button type="button" class="back" (click)="goBack()" aria-label="Turlar sayfasına geri dön"><mat-icon aria-hidden="true">arrow_back</mat-icon></button><div><p>ALPERLER TUR DETAYI</p><h1>{{item.title}}</h1></div></div></header>

        <section class="gallery" [attr.aria-label]="item.title + ' tur galerisi'">
          @if(activeImage();as image){<div class="frame"><img [src]="image" [alt]="item.title + ' tur görseli'" (error)="imageFailed(image)" decoding="async" /><div class="shade"></div><div class="hero-copy"><p>{{item.duration}}</p><h2>{{item.title}}</h2><span>{{item.location||item.meetingPoint}}</span></div><div class="gallery-nav"><span>{{currentSlide()+1}} / {{images().length}}</span>@if(images().length>1){<div><button type="button" (click)="previousImage()" aria-label="Önceki tur görseli"><mat-icon aria-hidden="true">chevron_left</mat-icon></button><button type="button" (click)="nextImage()" aria-label="Sonraki tur görseli"><mat-icon aria-hidden="true">chevron_right</mat-icon></button></div>}</div></div>}@else{<div class="gallery-empty"><mat-icon aria-hidden="true">landscape</mat-icon><strong>Tur görseli henüz eklenmedi</strong></div>}
        </section>

        <div class="layout">
          <div class="main">
            <section class="panel summary">
              <div class="summary-head"><div><p class="eyebrow">CANLI TUR KAYDI</p><h2>{{item.title}}</h2><span>{{item.description}}</span></div><div class="price"><small>Kişi başı</small><strong>{{item.price|turkishCurrency}}</strong></div></div>
              <dl class="facts"><div><dt>Süre</dt><dd>{{display(item.duration)}}</dd></div><div><dt>Toplam kapasite</dt><dd>{{item.capacity ? item.capacity + ' kişi':'Belirtilmedi'}}</dd></div><div><dt>Buluşma</dt><dd>{{display(item.meetingPoint)}}</dd></div><div><dt>Konum</dt><dd>{{display(item.location||item.meetingPoint)}}</dd></div></dl>
            </section>

            @if(itineraryRows().length){<section class="panel"><header class="section-head"><p>ROTA</p><h2>Tur Programı</h2><span>{{itineraryRows().length}} planlı adım</span></header><ol class="itinerary">@for(row of itineraryRows();track $index){<li><b>{{$index+1}}</b><span>{{row}}</span></li>}</ol></section>}

            <section class="panel scope"><header class="section-head"><p>KAPSAM</p><h2>Neler dahil, neler hariç?</h2></header><div class="scope-grid">@if(item.highlights?.length){<div><h3>Öne Çıkanlar</h3><ul>@for(value of item.highlights;track value){<li><mat-icon aria-hidden="true">star</mat-icon>{{value}}</li>}</ul></div>}@if(item.includedItems?.length){<div><h3>Dahil</h3><ul>@for(value of item.includedItems;track value){<li><mat-icon aria-hidden="true">check_circle</mat-icon>{{value}}</li>}</ul></div>}@if(item.excludedItems?.length){<div><h3>Hariç</h3><ul>@for(value of item.excludedItems;track value){<li><mat-icon aria-hidden="true">remove_circle_outline</mat-icon>{{value}}</li>}</ul></div>}</div></section>
          </div>

          <aside class="booking-card">
            <p>CANLI KONTENJAN</p><h2>Tarihinizi seçin</h2><span class="intro">Kalan koltuk sayısı yalnız onaylanmış rezervasyonlardan hesaplanır. Bekleyen talepler kontenjanı kilitlemez.</span>
            <app-accessible-native-date label="Tur tarihi" [value]="tourDate" [min]="today" (valueChange)="onDateChange($event)" />
            <div class="availability" [class.full]="availability()?.remainingSeats===0">
              @if(availabilityLoading()){<mat-icon aria-hidden="true">hourglass_top</mat-icon><div><strong>Kontenjan kontrol ediliyor</strong><span>Sunucudan güncel koltuk bilgisi alınıyor.</span></div>}
              @else if(availability();as live){<mat-icon aria-hidden="true">{{live.available?'event_available':'event_busy'}}</mat-icon><div><strong>{{availabilityLabel()}}</strong><span>{{live.approvedPeople}} kişi onaylandı · {{live.pendingPeople}} kişi talep aşamasında</span></div>}
              @else{<mat-icon aria-hidden="true">event</mat-icon><div><strong>Tarih seçin</strong><span>Seçilen gün için gerçek kapasite hesaplanacak.</span></div>}
            </div>
            @if(availabilityError()){<p class="error" role="alert">{{availabilityError()}}</p>}
            <div class="people"><span>Kişi sayısı</span><div><button type="button" (click)="decreasePerson()" aria-label="Kişi sayısını azalt"><mat-icon aria-hidden="true">remove</mat-icon></button><strong>{{personCount()}}</strong><button type="button" (click)="increasePerson()" [disabled]="!canIncreasePerson()" aria-label="Kişi sayısını artır"><mat-icon aria-hidden="true">add</mat-icon></button></div></div>
            <div class="total"><span>Tahmini toplam</span><strong>{{totalPrice()|turkishCurrency}}</strong></div>
            <button type="button" class="reserve" (click)="openReservation()" [disabled]="!canStartReservation()">{{canStartReservation()?'Rezervasyon Talebi Oluştur':'Önce uygun bir tarih seçin'}}</button>
            <button type="button" class="whatsapp" (click)="whatsapp()"><mat-icon aria-hidden="true">chat</mat-icon>WhatsApp’tan Sor</button>
          </aside>
        </div>

        @if(reservationOpen()){
          <div class="overlay" role="dialog" aria-modal="true" aria-labelledby="tour-booking-v169-title">
            <div class="modal">
              <header><div><p>ADIM {{step()}} / 3</p><h2 id="tour-booking-v169-title">Tur Rezervasyon Talebi</h2></div><button type="button" (click)="closeReservation()" [disabled]="submitting()" aria-label="Rezervasyon penceresini kapat"><mat-icon aria-hidden="true">close</mat-icon></button></header>
              @if(successReference()){
                <section class="success" role="status"><mat-icon aria-hidden="true">check_circle</mat-icon><h3>Talebiniz kaydedildi</h3><p>Referans: {{successReference()}}</p><span>Talep PENDING durumunda başlar ve kontenjanı kilitlemez. Ekip onayladığında koltuk kapasitesinden düşer.</span><button type="button" (click)="closeReservation()">Tura dön</button></section>
              }@else if(step()===1){
                <section class="step"><p class="kicker">PLAN</p><h3>Tarih ve kişi sayısı</h3><dl><div><dt>Tur</dt><dd>{{item.title}}</dd></div><div><dt>Tarih</dt><dd>{{formattedDate()}}</dd></div><div><dt>Kalan koltuk</dt><dd>{{availability()?.remainingSeats}}</dd></div><div><dt>Kişi</dt><dd>{{personCount()}}</dd></div><div><dt>Toplam</dt><dd>{{totalPrice()|turkishCurrency}}</dd></div></dl><button type="button" class="next" (click)="nextToContact()">İletişim bilgilerine geç</button></section>
              }@else if(step()===2){
                <section class="step"><p class="kicker">İLETİŞİM</p><h3>Size nasıl ulaşalım?</h3><div class="form-grid"><label><span>Ad</span><input [(ngModel)]="firstName" autocomplete="given-name" /></label><label><span>Soyad</span><input [(ngModel)]="lastName" autocomplete="family-name" /></label><label><span>Telefon</span><input [(ngModel)]="phone" type="tel" autocomplete="tel" /></label><label><span>E-posta</span><input [(ngModel)]="email" type="email" autocomplete="email" /></label></div><label class="note"><span>Not</span><textarea [(ngModel)]="notes" rows="3"></textarea></label>@if(formError()){<p class="error" role="alert">{{formError()}}</p>}<div class="actions"><button type="button" class="secondary" (click)="step.set(1)">Geri</button><button type="button" class="next" (click)="nextToReview()">Kontrol et</button></div></section>
              }@else{
                <section class="step"><p class="kicker">ONAY</p><h3>Talebi göndermeden önce kontrol edin</h3><dl><div><dt>Tur</dt><dd>{{item.title}}</dd></div><div><dt>Tarih</dt><dd>{{formattedDate()}}</dd></div><div><dt>Kişi</dt><dd>{{personCount()}}</dd></div><div><dt>Toplam</dt><dd>{{totalPrice()|turkishCurrency}}</dd></div><div><dt>İletişim</dt><dd>{{firstName}} {{lastName}} · {{phone}}</dd></div></dl>@if(formError()){<p class="error" role="alert">{{formError()}}</p>}<div class="actions"><button type="button" class="secondary" (click)="step.set(2)">Geri</button><button type="button" class="next" (click)="submit()" [disabled]="submitting()">{{submitting()?'Kaydediliyor...':'Talebi Gönder'}}</button></div></section>
              }
            </div>
          </div>
        }
      }@else if(loading()){<section class="state"><div class="spinner"></div><strong>Tur bilgileri yükleniyor</strong></section>}@else{<section class="state error-state"><mat-icon aria-hidden="true">error_outline</mat-icon><strong>Tur yüklenemedi</strong><span>{{loadError()}}</span><button type="button" (click)="reload()">Tekrar dene</button></section>}
    </main>
  `,
  styles: [`
    :host{display:block;background:#050b18;color:#fff}.page{min-height:100dvh;background:#050b18;padding-bottom:70px;font-family:Inter,system-ui,sans-serif}.topbar{position:sticky;top:0;z-index:70;border-bottom:1px solid #1e293b;background:rgba(5,11,24,.96);backdrop-filter:blur(15px)}.topbar-inner{display:flex;width:min(100% - 24px,1180px);min-height:70px;margin:auto;align-items:center;gap:10px}.back{display:grid;width:46px;height:46px;flex:none;place-items:center;border:1px solid #26354d;border-radius:14px;background:#0d1729;color:#fff}.topbar p,.eyebrow,.section-head p,.booking-card>p,.modal header p,.kicker{margin:0;color:#60a5fa;font-size:9px;font-weight:950;letter-spacing:.15em}.topbar h1{margin:3px 0 0;max-width:75vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:17px}.gallery{background:#020617}.frame{position:relative;width:min(100%,1180px);margin:auto;aspect-ratio:16/10;overflow:hidden}.frame>img{width:100%;height:100%;object-fit:cover}.shade{position:absolute;inset:0;background:linear-gradient(to top,rgba(2,6,23,.94),transparent 62%)}.hero-copy{position:absolute;left:18px;right:18px;bottom:65px}.hero-copy p{margin:0;color:#fbbf24;font-size:10px;font-weight:900;text-transform:uppercase}.hero-copy h2{margin:5px 0 0;font:900 clamp(28px,7vw,52px)/1 Georgia,serif}.hero-copy span{display:block;margin-top:8px;color:#dbeafe;font-size:11px}.gallery-nav{position:absolute;left:15px;right:15px;bottom:14px;display:flex;align-items:center;justify-content:space-between}.gallery-nav>span{border-radius:999px;background:rgba(2,6,23,.78);padding:7px 10px;font-size:10px;font-weight:900}.gallery-nav div{display:flex;gap:5px}.gallery-nav button{display:grid;width:42px;height:42px;place-items:center;border:1px solid rgba(255,255,255,.2);border-radius:50%;background:rgba(2,6,23,.75);color:#fff}.gallery-empty{display:grid;min-height:320px;place-items:center;background:#0d1729;color:#64748b}.layout{display:grid;width:min(100% - 28px,1180px);margin:24px auto 0;gap:20px}.main{display:grid;min-width:0;gap:18px}.panel,.booking-card{border:1px solid #26354d;border-radius:22px;background:#0c1526;padding:18px}.summary-head{display:grid;gap:16px}.summary h2,.section-head h2,.booking-card h2{margin:5px 0 0;font-size:22px}.summary-head>div>span{display:block;margin-top:10px;color:#94a3b8;font-size:12px;line-height:1.7}.price{align-self:start}.price small{display:block;color:#8190a6;font-size:9px;text-transform:uppercase}.price strong{display:block;margin-top:3px;font-size:24px}.facts{display:grid;grid-template-columns:1fr;gap:8px;margin:18px 0 0}.facts div{border:1px solid #26354d;border-radius:12px;background:#101c30;padding:11px}.facts dt{color:#8190a6;font-size:8px;font-weight:850;text-transform:uppercase}.facts dd{margin:4px 0 0;color:#e2e8f0;font-size:11px;font-weight:800}.section-head span{display:block;margin-top:5px;color:#8190a6;font-size:10px}.itinerary{display:grid;gap:10px;margin:16px 0 0;padding:0;list-style:none}.itinerary li{display:grid;grid-template-columns:32px 1fr;align-items:start;gap:10px}.itinerary b{display:grid;width:32px;height:32px;place-items:center;border-radius:50%;background:#1d4ed8;font-size:11px}.itinerary span{border-left:1px solid #334155;padding:7px 0 12px 12px;color:#cbd5e1;font-size:12px;line-height:1.6}.scope-grid{display:grid;gap:15px;margin-top:15px}.scope-grid>div{border:1px solid #26354d;border-radius:14px;padding:13px}.scope-grid h3{margin:0;font-size:12px}.scope-grid ul{display:grid;gap:7px;margin:10px 0 0;padding:0;list-style:none}.scope-grid li{display:flex;align-items:flex-start;gap:6px;color:#b8c5d6;font-size:10px;line-height:1.5}.scope-grid mat-icon{width:16px;height:16px;flex:none;font-size:16px;color:#60a5fa}.booking-card{align-self:start}.intro{display:block;margin-top:9px;color:#94a3b8;font-size:11px;line-height:1.6}.booking-card app-accessible-native-date{display:block;margin-top:16px}.availability{display:flex;align-items:flex-start;gap:9px;margin-top:13px;border:1px solid #164e63;border-radius:14px;background:#082f49;padding:12px}.availability.full{border-color:#7f1d1d;background:#450a0a}.availability>mat-icon{color:#67e8f9}.availability div{min-width:0}.availability strong,.availability span{display:block}.availability strong{font-size:11px}.availability span{margin-top:3px;color:#bae6fd;font-size:9px;line-height:1.45}.people{display:flex;align-items:center;justify-content:space-between;margin-top:14px;border-top:1px solid #26354d;padding-top:13px}.people>span{font-size:11px;font-weight:850}.people div{display:flex;align-items:center;gap:8px}.people button{display:grid;width:40px;height:40px;place-items:center;border:1px solid #334155;border-radius:11px;background:#101c30;color:#fff}.people button:disabled{opacity:.35}.people strong{min-width:24px;text-align:center}.total{display:flex;align-items:end;justify-content:space-between;margin-top:12px}.total span{color:#8190a6;font-size:10px}.total strong{font-size:21px}.reserve,.whatsapp{display:flex;width:100%;min-height:50px;margin-top:12px;align-items:center;justify-content:center;gap:7px;border:0;border-radius:13px;font-weight:900}.reserve{background:#2563eb;color:#fff}.reserve:disabled{background:#1e293b;color:#64748b}.whatsapp{background:#14532d;color:#dcfce7}.error{margin:10px 0 0;border-radius:10px;background:#450a0a;padding:9px;color:#fecaca;font-size:10px}.overlay{position:fixed;inset:0;z-index:120;display:grid;place-items:center;background:rgba(2,6,23,.82);padding:14px;backdrop-filter:blur(7px)}.modal{width:min(100%,620px);max-height:92dvh;overflow:auto;border:1px solid #334155;border-radius:24px;background:#fff;color:#0f172a;box-shadow:0 30px 100px rgba(0,0,0,.6)}.modal>header{display:flex;position:sticky;top:0;z-index:2;align-items:center;justify-content:space-between;border-bottom:1px solid #e2e8f0;background:#fff;padding:17px}.modal header h2{margin:3px 0 0;font-size:20px}.modal header button{display:grid;width:44px;height:44px;place-items:center;border:0;border-radius:12px;background:#f1f5f9}.step,.success{padding:20px}.step h3,.success h3{margin:5px 0 16px;font-size:22px}.step dl{display:grid;gap:7px}.step dl div{display:flex;align-items:start;justify-content:space-between;gap:12px;border-bottom:1px solid #e2e8f0;padding:9px 0}.step dt{color:#64748b;font-size:10px;font-weight:800}.step dd{margin:0;text-align:right;font-size:11px;font-weight:850}.next,.secondary,.success button{min-height:48px;border:0;border-radius:12px;padding:0 16px;font-weight:900}.next{width:100%;margin-top:16px;background:#0f172a;color:#fff}.form-grid{display:grid;gap:11px}.form-grid label,.note{display:grid;gap:5px;color:#475569;font-size:10px;font-weight:850}.form-grid input,.note textarea{width:100%;min-height:46px;border:1px solid #cbd5e1;border-radius:11px;padding:9px 11px;color:#0f172a}.note{margin-top:11px}.actions{display:grid;grid-template-columns:1fr 1.5fr;gap:9px;margin-top:16px}.actions .next{margin:0}.secondary{background:#e2e8f0;color:#334155}.success{text-align:center}.success>mat-icon{width:56px;height:56px;font-size:56px;color:#16a34a}.success p{font-weight:900}.success span{display:block;color:#64748b;font-size:11px;line-height:1.6}.success button{margin-top:16px;background:#0f172a;color:#fff}.state{display:grid;min-height:70dvh;place-items:center;align-content:center;gap:12px;text-align:center}.state span{max-width:420px;color:#94a3b8}.state button{min-height:46px;border:0;border-radius:12px;background:#2563eb;padding:0 18px;color:#fff;font-weight:900}.spinner{width:38px;height:38px;border:4px solid #1e293b;border-top-color:#60a5fa;border-radius:50%;animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}@media(min-width:700px){.summary-head{grid-template-columns:1fr auto}.facts{grid-template-columns:repeat(2,minmax(0,1fr))}.scope-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.form-grid{grid-template-columns:1fr 1fr}}@media(min-width:980px){.layout{grid-template-columns:minmax(0,1fr) 350px}.booking-card{position:sticky;top:90px}.frame{aspect-ratio:16/8}}@media(prefers-reduced-motion:reduce){.spinner{animation:none}}
  `],
})
export class TourDetailV169Component implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly detailData = inject(PublicDetailDataService);
  private readonly availabilityService = inject(TourAvailabilityService);
  private readonly bookingService = inject(BookingService);
  private readonly carService = inject(CarService);

  readonly tour = signal<Tour | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal("");
  readonly currentSlide = signal(0);
  readonly failedImages = signal<string[]>([]);
  readonly availability = signal<TourAvailabilityV169 | null>(null);
  readonly availabilityLoading = signal(false);
  readonly availabilityError = signal("");
  readonly personCount = signal(1);
  readonly reservationOpen = signal(false);
  readonly step = signal<1 | 2 | 3>(1);
  readonly formError = signal("");
  readonly submitting = signal(false);
  readonly successReference = signal("");
  readonly today = this.localDate(new Date());
  tourDate = "";
  firstName = "";
  lastName = "";
  phone = "";
  email = "";
  notes = "";

  readonly images = computed(() => this.detailData.mediaUrls(this.tour() || ({ category: "TOUR", id: "", price: 0 } as Tour)).filter((url) => !this.failedImages().includes(url)));
  readonly activeImage = computed(() => { const list = this.images(); return list.length ? list[Math.min(this.currentSlide(), list.length - 1)] : ""; });
  readonly totalPrice = computed(() => Number(this.tour()?.price || 0) * this.personCount());
  readonly itineraryRows = computed(() => (this.tour()?.itinerary || []).map((value, index) => this.itineraryText(value, index)).filter(Boolean));
  readonly canStartReservation = computed(() => this.tour()?.publicationStatus === "PUBLISHED" && this.tour()?.isAvailable !== false && this.availability()?.available === true && this.personCount() <= Number(this.availability()?.remainingSeats || 0));
  readonly canIncreasePerson = computed(() => this.canStartReservation() && this.personCount() < Number(this.availability()?.remainingSeats || 0));

  async ngOnInit(): Promise<void> { await this.reload(); }
  async reload(): Promise<void> {
    this.loading.set(true); this.loadError.set("");
    try {
      const id = this.route.snapshot.paramMap.get("id") || "";
      const item = await this.detailData.load("TOUR", id) as Tour;
      this.tour.set(item); this.currentSlide.set(0); this.failedImages.set([]);
    } catch (error) { this.tour.set(null); this.loadError.set(error instanceof Error ? error.message : "Tur kaydı yüklenemedi."); }
    finally { this.loading.set(false); }
  }

  display(value: unknown): string { return this.detailData.display(value); }
  imageFailed(url: string): void { this.failedImages.update((rows) => rows.includes(url) ? rows : [...rows, url]); this.currentSlide.set(0); }
  previousImage(): void { const total = this.images().length; if (total) this.currentSlide.update((value) => (value - 1 + total) % total); }
  nextImage(): void { const total = this.images().length; if (total) this.currentSlide.update((value) => (value + 1) % total); }
  goBack(): void { if (typeof window !== "undefined" && window.history.length > 1) this.location.back(); else void this.router.navigate(["/tours"]); }

  async onDateChange(value: string): Promise<void> {
    this.tourDate = value; this.availability.set(null); this.availabilityError.set(""); this.personCount.set(1);
    if (!value || value < this.today) return;
    const item = this.tour(); if (!item) return;
    this.availabilityLoading.set(true);
    try {
      const live = await this.availabilityService.check(item.cloudId || item.cloudSlug || item.id, value);
      this.availability.set(live);
    } catch (error) { this.availabilityError.set(this.cleanError(error)); }
    finally { this.availabilityLoading.set(false); }
  }
  availabilityLabel(): string { const live = this.availability(); if (!live) return "Tarih seçin"; if (!live.available || live.remainingSeats < 1) return "Bu tarihte kontenjan dolu"; return `${live.remainingSeats} koltuk kaldı`; }
  increasePerson(): void { const max = Number(this.availability()?.remainingSeats || 0); if (this.personCount() < max) this.personCount.update((value) => value + 1); }
  decreasePerson(): void { if (this.personCount() > 1) this.personCount.update((value) => value - 1); }

  openReservation(): void { if (!this.canStartReservation()) return; this.step.set(1); this.formError.set(""); this.successReference.set(""); this.reservationOpen.set(true); }
  closeReservation(): void { if (!this.submitting()) this.reservationOpen.set(false); }
  nextToContact(): void { if (!this.canStartReservation()) { this.formError.set("Seçilen tarih için yeterli kontenjan yok."); return; } this.formError.set(""); this.step.set(2); }
  nextToReview(): void {
    if (!this.firstName.trim() || !this.lastName.trim()) { this.formError.set("Ad ve soyad zorunlu."); return; }
    if (!/^[+0-9()\s-]{7,24}$/.test(this.phone.trim())) { this.formError.set("Geçerli bir telefon numarası girin."); return; }
    if (this.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim())) { this.formError.set("E-posta adresi geçerli değil."); return; }
    this.formError.set(""); this.step.set(3);
  }
  async submit(): Promise<void> {
    const item = this.tour(); if (!item || this.submitting() || !this.canStartReservation()) return;
    this.submitting.set(true); this.formError.set("");
    try {
      const live = await this.availabilityService.check(item.cloudId || item.cloudSlug || item.id, this.tourDate);
      this.availability.set(live);
      if (!live.available || this.personCount() > live.remainingSeats) throw new Error("TOUR_CAPACITY_CHANGED:Seçtiğiniz tarihte kalan koltuk sayısı değişti.");
      const saved = await this.bookingService.create({
        type: "TOUR",
        itemId: String(item.cloudId || item.id),
        itemName: item.title || "Tur",
        image: item.image,
        customerName: `${this.firstName.trim()} ${this.lastName.trim()}`,
        customerEmail: this.email.trim() || undefined,
        customerPhone: this.phone.trim(),
        basePrice: Number(item.price || 0),
        totalPrice: this.totalPrice(),
        currency: "TRY",
        personCount: this.personCount(),
        startDate: this.tourDate,
        notes: this.notes.trim() || undefined,
      });
      this.successReference.set(saved.id);
      const refreshed = await this.availabilityService.check(item.cloudId || item.cloudSlug || item.id, this.tourDate).catch(() => null);
      if (refreshed) this.availability.set(refreshed);
    } catch (error) { this.formError.set(this.cleanError(error)); }
    finally { this.submitting.set(false); }
  }

  formattedDate(): string { if (!this.tourDate) return "Tarih seçilmedi"; const date = new Date(`${this.tourDate}T12:00:00`); return Number.isNaN(date.getTime()) ? this.tourDate : date.toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" }); }
  whatsapp(): void { const item = this.tour(); if (!item || typeof window === "undefined") return; const raw = String(this.carService.getConfig()().whatsapp || "").replace(/\D/g, ""); const phone = raw || "905555555555"; const message = `${item.title || "Tur"} hakkında bilgi almak istiyorum.${this.tourDate ? ` Tarih: ${this.tourDate}.` : ""}`; window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer"); }

  private itineraryText(value: unknown, index: number): string { if (typeof value === "string") return value.trim(); if (value && typeof value === "object") { const row = value as Record<string, unknown>; return String(row["title"] || row["name"] || row["description"] || row["label"] || `Program adımı ${index + 1}`).trim(); } return ""; }
  private localDate(date: Date): string { const pad = (value: number) => String(value).padStart(2, "0"); return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`; }
  private cleanError(error: unknown): string { const message = error instanceof Error ? error.message : "İşlem tamamlanamadı."; const parts = message.split(":"); return parts.length > 1 ? parts.slice(1).join(":") : message; }
}
