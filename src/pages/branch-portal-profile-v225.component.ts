import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BranchMediaV171, BranchMediaV171Service } from '../services/branch-media-v171.service';
import { BranchPortalProfileService } from '../services/branch-portal-profile.service';
import { BranchPortalService } from '../services/branch-portal.service';

@Component({
  selector:'app-branch-portal-profile-v225',
  standalone:true,
  imports:[CommonModule,FormsModule],
  template:`
<section class="tool" aria-labelledby="branch-profile-title">
  <header class="tool-head"><div><p>ŞUBE PROFİLİ</p><h2 id="branch-profile-title">Hakkında, iletişim, sosyal hesaplar ve profil görseli</h2><span>Müşterilerin şube sayfasında gördüğü halka açık bilgiler. Banka, vergi ve ödeme bilgileri burada tutulmaz.</span></div></header>
  @if(message()){<p class="notice success" role="status">{{message()}}</p>}@if(error()){<p class="notice error" role="alert">{{error()}}</p>}

  <div class="card media-card">
    <div class="card-head"><div><h3>Profil / Kapak Fotoğrafı</h3><p>Şube sayfanızın üst bölümünde görünür. Yükleme mevcut güvenli şube medya stüdyosunu kullanır.</p></div></div>
    <div class="media-layout">
      <div class="cover-preview">@if(currentCover();as cover){<img [src]="cover.url" [alt]="cover.altText||'Şube profil fotoğrafı'"/>}@else{<div class="cover-empty"><strong>Profil fotoğrafı eklenmedi</strong><span>JPEG, PNG, WebP veya AVIF</span></div>}</div>
      <div class="media-actions"><label class="upload"><span>{{uploading()?'Yükleniyor…':'Yeni Profil / Kapak Fotoğrafı Yükle'}}</span><input type="file" accept="image/jpeg,image/png,image/webp,image/avif" (change)="uploadCover($event)" [disabled]="uploading()"/></label>@if(uploading()){<small>Yükleme: %{{mediaService.progress()}}</small>}<p>Profil fotoğrafı olarak seçilen görsel aynı zamanda şube galerinizde güvenli biçimde tutulur.</p></div>
    </div>
    @if(images().length>1){<div class="media-strip">@for(item of images();track item.id){<article [class.selected]="item.isCover"><img [src]="item.url" [alt]="item.altText"/><button type="button" (click)="makeCover(item)" [disabled]="item.isCover||uploading()">{{item.isCover?'Aktif Profil Fotoğrafı':'Profil Fotoğrafı Yap'}}</button></article>}</div>}
  </div>

  <div class="card"><div class="grid"><label class="wide"><span>Şube Hakkında</span><textarea [(ngModel)]="form.publicDescription" name="branchAbout" rows="5" maxlength="4000" placeholder="İşletmenizi, uzmanlığınızı, hizmet yaklaşımınızı ve bölgenizi müşteriye açık biçimde anlatın."></textarea></label><label class="wide"><span>Adres</span><input [(ngModel)]="form.addressLabel" name="branchAddress" maxlength="240" autocomplete="street-address" /></label><label><span>Telefon</span><input [(ngModel)]="form.phone" name="branchPhone" maxlength="40" autocomplete="tel" /></label><label><span>WhatsApp</span><input [(ngModel)]="form.whatsapp" name="branchWhatsapp" maxlength="40" autocomplete="tel" /></label><label><span>E-posta</span><input [(ngModel)]="form.email" name="branchEmail" maxlength="160" autocomplete="email" /></label><label><span>Hizmet Bölgesi</span><input [(ngModel)]="form.territoryLabel" name="branchTerritory" maxlength="240" /></label></div></div>

  <div class="card"><div class="card-head"><div><h3>Sosyal Medya</h3><p>Yalnız HTTPS bağlantıları kabul edilir. Boş hesap halka açık profilde görünmez.</p></div></div><div class="grid"><label><span>Instagram</span><input [(ngModel)]="form.instagramUrl" name="instagramUrl" type="url" placeholder="https://instagram.com/..." /></label><label><span>Facebook</span><input [(ngModel)]="form.facebookUrl" name="facebookUrl" type="url" placeholder="https://facebook.com/..." /></label><label><span>TikTok</span><input [(ngModel)]="form.tiktokUrl" name="tiktokUrl" type="url" placeholder="https://tiktok.com/@..." /></label><label><span>YouTube</span><input [(ngModel)]="form.youtubeUrl" name="youtubeUrl" type="url" placeholder="https://youtube.com/@..." /></label><label class="wide"><span>X</span><input [(ngModel)]="form.xUrl" name="xUrl" type="url" placeholder="https://x.com/..." /></label></div></div>

  <div class="card"><div class="card-head"><div><h3>Çalışma Saatleri</h3><p>En fazla 14 satır. Müşteriye açık şube profilinde gösterilir.</p></div><button type="button" (click)="addHour()">Saat Ekle</button></div><div class="hours">@for(row of form.workingHours;track $index){<div><input [(ngModel)]="row.label" [name]="'hourLabel'+$index" [attr.aria-label]="'Çalışma günü '+($index+1)" placeholder="Pazartesi" maxlength="80"/><input [(ngModel)]="row.value" [name]="'hourValue'+$index" [attr.aria-label]="'Çalışma saati '+($index+1)" placeholder="08:00 - 18:00" maxlength="120"/><button type="button" (click)="removeHour($index)" aria-label="Çalışma saati satırını kaldır">Sil</button></div>}@empty{<p>Çalışma saati eklenmemiş.</p>}</div></div>

  <div class="actions"><button type="button" class="primary" (click)="save()" [disabled]="saving()">{{saving()?'Kaydediliyor…':'Profili Kaydet'}}</button></div>
</section>`,
  styles:[`
    :host{display:block}.tool{color:#0f172a}.tool-head{margin-bottom:14px}.tool-head p{margin:0;color:#2563eb;font-size:10px;font-weight:950;letter-spacing:.13em}.tool-head h2{margin:5px 0 0;font-size:22px}.tool-head span,.card-head p{display:block;margin-top:5px;color:#64748b;font-size:12px;line-height:1.5}.card{margin-top:12px;overflow:hidden;border:1px solid #e2e8f0;border-radius:18px;background:#fff}.card-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px;border-bottom:1px solid #e2e8f0}.card-head h3{margin:0;font-size:16px}.card-head button,.hours button,.primary{min-height:42px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;padding:0 13px;font-weight:900}.grid{display:grid;gap:10px;padding:14px}.grid label{display:grid;gap:5px}.grid span{color:#475569;font-size:10px;font-weight:900}.grid input,.grid textarea,.hours input{width:100%;border:1px solid #cbd5e1;border-radius:10px;background:#fff;padding:10px;color:#0f172a;font:inherit;font-size:12px}.grid input{min-height:44px}.hours{display:grid;gap:8px;padding:14px}.hours>div{display:grid;grid-template-columns:1fr 1fr auto;gap:8px}.hours>p{color:#64748b;font-size:12px}.actions{display:flex;justify-content:flex-end;padding-top:14px}.primary{border-color:#2563eb;background:#2563eb;color:#fff}.notice{margin:10px 0;border-radius:10px;padding:10px;font-size:12px}.success{background:#ecfdf5;color:#065f46}.error{background:#fff1f2;color:#9f1239}.media-layout{display:grid;gap:14px;padding:14px}.cover-preview{overflow:hidden;border:1px solid #cbd5e1;border-radius:16px;background:#0f172a;aspect-ratio:16/8}.cover-preview img{width:100%;height:100%;object-fit:cover}.cover-empty{display:grid;height:100%;place-content:center;gap:4px;text-align:center;color:#cbd5e1}.cover-empty span{font-size:11px;color:#94a3b8}.media-actions{display:grid;align-content:start;gap:8px}.media-actions p,.media-actions small{margin:0;color:#64748b;font-size:11px;line-height:1.5}.upload{display:grid;min-height:46px;place-items:center;border-radius:11px;background:#0f172a;padding:0 14px;color:#fff;font-size:12px;font-weight:900;cursor:pointer}.upload input{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}.media-strip{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;border-top:1px solid #e2e8f0;padding:14px}.media-strip article{overflow:hidden;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc}.media-strip article.selected{border-color:#2563eb}.media-strip img{width:100%;aspect-ratio:16/9;object-fit:cover}.media-strip button{width:100%;min-height:38px;border:0;border-top:1px solid #e2e8f0;background:#fff;padding:6px;font-size:10px;font-weight:900}.media-strip button:disabled{color:#2563eb}button:focus-visible,input:focus-visible,textarea:focus-visible,label.upload:focus-within{outline:3px solid #60a5fa;outline-offset:2px}@media(min-width:720px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}.wide{grid-column:1/-1}.media-layout{grid-template-columns:minmax(0,1fr) minmax(220px,.55fr)}}@media(max-width:620px){.hours>div{grid-template-columns:1fr}.hours button{justify-self:start}}
  `],
})
export class BranchPortalProfileV225Component implements OnInit {
  private readonly portal=inject(BranchPortalService);
  private readonly profiles=inject(BranchPortalProfileService);
  readonly mediaService=inject(BranchMediaV171Service);
  readonly saving=signal(false);
  readonly uploading=signal(false);
  readonly message=signal('');
  readonly error=signal('');
  readonly media=signal<BranchMediaV171[]>([]);
  readonly images=computed(()=>this.media().filter(item=>item.kind==='IMAGE'&&item.isActive));
  readonly currentCover=computed(()=>this.images().find(item=>item.isCover)||this.images()[0]);

