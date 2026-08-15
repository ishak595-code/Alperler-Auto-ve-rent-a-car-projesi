import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AccessibilityRuntimeService {
  private observer?: MutationObserver;
  private started = false;

  start(): void {
    if (this.started || typeof document === 'undefined' || !document.body) return;
    this.started = true;
    this.scan(document.body);
    this.observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type !== 'childList') continue;
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) this.scan(node);
        });
      }
    });
    this.observer.observe(document.body, { childList: true, subtree: true });
  }

  stop(): void {
    this.observer?.disconnect();
    this.observer = undefined;
    this.started = false;
  }

  private scan(root: HTMLElement): void {
    const controls = [
      ...(root.matches('input[type="date"],input[type="time"],input[type="datetime-local"],select') ? [root] : []),
      ...Array.from(root.querySelectorAll<HTMLElement>('input[type="date"],input[type="time"],input[type="datetime-local"],select')),
    ];
    controls.forEach((control) => this.ensureAccessibleName(control));
  }

  private ensureAccessibleName(control: HTMLElement): void {
    if (this.hasAccessibleName(control)) return;
    const labelText = this.nearestLabelText(control);
    const type = (control.getAttribute('type') || control.tagName).toLowerCase();
    const fallback = type === 'date'
      ? 'Tarih seçin'
      : type === 'time'
        ? 'Saat seçin'
        : type === 'datetime-local'
          ? 'Tarih ve saat seçin'
          : 'Seçim yapın';
    control.setAttribute('aria-label', labelText || fallback);
  }

  private hasAccessibleName(control: HTMLElement): boolean {
    if (control.getAttribute('aria-label')?.trim()) return true;
    const labelledBy = control.getAttribute('aria-labelledby')?.trim();
    if (labelledBy && labelledBy.split(/\s+/).some((id) => Boolean(document.getElementById(id)?.textContent?.trim()))) return true;
    const id = control.id;
    if (id && Array.from(document.querySelectorAll<HTMLLabelElement>('label[for]')).some((label) => label.htmlFor === id && Boolean(label.textContent?.trim()))) return true;
    return false;
  }

  private nearestLabelText(control: HTMLElement): string {
    const wrappingLabel = control.closest('label');
    if (wrappingLabel?.textContent?.trim()) return this.clean(wrappingLabel.textContent);
    const preceding = control.previousElementSibling;
    if (preceding?.textContent?.trim()) return this.clean(preceding.textContent);
    return '';
  }

  private clean(value: string): string {
    return value.replace(/\s+/g, ' ').replace(/\*/g, '').trim().slice(0, 120);
  }
}
