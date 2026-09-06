import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from "@angular/core";
import { MatIconModule } from "@angular/material/icon";
import { ActivatedRoute, Router } from "@angular/router";
import { BookingAlternativeOffer, BookingStatus, NotificationDeliveryReport } from "../../models/booking.model";
import { TurkishCurrencyPipe } from "../../pipes/turkish-currency.pipe";
import { BookingService } from "../../services/booking.service";
import { ConfirmService } from "../../services/confirm.service";
import { ToastService } from "../../services/toast.service";

@Component({
  selector: "app-admin-reservations",
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, TurkishCurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="page">
      <header class="toolbar">
        <div class="title-row">
          <button type="button" class="back" (click)="goBack()" aria-label="Kontrol paneline dön"><mat-icon aria-hidden="true">arrow_back</mat-icon></button>
          <h1>{{ pageTitle() }} <span class="count" aria-live="polite">{{ filteredReservations().length }} / {{ reservations().length }} kayıt</span></h1>
        </div>
        <div class="tools">
          <label class="search"><span class="sr-only">Rezervasyonlarda ara</span><input [ngModel]="searchQuery()" (ngModelChange)="searchQuery.set($event)" type="search" autocomplete="off" placeholder="Müşteri, telefon, e-posta veya araç ara…" /></label>
          <div class="filters" role="group" aria-label="Durum filtresi">
            @for (option of filterOptions; track option.value) {
              <button type="button" (click)="filter.set(option.value)" [class.active]="filter() === option.value" [attr.aria-pressed]="filter() === option.value">{{ option.label }}</button>
            }
          </div>
        </div>
      </header>

      <section class="body">
        @if (!bookingService.isAdminLoaded()) {
          <div role="status" class="notice"><mat-icon class="spin" aria-hidden="true">progress_activity</mat-icon><div><h2>Kayıtlar yükleniyor</h2><p>Veri servisi ve yönetici erişimi kontrol ediliyor.</p></div></div>
        } @else if (bookingService.lastAdminError()) {
          <div role="alert" class="notice warn">
            <mat-icon aria-hidden="true">cloud_off</mat-icon>
            <div>
              <h2>Rezervasyon verisine ulaşılamadı</h2>
              <p>{{ bookingService.lastAdminError() }}</p>
              <p class="muted">Bu ekranda sahte kayıt gösterilmiyor. Hata metni hangi katmanın yanıt vermediğini söyler.</p>
              <button type="button" class="btn primary" (click)="retryConnection()">Tekrar Dene</button>
            </div>
          </div>
        } @else if (filteredReservations().length === 0) {
          <div class="notice empty" role="status"><mat-icon aria-hidden="true">inbox</mat-icon><div><h2>Bu kriterde kayıt yok</h2><p>Farklı bir durum filtresi seçebilirsiniz.</p></div></div>
        } @else {
          <ul class="rows" aria-label="Rezervasyon listesi">
            @for (res of filteredReservations(); track res.id) {
              <li [class.open]="expandedId() === res.id">
                <button type="button" class="row" (click)="toggleDetail(res.id)" [attr.aria-expanded]="expandedId() === res.id" [attr.aria-controls]="'res-' + res.id" [attr.aria-label]="rowLabel(res)">
                  <span class="copy">
                    <strong>{{ res.customerName }}</strong>
                    <small>{{ typeLabel(res.type) }} · {{ res.itemName }}@if (res.startDate) { · {{ res.startDate }}}</small>
                  </span>
                  <span class="right">
                    @if ((res.totalPrice || res.basePrice || 0) > 0) {<span class="price">{{ res.totalPrice || res.basePrice | turkishCurrency }}</span>}
                    <span [class]="'badge ' + statusClass(res.status)">{{ statusLabel(res.status) }}</span>
                    @if (res.status === 'PENDING' && (res.alternatives?.length || 0) > 0) {<span class="badge alt">{{ res.alternatives?.length }} alternatif</span>}
                    <mat-icon class="chev" [class.up]="expandedId() === res.id" aria-hidden="true">expand_more</mat-icon>
                  </span>
                </button>

                @if (expandedId() === res.id) {
                  <div class="detail" [id]="'res-' + res.id">
                    <div class="cards">
                      <section class="card"><h3>Müşteri</h3><dl>
                        <div><dt>Telefon</dt><dd>@if (res.customerPhone) {<a [href]="'tel:' + res.customerPhone">{{ res.customerPhone }}</a>} @else {—}</dd></div>
                        <div><dt>E-posta</dt><dd>@if (res.customerEmail) {<a [href]="'mailto:' + res.customerEmail">{{ res.customerEmail }}</a>} @else {—}</dd></div>
                        <div><dt>Kaynak</dt><dd>{{ res.source || 'WEB' }}</dd></div>
                        <div><dt>Referans</dt><dd class="mono">{{ res.id }}</dd></div>
                      </dl></section>
                      <section class="card"><h3>Talep Detayı</h3><dl>
                        <div><dt>Tür</dt><dd>{{ typeLabel(res.type) }}</dd></div>
                        <div><dt>Ürün</dt><dd>{{ res.itemName }}</dd></div>
                        @if (res.startDate) {<div><dt>Başlangıç</dt><dd>{{ res.startDate }}</dd></div>}
                        @if (res.endDate) {<div><dt>Bitiş</dt><dd>{{ res.endDate }}</dd></div>}
                        @if (res.days) {<div><dt>Gün</dt><dd>{{ res.days }}</dd></div>}
                        @if (res.rentalHours) {<div><dt>Saat</dt><dd>{{ res.rentalHours }}</dd></div>}
                        @if (res.personCount) {<div><dt>Kişi</dt><dd>{{ res.personCount }}</dd></div>}
                        @if (res.pickupLocation) {<div><dt>Alış</dt><dd>{{ res.pickupLocation }}</dd></div>}
                        @if (res.dropoffLocation) {<div><dt>Teslim</dt><dd>{{ res.dropoffLocation }}</dd></div>}
                        @if (res.type === 'RENTAL') {<div><dt>Şoför</dt><dd>{{ res.withDriver ? 'Şoförlü' : 'Şoförsüz' }}</dd></div>}
                      </dl></section>
                      <section class="card"><h3>Ödeme ve Not</h3>
                        <p class="note">{{ res.notes || 'Not bırakılmadı.' }}</p>
                        <dl>
                          <div><dt>Ödeme yöntemi</dt><dd>{{ res.paymentMethod || 'NONE' }}</dd></div>
                          <div><dt>Ödeme durumu</dt><dd>{{ res.paymentStatus || '—' }}</dd></div>
                          @if ((res.totalPrice || res.basePrice || 0) > 0) {<div><dt>Tutar</dt><dd>{{ res.totalPrice || res.basePrice | turkishCurrency }}</dd></div>}
                          <div><dt>Oluşturulma</dt><dd>{{ res.createdAt | date:'dd.MM.yyyy HH:mm' }}</dd></div>
                        </dl>
                      </section>
                    </div>

                    @if (res.status === 'PENDING' && (res.alternatives?.length || 0) > 0) {
                      <section class="card alt-panel" [attr.aria-labelledby]="'alternative-title-' + res.id">
                        <h3 [id]="'alternative-title-' + res.id">Müşteriyi kaybetmeyin: uygun alternatifler hazır</h3>
                        <p class="muted">Bu talebin istediği araç aynı zaman aralığında başka bir müşteriye onaylandı. Aşağıdaki araçlar seçilen tarihlerde müsait.</p>
                        <ul class="alts">
                          @for (alt of res.alternatives || []; track alt.id) {
                            <li>
                              <div class="alt-head">@if (alt.coverImage) {<img [src]="alt.coverImage" alt="" />}<div><strong>{{ alt.brand }} {{ alt.model }}</strong><small>#{{ alt.rank }} · Uyum {{ alt.score | number:'1.0-0' }}/100 · {{ alternativePriceLabel(alt) }}</small><small>{{ alt.reason || 'Seçilen tarihlerde onaylı rezervasyonu yok.' }}</small></div></div>
                              <div class="actions">
                                <button type="button" class="btn amber" (click)="markAlternativeOffered(res.id, alt, $event)" [disabled]="updatingOfferId() === alt.id || alt.status === 'OFFERED'" [attr.aria-label]="alt.brand + ' ' + alt.model + ' aracını önerildi olarak işaretle'">{{ alt.status === 'OFFERED' ? 'Önerildi' : 'Önerildi Olarak İşaretle' }}</button>
                                @if (hasWhatsAppNumber(res.customerPhone)) {<button type="button" class="btn green" (click)="offerViaWhatsApp(res.id, res.customerPhone, alt, $event)" [disabled]="updatingOfferId() === alt.id" [attr.aria-label]="alt.brand + ' ' + alt.model + ' aracını WhatsApp ile müşteriye öner'">WhatsApp ile Öner</button>}
                              </div>
                            </li>
                          }
                        </ul>
                      </section>
                    }

                    @if (res.notification) {<section class="card"><h3>Son Bildirim Sonucu</h3><dl><div><dt>E-posta</dt><dd>{{ res.notification.email.state }}</dd></div><div><dt>SMS</dt><dd>{{ res.notification.sms.state }}</dd></div><div><dt>Yönetici</dt><dd>{{ res.notification.adminEmail?.state || 'skipped' }}</dd></div></dl></section>}

                    <div class="actions main" role="group" [attr.aria-label]="res.customerName + ' için işlemler'">
                      @if (res.type === 'RENTAL') {<button type="button" class="btn blue" (click)="openTracking(res.id, $event)" [attr.aria-label]="res.id + ' rezervasyonunun operasyon detayını aç'"><mat-icon aria-hidden="true">route</mat-icon>Operasyon Detayı</button>}
                      @if (res.status !== 'APPROVED') {<button type="button" class="btn green" (click)="updateStatus(res.id, 'APPROVED', $event)" [disabled]="updatingId() === res.id"><mat-icon aria-hidden="true">check</mat-icon>Onayla</button>}
                      @if (res.status !== 'REJECTED') {<button type="button" class="btn red" (click)="updateStatus(res.id, 'REJECTED', $event)" [disabled]="updatingId() === res.id"><mat-icon aria-hidden="true">close</mat-icon>Reddet</button>}
                      @if (res.status === 'APPROVED') {<button type="button" class="btn dark" (click)="updateStatus(res.id, 'COMPLETED', $event)" [disabled]="updatingId() === res.id"><mat-icon aria-hidden="true">task_alt</mat-icon>Tamamla</button>}
                      @if (res.status !== 'PENDING') {<button type="button" class="btn light" (click)="updateStatus(res.id, 'PENDING', $event)" [disabled]="updatingId() === res.id"><mat-icon aria-hidden="true">undo</mat-icon>Beklemeye Al</button>}
                      @if (res.status !== 'CANCELLED' && res.status !== 'COMPLETED') {<button type="button" class="btn amber-outline" (click)="updateStatus(res.id, 'CANCELLED', $event)" [disabled]="updatingId() === res.id"><mat-icon aria-hidden="true">event_busy</mat-icon>İptal</button>}
                      <button type="button" class="btn dark" (click)="deleteReservation(res.id, $event)" [disabled]="updatingId() === res.id"><mat-icon aria-hidden="true">delete</mat-icon>Sil</button>
                    </div>
                  </div>
                }
              </li>
            }
          </ul>
        }
      </section>
    </main>
  `,
  styles: [`
    :host{display:block;color:#0f172a}.page{min-height:60vh;background:#f4f7fb}
    .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
    .toolbar{position:sticky;top:0;z-index:20;border-bottom:1px solid #e2e8f0;background:rgba(255,255,255,.97);padding:6px 8px;backdrop-filter:blur(10px)}
    .title-row{display:flex;align-items:center;gap:8px}.back{display:grid;width:38px;height:38px;flex:none;place-items:center;border:1px solid #dbe4ef;border-radius:10px;background:#fff;color:#0f172a}
    .toolbar h1{margin:0;min-width:0;font-size:15px;font-weight:950;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.count{margin-left:6px;color:#64748b;font-size:11px;font-weight:700}
    .tools{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}.search{flex:1 1 220px}.search input{width:100%;min-height:38px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;padding:0 10px;font-size:13px}
    .filters{display:flex;gap:4px;overflow-x:auto;scrollbar-width:none;flex:1 1 100%}.filters::-webkit-scrollbar{display:none}
    .filters button{flex:0 0 auto;min-height:34px;border:1px solid #e2e8f0;border-radius:999px;background:#fff;padding:0 11px;color:#475569;font-size:11px;font-weight:900}.filters button.active{border-color:#2563eb;background:#eff6ff;color:#1d4ed8}
    .body{width:min(100%,1200px);margin:auto;padding:8px}
    .notice{display:flex;gap:12px;align-items:flex-start;border:1px solid #e2e8f0;border-radius:14px;background:#fff;padding:16px}.notice h2{margin:0;font-size:15px;font-weight:950}.notice p{margin:6px 0 0;font-size:13px;line-height:1.5}.notice.warn{border-color:#fcd34d;background:#fffbeb;color:#78350f}.notice.empty{color:#64748b}.muted{color:#64748b;font-size:12px}
    .spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
    .rows{list-style:none;margin:0;padding:0;border:1px solid #dbe4ef;border-radius:14px;background:#fff;overflow:hidden}.rows>li{border-bottom:1px solid #eef2f7}.rows>li:last-child{border-bottom:0}
    .row{display:grid;width:100%;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:8px;min-height:54px;border:0;background:#fff;padding:7px 10px;text-align:left;color:inherit;cursor:pointer}.row:hover{background:#f8fafc}.row:focus-visible{outline:2px solid #2563eb;outline-offset:-2px;background:#eff6ff}li.open>.row{background:#f1f5f9}
    .copy{min-width:0}.copy strong,.copy small{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.copy strong{font-size:13px;font-weight:900}.copy small{margin-top:2px;color:#64748b;font-size:11px}
    .right{display:flex;align-items:center;gap:6px}.price{font-size:12px;font-weight:900}
    .badge{border-radius:999px;padding:3px 8px;font-size:9px;font-weight:950;letter-spacing:.04em;text-transform:uppercase;background:#e2e8f0;color:#334155}.badge.pending{background:#dbeafe;color:#1e40af}.badge.approved{background:#dcfce7;color:#166534}.badge.rejected{background:#fee2e2;color:#991b1b}.badge.completed{background:#e2e8f0;color:#1e293b}.badge.cancelled{background:#fef3c7;color:#92400e}.badge.alt{background:#fef3c7;color:#92400e}
    .chev{color:#94a3b8;transition:transform .15s}.chev.up{transform:rotate(180deg)}
    .detail{border-top:1px solid #e2e8f0;background:#f8fafc;padding:10px}.cards{display:grid;gap:8px}@media(min-width:900px){.cards{grid-template-columns:repeat(3,1fr)}}
    .card{border:1px solid #e2e8f0;border-radius:12px;background:#fff;padding:10px 12px}.card h3{margin:0 0 6px;font-size:11px;font-weight:950;letter-spacing:.08em;text-transform:uppercase;color:#64748b}
    .card dl{margin:0;display:grid;gap:4px}.card dl>div{display:flex;justify-content:space-between;gap:10px;font-size:13px}.card dt{color:#64748b}.card dd{margin:0;text-align:right;font-weight:800;overflow-wrap:anywhere}.mono{font-family:ui-monospace,monospace;font-size:11px}.card a{color:#1d4ed8}
    .note{margin:0 0 8px;border-left:3px solid #2563eb;padding-left:8px;font-size:13px;color:#334155;white-space:pre-line}
    .alt-panel{margin-top:8px;border-color:#fcd34d;background:#fffbeb}.alt-panel h3{color:#78350f;text-transform:none;letter-spacing:0;font-size:13px}
    .alts{list-style:none;margin:8px 0 0;padding:0;display:grid;gap:8px}.alts li{border:1px solid #fde68a;border-radius:10px;background:#fff;padding:8px}.alt-head{display:flex;gap:8px}.alt-head img{width:72px;height:50px;border-radius:8px;object-fit:cover}.alt-head strong{display:block;font-size:13px}.alt-head small{display:block;color:#64748b;font-size:11px}
    .actions{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px}@media(min-width:640px){.actions{display:flex;flex-wrap:wrap}}
    .btn{display:inline-flex;min-height:42px;align-items:center;justify-content:center;gap:5px;border:1px solid transparent;border-radius:10px;padding:0 12px;font-size:12px;font-weight:900;color:#fff;cursor:pointer}.btn:disabled{cursor:not-allowed;opacity:.45}.btn:focus-visible{outline:2px solid #2563eb;outline-offset:2px}
    .btn.primary,.btn.blue{background:#1d4ed8}.btn.green{background:#15803d}.btn.red{background:#be123c}.btn.dark{background:#0f172a}.btn.light{background:#e2e8f0;color:#0f172a}.btn.amber{background:#b45309}.btn.amber-outline{background:#fffbeb;border-color:#fcd34d;color:#78350f}.notice .btn{margin-top:10px}
  `],
})
export class AdminReservationsComponent implements OnInit,OnDestroy {
  readonly bookingService=inject(BookingService);private readonly route=inject(ActivatedRoute);private readonly router=inject(Router);private readonly confirmService=inject(ConfirmService);private readonly toastService=inject(ToastService);
  readonly reservations=this.bookingService.records;readonly filter=signal<"ALL"|BookingStatus>("ALL");readonly typeFilter=signal<string|null>(null);readonly expandedId=signal<string|null>(null);readonly updatingId=signal<string|null>(null);readonly updatingOfferId=signal<string|null>(null);readonly searchQuery=signal("");
  readonly filterOptions:Array<{value:"ALL"|BookingStatus;label:string}>=[{value:"ALL",label:"Tümü"},{value:"PENDING",label:"Bekleyen"},{value:"APPROVED",label:"Onaylı"},{value:"REJECTED",label:"Reddedilen"},{value:"COMPLETED",label:"Tamamlanan"},{value:"CANCELLED",label:"İptal"}];
  readonly filteredReservations=computed(()=>{let current=this.reservations();if(this.typeFilter())current=current.filter((record)=>record.type===this.typeFilter());if(this.filter()!=="ALL")current=current.filter((record)=>record.status===this.filter());const q=this.searchQuery().trim().toLocaleLowerCase("tr-TR");if(q)current=current.filter((record)=>`${record.customerName||""} ${record.customerPhone||""} ${record.customerEmail||""} ${record.itemName||""} ${record.pickupLocation||""} ${record.id}`.toLocaleLowerCase("tr-TR").includes(q));return current;});

  ngOnInit():void{this.bookingService.startAdminListener();this.route.queryParams.subscribe((params)=>this.typeFilter.set(params["type"]||null));}
  ngOnDestroy():void{this.bookingService.stopAdminListener();}
  retryConnection():void{this.bookingService.stopAdminListener();this.bookingService.startAdminListener();}
  pageTitle():string{switch(this.typeFilter()){case"RENTAL":return"Araç Kiralama Talepleri";case"TOUR":return"Tur Talepleri";case"SALE_INQUIRY":return"Satın Alma Talepleri";case"APPOINTMENT":return"Randevu Talepleri";default:return"Rezervasyon Yönetimi";}}
  typeLabel(type:string):string{switch(type){case"RENTAL":return"Araç Kiralama";case"TOUR":return"Tur";case"SALE_INQUIRY":return"Araç Satın Alma";case"APPOINTMENT":return"Randevu";default:return type;}}
  statusLabel(status:BookingStatus):string{switch(status){case"APPROVED":return"Onaylandı";case"REJECTED":return"Reddedildi";case"COMPLETED":return"Tamamlandı";case"CANCELLED":return"İptal";default:return"Bekliyor";}}
  statusClass(status:BookingStatus):string{return String(status||"PENDING").toLowerCase();}
  rowLabel(res:{id:string;customerName:string;type:string;itemName:string;status:BookingStatus;startDate?:string;totalPrice?:number;basePrice?:number}):string{const amount=res.totalPrice||res.basePrice||0;return `${res.customerName}, ${this.typeLabel(res.type)}, ${res.itemName}${res.startDate?`, ${res.startDate}`:""}${amount>0?`, ${new Intl.NumberFormat("tr-TR").format(amount)} lira`:""}, durum ${this.statusLabel(res.status)}. Ayrıntıları ${this.expandedId()===res.id?"kapat":"aç"}`;}
  goBack():void{void this.router.navigate(["/admin/dashboard"]);}toggleDetail(id:string):void{this.expandedId.set(this.expandedId()===id?null:id);}openTracking(id:string,event?:Event):void{event?.stopPropagation();void this.router.navigate(["/track-car",id]);}

  async updateStatus(id:string,status:BookingStatus,event?:Event):Promise<void>{event?.stopPropagation();if(this.updatingId())return;if(status==="REJECTED"||status==="CANCELLED"){const confirmed=await this.confirmService.confirm({title:status==="REJECTED"?"Talebi Reddet":"Talebi İptal Et",message:status==="REJECTED"?"Bu talebi reddetmek istediğinize emin misiniz? Durum kalıcı veri kaynağına kaydedilecek ve yapılandırılmış bildirim kanalları kullanılacaktır.":"Bu talebi iptal etmek istediğinize emin misiniz? Durum kalıcı veri kaynağına kaydedilecektir."});if(!confirmed)return;}this.updatingId.set(id);try{const delivery=await this.bookingService.updateStatus(id,status);this.showDeliveryResult(status,delivery);if(status==="APPROVED"){const impact=this.bookingService.lastApprovalImpact();if(impact&&impact.conflictCount>0)this.toastService.show(`Onaylandı. ${impact.conflictCount} çakışan bekleyen talep korunuyor; ${impact.alternativeOfferCount} alternatif araç önerisi hazırlandı.`,"info");}}catch(error){console.error("Booking status update failed.",error);const detail=error instanceof Error?error.message:"";this.toastService.show(detail.includes("VEHICLE_UNAVAILABLE")?"Bu araç aynı zaman aralığında başka bir onaylı rezervasyona ait. Bekleyen talep değiştirilmedi.":"Durum güncellenemedi. Mevcut kayıt değiştirilmedi.","error");}finally{this.updatingId.set(null);}}

  async markAlternativeOffered(bookingId:string,alt:BookingAlternativeOffer,event?:Event):Promise<void>{event?.stopPropagation();if(this.updatingOfferId())return;this.updatingOfferId.set(alt.id);try{await this.bookingService.offerAlternative(bookingId,alt.id);this.toastService.show(`${alt.brand} ${alt.model} müşteriye önerildi olarak işaretlendi.`,"success");}catch(error){console.error("Alternative offer failed",error);this.toastService.show(error instanceof Error&&error.message.includes("ALTERNATIVE_NO_LONGER_AVAILABLE")?"Bu alternatif araç artık müsait değil. Liste yenileniyor.":"Alternatif öneri kaydedilemedi.","error");}finally{this.updatingOfferId.set(null);}}
  async offerViaWhatsApp(bookingId:string,phone:string,alt:BookingAlternativeOffer,event?:Event):Promise<void>{event?.stopPropagation();if(this.updatingOfferId())return;this.updatingOfferId.set(alt.id);try{await this.bookingService.offerAlternative(bookingId,alt.id);const digits=this.whatsAppDigits(phone);if(!digits)throw new Error("PHONE_INVALID");const message=`Merhaba, Alperler Rent A Car kiralama talebiniz için seçtiğiniz araç aynı zaman aralığında doldu. Sizi kaybetmemek için uygun bir alternatif hazırladık: ${alt.brand} ${alt.model}${alt.dailyPrice?` · ${new Intl.NumberFormat("tr-TR").format(alt.dailyPrice)} ₺/gün`:""}. Uygunsa rezervasyonunuzu bu araçla devam ettirebiliriz.`;window.open(`https://wa.me/${digits}?text=${encodeURIComponent(message)}`,"_blank","noopener,noreferrer");this.toastService.show("Alternatif kaydedildi; WhatsApp mesajı hazırlandı.","success");}catch(error){console.error("WhatsApp alternative offer failed",error);this.toastService.show("Alternatif öneri hazırlanamadı.","error");}finally{this.updatingOfferId.set(null);}}
  hasWhatsAppNumber(phone:string|undefined):boolean{return this.whatsAppDigits(phone||"").length>=10;}
  alternativePriceLabel(alt:BookingAlternativeOffer):string{if(alt.dailyPrice&&alt.dailyPrice>0)return`${new Intl.NumberFormat("tr-TR").format(alt.dailyPrice)} ₺/gün`;if(alt.hourlyPrice&&alt.hourlyPrice>0)return`${new Intl.NumberFormat("tr-TR").format(alt.hourlyPrice)} ₺/saat`;return"Fiyat araç kaydından doğrulanacak";}
  private whatsAppDigits(phone:string):string{return String(phone||"").replace(/\D/g,"").slice(0,20);}

  async deleteReservation(id:string,event?:Event):Promise<void>{event?.stopPropagation();if(this.updatingId())return;const confirmed=await this.confirmService.confirm({title:"Kaydı Kalıcı Olarak Sil",message:"Bu talebi kalıcı veri kaynağından tamamen silmek istediğinize emin misiniz? Operasyon geçmişini korumak istiyorsanız silmek yerine İptal seçeneğini kullanın."});if(!confirmed)return;this.updatingId.set(id);try{await this.bookingService.delete(id);this.expandedId.set(null);this.toastService.show("Rezervasyon kaydı silindi.","info");}catch(error){console.error("Booking delete failed.",error);this.toastService.show("Rezervasyon kaydı silinemedi.","error");}finally{this.updatingId.set(null);}}
  private showDeliveryResult(status:BookingStatus,delivery:NotificationDeliveryReport):void{const statusText=this.statusLabel(status),emailSent=delivery.email.state==="sent",smsSent=delivery.sms.state==="sent",notConfigured=delivery.email.state==="not_configured"||delivery.sms.state==="not_configured",failed=delivery.email.state==="failed"||delivery.sms.state==="failed";if(emailSent&&smsSent){this.toastService.show(`${statusText}. E-posta ve SMS gönderildi.`,"success");return;}if(emailSent||smsSent){this.toastService.show(`${statusText}. Durum kaydedildi; ${emailSent?"e-posta":"SMS"} gönderildi, diğer kanal tamamlanmadı.`,"info");return;}if(notConfigured){this.toastService.show(`${statusText}. Durum kaydedildi ancak bildirim sağlayıcılarından en az biri henüz yapılandırılmamış.`,"info");return;}if(failed){this.toastService.show(`${statusText}. Durum kaydedildi ancak otomatik müşteri bildirimi tamamlanamadı.`,"error");return;}this.toastService.show(`${statusText}. Durum başarıyla kaydedildi.`,"success");}
}
