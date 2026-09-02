import { DOCUMENT, CommonModule } from "@angular/common";
import { Component, HostListener, OnDestroy, effect, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { UiService } from "../services/ui.service";

type FeedbackCategory = "BUG" | "FEATURE" | "GENERAL" | "CONTENT" | "OTHER";

interface FeedbackStoreResponse {
  ok?: boolean;
  stored?: boolean;
  reference?: string;
  code?: string;
}

interface BodyStyleSnapshot {
  overflow: string;
  position: string;
  top: string;
  left: string;
  right: string;
  width: string;
  paddingRight: string;
}

@Component({
  selector: "app-feedback",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (uiService.isFeedbackOpen()) {
      <div class="feedback-layer" role="presentation">
        <section
          id="feedback-dialog"
          class="panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="feedback-title"
          aria-describedby="feedback-subtitle"
          tabindex="-1"
          (keydown)="onDialogKeydown($event)"
        >
          <header class="panel-head">
            <div class="panel-head-copy">
              <h2 id="feedback-title">{{ t().feedback.title }}</h2>
              <p id="feedback-subtitle">{{ t().feedback.subtitle }}</p>
            </div>
            <button type="button" (click)="close()" class="close-button" aria-label="Geri bildirimi kapat">
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
    :host{display:contents}.feedback-layer{position:fixed;inset:0;z-index:1000;width:100vw;height:100vh;height:100dvh;overflow:hidden;background:#f8fafc;isolation:isolate;overscroll-behavior:none}.panel{position:fixed;inset:0;display:flex;width:100vw;height:100vh;height:100dvh;max-width:none;max-height:none;flex-direction:column;overflow:hidden;background:#fff;outline:0;contain:layout paint;overscroll-behavior:none}.panel-head{display:flex;min-height:80px;flex:none;align-items:center;justify-content:space-between;gap:1rem;background:#07101f;padding:max(1rem,env(safe-area-inset-top)) max(1rem,env(safe-area-inset-right)) 1rem max(1rem,env(safe-area-inset-left));color:#fff}.panel-head-copy{min-width:0}.panel-head h2{margin:0;color:#60a5fa;font-family:Georgia,"Times New Roman",serif;font-size:clamp(1.18rem,2.3vw,1.55rem)}.panel-head p{max-width:760px;margin:.25rem 0 0;color:#cbd5e1;font-size:.78rem;line-height:1.45}.close-button{display:grid;width:48px;height:48px;flex:none;place-items:center;border:1px solid rgba(255,255,255,.18);border-radius:14px;background:rgba(255,255,255,.08);color:#fff;font-size:1.65rem;touch-action:manipulation}.panel-content{min-height:0;flex:1;overflow-x:hidden;overflow-y:auto;overscroll-behavior:contain;scrollbar-gutter:stable;background:#f8fafc;padding:clamp(1rem,3vw,2rem) max(clamp(1rem,4vw,3rem),env(safe-area-inset-right)) max(clamp(1.25rem,4vw,3rem),env(safe-area-inset-bottom)) max(clamp(1rem,4vw,3rem),env(safe-area-inset-left));-webkit-overflow-scrolling:touch}.feedback-form{display:grid;width:min(100%,780px);margin:0 auto;gap:1rem}.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:.75rem}.field{display:flex;min-width:0;flex-direction:column;gap:.4rem}.field>span,.rating-field legend{color:#475569;font-size:.7rem;font-weight:900;letter-spacing:.07em;text-transform:uppercase}.field input,.field select,.field textarea{width:100%;border:1px solid #cbd5e1;border-radius:12px;background:#fff;padding:.75rem;color:#0f172a;font:inherit;outline:none}.field input,.field select{min-height:48px}.field textarea{min-height:132px;resize:vertical}.field input:focus,.field select:focus,.field textarea:focus{border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,.13)}.rating-field{margin:0;border:0;padding:0}.rating-row{display:flex;flex-wrap:wrap;gap:.35rem;margin-top:.45rem}.star-button{display:grid;width:44px;height:44px;place-items:center;border:0;border-radius:10px;background:#e2e8f0;color:#94a3b8;font-size:1.45rem;touch-action:manipulation}.star-button.selected{background:#eff6ff;color:#2563eb}.star-button:focus-visible,.close-button:focus-visible,.submit-button:focus-visible,.success-state button:focus-visible{outline:3px solid #60a5fa;outline-offset:2px}.form-error{margin:0;border-radius:10px;background:#fff1f2;padding:.75rem;color:#be123c;font-size:.78rem;font-weight:800}.submit-button{min-height:52px;border:0;border-radius:12px;background:#0f172a;color:#fff;font-weight:900;touch-action:manipulation}.submit-button:disabled{opacity:.45}.success-state{display:flex;width:min(100%,620px);min-height:calc(100dvh - 160px);margin:0 auto;flex-direction:column;align-items:center;justify-content:center;text-align:center}.success-icon{display:grid;width:68px;height:68px;place-items:center;border-radius:999px;background:#dcfce7;color:#15803d;font-size:2rem;font-weight:950}.success-state h3{margin:1rem 0 .4rem;color:#0f172a;font-size:1.5rem}.success-state p{max-width:420px;margin:0;color:#64748b;line-height:1.55}.success-state strong{margin-top:.8rem;color:#334155;font-size:.78rem}.success-state button{min-height:46px;margin-top:1.4rem;border:0;border-radius:12px;background:#0f172a;padding:0 1.3rem;color:#fff;font-weight:900;touch-action:manipulation}@media(max-width:560px){.form-grid{grid-template-columns:1fr}.panel-head{min-height:74px}.panel-content{scrollbar-gutter:auto}}@media(prefers-reduced-motion:reduce){.panel,.panel-content,.close-button,.star-button,.submit-button{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
  `],
})
export class FeedbackComponent implements OnDestroy {
  readonly uiService = inject(UiService);
  readonly t = this.uiService.translations;
  private readonly document = inject(DOCUMENT);

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
  private modalActive = false;
  private modalScrollY = 0;
  private previousFocus: HTMLElement | null = null;
  private bodyStyleSnapshot: BodyStyleSnapshot | null = null;

  private readonly modalLifecycle = effect(() => {
    const open = this.uiService.isFeedbackOpen();
    if (typeof window === "undefined") return;
    if (open) this.activateModal();
    else this.deactivateModal();
  });

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
    if (!this.uiService.isFeedbackOpen()) return;
    this.uiService.closeFeedback();
    this.reset();
  }

  @HostListener("document:keydown.escape", ["$event"])
  onEscape(event: KeyboardEvent): void {
    if (!this.uiService.isFeedbackOpen()) return;
    event.preventDefault();
    event.stopPropagation();
    this.close();
  }

  onDialogKeydown(event: KeyboardEvent): void {
    if (event.key !== "Tab") return;
    const panel = this.document.getElementById("feedback-dialog");
    if (!panel) return;
    const focusable = Array.from(
      panel.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
      )
    ).filter((element) => element.getClientRects().length > 0);
    if (!focusable.length) {
      event.preventDefault();
      panel.focus({ preventScroll: true });
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = this.document.activeElement;
    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus({ preventScroll: true });
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus({ preventScroll: true });
    }
  }

  ngOnDestroy(): void {
    this.modalLifecycle.destroy();
    this.deactivateModal(false);
  }

  private activateModal(): void {
    if (this.modalActive) return;
    this.modalActive = true;
    this.modalScrollY = window.scrollY;
    this.previousFocus = this.document.activeElement instanceof HTMLElement ? this.document.activeElement : null;
    const body = this.document.body;
    this.bodyStyleSnapshot = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      paddingRight: body.style.paddingRight,
    };
    const scrollbarGap = Math.max(0, window.innerWidth - this.document.documentElement.clientWidth);
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${this.modalScrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    if (scrollbarGap > 0) body.style.paddingRight = `${scrollbarGap}px`;
    this.document.documentElement.dataset["feedbackModalOpen"] = "true";
    window.requestAnimationFrame(() => {
      this.document.getElementById("feedback-dialog")?.focus({ preventScroll: true });
    });
  }

  private deactivateModal(restoreFocus = true): void {
    if (!this.modalActive) return;
    this.modalActive = false;
    const body = this.document.body;
    const snapshot = this.bodyStyleSnapshot;
    if (snapshot) {
      body.style.overflow = snapshot.overflow;
      body.style.position = snapshot.position;
      body.style.top = snapshot.top;
      body.style.left = snapshot.left;
      body.style.right = snapshot.right;
      body.style.width = snapshot.width;
      body.style.paddingRight = snapshot.paddingRight;
    }
    delete this.document.documentElement.dataset["feedbackModalOpen"];
    window.scrollTo(0, this.modalScrollY);
    if (restoreFocus && this.previousFocus?.isConnected) this.previousFocus.focus({ preventScroll: true });
    this.previousFocus = null;
    this.bodyStyleSnapshot = null;
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
