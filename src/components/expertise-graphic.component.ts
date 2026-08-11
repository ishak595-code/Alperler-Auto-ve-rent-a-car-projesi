import { Component, Input } from "@angular/core";
import { CommonModule } from "@angular/common";

@Component({
  selector: "app-expertise-graphic",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="relative w-full max-w-[400px] mx-auto p-4 bg-white rounded-2xl border border-slate-100 shadow-sm"
    >
      <svg viewBox="0 0 400 600" class="w-full h-auto">
        <!-- Car Body Outline -->
        <path
          d="M100,100 Q200,50 300,100 L320,200 L320,450 Q320,500 200,500 Q80,500 80,450 L80,200 Z"
          fill="none"
          stroke="#e2e8f0"
          stroke-width="4"
        />

        <!-- Hood -->
        <path
          [attr.fill]="getColor(data?.hood)"
          d="M120,110 Q200,70 280,110 L290,180 L110,180 Z"
          stroke="white"
          stroke-width="2"
        />
        <text
          x="200"
          y="145"
          text-anchor="middle"
          class="text-[10px] font-bold fill-slate-400 pointer-events-none uppercase"
        >
          Kaput
        </text>

        <!-- Front Bumper -->
        <path
          [attr.fill]="getColor(data?.frontBumper)"
          d="M110,80 Q200,55 290,80 L300,105 L100,105 Z"
          stroke="white"
          stroke-width="2"
        />

        <!-- Roof -->
        <rect
          [attr.fill]="getColor(data?.roof)"
          x="130"
          y="220"
          width="140"
          height="120"
          rx="10"
          stroke="white"
          stroke-width="2"
        />
        <text
          x="200"
          y="285"
          text-anchor="middle"
          class="text-[10px] font-bold fill-slate-400 pointer-events-none uppercase"
        >
          Tavan
        </text>

        <!-- Trunk -->
        <path
          [attr.fill]="getColor(data?.trunk)"
          d="M120,430 L280,430 Q280,480 200,480 Q120,480 120,430 Z"
          stroke="white"
          stroke-width="2"
        />
        <text
          x="200"
          y="455"
          text-anchor="middle"
          class="text-[10px] font-bold fill-slate-400 pointer-events-none uppercase"
        >
          Bagaj
        </text>

        <!-- Doors Left -->
        <path
          [attr.fill]="getColor(data?.frontLeftDoor)"
          d="M85,200 L125,200 L125,310 L85,310 Z"
          stroke="white"
          stroke-width="2"
        />
        <path
          [attr.fill]="getColor(data?.rearLeftDoor)"
          d="M85,320 L125,320 L125,420 L85,420 Z"
          stroke="white"
          stroke-width="2"
        />

        <!-- Doors Right -->
        <path
          [attr.fill]="getColor(data?.frontRightDoor)"
          d="M275,200 L315,200 L315,310 L275,310 Z"
          stroke="white"
          stroke-width="2"
        />
        <path
          [attr.fill]="getColor(data?.rearRightDoor)"
          d="M275,320 L315,320 L315,420 L275,420 Z"
          stroke="white"
          stroke-width="2"
        />

        <!-- Fenders Left -->
        <path
          [attr.fill]="getColor(data?.frontLeftFender)"
          d="M85,110 L115,110 L115,190 L85,190 Z"
          stroke="white"
          stroke-width="2"
        />
        <path
          [attr.fill]="getColor(data?.rearLeftFender)"
          d="M85,430 L115,430 L115,480 L85,480 Z"
          stroke="white"
          stroke-width="2"
        />

        <!-- Fenders Right -->
        <path
          [attr.fill]="getColor(data?.frontRightFender)"
          d="M285,110 L315,110 L315,190 L285,190 Z"
          stroke="white"
          stroke-width="2"
        />
        <path
          [attr.fill]="getColor(data?.rearRightFender)"
          d="M285,430 L315,430 L315,480 L285,480 Z"
          stroke="white"
          stroke-width="2"
        />
      </svg>

      <div class="mt-4 grid grid-cols-3 gap-2">
        <div class="flex items-center gap-1.5">
          <div class="w-2.5 h-2.5 rounded-full bg-[#10b981]"></div>
          <span class="text-[9px] font-bold text-slate-500 uppercase"
            >Orijinal</span
          >
        </div>
        <div class="flex items-center gap-1.5">
          <div class="w-2.5 h-2.5 rounded-full bg-[#f59e0b]"></div>
          <span class="text-[9px] font-bold text-slate-500 uppercase"
            >Boyalı</span
          >
        </div>
        <div class="flex items-center gap-1.5">
          <div class="w-2.5 h-2.5 rounded-full bg-[#ef4444]"></div>
          <span class="text-[9px] font-bold text-slate-500 uppercase"
            >Değişen</span
          >
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class ExpertiseGraphicComponent {
  @Input() data: any;

  getColor(status: string | undefined): string {
    switch (status) {
      case "original":
        return "#10b981";
      case "painted":
        return "#f59e0b";
      case "changed":
        return "#ef4444";
      default:
        return "#f1f5f9";
    }
  }
}
