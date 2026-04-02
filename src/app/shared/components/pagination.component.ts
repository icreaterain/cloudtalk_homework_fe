import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-pagination',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-center justify-between py-4">
      <p class="text-sm text-gray-500">
        Showing <span class="font-medium">{{ shown }}</span> of
        <span class="font-medium">{{ totalCount }}</span> results
      </p>
      @if (hasNextPage) {
        <button class="btn-secondary text-sm" [disabled]="loading" (click)="loadMore.emit()">
          @if (loading) {
            <svg class="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              ></path>
            </svg>
          }
          Load more
        </button>
      }
    </div>
  `,
})
export class PaginationComponent {
  @Input() shown = 0;
  @Input() totalCount = 0;
  @Input() hasNextPage = false;
  @Input() loading = false;
  @Output() loadMore = new EventEmitter<void>();
}
