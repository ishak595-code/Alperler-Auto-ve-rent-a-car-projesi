import { CommonModule } from "@angular/common";
import { Component, OnDestroy, OnInit, signal } from "@angular/core";
import { MatIconModule } from "@angular/material/icon";

interface InstallChoice { outcome: "accepted" | "dismissed"; platform?: string }
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<InstallChoice>;
}

@Component({
  selector: "app-pwa-install",
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    @if (visible()) {
      <aside class="fixed inset-x-3 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[180] mx-auto max-w-md rounded-[24px] border border-white/15 bg-slate-950/95 p-4 text-white shadow-2xl backdrop-blur-xl md:inset-x-auto md:right-5" role="status" aria-live="polite">
        <div class="flex items-start gap-3">
          <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-400 text-slate-950"><mat-icon>directions_car</mat-icon></div>
          <div class="min-w-0 flex-1">
            <div class="flex items-start justify-between gap-2">
              <div><strong class="block text-base font-black">Alperler'i telefona ekle</strong><p class="mt-1 text-xs leading-relaxed text-slate-300">Daha hızlı açılır, tam ekran çalışır ve ana ekranınızdan uygulama gibi erişilir.</p></div>
              <button type="button" (click)="dismiss()" class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-400/40" aria-label="Kurulum önerisini kapat"><mat-icon>close</mat-icon></button>
            </div>

            @if (iosMode()) {
              <div class="mt-3 rounded-xl bg-white/10 p-3 text-xs leading-relaxed text-slate-200"><strong class="text-white">iPhone / iPad:</strong> Safari'de Paylaş düğmesine dokunun, ardından <strong>Ana Ekrana Ekle</strong> seçeneğini seçin.</div>
            } @else {
              <button type="button" (click)="install()" [disabled]="installing()" class="mt-3 min-h-11 w-full rounded-xl bg-amber-400 px-4 text-sm font-black text-slate-950 shadow-lg disabled:opacity-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-300/40">{{ installing() ? 'Hazırlanıyor…' : 'Uygulamayı Yükle' }}</button>
            }
          </div>
        </div>
      </aside>
    }
  `,
})
export class PwaInstallComponent implements OnInit, OnDestroy {
  readonly visible = signal(false);
  readonly iosMode = signal(false);
  readonly installing = signal(false);
  private promptEvent?: BeforeInstallPromptEvent;
  private readonly promptHandler = (event: Event) => {
    event.preventDefault();
    this.promptEvent = event as BeforeInstallPromptEvent;
    if (!this.isDismissed() && !this.isStandalone()) this.visible.set(true);
  };
  private readonly installedHandler = () => {
    this.visible.set(false);
    this.promptEvent = undefined;
  };

  ngOnInit(): void {
    if (typeof window === "undefined") return;
    if (this.isStandalone()) return;
    window.addEventListener("beforeinstallprompt", this.promptHandler);
    window.addEventListener("appinstalled", this.installedHandler);
    const isiOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    this.iosMode.set(isiOS);
    if (isiOS && !this.isDismissed()) window.setTimeout(() => this.visible.set(true), 2500);
  }

  ngOnDestroy(): void {
    if (typeof window === "undefined") return;
    window.removeEventListener("beforeinstallprompt", this.promptHandler);
    window.removeEventListener("appinstalled", this.installedHandler);
  }

  async install(): Promise<void> {
    if (!this.promptEvent) return;
    this.installing.set(true);
    try {
      await this.promptEvent.prompt();
      const choice = await this.promptEvent.userChoice;
      if (choice.outcome === "accepted") this.visible.set(false);
      this.promptEvent = undefined;
    } finally {
      this.installing.set(false);
    }
  }

  dismiss(): void {
    this.visible.set(false);
    if (typeof localStorage !== "undefined") localStorage.setItem("alperler-pwa-dismissed-until", String(Date.now() + 7 * 24 * 60 * 60 * 1000));
  }

  private isStandalone(): boolean {
    const nav = navigator as Navigator & { standalone?: boolean };
    return window.matchMedia?.("(display-mode: standalone)").matches || nav.standalone === true;
  }

  private isDismissed(): boolean {
    if (typeof localStorage === "undefined") return false;
    return Number(localStorage.getItem("alperler-pwa-dismissed-until") || 0) > Date.now();
  }
}
