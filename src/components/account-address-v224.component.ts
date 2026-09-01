import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CustomerAccountService, CustomerProfile } from '../services/customer-account.service';

@Component({
  selector: 'app-account-address-v224',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section id="account-address" class="address-card" aria-labelledby="account-address-title">
      <button
        type="button"
        class="address-summary"
        (click)="toggle()"
        [attr.aria-expanded]="open()"
        aria-controls="account-address-editor"
      >
        <span class="address-icon" aria-hidden="true">⌂</span>
        <span class="address-copy">
          <small>ADRESİM</small>
          <strong id="account-address-title">{{ summary() }}</strong>
        </span>
        <span class="address-action">{{ open() ? 'Kapat' : (hasAddress() ? 'Düzenle' : 'Ekle') }}</span>
      </button>

      @if (open()) {
        <div id="account-address-editor" class="address-editor">
          <p>Rezervasyon ve fatura işlemlerinde kullanılacak adresinizi güncelleyin. Kaydettikten sonra bu bölüm tekrar tek satıra küçülür.</p>
          <div class="grid">
            <label class="wide"><span>Adres</span><input [(ngModel)]="form.address_line" name="accountAddressLineV224" maxlength="240" autocomplete="street-address" /></label>
            <label><span>İlçe</span><input [(ngModel)]="form.district" name="accountDistrictV224" maxlength="100" autocomplete="address-level3" /></label>
            <label><span>Şehir</span><input [(ngModel)]="form.city" name="accountCityV224" maxlength="100" autocomplete="address-level2" /></label>
            <label><span>Posta Kodu</span><input [(ngModel)]="form.postal_code" name="accountPostalV224" maxlength="30" autocomplete="postal-code" inputmode="numeric" /></label>
            <label><span>Ülke</span><select [(ngModel)]="form.country" name="accountCountryV224" autocomplete="country"><option value="TR">Türkiye</option><option value="CH">İsviçre</option><option value="DE">Almanya</option><option value="FR">Fransa</option><option value="AT">Avusturya</option><option value="OTHER">Diğer</option></select></label>
          </div>
          @if (message()) { <p class="message" role="status">{{ message() }}</p> }
          @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
          <div class="actions">
            <button type="button" (click)="cancel()" [disabled]="saving()">Vazgeç</button>
            <button type="button" class="primary" (click)="save()" [disabled]="saving()">{{ saving() ? 'Kaydediliyor…' : 'Adresi Kaydet' }}</button>
          </div>
        </div>
      }
    </section>
  `,
  styles: [`
    :host{display:block;background:#060a12}.address-card{width:min(calc(100% - 28px),1180px);margin:14px auto 0;border:1px solid #263548;border-radius:16px;background:#0b1420;color:#f4f6f8;overflow:hidden}.address-summary{display:grid;width:100%;min-height:64px;grid-template-columns:40px minmax(0,1fr) auto;align-items:center;gap:10px;border:0;background:transparent;padding:10px 12px;color:inherit;text-align:left;cursor:pointer}.address-summary:focus-visible,.actions button:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid #60a5fa;outline-offset:2px}.address-icon{display:grid;width:38px;height:38px;place-items:center;border-radius:11px;background:#111f31;color:#f6d78b;font-weight:900}.address-copy{min-width:0}.address-copy small{display:block;color:#c6a15b;font-size:9px;font-weight:950;letter-spacing:.12em}.address-copy strong{display:block;margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;line-height:1.35}.address-action{border:1px solid #304158;border-radius:9px;padding:7px 9px;color:#cbd5e1;font-size:10px;font-weight:900}.address-editor{border-top:1px solid #263548;padding:14px}.address-editor>p{margin:0 0 12px;color:#98a6b8;font-size:11px;line-height:1.55}.grid{display:grid;gap:10px}.grid label{display:grid;gap:5px}.grid label span{color:#a9b6c5;font-size:10px;font-weight:900}.grid input,.grid select{width:100%;min-height:44px;border:1px solid #304158;border-radius:10px;background:#0e1724;padding:0 11px;color:#fff;font:inherit;font-size:12px}.message,.error{margin:10px 0 0;border-radius:10px;padding:9px 10px;font-size:11px}.message{background:rgba(16,185,129,.1);color:#a7f3d0}.error{background:rgba(244,63,94,.1);color:#fecdd3}.actions{display:flex;justify-content:flex-end;gap:8px;margin-top:12px}.actions button{min-height:42px;border:1px solid #304158;border-radius:10px;background:#0e1724;padding:0 14px;color:#e2e8f0;font-weight:900}.actions .primary{border-color:#2563eb;background:#2563eb;color:#fff}@media(min-width:720px){.address-card{margin-top:18px}.address-summary{padding:12px 16px}.address-copy strong{font-size:13px}.grid{grid-template-columns:repeat(2,minmax(0,1fr))}.grid .wide{grid-column:1/-1}}
  `],
})
export class AccountAddressV224Component {
  readonly account = inject(CustomerAccountService);
  readonly open = signal(false);
  readonly saving = signal(false);
  readonly message = signal('');
  readonly error = signal('');
  form = this.emptyForm();
  private loadedUser = '';

  readonly hasAddress = computed(() => Boolean(this.account.profile()?.address_line || this.account.profile()?.city || this.account.profile()?.district));
  readonly summary = computed(() => {
    const p = this.account.profile();
    if (!p) return 'Adres bilgisi hazırlanıyor…';
    const parts = [p.address_line, p.district, p.city, p.postal_code].map((v) => String(v || '').trim()).filter(Boolean);
    return parts.length ? parts.join(' · ') : 'Adres eklenmemiş';
  });

  constructor() {
    effect(() => {
      const profile = this.account.profile();
      if (!profile || profile.user_id === this.loadedUser) return;
      this.loadedUser = profile.user_id;
      this.copyFrom(profile);
    });
  }

  toggle(): void {
    if (!this.open()) this.copyFrom(this.account.profile());
    this.message.set(''); this.error.set(''); this.open.update((v) => !v);
  }
  cancel(): void { this.copyFrom(this.account.profile()); this.message.set(''); this.error.set(''); this.open.set(false); }

  async save(): Promise<void> {
    if (this.saving()) return;
    const current = this.account.profile();
    if (!current) { this.error.set('Profil bilgileri henüz hazır değil. Kısa süre sonra tekrar deneyin.'); return; }
    const address = this.clean(this.form.address_line, 240);
    const city = this.clean(this.form.city, 100);
    if (!address || !city) { this.error.set('Adres ve şehir alanlarını doldurun.'); return; }
    this.saving.set(true); this.error.set(''); this.message.set('');
    try {
      await this.account.updateProfile({
        ...current,
        address_line: address,
        district: this.clean(this.form.district, 100) || null,
        city,
        postal_code: this.clean(this.form.postal_code, 30) || null,
        country: this.country(this.form.country),
      });
      this.message.set('Adresiniz kaydedildi.');
      this.open.set(false);
    } catch {
      this.error.set('Adres şu anda kaydedilemedi. Bilgileriniz değiştirilmedi.');
    } finally { this.saving.set(false); }
  }

  private copyFrom(profile: CustomerProfile | null): void {
    this.form = {
      address_line: String(profile?.address_line || ''), district: String(profile?.district || ''), city: String(profile?.city || ''),
      postal_code: String(profile?.postal_code || ''), country: this.country(profile?.country || 'TR'),
    };
  }
  private emptyForm() { return { address_line: '', district: '', city: '', postal_code: '', country: 'TR' }; }
  private clean(value: unknown, max: number): string { return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : ''; }
  private country(value: unknown): string { const code = String(value || 'TR').trim().toUpperCase(); return ['TR','CH','DE','FR','AT'].includes(code) ? code : 'OTHER'; }
}
