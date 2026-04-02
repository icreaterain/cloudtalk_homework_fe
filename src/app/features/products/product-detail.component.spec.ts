import { TestBed, ComponentFixture, fakeAsync, tick } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { ProductDetailComponent } from './product-detail.component';
import { ProductDetailGQL } from '../../../generated/graphql';
import { AuthService } from '../../core/auth/auth.service';
import { ProductReviewsGQL } from '../../../generated/graphql';
import { ReviewCommandService } from '../reviews/review-command.service';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';

const makeProduct = (overrides = {}) => ({
  id: 'prod-1',
  name: 'Test Product',
  description: 'A fine product.',
  imageUrl: 'https://example.com/img.jpg',
  category: 'Electronics',
  price: 99.99,
  avgRating: 4.2,
  reviewCount: 10,
  ratingDistribution: {
    fiveStar: 5,
    fourStar: 3,
    threeStar: 1,
    twoStar: 0,
    oneStar: 1,
  },
  ...overrides,
});

type GqlResult = {
  loading: boolean;
  errors?: { message: string }[];
  data: { product: ReturnType<typeof makeProduct> | null };
};

const nativeText = (f: ComponentFixture<ProductDetailComponent>): string =>
  (f.nativeElement as HTMLElement).textContent ?? '';

describe('ProductDetailComponent', () => {
  let fixture: ComponentFixture<ProductDetailComponent>;
  let component: ProductDetailComponent;
  let data$: Subject<GqlResult>;

  const queryRefMock = { valueChanges: null as unknown, refetch: jest.fn() };
  const gqlMock = { watch: jest.fn() };

  const reviewsQueryRefMock = {
    valueChanges: new Subject(),
    refetch: jest.fn(),
    fetchMore: jest.fn(),
  };
  const reviewsGqlMock = { watch: jest.fn().mockReturnValue(reviewsQueryRefMock) };
  const commandMock = {
    deleteReview: jest.fn(),
    createReview: jest.fn(),
    updateReview: jest.fn(),
  };
  const authMock = {
    isLoggedIn: signal(false),
    currentUser: signal<{ id: string; email: string; displayName: string; role: string } | null>(
      null,
    ),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    data$ = new Subject<GqlResult>();
    queryRefMock.valueChanges = data$.asObservable();
    queryRefMock.refetch.mockResolvedValue(undefined);
    gqlMock.watch.mockReturnValue(queryRefMock);

    await TestBed.configureTestingModule({
      imports: [ProductDetailComponent],
      providers: [
        provideRouter([]),
        { provide: ProductDetailGQL, useValue: gqlMock },
        { provide: ProductReviewsGQL, useValue: reviewsGqlMock },
        { provide: ReviewCommandService, useValue: commandMock },
        { provide: AuthService, useValue: authMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductDetailComponent);
    component = fixture.componentInstance;
    component.id = 'prod-1';
    fixture.detectChanges();
  });

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('calls watch with the product id on init', () => {
    expect(gqlMock.watch).toHaveBeenCalledWith({ id: 'prod-1' });
  });

  it('renders product name after data arrives', fakeAsync(() => {
    data$.next({ loading: false, data: { product: makeProduct() } });
    tick();
    fixture.detectChanges();

    expect(nativeText(fixture)).toContain('Test Product');
  }));

  it('renders formatted price', fakeAsync(() => {
    data$.next({ loading: false, data: { product: makeProduct({ price: 49.5 }) } });
    tick();
    fixture.detectChanges();

    expect(nativeText(fixture)).toContain('$49.50');
  }));

  it('renders product description', fakeAsync(() => {
    data$.next({ loading: false, data: { product: makeProduct() } });
    tick();
    fixture.detectChanges();

    expect(nativeText(fixture)).toContain('A fine product.');
  }));

  it('sets loading = false after product data arrives', fakeAsync(() => {
    data$.next({ loading: false, data: { product: makeProduct() } });
    tick();
    expect(component.loading()).toBe(false);
  }));

  it('sets queryError on GQL errors', fakeAsync(() => {
    data$.next({ loading: false, errors: [{ message: 'Not found' }], data: { product: null } });
    tick();
    expect(component.queryError()).toBe('Not found');
  }));

  it('shows "Product not found" when product is null and no error', fakeAsync(() => {
    data$.next({ loading: false, data: { product: null } });
    tick();
    fixture.detectChanges();

    expect(nativeText(fixture)).toContain('Product not found');
  }));

  describe('formatPrice', () => {
    it('formats a price with two decimal places and $ prefix', () => {
      expect(component.formatPrice(9.9)).toBe('$9.90');
      expect(component.formatPrice(100)).toBe('$100.00');
    });
  });

  describe('ratingBars', () => {
    it('returns 5 bars ordered 5-star to 1-star', () => {
      const product = makeProduct();
      const bars = component.ratingBars(product as Parameters<typeof component.ratingBars>[0]);
      expect(bars.map((b) => b.stars)).toEqual([5, 4, 3, 2, 1]);
    });

    it('calculates percentages based on reviewCount', () => {
      const product = makeProduct({
        reviewCount: 10,
        ratingDistribution: { fiveStar: 5, fourStar: 3, threeStar: 1, twoStar: 0, oneStar: 1 },
      });
      const bars = component.ratingBars(product as Parameters<typeof component.ratingBars>[0]);
      expect(bars[0].percent).toBe(50);
      expect(bars[1].percent).toBe(30);
    });

    it('avoids division by zero when reviewCount is 0', () => {
      const product = makeProduct({
        reviewCount: 0,
        ratingDistribution: { fiveStar: 0, fourStar: 0, threeStar: 0, twoStar: 0, oneStar: 0 },
      });
      const bars = component.ratingBars(product as Parameters<typeof component.ratingBars>[0]);
      bars.forEach((b) => expect(b.percent).toBe(0));
    });
  });

  describe('onReviewsChanged', () => {
    it('calls refetch to update aggregates', () => {
      component.onReviewsChanged();
      expect(queryRefMock.refetch).toHaveBeenCalledWith({ id: 'prod-1' });
    });
  });

  describe('reload', () => {
    it('resets loading and error and calls refetch', () => {
      component.reload();
      expect(component.loading()).toBe(true);
      expect(component.queryError()).toBe('');
      expect(queryRefMock.refetch).toHaveBeenCalled();
    });
  });
});
