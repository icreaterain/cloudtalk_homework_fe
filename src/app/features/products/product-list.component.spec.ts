import { TestBed, ComponentFixture, fakeAsync, tick } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { ProductListComponent } from './product-list.component';
import { ProductListGQL } from '../../../generated/graphql';
import { provideRouter } from '@angular/router';

const makeProductEdge = (id: string, category = 'Electronics') => ({
  node: {
    id,
    name: `Product ${id}`,
    description: 'A product.',
    imageUrl: null as string | null,
    category,
    price: 29.99,
    avgRating: 4.0,
    reviewCount: 5,
  },
});

type GqlResult = {
  loading: boolean;
  errors?: { message: string }[];
  data?: {
    products: {
      totalCount: number;
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
      edges: ReturnType<typeof makeProductEdge>[];
    };
  };
};

const makeProductsData = (
  ids: string[],
  hasNextPage = false,
  category = 'Electronics',
): GqlResult => ({
  loading: false,
  data: {
    products: {
      totalCount: ids.length,
      pageInfo: { hasNextPage, endCursor: hasNextPage ? 'cursor-end' : null },
      edges: ids.map((id) => makeProductEdge(id, category)),
    },
  },
});

const nativeText = (f: ComponentFixture<ProductListComponent>): string =>
  (f.nativeElement as HTMLElement).textContent ?? '';

describe('ProductListComponent', () => {
  let fixture: ComponentFixture<ProductListComponent>;
  let component: ProductListComponent;
  let data$: Subject<GqlResult>;

  const queryRefMock = {
    valueChanges: null as unknown,
    refetch: jest.fn(),
    fetchMore: jest.fn(),
  };
  const gqlMock = { watch: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    data$ = new Subject<GqlResult>();
    queryRefMock.valueChanges = data$.asObservable();
    queryRefMock.refetch.mockResolvedValue(undefined);
    queryRefMock.fetchMore.mockResolvedValue(undefined);
    gqlMock.watch.mockReturnValue(queryRefMock);

    await TestBed.configureTestingModule({
      imports: [ProductListComponent],
      providers: [provideRouter([]), { provide: ProductListGQL, useValue: gqlMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('calls watch on init', () => {
    expect(gqlMock.watch).toHaveBeenCalled();
  });

  it('renders product names after data arrives', fakeAsync(() => {
    data$.next(makeProductsData(['p1', 'p2']));
    tick();
    fixture.detectChanges();

    const text = nativeText(fixture);
    expect(text).toContain('Product p1');
    expect(text).toContain('Product p2');
  }));

  it('sets loading = false after data arrives', fakeAsync(() => {
    data$.next(makeProductsData(['p1']));
    tick();
    expect(component.loading()).toBe(false);
  }));

  it('sets queryError on GQL errors', fakeAsync(() => {
    data$.next({ loading: false, errors: [{ message: 'Network error' }] });
    tick();
    expect(component.queryError()).toBe('Network error');
  }));

  it('updates categories from product nodes', fakeAsync(() => {
    data$.next(makeProductsData(['p1', 'p2'], false, 'Books'));
    tick();
    expect(component.categories()).toContain('Books');
  }));

  it('accumulates unique categories across batches', fakeAsync(() => {
    data$.next(makeProductsData(['p1'], false, 'Electronics'));
    tick();
    data$.next(makeProductsData(['p2'], false, 'Books'));
    tick();
    expect(component.categories()).toContain('Electronics');
    expect(component.categories()).toContain('Books');
  }));

  it('sets hasNextPage from pageInfo', fakeAsync(() => {
    data$.next(makeProductsData(['p1'], true));
    tick();
    expect(component.hasNextPage()).toBe(true);
  }));

  describe('formatPrice', () => {
    it('formats price with $ prefix and two decimals', () => {
      expect(component.formatPrice(9.9)).toBe('$9.90');
      expect(component.formatPrice(100)).toBe('$100.00');
    });
  });

  describe('onLoadMore', () => {
    it('calls fetchMore when hasNextPage is true', fakeAsync(() => {
      data$.next(makeProductsData(['p1'], true));
      tick();
      component.onLoadMore();
      expect(queryRefMock.fetchMore).toHaveBeenCalled();
    }));

    it('does not call fetchMore when hasNextPage is false', fakeAsync(() => {
      data$.next(makeProductsData(['p1'], false));
      tick();
      component.onLoadMore();
      expect(queryRefMock.fetchMore).not.toHaveBeenCalled();
    }));

    it('does not call fetchMore again while already loading more', fakeAsync(() => {
      data$.next(makeProductsData(['p1'], true));
      tick();
      component.loadingMore.set(true);
      component.onLoadMore();
      expect(queryRefMock.fetchMore).not.toHaveBeenCalled();
    }));
  });

  describe('onSearchChange', () => {
    it('debounces search and calls refetch after delay', fakeAsync(() => {
      data$.next(makeProductsData(['p1']));
      tick();
      component.onSearchChange('notebook');
      tick(400);
      expect(queryRefMock.refetch).toHaveBeenCalled();
    }));
  });

  describe('onCategoryChange', () => {
    it('calls reload immediately', fakeAsync(() => {
      data$.next(makeProductsData(['p1']));
      tick();
      component.onCategoryChange('Books');
      expect(queryRefMock.refetch).toHaveBeenCalled();
      expect(component.selectedCategory).toBe('Books');
    }));
  });

  describe('clearFilters', () => {
    it('resets search and category and reloads', fakeAsync(() => {
      data$.next(makeProductsData(['p1']));
      tick();
      component.searchQuery = 'notebook';
      component.selectedCategory = 'Books';
      component.clearFilters();
      expect(component.searchQuery).toBe('');
      expect(component.selectedCategory).toBe('');
      expect(queryRefMock.refetch).toHaveBeenCalled();
    }));
  });
});
