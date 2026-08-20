import { Injectable, inject, signal } from '@angular/core';
import { SUPABASE_PROJECT_URL, SUPABASE_PUBLISHABLE_KEY } from '../supabase.config';
import { CustomerAuthService } from './customer-auth.service';

export interface CustomerProfile {
  user_id: string; email?: string | null; full_name?: string | null; phone?: string | null; birth_date?: string | null;
  address_line?: string | null; district?: string | null; city?: string | null; country?: string | null; postal_code?: string | null;
  avatar_url?: string | null; preferred_locale?: string | null; preferred_branch_id?: string | null; marketing_consent?: boolean; status?: string;
}
export interface LoyaltyAccount { user_id: string; points_balance: number; lifetime_points: number; completed_rentals: number; lifetime_spend: number; tier: string; }
export interface LoyaltyLedgerItem { id: string; booking_id?: string | null; direction: string; points: number; reason: string; source: string; created_at: string; }
export interface CustomerBooking { id: string; reference: string; booking_type: string; item_name: string; image?: string | null; start_at?: string | null; end_at?: string | null; total_price?: number | null; currency: string; status: string; payment_status: string; loyalty_points_awarded: number; created_at: string; }
export interface SafePaymentMethod { id: string; provider: string; brand?: string | null; last4?: string | null; expiry_month?: number | null; expiry_year?: number | null; label?: string | null; is_default: boolean; status: string; }
export interface LoyaltySettings { enabled: boolean; points_per_rental_day: number; minimum_points_per_rental: number; silver_threshold: number; gold_threshold: number; platinum_threshold: number; benefits: Record<string,string[]>; }

@Injectable({ providedIn: 'root' })
export class CustomerAccountService {
  private readonly auth = inject(CustomerAuthService);
  readonly loading = signal(false);
  readonly profile = signal<CustomerProfile | null>(null);
  readonly loyalty = signal<LoyaltyAccount | null>(null);
  readonly ledger = signal<LoyaltyLedgerItem[]>([]);
  readonly bookings = signal<CustomerBooking[]>([]);
  readonly paymentMethods = signal<SafePaymentMethod[]>([]);
  readonly loyaltySettings = signal<LoyaltySettings | null>(null);

  async refresh(): Promise<void> {
    const token = await this.requireToken();
    this.loading.set(true);
    try {
      await this.rpc('ensure_customer_profile', {}, token);
      const [profile, loyalty, ledger, bookings, methods, settings] = await Promise.all([
        this.getRows<CustomerProfile>('customer_profiles?select=*&limit=1', token),
        this.getRows<LoyaltyAccount>('customer_loyalty_accounts?select=*&limit=1', token),
        this.getRows<LoyaltyLedgerItem>('customer_loyalty_ledger?select=id,booking_id,direction,points,reason,source,created_at&order=created_at.desc&limit=100', token),
        this.getRows<CustomerBooking>('bookings?deleted_at=is.null&select=id,reference,booking_type,item_name,image,start_at,end_at,total_price,currency,status,payment_status,loyalty_points_awarded,created_at&order=created_at.desc&limit=100', token),
        this.getRows<SafePaymentMethod>('customer_payment_methods?status=eq.ACTIVE&select=id,provider,brand,last4,expiry_month,expiry_year,label,is_default,status&order=is_default.desc,created_at.desc', token),
        this.getRows<LoyaltySettings>('loyalty_program_settings?select=enabled,points_per_rental_day,minimum_points_per_rental,silver_threshold,gold_threshold,platinum_threshold,benefits&limit=1', token),
      ]);
      this.profile.set(profile[0] || null); this.loyalty.set(loyalty[0] || null); this.ledger.set(ledger); this.bookings.set(bookings); this.paymentMethods.set(methods); this.loyaltySettings.set(settings[0] || null);
    } finally { this.loading.set(false); }
  }

  async updateProfile(patch: Partial<CustomerProfile>): Promise<void> {
    const token = await this.requireToken();
    const safe = {
      full_name: this.text(patch.full_name,160), phone: this.text(patch.phone,40), birth_date: patch.birth_date || null,
      address_line: this.text(patch.address_line,240), district: this.text(patch.district,100), city: this.text(patch.city,100),
      country: this.text(patch.country,2)?.toUpperCase() || 'TR', postal_code: this.text(patch.postal_code,30),
      preferred_locale: this.text(patch.preferred_locale,10) || 'tr', preferred_branch_id: patch.preferred_branch_id || null,
      marketing_consent: Boolean(patch.marketing_consent), updated_at: new Date().toISOString(),
    };
    const response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/customer_profiles?user_id=eq.${encodeURIComponent(this.auth.user()?.id || '')}`, {
      method: 'PATCH', headers: this.headers(token, { Prefer: 'return=representation' }), body: JSON.stringify(safe),
    });
    if (!response.ok) throw new Error('PROFILE_UPDATE_FAILED');
    const rows = await response.json() as CustomerProfile[]; this.profile.set(rows[0] || this.profile());
  }

  nextTier(): { name: string; remaining: number } | null {
    const account = this.loyalty(); const settings = this.loyaltySettings(); if (!account || !settings) return null;
    const tiers = [['SILVER',settings.silver_threshold],['GOLD',settings.gold_threshold],['PLATINUM',settings.platinum_threshold]] as const;
    const next = tiers.find(([,threshold]) => account.lifetime_points < threshold);
    return next ? { name: next[0], remaining: Math.max(0,next[1]-account.lifetime_points) } : null;
  }

  private async requireToken(): Promise<string> { const token = await this.auth.getAccessToken(); if (!token) throw new Error('CUSTOMER_SESSION_REQUIRED'); return token; }
  private headers(token: string, extra: Record<string,string> = {}): Record<string,string> { return { apikey: SUPABASE_PUBLISHABLE_KEY, authorization: `Bearer ${token}`, 'content-type':'application/json', ...extra }; }
  private async getRows<T>(path: string, token: string): Promise<T[]> { const r = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/${path}`, { headers:this.headers(token) }); if (!r.ok) throw new Error(`CUSTOMER_DATA_${r.status}`); return await r.json() as T[]; }
  private async rpc(name:string, body:unknown, token:string):Promise<unknown>{ const r=await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/rpc/${name}`,{method:'POST',headers:this.headers(token),body:JSON.stringify(body)});if(!r.ok)throw new Error(`${name.toUpperCase()}_FAILED`);return r.json().catch(()=>null); }
  private text(value: unknown, max:number): string | null { return typeof value==='string' && value.trim() ? value.trim().slice(0,max) : null; }
}
