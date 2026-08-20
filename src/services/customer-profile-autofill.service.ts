import { Injectable, effect, inject } from '@angular/core';
import { SUPABASE_PROJECT_URL, SUPABASE_PUBLISHABLE_KEY } from '../supabase.config';
import { CustomerAuthService } from './customer-auth.service';

interface AutofillProfile {
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
}

@Injectable({ providedIn: 'root' })
export class CustomerProfileAutofillService {
  private readonly auth = inject(CustomerAuthService);
  private observer: MutationObserver | null = null;
  private profile: AutofillProfile | null = null;
  private loading = false;
  private scheduled = false;

  constructor() {
    effect(() => {
      const loggedIn = this.auth.isLoggedIn();
      const userId = this.auth.user()?.id || '';
      if (!loggedIn || !userId) {
        this.stop();
        this.profile = null;
        return;
      }
      void this.activate();
    });
  }

  start(): void {
    void this.auth.waitUntilReady().then(() => {
      if (this.auth.isLoggedIn()) void this.activate();
    });
  }

  private async activate(): Promise<void> {
    if (typeof document === 'undefined') return;
    if (!this.profile && !this.loading) await this.loadProfile();
    if (!this.profile) return;
    this.fillEmptyCustomerFields();
    if (this.observer) return;
    this.observer = new MutationObserver(() => this.scheduleFill());
    this.observer.observe(document.body, { childList: true, subtree: true });
  }

  private stop(): void {
    this.observer?.disconnect();
    this.observer = null;
  }

  private scheduleFill(): void {
    if (this.scheduled) return;
    this.scheduled = true;
    queueMicrotask(() => {
      this.scheduled = false;
      this.fillEmptyCustomerFields();
    });
  }

  private async loadProfile(): Promise<void> {
    this.loading = true;
    try {
      const token = await this.auth.getAccessToken();
      const user = this.auth.user();
      if (!token || !user?.id) return;
      const response = await fetch(
        `${SUPABASE_PROJECT_URL}/rest/v1/customer_profiles?user_id=eq.${encodeURIComponent(user.id)}&select=full_name,email,phone&limit=1`,
        { headers: { apikey: SUPABASE_PUBLISHABLE_KEY, authorization: `Bearer ${token}` } },
      );
      if (!response.ok) return;
      const rows = await response.json() as AutofillProfile[];
      this.profile = rows[0] || { email: user.email || null };
    } finally {
      this.loading = false;
    }
  }

  private fillEmptyCustomerFields(): void {
    if (!this.profile || typeof document === 'undefined') return;
    const fullName = String(this.profile.full_name || '').trim();
    const nameParts = fullName.split(/\s+/).filter(Boolean);
    const givenName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : (nameParts[0] || '');
    const familyName = nameParts.length > 1 ? nameParts.at(-1) || '' : '';
    const values: Record<string, string> = {
      'name': fullName,
      'given-name': givenName,
      'family-name': familyName,
      'tel': String(this.profile.phone || '').trim(),
      'email': String(this.profile.email || this.auth.user()?.email || '').trim(),
    };

    for (const [autocomplete, value] of Object.entries(values)) {
      if (!value) continue;
      const controls = document.querySelectorAll<HTMLInputElement>(`input[autocomplete="${autocomplete}"]`);
      for (const control of controls) {
        if (control.disabled || control.readOnly || control.value.trim()) continue;
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
        setter?.call(control, value);
        control.dispatchEvent(new Event('input', { bubbles: true }));
        control.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  }
}
