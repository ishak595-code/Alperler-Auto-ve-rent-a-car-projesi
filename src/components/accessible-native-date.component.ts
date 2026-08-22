import { Component, EventEmitter, Input, Output } from "@angular/core";
import { MatIconModule } from "@angular/material/icon";

let nextDateControlId = 0;

@Component({
  selector: "app-accessible-native-date",
  standalone: true,
  imports: [MatIconModule],
  template: `
    <label class="date-control" [for]="inputId">
      <span class="date-label">{{ label }}</span>
      <span class="date-shell">
        <input
          [id]="inputId"
          class="native-date-input"
          type="date"
          [value]="value"
          [min]="min"
          [max]="max"
          [disabled]="disabled"
          [attr.aria-label]="accessibleName()"
          (change)="emitInput($event)"
        />
        <mat-icon aria-hidden="true">calendar_month</mat-icon>
      </span>
    </label>
  `,
  styles: [`
    :host{display:block;min-width:0}.date-control{display:block;min-width:0}.date-label{display:block;margin-bottom:.38rem;color:var(--date-label,#b9c3d2);font-size:.66rem;font-weight:900;letter-spacing:.06em;text-transform:uppercase}.date-shell{position:relative;display:block}.native-date-input{display:block;width:100%;min-height:52px;border:1px solid var(--date-border,rgba(148,163,184,.24));border-radius:12px;background:var(--date-bg,#050c1a);padding:0 3rem 0 .9rem;color:var(--date-color,#fff);font:800 .83rem/1.2 ui-sans-serif,system-ui,sans-serif;outline:none;color-scheme:dark;-webkit-appearance:none;appearance:none}.native-date-input:focus-visible{outline:3px solid #60a5fa;outline-offset:2px}.native-date-input:disabled{opacity:.55}.native-date-input::-webkit-calendar-picker-indicator{position:absolute;inset:0;width:100%;height:100%;cursor:pointer;opacity:0}.date-shell mat-icon{position:absolute;right:.9rem;top:50%;width:20px;height:20px;transform:translateY(-50%);font-size:20px;color:#93c5fd;pointer-events:none}
  `],
})
export class AccessibleNativeDateComponent {
  @Input({ required: true }) label = "Tarih";
  @Input() value = "";
  @Input() min = "";
  @Input() max = "";
  @Input() disabled = false;
  @Output() readonly valueChange = new EventEmitter<string>();

  readonly inputId = `accessible-date-${++nextDateControlId}`;

  emitInput(event: Event): void {
    const next = (event.target as HTMLInputElement).value;
    if (next !== this.value) this.valueChange.emit(next);
  }

  accessibleName(): string {
    const action = this.value ? "değiştir" : "seç";
    return `${this.normalizedLabel()} ${action}`;
  }

  private normalizedLabel(): string {
    const raw = this.label.trim().toLocaleLowerCase("tr-TR");
    if (raw.includes("alış")) return "Alış tarihini";
    if (raw.includes("iade")) return "İade tarihini";
    if (raw.includes("tur")) return "Tur tarihini";
    return "Tarihi";
  }
}
