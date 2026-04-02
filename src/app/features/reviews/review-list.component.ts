import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  inject,
  signal,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { QueryRef } from 'apollo-angular';
import {
  ProductReviewsGQL,
  ProductReviewsQuery,
  ProductReviewsQueryVariables,
  ReviewSort,
} from '../../../generated/graphql';
import { ReviewCardComponent, ReviewCardData } from './review-card.component';
import { ReviewFormComponent, ReviewFormData } from './review-form.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner.component';
import { ErrorMessageComponent } from '../../shared/components/error-message.component';
import { PaginationComponent } from '../../shared/components/pagination.component';
import { AuthService } from '../../core/auth/auth.service';
import { ReviewCommandService } from './review-command.service';

const PAGE_SIZE = 10;

@Component({
  selector: 'app-review-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    FormsModule,
    ReviewCardComponent,
    ReviewFormComponent,
    LoadingSpinnerComponent,
    ErrorMessageComponent,
    PaginationComponent,
  ],
  template: `
    <section aria-label="Customer reviews">
      <!-- Header + Controls -->
      <div class="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h2 class="text-lg font-semibold text-gray-900">
          @if (totalCount() !== null) {
            {{ totalCount() }} {{ totalCount() === 1 ? 'Review' : 'Reviews' }}
          } @else {
            Reviews
          }
        </h2>
        <div class="flex flex-wrap items-center gap-2">
          <select
            [(ngModel)]="selectedSort"
            (ngModelChange)="onSortChange($event)"
            class="input text-sm py-1.5 pr-8 w-auto"
            aria-label="Sort reviews"
          >
            <option value="NEWEST">Newest first</option>
            <option value="OLDEST">Oldest first</option>
            <option value="HIGHEST_RATING">Highest rating</option>
            <option value="LOWEST_RATING">Lowest rating</option>
          </select>
          <select
            [(ngModel)]="selectedRatingFilter"
            (ngModelChange)="onRatingFilterChange($event)"
            class="input text-sm py-1.5 pr-8 w-auto"
            aria-label="Filter by rating"
          >
            <option [ngValue]="null">All ratings</option>
            <option [ngValue]="5">5 stars only</option>
            <option [ngValue]="4">4 stars only</option>
            <option [ngValue]="3">3 stars only</option>
            <option [ngValue]="2">2 stars only</option>
            <option [ngValue]="1">1 star only</option>
          </select>
        </div>
      </div>

      <!-- Write a Review section -->
      @if (authService.isLoggedIn()) {
        @if (showForm()) {
          <div class="mb-6">
            <app-review-form
              [productId]="productId"
              [review]="editingReview()"
              (saved)="onFormSaved()"
              (cancelled)="onFormCancelled()"
            />
          </div>
        } @else if (!userReview()) {
          <button type="button" class="btn-primary mb-6" (click)="showForm.set(true)">
            Write a review
          </button>
        }
      } @else {
        <div class="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-600">
          <a routerLink="/auth/login" class="text-primary-600 hover:underline font-medium"
            >Sign in</a
          >
          to write a review.
        </div>
      }

      <!-- Loading state -->
      @if (loading() && !reviews().length) {
        <app-loading-spinner label="Loading reviews..." />
      }

      <!-- Error state -->
      @if (queryError()) {
        <app-error-message [message]="queryError()" [retryable]="true" (retry)="reload()" />
      }

      <!-- Empty state -->
      @if (!loading() && !queryError() && !reviews().length) {
        <div class="text-center py-12 text-gray-400">
          <svg
            class="mx-auto h-10 w-10 mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
          <p class="text-sm">No reviews yet. Be the first to share your thoughts!</p>
        </div>
      }

      <!-- Review list -->
      <div class="space-y-4">
        @for (review of reviews(); track review.id) {
          <app-review-card [review]="review" (edit)="onEdit($event)" (delete)="onDelete($event)" />
        }
      </div>

      <!-- Pagination -->
      @if (reviews().length > 0) {
        <app-pagination
          [shown]="reviews().length"
          [totalCount]="totalCount() ?? 0"
          [hasNextPage]="hasNextPage()"
          [loading]="loadingMore()"
          (loadMore)="onLoadMore()"
        />
      }
    </section>
  `,
})
export class ReviewListComponent implements OnInit, OnDestroy {
  @Input({ required: true }) productId!: string;
  @Output() readonly reviewsChanged = new EventEmitter<void>();

