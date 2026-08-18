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
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
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
    this.ensureAccessibleName(control);

    if (control.matches('input[type="date"],input[type="time"],input[type="datetime-local"]')) {
      const label = control.getAttribute('aria-label')?.trim();
      if (label && !control.getAttribute('title')) control.setAttribute('title', label);
    }
  }

  private setName(control: HTMLElement, value: string): void {
    const next = this.clean(value);
    if (!next) return;
    if (control.getAttribute('aria-label') !== next) control.setAttribute('aria-label', next);
  }

  private applyConciseKnownName(control: HTMLElement): void {
    if (control.matches('.dock-action')) {
      const visible = control.querySelector('span')?.textContent?.trim();
      if (visible) this.setName(control, visible);
      return;
    }
    if (control.matches('a.partner-inline')) {
      this.setName(control, 'Bayilik başvurusu');
      return;
    }
    if (control.matches('.vehicle-partner a')) {
      this.setName(control, 'Aracımı değerlendir');
      return;
    }
    if (control.matches('a.branch-card')) {
      const title = control.querySelector('h3')?.textContent?.trim();
      this.setName(control, title ? `Şube: ${this.clean(title)}` : 'Şubeyi aç');
      return;
    }
    if (control.matches('a.tour-card')) {
      const title = control.querySelector('h3')?.textContent?.trim();
      this.setName(control, title ? `Tur: ${this.clean(title)}` : 'Turu aç');
      return;
    }
    if (control.matches('a.blog-card')) {
      const title = control.querySelector('h3')?.textContent?.trim();
      this.setName(control, title ? `Yazı: ${this.clean(title)}` : 'Yazıyı aç');
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

    if (text) this.setName(control, text);
  }

  private hasAccessibleName(control: HTMLElement): boolean {
    if (control.getAttribute('aria-label')?.trim()) return true;
    const labelledBy = control.getAttribute('aria-labelledby')?.trim();
    if (labelledBy && labelledBy.split(/\s+/).some((id) => Boolean(document.getElementById(id)?.textContent?.trim()))) return true;

    const id = control.id;
    if (id && Array.from(document.querySelectorAll<HTMLLabelElement>('label[for]')).some((label) => label.htmlFor === id && Boolean(label.textContent?.trim()))) return true;

    const wrappingLabel = control.closest('label');
    if (wrappingLabel && this.labelTextWithoutControl(wrappingLabel)) return true;

    if ((control.tagName === 'BUTTON' || control.tagName === 'A') && this.visibleText(control)) return true;
    return false;
  }

  private nearestLabelText(control: HTMLElement): string {
    const wrappingLabel = control.closest('label');
    if (wrappingLabel) {
      const text = this.labelTextWithoutControl(wrappingLabel);
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

  private labelTextWithoutControl(label: HTMLLabelElement): string {
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
    if (control.tagName === 'BUTTON' || control.tagName === 'A') {
      const icon = control.querySelector('mat-icon')?.textContent?.trim();
      const iconNames: Record<string, string> = {
        close: 'Kapat', menu: 'Menü', arrow_back: 'Geri', search: 'Ara',
        favorite: 'Favori', favorite_border: 'Favori', delete: 'Sil', edit: 'Düzenle',
        add: 'Ekle', remove: 'Kaldır', expand_more: 'Seçenekler', more_vert: 'Seçenekler',
        event_available: 'Rezervasyon', call: 'Telefonla ara', share: 'Paylaş',
        chevron_left: 'Önceki', chevron_right: 'Sonraki', tune: 'Ayarlar', save: 'Kaydet',
        chat: 'Mesaj gönder', home: 'Ana sayfa', arrow_forward: 'Devam et',
      };
      const title = control.getAttribute('title')?.trim();
      return (icon && iconNames[icon]) || title || (control.tagName === 'A' ? 'Bağlantıyı aç' : 'İşlem');
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
