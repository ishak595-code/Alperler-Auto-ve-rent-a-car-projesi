import { HttpClient } from "@angular/common/http";
import { Injectable, computed, inject, signal } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { firstValueFrom } from "rxjs";
import { IyzicoBuyerDetails, IyzicoBuyerDetailsDialogComponent } from "../components/iyzico-buyer-details-dialog.component";
import { IntegrationStatusResponse, PaymentIntegrationStatus, PaymentProvider, PaymentSessionRequest, PaymentSessionResponse } from "../models/payment.model";
import { CustomerAuthService } from "./customer-auth.service";
import { PaymentSettingsService } from "./payment-settings.service";

const FALLBACK_PAYMENT_STATUS: PaymentIntegrationStatus = {
  provider:"none",
  configured:false,
  cardEnabled:false,
  eftEnabled:true,
  officeEnabled:true,
  availableProviders:{paytr:false,iyzico:false},
  providerDetails:{globalCardGate:false,paytr:{configured:false,forceTestMode:false},iyzico:{sandboxConfigured:false,liveConfigured:false}},
};

@Injectable({ providedIn: "root" })
export class PaymentService {
  private readonly http = inject(HttpClient);
  private readonly dialog = inject(MatDialog);
  private readonly customerAuth = inject(CustomerAuthService);
  private readonly settingsService = inject(PaymentSettingsService);
  private readonly integrationStatus = signal<IntegrationStatusResponse | null>(null);
  private readonly gatewayPaymentStatus = signal<PaymentIntegrationStatus | null>(null);
  private readonly statusLoaded = signal(false);

  readonly paymentStatus = computed<PaymentIntegrationStatus>(() => {
    const integration = this.gatewayPaymentStatus() ?? this.integrationStatus()?.payment ?? FALLBACK_PAYMENT_STATUS;
    const settings = this.settingsService.settings();
    const selected: PaymentProvider = settings.provider === 'PAYTR' ? 'paytr' : settings.provider === 'IYZICO' ? 'iyzico' : 'none';
    const availability = integration.availableProviders ?? { paytr: integration.provider === 'paytr' && integration.configured, iyzico: integration.provider === 'iyzico' && integration.configured };
    const configured = selected === 'paytr' ? availability.paytr : selected === 'iyzico' ? availability.iyzico : false;
    return {
      provider:selected,
      configured,
      cardEnabled:settings.cardEnabled&&configured&&integration.cardEnabled,
      eftEnabled:settings.eftEnabled,
      officeEnabled:settings.officeEnabled,
      availableProviders:availability,
      providerDetails:integration.providerDetails,
    };
  });
  readonly cardReady = computed(() => this.paymentStatus().cardEnabled);
  readonly eftReady = computed(() => this.paymentStatus().eftEnabled);
  readonly officeReady = computed(() => this.paymentStatus().officeEnabled);
  readonly isStatusLoaded = this.statusLoaded.asReadonly();
  readonly publicSettings = this.settingsService.settings;

  async refreshIntegrationStatus(): Promise<IntegrationStatusResponse | null> {
    try {
      const [status, providerStatus] = await Promise.all([
        firstValueFrom(this.http.get<IntegrationStatusResponse>("/api/integrations/status")),
        firstValueFrom(this.http.get<{ payment: PaymentIntegrationStatus }>("/api/payments?op=provider-status")),
        this.settingsService.refreshPublic(),
      ]);
      this.integrationStatus.set(status); this.gatewayPaymentStatus.set(providerStatus.payment);
      return { ...status, payment: providerStatus.payment };
    } catch (error) {
      console.warn("Integration status endpoint is unavailable.", error); this.integrationStatus.set(null); this.gatewayPaymentStatus.set(null);
      await this.settingsService.refreshPublic().catch(() => undefined); return null;
    } finally { this.statusLoaded.set(true); }
  }
  async ensureStatusLoaded(): Promise<void> { if (!this.statusLoaded()) await this.refreshIntegrationStatus(); }
  async createCardSession(request: PaymentSessionRequest): Promise<PaymentSessionResponse> {
    await this.ensureStatusLoaded();
    const status = this.paymentStatus();
    if (!this.cardReady()) return { ok:false,status:"not_configured",provider:status.provider,message:"Seçili kart ödeme sağlayıcısı henüz aktif değil. Havale/EFT veya teslimde ödeme seçebilirsiniz." };
    const usingSavedCard = Boolean(request.paymentMethodId);
    if (usingSavedCard && status.provider !== 'iyzico') {
      return { ok:false,status:'rejected',provider:status.provider,message:'Kayıtlı kartla ödeme yalnız iyzico aktifken kullanılabilir. Yeni kartla ödeme veya diğer yöntemlerden birini seçin.' };
    }
    let payload = request;
    if (status.provider === 'iyzico') {
      const details = await this.collectIyzicoBuyerDetails(request);
      if (!details) return { ok:false,status:"rejected",provider:'iyzico',message:'iyzico ödeme bilgileri tamamlanmadığı için kart işlemi başlatılmadı.' };
      payload = { ...request, customer: { ...request.customer, ...details } };
    }
    try {
      if (usingSavedCard) {
        const token = await this.customerAuth.getAccessToken().catch(() => null);
        if (!token) return {ok:false,status:'rejected',provider:'iyzico',message:'Kayıtlı kartı kullanmak için hesabınıza yeniden giriş yapın.'};
        return await firstValueFrom(this.http.post<PaymentSessionResponse>("/api/saved-card-payment", payload, { headers:{ Authorization:`Bearer ${token}` } }));
      }
      return await firstValueFrom(this.http.post<PaymentSessionResponse>("/api/payments/create-session", payload));
    }
    catch (error) { console.error("Payment session creation failed.", error); return {ok:false,status:"error",provider:status.provider,message:"Ödeme oturumu başlatılamadı. Rezervasyon kaydınız korunuyor."}; }
  }

  private async collectIyzicoBuyerDetails(request: PaymentSessionRequest): Promise<IyzicoBuyerDetails | null> {
    const customer = request.customer;
    if (customer.identityNumber && customer.billingAddress && customer.city && customer.country && customer.zipCode) {
      return { identityNumber:customer.identityNumber, billingAddress:customer.billingAddress, city:customer.city, country:customer.country, zipCode:customer.zipCode };
    }
    const ref = this.dialog.open<IyzicoBuyerDetailsDialogComponent, Partial<IyzicoBuyerDetails>, IyzicoBuyerDetails | null>(IyzicoBuyerDetailsDialogComponent, {
      width: 'min(560px, 94vw)', maxWidth: '94vw', disableClose: true, autoFocus: 'first-tabbable', restoreFocus: true,
      data: { identityNumber:customer.identityNumber, billingAddress:customer.billingAddress, city:customer.city, country:customer.country || 'Türkiye', zipCode:customer.zipCode },
      ariaLabel: 'iyzico ödeme için kimlik ve fatura bilgileri',
    });
    return await firstValueFrom(ref.afterClosed()) ?? null;
  }
}
