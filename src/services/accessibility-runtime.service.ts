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
          this.prepareInteractive(mutation.target);
        }
      }
    });
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['type', 'name', 'id', 'placeholder', 'aria-label', 'aria-labelledby', 'aria-hidden', 'href'],
    });
  }

  stop(): void {
    this.observer?.disconnect();
    this.observer = undefined;
    this.started = false;
  }

  private scan(root: HTMLElement): void {
    const selector = 'input,select,textarea,button,a[href]';
    const controls = [
      ...(root.matches(selector) ? [root] : []),
      ...Array.from(root.querySelectorAll<HTMLElement>(selector)),
    ];
    controls.forEach((control) => this.prepareInteractive(control));
  }

  private prepareInteractive(control: HTMLElement): void {
    if (!control.matches('input,select,textarea,button,a[href]')) return;
    if (control.getAttribute('aria-hidden') === 'true' || control.hasAttribute('inert') || control.dataset['a11yProxy'] === 'true') return;

    this.applyConciseKnownName(control);

    if (control.matches('input,select,textarea,button')) {
      this.ensureAccessibleName(control);
    }

    if (control.matches('input[type="date"],input[type="time"],input[type="datetime-local"]')) {
      const label = control.getAttribute('aria-label')?.trim();
      if (label && !control.getAttribute('title')) control.setAttribute('title', label);
    }
  }

  private applyConciseKnownName(control: HTMLElement): void {
    if (control.matches('.dock-action')) {
      const visible = control.querySelector('span')?.textContent?.trim();
      if (visible) control.setAttribute('aria-label', this.clean(visible));
      return;
    }
    if (control.matches('a.partner-inline')) {
      control.setAttribute('aria-label', 'Bayilik başvurusu');
      return;
    }
    if (control.matches('.vehicle-partner a')) {
      control.setAttribute('aria-label', 'Aracımı değerlendir');
      return;
    }
    if (control.matches('a.branch-card')) {
      const title = control.querySelector('h3')?.textContent?.trim();
      control.setAttribute('aria-label', title ? `Şube: ${this.clean(title)}` : 'Şubeyi aç');
      return;
    }
    if (control.matches('a.tour-card')) {
      const title = control.querySelector('h3')?.textContent?.trim();
      control.setAttribute('aria-label', title ? `Tur: ${this.clean(title)}` : 'Turu aç');
      return;
    }
    if (control.matches('a.blog-card')) {
      const title = control.querySelector('h3')?.textContent?.trim();
      control.setAttribute('aria-label', title ? `Yazı: ${this.clean(title)}` : 'Yazıyı aç');
    }
  }

  private ensureAccessibleName(control: HTMLElement): void {
    const forceExplicit = control.matches('input[type="date"],input[type="time"],input[type="datetime-local"],select');
    if (forceExplicit) {
      if (control.getAttribute('aria-label')?.trim()) return;
    } else if (this.hasAccessibleName(control)) {
      return;
    }

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

    if (control.tagName === 'BUTTON' && this.visibleText(control)) return true;
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
    clone.querySelectorAll('input,select,textarea,button,[aria-hidden="true"],mat-icon,svg').forEach((node) => node.remove());
    return clone.textContent?.trim() || '';
  }

  private visibleText(control: HTMLElement): string {
    const clone = control.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('[aria-hidden="true"],mat-icon,svg').forEach((node) => node.remove());
    return clone.textContent?.replace(/\s+/g, ' ').trim() || '';
  }

  private fallbackName(control: HTMLElement): string {
    const type = (control.getAttribute('type') || control.tagName).toLowerCase();
    if (type === 'date') return 'Tarih';
    if (type === 'time') return 'Saat';
    if (type === 'datetime-local') return 'Tarih ve saat';
    if (type === 'search') return 'Ara';
    if (type === 'email') return 'E-posta';
    if (type === 'tel') return 'Telefon';
    if (type === 'password') return 'Şifre';
    if (control.tagName === 'SELECT') return 'Seçim';
    if (control.tagName === 'TEXTAREA') return 'Metin';
    if (control.tagName === 'BUTTON') {
      const icon = control.querySelector('mat-icon')?.textContent?.trim();
      const iconNames: Record<string, string> = {
        close: 'Kapat', menu: 'Menü', arrow_back: 'Geri', search: 'Ara',
        favorite: 'Favori', favorite_border: 'Favori', delete: 'Sil', edit: 'Düzenle',
        add: 'Ekle', remove: 'Kaldır', expand_more: 'Seçenekler', more_vert: 'Seçenekler',
      };
      return (icon && iconNames[icon]) || control.getAttribute('title') || 'İşlem';
    }
    return 'Form alanı';
  }

  private humanize(value: string): string {
    return value.replace(/[-_]+/g, ' ').replace(/([a-zçğıöşü])([A-ZÇĞİÖŞÜ])/g, '$1 $2').trim();
  }

  private clean(value: string): string {
    return value.replace(/\s+/g, ' ').replace(/\*/g, '').trim().slice(0, 80);
  }
}
