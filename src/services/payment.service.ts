import { HttpClient } from "@angular/common/http";
import { Injectable, computed, inject, signal } from "@angular/core";
import { firstValueFrom } from "rxjs";
import {
  IntegrationStatusResponse,
  PaymentIntegrationStatus,
  PaymentSessionRequest,
  PaymentSessionResponse,
} from "../models/payment.model";

const FALLBACK_PAYMENT_STATUS: PaymentIntegrationStatus = {
  provider: "none",
  configured: false,
  cardEnabled: false,
  eftEnabled: true,
  officeEnabled: true,
};

@Injectable({ providedIn: "root" })
export class PaymentService {
  private readonly http = inject(HttpClient);
  private readonly integrationStatus = signal<IntegrationStatusResponse | null>(null);
  private readonly statusLoaded = signal(false);

  readonly paymentStatus = computed(
    () => this.integrationStatus()?.payment ?? FALLBACK_PAYMENT_STATUS,
  );
  readonly cardReady = computed(() => this.paymentStatus().cardEnabled);
  readonly eftReady = computed(() => this.paymentStatus().eftEnabled);
  readonly officeReady = computed(() => this.paymentStatus().officeEnabled);
  readonly isStatusLoaded = this.statusLoaded.asReadonly();

  async refreshIntegrationStatus(): Promise<IntegrationStatusResponse | null> {
    try {
      const status = await firstValueFrom(
        this.http.get<IntegrationStatusResponse>("/api/integrations/status"),
      );
      this.integrationStatus.set(status);
      return status;
    } catch (error) {
      console.warn("Integration status endpoint is unavailable.", error);
      this.integrationStatus.set(null);
      return null;
    } finally {
      this.statusLoaded.set(true);
    }
  }

  async ensureStatusLoaded(): Promise<void> {
    if (!this.statusLoaded()) {
      await this.refreshIntegrationStatus();
    }
  }

  async createCardSession(
    request: PaymentSessionRequest,
  ): Promise<PaymentSessionResponse> {
    await this.ensureStatusLoaded();

    if (!this.cardReady()) {
      return {
        ok: false,
        status: "not_configured",
        provider: this.paymentStatus().provider,
        message:
          "Online kart ödeme altyapısı henüz aktif değil. Sağlayıcı bağlandığında bu seçenek otomatik olarak devreye girecek.",
      };
    }

    try {
      return await firstValueFrom(
        this.http.post<PaymentSessionResponse>(
          "/api/payments/create-session",
          request,
        ),
      );
    } catch (error) {
      console.error("Payment session creation failed.", error);
      return {
        ok: false,
        status: "error",
        provider: this.paymentStatus().provider,
        message:
          "Ödeme oturumu başlatılamadı. Lütfen tekrar deneyin veya farklı bir ödeme yöntemi seçin.",
      };
    }
  }
}
