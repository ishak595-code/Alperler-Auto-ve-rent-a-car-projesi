import { Injectable, inject, signal } from '@angular/core';
import { CustomerAuthService } from './customer-auth.service';

export interface SavedCardV225 {
  id: string;
  brand: string;
  last4: string;
  expiryMonth: number | null;
  expiryYear: number | null;
  label: string;
  isDefault: boolean;
}

interface WalletResponse {
  ok?: boolean;
  available?: boolean;
  refreshed?: boolean;
  cards?: SavedCardV225[];
  code?: string;
}

@Injectable({ providedIn: 'root' })
export class CustomerSavedCardsV225Service {
  private readonly auth = inject(CustomerAuthService);
  private readonly endpoint = '/api/wallet-cards';
  readonly cards = signal<SavedCardV225[]>([]);
  readonly available = signal(true);
  readonly loading = signal(false);
  readonly working = signal(false);

  async refresh(): Promise<void> {
    this.loading.set(true);
    try {
      const response = await fetch(this.endpoint, { headers: await this.headers(), cache: 'no-store' });
      const payload = await this.payload(response);
      if (!response.ok || payload.ok !== true) throw new Error(this.message(payload.code));
      this.available.set(payload.available !== false);
      this.cards.set(Array.isArray(payload.cards) ? payload.cards : []);
    } finally {
      this.loading.set(false);
    }
  }

  async add(input: { cardAlias:string; cardHolderName:string; cardNumber:string; expireMonth:string; expireYear:string }): Promise<void> {
    if (this.working()) return;
    this.working.set(true);
    try {
      const response = await fetch(this.endpoint, { method:'POST', headers:await this.headers(), body:JSON.stringify(input), cache:'no-store' });
      const payload = await this.payload(response);
      if (!response.ok || payload.ok !== true) throw new Error(this.message(payload.code));
      this.cards.set(Array.isArray(payload.cards) ? payload.cards : []);
      this.available.set(true);
    } finally { this.working.set(false); }
  }

  async remove(id:string): Promise<void> {
    if (this.working()) return;
    this.working.set(true);
    try {
      const response = await fetch(this.endpoint, { method:'DELETE', headers:await this.headers(), body:JSON.stringify({ id }), cache:'no-store' });
      const payload = await this.payload(response);
      if (!response.ok || payload.ok !== true) throw new Error(this.message(payload.code));
      this.cards.set(Array.isArray(payload.cards) ? payload.cards : []);
    } finally { this.working.set(false); }
  }

  async makeDefault(id:string): Promise<void> {
    if (this.working()) return;
    this.working.set(true);
    try {
      const response = await fetch(this.endpoint, { method:'PATCH', headers:await this.headers(), body:JSON.stringify({ id }), cache:'no-store' });
      const payload = await this.payload(response);
      if (!response.ok || payload.ok !== true) throw new Error(this.message(payload.code));
      this.cards.set(Array.isArray(payload.cards) ? payload.cards : []);
    } finally { this.working.set(false); }
  }

  private async headers():Promise<Record<string,string>> {
    const token = await this.auth.getAccessToken();
    if (!token) throw new Error('Hesabınızın oturumu sona ermiş. Lütfen yeniden giriş yapın.');
    return { authorization:`Bearer ${token}`, 'content-type':'application/json', accept:'application/json' };
  }

  private async payload(response:Response):Promise<WalletResponse> { return await response.json().catch(() => ({})) as WalletResponse; }
  private message(code?:string):string {
    if (code === 'CARD_STORAGE_NOT_ENABLED') return 'Kayıtlı kart özelliği ödeme hesabında henüz etkin değil.';
    if (code === 'SAVED_CARDS_NOT_CONFIGURED' || code?.includes('IYZICO_')) return 'Kayıtlı kart hizmeti şu anda kullanılamıyor.';
    if (code === 'INVALID_CARD_DETAILS') return 'Kart bilgilerini kontrol edip yeniden deneyin.';
    if (code === 'PAYMENT_METHOD_NOT_FOUND') return 'Kart bulunamadı veya daha önce kaldırılmış.';
    if (code === 'UNAUTHORIZED') return 'Hesabınızın oturumu sona ermiş. Lütfen yeniden giriş yapın.';
    return 'Kart işlemi tamamlanamadı. Lütfen tekrar deneyin.';
  }
}
