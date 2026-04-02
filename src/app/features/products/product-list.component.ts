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
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { QueryRef } from 'apollo-angular';
import {
  ProductListGQL,
  ProductListQuery,
  ProductListQueryVariables,
} from '../../../generated/graphql';
import { StarRatingComponent } from '../../shared/components/star-rating/star-rating.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner.component';
import { ErrorMessageComponent } from '../../shared/components/error-message.component';
import { PaginationComponent } from '../../shared/components/pagination.component';

const PAGE_SIZE = 12;

type ProductNode = ProductListQuery['products']['edges'][number]['node'];

@Component({
  selector: 'app-product-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    FormsModule,
    StarRatingComponent,
    LoadingSpinnerComponent,
    ErrorMessageComponent,
    PaginationComponent,
  ],
  template: `
    <div class="max-w-7xl mx-auto px-4 py-8">
      <!-- Page header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">Products</h1>
        <p class="text-gray-500">Browse our catalog and read genuine customer reviews.</p>
      </div>

      <!-- Search + Filter bar -->
      <div class="flex flex-col sm:flex-row gap-3 mb-6">
        <div class="relative flex-1">
          <div
            class="pointer-events-none absolute inset-y-0 left-3 flex items-center"
            aria-hidden="true"
          >
            <svg
              class="h-4 w-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0"
              />
            </svg>
          </div>
          <input
            type="search"
            [(ngModel)]="searchQuery"
            (ngModelChange)="onSearchChange($event)"
            class="input pl-9"
            placeholder="Search products..."
            aria-label="Search products"
          />
        </div>
        @if (categories().length > 1) {
          <select
            [(ngModel)]="selectedCategory"
            (ngModelChange)="onCategoryChange($event)"
            class="input sm:w-48 pr-8"
            aria-label="Filter by category"
          >
            <option value="">All categories</option>
            @for (cat of categories(); track cat) {
              <option [value]="cat">{{ cat }}</option>
            }
          </select>
        }
      </div>

      <!-- Loading state (initial) -->
      @if (loading() && !products().length) {
        <app-loading-spinner size="lg" label="Loading products..." [fullPage]="true" />
      }

      <!-- Error state -->
      @if (queryError()) {
        <app-error-message [message]="queryError()" [retryable]="true" (retry)="reload()" />
      }

      <!-- Empty state -->
      @if (!loading() && !queryError() && !products().length) {
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
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            />
          </svg>
          <p class="text-lg font-medium">No products found</p>
          @if (searchQuery || selectedCategory) {
            <p class="text-sm mt-2">
              Try adjusting your search or
              <button
                type="button"
                (click)="clearFilters()"
                class="text-primary-600 hover:underline"
              >
                clear filters
              </button>
            </p>
          }
        </div>
      }

      <!-- Product grid -->
      @if (products().length) {
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          @for (product of products(); track product.id; let i = $index) {
            <a
              [routerLink]="['/products', product.id]"
              class="card flex flex-col overflow-hidden group hover:shadow-md transition-shadow focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 rounded-lg"
              [attr.aria-label]="product.name"
            >
              <!-- Product image -->
              <div class="aspect-square bg-gray-100 overflow-hidden flex-shrink-0">
                @if (product.imageUrl) {
                  <img
                    [src]="product.imageUrl"
                    [alt]="product.name"
                    class="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    [attr.fetchpriority]="i < 4 ? 'high' : null"
                    [attr.loading]="i < 4 ? 'eager' : 'lazy'"
                  />
                } @else {
                  <div class="h-full w-full flex items-center justify-center">
                    <svg
                      class="h-16 w-16 text-gray-300"
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
              <div class="p-4 flex flex-col flex-1">
                @if (product.category) {
                  <span class="text-xs font-medium text-primary-600 uppercase tracking-wide mb-1">{{
                    product.category
                  }}</span>
                }
                <h2
                  class="text-sm font-semibold text-gray-900 mb-1 line-clamp-2 group-hover:text-primary-600 transition-colors"
                >
                  {{ product.name }}
                </h2>
                @if (product.description) {
                  <p class="text-xs text-gray-500 mb-3 line-clamp-2 flex-1">
                    {{ product.description }}
                  </p>
                } @else {
                  <div class="flex-1"></div>
                }
                <div
                  class="flex items-center justify-between mt-auto pt-3 border-t border-gray-100"
                >
                  <div>
                    <p class="text-lg font-bold text-gray-900">
                      {{ formatPrice(product.price) }}
                    </p>
                    <div class="flex items-center gap-1.5 mt-0.5">
                      <app-star-rating [rating]="product.avgRating" [readonly]="true" size="sm" />
                      <span class="text-xs text-gray-500">
                        {{ product.avgRating.toFixed(1) }}
                        @if (product.reviewCount > 0) {
                          ({{ product.reviewCount }})
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </a>
          }
        </div>

        <!-- Load more -->
        <div class="mt-8">
          <app-pagination
            [shown]="products().length"
            [totalCount]="totalCount()"
            [hasNextPage]="hasNextPage()"
            [loading]="loadingMore()"
            (loadMore)="onLoadMore()"
          />
        </div>
      }
    </div>
  `,
})
export class ProductListComponent implements OnInit, OnDestroy {
  private readonly productListGQL = inject(ProductListGQL);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroy$ = new Subject<void>();
  private readonly search$ = new Subject<string>();