  form={addressLabel:'',phone:'',whatsapp:'',email:'',territoryLabel:'',publicDescription:'',workingHours:[] as Array<{label:string;value:string}>,instagramUrl:'',facebookUrl:'',tiktokUrl:'',youtubeUrl:'',xUrl:''};

  async ngOnInit():Promise<void>{
    try{
      if(!this.portal.currentMembership())await this.portal.loadMemberships();
      this.hydrate();
      await this.refreshMedia();
    }catch{this.error.set('Şube profiliniz şu anda yüklenemedi.');}
  }

  addHour():void{if(this.form.workingHours.length<14)this.form.workingHours.push({label:'',value:''});}
  removeHour(i:number):void{this.form.workingHours.splice(i,1);}

  async save():Promise<void>{
    if(this.saving())return;
    this.saving.set(true);this.message.set('');this.error.set('');
    try{await this.profiles.save(this.form);this.hydrate();this.message.set('Şube profiliniz, iletişim bilgileriniz ve sosyal hesaplarınız güncellendi.');}
    catch(e){this.error.set(this.msg(e));}
    finally{this.saving.set(false);}
  }

  async uploadCover(event:Event):Promise<void>{
    const input=event.target as HTMLInputElement;
    const file=input.files?.[0];
    input.value='';
    if(!file||this.uploading())return;
    const branchId=this.portal.currentMembership()?.branchId;
    if(!branchId){this.error.set('Şube seçimi bulunamadı.');return;}
    this.uploading.set(true);this.message.set('');this.error.set('');
    try{
      await this.mediaService.upload(branchId,file,{altText:`${this.portal.currentMembership()?.branch.name||'Şube'} profil ve kapak fotoğrafı`,isCover:true,sortOrder:0});
      await this.refreshMedia();
      this.message.set('Profil / kapak fotoğrafınız güncellendi.');
    }catch(e){this.error.set(e instanceof Error?e.message:'Profil fotoğrafı yüklenemedi.');}
    finally{this.uploading.set(false);}
  }

