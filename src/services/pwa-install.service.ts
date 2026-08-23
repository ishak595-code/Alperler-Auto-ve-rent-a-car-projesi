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
  private readonly _mobileBrowser = signal(false);
  private readonly _workerReady = signal(false);

  readonly canInstall = this._canInstall.asReadonly();
  readonly installed = this._installed.asReadonly();
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
      this._canInstall.set(!this.isStandalone());
    });
    window.addEventListener('appinstalled', () => this.markInstalled());

    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.ready.then(() => this._workerReady.set(true)).catch(() => undefined);
    }

    const standaloneQuery = window.matchMedia('(display-mode: standalone)');
    standaloneQuery.addEventListener?.('change', () => this.refreshEnvironment());
  }

  async install(): Promise<InstallOutcome> {
    if (this.isStandalone()) {
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
      if (choice.outcome === 'accepted' || this.isStandalone()) this._installed.set(true);
      return choice.outcome;
    } catch {
      this.deferredPrompt = null;
      delete this.installWindow().__alperlerInstallPrompt;
      this.refreshEnvironment();
      return 'unavailable';
    }
  }

  installStatusText(): string {
    if (this.installed()) return 'Uygulama görünümünde açılıyor.';
    if (this.canInstall()) return 'Kuruluma hazır. Tarayıcı çubukları olmadan uygulama olarak açabilirsiniz.';
    if (this.workerReady()) return 'Chrome kurulum uygunluğunu hazırlıyor. Sayfada kısa süre gezinip Uygulamayı yükle düğmesini kullanın.';
    return 'Uygulama kurulumu hazırlanıyor.';
  }

  private adoptBufferedPrompt(): void {
    const buffered = this.installWindow().__alperlerInstallPrompt;
    if (!buffered || this.isStandalone()) return;
    this.deferredPrompt = buffered;
    this._canInstall.set(true);
  }

  private markInstalled(): void {
    this.deferredPrompt = null;
    delete this.installWindow().__alperlerInstallPrompt;
    this._canInstall.set(false);
    this._installed.set(true);
  }

  private refreshEnvironment(): void {
    if (typeof window === 'undefined') return;
    const standalone = this.isStandalone();
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const mobileOrTablet = window.matchMedia('(max-width: 1100px)').matches;
    this._installed.set(standalone);
    this._mobileBrowser.set(!standalone && coarse && mobileOrTablet);
    if (standalone) this._canInstall.set(false);
    else this.adoptBufferedPrompt();
  }

  private installWindow(): InstallAwareWindow {
    return window as InstallAwareWindow;
  }

  private isStandalone(): boolean {
    if (typeof window === 'undefined') return false;
    const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
    return window.matchMedia('(display-mode: standalone)').matches || navigatorWithStandalone.standalone === true;
  }
}
