import { Injectable, signal } from '@angular/core';

type InstallOutcome = 'accepted' | 'dismissed' | 'unavailable';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

@Injectable({ providedIn: 'root' })
export class PwaInstallService {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private readonly _canInstall = signal(false);
  private readonly _installed = signal(false);
  private readonly _mobileBrowser = signal(false);

  readonly canInstall = this._canInstall.asReadonly();
  readonly installed = this._installed.asReadonly();
  readonly mobileBrowser = this._mobileBrowser.asReadonly();

  constructor() {
    if (typeof window === 'undefined') return;

    this.refreshEnvironment();
    window.addEventListener('beforeinstallprompt', (event: Event) => {
      const installEvent = event as BeforeInstallPromptEvent;
      installEvent.preventDefault();
      this.deferredPrompt = installEvent;
      this._canInstall.set(!this.isStandalone());
    });
    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      this._canInstall.set(false);
      this._installed.set(true);
    });

    const standaloneQuery = window.matchMedia('(display-mode: standalone)');
    standaloneQuery.addEventListener?.('change', () => this.refreshEnvironment());
  }

  async install(): Promise<InstallOutcome> {
    if (this.isStandalone()) {
      this.refreshEnvironment();
      return 'accepted';
    }
    const prompt = this.deferredPrompt;
    if (!prompt) return 'unavailable';

    this._canInstall.set(false);
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      this.deferredPrompt = null;
      this._installed.set(choice.outcome === 'accepted' || this.isStandalone());
      return choice.outcome;
    } catch {
      this.deferredPrompt = null;
      this.refreshEnvironment();
      return 'unavailable';
    }
  }

  private refreshEnvironment(): void {
    if (typeof window === 'undefined') return;
    const standalone = this.isStandalone();
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const narrow = window.matchMedia('(max-width: 767px)').matches;
    this._installed.set(standalone);
    this._mobileBrowser.set(!standalone && coarse && narrow);
    if (standalone) this._canInstall.set(false);
  }

  private isStandalone(): boolean {
    if (typeof window === 'undefined') return false;
    const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
    return window.matchMedia('(display-mode: standalone)').matches || navigatorWithStandalone.standalone === true;
  }
}
