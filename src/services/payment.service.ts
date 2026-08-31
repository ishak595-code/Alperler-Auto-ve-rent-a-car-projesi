import { HttpClient } from "@angular/common/http";
import { Injectable, computed, inject, signal } from "@angular/core";
import { firstValueFrom } from "rxjs";
import { IntegrationStatusResponse, PaymentIntegrationStatus, PaymentProvider, PaymentSessionRequest, PaymentSessionResponse } from "../models/payment.model";
import { PaymentSettingsService } from "./payment-settings.service";

const FALLBACK_PAYMENT_STATUS: PaymentIntegrationStatus = { provider:"none", configured:false, cardEnabled:false, eftEnabled:true, officeEnabled:true, availableProviders:{paytr:false,iyzico:false} };

@Injectable({ providedIn: "root" })
export class PaymentService {
  private readonly http = inject(HttpClient);
  private readonly settingsService = inject(PaymentSettingsService);
  private readonly integrationStatus = signal<IntegrationStatusResponse | null>(null);
  private readonly statusLoaded = signal(false);

  readonly paymentStatus = computed<PaymentIntegrationStatus>(() => {
    const integration = this.integrationStatus()?.payment ?? FALLBACK_PAYMENT_STATUS;
    const settings = this.settingsService.settings();
    const selected: PaymentProvider = settings.provider === 'PAYTR' ? 'paytr' : settings.provider === 'IYZICO' ? 'iyzico' : 'none';
    const availability = integration.availableProviders ?? { paytr: integration.provider === 'paytr' && integration.configured, iyzico: integration.provider === 'iyzico' && integration.configured };
    const configured = selected === 'paytr' ? availability.paytr : selected === 'iyzico' ? availability.iyzico : false;
    return {
      provider: selected,
      configured,
      cardEnabled: settings.cardEnabled && configured && integration.cardEnabled,
      eftEnabled: settings.eftEnabled,
      officeEnabled: settings.officeEnabled,
      availableProviders: availability,
    };
  });
  readonly cardReady = computed(() => this.paymentStatus().cardEnabled);
  readonly eftReady = computed(() => this.paymentStatus().eftEnabled);
  readonly officeReady = computed(() => this.paymentStatus().officeEnabled);
  readonly isStatusLoaded = this.statusLoaded.asReadonly();
  readonly publicSettings = this.settingsService.settings;

  async refreshIntegrationStatus(): Promise<IntegrationStatusResponse | null> {
    try {
      const [status] = await Promise.all([
        firstValueFrom(this.http.get<IntegrationStatusResponse>("/api/integrations/status")),
        this.settingsService.refreshPublic(),
      ]);
      this.integrationStatus.set(status);
      return status;
    } catch (error) {
      console.warn("Integration status endpoint is unavailable.", error);
      this.integrationStatus.set(null);
      await this.settingsService.refreshPublic().catch(() => undefined);
      return null;
    } finally { this.statusLoaded.set(true); }
  }
  async ensureStatusLoaded(): Promise<void> { if (!this.statusLoaded()) await this.refreshIntegrationStatus(); }
  async createCardSession(request: PaymentSessionRequest): Promise<PaymentSessionResponse> {
    await this.ensureStatusLoaded();
    if (!this.cardReady()) return { ok:false,status:"not_configured",provider:this.paymentStatus().provider,message:"Seçili kart ödeme sağlayıcısı henüz aktif değil. Havale/EFT veya teslimde ödeme seçebilirsiniz." };
    try { return await firstValueFrom(this.http.post<PaymentSessionResponse>("/api/payments/create-session", request)); }
    catch (error) { console.error("Payment session creation failed.", error); return {ok:false,status:"error",provider:this.paymentStatus().provider,message:"Ödeme oturumu başlatılamadı. Rezervasyon kaydınız korunuyor."}; }
  }
}
