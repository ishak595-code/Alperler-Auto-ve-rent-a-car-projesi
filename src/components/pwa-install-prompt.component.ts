import { Component, inject, signal } from '@angular/core';
import { PwaInstallService } from '../services/pwa-install.service';

@Component({
  selector: 'app-pwa-install-prompt',
  standalone: true,
  template: `
    @if (install.mobileBrowser() && install.canInstall() && !dismissed()) {
      <aside class="install-card" role="region" aria-label="Alperler uygulamasını yükle">
        <div class="install-copy">
          <span class="app-mark" aria-hidden="true">A</span>
          <div><strong>Alperler uygulamasını yükle</strong><small>Tarayıcı çubukları olmadan, uygulama görünümünde açın.</small></div>
        </div>
        <div class="install-actions">
          <button type="button" class="dismiss" (click)="dismiss()" aria-label="Uygulama yükleme önerisini kapat">Şimdi değil</button>
          <button type="button" class="install" (click)="startInstall()" [disabled]="working()" aria-label="Alperler Rent A Car uygulamasını yükle">
            {{ working() ? 'Açılıyor...' : 'Uygulamayı yükle' }}
          </button>
        </div>
      </aside>
    }
  `,
  styles: [`
    :host{display:none}.install-card{position:fixed;z-index:96;left:max(.75rem,env(safe-area-inset-left));right:max(.75rem,env(safe-area-inset-right));bottom:calc(max(.75rem,env(safe-area-inset-bottom)) + 5.2rem);border:1px solid rgba(198,161,91,.38);border-radius:18px;background:linear-gradient(145deg,rgba(11,20,32,.985),rgba(6,10,18,.995));padding:.78rem;box-shadow:0 18px 50px rgba(0,0,0,.48);color:#f4f6f8;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}.install-copy{display:grid;grid-template-columns:auto 1fr;align-items:center;gap:.7rem}.app-mark{display:grid;width:42px;height:42px;place-items:center;border-radius:12px;background:#c6a15b;color:#111827;font:950 1rem/1 Georgia,serif}.install-copy strong,.install-copy small{display:block}.install-copy strong{font-size:.78rem}.install-copy small{margin-top:.18rem;color:#9aa8b9;font-size:.62rem;line-height:1.4}.install-actions{display:grid;grid-template-columns:auto 1fr;gap:.5rem;margin-top:.7rem}.install-actions button{min-height:44px;border-radius:11px;padding:0 .8rem;font:900 .67rem/1 ui-sans-serif,system-ui,sans-serif}.dismiss{border:1px solid #304158;background:#0e1724;color:#aab5c4}.install{border:1px solid #b58d42;background:#c6a15b;color:#111827}.install:disabled{opacity:.62}button:focus-visible{outline:3px solid #7899b8;outline-offset:2px}@media(max-width:767px) and (pointer:coarse){:host{display:contents}}@media(prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
  `],
})
export class PwaInstallPromptComponent {
  readonly install = inject(PwaInstallService);
  readonly working = signal(false);
  readonly dismissed = signal(false);

  dismiss(): void {
    this.dismissed.set(true);
  }

  async startInstall(): Promise<void> {
    if (this.working()) return;
    this.working.set(true);
    try {
      const outcome = await this.install.install();
      if (outcome === 'dismissed') this.dismissed.set(true);
    } finally {
      this.working.set(false);
    }
  }
}
