import { CommonModule } from "@angular/common";
import { Component, OnInit, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { AccessibleNativeDateComponent } from "../../components/accessible-native-date.component";
import { AdminBranchOperationsV171Service, VehicleRegistryRowV171 } from "../../services/admin-branch-operations-v171.service";
import { BranchService } from "../../services/branch.service";
import { ToastService } from "../../services/toast.service";

@Component({selector:"app-admin-vehicle-registry-v171",standalone:true,imports:[CommonModule,FormsModule,AccessibleNativeDateComponent],template:`
<main class="min-h-screen bg-slate-100 p-4 text-slate-900 md:p-6">
  <section class="mx-auto max-w-7xl">
    <header class="rounded-3xl bg-slate-950 p-6 text-white shadow-xl"><p class="text-xs font-black uppercase tracking-[.18em] text-blue-300">Super Admin · Özel Araç Sicili</p><h1 class="mt-2 text-3xl font-black">Plaka, VIN / Şasi ve Ruhsat Arama</h1><p class="mt-3 max-w-3xl text-sm leading-6 text-slate-300">Bu alan yalnız yönetim içindir. Plaka, VIN/şasi ve ruhsat referansı public katalog API'lerine gönderilmez. Stok kodu, araç modeli, şube ve kayıt tarihiyle birlikte aranabilir.</p></header>

    <section class="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" aria-label="Araç sicili filtreleri">
      <div class="grid gap-3 md:grid-cols-5">
        <label class="grid gap-1 text-xs font-black text-slate-600 md:col-span-2">Plaka / VIN / ruhsat / stok kodu / araç
          <input [(ngModel)]="query" (keyup.enter)="search()" type="search" autocomplete="off" class="field" placeholder="Örn. 30ABC123, WBA..., ruhsat no, BR-..." />
        </label>
        <label class="grid gap-1 text-xs font-black text-slate-600">Şube
          <select [(ngModel)]="branchId" class="field"><option value="">Tüm şubeler</option>@for(branch of branches.managedBranches();track branch.cloudId||branch.id){<option [value]="branch.cloudId">{{branch.operatorName||branch.name}} · {{branch.city}}/{{branch.district}}</option>}</select>
        </label>
        <app-accessible-native-date class="admin-date" label="Kayıt başlangıcı" [value]="from" (valueChange)="from=$event" />
        <app-accessible-native-date class="admin-date" label="Kayıt bitişi" [value]="to" [min]="from" (valueChange)="to=$event" />
      </div>
      <div class="mt-4 flex flex-wrap gap-2"><button type="button" (click)="search()" [disabled]="loading()" class="min-h-11 rounded-xl bg-blue-600 px-5 font-black text-white disabled:opacity-50">{{loading()?'Aranıyor…':'Ara'}}</button><button type="button" (click)="clear()" class="min-h-11 rounded-xl border border-slate-300 px-5 font-black">Filtreleri Temizle</button></div>
    </section>

    @if(error()){<p role="alert" class="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 font-bold text-rose-800">{{error()}}</p>}
    <section class="mt-5 grid gap-3" aria-label="Araç sicili sonuçları">
      @for(row of rows();track row.id){
        <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div class="min-w-0"><div class="flex flex-wrap gap-2"><span class="badge">{{row.category}}</span><span class="badge">{{row.publication_status}}</span>@if(row.branch_name){<span class="badge">{{row.branch_name}}</span>}</div><h2 class="mt-2 text-xl font-black">{{row.brand}} {{row.model}} @if(row.model_year){<span class="text-slate-400">· {{row.model_year}}</span>}</h2><p class="mt-1 text-sm text-slate-500">Stok: <strong>{{row.stock_code}}</strong> · Oluşturma: {{row.created_at|date:'dd.MM.yyyy HH:mm'}} · Güncelleme: {{row.updated_at|date:'dd.MM.yyyy HH:mm'}}</p></div>
            <button type="button" (click)="edit(row)" class="min-h-11 rounded-xl bg-slate-950 px-4 font-black text-white">Kimlik Bilgilerini Düzenle</button>
          </div>
          <div class="mt-4 grid gap-3 sm:grid-cols-3"><div class="data"><span>Plaka</span><strong>{{row.license_plate||'Kayıt yok'}}</strong></div><div class="data"><span>VIN / Şasi</span><strong>{{row.vin||'Kayıt yok'}}</strong></div><div class="data"><span>Ruhsat Referansı</span><strong>{{row.registration_reference||'Kayıt yok'}}</strong></div></div>
        </article>
      } @empty {<div class="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-10 text-center text-sm font-bold text-slate-500">Arama kriterlerine uyan araç sicili kaydı yok.</div>}
    </section>
  </section>

  @if(selected()){
    <div class="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4" role="presentation" (click)="cancelEdit()"><section role="dialog" aria-modal="true" aria-labelledby="vehicle-registry-edit-title" class="w-full max-w-lg rounded-3xl bg-white p-6" (click)="$event.stopPropagation()"><h2 id="vehicle-registry-edit-title" class="text-xl font-black">Araç Kimlik Bilgileri</h2><p class="mt-2 text-sm text-slate-500">{{selected()!.brand}} {{selected()!.model}} · {{selected()!.stock_code}}</p><div class="mt-5 grid gap-4"><label class="grid gap-1 text-xs font-black text-slate-600">Plaka<input [(ngModel)]="licensePlate" maxlength="16" class="field" placeholder="30ABC123" /></label><label class="grid gap-1 text-xs font-black text-slate-600">VIN / Şasi (17 karakter)<input [(ngModel)]="vin" maxlength="17" class="field" placeholder="WBA..." /></label><label class="grid gap-1 text-xs font-black text-slate-600">Ruhsat referansı<input [(ngModel)]="registrationReference" maxlength="80" class="field" placeholder="İç yönetim referansı" /></label><p class="rounded-xl bg-amber-50 p-3 text-xs font-semibold leading-5 text-amber-900">Bu bilgiler müşteri kartında gösterilmez. Yalnız yetkili yönetim kullanıcılarının araç eşleştirme ve operasyon kontrolü içindir.</p></div><div class="mt-6 grid grid-cols-2 gap-3"><button type="button" (click)="cancelEdit()" class="min-h-12 rounded-xl border border-slate-300 font-black">Vazgeç</button><button type="button" (click)="save()" [disabled]="saving()" class="min-h-12 rounded-xl bg-blue-600 font-black text-white disabled:opacity-50">Kaydet</button></div></section></div>
  }
</main>`,styles:[`.field{min-height:46px;width:100%;border:1px solid #cbd5e1;border-radius:12px;background:#fff;padding:.65rem .75rem;outline:none}.field:focus{border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.13)}.admin-date{--date-bg:#fff;--date-color:#0f172a;--date-label:#475569;--date-border:#cbd5e1;--date-hint:#64748b;--date-icon:#2563eb;--date-focus:#2563eb}.badge{border-radius:999px;background:#f1f5f9;padding:.3rem .55rem;font-size:.65rem;font-weight:900;color:#475569}.data{border:1px solid #e2e8f0;border-radius:14px;background:#f8fafc;padding:.8rem}.data span{display:block;font-size:.62rem;font-weight:900;text-transform:uppercase;color:#64748b}.data strong{display:block;margin-top:.3rem;overflow-wrap:anywhere}`]})
export class AdminVehicleRegistryV171Component implements OnInit{
  readonly branches=inject(BranchService);private readonly operations=inject(AdminBranchOperationsV171Service);private readonly toast=inject(ToastService);readonly rows=signal<VehicleRegistryRowV171[]>([]);readonly loading=signal(false);readonly saving=signal(false);readonly error=signal("");readonly selected=signal<VehicleRegistryRowV171|null>(null);query="";branchId="";from="";to="";licensePlate="";vin="";registrationReference="";
  async ngOnInit(){try{await this.branches.refreshAdmin();await this.search();}catch(error){this.error.set(error instanceof Error?error.message:"Araç sicili açılamadı.");}}
  async search(){if(this.loading())return;this.loading.set(true);this.error.set("");try{this.rows.set(await this.operations.searchVehicleRegistry({query:this.query,branchId:this.branchId,from:this.from,to:this.to,limit:150}));}catch(error){this.error.set(error instanceof Error?error.message:"Araç sicili aranamadı.");}finally{this.loading.set(false);}}
  clear(){this.query="";this.branchId="";this.from="";this.to="";void this.search();}
  edit(row:VehicleRegistryRowV171){this.selected.set(row);this.licensePlate=row.license_plate||"";this.vin=row.vin||"";this.registrationReference=row.registration_reference||"";}
  cancelEdit(){this.selected.set(null);this.licensePlate="";this.vin="";this.registrationReference="";}
  async save(){const row=this.selected();if(!row||this.saving())return;this.saving.set(true);try{await this.operations.saveVehicleIdentifiers(row.id,{licensePlate:this.licensePlate,vin:this.vin,registrationReference:this.registrationReference});this.toast.show("Araç kimlik bilgileri kaydedildi.","success");this.cancelEdit();await this.search();}catch(error){this.toast.show(error instanceof Error?error.message:"Araç kimlik bilgileri kaydedilemedi.","error");}finally{this.saving.set(false);}}
}
