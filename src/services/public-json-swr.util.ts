/**
 * Short-lived client stale-while-revalidate for public JSON.
 * Keeps last-good in memory + localStorage so brief Supabase 402/503
 * outages do not wipe homepage/footer chrome.
 */
export type PublicSwrEnvelope<T> = {
  savedAt: number;
  payload: T;
};

const memory = new Map<string, PublicSwrEnvelope<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function storageKey(key: string): string {
  return `alperler.public-swr.v1:${key}`;
}

export function readPublicSwr<T>(key: string, maxAgeMs: number): { value: T; fresh: boolean; ageMs: number } | null {
  const now = Date.now();
  const mem = memory.get(key) as PublicSwrEnvelope<T> | undefined;
  if (mem) {
    const ageMs = now - mem.savedAt;
    if (ageMs >= 0) return { value: mem.payload, fresh: ageMs <= maxAgeMs, ageMs };
  }
  if (!canUseStorage()) return null;
  try {
    const raw = window.localStorage.getItem(storageKey(key));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PublicSwrEnvelope<T>;
    if (!parsed || typeof parsed.savedAt !== "number") return null;
    memory.set(key, parsed as PublicSwrEnvelope<unknown>);
    const ageMs = now - parsed.savedAt;
    if (ageMs < 0) return null;
    return { value: parsed.payload, fresh: ageMs <= maxAgeMs, ageMs };
  } catch {
    return null;
  }
}

export function writePublicSwr<T>(key: string, payload: T): void {
  const envelope: PublicSwrEnvelope<T> = { savedAt: Date.now(), payload };
  memory.set(key, envelope as PublicSwrEnvelope<unknown>);
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(storageKey(key), JSON.stringify(envelope));
  } catch {
    // Quota / private mode — memory cache still helps the session.
  }
}

export async function publicSwrFetch<T>(options: {
  key: string;
  freshMs: number;
  staleMs: number;
  loader: () => Promise<T>;
  isValid?: (value: T) => boolean;
  forceNetwork?: boolean;
}): Promise<{ value: T; fromCache: boolean; stale: boolean }> {
  const cached = readPublicSwr<T>(options.key, options.freshMs);
  const valid = (value: T) => (options.isValid ? options.isValid(value) : value != null);

  if (!options.forceNetwork && cached && cached.fresh && valid(cached.value)) {
    return { value: cached.value, fromCache: true, stale: false };
  }

  const existing = inflight.get(options.key) as Promise<T> | undefined;
  if (existing) {
    try {
      const value = await existing;
      return { value, fromCache: false, stale: false };
    } catch (error) {
      if (cached && cached.ageMs <= options.staleMs && valid(cached.value)) {
        return { value: cached.value, fromCache: true, stale: true };
      }
      throw error;
    }
  }

  const pending = (async () => {
    const value = await options.loader();
    if (valid(value)) writePublicSwr(options.key, value);
    return value;
  })();
  inflight.set(options.key, pending as Promise<unknown>);

  try {
    const value = await pending;
    return { value, fromCache: false, stale: false };
  } catch (error) {
    if (cached && cached.ageMs <= options.staleMs && valid(cached.value)) {
      return { value: cached.value, fromCache: true, stale: true };
    }
    throw error;
  } finally {
    inflight.delete(options.key);
  }
}

export function quotaOrPaymentError(status: number, code = ""): boolean {
  const normalized = String(code || "").toUpperCase();
  return status === 402
    || status === 429
    || normalized.includes("PAYMENT_REQUIRED")
    || normalized.includes("EGRESS")
    || normalized.includes("QUOTA")
    || normalized.includes("BANDWIDTH")
    || normalized.includes("OVER_CAPACITY");
}

export function turkishQuotaMessage(subject = "İşlem"): string {
  return `${subject} şu an tamamlanamıyor: Supabase ücretsiz kota / ödeme gerekli (yaklaşık 2026-10-18’e kadar). Lütfen daha sonra tekrar deneyin.`;
}
