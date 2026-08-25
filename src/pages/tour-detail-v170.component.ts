import { CommonModule, Location } from "@angular/common";
import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatIconModule } from "@angular/material/icon";
import { ActivatedRoute, Router } from "@angular/router";
import { AccessibleNativeDateComponent } from "../components/accessible-native-date.component";
import { TurkishCurrencyPipe } from "../pipes/turkish-currency.pipe";
import { CarService } from "../services/car.service";
import { TourBookingV170Result, TourBookingV170Service } from "../services/tour-booking-v170.service";
import { TourDemandV170, TourDemandV170Service } from "../services/tour-demand-v170.service";
import { TourPublicDataV170Service, TourV170 } from "../services/tour-public-data-v170.service";

type MediaItem = { kind:"IMAGE"|"VIDEO"; url:string; posterUrl?:string; title:string };

@Component({
  selector: "app-tour-detail-v170",
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, AccessibleNativeDateComponent, TurkishCurrencyPipe],
  template: `
    <main class="page">
      @if(tour();as item){
        <header class="topbar" [attr.inert]="reservationOpen()?'':null"><div class="bar"><button type="button" (click)="back()" aria-label="Turlar sayfasına dön"><mat-icon aria-hidden="true">arrow_back</mat-icon></button><div><p>ALPERLER TUR</p><h1>{{item.title}}</h1></div></div></header>

        <section class="gallery" [attr.aria-label]="item.title + ' fotoğraf ve video galerisi'">
          @if(activeMedia();as media){
            <div class="frame">
              @if(media.kind==='IMAGE'){<img [src]="media.url" [alt]="media.title" (error)="mediaFailed(media.url)" decoding="async" />}
              @else{<video [src]="media.url" [poster]="media.posterUrl||item.image" controls playsinline preload="metadata" [attr.aria-label]="media.title"></video>}
              <div class="shade"></div><div class="copy">@if(item.badge){<b>{{item.badge}}</b>}<p>{{item.duration}}</p><h2>{{item.title}}</h2><span>{{item.locationName||item.meetingPoint}}</span></div>
              <div class="nav"><span>{{currentMedia()+1}} / {{mediaItems().length}}</span>@if(mediaItems().length>1){<div><button type="button" (click)="previous()" aria-label="Önceki medya"><mat-icon aria-hidden="true">chevron_left</mat-icon></button><button type="button" (click)="next()" aria-label="Sonraki medya"><mat-icon aria-hidden="true">chevron_right</mat-icon></button></div>}</div>
            </div>
          }@else{<div class="gallery-empty"><mat-icon aria-hidden="true">perm_media</mat-icon><strong>Tur medyası bulunamadı</strong></div>}
        </section>

        <div class="layout">
          <div class="main">
            <section class="panel summary"><div class="summary-head"><div><p class="eyebrow">CANLI TUR KAYDI</p><h2>{{item.title}}</h2><span>{{item.description}}</span></div><div class="price"><small>Kişi başı</small><strong>{{item.price|turkishCurrency}}</strong></div></div><dl class="facts"><div><dt>Süre</dt><dd>{{item.duration}}</dd></div><div><dt>Önerilen grup</dt><dd>{{item.capacity ? item.capacity + ' kişi':'Belirtilmedi'}}</dd></div><div><dt>Buluşma</dt><dd>{{item.meetingPoint}}</dd></div><div><dt>Konum</dt><dd>{{item.locationName||item.meetingPoint}}</dd></div></dl></section>

            @if(itinerary().length){<section class="panel"><header class="section"><p>ROTA</p><h2>Tur Programı</h2><span>{{itinerary().length}} program adımı</span></header><ol class="itinerary">@for(row of itinerary();track $index){<li><b>{{$index+1}}</b><span>{{row}}</span></li>}</ol></section>}

            <section class="panel"><header class="section"><p>KAPSAM</p><h2>Neler dahil?</h2></header><div class="scope">@if(item.highlights?.length){<div><h3>Öne çıkanlar</h3><ul>@for(value of item.highlights;track value){<li><mat-icon aria-hidden="true">star</mat-icon>{{value}}</li>}</ul></div>}@if(item.includedItems?.length){<div><h3>Dahil</h3><ul>@for(value of item.includedItems;track value){<li><mat-icon aria-hidden="true">check_circle</mat-icon>{{value}}</li>}</ul></div>}@if(item.excludedItems?.length){<div><h3>Hariç</h3><ul>@for(value of item.excludedItems;track value){<li><mat-icon aria-hidden="true">remove_circle_outline</mat-icon>{{value}}</li>}</ul></div>}</div></section>

            @if(item.mapUrl){<section class="panel map"><header class="section"><p>KONUM</p><h2>Buluşma ve rota</h2></header><a [href]="item.mapUrl" target="_blank" rel="noopener noreferrer"><mat-icon aria-hidden="true">map</mat-icon>Haritada aç</a></section>}
          </div>

          <aside class="booking">
            <p>TARİHLİ REZERVASYON</p><h2>Ne zaman geleceksiniz?</h2><span class="intro">Rezervasyon tarihi zorunludur. Aynı tarihte gelen diğer talepler yeni rezervasyonu kapatmaz; ekip talep hacmine göre operasyon planlar.</span>
            <app-accessible-native-date label="Tur tarihi" [value]="tourDate" [min]="today" (valueChange)="onDateChange($event)" />
            <div class="demand">
              @if(demandLoading()){<mat-icon aria-hidden="true">sync</mat-icon><div><strong>Güncel talep okunuyor</strong><span>Seçtiğiniz tarih kontrol ediliyor.</span></div>}
              @else if(demand();as live){<mat-icon aria-hidden="true">event_available</mat-icon><div><strong>Rezervasyon alınıyor</strong><span>{{live.approvedReservations}} onaylı rezervasyon · {{live.pendingReservations}} bekleyen talep · toplam {{live.approvedPeople + live.pendingPeople}} kişi talebi</span></div>}
              @else if(tourDate){<mat-icon aria-hidden="true">event_available</mat-icon><div><strong>Rezervasyon talebi oluşturabilirsiniz</strong><span>Talep metriği görüntülenemese bile sunucu rezervasyonu yeniden doğrular.</span></div>}
              @else{<mat-icon aria-hidden="true">calendar_month</mat-icon><div><strong>Tarih seçin</strong><span>Müşterinin geleceği tarih rezervasyona kaydedilir.</span></div>}
            </div>
            @if(demandError()){<p class="notice">{{demandError()}}</p>}

            <label class="people"><span>Kişi sayısı</span><div><button type="button" (click)="decrease()" aria-label="Kişi sayısını azalt"><mat-icon aria-hidden="true">remove</mat-icon></button><input type="number" min="1" [ngModel]="personCount()" (ngModelChange)="setPeople($event)" aria-label="Rezervasyon kişi sayısı" /><button type="button" (click)="increase()" aria-label="Kişi sayısını artır"><mat-icon aria-hidden="true">add</mat-icon></button></div><small>Önerilen grup büyüklüğü: {{item.capacity||'Belirtilmedi'}}. Bu değer rezervasyon limiti değildir.</small></label>
            <div class="total"><span>Liste fiyatıyla tahmini toplam</span><strong>{{estimatedTotal()|turkishCurrency}}</strong><small>Kampanya ve sadakat avantajı sunucuda kesin hesaplanır.</small></div>
            <button type="button" class="reserve" (click)="openReservation()" [disabled]="!canReserve()">{{canReserve()?'Rezervasyon Talebi Oluştur':'Önce tarih seçin'}}</button>
            <button type="button" class="whatsapp" (click)="whatsapp()"><mat-icon aria-hidden="true">chat</mat-icon>WhatsApp’tan Sor</button>
          </aside>
        </div>

        @if(reservationOpen()){
          <div class="overlay" role="dialog" aria-modal="true" aria-labelledby="booking-title-v170"><div class="modal">
            <header><div><p>REZERVASYON</p><h2 id="booking-title-v170">{{item.title}}</h2></div><button type="button" (click)="closeReservation()" [disabled]="submitting()" aria-label="Rezervasyon penceresini kapat"><mat-icon aria-hidden="true">close</mat-icon></button></header>
            @if(success();as saved){<section class="success" role="status"><mat-icon aria-hidden="true">check_circle</mat-icon><h3>Talebiniz kaydedildi</h3><strong>{{saved.id}}</strong><p>{{formattedDate()}} · {{saved.personCount|number:'1.0-0'}} kişi</p><span>Talep PENDING olarak yönetim paneline düştü. Aynı tarih için başka müşteriler de rezervasyon oluşturabilir.</span><button type="button" (click)="closeReservation()">Tura dön</button></section>}
            @else{
              <section class="form"><div class="plan"><span>Tur</span><strong>{{item.title}}</strong><span>Tarih</span><strong>{{formattedDate()}}</strong><span>Kişi</span><strong>{{personCount()|number:'1.0-0'}}</strong></div>
                <div class="fields"><label><span>Ad</span><input [(ngModel)]="firstName" autocomplete="given-name" /></label><label><span>Soyad</span><input [(ngModel)]="lastName" autocomplete="family-name" /></label><label><span>Telefon</span><input [(ngModel)]="phone" type="tel" autocomplete="tel" /></label><label><span>E-posta</span><input [(ngModel)]="email" type="email" autocomplete="email" /></label></div><label class="note"><span>Not</span><textarea [(ngModel)]="notes" rows="3" placeholder="Özel istek, çocuk sayısı, grup bilgisi..."></textarea></label>
                @if(formError()){<p class="error" role="alert">{{formError()}}</p>}
                <div class="review"><span>Liste toplamı</span><strong>{{estimatedTotal()|turkishCurrency}}</strong></div>
                <button type="button" class="send" (click)="submit()" [disabled]="submitting()">{{submitting()?'Kaydediliyor...':'Talebi Gönder'}}</button>
              </section>
            }
          </div></div>
        }
      }@else if(loading()){<section class="state"><div class="spinner"></div><strong>Tur yükleniyor</strong></section>}@else{<section class="state"><mat-icon aria-hidden="true">error_outline</mat-icon><strong>Tur bulunamadı</strong><span>{{loadError()}}</span><button type="button" (click)="reload()">Tekrar dene</button></section>}
    </main>
  `,
  styles: [`
    :host{display:block;background:#050b18;color:#fff}.page{min-height:100dvh;background:#050b18;padding-bottom:70px;font-family:Inter,system-ui,sans-serif}.topbar{position:sticky;top:0;z-index:70;border-bottom:1px solid #1e293b;background:rgba(5,11,24,.96);backdrop-filter:blur(15px)}.bar{display:flex;width:min(100% - 24px,1180px);min-height:70px;margin:auto;align-items:center;gap:10px}.bar>button,.nav button{display:grid;width:44px;height:44px;place-items:center;border:1px solid #26354d;border-radius:14px;background:#0d1729;color:#fff}.bar p,.eyebrow,.section p,.booking>p,.modal header p{margin:0;color:#60a5fa;font-size:9px;font-weight:950;letter-spacing:.15em}.bar h1{margin:3px 0 0;max-width:75vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:17px}.gallery{background:#020617}.frame{position:relative;width:min(100%,1180px);margin:auto;aspect-ratio:16/10;overflow:hidden}.frame>img,.frame>video{width:100%;height:100%;object-fit:cover;background:#020617}.shade{pointer-events:none;position:absolute;inset:0;background:linear-gradient(to top,rgba(2,6,23,.9),transparent 60%)}.copy{pointer-events:none;position:absolute;left:18px;right:18px;bottom:65px}.copy b{display:inline-block;border-radius:999px;background:#fbbf24;padding:5px 8px;color:#451a03;font-size:8px}.copy p{margin:8px 0 0;color:#fbbf24;font-size:9px;font-weight:900}.copy h2{margin:4px 0 0;font:900 clamp(28px,7vw,52px)/1 Georgia,serif}.copy span{display:block;margin-top:7px;color:#dbeafe;font-size:10px}.nav{position:absolute;left:15px;right:15px;bottom:14px;display:flex;align-items:center;justify-content:space-between}.nav>span{border-radius:999px;background:rgba(2,6,23,.8);padding:7px 10px;font-size:9px;font-weight:900}.nav div{display:flex;gap:5px}.gallery-empty{display:grid;min-height:320px;place-items:center;background:#0d1729;color:#64748b}.layout{display:grid;width:min(100% - 28px,1180px);margin:22px auto 0;gap:18px}.main{display:grid;min-width:0;gap:16px}.panel,.booking{border:1px solid #26354d;border-radius:22px;background:#0c1526;padding:18px}.summary-head{display:grid;gap:15px}.summary h2,.section h2,.booking h2{margin:5px 0 0;font-size:22px}.summary-head>div>span{display:block;margin-top:9px;color:#94a3b8;font-size:11px;line-height:1.7}.price small{display:block;color:#8190a6;font-size:8px;text-transform:uppercase}.price strong{display:block;margin-top:3px;font-size:24px}.facts{display:grid;gap:8px;margin:16px 0 0}.facts div{border:1px solid #26354d;border-radius:12px;background:#101c30;padding:10px}.facts dt{color:#8190a6;font-size:8px;font-weight:850;text-transform:uppercase}.facts dd{margin:4px 0 0;font-size:11px;font-weight:800}.section span{display:block;margin-top:5px;color:#8190a6;font-size:9px}.itinerary{display:grid;gap:9px;margin:14px 0 0;padding:0;list-style:none}.itinerary li{display:grid;grid-template-columns:31px 1fr;gap:10px}.itinerary b{display:grid;width:31px;height:31px;place-items:center;border-radius:50%;background:#1d4ed8;font-size:10px}.itinerary span{border-left:1px solid #334155;padding:6px 0 11px 11px;color:#cbd5e1;font-size:11px;line-height:1.6}.scope{display:grid;gap:12px;margin-top:14px}.scope>div{border:1px solid #26354d;border-radius:15px;padding:12px}.scope h3{margin:0 0 8px}.scope ul{display:grid;gap:7px;margin:0;padding:0;list-style:none}.scope li{display:flex;gap:6px;color:#cbd5e1;font-size:10px}.scope mat-icon{width:16px;height:16px;font-size:16px;color:#60a5fa}.map a{display:inline-flex;align-items:center;gap:6px;margin-top:12px;border-radius:11px;background:#1d4ed8;padding:11px 14px;color:#fff;text-decoration:none;font-weight:850}.booking{align-self:start}.booking .intro{display:block;margin-top:8px;color:#94a3b8;font-size:10px;line-height:1.6}.demand{display:flex;align-items:flex-start;gap:9px;margin-top:13px;border:1px solid #1d4ed8;border-radius:14px;background:#0d1c35;padding:11px}.demand mat-icon{color:#60a5fa}.demand strong,.demand span{display:block}.demand strong{font-size:11px}.demand span{margin-top:3px;color:#94a3b8;font-size:9px;line-height:1.5}.notice,.error{border-radius:11px;background:#451a03;padding:9px;color:#fde68a;font-size:9px}.people{display:block;margin-top:13px}.people>span{font-size:10px;font-weight:900}.people>div{display:grid;grid-template-columns:46px 1fr 46px;gap:6px;margin-top:6px}.people button{display:grid;min-height:46px;place-items:center;border:1px solid #334155;border-radius:11px;background:#111c30;color:#fff}.people input{min-width:0;border:1px solid #334155;border-radius:11px;background:#111c30;color:#fff;text-align:center;font-size:17px;font-weight:900}.people small{display:block;margin-top:6px;color:#8190a6;font-size:8px;line-height:1.5}.total{margin-top:13px;border-top:1px solid #26354d;padding-top:12px}.total span,.total small{display:block;color:#8190a6;font-size:8px}.total strong{display:block;margin:3px 0;font-size:24px}.reserve,.whatsapp,.send{width:100%;min-height:48px;margin-top:10px;border:0;border-radius:12px;font-weight:950}.reserve,.send{background:#2563eb;color:#fff}.reserve:disabled,.send:disabled{opacity:.45}.whatsapp{display:flex;align-items:center;justify-content:center;gap:5px;background:#0f766e;color:#fff}.overlay{position:fixed;inset:0;z-index:100;display:grid;place-items:center;background:rgba(2,6,23,.84);padding:14px}.modal{width:min(100%,620px);max-height:92dvh;overflow:auto;border-radius:22px;background:#fff;color:#0f172a;box-shadow:0 28px 80px rgba(0,0,0,.45)}.modal header{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e2e8f0;padding:17px}.modal header h2{margin:4px 0 0}.modal header button{display:grid;width:42px;height:42px;place-items:center;border:0;border-radius:11px;background:#f1f5f9}.form,.success{padding:18px}.plan{display:grid;grid-template-columns:auto 1fr;gap:5px 12px;border-radius:14px;background:#f8fafc;padding:12px;font-size:10px}.plan span{color:#64748b}.fields{display:grid;gap:10px;margin-top:13px}.fields label,.note{display:grid;gap:5px;color:#475569;font-size:9px;font-weight:850}.fields input,.note textarea{width:100%;min-height:44px;border:1px solid #cbd5e1;border-radius:11px;padding:8px 10px}.note{margin-top:10px}.review{display:flex;align-items:center;justify-content:space-between;margin-top:12px;border-top:1px solid #e2e8f0;padding-top:12px}.success{text-align:center}.success>mat-icon{width:52px;height:52px;font-size:52px;color:#16a34a}.success strong{display:block;margin-top:6px}.success span{display:block;margin-top:8px;color:#64748b;font-size:10px;line-height:1.6}.success button,.state button{min-height:44px;border:0;border-radius:11px;background:#0f172a;padding:0 14px;color:#fff;font-weight:900}.state{display:grid;min-height:70dvh;place-items:center;text-align:center;color:#94a3b8}.spinner{width:38px;height:38px;border:3px solid #334155;border-top-color:#60a5fa;border-radius:50%;animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}@media(min-width:700px){.facts{grid-template-columns:repeat(2,1fr)}.scope{grid-template-columns:repeat(3,1fr)}.fields{grid-template-columns:1fr 1fr}.summary-head{grid-template-columns:1fr auto}}@media(min-width:980px){.layout{grid-template-columns:minmax(0,1fr) 350px}.booking{position:sticky;top:92px}}
  `],
})
export class TourDetailV170Component implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly data = inject(TourPublicDataV170Service);
  private readonly demandService = inject(TourDemandV170Service);
  private readonly bookingService = inject(TourBookingV170Service);
  private readonly carService = inject(CarService);
  readonly tour = signal<TourV170|null>(null);
  readonly loading = signal(true);
  readonly loadError = signal("");
  readonly demand = signal<TourDemandV170|null>(null);
  readonly demandLoading = signal(false);
  readonly demandError = signal("");
  readonly personCount = signal(1);
  readonly currentMedia = signal(0);
  readonly failedMedia = signal<string[]>([]);
  readonly reservationOpen = signal(false);
  readonly submitting = signal(false);
  readonly formError = signal("");
  readonly success = signal<TourBookingV170Result|null>(null);
  readonly today = this.localDate(new Date());
  tourDate = "";
  firstName = ""; lastName = ""; phone = ""; email = ""; notes = "";

  readonly mediaItems = computed<MediaItem[]>(() => {
    const item=this.tour(); if(!item)return[];
    const failed=this.failedMedia();
    const images=(item.images||[]).filter((url)=>url&&!failed.includes(url)).map((url)=>({kind:"IMAGE" as const,url,title:`${item.title} tur görseli`}));
    const videos=(item.videos||[]).filter((row)=>row?.url&&!failed.includes(row.url)).map((row)=>({kind:"VIDEO" as const,url:row.url,posterUrl:row.posterUrl,title:row.title||`${item.title} tur videosu`}));
    return [...images,...videos];
  });
  readonly activeMedia = computed(() => {const list=this.mediaItems();return list.length?list[Math.min(this.currentMedia(),list.length-1)]:null;});
  readonly itinerary = computed(() => (this.tour()?.itinerary||[]).map((value,index)=>this.itineraryText(value,index)).filter(Boolean));
  readonly estimatedTotal = computed(() => Number(this.tour()?.price||0)*this.personCount());
  readonly canReserve = computed(() => Boolean(this.tourDate>=this.today && this.personCount()>=1 && this.tour()?.publicationStatus==="PUBLISHED" && this.tour()?.isAvailable!==false));

  ngOnInit(): void { void this.reload(); }
  async reload(): Promise<void>{this.loading.set(true);this.loadError.set("");try{const id=this.route.snapshot.paramMap.get("id")||"";const item=await this.data.load(id);this.tour.set(item);this.currentMedia.set(0);this.failedMedia.set([]);}catch(error){this.tour.set(null);this.loadError.set(error instanceof Error?error.message:"Tur yüklenemedi.");}finally{this.loading.set(false);}}
  async onDateChange(value:string):Promise<void>{this.tourDate=value;this.demand.set(null);this.demandError.set("");if(!value||value<this.today)return;const item=this.tour();if(!item)return;this.demandLoading.set(true);try{this.demand.set(await this.demandService.check(item.cloudId||item.cloudSlug||item.id,value));}catch(error){this.demandError.set(this.cleanError(error));}finally{this.demandLoading.set(false);}}
  setPeople(value:unknown):void{const n=Math.floor(Number(value));this.personCount.set(Number.isFinite(n)&&n>=1?Math.min(n,1_000_000_000):1);}
  increase():void{this.personCount.update((value)=>Math.min(1_000_000_000,value+1));}
  decrease():void{this.personCount.update((value)=>Math.max(1,value-1));}
  previous():void{const total=this.mediaItems().length;if(total)this.currentMedia.update((value)=>(value-1+total)%total);}
  next():void{const total=this.mediaItems().length;if(total)this.currentMedia.update((value)=>(value+1)%total);}
  mediaFailed(url:string):void{this.failedMedia.update((rows)=>rows.includes(url)?rows:[...rows,url]);this.currentMedia.set(0);}
  openReservation():void{if(!this.canReserve())return;this.formError.set("");this.success.set(null);this.reservationOpen.set(true);}
  closeReservation():void{if(!this.submitting())this.reservationOpen.set(false);}
  async submit():Promise<void>{const item=this.tour();if(!item||this.submitting()||!this.canReserve())return;const name=`${this.firstName.trim()} ${this.lastName.trim()}`.trim();if(!this.firstName.trim()||!this.lastName.trim()){this.formError.set("Ad ve soyad zorunlu.");return;}if(!/^[+0-9()\s-]{7,24}$/.test(this.phone.trim())){this.formError.set("Geçerli bir telefon numarası girin.");return;}if(this.email.trim()&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim())){this.formError.set("E-posta adresi geçerli değil.");return;}this.submitting.set(true);this.formError.set("");try{const saved=await this.bookingService.create({itemId:String(item.cloudId||item.id),image:item.image,startDate:this.tourDate,personCount:this.personCount(),customerName:name,customerEmail:this.email.trim()||undefined,customerPhone:this.phone.trim(),notes:this.notes.trim()||undefined});this.success.set(saved);const refreshed=await this.demandService.check(item.cloudId||item.cloudSlug||item.id,this.tourDate).catch(()=>null);if(refreshed)this.demand.set(refreshed);}catch(error){this.formError.set(this.cleanError(error));}finally{this.submitting.set(false);}}
  formattedDate():string{if(!this.tourDate)return"Tarih seçilmedi";const date=new Date(`${this.tourDate}T12:00:00`);return Number.isNaN(date.getTime())?this.tourDate:date.toLocaleDateString("tr-TR",{day:"2-digit",month:"long",year:"numeric"});}
  whatsapp():void{const item=this.tour();if(!item||typeof window==="undefined")return;const raw=String(this.carService.getConfig()().whatsapp||"").replace(/\D/g,"");if(!raw)return;const message=`${item.title} hakkında bilgi almak istiyorum.${this.tourDate?` Tarih: ${this.tourDate}.`:""} Kişi: ${this.personCount()}.`;window.open(`https://wa.me/${raw}?text=${encodeURIComponent(message)}`,"_blank","noopener,noreferrer");}
  back():void{if(typeof window!=="undefined"&&window.history.length>1)this.location.back();else void this.router.navigate(["/tours"]);}
  private itineraryText(value:unknown,index:number):string{if(typeof value==="string")return value.trim();if(value&&typeof value==="object"){const row=value as Record<string,unknown>;return String(row["title"]||row["name"]||row["description"]||row["label"]||`Program adımı ${index+1}`).trim();}return"";}
  private localDate(date:Date):string{const pad=(value:number)=>String(value).padStart(2,"0");return`${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;}
  private cleanError(error:unknown):string{const message=error instanceof Error?error.message:"İşlem tamamlanamadı.";const parts=message.split(":");return parts.length>1?parts.slice(1).join(":"):message;}
}
