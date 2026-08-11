import { Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ConfirmService } from "../services/confirm.service";

@Component({
  selector: "app-confirm-modal",
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (confirmService.state().isOpen) {
      <div class="fixed inset-0 z-[100] flex items-center justify-center">
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          (click)="confirmService.state().onCancel()"
        ></div>

        <!-- Modal -->
        <div
          class="relative bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden animate-scale-in"
        >
          <div class="p-6">
            <div
              class="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4 mx-auto"
            >
              <svg
                class="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h3 class="text-lg font-bold text-slate-900 text-center mb-2">
              {{ confirmService.state().title }}
            </h3>
            <p class="text-sm text-slate-500 text-center mb-6">
              {{ confirmService.state().message }}
            </p>

            <div class="flex space-x-3">
              <button
                (click)="confirmService.state().onCancel()"
                class="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors text-sm"
              >
                {{ confirmService.state().cancelText }}
              </button>
              <button
                (click)="confirmService.state().onConfirm()"
                class="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors text-sm"
              >
                {{ confirmService.state().confirmText }}
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
})
export class ConfirmModalComponent {
  confirmService = inject(ConfirmService);
}
