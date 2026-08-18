import { Component, EventEmitter, Input, Output } from "@angular/core";
import { MatIconModule } from "@angular/material/icon";

let nextDateControlId = 0;

@Component({
  selector: "app-accessible-native-date",
  standalone: true,
  imports: [MatIconModule],
  template: `
    <label class="date-label" [for]="inputId">{{ label }}</label>
    <div class="date-shell">
      <input
        #dateInput
        [id]="inputId"
        type="date"
        [value]="value"
        [min]="min"
        [max]="max"
        [disabled]="disabled"
        [attr.aria-label]="label"
        (input)="emitInput($event)"
      />
      <button
        type="button"
        class="picker-button"
        [disabled]="disabled"
        [attr.aria-label]="label + ' takvimini aç'"
        (click)="openPicker(dateInput)"
      >
        <mat-icon aria-hidden="true">calendar_month</mat-icon>
      </button>
    </div>
  `,
  styles: [`
    :host{display:block;min-width:0}.date-label{display:block;margin-bottom:.28rem;color:var(--date-label,#b9c3d2);font-size:.61rem;font-weight:900;letter-spacing:.06em;text-transform:uppercase}.date-shell{display:grid;grid-template-columns:minmax(0,1fr) 48px;overflow:hidden;border:1px solid var(--date-border,rgba(148,163,184,.24));border-radius:12px;background:var(--date-bg,#050c1a)}input{width:100%;min-width:0;min-height:47px;border:0;background:transparent;padding:0 .72rem;color:var(--date-color,#fff);font:750 .78rem/1.2 ui-sans-serif,system-ui,sans-serif;outline:none;color-scheme:dark}.picker-button{display:grid;min-width:48px;min-height:47px;place-items:center;border:0;border-left:1px solid var(--date-border,rgba(148,163,184,.24));background:rgba(37,99,235,.14);color:#93c5fd}.picker-button:focus-visible,input:focus{outline:2px solid #60a5fa;outline-offset:-2px}.picker-button:disabled,input:disabled{opacity:.55}input::-webkit-calendar-picker-indicator{display:none;-webkit-appearance:none}mat-icon{width:20px;height:20px;font-size:20px}
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
    this.valueChange.emit((event.target as HTMLInputElement).value);
  }

  openPicker(input: HTMLInputElement): void {
    if (this.disabled) return;
    input.focus();
    const nativeInput = input as HTMLInputElement & { showPicker?: () => void };
    try {
      if (typeof nativeInput.showPicker === "function") nativeInput.showPicker();
      else input.click();
    } catch {
      input.click();
    }
  }
}
