import { CommonModule, Location } from "@angular/common";
import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatIconModule } from "@angular/material/icon";
import { RouterLink } from "@angular/router";
import { BranchPartnerBudgetRange, BranchPartnerListingModel, BranchPartnerOfficeStatus, BranchPartnerService, BranchPartnerServiceType } from "../services/branch-partner.service";
import { GeoDirectoryService } from "../services/geo-directory.service";

@Component({
  selector: "app-branch-partner-v164",
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, RouterLink],
  template: `
    <main class="page">
      <header class="topbar"><div class="topbar-inner"><button type="button" (click)="location.back()" aria-label="Geri dön"><mat-icon aria-hidden="true">arrow_back</mat-icon></button><div><h1>Alperler Auto İş Ortaklığı</h1><p>Türkiye geneli şube ve bölgesel operasyon başvurusu</p></div></div></header>
      <section class="shell">
        @if (successReference()) {
          <article class="success" role="status" aria-live="polite"><mat-icon aria-hidden="true">check_circle</mat-icon><p>Başvuru veritabanına kaydedildi</p><h2>Şube adaylık süreciniz başladı</h2><span>Başvurunuz merkez yönetim paneline düştü. Onaydan sonra şube kaydınız ve portal yetkiniz açılır.</span><strong>Referans: {{ successReference() }}</strong><div><button type="button" (click)="reset()">Yeni Başvuru</button><a routerLink="/">Ana Sayfa</a></div></article>
        } @else {
          <div class="layout">
            <aside><p>81 İLDE ALPERLER AUTO AĞI</p><h2>Kendi bölgenizde güçlü bir şube işletin.</h2><span>Onaylanan iş ortakları kendi kiralık ve satılık araçlarını şube portalından yükler. İlan, rezervasyon ve müşteri kayıtları şubeye bağlı biçimde merkezi Supabase veritabanında tutulur.</span><ul><li>Kendi kiralık ve satılık filonuzu yönetin</li><li>Merkezi fiyat ve yayın kurallarını otomatik uygulayın</li><li>Şubenize yönlenen rezervasyonları portalınızdan takip edin</li><li>Onaydan sonra güvenli şube hesabı ve davet bağlantısı alın</li></ul></aside>
            <form (ngSubmit)="submit()" novalidate>
              <div class="form-head"><p>ÖN DEĞERLENDİRME</p><h2>Şube Başvurusu</h2><span>İl ve ilçe alanları serbest metin değil, veritabanındaki Türkiye konum dizininden seçilir.</span></div>
              @if (geo.loading()) { <p role="status" class="notice">Türkiye il ve ilçe dizini hazırlanıyor…</p> }
              @if (geo.error()) { <p role="alert" class="error">Konum dizinine ulaşılamadı. Lütfen bağlantınızı kontrol edip tekrar deneyin.</p> }
              <div class="grid">
                <label><span>Ad soyad *</span><input [(ngModel)]="fullName" name="fullName" autocomplete="name" maxlength="160" required /></label>
                <label><span>Telefon *</span><input [(ngModel)]="phone" name="phone" type="tel" autocomplete="tel" maxlength="40" required /></label>
                <label class="wide"><span>E-posta *</span><input [(ngModel)]="email" name="email" type="email" autocomplete="email" maxlength="160" required /><small>Onaylanırsa şube portalı daveti bu adrese gönderilir.</small></label>
                <label><span>İl *</span><select [(ngModel)]="provinceCode" name="provinceCode" (ngModelChange)="provinceChanged($event)" required aria-label="Şube ili"><option value="">İl seçin</option>@for (province of geo.provinces(); track province.code) { <option [value]="province.code">{{ province.name }}</option> }</select></label>
                <label><span>İlçe *</span><select [(ngModel)]="districtCode" name="districtCode" (ngModelChange)="districtChanged($event)" [disabled]="!provinceCode" required aria-label="Şube ilçesi"><option value="">İlçe seçin</option>@for (districtItem of districts(); track districtItem.code) { <option [value]="districtItem.code">{{ districtItem.name }}</option> }</select></label>
                <label class="wide"><span>Hedef çalışma bölgesi</span><input [(ngModel)]="operatingArea" name="operatingArea" maxlength="180" placeholder="Mahalle, havalimanı veya çevre hizmet alanı" /></label>
                <label class="wide"><span>Mevcut işletme / şirket</span><input [(ngModel)]="currentBusiness" name="currentBusiness" maxlength="180" /></label>
              </div>
              <fieldset><legend>Sunmak istediğiniz hizmetler *</legend><label class="check"><input type="checkbox" [(ngModel)]="serviceRental" name="serviceRental" />Araç kiralama</label><label class="check"><input type="checkbox" [(ngModel)]="serviceSales" name="serviceSales" />İkinci el araç satışı</label><label class="check"><input type="checkbox" [(ngModel)]="serviceTour" name="serviceTour" />Tur / transfer</label></fieldset>
              <div class="grid">
                <label><span>Otomotiv deneyimi</span><input type="number" [(ngModel)]="experienceYears" name="experienceYears" min="0" max="60" /></label>
                <label><span>Ofis durumu</span><select [(ngModel)]="officeStatus" name="officeStatus"><option value="OWN">Kendi yerim var</option><option value="RENT">Kiralanmış yerim var</option><option value="PLAN">Yer açmayı planlıyorum</option><option value="NONE">Şimdilik ofis düşünmüyorum</option></select></label>
                <label><span>Şu anki araç sayısı</span><input type="number" [(ngModel)]="currentFleetSize" name="currentFleetSize" min="0" max="5000" /></label>
                <label><span>Planlanan araç sayısı *</span><input type="number" [(ngModel)]="plannedFleetSize" name="plannedFleetSize" min="1" max="5000" required /></label>
                <label><span>İlan / filo modeli</span><select [(ngModel)]="listingModel" name="listingModel"><option value="OWN_FLEET">Kendi araçlarım</option><option value="REGIONAL_NETWORK">Bölgedeki araç sahipleri</option><option value="BOTH">Her ikisi</option></select></label>
                <label><span>Başlangıç bütçesi</span><select [(ngModel)]="budgetRange" name="budgetRange"><option value="DISCUSS">Görüşmede netleştirelim</option><option value="UNDER_100K">100.000 TL altı</option><option value="100K_250K">100.000 - 250.000 TL</option><option value="250K_500K">250.000 - 500.000 TL</option><option value="500K_PLUS">500.000 TL ve üzeri</option></select></label>
              </div>
              <label><span>Ek bilgi</span><textarea [(ngModel)]="notes" name="notes" rows="4" maxlength="4000"></textarea></label>
              <input class="hp" [(ngModel)]="website" name="website" tabindex="-1" aria-hidden="true" autocomplete="off" />
              <label class="consent"><input type="checkbox" [(ngModel)]="accuracyAccepted" name="accuracyAccepted" />Verdiğim bilgilerin doğru olduğunu ve başvurunun ön değerlendirme olduğunu kabul ediyorum.</label>
              <label class="consent"><input type="checkbox" [(ngModel)]="privacyAccepted" name="privacyAccepted" />Kişisel verilerimin başvuru değerlendirmesi için işlenmesini kabul ediyorum. <a routerLink="/legal">Yasal bilgilendirmeler</a></label>
              @if (errorMessage()) { <p role="alert" class="error">{{ errorMessage() }}</p> }
              <button class="submit" type="submit" [disabled]="submitting() || !formValid()">{{ submitting() ? 'Başvuru kaydediliyor…' : 'Şube Başvurumu Gönder' }}</button>
              <small class="foot">Başvuru, il/ilçe kodları ve operasyon bilgileri merkezi veritabanına kaydedilir.</small>
            </form>
          </div>
        }
      </section>
    </main>
  `,
  styles: [`
    :host{display:block}.page{min-height:100vh;background:#020617;color:#e2e8f0;padding-bottom:5rem}.topbar{position:sticky;top:0;z-index:40;border-bottom:1px solid #1e293b;background:rgba(2,6,23,.96)}.topbar-inner{display:flex;width:min(1120px,calc(100% - 2rem));min-height:64px;margin:auto;align-items:center;gap:.7rem}.topbar button{display:grid;width:44px;height:44px;place-items:center;border:0;border-radius:12px;background:#0f172a;color:#fff}.topbar h1{margin:0;font-size:1rem}.topbar p{margin:.15rem 0 0;color:#94a3b8;font-size:.72rem}.shell{width:min(1120px,calc(100% - 2rem));margin:auto;padding-top:2rem}.layout{display:grid;gap:2rem}@media(min-width:900px){.layout{grid-template-columns:.8fr 1.2fr}}aside{align-self:start;padding:1rem .25rem}aside>p,.form-head>p{color:#60a5fa;font-size:.68rem;font-weight:950;letter-spacing:.14em}aside h2{max-width:520px;margin:.7rem 0;font:800 clamp(2rem,5vw,3.3rem)/1.05 Georgia,serif;color:#fff}aside span,aside li{color:#94a3b8;line-height:1.7}form,.success{border-radius:24px;background:#fff;padding:clamp(1rem,3vw,1.7rem);color:#0f172a;box-shadow:0 25px 70px rgba(0,0,0,.3)}.form-head h2{margin:.2rem 0}.form-head span{color:#64748b}.grid{display:grid;gap:1rem;margin-top:1rem}@media(min-width:600px){.grid{grid-template-columns:1fr 1fr}.wide{grid-column:1/-1}}label{display:flex;flex-direction:column;gap:.35rem}label>span,legend{font-size:.68rem;font-weight:900;letter-spacing:.05em;text-transform:uppercase;color:#475569}input,select,textarea{width:100%;min-height:48px;border:1px solid #cbd5e1;border-radius:12px;background:#f8fafc;padding:.7rem .8rem;color:#0f172a;font:inherit}input:focus,select:focus,textarea:focus{outline:3px solid rgba(37,99,235,.2);border-color:#2563eb}textarea{min-height:105px}small{color:#64748b}fieldset{display:grid;gap:.6rem;margin:1.2rem 0;border:1px solid #e2e8f0;border-radius:14px;padding:1rem}.check,.consent{display:flex;flex-direction:row;align-items:flex-start;gap:.6rem;color:#475569;font-size:.8rem;line-height:1.5}.check input,.consent input{width:18px;height:18px;min-height:18px}.consent{margin-top:.7rem}.consent a{color:#1d4ed8;font-weight:800}.notice,.error{border-radius:12px;padding:.8rem;font-weight:800}.notice{background:#eff6ff;color:#1e40af}.error{background:#fff1f2;color:#9f1239}.submit{width:100%;min-height:54px;margin-top:1rem;border:0;border-radius:14px;background:#2563eb;color:#fff;font-weight:900}.submit:disabled{opacity:.45}.foot{display:block;margin-top:.7rem;text-align:center}.hp{display:none!important}.success{text-align:center;max-width:650px;margin:auto}.success mat-icon{font-size:42px;width:42px;height:42px;color:#059669}.success>p{color:#047857;font-weight:900}.success>span,.success>strong{display:block;margin:.7rem}.success>div{display:grid;gap:.6rem;margin-top:1.2rem}@media(min-width:500px){.success>div{grid-template-columns:1fr 1fr}}.success button,.success a{display:flex;min-height:48px;align-items:center;justify-content:center;border-radius:12px;border:1px solid #cbd5e1;text-decoration:none;font-weight:900}.success a{background:#020617;color:#fff}
  `]
})
export class BranchPartnerV164Component implements OnInit {
  readonly location=inject(Location); readonly geo=inject(GeoDirectoryService); private readonly service=inject(BranchPartnerService);
  fullName=""; phone=""; email=""; provinceCode=""; districtCode=""; city=""; district=""; operatingArea=""; currentBusiness=""; experienceYears=0; officeStatus:BranchPartnerOfficeStatus="PLAN"; currentFleetSize=0; plannedFleetSize=1; listingModel:BranchPartnerListingModel="OWN_FLEET"; budgetRange:BranchPartnerBudgetRange="DISCUSS"; notes=""; website=""; serviceRental=true; serviceSales=false; serviceTour=false; accuracyAccepted=false; privacyAccepted=false;
  readonly submitting=signal(false); readonly errorMessage=signal(""); readonly successReference=signal(""); readonly districts=computed(()=>this.geo.districtsFor(this.provinceCode));
  ngOnInit():void{void this.geo.ensureLoaded().catch(()=>undefined);}
  provinceChanged(code:string):void{this.provinceCode=String(code||"");this.districtCode="";this.city=this.geo.province(this.provinceCode)?.name||"";this.district="";}
  districtChanged(code:string):void{this.districtCode=String(code||"");this.city=this.geo.province(this.provinceCode)?.name||"";this.district=this.geo.district(this.districtCode)?.name||"";}
  formValid():boolean{return Boolean(this.geo.loaded()&&this.fullName.trim()&&/^[+0-9()\s-]{7,24}$/.test(this.phone.trim())&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim())&&this.provinceCode&&this.districtCode&&this.city&&this.district&&this.plannedFleetSize>=1&&(this.serviceRental||this.serviceSales||this.serviceTour)&&this.accuracyAccepted&&this.privacyAccepted);}
  private services():BranchPartnerServiceType[]{const values:BranchPartnerServiceType[]=[];if(this.serviceRental)values.push("RENTAL");if(this.serviceSales)values.push("SALES");if(this.serviceTour)values.push("TOUR_TRANSFER");return values;}
  async submit():Promise<void>{if(!this.formValid()||this.submitting())return;this.submitting.set(true);this.errorMessage.set("");try{const result=await this.service.submit({fullName:this.fullName,phone:this.phone,email:this.email,provinceCode:this.provinceCode,districtCode:this.districtCode,city:this.city,district:this.district,operatingArea:this.operatingArea||undefined,currentBusiness:this.currentBusiness||undefined,experienceYears:this.experienceYears,officeStatus:this.officeStatus,currentFleetSize:this.currentFleetSize,plannedFleetSize:this.plannedFleetSize,services:this.services(),listingModel:this.listingModel,budgetRange:this.budgetRange,notes:this.notes||undefined,website:this.website});this.successReference.set(result.reference);window.scrollTo({top:0,behavior:"smooth"});}catch(error){const code=error instanceof Error?error.message:"";this.errorMessage.set(code.includes("RATE_LIMITED")?"Çok fazla başvuru gönderildi. Lütfen daha sonra tekrar deneyin.":code.includes("INVALID_REQUIRED_FIELDS")?"Ad, telefon, e-posta, il, ilçe ve hizmet alanlarını kontrol edin.":"Başvuru kaydedilemedi. Form bilgileriniz korunuyor; tekrar deneyin.");}finally{this.submitting.set(false);}}
  reset():void{this.successReference.set("");this.errorMessage.set("");this.fullName="";this.phone="";this.email="";this.provinceCode="";this.districtCode="";this.city="";this.district="";this.operatingArea="";this.currentBusiness="";this.experienceYears=0;this.officeStatus="PLAN";this.currentFleetSize=0;this.plannedFleetSize=1;this.listingModel="OWN_FLEET";this.budgetRange="DISCUSS";this.notes="";this.serviceRental=true;this.serviceSales=false;this.serviceTour=false;this.accuracyAccepted=false;this.privacyAccepted=false;}
}
