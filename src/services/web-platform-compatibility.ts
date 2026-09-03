function fallbackUuid(cryptoApi: Crypto): string {
  const bytes = new Uint8Array(16);
  cryptoApi.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, '0'));
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
}

export function installWebPlatformCompatibility(): void {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID !== 'function' && typeof cryptoApi.getRandomValues === 'function') {
    try {
      Object.defineProperty(cryptoApi, 'randomUUID', {
        configurable: true,
        value: () => fallbackUuid(cryptoApi),
      });
    } catch {
      // Individual critical transports still own a local request-id fallback.
    }
  }

  const signalCtor = globalThis.AbortSignal as (typeof AbortSignal & { timeout?: (milliseconds: number) => AbortSignal }) | undefined;
  if (signalCtor && typeof signalCtor.timeout !== 'function' && typeof globalThis.AbortController === 'function') {
    try {
      Object.defineProperty(signalCtor, 'timeout', {
        configurable: true,
        value: (milliseconds: number) => {
          const controller = new AbortController();
          globalThis.setTimeout(() => controller.abort(), Math.max(0, Number(milliseconds) || 0));
          return controller.signal;
        },
      });
    } catch {
      // Critical transports use explicit AbortController timeouts as a second line of defense.
    }
  }
}
