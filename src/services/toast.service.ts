
import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  toasts = signal<Toast[]>([]);

  show(message: string, type: 'success' | 'error' | 'info' = 'success') {
    const id = Date.now();
    const newToast: Toast = { id, message, type };
    
    this.toasts.update(t => [...t, newToast]);

    // Hata mesajları ekran okuyucunun okuyabilmesi için daha uzun kalır.
    setTimeout(() => {
      this.remove(id);
    }, type === 'error' ? 8000 : 4000);
  }

  remove(id: number) {
    this.toasts.update(t => t.filter(toast => toast.id !== id));
  }
}
