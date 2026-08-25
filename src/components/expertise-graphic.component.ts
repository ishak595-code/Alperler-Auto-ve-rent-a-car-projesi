import { Component, Input } from "@angular/core";
import { CommonModule } from "@angular/common";

@Component({
  selector: "app-expertise-graphic",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative w-full max-w-[400px] mx-auto p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
      <svg viewBox="0 0 400 600" class="w-full h-auto" role="img" aria-label="Araç parça bazlı ekspertiz görünümü">
        <path d="M100,100 Q200,50 300,100 L320,200 L320,450 Q320,500 200,500 Q80,500 80,450 L80,200 Z" fill="none" stroke="#e2e8f0" stroke-width="4" />
        <path [attr.fill]="getColor(data?.frontBumper)" d="M110,78 Q200,52 290,78 L300,105 L100,105 Z" stroke="white" stroke-width="2" /><text x="200" y="92" text-anchor="middle" class="part-label">Ön tampon</text>
        <path [attr.fill]="getColor(data?.hood)" d="M120,110 Q200,70 280,110 L290,180 L110,180 Z" stroke="white" stroke-width="2" /><text x="200" y="145" text-anchor="middle" class="part-label">Kaput</text>
        <path [attr.fill]="getColor(data?.frontLeftFender)" d="M85,110 L115,110 L115,190 L85,190 Z" stroke="white" stroke-width="2" /><text x="100" y="150" text-anchor="middle" class="side-label">Sol ön ç.</text>
        <path [attr.fill]="getColor(data?.frontRightFender)" d="M285,110 L315,110 L315,190 L285,190 Z" stroke="white" stroke-width="2" /><text x="300" y="150" text-anchor="middle" class="side-label">Sağ ön ç.</text>
        <path [attr.fill]="getColor(data?.frontLeftDoor)" d="M85,200 L125,200 L125,310 L85,310 Z" stroke="white" stroke-width="2" /><text x="105" y="255" text-anchor="middle" class="side-label">Sol ön</text>
        <path [attr.fill]="getColor(data?.frontRightDoor)" d="M275,200 L315,200 L315,310 L275,310 Z" stroke="white" stroke-width="2" /><text x="295" y="255" text-anchor="middle" class="side-label">Sağ ön</text>
        <rect [attr.fill]="getColor(data?.roof)" x="130" y="220" width="140" height="120" rx="10" stroke="white" stroke-width="2" /><text x="200" y="285" text-anchor="middle" class="part-label">Tavan</text>
        <path [attr.fill]="getColor(data?.rearLeftDoor)" d="M85,320 L125,320 L125,420 L85,420 Z" stroke="white" stroke-width="2" /><text x="105" y="370" text-anchor="middle" class="side-label">Sol arka</text>
        <path [attr.fill]="getColor(data?.rearRightDoor)" d="M275,320 L315,320 L315,420 L275,420 Z" stroke="white" stroke-width="2" /><text x="295" y="370" text-anchor="middle" class="side-label">Sağ arka</text>
        <path [attr.fill]="getColor(data?.rearLeftFender)" d="M85,430 L115,430 L115,480 L85,480 Z" stroke="white" stroke-width="2" /><text x="100" y="456" text-anchor="middle" class="side-label">Sol arka ç.</text>
        <path [attr.fill]="getColor(data?.rearRightFender)" d="M285,430 L315,430 L315,480 L285,480 Z" stroke="white" stroke-width="2" /><text x="300" y="456" text-anchor="middle" class="side-label">Sağ arka ç.</text>
        <path [attr.fill]="getColor(data?.trunk)" d="M120,410 L280,410 L280,472 Q200,492 120,472 Z" stroke="white" stroke-width="2" /><text x="200" y="445" text-anchor="middle" class="part-label">Bagaj</text>
        <path [attr.fill]="getColor(data?.rearBumper)" d="M105,478 Q200,505 295,478 L300,510 Q200,542 100,510 Z" stroke="white" stroke-width="2" /><text x="200" y="510" text-anchor="middle" class="part-label">Arka tampon</text>
      </svg>
      <div class="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <div class="legend"><i class="bg-[#10b981]"></i><span>Orijinal</span></div>
        <div class="legend"><i class="bg-[#eab308]"></i><span>Lokal boyalı</span></div>
        <div class="legend"><i class="bg-[#f59e0b]"></i><span>Boyalı</span></div>
        <div class="legend"><i class="bg-[#ef4444]"></i><span>Değişen</span></div>
        <div class="legend"><i class="bg-[#f1f5f9] border border-slate-300"></i><span>Bilgi yok</span></div>
      </div>
    </div>
  `,
  styles: [`:host{display:block}.legend{display:flex;align-items:center;gap:.35rem}.legend i{width:.7rem;height:.7rem;border-radius:999px;flex:none}.legend span{font-size:9px;font-weight:800;color:#64748b;text-transform:uppercase}.part-label{font-size:9px;font-weight:800;fill:#64748b;pointer-events:none;text-transform:uppercase}.side-label{font-size:7px;font-weight:800;fill:#64748b;pointer-events:none}`],
})
export class ExpertiseGraphicComponent {
  @Input() data: any;
  getColor(status: string | undefined): string {
    switch (status) {
      case "original": return "#10b981";
      case "local_painted": return "#eab308";
      case "painted": return "#f59e0b";
      case "changed": return "#ef4444";
      default: return "#f1f5f9";
    }
  }
}
