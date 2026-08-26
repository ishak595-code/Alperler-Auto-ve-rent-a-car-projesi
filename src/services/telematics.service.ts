import { Injectable, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';

export type RemoteCommand = 'LOCK' | 'UNLOCK' | 'HORN' | 'IMMOBILIZE_NEXT_STOP' | 'CLEAR_IMMOBILIZER';

export interface TelematicsDevice {
  id: string;
  vehicle_id: string;
  provider: string;
  external_vehicle_id?: string | null;
  device_id?: string | null;
  capabilities: Record<string, boolean>;
  connection_status: string;
  last_seen_at?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  speed_kph?: number | null;
  ignition_on?: boolean | null;
  odometer_km?: number | null;
  battery_voltage?: number | null;
  geofence_enabled: boolean;
}

export interface TelematicsVehicle {
  id: string;
  stock_code?: string | null;
  brand: string;
  model: string;
  model_year?: number | null;
  availability_status?: string | null;
  cover_image?: string | null;
}

@Injectable({ providedIn: 'root' })
export class TelematicsService {
  private readonly auth = inject(AuthService);
  readonly devices = signal<TelematicsDevice[]>([]);
  readonly vehicles = signal<TelematicsVehicle[]>([]);
  readonly commands = signal<Record<string, unknown>[]>([]);
  readonly bridgeConfigured = signal(false);
  readonly loading = signal(false);

  private async headers(): Promise<Record<string, string>> {
    const token = await this.auth.getAccessToken();
    if (!token) throw new Error('ADMIN_SESSION_REQUIRED');
    return { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
  }

  async refresh(): Promise<void> {
    this.loading.set(true);
    try {
      const response = await fetch('/api/partner?op=telematics-admin', {
        headers: await this.headers(),
        cache: 'no-store',
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok) throw new Error(data?.code || 'TELEMATICS_READ_FAILED');
      this.devices.set(Array.isArray(data.devices) ? data.devices : []);
      this.vehicles.set(Array.isArray(data.vehicles) ? data.vehicles : []);
      this.commands.set(Array.isArray(data.commands) ? data.commands : []);
      this.bridgeConfigured.set(data.bridgeConfigured === true);
    } finally {
      this.loading.set(false);
    }
  }

  deviceFor(vehicleId: string): TelematicsDevice | undefined {
    return this.devices().find((device) => device.vehicle_id === vehicleId);
  }

  async configure(input: {
    vehicleId: string;
    provider: string;
    externalVehicleId: string;
    deviceId: string;
    capabilities: Record<string, boolean>;
  }): Promise<Record<string, unknown>> {
    return this.post({ action: 'configure_device', ...input });
  }

  async command(vehicleId: string, command: RemoteCommand, reason: string): Promise<Record<string, unknown>> {
    return this.post({ action: 'command', vehicleId, command, reason });
  }

  private async post(body: Record<string, unknown>): Promise<Record<string, unknown>> {
    const response = await fetch('/api/partner?op=telematics-admin', {
      method: 'POST',
      headers: await this.headers(),
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.ok) throw new Error(data?.code || 'TELEMATICS_ACTION_FAILED');
    return data as Record<string, unknown>;
  }
}
