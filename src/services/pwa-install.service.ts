import { Injectable, signal } from '@angular/core';

type InstallOutcome = 'accepted' | 'dismissed' | 'unavailable';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

type InstallAwareWindow = Window & { __alperlerInstallPrompt?: BeforeInstallPromptEvent };

@Injectable({ providedIn: 'root' })
export class PwaInstallService {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private readonly _canInstall = signal(false);
  private readonly _installed = signal(false);
  private readonly _runningAsApp = signal(false);
  private readonly _mobileBrowser = signal(false);
  private readonly _workerReady = signal(false);

  readonly canInstall = this._canInstall.asReadonly();
  readonly installed = this._installed.asReadonly();
  readonly runningAsApp = this._runningAsApp.asReadonly();
  readonly mobileBrowser = this._mobileBrowser.asReadonly();
  readonly workerReady = this._workerReady.asReadonly();

  constructor() {
    if (typeof window === 'undefined') return;

    this.refreshEnvironment();
    this.adoptBufferedPrompt();

    window.addEventListener('alperler:pwa-install-ready', () => this.adoptBufferedPrompt());
    window.addEventListener('alperler:pwa-installed', () => this.markInstalled());
    window.addEventListener('alperler:pwa-worker-ready', () => this._workerReady.set(true));
    window.addEventListener('beforeinstallprompt', (event: Event) => {
      const installEvent = event as BeforeInstallPromptEvent;
      installEvent.preventDefault();
      this.deferredPrompt = installEvent;
      this.installWindow().__alperlerInstallPrompt = installEvent;
      this._installed.set(false);
      this._canInstall.set(!this.isAppMode());
    });
    window.addEventListener('appinstalled', () => this.markInstalled());

    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.ready.then(() => this._workerReady.set(true)).catch(() => undefined);
    }

    for (const query of ['(display-mode: standalone)', '(display-mode: fullscreen)']) {
      window.matchMedia(query).addEventListener?.('change', () => this.refreshEnvironment());
    }
  }

  async install(): Promise<InstallOutcome> {
    if (this.isAppMode()) {
      this.refreshEnvironment();
      return 'accepted';
    }

    this.adoptBufferedPrompt();
    const prompt = this.deferredPrompt;
    if (!prompt) return 'unavailable';

    this._canInstall.set(false);
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      this.deferredPrompt = null;
      delete this.installWindow().__alperlerInstallPrompt;
      if (choice.outcome === 'accepted' || this.isAppMode()) this._installed.set(true);
      return choice.outcome;
    } catch {
      this.deferredPrompt = null;
      delete this.installWindow().__alperlerInstallPrompt;
      this.refreshEnvironment();
      return 'unavailable';
    }
  }

  installStatusText(): string {
    if (this.runningAsApp()) return 'Uygulama tam ekran modunda çalışıyor.';
    if (this.installed()) return 'Kurulum tamamlandı. Tam ekran sürümü ana ekrandaki Alperler simgesinden açın.';
    if (this.canInstall()) return 'Kuruluma hazır. Uygulama, tarayıcı çubukları olmadan açılacaktır.';
    if (this.workerReady()) return 'Chrome kurulum uygunluğunu hazırlıyor. Birkaç saniye sonra yükleme seçeneği aktif olur.';
    return 'Uygulama kurulumu hazırlanıyor.';
  }

  private adoptBufferedPrompt(): void {
    const buffered = this.installWindow().__alperlerInstallPrompt;
    if (!buffered || this.isAppMode()) return;
    this.deferredPrompt = buffered;
    this._installed.set(false);
    this._canInstall.set(true);
  }

  private markInstalled(): void {
    this.deferredPrompt = null;
    delete this.installWindow().__alperlerInstallPrompt;
    this._canInstall.set(false);
    this._installed.set(true);
    this.refreshEnvironment(true);
  }

  private refreshEnvironment(preserveInstalled = false): void {
    if (typeof window === 'undefined') return;
    const appMode = this.isAppMode();
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const mobileOrTablet = window.matchMedia('(max-width: 1100px)').matches;
    this._runningAsApp.set(appMode);
    if (appMode) this._installed.set(true);
    else if (!preserveInstalled) this._installed.set(false);
    this._mobileBrowser.set(!appMode && coarse && mobileOrTablet);
    if (appMode) this._canInstall.set(false);
    else this.adoptBufferedPrompt();
  }

  private installWindow(): InstallAwareWindow {
    return window as InstallAwareWindow;
  }

  private isAppMode(): boolean {
    if (typeof window === 'undefined') return false;
    const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
    return window.matchMedia('(display-mode: standalone)').matches
      || window.matchMedia('(display-mode: fullscreen)').matches
      || navigatorWithStandalone.standalone === true;
  }
}
