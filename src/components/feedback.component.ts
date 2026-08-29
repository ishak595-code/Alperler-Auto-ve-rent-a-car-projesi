import { CommonModule } from "@angular/common";
import { Component, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { UiService } from "../services/ui.service";

type FeedbackCategory = "BUG" | "FEATURE" | "GENERAL" | "CONTENT" | "OTHER";

interface FeedbackStoreResponse {
  ok?: boolean;
  stored?: boolean;
  reference?: string;
  code?: string;
}

@Component({
  selector: "app-feedback",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (uiService.isFeedbackOpen()) {
      <div class="feedback-layer" role="presentation">
        <button type="button" class="backdrop" (click)="close()" aria-label="Geri bildirimi kapat"></button>
        <section class="panel" role="dialog" aria-modal="true" aria-labelledby="feedback-title">
          <header class="panel-head">
            <div>
              <h2 id="feedback-title">{{ t().feedback.title }}</h2>
              <p>{{ t().feedback.subtitle }}</p>
            </div>
            <button type="button" (click)="close()" class="close-button" aria-label="Kapat">
              <span aria-hidden="true">×</span>
            </button>
          </header>

          <div class="panel-content">
            @if (!isSuccess()) {
              <form (submit)="submitFeedback($event)" class="feedback-form" novalidate>
                <div class="form-grid">
                  <label class="field"><span>Ad</span><input [(ngModel)]="name" name="feedbackName" autocomplete="given-name" maxlength="80" required /></label>
                  <label class="field"><span>Soyad</span><input [(ngModel)]="surname" name="feedbackSurname" autocomplete="family-name" maxlength="80" required /></label>
                </div>
                <div class="form-grid">
                  <label class="field"><span>Telefon</span><input [(ngModel)]="phone" name="feedbackPhone" type="tel" inputmode="tel" autocomplete="tel" maxlength="40" required /></label>
                  <label class="field"><span>E-posta</span><input [(ngModel)]="email" name="feedbackEmail" type="email" inputmode="email" autocomplete="email" maxlength="160" required /></label>
                </div>

                <label class="field">
                  <span>{{ t().feedback.category }}</span>
                  <select [(ngModel)]="category" name="feedbackCategory" aria-label="Geri bildirim kategorisi">
                    <option value="GENERAL">{{ t().feedback.categories.GENERAL }}</option>
                    <option value="BUG">{{ t().feedback.categories.BUG }}</option>
                    <option value="FEATURE">{{ t().feedback.categories.FEATURE }}</option>
                    <option value="CONTENT">{{ t().feedback.categories.CONTENT }}</option>
                    <option value="OTHER">{{ t().feedback.categories.OTHER }}</option>
                  </select>
                </label>

                <fieldset class="rating-field">
                  <legend>{{ t().feedback.rating }}</legend>
                  <div class="rating-row">
                    @for (star of [1, 2, 3, 4, 5]; track star) {
                      <button
                        type="button"
                        (click)="rating.set(star)"
                        [attr.aria-label]="star + ' yıldız'"
                        [attr.aria-pressed]="rating() === star"
                        [class.selected]="star <= rating()"
                        class="star-button"
                      >
                        <span aria-hidden="true">★</span>
                      </button>
                    }
                  </div>
                </fieldset>

                <label class="field">
                  <span>{{ t().feedback.message }}</span>
                  <textarea [(ngModel)]="message" name="feedbackMessage" rows="5" maxlength="3000" [placeholder]="t().feedback.placeholder" required></textarea>
                </label>

                @if (errorMessage()) {
                  <p class="form-error" role="alert">{{ errorMessage() }}</p>
                }

                <button type="submit" [disabled]="submitting() || !isValid()" class="submit-button">
                  {{ submitting() ? 'Kaydediliyor' : t().feedback.submit }}
                </button>
              </form>
            } @else {
              <div class="success-state" role="status" aria-live="polite">
                <div class="success-icon" aria-hidden="true">✓</div>
                <h3>{{ t().feedback.success }}</h3>
                <p>Görüşünüz güvenli şekilde kaydedildi ve ekibimizin mesaj kutusuna iletildi.</p>
                @if (reference()) { <strong>Referans: {{ reference() }}</strong> }
                <button type="button" (click)="close()">Kapat</button>
              </div>
            }
          </div>
        </section>
      </div>
    }
  `,
  styles: [`
    :host{display:contents}.feedback-layer{position:fixed;inset:0;z-index:160;display:flex;justify-content:flex-end}.backdrop{position:absolute;inset:0;border:0;background:rgba(2,6,23,.7);backdrop-filter:blur(3px)}.panel{position:relative;display:flex;width:min(100%,460px);height:100%;flex-direction:column;background:#fff;box-shadow:-20px 0 60px rgba(2,6,23,.28)}.panel-head{display:flex;align-items:center;justify-content:space-between;gap:1rem;background:#07101f;padding:1.2rem 1.25rem;color:#fff}.panel-head h2{margin:0;color:#60a5fa;font-family:Georgia,"Times New Roman",serif;font-size:1.3rem}.panel-head p{margin:.25rem 0 0;color:#94a3b8;font-size:.75rem;line-height:1.4}.close-button{display:grid;width:44px;height:44px;flex:none;place-items:center;border:1px solid rgba(255,255,255,.12);border-radius:12px;background:rgba(255,255,255,.06);color:#fff;font-size:1.6rem}.panel-content{flex:1;overflow-y:auto;background:#f8fafc;padding:1.25rem}.feedback-form{display:grid;gap:1rem}.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:.75rem}.field{display:flex;min-width:0;flex-direction:column;gap:.4rem}.field>span,.rating-field legend{color:#475569;font-size:.7rem;font-weight:900;letter-spacing:.07em;text-transform:uppercase}.field input,.field select,.field textarea{width:100%;border:1px solid #cbd5e1;border-radius:12px;background:#fff;padding:.75rem;color:#0f172a;font:inherit;outline:none}.field input,.field select{min-height:48px}.field input:focus,.field select:focus,.field textarea:focus{border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,.13)}.rating-field{margin:0;border:0;padding:0}.rating-row{display:flex;gap:.35rem;margin-top:.45rem}.star-button{display:grid;width:44px;height:44px;place-items:center;border:0;border-radius:10px;background:#e2e8f0;color:#94a3b8;font-size:1.45rem}.star-button.selected{background:#eff6ff;color:#2563eb}.star-button:focus-visible,.close-button:focus-visible,.submit-button:focus-visible,.success-state button:focus-visible{outline:3px solid #60a5fa;outline-offset:2px}.form-error{margin:0;border-radius:10px;background:#fff1f2;padding:.75rem;color:#be123c;font-size:.78rem;font-weight:800}.submit-button{min-height:52px;border:0;border-radius:12px;background:#0f172a;color:#fff;font-weight:900}.submit-button:disabled{opacity:.45}.success-state{display:flex;min-height:70vh;flex-direction:column;align-items:center;justify-content:center;text-align:center}.success-icon{display:grid;width:68px;height:68px;place-items:center;border-radius:999px;background:#dcfce7;color:#15803d;font-size:2rem;font-weight:950}.success-state h3{margin:1rem 0 .4rem;color:#0f172a;font-size:1.5rem}.success-state p{max-width:320px;margin:0;color:#64748b;line-height:1.55}.success-state strong{margin-top:.8rem;color:#334155;font-size:.78rem}.success-state button{min-height:46px;margin-top:1.4rem;border:0;border-radius:12px;background:#0f172a;padding:0 1.3rem;color:#fff;font-weight:900}@media(max-width:420px){.form-grid{grid-template-columns:1fr}.panel-content{padding:1rem}}
  `],
})
export class FeedbackComponent {
  readonly uiService = inject(UiService);
  readonly t = this.uiService.translations;

  category: FeedbackCategory = "GENERAL";
  rating = signal(5);
  name = "";
  surname = "";
  phone = "";
  email = "";
  message = "";
  readonly isSuccess = signal(false);
  readonly submitting = signal(false);
  readonly errorMessage = signal("");
  readonly reference = signal("");
  private submissionKey = crypto.randomUUID();

  isValid(): boolean {
    return Boolean(
      this.name.trim().length >= 2 &&
      this.surname.trim().length >= 2 &&
      /^[+0-9()\s-]{7,24}$/.test(this.phone.trim()) &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim()) &&
      this.message.trim().length >= 2
    );
  }

  async submitFeedback(event: Event): Promise<void> {
    event.preventDefault();
    if (!this.isValid() || this.submitting()) return;
    this.submitting.set(true);
    this.errorMessage.set("");
    try {
      const categoryLabel = this.categoryLabel(this.category);
      const storedMessage = `GERİ BİLDİRİM\nKategori: ${categoryLabel}\nPuan: ${this.rating()}/5\n\n${this.message.trim()}`;
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: this.name.trim(),
          surname: this.surname.trim(),
          phone: this.phone.trim(),
          email: this.email.trim(),
          message: storedMessage,
          idempotencyKey: this.submissionKey,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as FeedbackStoreResponse;
      if (!response.ok || !payload.ok || !payload.stored) throw new Error(payload.code || "FEEDBACK_STORE_FAILED");

      this.reference.set(payload.reference || "");
      this.isSuccess.set(true);
    } catch (error) {
      console.error("Feedback store failed", error);
      this.errorMessage.set("Geri bildirim kaydedilemedi. Lütfen tekrar deneyin.");
    } finally {
      this.submitting.set(false);
    }
  }

  close(): void {
    this.uiService.toggleFeedback(false);
    window.setTimeout(() => this.reset(), 200);
  }

  private reset(): void {
    this.category = "GENERAL";
    this.rating.set(5);
    this.name = "";
    this.surname = "";
    this.phone = "";
    this.email = "";
    this.message = "";
    this.isSuccess.set(false);
    this.submitting.set(false);
    this.errorMessage.set("");
    this.reference.set("");
    this.submissionKey = crypto.randomUUID();
  }

  private categoryLabel(category: FeedbackCategory): string {
    return ({ BUG: "Hata", FEATURE: "Özellik Önerisi", GENERAL: "Genel", CONTENT: "İçerik", OTHER: "Diğer" } as Record<FeedbackCategory, string>)[category];
  }
}
