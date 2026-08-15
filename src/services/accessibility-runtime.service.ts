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
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node instanceof HTMLElement) this.scan(node);
          });
        }
        if (mutation.type === 'attributes' && mutation.target instanceof HTMLElement) {
          this.ensureAccessibleName(mutation.target);
        }
      }
    });
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['type', 'name', 'id', 'placeholder', 'aria-label', 'aria-labelledby'],
    });
  }

  stop(): void {
    this.observer?.disconnect();
    this.observer = undefined;
    this.started = false;
  }

  private scan(root: HTMLElement): void {
    const selector = 'input,select,textarea,button';
    const controls = [
      ...(root.matches(selector) ? [root] : []),
      ...Array.from(root.querySelectorAll<HTMLElement>(selector)),
    ];
    controls.forEach((control) => this.ensureAccessibleName(control));
  }

  private ensureAccessibleName(control: HTMLElement): void {
    if (!control.matches('input,select,textarea,button')) return;
    if (this.hasAccessibleName(control)) return;

    const text = this.nearestLabelText(control)
      || control.getAttribute('placeholder')?.trim()
      || this.humanize(control.getAttribute('name') || '')
      || this.humanize(control.id || '')
      || this.fallbackName(control);

    if (text) control.setAttribute('aria-label', this.clean(text));
  }

  private hasAccessibleName(control: HTMLElement): boolean {
    if (control.getAttribute('aria-label')?.trim()) return true;
    const labelledBy = control.getAttribute('aria-labelledby')?.trim();
    if (labelledBy && labelledBy.split(/\s+/).some((id) => Boolean(document.getElementById(id)?.textContent?.trim()))) return true;

    const id = control.id;
    if (id && Array.from(document.querySelectorAll<HTMLLabelElement>('label[for]')).some((label) => label.htmlFor === id && Boolean(label.textContent?.trim()))) return true;

    const wrappingLabel = control.closest('label');
    if (wrappingLabel && this.labelTextWithoutControl(wrappingLabel, control)) return true;

    if (control.tagName === 'BUTTON' && control.textContent?.trim()) return true;
    return false;
  }

  private nearestLabelText(control: HTMLElement): string {
    const wrappingLabel = control.closest('label');
    if (wrappingLabel) {
      const text = this.labelTextWithoutControl(wrappingLabel, control);
      if (text) return text;
    }

    const id = control.id;
    if (id) {
      const explicit = Array.from(document.querySelectorAll<HTMLLabelElement>('label[for]')).find((label) => label.htmlFor === id);
      if (explicit?.textContent?.trim()) return explicit.textContent;
    }

    const previous = control.previousElementSibling;
    if (previous?.textContent?.trim()) return previous.textContent;
    return '';
  }

  private labelTextWithoutControl(label: HTMLLabelElement, control: HTMLElement): string {
    const clone = label.cloneNode(true) as HTMLElement;
    const selector = control.tagName.toLowerCase();
    clone.querySelectorAll(`${selector},input,select,textarea,button`).forEach((node) => node.remove());
    return clone.textContent?.trim() || '';
  }

  private fallbackName(control: HTMLElement): string {
    const type = (control.getAttribute('type') || control.tagName).toLowerCase();
    if (type === 'date') return 'Tarih seçin';
    if (type === 'time') return 'Saat seçin';
    if (type === 'datetime-local') return 'Tarih ve saat seçin';
    if (type === 'search') return 'Ara';
    if (type === 'email') return 'E-posta adresi';
    if (type === 'tel') return 'Telefon numarası';
    if (type === 'password') return 'Şifre';
    if (control.tagName === 'SELECT') return 'Seçim yapın';
    if (control.tagName === 'TEXTAREA') return 'Metin alanı';
    if (control.tagName === 'BUTTON') return control.getAttribute('title') || 'Düğme';
    return 'Form alanı';
  }

  private humanize(value: string): string {
    return value.replace(/[-_]+/g, ' ').replace(/([a-zçğıöşü])([A-ZÇĞİÖŞÜ])/g, '$1 $2').trim();
  }

  private clean(value: string): string {
    return value.replace(/\s+/g, ' ').replace(/\*/g, '').trim().slice(0, 140);
  }
}