  private queryRef!: QueryRef<ProductListQuery, ProductListQueryVariables>;

  searchQuery = '';
  selectedCategory = '';

  readonly loading = signal(true);
  readonly loadingMore = signal(false);
  readonly queryError = signal('');
  readonly products = signal<ProductNode[]>([]);
  readonly totalCount = signal(0);
  readonly hasNextPage = signal(false);
  readonly endCursor = signal<string | null>(null);
  readonly categories = signal<string[]>([]);

  ngOnInit(): void {
    this.queryRef = this.productListGQL.watch({ first: PAGE_SIZE });

    this.queryRef.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((result) => {
      if (result.loading && !result.data?.products) {
        this.loading.set(true);
        this.cdr.markForCheck();
        return;
      }

      this.loading.set(false);
      this.loadingMore.set(false);

      if (result.errors?.length) {
        this.queryError.set(result.errors[0]?.message ?? 'Failed to load products.');
        this.cdr.markForCheck();
        return;
      }

      this.queryError.set('');
      const data = result.data?.products;
      if (data) {
        const nodes = data.edges.map((e) => e.node);
        this.products.set(nodes);
        this.totalCount.set(data.totalCount);
        this.hasNextPage.set(data.pageInfo.hasNextPage);
        this.endCursor.set(data.pageInfo.endCursor ?? null);
        this.updateCategories(nodes);
      }

      this.cdr.markForCheck();
    });

    // Debounce search input
    this.search$
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => this.reload());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearchChange(value: string): void {
    this.searchQuery = value;
    this.search$.next(value);
  }

  onCategoryChange(category: string): void {
    this.selectedCategory = category;
    this.reload();
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.selectedCategory = '';
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.queryError.set('');
    void this.queryRef.refetch({
      first: PAGE_SIZE,
      filter: this.buildFilter(),
    });
  }

  onLoadMore(): void {
    if (!this.hasNextPage() || this.loadingMore()) return;
    this.loadingMore.set(true);
    void this.queryRef.fetchMore({
      variables: {
        first: PAGE_SIZE,
        after: this.endCursor(),
        filter: this.buildFilter(),
      },
    });
  }

  formatPrice(price: number): string {
    return '$' + price.toFixed(2);
  }

  private buildFilter(): { search?: string; category?: string } | undefined {
    const search = this.searchQuery.trim() || undefined;
    const category = this.selectedCategory || undefined;
    return search || category ? { search, category } : undefined;
  }

  private updateCategories(nodes: ProductNode[]): void {
    const existing = new Set(this.categories());
    let changed = false;
    for (const node of nodes) {
      if (node.category && !existing.has(node.category)) {
        existing.add(node.category);
        changed = true;
      }
    }
    if (changed) {
      this.categories.set(Array.from(existing).sort());
    }
  }
}
