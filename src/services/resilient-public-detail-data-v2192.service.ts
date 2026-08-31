import { Injectable } from '@angular/core';
import { Vehicle } from '../models/car.model';
import { DetailKind, PublicDetailDataService } from './public-detail-data.service';

type CacheEntry = { value: Vehicle; storedAt: number };

/**
 * Route-scoped V219.2 resilience layer for customer vehicle/tour details.
 *
 * The canonical data service intentionally performs fresh REST reads. Repeated
 * mobile navigation can briefly overlap a route transition with a network
 * hiccup, so this layer coalesces identical requests, retries only transient
 * failures and keeps a short successful-memory fallback. Deterministic 4xx and
 * publication/not-found failures are never hidden by stale data.
 */
@Injectable()
export class ResilientPublicDetailDataV2192Service extends PublicDetailDataService {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly inFlight = new Map<string, Promise<Vehicle>>();
  private readonly freshMs = 120_000;
  private readonly staleMs = 900_000;

  override async load(kind: DetailKind, routeId: string): Promise<Vehicle> {
    const cleanId = String(routeId || '').trim();
    const key = `${kind}:${cleanId}`;
    const now = Date.now();
    const cached = this.cache.get(key);

    if (cached && now - cached.storedAt <= this.freshMs) return cached.value;

    const active = this.inFlight.get(key);
    if (active) return active;

    const request = this.loadWithRetry(kind, cleanId)
      .then((value) => {
        this.cache.set(key, { value, storedAt: Date.now() });
        return value;
      })
      .catch((error: unknown) => {
        if (cached && now - cached.storedAt <= this.staleMs && this.isTransient(error)) {
          return cached.value;
        }
        throw error;
      })
      .finally(() => {
        if (this.inFlight.get(key) === request) this.inFlight.delete(key);
      });

    this.inFlight.set(key, request);
    return request;
  }

  private async loadWithRetry(kind: DetailKind, routeId: string): Promise<Vehicle> {
    const waits = [0, 160, 360];
    let lastError: unknown;

    for (let attempt = 0; attempt < waits.length; attempt += 1) {
      if (waits[attempt]) await this.sleep(waits[attempt]);
      try {
        return await super.load(kind, routeId);
      } catch (error) {
        lastError = error;
        if (!this.isTransient(error) || attempt === waits.length - 1) throw error;
      }
    }

    throw lastError;
  }

  private isTransient(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error || '');
    if (/_(408|425|429|500|502|503|504)$/.test(message)) return true;
    if (error instanceof TypeError) return true;
    const name = error instanceof Error ? error.name : '';
    return name === 'AbortError' || name === 'TimeoutError' || name === 'NetworkError';
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => globalThis.setTimeout(resolve, ms));
  }
}
