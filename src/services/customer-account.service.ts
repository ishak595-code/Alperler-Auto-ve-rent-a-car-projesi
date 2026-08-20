import { Injectable, inject, signal } from '@angular/core';
import { SUPABASE_PROJECT_URL, SUPABASE_PUBLISHABLE_KEY } from '../supabase.config';
import { CustomerAuthService } from './customer-auth.service';

export interface CustomerProfile {
  user_id: string; email?: string | null; full_name?: string | null; phone?: string | null; birth_date?: string | null;
  address_line?: string | null; district?: string | null; city?: string | null; country?: string | null; postal_code?: string | null;
  avatar_url?: string | null; preferred_locale?: string | null; preferred_branch_id?: string | null; marketing_consent?: boolean; status?: string;
}
export interface LoyaltyAccount {
  user_id: string; points_balance: number; lifetime_points: number; completed_rentals: number; lifetime_spend: number; tier: string;
  successful_referrals: number; referral_points_earned: number;
}
export interface LoyaltyLedgerItem { id: string; booking_id?: string | null; referral_id?: string | null; direction: string; points: number; reason: string; source: string; created_at: string; }
export interface CustomerBooking { id: string; reference: string; booking_type: string; item_name: string; image?: string | null; start_at?: string | null; end_at?: string | null; total_price?: number | null; currency: string; status: string; payment_status: string; loyalty_points_awarded: number; created_at: string; }
export interface SafePaymentMethod { id: string; provider: string; brand?: string | null; last4?: string | null; expiry_month?: number | null; expiry_year?: number | null; label?: string | null; is_default: boolean; status: string; }
export interface LoyaltySettings {
  enabled: boolean; points_per_rental_day: number; minimum_points_per_rental: number; silver_threshold: number; gold_threshold: number; platinum_threshold: number;
  referral_inviter_points: number; referral_invitee_points: number; referral_milestone_3_points: number; referral_milestone_5_points: number; referral_milestone_10_points: number;
  benefits: Record<string,string[]>;
}
export interface ReferralSummary { code: string; registered: number; rewarded: number; pending: number; pointsEarned: number; successfulReferrals: number; }

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
  readonly referralSummary = signal<ReferralSummary | null>(null);

  async refresh(): Promise<void> {
    const token = await this.requireToken();
    this.loading.set(true);
    try {
      await this.rpc('ensure_customer_profile', {}, token);
      await this.rpc<string>('get_or_create_customer_referral_code', {}, token);
      const [profile, loyalty, ledger, bookings, methods, settings, referral] = await Promise.all([
        this.getRows<CustomerProfile>('customer_profiles?select=*&limit=1', token),
        this.getRows<LoyaltyAccount>('customer_loyalty_accounts?select=*&limit=1', token),
        this.getRows<LoyaltyLedgerItem>('customer_loyalty_ledger?select=id,booking_id,referral_id,direction,points,reason,source,created_at&order=created_at.desc&limit=100', token),
        this.getRows<CustomerBooking>('bookings?deleted_at=is.null&select=id,reference,booking_type,item_name,image,start_at,end_at,total_price,currency,status,payment_status,loyalty_points_awarded,created_at&order=created_at.desc&limit=100', token),
        this.getRows<SafePaymentMethod>('customer_payment_methods?status=eq.ACTIVE&select=id,provider,brand,last4,expiry_month,expiry_year,label,is_default,status&order=is_default.desc,created_at.desc', token),
        this.getRows<LoyaltySettings>('loyalty_program_settings?select=enabled,points_per_rental_day,minimum_points_per_rental,silver_threshold,gold_threshold,platinum_threshold,referral_inviter_points,referral_invitee_points,referral_milestone_3_points,referral_milestone_5_points,referral_milestone_10_points,benefits&limit=1', token),
        this.rpc<ReferralSummary | null>('customer_referral_summary', {}, token),
      ]);
      this.profile.set(profile[0] || null);
      this.loyalty.set(loyalty[0] || null);
      this.ledger.set(ledger);
      this.bookings.set(bookings);
      this.paymentMethods.set(methods);
      this.loyaltySettings.set(settings[0] || null);
      this.referralSummary.set(referral || null);
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
    await this.patchProfile(safe, token);
  }

  async uploadAvatar(file: File): Promise<string> {
    const allowed = new Map<string,string>([['image/jpeg','jpg'],['image/png','png'],['image/webp','webp']]);
    const extension = allowed.get(file.type);
    if (!extension) throw new Error('AVATAR_TYPE_INVALID');
    if (file.size <= 0 || file.size > 2 * 1024 * 1024) throw new Error('AVATAR_SIZE_INVALID');

    const token = await this.requireToken();
    const userId = this.auth.user()?.id || '';
    if (!userId) throw new Error('CUSTOMER_SESSION_REQUIRED');
    const objectPath = `${userId}/avatar.${extension}`;
    const endpoint = `${SUPABASE_PROJECT_URL}/storage/v1/object/customer-avatars/${encodeURIComponent(userId)}/avatar.${extension}`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY, authorization: `Bearer ${token}`, 'content-type': file.type, 'x-upsert': 'true' },
      body: file,
    });
    if (!response.ok) throw new Error(`AVATAR_UPLOAD_${response.status}`);

    const publicUrl = `${SUPABASE_PROJECT_URL}/storage/v1/object/public/customer-avatars/${objectPath}?v=${Date.now()}`;
    await this.patchProfile({ avatar_url: publicUrl, updated_at: new Date().toISOString() }, token);
    await this.deletePreviousOwnedAvatar(publicUrl, token).catch(() => undefined);
    return publicUrl;
  }

  async removeAvatar(): Promise<void> {
    const token = await this.requireToken();
    const existing = this.profile()?.avatar_url || '';
    await this.deleteOwnedAvatar(existing, token).catch(() => undefined);
    await this.patchProfile({ avatar_url: null, updated_at: new Date().toISOString() }, token);
  }

  async claimReferral(code: string): Promise<void> {
    const clean = code.trim().toUpperCase();
    if (!/^[A-Z0-9]{8,16}$/.test(clean)) throw new Error('INVALID_REFERRAL_CODE');
    const token = await this.requireToken();
    await this.rpc('claim_customer_referral', { p_code: clean }, token);
    await this.refresh();
  }

  referralLink(): string {
    const code = this.referralSummary()?.code;
    if (!code || typeof window === 'undefined') return '';
    return `${window.location.origin}/account/login?ref=${encodeURIComponent(code)}`;
  }

  nextReferralMilestone(): { target: number; remaining: number; bonus: number } | null {
    const count = this.referralSummary()?.successfulReferrals ?? this.loyalty()?.successful_referrals ?? 0;
    const settings = this.loyaltySettings();
    if (!settings) return null;
    if (count < 3) return { target: 3, remaining: 3-count, bonus: settings.referral_milestone_3_points };
    if (count < 5) return { target: 5, remaining: 5-count, bonus: settings.referral_milestone_5_points };
    if (count < 10) return { target: 10, remaining: 10-count, bonus: settings.referral_milestone_10_points };
    return null;
  }

  nextTier(): { name: string; remaining: number } | null {
    const account = this.loyalty(); const settings = this.loyaltySettings(); if (!account || !settings) return null;
    const tiers = [['SILVER',settings.silver_threshold],['GOLD',settings.gold_threshold],['PLATINUM',settings.platinum_threshold]] as const;
    const next = tiers.find(([,threshold]) => account.lifetime_points < threshold);
    return next ? { name: next[0], remaining: Math.max(0,next[1]-account.lifetime_points) } : null;
  }

  private async patchProfile(body: Record<string,unknown>, token: string): Promise<void> {
    const userId = this.auth.user()?.id || '';
    if (!userId) throw new Error('CUSTOMER_SESSION_REQUIRED');
    const response = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/customer_profiles?user_id=eq.${encodeURIComponent(userId)}`, {
      method: 'PATCH', headers: this.headers(token, { Prefer: 'return=representation' }), body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`PROFILE_UPDATE_${response.status}`);
    const rows = await response.json() as CustomerProfile[];
    this.profile.set(rows[0] || this.profile());
  }

  private async deletePreviousOwnedAvatar(currentUrl: string, token: string): Promise<void> {
    const previous = this.profile()?.avatar_url || '';
    if (!previous || previous === currentUrl) return;
    await this.deleteOwnedAvatar(previous, token);
  }

  private async deleteOwnedAvatar(url: string, token: string): Promise<void> {
    const marker = '/storage/v1/object/public/customer-avatars/';
    const index = url.indexOf(marker);
    if (index < 0) return;
    const rawPath = url.slice(index + marker.length).split('?')[0];
    const path = decodeURIComponent(rawPath);
    const userId = this.auth.user()?.id || '';
    if (!userId || !path.startsWith(`${userId}/`)) return;
    const encoded = path.split('/').map((part) => encodeURIComponent(part)).join('/');
    await fetch(`${SUPABASE_PROJECT_URL}/storage/v1/object/customer-avatars/${encoded}`, {
      method: 'DELETE', headers: { apikey: SUPABASE_PUBLISHABLE_KEY, authorization: `Bearer ${token}` },
    });
  }

  private async requireToken(): Promise<string> { const token = await this.auth.getAccessToken(); if (!token) throw new Error('CUSTOMER_SESSION_REQUIRED'); return token; }
  private headers(token: string, extra: Record<string,string> = {}): Record<string,string> { return { apikey: SUPABASE_PUBLISHABLE_KEY, authorization: `Bearer ${token}`, 'content-type':'application/json', ...extra }; }
  private async getRows<T>(path: string, token: string): Promise<T[]> { const r = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/${path}`, { headers:this.headers(token) }); if (!r.ok) throw new Error(`CUSTOMER_DATA_${r.status}`); return await r.json() as T[]; }
  private async rpc<T = unknown>(name:string, body:unknown, token:string):Promise<T>{
    const r=await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/rpc/${name}`,{method:'POST',headers:this.headers(token),body:JSON.stringify(body)});
    if(!r.ok){const payload=await r.json().catch(()=>({})) as {message?:string;code?:string};throw new Error(payload.message||payload.code||`${name.toUpperCase()}_FAILED`);}
    return await r.json().catch(()=>null) as T;
  }
  private text(value: unknown, max:number): string | null { return typeof value==='string' && value.trim() ? value.trim().slice(0,max) : null; }
}
