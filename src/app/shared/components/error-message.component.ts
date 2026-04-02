import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-error-message',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rounded-md bg-red-50 border border-red-200 p-4" role="alert">
      <div class="flex items-start gap-3">
        <svg
          class="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fill-rule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clip-rule="evenodd"
          />
        </svg>
        <div class="flex-1">
          <p class="text-sm font-medium text-red-800">{{ message }}</p>
        </div>
        @if (retryable) {
          <button
            (click)="retry.emit()"
            class="text-sm text-red-700 hover:text-red-900 font-medium underline flex-shrink-0"
          >
            Try again
          </button>
        }
      </div>
    </div>
  `,
})
export class ErrorMessageComponent {
  @Input() message = 'Something went wrong. Please try again.';
  @Input() retryable = false;
  @Output() retry = new EventEmitter<void>();
}
