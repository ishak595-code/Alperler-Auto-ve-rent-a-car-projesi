import { Injectable, inject } from "@angular/core";
import { PRIMARY_ADMIN_EMAIL } from "../supabase.config";
import { AdminPasswordRecoveryV220Service } from "./admin-password-recovery-v220.service";

export interface AdminFirstAccessResultV239 {
  ok: boolean;
  message: string;
}

/**
 * Owner first-access no longer uses a hashed 12-digit setup code.
 * It reuses the same Supabase Auth recover email path as password recovery,
 * always locked to PRIMARY_ADMIN_EMAIL (never an arbitrary address from the client).
 */
@Injectable({ providedIn: "root" })
export class AdminFirstAccessV239Service {
  private readonly recovery = inject(AdminPasswordRecoveryV220Service);

  /** Locked primary-admin email used for first-access setup mail. */
  primaryEmail(): string {
    return PRIMARY_ADMIN_EMAIL;
  }

  async requestSetupEmail(): Promise<AdminFirstAccessResultV239> {
    const email = PRIMARY_ADMIN_EMAIL.trim().toLowerCase();
    const result = await this.recovery.request(email);
    if (result.ok) {
      return {
        ok: true,
        message:
          `Kurulum bağlantısı ${email} adresine gönderildi. En yeni e-postadaki bağlantıyı aynı cihaz ve tarayıcıda açın; ardından yeni yönetici parolanızı belirleyin.`,
      };
    }
    return {
      ok: false,
      message: String(result.message || "İlk yönetici kurulum e-postası gönderilemedi."),
    };
  }
}