  async makeCover(item:BranchMediaV171):Promise<void>{
    if(item.isCover||this.uploading())return;
    this.uploading.set(true);this.message.set('');this.error.set('');
    try{await this.mediaService.setCover(item.id);await this.refreshMedia();this.message.set('Seçilen görsel profil / kapak fotoğrafı yapıldı.');}
    catch{this.error.set('Profil fotoğrafı değiştirilemedi.');}
    finally{this.uploading.set(false);}
  }

  private async refreshMedia():Promise<void>{
    const branchId=this.portal.currentMembership()?.branchId;
    if(!branchId){this.media.set([]);return;}
    this.media.set(await this.mediaService.load(branchId,false));
  }

  private hydrate():void{
    const b=this.portal.currentMembership()?.branch;if(!b)return;
    const brand=b.brandProfile||{};
    this.form={addressLabel:b.addressLabel||'',phone:b.phone||'',whatsapp:b.whatsapp||'',email:b.email||'',territoryLabel:b.territoryLabel||'',publicDescription:b.publicDescription||'',workingHours:(b.workingHours||[]).map(row=>({...row})),instagramUrl:String(brand['instagramUrl']||''),facebookUrl:String(brand['facebookUrl']||''),tiktokUrl:String(brand['tiktokUrl']||''),youtubeUrl:String(brand['youtubeUrl']||''),xUrl:String(brand['xUrl']||'')};
  }

  private msg(e:unknown):string{
    const raw=e instanceof Error?e.message:'';
    if(raw.includes('SOCIAL_URL'))return'Sosyal medya bağlantıları https:// ile başlamalıdır.';
    if(raw.includes('EMAIL'))return'Geçerli bir e-posta adresi girin.';
    if(raw.includes('ADDRESS')||raw.includes('PHONE'))return'Adres ve telefon bilgilerini kontrol edin.';
    if(raw.includes('SUBSCRIPTION'))return'Bu değişiklik için şube aboneliğiniz aktif olmalıdır.';
    return'Şube profili kaydedilemedi. Bilgileriniz değiştirilmedi.';
  }
}
