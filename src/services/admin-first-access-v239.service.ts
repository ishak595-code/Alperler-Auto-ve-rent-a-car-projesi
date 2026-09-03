import { Injectable } from "@angular/core";
import { SUPABASE_PUBLISHABLE_KEY, supabaseFunctionUrl } from "../supabase.config";

export interface AdminFirstAccessResultV239 {
  ok: boolean;
  message: string;
}

@Injectable({ providedIn: "root" })
export class AdminFirstAccessV239Service {
  async complete(setupCode: string, password: string, confirmPassword: string): Promise<AdminFirstAccessResultV239> {
    const cleanCode = String(setupCode || "").replace(/\s+/g, "");
    if (!/^\d{12}$/.test(cleanCode)) {
      return { ok: false, message: "Kurulum kodu 12 rakam olmalı." };
    }
    if (password !== confirmPassword) {
      return { ok: false, message: "Yeni şifreler birbiriyle eşleşmiyor." };
    }

    try {
      const response = await fetch(supabaseFunctionUrl("admin-first-access-v239"), {
        method: "POST",
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY,
          "content-type": "application/json",
        },
        body: JSON.stringify({ setupCode: cleanCode, password, confirmPassword }),
      });
      const payload = (await response.json().catch(() => ({}))) as { ok?: boolean; message?: string };
      return {
        ok: response.ok && payload.ok === true,
        message: String(payload.message || (response.ok ? "Yönetici şifresi oluşturuldu." : "İlk yönetici kurulumu tamamlanamadı.")),
      };
    } catch {
      return { ok: false, message: "İlk yönetici kurulum servisine şu anda ulaşılamıyor." };
    }
  }
}
