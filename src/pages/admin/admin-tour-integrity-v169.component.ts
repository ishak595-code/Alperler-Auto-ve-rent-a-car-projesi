import { CommonModule } from "@angular/common";
import { Component, OnInit, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatIconModule } from "@angular/material/icon";
import { CatalogAdminEditorService, TourAdminRecord } from "../../services/catalog-admin-editor.service";
import { ToastService } from "../../services/toast.service";

@Component({
  selector: "app-admin-tour-integrity-v169",
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <main class="workspace">
      <header class="hero"><p>V169 TUR KALİTESİ</p><h1>Tur Programı & Yayın Hazırlığı</h1><span>Canlı tur kartı ve detay sayfasında görünen süre, kapasite, buluşma noktası, rota programı, dahil ve hariç kapsam burada aynı canonical tur kaydından yönetilir.</span></header>
      @if(error()){<div class="alert" role="alert">{{error()}}</div>}
      <div class="layout">
        <aside class="list">
          <div class="list-head"><strong>{{tours().length}} tur</strong><button type="button" (click)="reload()" [disabled]="loading()" aria-label="Tur listesini yenile"><mat-icon aria-hidden="true">refresh</mat-icon></button></div>
          @for(item of tours();track item.id){<button type="button" class="tour-row" [class.active]="selected()?.id===item.id" (click)="select(item)"><strong>{{item.title}}</strong><span>{{item.duration||'Süre eksik'}} · {{item.capacity||0}} kişi</span><em [class.ready]="publicationReady(item)">{{publicationReady(item)?'HAZIR':'EKSİK'}}</em></button>}@empty{<div class="empty">Tur kaydı bulunamadı.</div>}
        </aside>

        <section class="editor">
          @if(selected();as tour){
            <header class="editor-head"><div><p>{{tour.publicationStatus}}</p><h2>{{tour.title}}</h2><span>{{readinessText(tour)}}</span></div><button type="button" (click)="save()" [disabled]="saving()">{{saving()?'Kaydediliyor...':'Tur Kalitesini Kaydet'}}</button></header>
            <div class="readiness" [class.good]="publicationReady(tour)"><mat-icon aria-hidden="true">{{publicationReady(tour)?'verified':'warning'}}</mat-icon><div><strong>{{publicationReady(tour)?'V169 içerik gereksinimleri tamam':'Yayın için eksik alanlar var'}}</strong><span>{{missingFields(tour).join(' · ')||'Süre, kapasite, buluşma, rota ve kapsam bilgileri hazır.'}}</span></div></div>

            <div class="grid">
              <section class="panel"><header><h3>Turun temel gerçeği</h3><p>Kart ve rezervasyon kapasitesi bu alanları kullanır.</p></header><div class="fields"><label><span>Süre</span><input [(ngModel)]="tour.duration" /></label><label><span>Kapasite</span><input [(ngModel)]="tour.capacity" type="number" min="1" max="1000" /></label><label class="wide"><span>Buluşma noktası</span><input [(ngModel)]="tour.meetingPoint" /></label><label class="wide"><span>Konum adı</span><input [(ngModel)]="tour.locationName" /></label><label><span>Kişi başı fiyat TL</span><input [(ngModel)]="tour.pricePerPerson" type="number" min="0" /></label><label><span>Yayın durumu</span><select [(ngModel)]="tour.publicationStatus"><option value="DRAFT">Taslak</option><option value="SCHEDULED">Planlı</option><option value="PUBLISHED">Yayında</option><option value="ARCHIVED">Arşiv</option></select></label></div></section>

              <section class="panel"><header><h3>Tur Programı</h3><p>Her satır bir rota veya program adımıdır. Sıra, müşterinin detay sayfasında aynen korunur.</p></header><label class="textarea"><span>Program adımları, satır başına bir</span><textarea [ngModel]="itineraryText(tour)" (ngModelChange)="setItinerary(tour,$event)" rows="11" placeholder="Yüksekova buluşma ve hareket&#10;Vadi seyir noktası&#10;Öğle molası&#10;Dönüş"></textarea></label><small>{{tour.itinerary.length}} program adımı</small></section>

              <section class="panel"><header><h3>Dahil / Hariç kapsam</h3><p>Müşteri ne satın aldığını açıkça görür.</p></header><div class="scope"><label class="textarea"><span>Dahil olanlar</span><textarea [ngModel]="tour.includedItems.join('\n')" (ngModelChange)="tour.includedItems=splitLines($event)" rows="8"></textarea></label><label class="textarea"><span>Hariç olanlar</span><textarea [ngModel]="tour.excludedItems.join('\n')" (ngModelChange)="tour.excludedItems=splitLines($event)" rows="8"></textarea></label></div></section>

              <section class="panel"><header><h3>Öne çıkanlar & müşteri anlatımı</h3><p>Detay sayfasındaki karar destek alanları.</p></header><label class="textarea"><span>Öne çıkanlar</span><textarea [ngModel]="highlights(tour).join('\n')" (ngModelChange)="setHighlights(tour,$event)" rows="6"></textarea></label><label class="textarea"><span>Detaylı açıklama</span><textarea [(ngModel)]="tour.description" rows="7"></textarea></label></section>
            </div>
          }@else{<div class="choose"><mat-icon aria-hidden="true">route</mat-icon><h2>Bir tur seçin</h2><p>Program ve yayın hazırlığını düzenlemek için soldan canlı veya taslak bir tur seçin.</p></div>}
        </section>
      </div>
    </main>
  `,
  styles: [`
    :host{display:block;background:#f8fafc;color:#0f172a}.workspace{min-height:100vh;padding:16px}.hero{max-width:1440px;margin:0 auto 16px;border-radius:24px;background:#0f172a;padding:22px;color:#fff;box-shadow:0 16px 35px rgba(15,23,42,.15)}.hero p,.editor-head p{margin:0;color:#a78bfa;font-size:10px;font-weight:950;letter-spacing:.16em}.hero h1{margin:5px 0 0;font-size:clamp(26px,5vw,42px)}.hero span{display:block;max-width:900px;margin-top:9px;color:#cbd5e1;font-size:12px;line-height:1.65}.alert{max-width:1440px;margin:0 auto 12px;border:1px solid #fecaca;border-radius:14px;background:#fff1f2;padding:12px;color:#9f1239;font-weight:800}.layout{display:grid;max-width:1440px;margin:auto;gap:15px}.list,.editor{border:1px solid #e2e8f0;border-radius:22px;background:#fff;box-shadow:0 2px 8px rgba(15,23,42,.04)}.list{padding:10px}.list-head{display:flex;align-items:center;justify-content:space-between;padding:5px 5px 10px}.list-head strong{font-size:12px}.list-head button{display:grid;width:40px;height:40px;place-items:center;border:0;border-radius:11px;background:#f1f5f9}.tour-row{display:grid;position:relative;width:100%;gap:4px;margin-top:6px;border:1px solid #e2e8f0;border-radius:14px;background:#fff;padding:11px 62px 11px 11px;text-align:left}.tour-row.active{border-color:#7c3aed;background:#f5f3ff}.tour-row strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px}.tour-row span{color:#64748b;font-size:9px}.tour-row em{position:absolute;right:8px;top:50%;transform:translateY(-50%);border-radius:999px;background:#fef3c7;padding:5px 7px;color:#92400e;font-size:8px;font-style:normal;font-weight:950}.tour-row em.ready{background:#dcfce7;color:#166534}.empty,.choose{padding:35px 18px;text-align:center;color:#64748b}.editor{min-width:0;padding:14px}.editor-head{display:flex;flex-direction:column;gap:12px;border-bottom:1px solid #e2e8f0;padding:4px 2px 15px}.editor-head h2{margin:4px 0 0;font-size:22px}.editor-head span{display:block;margin-top:4px;color:#64748b;font-size:10px}.editor-head button{min-height:46px;border:0;border-radius:12px;background:#7c3aed;padding:0 17px;color:#fff;font-weight:900}.readiness{display:flex;align-items:flex-start;gap:10px;margin-top:14px;border:1px solid #fcd34d;border-radius:15px;background:#fffbeb;padding:12px;color:#92400e}.readiness.good{border-color:#86efac;background:#f0fdf4;color:#166534}.readiness mat-icon{flex:none}.readiness strong,.readiness span{display:block}.readiness strong{font-size:11px}.readiness span{margin-top:3px;font-size:9px;line-height:1.5}.grid{display:grid;gap:14px;margin-top:14px}.panel{border:1px solid #e2e8f0;border-radius:18px;padding:14px}.panel header{margin-bottom:12px}.panel h3{margin:0;font-size:15px}.panel header p{margin:4px 0 0;color:#64748b;font-size:9px;line-height:1.5}.fields{display:grid;gap:10px}.fields label,.textarea{display:grid;gap:5px;color:#475569;font-size:9px;font-weight:850}.fields input,.fields select,.textarea textarea{width:100%;min-height:44px;border:1px solid #cbd5e1;border-radius:11px;background:#f8fafc;padding:9px 10px;color:#0f172a;outline:none}.fields input:focus,.fields select:focus,.textarea textarea:focus{border-color:#7c3aed;box-shadow:0 0 0 3px rgba(124,58,237,.12)}.textarea textarea{resize:vertical;line-height:1.55}.panel>small{display:block;margin-top:7px;color:#64748b;font-size:9px}.scope{display:grid;gap:10px}.choose mat-icon{width:52px;height:52px;font-size:52px;color:#94a3b8}.choose h2{margin:8px 0 0;color:#0f172a}.choose p{max-width:450px;margin:7px auto 0;font-size:11px;line-height:1.6}@media(min-width:720px){.fields{grid-template-columns:1fr 1fr}.fields .wide{grid-column:1/-1}.scope{grid-template-columns:1fr 1fr}.editor-head{flex-direction:row;align-items:center;justify-content:space-between}.editor-head button{flex:none}}@media(min-width:1020px){.layout{grid-template-columns:320px minmax(0,1fr)}.list{position:sticky;top:92px;max-height:calc(100dvh - 110px);overflow:auto;align-self:start}.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
  `],
})
export class AdminTourIntegrityV169Component implements OnInit {
  private readonly editor = inject(CatalogAdminEditorService);
  private readonly toast = inject(ToastService);
  readonly tours = signal<TourAdminRecord[]>([]);
  readonly selected = signal<TourAdminRecord | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal("");

  ngOnInit(): void { void this.reload(); }
  async reload(): Promise<void> {
    this.loading.set(true); this.error.set("");
    try { const rows = await this.editor.tours(); this.tours.set(rows); const current = this.selected()?.id; if (current) { const match = rows.find((row) => row.id === current); this.selected.set(match ? this.clone(match) : null); } else if (rows[0]) this.selected.set(this.clone(rows[0])); }
    catch (error) { this.error.set(this.message(error)); }
    finally { this.loading.set(false); }
  }
  select(item: TourAdminRecord): void { this.selected.set(this.clone(item)); this.error.set(""); }
  async save(): Promise<void> {
    const tour = this.selected(); if (!tour || this.saving()) return;
    const missing = this.missingFields(tour);
    if ((tour.publicationStatus === "PUBLISHED" || tour.publicationStatus === "SCHEDULED") && missing.length) { this.toast.show(`Yayın engellendi: ${missing.join(" · ")}`, "error"); return; }
    this.saving.set(true); this.error.set("");
    try { tour.recordOrigin = "REAL"; await this.editor.saveTour(tour); this.toast.show("Tur programı ve yayın bilgileri kaydedildi.", "success"); await this.reload(); }
    catch (error) { const message = this.message(error); this.error.set(message); this.toast.show(message, "error"); }
    finally { this.saving.set(false); }
  }

  itineraryText(tour: TourAdminRecord): string { return (tour.itinerary || []).map((value, index) => this.itineraryValue(value, index)).filter(Boolean).join("\n"); }
  setItinerary(tour: TourAdminRecord, value: unknown): void { tour.itinerary = this.splitLines(value); }
  highlights(tour: TourAdminRecord): string[] { const value = tour.metadata?.["highlights"]; return Array.isArray(value) ? value.map(String).filter(Boolean) : []; }
  setHighlights(tour: TourAdminRecord, value: unknown): void { tour.metadata = { ...(tour.metadata || {}), highlights: this.splitLines(value) }; }
  splitLines(value: unknown): string[] { return String(value || "").split(/\r?\n/).map((row) => row.trim()).filter(Boolean).slice(0, 100); }
  publicationReady(tour: TourAdminRecord): boolean { return this.missingFields(tour).length === 0; }
  readinessText(tour: TourAdminRecord): string { const missing = this.missingFields(tour); return missing.length ? `${missing.length} yayın alanı tamamlanmalı` : "V169 tur içeriği yayına hazır"; }
  missingFields(tour: TourAdminRecord): string[] {
    const missing: string[] = [];
    if (!tour.title.trim()) missing.push("Tur adı");
    if (!(Number(tour.pricePerPerson) > 0)) missing.push("Fiyat");
    if (!String(tour.duration || "").trim()) missing.push("Süre");
    if (!Number.isInteger(Number(tour.capacity)) || Number(tour.capacity) < 1) missing.push("Kapasite");
    if (!String(tour.meetingPoint || "").trim()) missing.push("Buluşma noktası");
    if (!String(tour.locationName || "").trim()) missing.push("Konum");
    if (!tour.branchId) missing.push("Şube");
    if (String(tour.description || "").trim().length < 40) missing.push("Detaylı açıklama");
    if (!Array.isArray(tour.itinerary) || tour.itinerary.length < 1) missing.push("Tur programı");
    if (!Array.isArray(tour.includedItems) || tour.includedItems.length < 1) missing.push("Dahil olanlar");
    if (!Array.isArray(tour.excludedItems) || tour.excludedItems.length < 1) missing.push("Hariç olanlar");
    if (tour.dataQualityStatus === "UNVERIFIED") missing.push("Veri doğrulama");
    return missing;
  }
  private itineraryValue(value: unknown, index: number): string { if (typeof value === "string") return value.trim(); if (value && typeof value === "object") { const row = value as Record<string, unknown>; return String(row["title"] || row["name"] || row["description"] || row["label"] || `Program adımı ${index + 1}`).trim(); } return ""; }
  private clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
  private message(error: unknown): string { return error instanceof Error ? error.message : "Tur bilgileri kaydedilemedi."; }
}
