import { CommonModule } from "@angular/common";
import { Component, OnInit, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatIconModule } from "@angular/material/icon";
import { ActivatedRoute, Router } from "@angular/router";
import { Branch, BranchPublicStatus, BranchServiceType } from "../../models/branch.model";
import { BranchService } from "../../services/branch.service";
import { AdminBranchOperationsV171Service, BranchLifecycleStatusV171 } from "../../services/admin-branch-operations-v171.service";
import { ToastService } from "../../services/toast.service";

@Component({
  selector: "app-admin-branches",
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <main class="min-h-screen bg-slate-100 pb-20 text-slate-900">
      <header class="sticky top-0 z-30 border-b border-slate-200 bg-white shadow-sm">
        <div class="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 md:px-8">
          <div class="flex min-w-0 items-center gap-3">
            <button type="button" (click)="router.navigate(['/admin/dashboard'])" aria-label="Kontrol paneline dön" class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"><mat-icon aria-hidden="true">arrow_back</mat-icon></button>
            <div class="min-w-0"><h1 class="truncate text-xl font-black">Şube Yönetimi</h1><p class="text-xs text-slate-500">Şube bilgisi, doğrulama, açma, askıya alma, kapatma ve ağ kontrolü tek merkezde</p></div>
          </div>
          <button type="button" (click)="newBranch()" class="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 font-black text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"><mat-icon aria-hidden="true">add</mat-icon><span>Merkez Şubesi Ekle</span></button>
        </div>
      </header>

      <section class="mx-auto max-w-7xl px-4 pt-5 md:px-8" aria-label="Şube filtreleri">
        <div class="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-5">
          <label class="grid gap-1 text-xs font-black text-slate-600 md:col-span-2">Şube / işletme / il / ilçe ara
            <input [(ngModel)]="searchQuery" type="search" autocomplete="off" placeholder="Örn. Van, İpekyolu, işletme adı…" class="field" />
          </label>
          <label class="grid gap-1 text-xs font-black text-slate-600">Durum
            <select [(ngModel)]="statusFilter" class="field"><option value="ALL">Tümü</option><option value="ACTIVE">Canlı</option><option value="DRAFT">Kurulum</option><option value="SUSPENDED">Askıda</option><option value="CLOSED">Kapalı</option></select>
          </label>
          <label class="grid gap-1 text-xs font-black text-slate-600">Oluşturulma başlangıcı
            <input [(ngModel)]="dateFrom" type="date" class="field" aria-label="Şube oluşturulma başlangıç tarihi" />
          </label>
          <label class="grid gap-1 text-xs font-black text-slate-600">Oluşturulma bitişi
            <input [(ngModel)]="dateTo" type="date" class="field" aria-label="Şube oluşturulma bitiş tarihi" />
          </label>
        </div>
      </section>

      <div class="mx-auto grid max-w-7xl gap-6 px-4 py-6 md:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(360px,480px)]">
        <section class="space-y-3" aria-label="Şube listesi">
          @for (branch of filteredBranches(); track branch.cloudId || branch.id) {
            <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" [class.opacity-70]="branch.publicStatus==='SUSPENDED' || branch.publicStatus==='CLOSED'">
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2"><span class="text-xs font-bold uppercase tracking-wider text-blue-700">{{ branch.city }} / {{ branch.district }} · {{ branch.country || 'Türkiye' }}</span><span class="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-600">{{ networkLabel(branch) }}</span>@if(branch.operatorVerified){<span class="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700">İşletme doğrulandı</span>}</div>
                  <h2 class="mt-1 text-lg font-black">{{ branch.operatorName || branch.name }}</h2>
                  @if(branch.operatorLegalName){<p class="text-xs font-semibold text-slate-500">Yasal unvan: {{branch.operatorLegalName}}</p>}
                  <p class="mt-2 text-sm text-slate-600">{{ branch.addressLabel || 'Adres henüz tamamlanmadı' }}</p>
                  <p class="mt-1 text-sm font-bold">{{ branch.phone || 'Telefon henüz tamamlanmadı' }}</p>
                  <p class="mt-1 text-xs font-semibold text-slate-500">Saat dilimi: {{ branch.timezone || 'Europe/Istanbul' }}</p>
                  @if(branch.territoryLabel){<p class="mt-2 text-xs text-slate-500">Hizmet bölgesi: {{ branch.territoryLabel }}</p>}
                  @if(branch.statusChangedAt){<p class="mt-2 text-xs text-slate-500">Son durum değişikliği: {{branch.statusChangedAt | date:'dd.MM.yyyy HH:mm'}}</p>}
                  @if(branch.lifecycleReason){<p class="mt-2 rounded-xl bg-amber-50 p-2 text-xs font-bold text-amber-900">Durum nedeni: {{branch.lifecycleReason}}</p>}
                </div>
                <span [class]="statusClass(branch)" class="rounded-full px-3 py-1 text-xs font-black">{{ statusLabel(branch) }}</span>
              </div>
              <div class="mt-4 flex flex-wrap gap-2">@for (service of branch.services; track service) { <span class="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600">{{ serviceLabel(service) }}</span> }</div>
              <div class="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                <button type="button" (click)="editBranch(branch)" class="min-h-11 rounded-xl border border-slate-300 px-3 font-black hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">Bilgileri Düzenle</button>
                @if (branch.networkType === 'FRANCHISE' || branch.networkType === 'PARTNER') {<button type="button" (click)="openNetwork(branch)" class="min-h-11 rounded-xl bg-violet-700 px-3 font-black text-white">Ağ Kontrolü</button>}
                @if(statusOf(branch)==='ACTIVE'){
                  <button type="button" (click)="openLifecycle(branch,'SUSPENDED')" class="min-h-11 rounded-xl bg-amber-500 px-3 font-black text-slate-950">Askıya Al</button>
                  <button type="button" (click)="openLifecycle(branch,'CLOSED')" class="min-h-11 rounded-xl bg-rose-700 px-3 font-black text-white">Şubeyi Kapat</button>
                } @else if(statusOf(branch)==='SUSPENDED') {
                  <button type="button" (click)="openLifecycle(branch,'ACTIVE')" class="min-h-11 rounded-xl bg-emerald-600 px-3 font-black text-white">Yeniden Aç</button>
                  <button type="button" (click)="openLifecycle(branch,'CLOSED')" class="min-h-11 rounded-xl bg-rose-700 px-3 font-black text-white">Tamamen Kapat</button>
                } @else if(statusOf(branch)==='CLOSED' || statusOf(branch)==='DRAFT') {
                  <button type="button" (click)="openLifecycle(branch,'ACTIVE')" class="min-h-11 rounded-xl bg-emerald-600 px-3 font-black text-white">Şubeyi Aç</button>
                }
              </div>
            </article>
          } @empty {<div class="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-bold text-slate-500">Bu filtrelere uyan şube yok.</div>}
        </section>

        <section class="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-24" aria-label="Şube düzenleme formu">
          <div class="mb-5 flex items-center justify-between gap-3"><div><h2 class="text-lg font-black">{{ isNew() ? 'Yeni Merkez Şubesi' : 'Şubeyi Düzenle' }}</h2><p class="text-xs text-slate-500">Gerçek işletme bilgilerini ve yerel saat dilimini eksiksiz girin</p></div><mat-icon class="text-slate-400" aria-hidden="true">storefront</mat-icon></div>
          @if (!isNew() && (draft.networkType === 'FRANCHISE' || draft.networkType === 'PARTNER')) {<div class="mb-4 rounded-xl border border-violet-200 bg-violet-50 p-3 text-xs font-semibold leading-5 text-violet-900">Bu şube yetkili iş ortağıdır. Kimlik doğrulaması ve bayi sözleşmesi Ağ Kontrolü / Şube Kimlikleri ekranından yönetilir. Durum açma-kapama yetkisi Super Admin’dedir.</div>}
          <div class="space-y-4">
            <label class="block"><span class="field-label">Şube Kimliği</span><input [(ngModel)]="draft.id" [disabled]="!isNew()" class="field" placeholder="yuksekova-merkez" /></label>
            <label class="block"><span class="field-label">Şube Adı</span><input [(ngModel)]="draft.name" class="field" placeholder="Yüksekova Merkez" /></label>
            <div class="grid grid-cols-2 gap-3"><label class="block"><span class="field-label">Şehir</span><input [(ngModel)]="draft.city" class="field" /></label><label class="block"><span class="field-label">İlçe</span><input [(ngModel)]="draft.district" class="field" /></label></div>
            <label class="block"><span class="field-label">Ülke</span><input [(ngModel)]="draft.country" class="field" autocomplete="country-name" placeholder="Türkiye" /></label>
            <label class="block"><span class="field-label">Adres</span><textarea [(ngModel)]="draft.addressLabel" rows="3" class="field"></textarea></label>
            <label class="block"><span class="field-label">Telefon</span><input [(ngModel)]="draft.phone" type="tel" class="field" /></label>
            <label class="block"><span class="field-label">WhatsApp</span><input [(ngModel)]="draft.whatsapp" type="tel" class="field" /></label>
            <label class="block"><span class="field-label">E-posta</span><input [(ngModel)]="draft.email" type="email" class="field" /></label>
            <label class="block"><span class="field-label">Saat Dilimi</span><input [(ngModel)]="draft.timezone" class="field" placeholder="Europe/Istanbul" aria-describedby="branch-timezone-help" /><small id="branch-timezone-help" class="mt-1 block text-xs text-slate-500">IANA saat dilimi kullanın. Rezervasyon saatleri buna göre UTC'ye çevrilir.</small></label>
            <label class="block"><span class="field-label">Hizmet Bölgesi</span><input [(ngModel)]="draft.territoryLabel" class="field" placeholder="Yüksekova merkez ve çevresi" /></label>
            <label class="block"><span class="field-label">Halka Açık Açıklama</span><textarea [(ngModel)]="draft.publicDescription" rows="4" class="field"></textarea></label>
            <label class="block"><span class="field-label">Harita URL'si</span><input [(ngModel)]="draft.mapUrl" type="url" class="field" placeholder="Gerçek harita bağlantısı" /></label>
            <label class="block"><span class="field-label">Öncelik</span><input [(ngModel)]="draft.priority" type="number" min="0" max="9999" class="field" /></label>
            <fieldset class="rounded-xl border border-slate-200 p-4"><legend class="px-1 text-xs font-black uppercase tracking-wider text-slate-500">Hizmetler</legend><div class="grid grid-cols-2 gap-2 pt-2">@for (service of serviceOptions; track service) {<label class="flex min-h-11 items-center gap-2 rounded-lg bg-slate-50 px-3 text-sm font-bold"><input type="checkbox" [checked]="hasService(service)" (change)="toggleService(service, $event)" class="h-5 w-5" />{{ serviceLabel(service) }}</label>}</div></fieldset>
            <div class="grid gap-2 sm:grid-cols-2"><label class="check-row"><input type="checkbox" [(ngModel)]="draft.isPickupPoint" />Teslim Alma</label><label class="check-row"><input type="checkbox" [(ngModel)]="draft.isReturnPoint" />İade</label></div>
            @if (errorMessage()) {<div role="alert" class="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800">{{ errorMessage() }}</div>}
            <button type="button" (click)="save()" [disabled]="saving()" class="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 font-black text-white disabled:opacity-50">@if (saving()) {<mat-icon class="animate-spin" aria-hidden="true">progress_activity</mat-icon> Kaydediliyor...} @else {<mat-icon aria-hidden="true">save</mat-icon> Şube Bilgilerini Kaydet}</button>
            @if (!isNew() && (draft.networkType === 'FRANCHISE' || draft.networkType === 'PARTNER')) {<button type="button" (click)="openNetwork(draft)" class="min-h-12 w-full rounded-xl bg-violet-700 px-4 font-black text-white">Bayi Ağ Kontrolüne Git</button>}
          </div>
        </section>
      </div>

      @if(lifecycleTarget()){
        <div class="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4" role="presentation" (click)="cancelLifecycle()">
          <section role="dialog" aria-modal="true" aria-labelledby="branch-lifecycle-title" class="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl" (click)="$event.stopPropagation()">
            <h2 id="branch-lifecycle-title" class="text-xl font-black">{{lifecycleTitle()}}</h2>
            <p class="mt-2 text-sm leading-6 text-slate-600">{{lifecycleTarget()!.name}} için bu değişiklik anında public görünürlüğü ve şube çalışma yetkisini etkiler. İşlem audit kaydına yazılır.</p>
            @if(lifecycleStatus()!=='ACTIVE'){
              <label class="mt-5 grid gap-2 text-xs font-black text-slate-600">İşlem nedeni *<textarea [(ngModel)]="lifecycleReason" rows="4" maxlength="500" class="field" placeholder="Örn. sözleşme incelemesi, ödeme uyuşmazlığı, işletme talebi…"></textarea></label>
            } @else {
              <div class="mt-5 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">Yeniden açma sırasında kimlik, abonelik ve yayın bütünlüğü kontrolleri veritabanı tarafından tekrar uygulanır.</div>
            }
            <div class="mt-6 grid grid-cols-2 gap-3"><button type="button" (click)="cancelLifecycle()" class="min-h-12 rounded-xl border border-slate-300 font-black">Vazgeç</button><button type="button" (click)="confirmLifecycle()" [disabled]="saving()" class="min-h-12 rounded-xl bg-slate-950 font-black text-white disabled:opacity-50">Onayla</button></div>
          </section>
        </div>
      }
    </main>
  `,
  styles: [`.field-label{display:block;margin-bottom:.4rem;font-size:.7rem;font-weight:900;text-transform:uppercase;letter-spacing:.08em;color:#64748b}.field{min-height:48px;width:100%;border:1px solid #cbd5e1;border-radius:.75rem;padding:.7rem .85rem;outline:none;background:white}.field:focus{box-shadow:0 0 0 2px #3b82f6;border-color:#3b82f6}.check-row{display:flex;min-height:48px;align-items:center;gap:.5rem;border-radius:.75rem;background:#f8fafc;padding:0 .75rem;font-size:.8rem;font-weight:800}.check-row input{width:20px;height:20px}`],
})
export class AdminBranchesComponent implements OnInit {
  readonly branchService=inject(BranchService);readonly toastService=inject(ToastService);readonly router=inject(Router);private readonly route=inject(ActivatedRoute);private readonly operations=inject(AdminBranchOperationsV171Service);readonly saving=signal(false);readonly isNew=signal(true);readonly errorMessage=signal("");readonly lifecycleTarget=signal<Branch|null>(null);readonly lifecycleStatus=signal<BranchLifecycleStatusV171>("SUSPENDED");readonly serviceOptions:BranchServiceType[]=["RENTAL","SALES","TOUR","TRANSFER","PICKUP","RETURN"];
  draft:Branch=this.emptyBranch();searchQuery="";statusFilter="ALL";dateFrom="";dateTo="";lifecycleReason="";
  ngOnInit():void{const branchId=this.route.snapshot.queryParamMap.get("branch");if(branchId){void this.router.navigate(["/admin/branch-network",branchId],{replaceUrl:true});return;}void this.loadAdminBranches();}
  filteredBranches():Branch[]{const q=this.searchQuery.trim().toLocaleLowerCase("tr-TR"),from=this.dateFrom?new Date(`${this.dateFrom}T00:00:00`).getTime():null,to=this.dateTo?new Date(`${this.dateTo}T23:59:59.999`).getTime():null;return this.branchService.managedBranches().filter(branch=>{const status=this.statusOf(branch);if(this.statusFilter!=="ALL"&&status!==this.statusFilter)return false;const created=branch.createdAt?new Date(branch.createdAt).getTime():null;if(from!==null&&created!==null&&created<from)return false;if(to!==null&&created!==null&&created>to)return false;if(!q)return true;return `${branch.name} ${branch.operatorName||""} ${branch.operatorLegalName||""} ${branch.city} ${branch.district} ${branch.provinceCode||""} ${branch.districtCode||""} ${branch.addressLabel||""} ${branch.phone||""}`.toLocaleLowerCase("tr-TR").includes(q);});}
  private async loadAdminBranches():Promise<void>{try{await this.branchService.refreshAdmin();}catch(error){console.error("Admin branch load failed",error);this.errorMessage.set("Şube verileri yüklenemedi. Yönetici oturumunu ve Supabase yetkilerini kontrol edin.");}}
  newBranch():void{this.isNew.set(true);this.errorMessage.set("");this.draft=this.emptyBranch();}editBranch(branch:Branch):void{this.isNew.set(false);this.errorMessage.set("");this.draft=this.clone(branch);}openNetwork(branch:Branch):void{const id=branch.cloudId;if(!id){this.toastService.show("Bu şubenin veritabanı kimliği bulunamadı.","error");return;}void this.router.navigate(["/admin/branch-network",id]);}
  async save():Promise<void>{if(this.saving())return;this.saving.set(true);this.errorMessage.set("");try{await this.branchService.save(this.clone(this.draft));await this.branchService.refreshAdmin();this.toastService.show("Şube bilgileri kaydedildi.","success");this.isNew.set(false);}catch(error){console.error("Branch save failed",error);this.errorMessage.set("Şube kaydedilemedi. Zorunlu alanları ve yönetici yetkilerini kontrol edin.");this.toastService.show("Şube kaydedilemedi.","error");}finally{this.saving.set(false);}}
  openLifecycle(branch:Branch,status:BranchLifecycleStatusV171):void{this.lifecycleTarget.set(branch);this.lifecycleStatus.set(status);this.lifecycleReason="";}
  cancelLifecycle():void{this.lifecycleTarget.set(null);this.lifecycleReason="";}
  async confirmLifecycle():Promise<void>{const branch=this.lifecycleTarget();if(!branch?.cloudId||this.saving())return;if(this.lifecycleStatus()!=="ACTIVE"&&!this.lifecycleReason.trim()){this.toastService.show("Askıya alma veya kapatma nedeni zorunludur.","error");return;}this.saving.set(true);try{await this.operations.setLifecycle(branch.cloudId,this.lifecycleStatus(),this.lifecycleReason);await this.branchService.refreshAdmin();this.toastService.show(this.lifecycleStatus()==="ACTIVE"?"Şube yeniden açıldı.":this.lifecycleStatus()==="CLOSED"?"Şube kapatıldı.":"Şube askıya alındı.","success");this.cancelLifecycle();}catch(error){this.toastService.show(error instanceof Error?error.message:"Şube durumu değiştirilemedi.","error");}finally{this.saving.set(false);}}
  lifecycleTitle():string{return this.lifecycleStatus()==="ACTIVE"?"Şubeyi yeniden aç":this.lifecycleStatus()==="CLOSED"?"Şubeyi kapat":"Şubeyi askıya al";}
  hasService(service:BranchServiceType):boolean{return this.draft.services.includes(service);}toggleService(service:BranchServiceType,event:Event):void{const checked=(event.target as HTMLInputElement).checked;this.draft.services=checked?Array.from(new Set([...this.draft.services,service])):this.draft.services.filter(current=>current!==service);}
  serviceLabel(service:BranchServiceType):string{return({RENTAL:"Kiralama",SALES:"Satış",TOUR:"Tur",TRANSFER:"Transfer",PICKUP:"Teslim Alma",RETURN:"İade"} as Record<BranchServiceType,string>)[service];}networkLabel(branch:Branch):string{return branch.networkType==="FRANCHISE"?"Yetkili İş Ortağı":branch.networkType==="PARTNER"?"Bölgesel Partner":"Merkez Şubesi";}statusOf(branch:Branch):BranchPublicStatus{return (branch.publicStatus||(branch.isActive?"ACTIVE":"SUSPENDED")) as BranchPublicStatus;}statusLabel(branch:Branch):string{return({ACTIVE:"Canlı",DRAFT:"Kurulum",SUSPENDED:"Askıda",CLOSED:"Kapalı"} as Record<BranchPublicStatus,string>)[this.statusOf(branch)];}statusClass(branch:Branch):string{const status=this.statusOf(branch);if(status==="ACTIVE")return"bg-emerald-100 text-emerald-800";if(status==="DRAFT")return"bg-amber-100 text-amber-800";if(status==="SUSPENDED")return"bg-orange-100 text-orange-800";return"bg-rose-100 text-rose-800";}
  private emptyBranch():Branch{return{id:"",name:"",city:"Hakkari",district:"Yüksekova",country:"Türkiye",addressLabel:"",phone:"",whatsapp:"",email:"",timezone:"Europe/Istanbul",mapUrl:"",workingHours:[{label:"Çalışma saatleri",value:""}],services:["RENTAL","PICKUP","RETURN"],isActive:false,isPickupPoint:true,isReturnPoint:true,priority:10,networkType:"OWNED",publicStatus:"DRAFT",customerGuaranteeEnabled:true,centralPricingRequired:true,listingRequiresApproval:true};}
  private clone(branch:Branch):Branch{return{...branch,country:branch.country||"Türkiye",timezone:branch.timezone||"Europe/Istanbul",services:[...branch.services],workingHours:branch.workingHours.map(row=>({...row}))};}
}
