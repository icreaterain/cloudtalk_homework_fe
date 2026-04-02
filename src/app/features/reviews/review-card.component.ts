import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  inject,
} from '@angular/core';
import { StarRatingComponent } from '../../shared/components/star-rating/star-rating.component';
import { TimeAgoPipe } from '../../shared/pipes/time-ago.pipe';
import { AuthService } from '../../core/auth/auth.service';

export interface ReviewCardData {
  id: string;
  rating: number;
  title?: string | null;
  body: string;
  createdAt: string;
  helpfulCount: number;
  author: { id: string; displayName: string };
}

@Component({
  selector: 'app-review-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [StarRatingComponent, TimeAgoPipe],
  template: `
    <article
      class="bg-white rounded-lg border border-gray-200 p-5 transition-shadow hover:shadow-sm"
    >
      <header class="flex items-start justify-between gap-4">
        <div class="flex items-center gap-3 flex-1 min-w-0">
          <div
            class="h-9 w-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-semibold flex-shrink-0 select-none"
            aria-hidden="true"
          >
            {{ initial }}
          </div>
          <div class="min-w-0">
            <p class="text-sm font-medium text-gray-900 truncate">
              {{ review.author.displayName }}
            </p>
            <time class="text-xs text-gray-400" [attr.datetime]="review.createdAt">{{
              review.createdAt | timeAgo
            }}</time>
          </div>
        </div>
        <div class="flex items-center gap-1 flex-shrink-0">
          <app-star-rating [rating]="review.rating" [readonly]="true" size="sm" />
          @if (isOwner) {
            <div class="flex gap-0.5 ml-2" role="group" aria-label="Review actions">
              <button
                type="button"
                (click)="edit.emit(review)"
                class="p-1.5 rounded text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                aria-label="Edit review"
              >
                <svg
                  class="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </button>
              <button
                type="button"
                (click)="delete.emit(review.id)"
                class="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                aria-label="Delete review"
              >
                <svg
                  class="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          }
        </div>
      </header>
      @if (review.title) {
        <h3 class="mt-3 text-sm font-semibold text-gray-900">{{ review.title }}</h3>
      }
      <p class="mt-2 text-sm text-gray-700 leading-relaxed whitespace-pre-line">
        {{ review.body }}
      </p>
      @if (review.helpfulCount > 0) {
        <p class="mt-3 text-xs text-gray-400">
          {{ review.helpfulCount }}
          {{ review.helpfulCount === 1 ? 'person found' : 'people found' }} this helpful
        </p>
      }
    </article>
  `,
})
export class ReviewCardComponent {
  @Input({ required: true }) review!: ReviewCardData;
  @Output() readonly edit = new EventEmitter<ReviewCardData>();
  @Output() readonly delete = new EventEmitter<string>();

  private readonly authService = inject(AuthService);

  get initial(): string {
    return (this.review.author.displayName[0] ?? '?').toUpperCase();
  }

  get isOwner(): boolean {
    const userId = this.authService.currentUser()?.id;
    return userId !== undefined && userId === this.review.author.id;
  }
}
