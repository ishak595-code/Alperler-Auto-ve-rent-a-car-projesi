import { Injectable } from "@angular/core";

@Injectable({ providedIn: "root" })
export class BranchCommunicationService {
  phoneUrl(value?: string | null): string {
    const phone = this.normalizedDialNumber(value);
    return phone ? `tel:${phone}` : "";
  }

  whatsappUrl(value?: string | null): string {
    let digits = String(value || "").replace(/\D/g, "");
    if (digits.length === 11 && digits.startsWith("0")) digits = `90${digits.slice(1)}`;
    else if (digits.length === 10 && digits.startsWith("5")) digits = `90${digits}`;
    if (digits.length < 10 || digits.length > 15) return "";
    return `https://wa.me/${digits}`;
  }

  emailUrl(value?: string | null): string {
    const email = String(value || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "";
    return `mailto:${email}`;
  }

  httpsUrl(value?: string | null): string {
    const url = String(value || "").trim();
    return /^https:\/\/[^\s]+$/i.test(url) ? url : "";
  }

  private normalizedDialNumber(value?: string | null): string {
    const source = String(value || "").trim();
    if (!source) return "";
    const leadingPlus = source.startsWith("+");
    const digits = source.replace(/\D/g, "");
    if (digits.length < 7 || digits.length > 15) return "";
    return leadingPlus ? `+${digits}` : digits;
  }
}
