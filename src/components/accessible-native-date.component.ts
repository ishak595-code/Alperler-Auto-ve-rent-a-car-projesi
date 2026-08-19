import { Component, EventEmitter, Input, Output } from "@angular/core";
import { MatIconModule } from "@angular/material/icon";

let nextDateControlId = 0;

@Component({
  selector: "app-accessible-native-date",
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="date-control">
      <span class="date-label">{{ label }}</span>
      <button
        type="button"
        class="date-button"
        [disabled]="disabled"
        [attr.aria-label]="accessibleName()"
        (click)="openPicker(dateInput)"
      >
        <span class="date-value" aria-hidden="true">{{ displayValue() }}</span>
        <mat-icon aria-hidden="true">calendar_month</mat-icon>
      </button>
      <input
        #dateInput
        class="native-date-input"
        [id]="inputId"
        type="date"
        [value]="value"
        [min]="min"
        [max]="max"
        [disabled]="disabled"
        tabindex="-1"
        aria-hidden="true"
        (input)="emitInput($event)"
        (change)="emitInput($event)"
      />
    </div>
  `,
  styles: [`
    :host{display:block;min-width:0}.date-control{position:relative}.date-label{display:block;margin-bottom:.38rem;color:var(--date-label,#b9c3d2);font-size:.66rem;font-weight:900;letter-spacing:.06em;text-transform:uppercase}.date-button{display:flex;width:100%;min-height:52px;align-items:center;justify-content:space-between;gap:.75rem;border:1px solid var(--date-border,rgba(148,163,184,.24));border-radius:12px;background:var(--date-bg,#050c1a);padding:0 .9rem;color:var(--date-color,#fff);font:800 .83rem/1.2 ui-sans-serif,system-ui,sans-serif;text-align:left}.date-button:focus-visible{outline:3px solid #60a5fa;outline-offset:2px}.date-button:disabled{opacity:.55}.date-value{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.date-button mat-icon{width:20px;height:20px;flex:0 0 auto;font-size:20px;color:#93c5fd}.native-date-input{position:absolute;left:0;bottom:0;width:1px;height:1px;min-width:1px;min-height:1px;border:0;padding:0;margin:0;opacity:0;pointer-events:none;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
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

  displayValue(): string {
    if (!this.value) return "Tarih seç";
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(this.value);
    if (!match) return this.value;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    if (Number.isNaN(date.getTime())) return this.value;
    return new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "long", year: "numeric" }).format(date);
  }

  accessibleName(): string {
    if (this.value) return `${this.normalizedLabel()} ${this.displayValue()}`;
    return `${this.normalizedLabel()} seç`;
  }

  private normalizedLabel(): string {
    const raw = this.label.trim().toLocaleLowerCase("tr-TR");
    if (raw.includes("alış")) return "Alış tarihini";
    if (raw.includes("iade")) return "İade tarihini";
    if (raw.includes("tur")) return "Tur tarihini";
    return "Tarihi";
  }

  openPicker(input: HTMLInputElement): void {
    if (this.disabled) return;
    const nativeInput = input as HTMLInputElement & { showPicker?: () => void };
    try {
      if (typeof nativeInput.showPicker === "function") {
        nativeInput.showPicker();
        return;
      }
      input.click();
    } catch {
      input.click();
    }
  }
}
