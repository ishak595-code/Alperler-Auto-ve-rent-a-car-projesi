import { signal } from '@angular/core';
import type { VehicleTechnicalSpecs } from '../models/car.model';

interface CatalogVehicleRecord {
  category?: string;
  brand?: string;
  model?: string;
  series?: string;
  technicalSpecs?: Partial<VehicleTechnicalSpecs> | null;
}

interface CatalogVehicleResponse {
  ok?: boolean;
  records?: CatalogVehicleRecord[];
}

const liveSpecs = signal(new Map<string, VehicleTechnicalSpecs>());
let loadPromise: Promise<void> | null = null;

function key(brand: string, model: string): string {
  return `${String(brand || '').trim()}::${String(model || '').trim()}`.toLocaleLowerCase('tr-TR');
}

function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim().slice(0, 160) : '';
}

function normalizeSpecs(value: Partial<VehicleTechnicalSpecs> | null | undefined): VehicleTechnicalSpecs | null {
  if (!value || typeof value !== 'object') return null;
  const result: VehicleTechnicalSpecs = {
    maxSpeed: clean(value.maxSpeed),
    acceleration: clean(value.acceleration),
    cityFuel: clean(value.cityFuel),
    highwayFuel: clean(value.highwayFuel),
    combinedFuel: clean(value.combinedFuel),
    tankCapacity: clean(value.tankCapacity),
    trunkCapacity: clean(value.trunkCapacity),
    wheels: clean(value.wheels),
    dimensions: clean(value.dimensions),
    cylinders: clean(value.cylinders),
    engineVolume: clean(value.engineVolume),
    enginePower: clean(value.enginePower),
    torque: clean(value.torque),
    weight: clean(value.weight),
    drivetrain: clean(value.drivetrain),
  };
  return Object.values(result).some(Boolean) ? result : null;
}

async function loadLiveSpecs(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const response = await fetch('/api/catalog?resource=vehicles', {
      cache: 'no-store',
      headers: { accept: 'application/json', 'cache-control': 'no-cache' },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return;
    const payload = await response.json() as CatalogVehicleResponse;
    if (!payload.ok || !Array.isArray(payload.records)) return;

    const next = new Map<string, VehicleTechnicalSpecs>();
    for (const record of payload.records) {
      if (record.category !== 'SALE') continue;
      const specs = normalizeSpecs(record.technicalSpecs);
      if (!specs) continue;
      const brand = clean(record.brand);
      const model = clean(record.model);
      const series = clean(record.series);
      if (!brand || !model) continue;
      next.set(key(brand, model), specs);
      if (series) next.set(key(brand, `${series} ${model}`), specs);
    }
    liveSpecs.set(next);
  } catch {
    // Public listing details still render their verified first-class fields when
    // the live catalogue is temporarily unavailable. No stale static spec data is used.
  }
}

function ensureLoaded(): void {
  if (loadPromise || typeof window === 'undefined') return;
  loadPromise = loadLiveSpecs().finally(() => { loadPromise = null; });
}

/**
 * Compatibility accessor used by older sale detail UI. The backing data is now
 * loaded from the live catalogue and never inferred from brand/model or bundled
 * as a static vehicle-spec database.
 */
export function getTechnicalSpecs(brand: string, model: string): VehicleTechnicalSpecs | null {
  ensureLoaded();
  return liveSpecs().get(key(brand, model)) || null;
}