  readonly authService = inject(AuthService);
  private readonly productReviewsGQL = inject(ProductReviewsGQL);
  private readonly reviewCommandService = inject(ReviewCommandService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroy$ = new Subject<void>();

  private queryRef!: QueryRef<ProductReviewsQuery, ProductReviewsQueryVariables>;

  selectedSort: ReviewSort = ReviewSort.Newest;
  selectedRatingFilter: number | null = null;

  readonly loading = signal(true);
  readonly loadingMore = signal(false);
  readonly queryError = signal('');
  readonly reviews = signal<ReviewCardData[]>([]);
  readonly totalCount = signal<number | null>(null);
  readonly hasNextPage = signal(false);
  readonly endCursor = signal<string | null>(null);

  readonly showForm = signal(false);
  readonly editingReview = signal<ReviewFormData | undefined>(undefined);
  readonly userReview = signal<ReviewCardData | null>(null);

  ngOnInit(): void {
    this.queryRef = this.productReviewsGQL.watch({
      id: this.productId,
      first: PAGE_SIZE,
      sort: this.selectedSort,
    });

    this.queryRef.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((result) => {
      if (result.loading && !result.data?.product) {
        this.loading.set(true);
        this.cdr.markForCheck();
        return;
      }

      this.loading.set(false);
      this.loadingMore.set(false);

      if (result.errors?.length) {
        this.queryError.set(result.errors[0]?.message ?? 'Failed to load reviews.');
        this.cdr.markForCheck();
        return;
      }

      this.queryError.set('');
      const reviewData = result.data?.product?.reviews;
      if (reviewData) {
        const nodes = reviewData.edges.map((e) => e.node);
        this.reviews.set(nodes);
        this.totalCount.set(reviewData.totalCount);
        this.hasNextPage.set(reviewData.pageInfo.hasNextPage);
        this.endCursor.set(reviewData.pageInfo.endCursor ?? null);

        const userId = this.authService.currentUser()?.id;
        if (userId) {
          this.userReview.set(nodes.find((r) => r.author.id === userId) ?? null);
        }
      }

      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSortChange(sort: ReviewSort): void {
    this.selectedSort = sort;
    this.reload();
  }

  onRatingFilterChange(rating: number | null): void {
    this.selectedRatingFilter = rating;
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.queryError.set('');
    void this.queryRef.refetch({
      id: this.productId,
      first: PAGE_SIZE,
      sort: this.selectedSort,
      filterByRating: this.selectedRatingFilter ?? undefined,
    });
  }

  onLoadMore(): void {
    if (!this.hasNextPage() || this.loadingMore()) return;
    this.loadingMore.set(true);
    void this.queryRef.fetchMore({
      variables: {
        id: this.productId,
        first: PAGE_SIZE,
        after: this.endCursor(),
        sort: this.selectedSort,
        filterByRating: this.selectedRatingFilter ?? undefined,
      },
    });
  }

  onEdit(review: ReviewCardData): void {
    this.editingReview.set(review);
    this.showForm.set(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onDelete(reviewId: string): void {
    if (!confirm('Are you sure you want to delete this review?')) return;

    this.reviewCommandService.deleteReview(reviewId).subscribe({
      next: () => {
        this.userReview.set(null);
        this.reload();
        this.reviewsChanged.emit();
      },
      error: () => {
        this.reload();
      },
    });
  }

  onFormSaved(): void {
    this.showForm.set(false);
    this.editingReview.set(undefined);
    this.reload();
    this.reviewsChanged.emit();
  }

  onFormCancelled(): void {
    this.showForm.set(false);
    this.editingReview.set(undefined);
  }
}
