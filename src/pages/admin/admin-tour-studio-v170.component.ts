import { CommonModule } from "@angular/common";
import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatIconModule } from "@angular/material/icon";
import { AdminManagementService } from "../../services/admin-management.service";
import { CatalogAdminEditorService, TourAdminRecord } from "../../services/catalog-admin-editor.service";
import { CatalogMediaItem, CatalogMediaService } from "../../services/catalog-media.service";
import { ToastService } from "../../services/toast.service";

@Component({
  selector: "app-admin-tour-studio-v170",
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <main class="workspace">
      <header class="hero"><p>V170 TUR STÜDYOSU</p><h1>Tur kartı, detay, medya ve rezervasyon gerçeği</h1><span>Vitrinde veya detayda görünen tüm tur verileri aynı canonical kayıttan yönetilir. Kapasite operasyon için önerilen grup büyüklüğüdür; rezervasyonları durdurmaz. Fotoğraf ve videolar doğrudan Alperler Auto medya deposuna yüklenir.</span></header>
      @if(error()){<div class="alert" role="alert">{{error()}}</div>}
      <div class="layout">
        <aside class="list">
          <div class="list-head"><strong>{{tours().length}} tur</strong><button type="button" (click)="reload()" [disabled]="loading()" aria-label="Turları yenile"><mat-icon aria-hidden="true">refresh</mat-icon></button></div>
          @for(item of tours();track item.id){<button type="button" class="row" [class.active]="selected()?.id===item.id" (click)="select(item)"><strong>{{item.title}}</strong><span>{{item.duration||'Süre eksik'}} · {{item.locationName||'Konum eksik'}}</span><em [class.ready]="ready(item)">{{ready(item)?'HAZIR':'EKSİK'}}</em></button>}@empty{<div class="empty">Tur kaydı bulunamadı.</div>}
        </aside>

        <section class="editor">
          @if(selected();as tour){
            <header class="editor-head"><div><p>{{tour.publicationStatus}}</p><h2>{{tour.title}}</h2><span>{{missing(tour).length ? missing(tour).length + ' alan tamamlanmalı' : 'Kart, detay ve yayın verisi hazır'}}</span></div><button type="button" (click)="save()" [disabled]="saving()">{{saving()?'Kaydediliyor...':'Turu Kaydet'}}</button></header>
            <div class="readiness" [class.good]="ready(tour)"><mat-icon aria-hidden="true">{{ready(tour)?'verified':'warning'}}</mat-icon><div><strong>{{ready(tour)?'Dinamik tur kaydı yayına hazır':'Eksik alanlar var'}}</strong><span>{{missing(tour).join(' · ')||'Kart, detay, rota, fiyat ve medya gereksinimleri tamam.'}}</span></div></div>

            <div class="grid">
              <section class="panel"><header><h3>Kartta görünen bilgiler</h3><p>Tur vitrini bu alanlardan beslenir.</p></header><div class="fields">
                <label class="wide"><span>Tur adı</span><input [(ngModel)]="tour.title" /></label>
                <label><span>Rozet</span><input [ngModel]="meta(tour,'badge')" (ngModelChange)="setMeta(tour,'badge',$event)" placeholder="POPÜLER, YENİ, PREMIUM..." /></label>
                <label><span>Kategori</span><input [(ngModel)]="tour.category" placeholder="Doğa, kültür, macera..." /></label>
                <label><span>Kişi başı fiyat TL</span><input [(ngModel)]="tour.pricePerPerson" type="number" min="0" /></label>
                <label><span>Süre</span><input [(ngModel)]="tour.duration" placeholder="1 Gün, 2 Gün 1 Gece..." /></label>
                <label><span>Önerilen grup büyüklüğü</span><input [(ngModel)]="tour.capacity" type="number" min="1" max="1000" /></label>
                <label><span>Konum</span><input [(ngModel)]="tour.locationName" /></label>
                <label><span>Buluşma noktası</span><input [(ngModel)]="tour.meetingPoint" /></label>
                <label class="wide"><span>Kısa kart açıklaması</span><textarea [(ngModel)]="tour.shortDescription" rows="3"></textarea></label>
                <label class="check"><input type="checkbox" [(ngModel)]="tour.isFeatured" /> Öne çıkan tur</label>
              </div><p class="policy"><strong>Esnek talep:</strong> {{tour.capacity||0}} kişi yalnız önerilen operasyon grubudur. Aynı tarihe gelen rezervasyon sayısını veya müşteri kişi sayısını sınırlandırmaz.</p></section>

              <section class="panel"><header><h3>Tur detay sayfası</h3><p>Müşterinin satın alma kararını verdiği ayrıntılar.</p></header>
                <label class="textarea"><span>Detaylı açıklama</span><textarea [(ngModel)]="tour.description" rows="7"></textarea></label>
                <label class="textarea"><span>Öne çıkanlar, satır başına bir</span><textarea [ngModel]="highlights(tour).join('\n')" (ngModelChange)="setHighlights(tour,$event)" rows="5"></textarea></label>
                <label class="textarea"><span>Tur programı / rota, satır başına bir</span><textarea [ngModel]="itineraryText(tour)" (ngModelChange)="setItinerary(tour,$event)" rows="9"></textarea></label>
              </section>

              <section class="panel"><header><h3>Dahil ve hariç</h3><p>Fiyatın tam olarak neyi kapsadığı.</p></header><div class="scope"><label class="textarea"><span>Dahil olanlar</span><textarea [ngModel]="tour.includedItems.join('\n')" (ngModelChange)="tour.includedItems=splitLines($event)" rows="7"></textarea></label><label class="textarea"><span>Hariç olanlar</span><textarea [ngModel]="tour.excludedItems.join('\n')" (ngModelChange)="tour.excludedItems=splitLines($event)" rows="7"></textarea></label></div></section>

              <section class="panel"><header><h3>Konum, şube ve kaynak</h3><p>Operasyon ve veri doğruluğu.</p></header><div class="fields">
                <label><span>Şube</span><select [(ngModel)]="tour.branchId"><option [ngValue]="undefined">Şube seçin</option>@for(branch of branches();track branch.id){<option [value]="branch.id">{{branch.name}} · {{branch.city}}{{branch.district?' / '+branch.district:''}}</option>}</select></label>
                <label><span>SEO adresi</span><input [(ngModel)]="tour.seoSlug" /></label>
                <label><span>Enlem</span><input [(ngModel)]="tour.latitude" type="number" step="any" /></label>
                <label><span>Boylam</span><input [(ngModel)]="tour.longitude" type="number" step="any" /></label>
                <label class="wide"><span>Harita URL</span><input [(ngModel)]="tour.mapUrl" type="url" /></label>
                <label><span>Kaynak adı</span><input [(ngModel)]="tour.sourceName" /></label>
                <label><span>Kaynak URL</span><input [(ngModel)]="tour.sourceUrl" type="url" /></label>
                <label><span>Veri doğrulama</span><select [(ngModel)]="tour.dataQualityStatus"><option value="BUSINESS_VERIFIED">İşletme doğruladı</option><option value="RESEARCHED">Araştırma ile doğrulandı</option><option value="UNVERIFIED">Kontrol edilmedi</option></select></label>
                <label><span>Yayın durumu</span><select [(ngModel)]="tour.publicationStatus"><option value="DRAFT">Taslak</option><option value="SCHEDULED">Planlı</option><option value="PUBLISHED">Yayında</option><option value="ARCHIVED">Arşiv</option></select></label>
                @if(tour.publicationStatus==='SCHEDULED'){<label class="wide"><span>Planlanan yayın tarihi</span><input [(ngModel)]="tour.scheduledAt" type="datetime-local" /></label>}
              </div></section>

              <section class="panel media-panel"><header><h3>Fotoğraf & Video</h3><p>Kart kapağı, detay galerisi ve videolar aynı medya kayıtlarından gelir.</p></header>
                <label class="upload"><input type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm" (change)="upload($event,tour.id)" /><mat-icon aria-hidden="true">cloud_upload</mat-icon><strong>{{uploading()?'Yükleniyor %'+mediaService.uploadProgress():'Fotoğraf / Video Seç ve Yükle'}}</strong><span>Birden fazla dosya seçebilirsiniz. İlk görsel otomatik kapak olabilir.</span></label>
                <div class="media-list">@for(item of media();track item.id){<article>
                  <div class="thumb">@if(item.kind==='IMAGE'){<img [src]="item.url" [alt]="item.altText" />}@else{<div><mat-icon aria-hidden="true">play_circle</mat-icon><b>VIDEO</b></div>}</div>
                  <div class="media-fields"><label><span>Alt metin / video başlığı</span><input [(ngModel)]="item.altText" /></label><label><span>Sıra</span><input [(ngModel)]="item.sortOrder" type="number" min="0" /></label>@if(item.kind==='VIDEO'){<label class="wide"><span>Video poster URL</span><input [(ngModel)]="item.posterUrl" type="url" placeholder="https://..." /></label>}<label class="check"><input type="checkbox" [(ngModel)]="item.isActive" /> Aktif</label></div>
                  <div class="media-actions">@if(item.kind==='IMAGE'){<button type="button" (click)="cover(item)" [disabled]="item.isCover">{{item.isCover?'KAPAK':'Kapak Yap'}}</button>}<button type="button" (click)="saveMedia(item)">Medya Bilgisini Kaydet</button><button type="button" class="danger" (click)="remove(item)">Kaldır</button></div>
                </article>}@empty{<div class="empty">Bu tura henüz fotoğraf veya video yüklenmedi.</div>}</div>
              </section>

              <section class="panel preview"><header><h3>Canlı kart önizlemesi</h3><p>Müşteri vitrininin karar alanları.</p></header><div class="preview-card"><div class="preview-media">@if(coverUrl()){<img [src]="coverUrl()" [alt]="tour.title" />}@else{<span>Kapak görseli yok</span>}@if(meta(tour,'badge')){<b>{{meta(tour,'badge')}}</b>}@if(videoCount()){<em>{{videoCount()}} video</em>}</div><div class="preview-body"><small>{{tour.duration}} · {{tour.locationName}}</small><h4>{{tour.title}}</h4><p>{{tour.shortDescription||tour.description}}</p><span>Önerilen grup: {{tour.capacity||'Belirtilmedi'}}</span><strong>{{tour.pricePerPerson|number:'1.0-0'}} TL / kişi</strong></div></div></section>
            </div>
          }@else{<div class="choose"><mat-icon aria-hidden="true">route</mat-icon><h2>Bir tur seçin</h2><p>Tüm kart, detay, medya ve yayın alanlarını yönetmek için soldan tur seçin.</p></div>}
        </section>
      </div>
    </main>
  `,
  styles: [`
    :host{display:block;background:#f8fafc;color:#0f172a}.workspace{min-height:100vh;padding:14px}.hero{max-width:1500px;margin:0 auto 15px;border-radius:24px;background:#0f172a;padding:22px;color:#fff}.hero p,.editor-head p{margin:0;color:#a78bfa;font-size:9px;font-weight:950;letter-spacing:.16em}.hero h1{margin:5px 0 0;font-size:clamp(25px,5vw,40px)}.hero span{display:block;max-width:980px;margin-top:8px;color:#cbd5e1;font-size:11px;line-height:1.65}.alert{max-width:1500px;margin:0 auto 12px;border:1px solid #fecaca;border-radius:13px;background:#fff1f2;padding:11px;color:#9f1239;font-weight:800}.layout{display:grid;max-width:1500px;margin:auto;gap:14px}.list,.editor{border:1px solid #e2e8f0;border-radius:21px;background:#fff}.list{padding:9px}.list-head{display:flex;align-items:center;justify-content:space-between;padding:4px 4px 9px}.list-head button{display:grid;width:40px;height:40px;place-items:center;border:0;border-radius:10px;background:#f1f5f9}.row{display:grid;position:relative;width:100%;gap:4px;margin-top:5px;border:1px solid #e2e8f0;border-radius:13px;background:#fff;padding:10px 60px 10px 10px;text-align:left}.row.active{border-color:#7c3aed;background:#f5f3ff}.row strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px}.row span{color:#64748b;font-size:8px}.row em{position:absolute;right:7px;top:50%;transform:translateY(-50%);border-radius:999px;background:#fef3c7;padding:5px 7px;color:#92400e;font-size:7px;font-style:normal;font-weight:950}.row em.ready{background:#dcfce7;color:#166534}.editor{min-width:0;padding:13px}.editor-head{display:flex;flex-direction:column;gap:10px;border-bottom:1px solid #e2e8f0;padding-bottom:13px}.editor-head h2{margin:3px 0 0}.editor-head span{color:#64748b;font-size:9px}.editor-head button{min-height:45px;border:0;border-radius:11px;background:#7c3aed;padding:0 16px;color:#fff;font-weight:900}.readiness{display:flex;gap:9px;margin-top:12px;border:1px solid #fcd34d;border-radius:14px;background:#fffbeb;padding:11px;color:#92400e}.readiness.good{border-color:#86efac;background:#f0fdf4;color:#166534}.readiness strong,.readiness span{display:block}.readiness strong{font-size:10px}.readiness span{margin-top:2px;font-size:8px;line-height:1.5}.grid{display:grid;gap:13px;margin-top:13px}.panel{min-width:0;border:1px solid #e2e8f0;border-radius:17px;padding:13px}.panel header{margin-bottom:11px}.panel h3{margin:0;font-size:14px}.panel header p{margin:3px 0 0;color:#64748b;font-size:8px;line-height:1.5}.fields{display:grid;gap:9px}.fields label,.textarea,.media-fields label{display:grid;gap:4px;color:#475569;font-size:8px;font-weight:850}.fields input,.fields select,.fields textarea,.textarea textarea,.media-fields input{width:100%;min-height:43px;border:1px solid #cbd5e1;border-radius:10px;background:#f8fafc;padding:8px 9px;color:#0f172a;outline:none}.textarea{margin-top:8px}.textarea textarea{resize:vertical;line-height:1.5}.check{display:flex!important;min-height:43px;align-items:center;gap:7px;border-radius:10px;background:#f8fafc;padding:8px}.check input{width:auto!important;min-height:auto!important}.policy{margin:10px 0 0;border-radius:11px;background:#eff6ff;padding:9px;color:#1e40af;font-size:8px;line-height:1.5}.scope{display:grid;gap:9px}.upload{display:grid;min-height:120px;cursor:pointer;place-items:center;border:2px dashed #93c5fd;border-radius:14px;background:#eff6ff;padding:16px;text-align:center;color:#1d4ed8}.upload input{position:absolute;width:1px;height:1px;opacity:0}.upload mat-icon{width:36px;height:36px;font-size:36px}.upload strong,.upload span{display:block}.upload span{color:#64748b;font-size:8px}.media-list{display:grid;gap:9px;margin-top:12px}.media-list article{display:grid;gap:9px;border:1px solid #e2e8f0;border-radius:14px;padding:9px}.thumb{height:120px;overflow:hidden;border-radius:11px;background:#f1f5f9}.thumb img{width:100%;height:100%;object-fit:cover}.thumb>div{display:grid;height:100%;place-items:center;color:#7c3aed}.media-fields{display:grid;gap:7px}.media-actions{display:flex;flex-wrap:wrap;gap:6px}.media-actions button{min-height:38px;border:0;border-radius:9px;background:#eef2ff;padding:0 10px;color:#4338ca;font-size:8px;font-weight:900}.media-actions .danger{background:#fff1f2;color:#be123c}.preview-card{overflow:hidden;border:1px solid #e2e8f0;border-radius:16px;background:#0c1526;color:#fff}.preview-media{position:relative;aspect-ratio:16/9;background:#1e293b}.preview-media img{width:100%;height:100%;object-fit:cover}.preview-media>span{display:grid;height:100%;place-items:center;color:#94a3b8}.preview-media b,.preview-media em{position:absolute;top:8px;border-radius:999px;padding:5px 7px;font-size:7px}.preview-media b{left:8px;background:#fbbf24;color:#451a03}.preview-media em{right:8px;background:rgba(2,6,23,.8);font-style:normal}.preview-body{padding:12px}.preview-body small,.preview-body span{display:block;color:#94a3b8;font-size:8px}.preview-body h4{margin:5px 0 0}.preview-body p{color:#cbd5e1;font-size:9px;line-height:1.5}.preview-body strong{display:block;margin-top:8px;font-size:16px}.empty,.choose{padding:30px 15px;text-align:center;color:#64748b}.choose mat-icon{width:48px;height:48px;font-size:48px;color:#94a3b8}@media(min-width:720px){.fields{grid-template-columns:1fr 1fr}.fields .wide,.media-fields .wide{grid-column:1/-1}.scope{grid-template-columns:1fr 1fr}.editor-head{flex-direction:row;align-items:center;justify-content:space-between}.media-list article{grid-template-columns:180px minmax(0,1fr)}.media-actions{grid-column:1/-1}}@media(min-width:1050px){.layout{grid-template-columns:300px minmax(0,1fr)}.list{position:sticky;top:92px;max-height:calc(100dvh - 110px);overflow:auto;align-self:start}.grid{grid-template-columns:repeat(2,minmax(0,1fr))}.media-panel{grid-column:1/-1}}
  `],
})
export class AdminTourStudioV170Component implements OnInit {
  private readonly editor = inject(CatalogAdminEditorService);
  readonly mediaService = inject(CatalogMediaService);
  private readonly management = inject(AdminManagementService);
  private readonly toast = inject(ToastService);
  readonly tours = signal<TourAdminRecord[]>([]);
  readonly selected = signal<TourAdminRecord|null>(null);
  readonly media = signal<CatalogMediaItem[]>([]);
  readonly loading = signal(false); readonly saving = signal(false); readonly uploading = signal(false); readonly error = signal("");
  readonly branches = computed(() => this.management.branches().filter((branch)=>branch.isActive));
  readonly coverUrl = computed(() => this.media().find((item)=>item.kind==="IMAGE"&&item.isActive&&item.isCover)?.url || this.media().find((item)=>item.kind==="IMAGE"&&item.isActive)?.url || "");
  readonly videoCount = computed(() => this.media().filter((item)=>item.kind==="VIDEO"&&item.isActive).length);

  ngOnInit():void{void this.reload();}
  async reload():Promise<void>{this.loading.set(true);this.error.set("");try{await this.management.refreshPeople();const rows=await this.editor.tours();this.tours.set(rows);const id=this.selected()?.id;const match=id?rows.find((row)=>row.id===id):rows[0];if(match)await this.select(match);else{this.selected.set(null);this.media.set([]);}}catch(error){this.error.set(this.message(error));}finally{this.loading.set(false);}}
  async select(item:TourAdminRecord):Promise<void>{this.selected.set(this.clone(item));await this.loadMedia(item.id);}
  async save():Promise<void>{const tour=this.selected();if(!tour||this.saving())return;tour.metadata={...(tour.metadata||{}),badge:String(this.meta(tour,"badge")||"").trim(),highlights:this.highlights(tour),capacityPolicy:"FLEXIBLE_DEMAND",capacityMeaning:"RECOMMENDED_GROUP_SIZE",reservationHardLimit:false};const missing=this.missing(tour);if((tour.publicationStatus==="PUBLISHED"||tour.publicationStatus==="SCHEDULED")&&missing.length){this.toast.show(`Yayın engellendi: ${missing.join(" · ")}`,"error");return;}this.saving.set(true);this.error.set("");try{tour.recordOrigin="REAL";await this.editor.saveTour(tour);this.toast.show("Tur kartı, detay ve operasyon bilgileri kaydedildi.","success");await this.reload();}catch(error){const text=this.message(error);this.error.set(text);this.toast.show(text,"error");}finally{this.saving.set(false);}}
  async upload(event:Event,id:string):Promise<void>{const input=event.target as HTMLInputElement;const files=Array.from(input.files||[]).slice(0,20);if(!files.length)return;this.uploading.set(true);try{let hasCover=this.media().some((item)=>item.kind==="IMAGE"&&item.isCover);let order=this.media().length+1;for(const file of files){const image=file.type.startsWith("image/");await this.mediaService.upload("TOUR",id,file,{altText:file.name,isCover:image&&!hasCover,sortOrder:order});if(image&&!hasCover)hasCover=true;order+=1;}await this.loadMedia(id);this.toast.show("Tur fotoğraf ve videoları yüklendi.","success");}catch(error){this.toast.show(this.message(error),"error");}finally{this.uploading.set(false);input.value="";}}
  async cover(item:CatalogMediaItem):Promise<void>{try{await this.mediaService.update(item,{isCover:true});await this.loadMedia(this.selected()?.id||"");this.toast.show("Tur kapağı değiştirildi.","success");}catch(error){this.toast.show(this.message(error),"error");}}
  async saveMedia(item:CatalogMediaItem):Promise<void>{try{await this.mediaService.update(item,{altText:item.altText,sortOrder:Number(item.sortOrder)||0,isActive:item.isActive,posterUrl:item.posterUrl});await this.loadMedia(this.selected()?.id||"");this.toast.show("Medya bilgileri güncellendi.","success");}catch(error){this.toast.show(this.message(error),"error");}}
  async remove(item:CatalogMediaItem):Promise<void>{try{await this.mediaService.remove(item);await this.loadMedia(this.selected()?.id||"");this.toast.show("Medya kaldırıldı.","info");}catch(error){this.toast.show(this.message(error),"error");}}
  meta(tour:TourAdminRecord,key:string):unknown{return tour.metadata?.[key]??"";}
  setMeta(tour:TourAdminRecord,key:string,value:unknown):void{tour.metadata={...(tour.metadata||{}),[key]:value};}
  highlights(tour:TourAdminRecord):string[]{const value=tour.metadata?.["highlights"];return Array.isArray(value)?value.map(String).filter(Boolean):[];}
  setHighlights(tour:TourAdminRecord,value:unknown):void{this.setMeta(tour,"highlights",this.splitLines(value));}
  itineraryText(tour:TourAdminRecord):string{return(tour.itinerary||[]).map((value,index)=>this.itineraryValue(value,index)).filter(Boolean).join("\n");}
  setItinerary(tour:TourAdminRecord,value:unknown):void{tour.itinerary=this.splitLines(value);}
  splitLines(value:unknown):string[]{return String(value||"").split(/\r?\n/).map((row)=>row.trim()).filter(Boolean).slice(0,100);}
  ready(tour:TourAdminRecord):boolean{return this.missing(tour).length===0;}
  missing(tour:TourAdminRecord):string[]{const errors:string[]=[];if(!tour.title.trim())errors.push("Tur adı");if(!(Number(tour.pricePerPerson)>0))errors.push("Fiyat");if(!String(tour.duration||"").trim())errors.push("Süre");if(!Number.isInteger(Number(tour.capacity))||Number(tour.capacity)<1)errors.push("Önerilen grup");if(!String(tour.meetingPoint||"").trim())errors.push("Buluşma");if(!String(tour.locationName||"").trim())errors.push("Konum");if(!String(tour.shortDescription||"").trim())errors.push("Kart açıklaması");if(String(tour.description||"").trim().length<40)errors.push("Detaylı açıklama");if(!tour.branchId)errors.push("Şube");if(!tour.seoSlug.trim())errors.push("SEO");if(!Array.isArray(tour.itinerary)||!tour.itinerary.length)errors.push("Program");if(!tour.includedItems.length)errors.push("Dahil");if(!tour.excludedItems.length)errors.push("Hariç");if(tour.dataQualityStatus==="UNVERIFIED")errors.push("Veri doğrulama");if(!this.media().some((item)=>item.kind==="IMAGE"&&item.isActive))errors.push("Fotoğraf");if(this.media().filter((item)=>item.kind==="IMAGE"&&item.isActive&&item.isCover).length!==1)errors.push("Kapak");return errors;}
  private async loadMedia(id:string):Promise<void>{if(!id){this.media.set([]);return;}try{this.media.set(await this.mediaService.load("TOUR",id));}catch{this.media.set([]);}}
  private itineraryValue(value:unknown,index:number):string{if(typeof value==="string")return value.trim();if(value&&typeof value==="object"){const row=value as Record<string,unknown>;return String(row["title"]||row["name"]||row["description"]||row["label"]||`Program adımı ${index+1}`).trim();}return"";}
  private clone<T>(value:T):T{return JSON.parse(JSON.stringify(value)) as T;}
  private message(error:unknown):string{return error instanceof Error?error.message:"İşlem tamamlanamadı.";}
}
