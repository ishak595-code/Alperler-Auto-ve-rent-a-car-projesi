import { CommonModule, Location } from "@angular/common";
import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { Component, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatIconModule } from "@angular/material/icon";
import { Router } from "@angular/router";
import { firstValueFrom } from "rxjs";
import { CarService } from "../services/car.service";
import { AnalyticsIdentityService } from "../services/analytics-identity.service";
import { VisitorAnalyticsService } from "../services/visitor-analytics.service";
import { UiService } from "../services/ui.service";
import { resolvePublicWhatsappDigits } from "../services/public-contact-fallback";

interface ContactResponse {
  ok: boolean;
  stored?: boolean;
  reference?: string;
  code?: string;
  message?: string;
  delivery?: {
    adminEmail?: { state?: string };
    customerEmail?: { state?: string };
  };
}

@Component({
  selector: "app-contact",
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <main class="min-h-screen bg-slate-950 pb-20 text-slate-200">
      <header class="sticky top-0 z-40 border-b border-slate-800 bg-slate-900/95 shadow-lg backdrop-blur">
        <div class="mx-auto flex min-h-16 max-w-7xl items-center gap-3 px-4">
          <button type="button" (click)="goBack()" data-analytics-key="contact-back" class="flex h-11 w-11 items-center justify-center rounded-xl text-slate-300 hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-prestige-red-light" [attr.aria-label]="t().contactPage.backAria">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <div class="min-w-0">
            <h1 class="font-black text-white">{{ t().contactPage.title }}</h1>
            <p class="truncate text-xs text-slate-400">{{ t().contactPage.headerSub }}</p>
          </div>
        </div>
      </header>

      <div class="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[0.82fr_1.18fr] lg:py-12">
        <section class="space-y-5">
          <div>
            <span class="text-xs font-black uppercase tracking-[.18em] text-prestige-red-light">{{ t().contactPage.eyebrow }}</span>
            <h2 class="mt-2 font-serif text-3xl font-black text-white sm:text-4xl">{{ t().contactPage.heroTitle }}</h2>
            <p class="mt-3 max-w-xl leading-relaxed text-slate-400">{{ t().contactPage.heroCopy }}</p>
          </div>

          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <a [href]="'tel:' + config().phone" data-analytics-key="contact-phone" class="contact-card"><mat-icon>call</mat-icon><span><strong>{{ t().contactPage.phone }}</strong><small>{{ config().phone }}</small></span></a>
            <a [href]="'mailto:' + config().email" data-analytics-key="contact-email" class="contact-card"><mat-icon>mail</mat-icon><span><strong>{{ t().contactPage.email }}</strong><small>{{ config().email }}</small></span></a>
            <a [href]="whatsappUrl()" data-analytics-key="contact-whatsapp" target="_blank" rel="noopener" class="contact-card"><mat-icon>chat</mat-icon><span><strong>{{ t().contactPage.whatsapp }}</strong><small>{{ t().contactPage.whatsappHint }}</small></span></a>
            <div class="contact-card"><mat-icon>location_on</mat-icon><span><strong>{{ t().contactPage.address }}</strong><small>{{ config().address }}</small></span></div>
          </div>
        </section>

        <section class="rounded-3xl bg-white p-5 text-slate-900 shadow-2xl sm:p-8">
          @if (sent()) {
            <div role="status" aria-live="polite" class="flex min-h-[28rem] flex-col items-center justify-center text-center">
              <div class="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><mat-icon class="!h-9 !w-9 !text-[36px]">check_circle</mat-icon></div>
              <h2 class="mt-5 text-2xl font-black">{{ t().contactPage.successTitle }}</h2>
              <p class="mt-2 max-w-md text-sm leading-relaxed text-slate-600">{{ t().contactPage.successCopy }}</p>
              @if (reference()) {
                <div class="mt-5 rounded-xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-800">{{ referenceLabel() }}</div>
              }
              @if (!customerEmailSent()) {
                <p class="mt-4 max-w-md text-xs leading-relaxed text-slate-500">{{ t().contactPage.emailNote }}</p>
              }
              <button type="button" (click)="reset()" data-analytics-key="contact-new-message" class="mt-6 min-h-12 rounded-xl bg-slate-900 px-6 font-black text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-prestige-red-light">{{ t().contactPage.newMessage }}</button>
            </div>
          } @else {
            <div class="mb-6"><h2 class="text-2xl font-black">{{ t().contactPage.formTitle }}</h2><p class="mt-1 text-sm text-slate-500">{{ t().contactPage.formHint }}</p></div>
            <form (ngSubmit)="submit()" data-analytics-form="contact" class="space-y-5" novalidate>
              <div class="grid gap-4 sm:grid-cols-2">
                <label class="field"><span>{{ t().contactPage.name }}</span><input autocomplete="given-name" [(ngModel)]="name" name="name" maxlength="80" required /></label>
                <label class="field"><span>{{ t().contactPage.surname }}</span><input autocomplete="family-name" [(ngModel)]="surname" name="surname" maxlength="80" required /></label>
              </div>
              <div class="grid gap-4 sm:grid-cols-2">
                <label class="field"><span>{{ t().contactPage.phoneLabel }}</span><input type="tel" inputmode="tel" autocomplete="tel" [(ngModel)]="phone" name="phone" maxlength="40" required /></label>
                <label class="field"><span>{{ t().contactPage.emailLabel }}</span><input type="email" inputmode="email" autocomplete="email" [(ngModel)]="email" name="email" maxlength="160" required /></label>
              </div>
              <label class="field"><span>{{ t().contactPage.message }}</span><textarea rows="6" [(ngModel)]="message" name="message" maxlength="4000" required [placeholder]="t().contactPage.messagePlaceholder"></textarea><small class="mt-1 text-right text-xs text-slate-400">{{ message.length }}/4000</small></label>
              @if (errorMessage()) {
                <div role="alert" aria-live="assertive" class="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800">{{ errorMessage() }}</div>
              }
              <button type="submit" data-analytics-key="contact-submit" [disabled]="submitting() || !isValid()" class="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 font-black text-white transition hover:bg-prestige-red disabled:cursor-not-allowed disabled:opacity-45 focus:outline-none focus-visible:ring-2 focus-visible:ring-prestige-red-light">
                @if (submitting()) { <mat-icon class="animate-spin">progress_activity</mat-icon>{{ t().contactPage.sending }} } @else { <mat-icon>send</mat-icon>{{ t().contactPage.send }} }
              </button>
            </form>
          }
        </section>
      </div>
    </main>
  `,
  styles: [`
    .contact-card{display:flex;min-height:72px;align-items:center;gap:14px;border:1px solid rgb(51 65 85);border-radius:16px;background:rgb(15 23 42);padding:14px 16px;color:rgb(226 232 240);text-decoration:none}.contact-card mat-icon{color:var(--alper-blue-light)}.contact-card span{display:flex;min-width:0;flex-direction:column}.contact-card strong{font-size:.9rem}.contact-card small{margin-top:2px;color:rgb(148 163 184);overflow-wrap:anywhere}.field{display:flex;flex-direction:column;gap:7px}.field>span{font-size:.72rem;font-weight:900;text-transform:uppercase;letter-spacing:.08em;color:rgb(71 85 105)}.field input,.field textarea{width:100%;border:1px solid rgb(203 213 225);border-radius:12px;background:rgb(248 250 252);padding:12px 14px;color:rgb(15 23 42);outline:none}.field input{min-height:48px}.field input:focus,.field textarea:focus{border-color:var(--alper-blue-light);box-shadow:0 0 0 2px rgba(225,90,98,.18)}
  `],
})
export class ContactComponent {
  private readonly http = inject(HttpClient);
  private readonly location = inject(Location);
  private readonly router = inject(Router);
  private readonly carService = inject(CarService);
  private readonly analyticsIdentity = inject(AnalyticsIdentityService);
  private readonly analytics = inject(VisitorAnalyticsService);
  private readonly ui = inject(UiService);
  readonly t = this.ui.translations;

  readonly config = this.carService.getConfig();
  readonly submitting = signal(false);
  readonly sent = signal(false);
  readonly errorMessage = signal("");
  readonly reference = signal("");
  readonly customerEmailSent = signal(false);

  name = "";
  surname = "";
  phone = "";
  email = "";
  message = "";
  private submissionKey = crypto.randomUUID();

  whatsappUrl(): string {
    const number = resolvePublicWhatsappDigits(this.config());
    const pack = String(this.t().contactPage?.whatsappDefault || this.t().common?.whatsappDefault || "").trim(); const text = (this.ui.currentLang() !== "TR" && pack) ? pack : (this.config().whatsappMessage || pack);
    return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
  }

  isValid(): boolean {
    return Boolean(this.name.trim().length >= 2 && this.surname.trim().length >= 2 && /^[+0-9()\s-]{7,24}$/.test(this.phone.trim()) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim()) && this.message.trim().length >= 2);
  }

  async submit(): Promise<void> {
    if (!this.isValid() || this.submitting()) return;
    this.errorMessage.set("");
    this.submitting.set(true);
    try {
      const response = await firstValueFrom(
        this.http.post<ContactResponse>("/api/contact", {
          name: this.name.trim(), surname: this.surname.trim(), phone: this.phone.trim(), email: this.email.trim(), message: this.message.trim(), idempotencyKey: this.submissionKey,
        }),
      );
      if (!response.ok || !response.stored) throw new Error(response.code || "CONTACT_STORE_FAILED");
      const savedReference = response.reference || "";
      this.reference.set(savedReference);
      this.customerEmailSent.set(response.delivery?.customerEmail?.state === "sent");
      this.sent.set(true);
      if (savedReference) void this.analyticsIdentity.link({ entityType: "CONTACT", reference: savedReference, phone: this.phone, email: this.email });
      this.analytics.trackFormSuccess('contact');
    } catch (error) {
      const code = error instanceof HttpErrorResponse && error.error?.code ? String(error.error.code) : error instanceof Error ? error.message : "CONTACT_STORE_FAILED";
      this.errorMessage.set(
        code === "RATE_LIMITED"
          ? this.t().contactPage.rateLimited
          : this.t().contactPage.sendFailed,
      );
    } finally {
      this.submitting.set(false);
    }
  }

  reset(): void {
    this.name = ""; this.surname = ""; this.phone = ""; this.email = ""; this.message = "";
    this.errorMessage.set(""); this.reference.set(""); this.customerEmailSent.set(false); this.sent.set(false);
    this.submissionKey = crypto.randomUUID();
  }

  goBack(): void {
    if (window.history.length > 1) this.location.back();
    else void this.router.navigate(["/"]);
  }
}
