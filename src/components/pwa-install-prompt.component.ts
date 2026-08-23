import { Component, inject, signal } from '@angular/core';
import { PwaInstallService } from '../services/pwa-install.service';

@Component({
  selector: 'app-pwa-install-prompt',
  standalone: true,
  template: `
    @if (install.mobileBrowser() && !install.installed() && !dismissed()) {
      <aside class="install-card" role="region" aria-label="Alperler uygulamasını yükle">
        <div class="install-copy">
          <span class="app-mark" aria-hidden="true">A</span>
          <div>
            <strong>Alperler uygulamasını yükle</strong>
            <small>{{ install.installStatusText() }}</small>
          </div>
        </div>
        <div class="install-actions">
          <button type="button" class="dismiss" (click)="dismiss()" aria-label="Uygulama yükleme önerisini kapat">Şimdi değil</button>
          <button
            type="button"
            class="install"
            (click)="startInstall()"
            [disabled]="working() || !install.canInstall()"
            [attr.aria-label]="install.canInstall() ? 'Alperler Rent A Car uygulamasını yükle' : 'Uygulama kurulumu hazırlanıyor'"
          >
            {{ working() ? 'Açılıyor...' : install.canInstall() ? 'Uygulamayı yükle' : 'Kurulum hazırlanıyor' }}
          </button>
        </div>
        @if (notice()) { <p class="install-notice" role="status">{{ notice() }}</p> }
      </aside>
    }
  `,
  styles: [`
    :host{display:none}.install-card{position:fixed;z-index:96;left:max(.75rem,env(safe-area-inset-left));right:max(.75rem,env(safe-area-inset-right));bottom:calc(max(.75rem,env(safe-area-inset-bottom)) + 5.2rem);border:1px solid color-mix(in srgb,var(--alper-gold,#c6a15b) 38%,transparent);border-radius:min(var(--site-radius,18px),20px);background:linear-gradient(145deg,color-mix(in srgb,var(--alper-surface,#0b1420) 96%,transparent),color-mix(in srgb,var(--alper-bg,#060a12) 99%,transparent));padding:.78rem;box-shadow:0 18px 50px rgba(0,0,0,.48);color:var(--alper-text,#f4f6f8);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}.install-copy{display:grid;grid-template-columns:auto 1fr;align-items:center;gap:.7rem}.app-mark{display:grid;width:42px;height:42px;place-items:center;border-radius:12px;background:var(--alper-gold,#c6a15b);color:#111827;font:950 1rem/1 Georgia,serif}.install-copy strong,.install-copy small{display:block}.install-copy strong{font-size:.78rem}.install-copy small{margin-top:.18rem;color:var(--alper-muted,#a2adba);font-size:.62rem;line-height:1.4}.install-actions{display:grid;grid-template-columns:auto 1fr;gap:.5rem;margin-top:.7rem}.install-actions button{min-height:44px;border-radius:11px;padding:0 .8rem;font:900 .67rem/1 ui-sans-serif,system-ui,sans-serif}.dismiss{border:1px solid var(--alper-border,#304158);background:var(--alper-card,#0e1724);color:var(--alper-muted,#aab5c4)}.install{border:1px solid color-mix(in srgb,var(--alper-gold,#c6a15b) 78%,#000);background:var(--alper-gold,#c6a15b);color:#111827}.install:disabled{border-color:var(--alper-border,#304158);background:var(--alper-elevated,#121d2c);color:var(--alper-subtle,#718096);opacity:1}.install-notice{margin:.55rem 0 0;color:var(--alper-muted,#a2adba);font-size:.61rem;line-height:1.4}button:focus-visible{outline:3px solid var(--alper-blue-light,#7899b8);outline-offset:2px}@media(max-width:1100px) and (pointer:coarse){:host{display:contents}}@media(prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
  `],
})
export class PwaInstallPromptComponent {
  readonly install = inject(PwaInstallService);
  readonly working = signal(false);
  readonly dismissed = signal(false);
  readonly notice = signal<string | null>(null);

  dismiss(): void {
    this.dismissed.set(true);
  }

  async startInstall(): Promise<void> {
    if (this.working() || !this.install.canInstall()) return;
    this.working.set(true);
    this.notice.set(null);
    try {
      const outcome = await this.install.install();
      if (outcome === 'dismissed') {
        this.notice.set('Kurulum iptal edildi. İsterseniz daha sonra tekrar deneyebilirsiniz.');
      } else if (outcome === 'unavailable') {
        this.notice.set('Chrome kurulum oturumunu yeniliyor. Sayfada kısa süre gezinip tekrar deneyin.');
      }
    } finally {
      this.working.set(false);
    }
  }
}
