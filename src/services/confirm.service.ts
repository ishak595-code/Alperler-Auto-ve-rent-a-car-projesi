import { Injectable, signal } from '@angular/core';

export interface ConfirmState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel: () => void;
}

@Injectable({
  providedIn: 'root'
})
export class ConfirmService {
  private _state = signal<ConfirmState>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Evet',
    cancelText: 'İptal',
    onConfirm: () => {},
    onCancel: () => {}
  });

  get state() {
    return this._state.asReadonly();
  }

  confirm(options: { title?: string, message: string, confirmText?: string, cancelText?: string }): Promise<boolean> {
    return new Promise((resolve) => {
      this._state.set({
        isOpen: true,
        title: options.title || 'Onay',
        message: options.message,
        confirmText: options.confirmText || 'Evet',
        cancelText: options.cancelText || 'İptal',
        onConfirm: () => {
          this.close();
          resolve(true);
        },
        onCancel: () => {
          this.close();
          resolve(false);
        }
      });
    });
  }

  close() {
    this._state.update(s => ({ ...s, isOpen: false }));
  }
}
