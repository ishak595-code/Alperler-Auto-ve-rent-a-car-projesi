import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CarService } from '../../services/car.service';
import { CampaignService } from '../../services/campaign.service';
import { AdminMediaService } from '../../services/admin-media.service';
import {
  HomepageAdminService,
  HomepagePlacementRecord,
  HomepageSectionRecord,
  HomepageSectionSettings,
  HomepageSectionType,
  HomepageTheme,
} from '../../services/homepage-admin.service';
import { ToastService } from '../../services/toast.service';

interface Candidate {
  id: string;
  type: 'VEHICLE' | 'TOUR' | 'BLOG' | 'CAMPAIGN';
  label: string;
  image?: string;
  meta?: string;
  category?: string;
}

type NewSectionKind = 'RENTAL' | 'SALE' | 'TOURS' | 'CAMPAIGN' | 'BLOG' | 'PROMO';
type MediaPurpose = 'profile' | 'cover' | 'background';

interface ThemeOption { value: HomepageTheme; label: string; preview: string; text: string; }

@Component({
  selector: 'app-admin-homepage',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <main class="builder-page">
      <div class="builder-shell">
        <header class="hero-panel">
          <div class="hero-top">
            <div class="hero-copy">
              <p>Ana sayfa yönetimi</p>
              <h1>Vitrin Bölümleri</h1>
              <span>Ana sayfadaki bölümlerin sırasını, metinlerini, görsellerini ve öne çıkan içeriklerini buradan yönetin.</span>
            </div>
          </div>
        </header>

        <div class="sticky top-0 z-40 flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:justify-end" aria-label="Ana sayfa hızlı işlemleri">
          <button type="button" class="primary-button" (click)="creating.set(!creating())" [attr.aria-expanded]="creating()" aria-controls="new-section-panel">{{ creating() ? 'Yeni Bölümü Kapat' : '+ Yeni Bölüm' }}</button>
          <button type="button" class="secondary-button" (click)="refresh()" [disabled]="loading()" aria-label="Ana sayfa verilerini yenile">{{ loading() ? 'Yükleniyor…' : 'Vitrini Yenile' }}</button>
        </div>

        @if (error()) { <div class="alert" role="alert">{{ error() }}</div> }

        <section class="new-panel" aria-labelledby="homepage-top-area-title">
          <div class="content-head">
            <div><h2 id="homepage-top-area-title">Ana Sayfa Üst Alanı</h2><p>Hero başlığı, açıklaması, arka plan görseli ve hızlı planlama metinleri doğrudan ana sayfanın en üstünde kullanılır.</p></div>
            <button type="button" class="save-button" (click)="saveTopArea()" [disabled]="topAreaSaving()" aria-label="Ana sayfa üst alanını kaydet ve uygula">{{ topAreaSaving() ? 'Kaydediliyor…' : 'Üst Alanı Kaydet' }}</button>
          </div>
          <div class="editor-grid">
            <section class="editor-block">
              <h4>Hero</h4>
              <label><span>Ana başlık</span><input [(ngModel)]="heroTitle" name="homeHeroTitle" maxlength="180" aria-label="Ana sayfa hero başlığı" /></label>
              <label><span>Açıklama</span><textarea [(ngModel)]="heroSubtitle" name="homeHeroSubtitle" rows="4" maxlength="700" aria-label="Ana sayfa hero açıklaması"></textarea></label>
              <label><span>Arka plan görseli URL</span><input [(ngModel)]="heroImage" name="homeHeroImage" type="url" placeholder="https://..." aria-label="Ana sayfa hero arka plan görseli URL adresi" /></label>
              <label class="file-button"><span>Hero Görseli Yükle</span><input type="file" accept="image/jpeg,image/png,image/webp,image/avif" (change)="onHeroImageSelected($event)" aria-label="Ana sayfa hero görseli dosyası seç" /></label>
              @if (topAreaUploading()) { <p class="upload-state" role="status">Hero görseli yükleniyor…</p> }
            </section>
            <section class="editor-block">
              <h4>Hızlı Planlama</h4>
              <label><span>Planlama başlığı</span><input [(ngModel)]="bookingTitle" name="homeBookingTitle" maxlength="180" aria-label="Ana sayfa hızlı planlama başlığı" /></label>
              <label><span>Planlama açıklaması</span><textarea [(ngModel)]="bookingSubtitle" name="homeBookingSubtitle" rows="4" maxlength="500" aria-label="Ana sayfa hızlı planlama açıklaması"></textarea></label>
              <p class="hint">Teslim noktaları ve araç/tur sonuçları mevcut canlı şube ve katalog verilerinden otomatik gelir.</p>
            </section>
          </div>
        </section>

        @if (creating()) {
          <section id="new-section-panel" class="new-panel" aria-labelledby="new-section-title">
            <h2 id="new-section-title">Yeni bölüm oluştur</h2>
            <div class="new-grid">
              <label><span>Bölüm başlığı</span><input [(ngModel)]="newTitle" name="newTitle" maxlength="120" placeholder="Örn. Hafta Sonu İçin Seçtiklerimiz" /></label>
              <label><span>Bölüm türü</span><select [(ngModel)]="newKind" name="newKind" aria-label="Yeni bölüm türü"><option value="RENTAL">Kiralık araç vitrini</option><option value="SALE">Satılık araç vitrini</option><option value="TOURS">Tur vitrini</option><option value="CAMPAIGN">Kampanya vitrini</option><option value="BLOG">Blog / rehber vitrini</option><option value="PROMO">Özel tanıtım bölümü</option></select></label>
              <button type="button" class="primary-button dark" (click)="createSection()" [disabled]="!newTitle.trim()" aria-label="Yeni ana sayfa bölümünü oluştur">Bölümü Oluştur</button>
            </div>
          </section>
        }

        <section class="section-list" aria-labelledby="section-list-title">
          <div class="list-head"><div><h2 id="section-list-title">Bölüm sırası</h2><p>{{ sections().length }} bölüm · burada yaptığınız değişiklikler ana sayfadaki vitrini günceller</p></div></div>

          @for (section of sections(); track section.sectionKey; let i = $index) {
            <article class="section-card" [class.section-disabled]="!section.isEnabled">
              <div class="section-summary">
                <span class="order-badge" aria-hidden="true">{{ i + 1 }}</span>
                <div class="section-main">
                  <div class="title-line"><h3>{{ section.title }}</h3><span>{{ typeLabel(section) }}</span></div>
                  <p>{{ section.maxItems }} öğe · {{ placementsFor(section.sectionKey).length }} içerik · {{ section.isEnabled ? 'Yayında' : 'Gizli' }}</p>
                </div>
                <div class="section-actions" role="group" [attr.aria-label]="section.title + ' bölüm işlemleri'">
                  <button type="button" class="small-button" (click)="moveSection(i,-1)" [disabled]="i === 0" [attr.aria-label]="section.title + ' bölümünü yukarı taşı'">↑</button>
                  <button type="button" class="small-button" (click)="moveSection(i,1)" [disabled]="i === sections().length - 1" [attr.aria-label]="section.title + ' bölümünü aşağı taşı'">↓</button>
                  <button type="button" class="edit-button" (click)="toggleEdit(section.sectionKey)" [attr.aria-expanded]="editingKey() === section.sectionKey" [attr.aria-controls]="'edit-' + section.sectionKey" [attr.aria-label]="section.title + ' bölümünü düzenle'">{{ editingKey() === section.sectionKey ? 'Kapat' : 'Düzenle' }}</button>
                  <button type="button" class="delete-button" (click)="deleteSection(section)" [attr.aria-label]="section.title + ' bölümünü sil'">Sil</button>
                </div>
              </div>

              @if (editingKey() === section.sectionKey) {
                <div class="editor" [id]="'edit-' + section.sectionKey">
                  <div class="editor-toolbar">
                    <label class="visibility-toggle"><input type="checkbox" [(ngModel)]="section.isEnabled" [name]="section.sectionKey + '-visible'" (change)="saveSection(section)" [attr.aria-label]="section.title + ' bölümünü ana sayfada göster'" /> <span>Ana sayfada göster</span></label>
                    <button type="button" class="save-button" (click)="saveSection(section)" [attr.aria-label]="section.title + ' bölümünü kaydet ve yayınla'">Kaydet ve Uygula</button>
                  </div>

                  <div class="editor-grid">
                    <section class="editor-block" aria-label="Bölüm metin ayarları">
                      <h4>Metin</h4>
                      <label><span>Başlık</span><input [(ngModel)]="section.title" [name]="section.sectionKey + '-title'" maxlength="140" /></label>
                      <label><span>Kısa üst etiket</span><input [ngModel]="setting(section,'badge')" (ngModelChange)="setSetting(section,'badge',$event)" [name]="section.sectionKey + '-badge'" maxlength="80" /></label>
                      <label><span>Açıklama</span><textarea [ngModel]="setting(section,'description')" (ngModelChange)="setSetting(section,'description',$event)" [name]="section.sectionKey + '-description'" rows="4" maxlength="600"></textarea></label>
                      @if (section.sectionType === 'VEHICLES') { <label><span>Araç kategorisi</span><select [ngModel]="setting(section,'category','RENTAL')" (ngModelChange)="setSetting(section,'category',$event)" [name]="section.sectionKey + '-category'" [attr.aria-label]="section.title + ' araç kategorisi'"><option value="RENTAL">Kiralık</option><option value="SALE">Satılık</option></select></label> }
                      @if (section.sectionType === 'CUSTOM') { <label><span>Özel bölüm tipi</span><select [ngModel]="setting(section,'renderer','PROMO')" (ngModelChange)="setSetting(section,'renderer',$event)" [name]="section.sectionKey + '-renderer'" [attr.aria-label]="section.title + ' özel bölüm tipi'"><option value="PROMO">Tanıtım / CTA</option><option value="BRANCHES">Şubeler</option><option value="PARTNER">Aracını Değerlendir</option></select></label> }
                    </section>

                    <section class="editor-block" aria-label="Bölüm görünüm ayarları">
                      <h4>Görünüm</h4>
                      <div class="two-cols">
                        <label><span>Gösterilecek öğe</span><input type="number" min="1" [(ngModel)]="section.maxItems" [name]="section.sectionKey + '-max'" /></label>
                        <label><span>Düzen</span><select [ngModel]="setting(section,'layout','rail')" (ngModelChange)="setSetting(section,'layout',$event)" [name]="section.sectionKey + '-layout'" [attr.aria-label]="section.title + ' bölüm düzeni'"><option value="rail">Yatay vitrin</option><option value="grid">Izgara</option><option value="wide">Geniş blok</option></select></label>
                        <label><span>Genişlik</span><select [ngModel]="setting(section,'width','wide')" (ngModelChange)="setSetting(section,'width',$event)" [name]="section.sectionKey + '-width'" [attr.aria-label]="section.title + ' bölüm genişliği'"><option value="standard">Standart</option><option value="wide">Geniş</option><option value="full">Tam genişlik</option></select></label>
                        <label><span>Özel arka plan rengi</span><input type="text" [ngModel]="setting(section,'backgroundColor')" (ngModelChange)="setSetting(section,'backgroundColor',$event)" [name]="section.sectionKey + '-color'" placeholder="#ffffff" /></label>
                      </div>

                      <fieldset class="themes"><legend>Hazır tema</legend><div class="theme-grid">@for (theme of themes; track theme.value) { <button type="button" class="theme-option" [class.theme-selected]="setting(section,'theme','light') === theme.value" (click)="applyTheme(section, theme.value)" [attr.aria-label]="section.title + ' için ' + theme.label + ' temasını uygula'" [attr.aria-pressed]="setting(section,'theme','light') === theme.value"><span class="theme-preview" [style.background]="theme.preview" [style.color]="theme.text">A</span><b>{{ theme.label }}</b></button> }</div></fieldset>
                    </section>
                  </div>

                  <section class="editor-block media-block" aria-label="Bölüm görselleri">
                    <h4>Görseller</h4>
                    <p class="hint">Görsel bağlantısı yapıştırabilir veya telefonunuzdan/bilgisayarınızdan bir dosya seçebilirsiniz. Yüklenen görsel bu bölümde kullanılmak üzere saklanır.</p>
                    <div class="media-grid">
                      <div class="media-field">
                        <strong>Profil / logo görseli</strong>
                        @if (setting(section,'profileImage')) { <img class="media-preview avatar" [src]="setting(section,'profileImage')" alt="Bölüm profil görseli önizlemesi" /> }
                        <label><span>Görsel URL</span><input type="url" [ngModel]="setting(section,'profileImage')" (ngModelChange)="setSetting(section,'profileImage',$event)" [name]="section.sectionKey + '-profile-url'" placeholder="https://..." /></label>
                        <label class="file-button"><span>Galeriden / Dosyadan Seç</span><input type="file" accept="image/jpeg,image/png,image/webp,image/avif" (change)="onFileSelected(section,'profile',$event)" [attr.aria-label]="section.title + ' profil görselini dosyadan seç'" /></label>
                      </div>
                      <div class="media-field">
                        <strong>Kapak / bölüm görseli</strong>
                        @if (setting(section,'coverImage')) { <img class="media-preview" [src]="setting(section,'coverImage')" alt="Bölüm kapak görseli önizlemesi" /> }
                        <label><span>Görsel URL</span><input type="url" [ngModel]="setting(section,'coverImage')" (ngModelChange)="setSetting(section,'coverImage',$event)" [name]="section.sectionKey + '-cover-url'" placeholder="https://..." /></label>
                        <label class="file-button"><span>Galeriden / Dosyadan Seç</span><input type="file" accept="image/jpeg,image/png,image/webp,image/avif" (change)="onFileSelected(section,'cover',$event)" [attr.aria-label]="section.title + ' kapak görselini dosyadan seç'" /></label>
                      </div>
                      <div class="media-field">
                        <strong>Arka plan görseli</strong>
                        @if (setting(section,'backgroundImage')) { <img class="media-preview" [src]="setting(section,'backgroundImage')" alt="Bölüm arka plan görseli önizlemesi" /> }
                        <label><span>Görsel URL</span><input type="url" [ngModel]="setting(section,'backgroundImage')" (ngModelChange)="setSetting(section,'backgroundImage',$event)" [name]="section.sectionKey + '-background-url'" placeholder="https://..." /></label>
                        <label class="file-button"><span>Galeriden / Dosyadan Seç</span><input type="file" accept="image/jpeg,image/png,image/webp,image/avif" (change)="onFileSelected(section,'background',$event)" [attr.aria-label]="section.title + ' arka plan görselini dosyadan seç'" /></label>
                      </div>
                    </div>
                    @if (uploadingKey() === section.sectionKey) { <p class="upload-state" role="status">Görsel yükleniyor…</p> }
                  </section>

                  <section class="editor-block" aria-label="Bölüm bağlantıları">
                    <h4>Bağlantılar</h4>
                    <div class="two-cols">
                      <label><span>“Tümünü gör” metni</span><input [ngModel]="setting(section,'viewAllLabel')" (ngModelChange)="setSetting(section,'viewAllLabel',$event)" [name]="section.sectionKey + '-view-label'" /></label>
                      <label><span>“Tümünü gör” bağlantısı</span><input [ngModel]="setting(section,'viewAllUrl')" (ngModelChange)="setSetting(section,'viewAllUrl',$event)" [name]="section.sectionKey + '-view-url'" placeholder="/fleet" /></label>
                      @if (section.sectionType === 'CUSTOM') { <label><span>CTA metni</span><input [ngModel]="setting(section,'ctaLabel')" (ngModelChange)="setSetting(section,'ctaLabel',$event)" [name]="section.sectionKey + '-cta-label'" /></label><label><span>CTA bağlantısı</span><input [ngModel]="setting(section,'ctaUrl')" (ngModelChange)="setSetting(section,'ctaUrl',$event)" [name]="section.sectionKey + '-cta-url'" /></label> }
                    </div>
                  </section>

                  @if (sectionSupportsPlacements(section)) {
                    <section class="editor-block" aria-label="Vitrin içerikleri">
                      <div class="content-head"><div><h4>Vitrin içerikleri</h4><p>İlk {{ section.maxItems }} aktif kayıt görünür. Kartlar küçülmez; grid görünümünde bölüm yeni satırlarla büyür.</p></div><div class="add-content"><label class="sr-only" [for]="'candidate-' + section.sectionKey">Vitrine içerik ekle</label><select [id]="'candidate-' + section.sectionKey" [ngModel]="candidateSelection()[section.sectionKey] || ''" (ngModelChange)="selectCandidate(section.sectionKey,$event)" [attr.aria-label]="section.title + ' vitrinine içerik seç'"><option value="">İçerik seç…</option>@for (candidate of candidatesFor(section); track candidate.type + candidate.id) { <option [value]="candidate.type + ':' + candidate.id">{{ candidate.label }}</option> }</select><button type="button" class="primary-button dark" (click)="addSelected(section)" [attr.aria-label]="section.title + ' vitrinine seçilen içeriği ekle'">Ekle</button></div></div>
                      <div class="placement-list">
                        @for (placement of placementsFor(section.sectionKey); track placement.id; let p = $index) {
                          <div class="placement-row">
                            <span class="placement-order">{{ p + 1 }}</span>
                            <div class="placement-copy"><strong>{{ placement.label || placement.entityType }}</strong><small>{{ placement.entityType }} · {{ placement.isActive ? 'Aktif' : 'Pasif' }}</small></div>
                            <label class="mini-toggle"><input type="checkbox" [(ngModel)]="placement.isActive" [name]="placement.id + '-active'" (change)="savePlacement(placement)" [attr.aria-label]="(placement.label || 'İçerik') + ' vitrinde aktif'" /> Aktif</label>
                            <div class="placement-actions"><button type="button" class="small-button" (click)="movePlacement(section.sectionKey,p,-1)" [disabled]="p===0" [attr.aria-label]="(placement.label || 'İçerik') + ' yukarı taşı'">↑</button><button type="button" class="small-button" (click)="movePlacement(section.sectionKey,p,1)" [disabled]="p===placementsFor(section.sectionKey).length-1" [attr.aria-label]="(placement.label || 'İçerik') + ' aşağı taşı'">↓</button><button type="button" class="delete-button" (click)="removePlacement(placement)" [attr.aria-label]="(placement.label || 'İçerik') + ' vitrinden kaldır'">Kaldır</button></div>
                          </div>
                        }
                      </div>
                    </section>
                  }
                </div>
              }
            </article>
          }
        </section>
      </div>
    </main>
  `,
  styles: [`
    :host{display:block}.builder-page{min-height:100%;background:#f5f7fb;padding:1rem;color:#0f172a}.builder-shell{width:min(100%,1180px);margin:auto;display:grid;gap:1rem}.hero-panel{border-radius:22px;background:#07101f;padding:1rem;color:#fff;box-shadow:0 18px 48px rgba(15,23,42,.18)}.hero-top{display:flex;gap:.75rem;align-items:flex-start}.hero-copy{min-width:0}.hero-copy p{margin:0;color:#60a5fa;font-size:.65rem;font-weight:900;text-transform:uppercase;letter-spacing:.13em}.hero-copy h1{margin:.2rem 0 0;font-size:1.55rem}.hero-copy span{display:block;margin-top:.35rem;color:#aab7ca;font-size:.75rem;line-height:1.45}.hero-actions{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:1rem}.icon-button,.small-button,.edit-button,.delete-button,.primary-button,.secondary-button,.save-button{border:0;cursor:pointer;font:inherit;font-weight:900}.icon-button{width:44px;height:44px;border-radius:12px}.icon-button.light{background:#13213a;color:#fff}.primary-button,.secondary-button,.save-button{min-height:44px;border-radius:12px;padding:0 .9rem;font-size:.73rem}.primary-button{background:#2563eb;color:#fff}.primary-button.dark{background:#0f172a}.secondary-button{background:#fff;color:#0f172a}.save-button{background:#16a34a;color:#fff}.new-panel,.section-card{border:1px solid #e2e8f0;border-radius:20px;background:#fff;box-shadow:0 8px 24px rgba(15,23,42,.05)}.new-panel{padding:1rem}.new-panel h2,.list-head h2{margin:0;font-size:1rem}.new-grid{display:grid;gap:.75rem;margin-top:.8rem}.section-list{display:grid;gap:.65rem}.list-head{padding:.25rem .2rem}.list-head p{margin:.2rem 0 0;color:#64748b;font-size:.7rem}.section-card{overflow:hidden}.section-disabled{opacity:.68}.section-summary{display:flex;align-items:center;gap:.65rem;padding:.75rem}.order-badge,.placement-order{display:grid;place-items:center;flex:none;border-radius:10px;background:#eef2ff;color:#3730a3;font-weight:950}.order-badge{width:38px;height:38px}.section-main{min-width:0;flex:1}.title-line{display:flex;align-items:center;gap:.5rem;flex-wrap:wrap}.title-line h3{margin:0;font-size:.9rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}.title-line span{border-radius:999px;background:#eff6ff;padding:.25rem .45rem;color:#1d4ed8;font-size:.55rem;font-weight:900}.section-main p{margin:.2rem 0 0;color:#64748b;font-size:.64rem}.section-actions,.placement-actions{display:flex;flex-wrap:wrap;gap:.3rem}.small-button,.edit-button,.delete-button{min-height:36px;border-radius:10px;padding:0 .55rem;font-size:.65rem}.small-button{min-width:36px;background:#f1f5f9;color:#334155}.edit-button{background:#dbeafe;color:#1d4ed8}.delete-button{background:#fff1f2;color:#be123c}.small-button:disabled,.primary-button:disabled{opacity:.38;cursor:not-allowed}.editor{border-top:1px solid #e2e8f0;background:#fbfdff;padding:1rem;display:grid;gap:.9rem}.editor-toolbar{display:flex;align-items:center;justify-content:space-between;gap:.75rem}.visibility-toggle,.mini-toggle{display:flex;align-items:center;gap:.4rem;font-size:.7rem;font-weight:850}.editor-grid{display:grid;gap:.8rem}.editor-block{border:1px solid #e2e8f0;border-radius:16px;background:#fff;padding:.9rem}.editor-block h4{margin:0 0 .7rem;font-size:.8rem}.editor-block label,.new-panel label,.media-field label{display:grid;gap:.3rem;margin-top:.65rem}.editor-block label>span,.new-panel label>span,.media-field label>span{font-size:.61rem;font-weight:900;color:#475569;text-transform:uppercase;letter-spacing:.05em}input:not([type=checkbox]):not([type=file]),select,textarea{width:100%;min-height:44px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;padding:.65rem;color:#0f172a;font:inherit;font-size:.76rem;outline:none}textarea{resize:vertical}input:focus,select:focus,textarea:focus,button:focus-visible{outline:3px solid rgba(59,130,246,.35);outline-offset:2px}.two-cols{display:grid;grid-template-columns:1fr;gap:.6rem}.themes{margin:.8rem 0 0;border:0;padding:0}.themes legend{font-size:.65rem;font-weight:900;color:#475569}.theme-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.45rem;margin-top:.5rem}.theme-option{display:flex;align-items:center;gap:.45rem;min-height:50px;border:1px solid #dbe4ef;border-radius:12px;background:#fff;padding:.4rem;text-align:left}.theme-option b{font-size:.65rem}.theme-selected{border-color:#2563eb;box-shadow:0 0 0 2px #dbeafe}.theme-preview{display:grid;width:34px;height:34px;place-items:center;border-radius:9px;font:900 .8rem Georgia,serif}.hint,.content-head p{margin:.1rem 0 .7rem;color:#64748b;font-size:.68rem;line-height:1.5}.media-grid{display:grid;gap:.6rem}.media-field{border:1px dashed #cbd5e1;border-radius:14px;padding:.75rem}.media-field>strong{font-size:.72rem}.media-preview{width:100%;height:108px;margin-top:.55rem;border-radius:10px;object-fit:cover;background:#e2e8f0}.media-preview.avatar{width:76px;height:76px;border-radius:999px}.file-button{position:relative;display:flex!important;min-height:44px;align-items:center;justify-content:center!important;border-radius:10px;background:#eef2ff;color:#3730a3;cursor:pointer;text-align:center}.file-button span{color:#3730a3!important}.file-button input{position:absolute;inset:0;opacity:0;cursor:pointer}.upload-state{margin:.6rem 0 0;color:#1d4ed8;font-size:.7rem;font-weight:900}.content-head{display:grid;gap:.6rem}.content-head h4{margin:0}.add-content{display:flex;gap:.4rem}.add-content select{min-width:0;flex:1}.placement-list{display:grid;gap:.45rem}.placement-row{display:flex;align-items:center;gap:.5rem;border:1px solid #e2e8f0;border-radius:12px;padding:.55rem}.placement-order{width:30px;height:30px;font-size:.65rem}.placement-copy{min-width:0;flex:1}.placement-copy strong{display:block;font-size:.68rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.placement-copy small{display:block;color:#64748b;font-size:.56rem;margin-top:.15rem}.alert{border:1px solid #fecdd3;border-radius:14px;background:#fff1f2;padding:.8rem;color:#be123c;font-size:.75rem;font-weight:850}.sr-only{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}@media(max-width:720px){.section-summary{align-items:flex-start;flex-wrap:wrap}.section-main{min-width:calc(100% - 48px)}.section-actions{width:100%;padding-left:48px}.section-actions button{flex:1}.editor-toolbar{align-items:stretch;flex-direction:column}.save-button{width:100%}.placement-row{align-items:flex-start;flex-wrap:wrap}.placement-copy{min-width:calc(100% - 42px)}.mini-toggle{margin-left:38px}.placement-actions{width:100%;margin-left:38px}.content-head{display:block}.add-content{margin-top:.6rem}}@media(min-width:720px){.builder-page{padding:1.5rem}.hero-panel{padding:1.35rem}.hero-panel{display:flex;align-items:flex-end;justify-content:space-between;gap:1rem}.hero-actions{margin-top:0}.new-grid{grid-template-columns:1.2fr 1fr auto;align-items:end}.editor-grid{grid-template-columns:1fr 1fr}.two-cols{grid-template-columns:1fr 1fr}.theme-grid{grid-template-columns:repeat(5,minmax(0,1fr))}.media-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.content-head{grid-template-columns:1fr minmax(360px,520px);align-items:end}}
  `],
})
export class AdminHomepageComponent implements OnInit {
  private readonly homepage = inject(HomepageAdminService);
  private readonly media = inject(AdminMediaService);
  private readonly cars = inject(CarService);
  private readonly campaignsService = inject(CampaignService);
  private readonly toast = inject(ToastService);

  readonly sections = computed(() => this.homepage.sections());
  readonly placements = computed(() => this.homepage.placements());
  readonly loading = this.homepage.loading;
  readonly error = signal('');
  readonly creating = signal(false);
  readonly editingKey = signal<string | null>(null);
  readonly uploadingKey = signal<string | null>(null);
  readonly candidateSelection = signal<Record<string, string>>({});
  readonly topAreaSaving = signal(false);
  readonly topAreaUploading = signal(false);
  heroTitle = '';
  heroSubtitle = '';
  heroImage = '';
  bookingTitle = '';
  bookingSubtitle = '';

  readonly themes: ThemeOption[] = [
    { value: 'light', label: 'Beyaz', preview: '#ffffff', text: '#0f172a' },
    { value: 'soft', label: 'Buz', preview: '#f1f5f9', text: '#0f172a' },
    { value: 'dark', label: 'Gece', preview: '#050b18', text: '#ffffff' },
    { value: 'brand', label: 'Alperler Auto', preview: 'linear-gradient(145deg,#071124,#0b2347)', text: '#ffffff' },
    { value: 'ocean', label: 'Okyanus', preview: 'linear-gradient(145deg,#062a4e,#0b5b83)', text: '#ffffff' },
    { value: 'emerald', label: 'Zümrüt', preview: 'linear-gradient(145deg,#052e2b,#0f766e)', text: '#ffffff' },
    { value: 'sunset', label: 'Gün Batımı', preview: 'linear-gradient(145deg,#7c2d12,#ea580c)', text: '#ffffff' },
    { value: 'violet', label: 'Mor', preview: 'linear-gradient(145deg,#3b0764,#7c3aed)', text: '#ffffff' },
    { value: 'sand', label: 'Kum', preview: '#f6f0e4', text: '#3f3528' },
    { value: 'graphite', label: 'Grafit', preview: 'linear-gradient(145deg,#111827,#374151)', text: '#ffffff' },
  ];

  newTitle = '';
  newKind: NewSectionKind = 'RENTAL';

  async ngOnInit(): Promise<void> { await this.refresh(); }

  toggleEdit(key: string): void { this.editingKey.update((current) => current === key ? null : key); }

  async refresh(): Promise<void> {
    this.error.set('');
    try {
      await Promise.all([this.homepage.refresh(), this.campaignsService.refreshAdmin(), this.cars.refreshCloudCatalog(true)]);
      this.syncTopArea();
    } catch (error) {
      const message = this.message(error); this.error.set(message); this.toast.show(message, 'error');
    }
  }

  async saveTopArea(): Promise<void> {
    if (this.topAreaSaving()) return;
    this.topAreaSaving.set(true);
    try {
      const current = this.cars.getConfig()();
      const homeContent = { ...(current.homeContent || {}) } as Record<string, unknown>;
      homeContent['heroTitle'] = this.heroTitle.trim();
      homeContent['heroSubtitle'] = this.heroSubtitle.trim();
      homeContent['heroImage'] = this.heroImage.trim();
      homeContent['bookingTitle'] = this.bookingTitle.trim();
      homeContent['bookingSubtitle'] = this.bookingSubtitle.trim();
      await this.cars.updateConfig({ ...current, homeContent: homeContent as any });
      await this.cars.refreshCloudCatalog(true);
      this.syncTopArea();
      this.toast.show('Ana sayfa üst alanı kaydedildi ve uygulandı.', 'success');
    } catch (error) { this.toast.show(this.message(error), 'error'); }
    finally { this.topAreaSaving.set(false); }
  }

  async onHeroImageSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.topAreaUploading.set(true);
    try {
      const result = await this.media.uploadHomepageImage(file, 'hero', 'background');
      this.heroImage = result.publicUrl;
      this.toast.show('Hero görseli hazır. Üst Alanı Kaydet düğmesiyle yayınlayabilirsiniz.', 'success');
    } catch (error) { this.toast.show(this.message(error), 'error'); }
    finally { this.topAreaUploading.set(false); input.value = ''; }
  }

  private syncTopArea(): void {
    const home = (this.cars.getConfig()().homeContent || {}) as Record<string, unknown>;
    this.heroTitle = String(home['heroTitle'] || '');
    this.heroSubtitle = String(home['heroSubtitle'] || '');
    this.heroImage = String(home['heroImage'] || '');
    this.bookingTitle = String(home['bookingTitle'] || '');
    this.bookingSubtitle = String(home['bookingSubtitle'] || '');
  }

  async createSection(): Promise<void> {
    if (!this.newTitle.trim()) return;
    try {
      const spec = this.newSectionSpec(this.newKind);
      const created = await this.homepage.createSection({ title: this.newTitle.trim(), sectionType: spec.type, maxItems: 4, settings: spec.settings });
      this.newTitle = ''; this.creating.set(false); this.editingKey.set(created.sectionKey); this.toast.show('Bölüm oluşturuldu ve düzenlemeye açıldı.', 'success');
    } catch (error) { this.toast.show(this.message(error), 'error'); }
  }

  async saveSection(section: HomepageSectionRecord): Promise<void> {
    try { await this.homepage.updateSection(section); this.toast.show('Bölüm kaydedildi ve ana sayfaya uygulandı.', 'success'); }
    catch (error) { this.toast.show(this.message(error), 'error'); }
  }

  async applyTheme(section: HomepageSectionRecord, theme: HomepageTheme): Promise<void> {
    this.setSetting(section, 'theme', theme);
    try { await this.homepage.updateSection(section); this.toast.show(`${this.themeLabel(theme)} teması uygulandı.`, 'success'); }
    catch (error) { this.toast.show(this.message(error), 'error'); }
  }

  async moveSection(index: number, delta: number): Promise<void> {
    const list = [...this.sections()]; const target = index + delta; if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    try { await this.homepage.reorderSections(list.map((item) => item.sectionKey)); }
    catch (error) { this.toast.show(this.message(error), 'error'); }
  }

  async deleteSection(section: HomepageSectionRecord): Promise<void> {
    if (typeof window !== 'undefined' && !window.confirm(`“${section.title}” bölümünü silmek istiyor musunuz? Bağlı vitrin yerleşimleri de kaldırılır.`)) return;
    try { await this.homepage.deleteSection(section.sectionKey); if (this.editingKey() === section.sectionKey) this.editingKey.set(null); this.toast.show('Bölüm silindi.', 'success'); }
    catch (error) { this.toast.show(this.message(error), 'error'); }
  }

  async onFileSelected(section: HomepageSectionRecord, purpose: MediaPurpose, event: Event): Promise<void> {
    const input = event.target as HTMLInputElement; const file = input.files?.[0]; if (!file) return;
    this.uploadingKey.set(section.sectionKey);
    try {
      const result = await this.media.uploadHomepageImage(file, section.sectionKey, purpose);
      const key = purpose === 'profile' ? 'profileImage' : purpose === 'cover' ? 'coverImage' : 'backgroundImage';
      this.setSetting(section, key, result.publicUrl);
      await this.homepage.updateSection(section);
      this.toast.show('Görsel yüklendi ve bu bölümde kullanılmaya başladı.', 'success');
    } catch (error) { this.toast.show(this.message(error), 'error'); }
    finally { this.uploadingKey.set(null); input.value = ''; }
  }

  placementsFor(sectionKey: string): HomepagePlacementRecord[] { return this.placements().filter((item) => item.sectionKey === sectionKey).sort((a,b) => a.sortOrder - b.sortOrder); }
  candidatesFor(section: HomepageSectionRecord): Candidate[] { const used = new Set(this.placementsFor(section.sectionKey).map((item) => `${item.entityType}:${item.entityId}`)); return this.allCandidates(section).filter((item) => !used.has(`${item.type}:${item.id}`)); }
  sectionSupportsPlacements(section: HomepageSectionRecord): boolean { return ['VEHICLES','TOURS','BLOG','CAMPAIGN'].includes(section.sectionType); }
  setting(section: HomepageSectionRecord, key: string, fallback = ''): any { return Object.prototype.hasOwnProperty.call(section.settings || {}, key) ? section.settings[key] : fallback; }
  setSetting(section: HomepageSectionRecord, key: string, value: unknown): void { section.settings = { ...(section.settings || {}), [key]: value }; }
  selectCandidate(sectionKey: string, value: string): void { this.candidateSelection.update((state) => ({ ...state, [sectionKey]: value })); }

  async addSelected(section: HomepageSectionRecord): Promise<void> {
    const raw = this.candidateSelection()[section.sectionKey] || ''; const split = raw.indexOf(':'); if (split < 1) return;
    const type = raw.slice(0, split) as Candidate['type']; const id = raw.slice(split + 1); const candidate = this.allCandidates(section).find((item) => item.type === type && item.id === id); if (!candidate) return;
    try { await this.homepage.addPlacement({ sectionKey: section.sectionKey, entityType: type, entityId: id, label: candidate.label, sortOrder: this.placementsFor(section.sectionKey).length + 1, isActive: true, metadata: {} }); this.selectCandidate(section.sectionKey, ''); this.toast.show('İçerik vitrine eklendi.', 'success'); }
    catch (error) { this.toast.show(this.message(error), 'error'); }
  }

  async savePlacement(placement: HomepagePlacementRecord): Promise<void> { try { await this.homepage.updatePlacement(placement); } catch (error) { this.toast.show(this.message(error), 'error'); } }
  async removePlacement(placement: HomepagePlacementRecord): Promise<void> { try { await this.homepage.removePlacement(placement.id); this.toast.show('İçerik vitrinden kaldırıldı.', 'success'); } catch (error) { this.toast.show(this.message(error), 'error'); } }
  async movePlacement(sectionKey: string, index: number, delta: number): Promise<void> { const list = this.placementsFor(sectionKey); const target = index + delta; if (target < 0 || target >= list.length) return; [list[index],list[target]] = [list[target],list[index]]; try { await this.homepage.reorderPlacements(list.map((item) => item.id)); } catch (error) { this.toast.show(this.message(error), 'error'); } }

  typeLabel(section: HomepageSectionRecord): string {
    if (section.sectionType === 'VEHICLES') return this.setting(section,'category','RENTAL') === 'SALE' ? 'Satılık araç' : 'Kiralık araç';
    return ({ TOURS:'Tur', BLOG:'Blog / rehber', CAMPAIGN:'Kampanya', CUSTOM:'Özel bölüm' } as Record<string,string>)[section.sectionType] || section.sectionType;
  }

  private themeLabel(theme: HomepageTheme): string { return this.themes.find((item) => item.value === theme)?.label || theme; }

  private newSectionSpec(kind: NewSectionKind): { type: HomepageSectionType; settings: HomepageSectionSettings } {
    if (kind === 'RENTAL') return { type:'VEHICLES', settings:{ category:'RENTAL', badge:'Seçili Kiralık Araçlar', description:'Planınıza uyan seçili kiralık araçları karşılaştırın.', layout:'rail', width:'wide', theme:'light', viewAllLabel:'Tüm Kiralık Araçlar', viewAllUrl:'/fleet' } };
    if (kind === 'SALE') return { type:'VEHICLES', settings:{ category:'SALE', badge:'Seçili İkinci El Araçlar', description:'Öne çıkan ikinci el araçları karşılaştırın.', layout:'rail', width:'wide', theme:'soft', viewAllLabel:'Tüm Satılık Araçlar', viewAllUrl:'/sales' } };
    if (kind === 'TOURS') return { type:'TOURS', settings:{ badge:'Yerel Rotalar', description:'Yerel rehberlerle öne çıkan rotaları keşfedin.', layout:'rail', width:'wide', theme:'dark', viewAllLabel:'Tüm Turlar', viewAllUrl:'/tours' } };
    if (kind === 'CAMPAIGN') return { type:'CAMPAIGN', settings:{ badge:'Seçili Avantajlar', description:'Planınıza uyan güncel avantajları keşfedin.', layout:'rail', width:'wide', theme:'brand', viewAllLabel:'Tüm Fırsatlar', viewAllUrl:'/campaigns' } };
    if (kind === 'BLOG') return { type:'BLOG', settings:{ badge:'Rehber & İpuçları', description:'Yola çıkmadan önce seçili içeriklere göz atın.', layout:'rail', width:'wide', theme:'light', viewAllLabel:'Tüm Yazılar', viewAllUrl:'/blog' } };
    return { type:'CUSTOM', settings:{ renderer:'PROMO', badge:'Alperler Auto', description:'Bu bölümün açıklamasını düzenleyin.', layout:'wide', width:'wide', theme:'brand', ctaLabel:'Detayları İncele', ctaUrl:'/contact' } };
  }

  private allCandidates(section?: HomepageSectionRecord): Candidate[] {
    const vehicles = this.cars.getAllVehicles()().filter((item) => item.category !== 'TOUR' && item.cloudId).map((item) => ({ id:item.cloudId!, type:'VEHICLE' as const, label:`${item.brand || ''} ${item.model || ''}`.trim(), image:item.image, meta:`${item.category === 'RENTAL' ? 'Kiralık' : 'Satılık'} · ${item.year || ''}`, category:item.category }));
    const tours = this.cars.getTours()().filter((item) => item.cloudId).map((item) => ({ id:item.cloudId!, type:'TOUR' as const, label:item.title || 'Tur', image:item.image, meta:item.duration || 'Tur' }));
    const blogs = this.cars.getBlogPosts()().map((item:any) => ({ id:String(item.cloudId || ''), type:'BLOG' as const, label:item.title, image:item.image, meta:item.date })).filter((item) => item.id);
    const campaigns = this.campaignsService.campaigns().map((item) => ({ id:item.id, type:'CAMPAIGN' as const, label:item.title, image:item.coverImage, meta:item.publicationStatus }));
    if (!section) return [...vehicles,...tours,...blogs,...campaigns];
    if (section.sectionType === 'VEHICLES') { const category = this.setting(section,'category','RENTAL'); return vehicles.filter((item) => item.category === category); }
    if (section.sectionType === 'TOURS') return tours; if (section.sectionType === 'BLOG') return blogs; if (section.sectionType === 'CAMPAIGN') return campaigns; return [];
  }

  private message(error: unknown): string { return error instanceof Error ? error.message : 'İşlem tamamlanamadı.'; }
}
