import {
  Component,
  Input,
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
import {
  ProductDetailGQL,
  ProductDetailQuery,
  ProductDetailQueryVariables,
} from '../../../generated/graphql';
import { StarRatingComponent } from '../../shared/components/star-rating/star-rating.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner.component';
import { ErrorMessageComponent } from '../../shared/components/error-message.component';
import { ReviewListComponent } from '../reviews/review-list.component';

type ProductDetail = NonNullable<ProductDetailQuery['product']>;

@Component({
  selector: 'app-product-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    StarRatingComponent,
    LoadingSpinnerComponent,
    ErrorMessageComponent,
    ReviewListComponent,
  ],
  template: `
    <div class="max-w-7xl mx-auto px-4 py-8">
      <!-- Back link -->
      <a
        routerLink="/products"
        class="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600 transition-colors mb-6"
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
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Back to Products
      </a>

      <!-- Loading state -->
      @if (loading()) {
        <app-loading-spinner size="lg" label="Loading product..." [fullPage]="true" />
      }

      <!-- Error state -->
      @if (queryError()) {
        <app-error-message [message]="queryError()" [retryable]="true" (retry)="reload()" />
      }

      <!-- Not found -->
      @if (!loading() && !queryError() && !product()) {
        <div class="text-center py-24 text-gray-400">
          <p class="text-lg font-medium">Product not found</p>
          <a
            routerLink="/products"
            class="text-primary-600 hover:underline text-sm mt-2 inline-block"
            >Browse all products</a
          >
        </div>
      }

      <!-- Product content -->
      @if (product(); as p) {
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          <!-- Product image -->
          <div class="aspect-square bg-gray-100 rounded-xl overflow-hidden">
            @if (p.imageUrl) {
              <img [src]="p.imageUrl" [alt]="p.name" class="h-full w-full object-cover" />
            } @else {
              <div class="h-full w-full flex items-center justify-center">
                <svg
                  class="h-24 w-24 text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="1"
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
            }
          </div>

          <!-- Product info -->
          <div class="flex flex-col">
            @if (p.category) {
              <span class="text-sm font-medium text-primary-600 uppercase tracking-wide mb-2">{{
                p.category
              }}</span>
            }
            <h1 class="text-3xl font-bold text-gray-900 mb-4">{{ p.name }}</h1>

            <!-- Price -->
            <p class="text-2xl font-bold text-gray-900 mb-4">{{ formatPrice(p.price) }}</p>

            <!-- Rating summary -->
            <div class="flex items-center gap-3 mb-4 p-4 bg-gray-50 rounded-lg">
              <div class="text-center">
                <p class="text-4xl font-bold text-gray-900">{{ p.avgRating.toFixed(1) }}</p>
                <app-star-rating [rating]="p.avgRating" [readonly]="true" size="md" />
                <p class="text-xs text-gray-500 mt-1">
                  {{ p.reviewCount }} {{ p.reviewCount === 1 ? 'review' : 'reviews' }}
                </p>
              </div>

              <!-- Rating distribution -->
              @if (p.reviewCount > 0) {
                <div class="flex-1 space-y-1.5 ml-4">
                  @for (bar of ratingBars(p); track bar.stars) {
                    <div class="flex items-center gap-2">
                      <span class="text-xs text-gray-500 w-8 text-right shrink-0"
                        >{{ bar.stars }}★</span
                      >
                      <div class="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          class="bg-yellow-400 h-2 rounded-full transition-all duration-500"
                          [style.width.%]="bar.percent"
                        ></div>
                      </div>
                      <span class="text-xs text-gray-500 w-8 shrink-0">{{ bar.count }}</span>
                    </div>
                  }
                </div>
              }
            </div>

            <!-- Description -->
            @if (p.description) {
              <p class="text-gray-600 leading-relaxed">{{ p.description }}</p>
            }
          </div>
        </div>

        <!-- Reviews section -->
        <div class="border-t border-gray-200 pt-8">
          <app-review-list [productId]="id" (reviewsChanged)="onReviewsChanged()" />
        </div>
      }
    </div>
  `,
})
export class ProductDetailComponent implements OnInit, OnDestroy {
  @Input({ required: true }) id!: string;

  private readonly productDetailGQL = inject(ProductDetailGQL);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroy$ = new Subject<void>();

  private queryRef!: QueryRef<ProductDetailQuery, ProductDetailQueryVariables>;

  readonly loading = signal(true);
  readonly queryError = signal('');
  readonly product = signal<ProductDetail | null>(null);

  ngOnInit(): void {
    this.queryRef = this.productDetailGQL.watch({ id: this.id });

    this.queryRef.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((result) => {
      if (result.loading && !result.data?.product) {
        this.loading.set(true);
        this.cdr.markForCheck();
        return;
      }

      this.loading.set(false);

      if (result.errors?.length) {
        this.queryError.set(result.errors[0]?.message ?? 'Failed to load product.');
        this.cdr.markForCheck();
        return;
      }

      this.queryError.set('');
      this.product.set(result.data?.product ?? null);
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
    void this.queryRef.refetch({ id: this.id });
  }

  onReviewsChanged(): void {
    // Refetch product detail to pick up updated avgRating and reviewCount
    void this.queryRef.refetch({ id: this.id });
  }

  formatPrice(price: number): string {
    return '$' + price.toFixed(2);
  }

  ratingBars(p: ProductDetail): { stars: number; count: number; percent: number }[] {
    const dist = p.ratingDistribution;
    const total = p.reviewCount || 1;
    return [
      { stars: 5, count: dist.fiveStar, percent: Math.round((dist.fiveStar / total) * 100) },
      { stars: 4, count: dist.fourStar, percent: Math.round((dist.fourStar / total) * 100) },
      { stars: 3, count: dist.threeStar, percent: Math.round((dist.threeStar / total) * 100) },
      { stars: 2, count: dist.twoStar, percent: Math.round((dist.twoStar / total) * 100) },
      { stars: 1, count: dist.oneStar, percent: Math.round((dist.oneStar / total) * 100) },
    ];
  }
}
