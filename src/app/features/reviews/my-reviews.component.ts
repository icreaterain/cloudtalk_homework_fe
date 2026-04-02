import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { QueryRef } from 'apollo-angular';
import { MyReviewsGQL, MyReviewsQuery, MyReviewsQueryVariables } from '../../../generated/graphql';
import { StarRatingComponent } from '../../shared/components/star-rating/star-rating.component';
import { TimeAgoPipe } from '../../shared/pipes/time-ago.pipe';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner.component';
import { ErrorMessageComponent } from '../../shared/components/error-message.component';
import { ReviewFormComponent, ReviewFormData } from './review-form.component';
import { ReviewCommandService } from './review-command.service';

const PAGE_SIZE = 10;

type MyReviewNode = MyReviewsQuery['myReviews']['edges'][number]['node'];

@Component({
  selector: 'app-my-reviews',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    StarRatingComponent,
    TimeAgoPipe,
    LoadingSpinnerComponent,
    ErrorMessageComponent,
    ReviewFormComponent,
  ],
  template: `
    <div class="max-w-4xl mx-auto px-4 py-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">My Reviews</h1>
      <p class="text-gray-500 mb-8">All reviews you have submitted.</p>

      <!-- Loading -->
      @if (loading() && !reviews().length) {
        <app-loading-spinner label="Loading your reviews..." [fullPage]="true" />
      }

      <!-- Error -->
      @if (queryError()) {
        <app-error-message [message]="queryError()" [retryable]="true" (retry)="reload()" />
      }

      <!-- Empty state -->
      @if (!loading() && !queryError() && !reviews().length) {
        <div class="text-center py-24 text-gray-400">
          <svg
            class="mx-auto h-12 w-12 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            />
          </svg>
          <p class="text-lg font-medium">No reviews yet</p>
          <p class="text-sm mt-1">
            Browse
            <a routerLink="/products" class="text-primary-600 hover:underline">products</a>
            and share your thoughts!
          </p>
        </div>
      }

      <!-- Edit form -->
      @if (editingReview()) {
        <div class="mb-6">
          <app-review-form
            [review]="editingReview()"
            (saved)="onFormSaved()"
            (cancelled)="editingReview.set(undefined)"
          />
        </div>
      }

      <!-- Review list -->
      <div class="space-y-4">
        @for (review of reviews(); track review.id) {
          <article
            class="bg-white rounded-lg border border-gray-200 p-5 transition-shadow hover:shadow-sm"
          >
            <!-- Product link -->
            @if (review.product) {
              <a
                [routerLink]="['/products', review.product.id]"
                class="flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700 hover:underline mb-3"
              >
                @if (review.product.imageUrl) {
                  <img
                    [src]="review.product.imageUrl"
                    [alt]="review.product.name"
                    class="h-8 w-8 rounded object-cover flex-shrink-0"
                  />
                }
                <span class="truncate">{{ review.product.name }}</span>
                <svg
                  class="h-3.5 w-3.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </a>
            }

            <!-- Review header -->
            <div class="flex items-start justify-between gap-4">
              <div class="flex items-center gap-2">
                <app-star-rating [rating]="review.rating" [readonly]="true" size="sm" />
                <time class="text-xs text-gray-400" [attr.datetime]="review.createdAt">{{
                  review.createdAt | timeAgo
                }}</time>
              </div>
              <div class="flex gap-1 flex-shrink-0" role="group" aria-label="Review actions">
                <button
                  type="button"
                  (click)="onEdit(review)"
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
                  (click)="onDelete(review.id)"
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
            </div>

            @if (review.title) {
              <h3 class="mt-3 text-sm font-semibold text-gray-900">{{ review.title }}</h3>
            }
            <p class="mt-2 text-sm text-gray-700 leading-relaxed whitespace-pre-line">
              {{ review.body }}
            </p>
          </article>
        }
      </div>

      <!-- Load more -->
      @if (hasNextPage()) {
        <div class="mt-6 flex justify-center">
          <button
            type="button"
            class="btn-secondary"
            [disabled]="loadingMore()"
            (click)="onLoadMore()"
          >
            @if (loadingMore()) {
              <svg
                class="animate-spin h-4 w-4 mr-2 inline"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
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
        </div>
      }
    </div>
  `,
})
export class MyReviewsComponent implements OnInit, OnDestroy {
  private readonly myReviewsGQL = inject(MyReviewsGQL);
  private readonly reviewCommandService = inject(ReviewCommandService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroy$ = new Subject<void>();

  private queryRef!: QueryRef<MyReviewsQuery, MyReviewsQueryVariables>;

  readonly loading = signal(true);
  readonly loadingMore = signal(false);
  readonly queryError = signal('');
  readonly reviews = signal<MyReviewNode[]>([]);
  readonly hasNextPage = signal(false);
  readonly endCursor = signal<string | null>(null);
  readonly editingReview = signal<ReviewFormData | undefined>(undefined);

  ngOnInit(): void {
    this.queryRef = this.myReviewsGQL.watch({ first: PAGE_SIZE });

    this.queryRef.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((result) => {
      if (result.loading && !result.data?.myReviews) {
        this.loading.set(true);
        this.cdr.markForCheck();
        return;
      }

      this.loading.set(false);
      this.loadingMore.set(false);

      if (result.errors?.length) {
        this.queryError.set(result.errors[0]?.message ?? 'Failed to load your reviews.');
        this.cdr.markForCheck();
        return;
      }

      this.queryError.set('');
      const data = result.data?.myReviews;
      if (data) {
        const nodes = data.edges.map((e) => e.node);
        this.reviews.set(nodes);
        this.hasNextPage.set(data.pageInfo.hasNextPage);
        this.endCursor.set(data.pageInfo.endCursor ?? null);
      }

      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  reload(): void {
    this.loading.set(true);
    this.queryError.set('');
    void this.queryRef.refetch({ first: PAGE_SIZE });
  }

  onLoadMore(): void {
    if (!this.hasNextPage() || this.loadingMore()) return;
    this.loadingMore.set(true);
    void this.queryRef.fetchMore({
      variables: { first: PAGE_SIZE, after: this.endCursor() },
    });
  }

  onEdit(review: MyReviewNode): void {
    this.editingReview.set({
      id: review.id,
      rating: review.rating,
      title: review.title,
      body: review.body,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onDelete(reviewId: string): void {
    if (!confirm('Are you sure you want to delete this review?')) return;

    this.reviewCommandService.deleteReview(reviewId).subscribe({
      next: () => {
        this.reload();
      },
      error: () => {
        this.reload();
      },
    });
  }

  onFormSaved(): void {
    this.editingReview.set(undefined);
    this.reload();
  }
}
