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
import { UiService } from "../services/ui.service";

@Component({
  selector:"app-branch-partner-v171",
  standalone:true,
  imports:[CommonModule,FormsModule,RouterLink],
  template:`
<main class="min-h-screen bg-slate-950 pb-20 text-white">
  <section class="mx-auto max-w-6xl px-4 py-10 md:px-8">
    <a routerLink="/branch-plans" class="text-sm font-black text-prestige-red-light">{{ t().branchPartner.backToPlans }}</a>
    <div class="mt-6 grid gap-8 lg:grid-cols-[.78fr_1.22fr]">
      <aside>
        <p class="text-xs font-black uppercase tracking-[.18em] text-prestige-red-light">{{ t().branchPartner.networkKicker }}</p>
        <h1 class="mt-3 text-4xl font-black leading-tight md:text-5xl">{{ t().branchPartner.title }}</h1>
        <p class="mt-5 text-sm leading-7 text-slate-300">{{ t().branchPartner.subtitle }}</p>
        <ul class="mt-6 space-y-3 text-sm text-slate-300">
          <li>• {{ t().branchPartner.bullet1 }}</li>
          <li>• {{ t().branchPartner.bullet2 }}</li>
          <li>• {{ t().branchPartner.bullet3 }}</li>
          <li>• {{ t().branchPartner.bullet4 }}</li>
          <li>• {{ t().branchPartner.bullet5 }}</li>
        </ul>
      </aside>

      <form (ngSubmit)="submit()" class="rounded-3xl bg-white p-5 text-slate-900 shadow-2xl md:p-7" novalidate>
        <h2 class="text-2xl font-black">{{ t().branchPartner.formTitle }}</h2>
        <p class="mt-2 text-sm text-slate-500">{{ t().branchPartner.formHint }}</p>
        @if(error()){<p role="alert" class="mt-4 rounded-xl bg-rose-50 p-3 font-bold text-rose-800">{{error()}}</p>}
        @if(reference()){
          <div role="status" class="mt-4 rounded-2xl bg-emerald-50 p-5 text-emerald-900"><strong>{{ t().branchPartner.successTitle }}</strong><p class="mt-1 text-sm">{{ t().branchPartner.successReference }} {{reference()}}</p><p class="mt-2 text-xs leading-5">{{ t().branchPartner.successNote }}</p></div>
        }@else{
          <section class="form-section">
            <h3>{{ t().branchPartner.sectionBusiness }}</h3>
            <div class="grid gap-4 md:grid-cols-2">
              <label><span>{{ t().branchPartner.businessName }}</span><input [(ngModel)]="businessName" name="businessName" required maxlength="180" autocomplete="organization" class="field"/></label>
              <label><span>{{ t().branchPartner.businessType }}</span><select [(ngModel)]="businessType" name="businessType" required class="field"><option value="SOLE_PROPRIETORSHIP">{{ t().branchPartner.typeSole }}</option><option value="LIMITED">{{ t().branchPartner.typeLimited }}</option><option value="JOINT_STOCK">{{ t().branchPartner.typeJointStock }}</option><option value="COOPERATIVE">{{ t().branchPartner.typeCooperative }}</option><option value="OTHER">{{ t().branchPartner.typeOther }}</option></select></label>
              <label><span>{{ t().branchPartner.fullName }}</span><input [(ngModel)]="fullName" name="fullName" required maxlength="160" autocomplete="name" class="field"/></label>
              <label><span>{{ t().branchPartner.phone }}</span><input [(ngModel)]="phone" name="phone" type="tel" required maxlength="40" autocomplete="tel" class="field"/></label>
              <label><span>{{ t().branchPartner.email }}</span><input [(ngModel)]="email" name="email" type="email" required maxlength="160" autocomplete="email" class="field"/></label>
              <label><span>{{ t().branchPartner.website }}</span><input [(ngModel)]="businessWebsite" name="businessWebsite" type="url" maxlength="500" [placeholder]="t().branchPartner.websitePlaceholder" class="field"/></label>
            </div>
          </section>

          <section class="form-section">
            <h3>{{ t().branchPartner.sectionVerification }}</h3>
            <p>{{ t().branchPartner.verificationNote }}</p>
            <div class="mt-4 grid gap-4 md:grid-cols-2">
              <label><span>{{ t().branchPartner.taxOffice }}</span><input [(ngModel)]="taxOffice" name="taxOffice" required maxlength="120" class="field"/></label>
              <label><span>{{ t().branchPartner.taxNumber }}</span><input [(ngModel)]="taxNumber" name="taxNumber" inputmode="numeric" required maxlength="11" class="field"/></label>
              <label><span>{{ t().branchPartner.tradeRegistryNo }}</span><input [(ngModel)]="tradeRegistryNo" name="tradeRegistryNo" maxlength="80" class="field"/></label>
              <label><span>{{ t().branchPartner.mersisNo }}</span><input [(ngModel)]="mersisNo" name="mersisNo" inputmode="numeric" maxlength="16" class="field" [placeholder]="t().branchPartner.mersisPlaceholder"/></label>
              <label class="md:col-span-2"><span>{{ t().branchPartner.businessAddress }}</span><textarea [(ngModel)]="businessAddress" name="businessAddress" required maxlength="500" rows="3" class="field"></textarea></label>
            </div>
          </section>

          <section class="form-section">
            <h3>{{ t().branchPartner.sectionOps }}</h3>
            <div class="grid gap-4 md:grid-cols-2">
              <label><span>{{ t().branchPartner.province }}</span><select [(ngModel)]="provinceCode" name="provinceCode" (ngModelChange)="provinceChanged($event)" required class="field" [attr.aria-label]="t().branchPartner.provinceAria"><option value="">{{ t().branchPartner.provinceSelect }}</option>@for(p of geo.provinces();track p.code){<option [value]="p.code">{{p.name}}</option>}</select></label>
              <label><span>{{ t().branchPartner.district }}</span><select [(ngModel)]="districtCode" name="districtCode" (ngModelChange)="districtChanged($event)" [disabled]="!provinceCode" required class="field" [attr.aria-label]="t().branchPartner.districtAria"><option value="">{{ t().branchPartner.districtSelect }}</option>@for(d of districts();track d.code){<option [value]="d.code">{{d.name}}</option>}</select></label>
              <label class="md:col-span-2"><span>{{ t().branchPartner.operatingArea }}</span><input [(ngModel)]="operatingArea" name="operatingArea" maxlength="180" [placeholder]="t().branchPartner.operatingAreaPlaceholder" class="field"/></label>
              <label><span>{{ t().branchPartner.experienceYears }}</span><input type="number" [(ngModel)]="experienceYears" name="experienceYears" min="0" max="60" class="field"/></label>
              <label><span>{{ t().branchPartner.officeStatus }}</span><select [(ngModel)]="officeStatus" name="officeStatus" class="field"><option value="OWN">{{ t().branchPartner.officeOwn }}</option><option value="RENT">{{ t().branchPartner.officeRent }}</option><option value="PLAN">{{ t().branchPartner.officePlan }}</option><option value="NONE">{{ t().branchPartner.officeNone }}</option></select></label>
              <label><span>{{ t().branchPartner.currentFleet }}</span><input type="number" [(ngModel)]="currentFleetSize" name="currentFleetSize" min="0" max="5000" required class="field"/></label>
              <label><span>{{ t().branchPartner.plannedFleet }}</span><input type="number" [(ngModel)]="plannedFleetSize" name="plannedFleetSize" min="1" max="5000" required class="field"/></label>
              <label><span>{{ t().branchPartner.listingModel }}</span><select [(ngModel)]="listingModel" name="listingModel" class="field"><option value="OWN_FLEET">{{ t().branchPartner.listingOwn }}</option><option value="REGIONAL_NETWORK">{{ t().branchPartner.listingNetwork }}</option><option value="BOTH">{{ t().branchPartner.listingBoth }}</option></select></label>
              <label><span>{{ t().branchPartner.budgetRange }}</span><select [(ngModel)]="budgetRange" name="budgetRange" class="field"><option value="DISCUSS">{{ t().branchPartner.budgetDiscuss }}</option><option value="UNDER_100K">{{ t().branchPartner.budgetUnder100k }}</option><option value="100K_250K">{{ t().branchPartner.budget100k250k }}</option><option value="250K_500K">{{ t().branchPartner.budget250k500k }}</option><option value="500K_PLUS">{{ t().branchPartner.budget500kPlus }}</option></select></label>
            </div>

            <fieldset class="mt-5 rounded-2xl border border-slate-200 p-4"><legend class="px-2 text-xs font-black">{{ t().branchPartner.servicesLegend }}</legend><div class="grid gap-2 sm:grid-cols-3"><label class="check"><input type="checkbox" [(ngModel)]="serviceRental" name="serviceRental"/>{{ t().branchPartner.serviceRental }}</label><label class="check"><input type="checkbox" [(ngModel)]="serviceSales" name="serviceSales"/>{{ t().branchPartner.serviceSales }}</label><label class="check"><input type="checkbox" [(ngModel)]="serviceTour" name="serviceTour"/>{{ t().branchPartner.serviceTour }}</label></div></fieldset>
          </section>

          <section class="form-section">
            <h3>{{ t().branchPartner.sectionExtra }}</h3>
            <label><span>{{ t().branchPartner.notes }}</span><textarea [(ngModel)]="notes" name="notes" maxlength="4000" rows="4" class="field"></textarea></label>
            <input [(ngModel)]="website" name="website" tabindex="-1" aria-hidden="true" autocomplete="off" class="hidden"/>
            <label class="consent"><input type="checkbox" [(ngModel)]="accuracyAccepted" name="accuracyAccepted"/>{{ t().branchPartner.consentAccuracy }}</label>
            <label class="consent"><input type="checkbox" [(ngModel)]="privacyAccepted" name="privacyAccepted"/>{{ t().branchPartner.consentPrivacy }}</label>
            <label class="consent"><input type="checkbox" [(ngModel)]="dueDiligenceAccepted" name="dueDiligenceAccepted"/>{{ t().branchPartner.consentDueDiligence }}</label>
          </section>

          <button type="submit" [disabled]="submitting()||!valid()" class="mt-6 min-h-13 w-full rounded-xl bg-prestige-red px-5 py-4 font-black text-white disabled:opacity-40">{{submitting()?t().branchPartner.submitting:t().branchPartner.submit}}</button>
        }
      </form>
    </div>
  </section>
</main>`,
  styles:[`
    .form-section{margin-top:1.25rem;border-top:1px solid #e2e8f0;padding-top:1.15rem}.form-section:first-of-type{border-top:0}.form-section h3{margin:0 0 .25rem;font-weight:900}.form-section>p{margin:.25rem 0 0;color:#64748b;font-size:.75rem;line-height:1.45rem}.form-section label:not(.check):not(.consent){display:grid;gap:.3rem}.form-section label>span{font-size:.67rem;font-weight:900;color:#334155}.field{width:100%;min-height:48px;border:1px solid #cbd5e1;border-radius:12px;padding:.7rem .8rem;background:#f8fafc}.check{display:flex;align-items:center;gap:.5rem;font-size:.875rem}.consent{display:flex;align-items:flex-start;gap:.65rem;margin-top:.85rem;font-size:.82rem;line-height:1.35rem}.consent input{margin-top:.2rem;flex:0 0 auto}input:focus-visible,select:focus-visible,textarea:focus-visible,button:focus-visible{outline:3px solid #E15A62;outline-offset:2px}
  `],
})
export class BranchPartnerV171Component implements OnInit {
  readonly geo=inject(GeoDirectoryService);
  private readonly service=inject(BranchPartnerService);
  private readonly ui=inject(UiService);
  readonly t=this.ui.translations;

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

  ngOnInit():void{void this.geo.ensureLoaded().catch(()=>this.error.set(this.t().branchPartner.geoLoadError));}

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
    const bp=this.t().branchPartner;
    if(code.includes("RATE_LIMITED"))return bp.errRateLimited;
    if(code.includes("BUSINESS_DUE_DILIGENCE"))return bp.errDueDiligence;
    if(code.includes("INVALID_REQUIRED_FIELDS"))return bp.errRequired;
    return bp.errGeneric;
  }
}
