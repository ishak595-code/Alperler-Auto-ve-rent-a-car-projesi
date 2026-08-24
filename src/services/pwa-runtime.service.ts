const SERVICE_WORKER_URL = '/service-worker.js';
const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

export type PwaDisplayMode = 'fullscreen' | 'standalone' | 'minimal-ui' | 'browser';

interface PwaWorkerVersionMessage {
  type?: string;
  release?: string;
}

function dispatchRuntimeEvent<T>(name: string, detail: T): void {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

function iosStandalone(): boolean {
  return Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

function detectDisplayMode(): PwaDisplayMode {
  if (window.matchMedia('(display-mode: fullscreen)').matches) return 'fullscreen';
  if (window.matchMedia('(display-mode: standalone)').matches || iosStandalone()) return 'standalone';
  if (window.matchMedia('(display-mode: minimal-ui)').matches) return 'minimal-ui';
  return 'browser';
}

function syncRuntimeState(): void {
  const root = document.documentElement;
  root.dataset.pwaDisplayMode = detectDisplayMode();
  root.dataset.pwaOnline = navigator.onLine ? 'true' : 'false';
}

async function readWorkerRelease(registration: ServiceWorkerRegistration): Promise<void> {
  const worker = registration.active || registration.waiting || registration.installing;
  if (!worker || typeof MessageChannel === 'undefined') return;

  await new Promise<void>((resolve) => {
    const channel = new MessageChannel();
    const timer = window.setTimeout(resolve, 1500);

    channel.port1.onmessage = (event: MessageEvent<PwaWorkerVersionMessage>) => {
      window.clearTimeout(timer);
      const release = String(event.data?.release || '').trim();
      if (release) document.documentElement.dataset.pwaRelease = release;
      resolve();
    };

    try {
      worker.postMessage({ type: 'GET_VERSION' }, [channel.port2]);
    } catch {
      window.clearTimeout(timer);
      resolve();
    }
  });
}

function watchWorkerLifecycle(registration: ServiceWorkerRegistration): void {
  registration.addEventListener('updatefound', () => {
    const candidate = registration.installing;
    if (!candidate) return;

    candidate.addEventListener('statechange', () => {
      if (candidate.state !== 'installed' || !navigator.serviceWorker.controller) return;
      dispatchRuntimeEvent('alperler:pwa-update-ready', { scope: registration.scope });
    });
  });
}

async function registerServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') return;

  try {
    const registration = await navigator.serviceWorker.register(SERVICE_WORKER_URL, {
      scope: '/',
      updateViaCache: 'none',
    });

    watchWorkerLifecycle(registration);

    let lastUpdateCheck = 0;
    const checkForUpdate = async (force = false): Promise<void> => {
      if (!navigator.onLine) return;
      const now = Date.now();
      if (!force && now - lastUpdateCheck < UPDATE_CHECK_INTERVAL_MS) return;
      lastUpdateCheck = now;
      await registration.update().catch(() => undefined);
      await readWorkerRelease(registration).catch(() => undefined);
    };

    await navigator.serviceWorker.ready.catch(() => undefined);
    await checkForUpdate(true);

    window.addEventListener('online', () => {
      syncRuntimeState();
      void checkForUpdate(true);
    });
    window.addEventListener('offline', syncRuntimeState);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void checkForUpdate(false);
    });

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      void readWorkerRelease(registration).catch(() => undefined);
      dispatchRuntimeEvent('alperler:pwa-controller-changed', { scope: registration.scope });
    });
  } catch (error) {
    console.warn('Installable web app registration failed.', error);
  }
}

export function startPwaRuntime(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  syncRuntimeState();

  const displayQueries = [
    window.matchMedia('(display-mode: fullscreen)'),
    window.matchMedia('(display-mode: standalone)'),
    window.matchMedia('(display-mode: minimal-ui)'),
  ];
  displayQueries.forEach((query) => query.addEventListener('change', syncRuntimeState));

  void registerServiceWorker();
}
