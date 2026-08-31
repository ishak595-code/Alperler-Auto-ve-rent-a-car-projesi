import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

export interface IyzicoBuyerDetails {
  identityNumber: string;
  billingAddress: string;
  city: string;
  country: string;
  zipCode: string;
}

@Component({
  selector: 'app-iyzico-buyer-details-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule],
  template: `
    <section class="dialog" aria-labelledby="iyzico-buyer-title">
      <h2 id="iyzico-buyer-title">iyzico ödeme bilgileri</h2>
      <p class="intro">iyzico, ödeme güvenliği ve yasal ödeme kaydı için bu bilgileri ister. Kart bilgileriniz Alperler Rent A Car sistemine gelmez.</p>
      <form (ngSubmit)="submit()" novalidate>
        <label><span>Kimlik / pasaport numarası</span><input name="identityNumber" [(ngModel)]="model.identityNumber" autocomplete="off" inputmode="text" maxlength="50" required /></label>
        <label><span>Fatura adresi</span><textarea name="billingAddress" [(ngModel)]="model.billingAddress" rows="3" autocomplete="street-address" maxlength="500" required></textarea></label>
        <div class="grid">
          <label><span>Şehir</span><input name="city" [(ngModel)]="model.city" autocomplete="address-level2" maxlength="100" required /></label>
          <label><span>Ülke</span><input name="country" [(ngModel)]="model.country" autocomplete="country-name" maxlength="100" required /></label>
          <label><span>Posta kodu</span><input name="zipCode" [(ngModel)]="model.zipCode" autocomplete="postal-code" maxlength="20" required /></label>
        </div>
        @if(error){<p class="error" role="alert">{{error}}</p>}
        <div class="actions"><button type="button" class="secondary" (click)="cancel()">Vazgeç</button><button type="submit" class="primary">Ödemeye Devam Et</button></div>
      </form>
      <p class="privacy">Bu alanlar ödeme oturumu oluşturulurken iyzico’ya aktarılır. Uygulamanın ödeme işlem geçmişine kimlik veya açık adres kopyası yazılmaz.</p>
    </section>
  `,
  styles: [`
    :host{display:block}.dialog{width:min(92vw,560px);padding:1.25rem;color:#0f172a;background:#fff}.dialog h2{margin:0;font-size:1.3rem}.intro,.privacy{color:#64748b;font-size:.75rem;line-height:1.6}.intro{margin:.5rem 0 1rem}.privacy{margin:1rem 0 0;border-top:1px solid #e2e8f0;padding-top:.8rem}form{display:grid;gap:.85rem}label{display:grid;gap:.35rem}label span{font-size:.7rem;font-weight:800;color:#334155}input,textarea{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:10px;background:#fff;color:#0f172a;padding:.7rem;font:inherit;min-height:44px}textarea{resize:vertical}.grid{display:grid;gap:.75rem}.actions{display:flex;justify-content:flex-end;gap:.6rem;margin-top:.25rem}.actions button{min-height:44px;border-radius:10px;padding:0 1rem;font-weight:800}.primary{border:0;background:#1d4ed8;color:#fff}.secondary{border:1px solid #cbd5e1;background:#fff;color:#334155}.error{margin:0;color:#b91c1c;font-size:.72rem}input:focus-visible,textarea:focus-visible,button:focus-visible{outline:3px solid #60a5fa;outline-offset:2px}@media(min-width:640px){.grid{grid-template-columns:1fr 1fr}.grid label:last-child{grid-column:1/-1}}
  `],
})
export class IyzicoBuyerDetailsDialogComponent {
  private readonly ref = inject(MatDialogRef<IyzicoBuyerDetailsDialogComponent, IyzicoBuyerDetails | null>);
  private readonly data = inject<Partial<IyzicoBuyerDetails>>(MAT_DIALOG_DATA, { optional: true }) || {};
  model: IyzicoBuyerDetails = {
    identityNumber: String(this.data.identityNumber || ''),
    billingAddress: String(this.data.billingAddress || ''),
    city: String(this.data.city || ''),
    country: String(this.data.country || 'Türkiye'),
    zipCode: String(this.data.zipCode || ''),
  };
  error = '';

  submit(): void {
    const result: IyzicoBuyerDetails = {
      identityNumber: this.model.identityNumber.trim(),
      billingAddress: this.model.billingAddress.replace(/\s+/g, ' ').trim(),
      city: this.model.city.replace(/\s+/g, ' ').trim(),
      country: this.model.country.replace(/\s+/g, ' ').trim(),
      zipCode: this.model.zipCode.replace(/\s+/g, '').trim(),
    };
    if (result.identityNumber.length < 5 || !result.billingAddress || !result.city || !result.country || !result.zipCode) {
      this.error = 'iyzico için kimlik/pasaport numarası, fatura adresi, şehir, ülke ve posta kodunu tamamlayın.';
      return;
    }
    this.ref.close(result);
  }
  cancel(): void { this.ref.close(null); }
}
