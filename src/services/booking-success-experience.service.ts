import { Injectable, signal } from '@angular/core';

export interface BookingSuccessExperience {
  reference: string;
  type: string;
  itemName: string;
}

@Injectable({ providedIn: 'root' })
export class BookingSuccessExperienceService {
  readonly result = signal<BookingSuccessExperience | null>(null);

  show(value: BookingSuccessExperience): void {
    const reference = String(value.reference || '').trim();
    if (!reference) return;
    this.result.set({
      reference,
      type: String(value.type || 'REQUEST'),
      itemName: String(value.itemName || '').trim().slice(0, 240),
    });
  }

  clear(): void { this.result.set(null); }
}
