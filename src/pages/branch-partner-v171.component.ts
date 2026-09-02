import { CommonModule } from "@angular/common";
import { Component, OnInit, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import {
  BranchPartnerBudgetRange,
  BranchPartnerBusinessType,
  BranchPartnerListingModel,
  BranchPartnerOfficeStatus,
  BranchPartnerService,
  BranchPartnerServiceType,
} from "../services/branch-partner.service";
import { GeoDirectoryService } from "../services/geo-directory.service";

@Component({
  selector:"app-branch-partner-v171",
  standalone:true,
  imports:[CommonModule,FormsModule,RouterLink],
  template:`
<main class="min-h-screen bg-slate-950 pb-20 text-white">
  <section class="mx-auto max-w-6xl px-4 py-10 md:px-8">
    <a routerLink="/branch-plans" class="text-sm font-black text-blue-300">← Paketleri ve avantajları gör</a>
    <div class="mt-6 grid gap-8 lg:grid-cols-[.78fr_1.22fr]">
      <aside>
        <p class="text-xs font-black uppercase tracking-[.18em] text-blue-300">Doğrulanmış şube ağı</p>
        <h1 class="mt-3 text-4xl font-black leading-tight md:text-5xl">İşletmenizi Alperler Auto'nun yerel dijital satış kanalına taşıyın.</h1>
        <p class="mt-5 text-sm leading-7 text-slate-300">Başvurunuz ticari kimlik, yetkili, iletişim, hizmet kapasitesi ve bölge uygunluğu açısından incelenir. Onay tek başına canlı yayın hakkı vermez.</p>
        <ul class="mt-6 space-y-3 text-sm text-slate-300">
          <li>• Ticari ve iletişim bilgileri merkezi ekip tarafından doğrulanır.</li>
          <li>• Şube oluşturulduğunda sözleşme, kimlik, adres, fiyat, güvenlik ve ödeme kontrolleri tamamlanır.</li>
          <li>• Paket ve abonelik aktif değilse yeni ilan yayın sürecine alınmaz.</li>
          <li>• Şube ilanları doğrudan yayınlanmaz, merkez kalite kontrolünden geçer.</li>
          <li>• Rezervasyon ve müşteri talepleri ilanı yöneten doğrulanmış şubeye bağlanır.</li>
        </ul>
      </aside>

      <form (ngSubmit)="submit()" class="rounded-3xl bg-white p-5 text-slate-900 shadow-2xl md:p-7" novalidate>
        <h2 class="text-2xl font-black">Bayilik / Şube Başvurusu</h2>
        <p class="mt-2 text-sm text-slate-500">Yıldızlı alanlar sözleşme ve uygunluk incelemesi için zorunludur.</p>
        @if(error()){<p role="alert" class="mt-4 rounded-xl bg-rose-50 p-3 font-bold text-rose-800">{{error()}}</p>}
        @if(reference()){
          <div role="status" class="mt-4 rounded-2xl bg-emerald-50 p-5 text-emerald-900"><strong>Başvurunuz merkezi sisteme kaydedildi.</strong><p class="mt-1 text-sm">Referans: {{reference()}}</p><p class="mt-2 text-xs leading-5">İnceleme tamamlanmadan şube veya ilan yayına açılmaz.</p></div>
        }@else{
          <section class="form-section">
            <h3>İşletme ve Yetkili</h3>
            <div class="grid gap-4 md:grid-cols-2">
              <label><span>İşletme / Ticari Unvan *</span><input [(ngModel)]="businessName" name="businessName" required maxlength="180" autocomplete="organization" class="field"/></label>
              <label><span>İşletme Türü *</span><select [(ngModel)]="businessType" name="businessType" required class="field"><option value="SOLE_PROPRIETORSHIP">Şahıs işletmesi</option><option value="LIMITED">Limited şirket</option><option value="JOINT_STOCK">Anonim şirket</option><option value="COOPERATIVE">Kooperatif</option><option value="OTHER">Diğer</option></select></label>
              <label><span>Yetkili Ad Soyad *</span><input [(ngModel)]="fullName" name="fullName" required maxlength="160" autocomplete="name" class="field"/></label>
              <label><span>Telefon *</span><input [(ngModel)]="phone" name="phone" type="tel" required maxlength="40" autocomplete="tel" class="field"/></label>
              <label><span>E-posta *</span><input [(ngModel)]="email" name="email" type="email" required maxlength="160" autocomplete="email" class="field"/></label>
              <label><span>İşletme Web Sitesi</span><input [(ngModel)]="businessWebsite" name="businessWebsite" type="url" maxlength="500" placeholder="https://..." class="field"/></label>
            </div>
          </section>

          <section class="form-section">
            <h3>Ticari Doğrulama</h3>
            <p>Kimlik belgesi ve banka bilgisi bu açık formda alınmaz. Bunlar onay sonrası güvenli şube kurulumunda doğrulanır.</p>
            <div class="mt-4 grid gap-4 md:grid-cols-2">
              <label><span>Vergi Dairesi *</span><input [(ngModel)]="taxOffice" name="taxOffice" required maxlength="120" class="field"/></label>
              <label><span>Vergi / T.C. Vergi Numarası *</span><input [(ngModel)]="taxNumber" name="taxNumber" inputmode="numeric" required maxlength="11" class="field"/></label>
              <label><span>Ticaret Sicil No</span><input [(ngModel)]="tradeRegistryNo" name="tradeRegistryNo" maxlength="80" class="field"/></label>
              <label><span>MERSİS No</span><input [(ngModel)]="mersisNo" name="mersisNo" inputmode="numeric" maxlength="16" class="field" placeholder="Varsa 16 hane"/></label>
              <label class="md:col-span-2"><span>İşletme Adresi *</span><textarea [(ngModel)]="businessAddress" name="businessAddress" required maxlength="500" rows="3" class="field"></textarea></label>
            </div>
          </section>

          <section class="form-section">
            <h3>Bölge ve Operasyon</h3>
            <div class="grid gap-4 md:grid-cols-2">
              <label><span>İl *</span><select [(ngModel)]="provinceCode" name="provinceCode" (ngModelChange)="provinceChanged($event)" required class="field" aria-label="Şube ili"><option value="">İl seçin</option>@for(p of geo.provinces();track p.code){<option [value]="p.code">{{p.name}}</option>}</select></label>
              <label><span>İlçe *</span><select [(ngModel)]="districtCode" name="districtCode" (ngModelChange)="districtChanged($event)" [disabled]="!provinceCode" required class="field" aria-label="Şube ilçesi"><option value="">İlçe seçin</option>@for(d of districts();track d.code){<option [value]="d.code">{{d.name}}</option>}</select></label>
              <label class="md:col-span-2"><span>Hedef Çalışma Bölgesi</span><input [(ngModel)]="operatingArea" name="operatingArea" maxlength="180" placeholder="Mahalle, havalimanı, çevre ilçeler..." class="field"/></label>
              <label><span>Otomotiv Deneyimi</span><input type="number" [(ngModel)]="experienceYears" name="experienceYears" min="0" max="60" class="field"/></label>
              <label><span>Ofis Durumu *</span><select [(ngModel)]="officeStatus" name="officeStatus" class="field"><option value="OWN">Kendi yerim var</option><option value="RENT">Kiralanmış yerim var</option><option value="PLAN">Yer açmayı planlıyorum</option><option value="NONE">Şimdilik ofis yok</option></select></label>
              <label><span>Mevcut Araç Sayısı *</span><input type="number" [(ngModel)]="currentFleetSize" name="currentFleetSize" min="0" max="5000" required class="field"/></label>
              <label><span>Planlanan Araç Sayısı *</span><input type="number" [(ngModel)]="plannedFleetSize" name="plannedFleetSize" min="1" max="5000" required class="field"/></label>
              <label><span>İlan Modeli *</span><select [(ngModel)]="listingModel" name="listingModel" class="field"><option value="OWN_FLEET">Kendi filom</option><option value="REGIONAL_NETWORK">Bölgesel ağ</option><option value="BOTH">Kendi filo + bölgesel ağ</option></select></label>
              <label><span>Başlangıç Bütçesi</span><select [(ngModel)]="budgetRange" name="budgetRange" class="field"><option value="DISCUSS">Görüşmede netleşsin</option><option value="UNDER_100K">100.000 TL altı</option><option value="100K_250K">100.000 - 250.000 TL</option><option value="250K_500K">250.000 - 500.000 TL</option><option value="500K_PLUS">500.000 TL üzeri</option></select></label>
            </div>

            <fieldset class="mt-5 rounded-2xl border border-slate-200 p-4"><legend class="px-2 text-xs font-black">Sunacağınız Hizmetler *</legend><div class="grid gap-2 sm:grid-cols-3"><label class="check"><input type="checkbox" [(ngModel)]="serviceRental" name="serviceRental"/>Araç kiralama</label><label class="check"><input type="checkbox" [(ngModel)]="serviceSales" name="serviceSales"/>İkinci el satış</label><label class="check"><input type="checkbox" [(ngModel)]="serviceTour" name="serviceTour"/>Tur / transfer</label></div></fieldset>
          </section>

          <section class="form-section">
            <h3>Ek Bilgi ve Onaylar</h3>
            <label><span>Ek Bilgi</span><textarea [(ngModel)]="notes" name="notes" maxlength="4000" rows="4" class="field"></textarea></label>
            <input [(ngModel)]="website" name="website" tabindex="-1" aria-hidden="true" autocomplete="off" class="hidden"/>
            <label class="consent"><input type="checkbox" [(ngModel)]="accuracyAccepted" name="accuracyAccepted"/>Verdiğim işletme, yetkili ve iletişim bilgilerinin doğru olduğunu kabul ediyorum.</label>
            <label class="consent"><input type="checkbox" [(ngModel)]="privacyAccepted" name="privacyAccepted"/>Başvuru bilgilerimin değerlendirme, iletişim ve şube doğrulama amacıyla işlenmesini kabul ediyorum.</label>
            <label class="consent"><input type="checkbox" [(ngModel)]="dueDiligenceAccepted" name="dueDiligenceAccepted"/>Alperler Auto'nun başvuruyu onaylamadan önce ticari kayıt, yetkili, adres, araç sahipliği, marka standardı ve gerekli diğer uygunluk kontrollerini yapabileceğini kabul ediyorum.</label>
          </section>

          <button type="submit" [disabled]="submitting()||!valid()" class="mt-6 min-h-13 w-full rounded-xl bg-blue-600 px-5 py-4 font-black text-white disabled:opacity-40">{{submitting()?'Başvuru kaydediliyor…':'Başvuruyu Güvenli Şekilde Gönder'}}</button>
        }
      </form>
    </div>
  </section>
</main>`,
  styles:[`
    .form-section{margin-top:1.25rem;border-top:1px solid #e2e8f0;padding-top:1.15rem}.form-section:first-of-type{border-top:0}.form-section h3{margin:0 0 .25rem;font-weight:900}.form-section>p{margin:.25rem 0 0;color:#64748b;font-size:.75rem;line-height:1.45rem}.form-section label:not(.check):not(.consent){display:grid;gap:.3rem}.form-section label>span{font-size:.67rem;font-weight:900;color:#334155}.field{width:100%;min-height:48px;border:1px solid #cbd5e1;border-radius:12px;padding:.7rem .8rem;background:#f8fafc}.check{display:flex;align-items:center;gap:.5rem;font-size:.875rem}.consent{display:flex;align-items:flex-start;gap:.65rem;margin-top:.85rem;font-size:.82rem;line-height:1.35rem}.consent input{margin-top:.2rem;flex:0 0 auto}input:focus-visible,select:focus-visible,textarea:focus-visible,button:focus-visible{outline:3px solid #60a5fa;outline-offset:2px}
  `],
})
export class BranchPartnerV171Component implements OnInit {
  readonly geo=inject(GeoDirectoryService);
  private readonly service=inject(BranchPartnerService);

  businessName="";
  businessType:BranchPartnerBusinessType="LIMITED";
  fullName="";
  phone="";
  email="";
  businessWebsite="";
  taxOffice="";
  taxNumber="";
  tradeRegistryNo="";
  mersisNo="";
  businessAddress="";
  provinceCode="";
  districtCode="";
  city="";
  district="";
  operatingArea="";
  experienceYears=0;
  currentFleetSize=0;
  plannedFleetSize=1;
  officeStatus:BranchPartnerOfficeStatus="PLAN";
  listingModel:BranchPartnerListingModel="OWN_FLEET";
  budgetRange:BranchPartnerBudgetRange="DISCUSS";
  notes="";
  website="";
  serviceRental=true;
  serviceSales=false;
  serviceTour=false;
  accuracyAccepted=false;
  privacyAccepted=false;
  dueDiligenceAccepted=false;

  readonly submitting=signal(false);
  readonly error=signal("");
  readonly reference=signal("");
  readonly districts=computed(()=>this.geo.districtsFor(this.provinceCode));

  ngOnInit():void{void this.geo.ensureLoaded().catch(()=>this.error.set("Türkiye il/ilçe dizini yüklenemedi."));}

  provinceChanged(code:string):void{
    this.provinceCode=String(code||"");
    this.districtCode="";
    this.city=this.geo.province(this.provinceCode)?.name||"";
    this.district="";
  }

  districtChanged(code:string):void{
    this.districtCode=String(code||"");
    this.city=this.geo.province(this.provinceCode)?.name||"";
    this.district=this.geo.district(this.districtCode)?.name||"";
  }

  valid():boolean{
    const websiteOk=!this.businessWebsite.trim()||/^https:\/\/[^\s]+$/i.test(this.businessWebsite.trim());
    const mersisOk=!this.mersisNo.trim()||/^\d{16}$/.test(this.mersisNo.trim());
    return Boolean(
      this.geo.loaded()
      && this.businessName.trim().length>=2
      && this.fullName.trim().length>=3
      && /^[+0-9()\s-]{7,24}$/.test(this.phone.trim())
      && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim())
      && this.taxOffice.trim().length>=2
      && /^\d{10,11}$/.test(this.taxNumber.trim())
      && mersisOk
      && this.businessAddress.trim().length>=10
      && websiteOk
      && this.provinceCode&&this.districtCode&&this.city&&this.district
      && this.currentFleetSize>=0&&this.plannedFleetSize>=1
      && (this.serviceRental||this.serviceSales||this.serviceTour)
      && this.accuracyAccepted&&this.privacyAccepted&&this.dueDiligenceAccepted
    );
  }

  private services():BranchPartnerServiceType[]{
    const out:BranchPartnerServiceType[]=[];
    if(this.serviceRental)out.push("RENTAL");
    if(this.serviceSales)out.push("SALES");
    if(this.serviceTour)out.push("TOUR_TRANSFER");
    return out;
  }

  async submit():Promise<void>{
    if(!this.valid()||this.submitting())return;
    this.submitting.set(true);
    this.error.set("");
    try{
      const result=await this.service.submit({
        fullName:this.fullName,
        phone:this.phone,
        email:this.email,
        provinceCode:this.provinceCode,
        districtCode:this.districtCode,
        city:this.city,
        district:this.district,
        operatingArea:this.operatingArea||undefined,
        currentBusiness:this.businessName.trim(),
        businessType:this.businessType,
        taxOffice:this.taxOffice.trim(),
        taxNumber:this.taxNumber.trim(),
        tradeRegistryNo:this.tradeRegistryNo.trim()||undefined,
        mersisNo:this.mersisNo.trim()||undefined,
        businessAddress:this.businessAddress.trim(),
        businessWebsite:this.businessWebsite.trim()||undefined,
        experienceYears:this.experienceYears,
        officeStatus:this.officeStatus,
        currentFleetSize:this.currentFleetSize,
        plannedFleetSize:this.plannedFleetSize,
        services:this.services(),
        listingModel:this.listingModel,
        budgetRange:this.budgetRange,
        notes:this.notes||undefined,
        accuracyAccepted:this.accuracyAccepted,
        privacyAccepted:this.privacyAccepted,
        dueDiligenceAccepted:this.dueDiligenceAccepted,
        website:this.website,
      });
      this.reference.set(result.reference);
    }catch(error){
      const code=error instanceof Error?error.message:"BRANCH_PARTNER_CREATE_FAILED";
      this.error.set(this.messageFor(code));
    }finally{this.submitting.set(false);}
  }

  private messageFor(code:string):string{
    if(code.includes("RATE_LIMITED"))return"Çok fazla başvuru denemesi yapıldı. Lütfen daha sonra tekrar deneyin.";
    if(code.includes("BUSINESS_DUE_DILIGENCE"))return"Ticari doğrulama alanlarını ve üç onayı kontrol edin.";
    if(code.includes("INVALID_REQUIRED_FIELDS"))return"Zorunlu başvuru alanlarını kontrol edin.";
    return"Başvuru kaydedilemedi. Bilgileriniz değiştirilmedi.";
  }
}
