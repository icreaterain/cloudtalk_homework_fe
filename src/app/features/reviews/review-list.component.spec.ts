import { TestBed, ComponentFixture, fakeAsync, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { signal } from '@angular/core';
import { Subject, of } from 'rxjs';
import { ReviewListComponent } from './review-list.component';
import { ProductReviewsGQL } from '../../../generated/graphql';
import { ReviewCommandService } from './review-command.service';
import { AuthService } from '../../core/auth/auth.service';
import { provideRouter } from '@angular/router';

const nativeText = (f: ComponentFixture<ReviewListComponent>): string =>
  (f.nativeElement as HTMLElement).textContent ?? '';

const makeReviewEdge = (id: string, userId: string) => ({
  node: {
    id,
    rating: 4,
    title: `Title ${id}`,
    body: `Body for review ${id}`,
    createdAt: new Date().toISOString(),
    helpfulCount: 0,
    author: { id: userId, displayName: 'Test User' },
  },
});

const makeProductReviewsData = (
  reviewIds: string[],
  userId = 'other-user',
  hasNextPage = false,
) => ({
  loading: false,
  errors: undefined as { message: string }[] | undefined,
  data: {
    product: {
      reviews: {
        totalCount: reviewIds.length,
        pageInfo: { hasNextPage, endCursor: hasNextPage ? 'cursor-1' : null },
        edges: reviewIds.map((id) => makeReviewEdge(id, userId)),
      },
    },
  },
});

type GqlResult = ReturnType<typeof makeProductReviewsData>;

describe('ReviewListComponent', () => {
  let fixture: ComponentFixture<ReviewListComponent>;
  let component: ReviewListComponent;
  let data$: Subject<GqlResult>;

  const queryRefMock = {
    valueChanges: null as unknown,
    refetch: jest.fn<Promise<void>, []>(),
    fetchMore: jest.fn<Promise<void>, []>(),
  };
  const gqlMock = { watch: jest.fn() };
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
    jest.spyOn(window, 'scrollTo').mockImplementation(jest.fn());
    data$ = new Subject<GqlResult>();
    queryRefMock.valueChanges = data$.asObservable();
    queryRefMock.refetch.mockResolvedValue(undefined);
    queryRefMock.fetchMore.mockResolvedValue(undefined);
    gqlMock.watch.mockReturnValue(queryRefMock);

    await TestBed.configureTestingModule({
      imports: [ReviewListComponent],
      providers: [
        provideRouter([]),
        { provide: ProductReviewsGQL, useValue: gqlMock },
        { provide: ReviewCommandService, useValue: commandMock },
        { provide: AuthService, useValue: authMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ReviewListComponent);
    component = fixture.componentInstance;
    component.productId = 'prod-1';
    fixture.detectChanges();
  });

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('calls watch with the productId on init', () => {
    expect(gqlMock.watch).toHaveBeenCalledWith(expect.objectContaining({ id: 'prod-1' }));
  });

  it('renders reviews when data arrives', fakeAsync(() => {
    data$.next(makeProductReviewsData(['rev-1', 'rev-2']));
    tick();
    fixture.detectChanges();

    const cards = fixture.debugElement.queryAll(By.css('app-review-card'));
    expect(cards.length).toBe(2);
  }));

  it('shows the total review count', fakeAsync(() => {
    data$.next(makeProductReviewsData(['rev-1']));
    tick();
    fixture.detectChanges();

    expect(nativeText(fixture)).toContain('1 Review');
  }));

  it('sets loading = false after data arrives', fakeAsync(() => {
    data$.next(makeProductReviewsData(['rev-1']));
    tick();
    expect(component.loading()).toBe(false);
  }));

  it('sets queryError when errors are present', fakeAsync(() => {
    data$.next({
      loading: false,
      errors: [{ message: 'GQL error' }],
      data: {
        product: {
          reviews: {
            totalCount: 0,
            pageInfo: { hasNextPage: false, endCursor: null },
            edges: [],
          },
        },
      },
    });
    tick();
    expect(component.queryError()).toBe('GQL error');
  }));

  it('sets hasNextPage from pageInfo', fakeAsync(() => {
    data$.next(makeProductReviewsData(['rev-1'], 'u', true));
    tick();
    expect(component.hasNextPage()).toBe(true);
  }));

  describe('onLoadMore', () => {
    it('calls fetchMore when hasNextPage is true', fakeAsync(() => {
      data$.next(makeProductReviewsData(['rev-1'], 'u', true));
      tick();
      component.onLoadMore();
      expect(queryRefMock.fetchMore).toHaveBeenCalled();
    }));

    it('does not call fetchMore when hasNextPage is false', fakeAsync(() => {
      data$.next(makeProductReviewsData(['rev-1'], 'u', false));
      tick();
      component.onLoadMore();
      expect(queryRefMock.fetchMore).not.toHaveBeenCalled();
    }));
  });

  describe('reload', () => {
    it('calls refetch with current filters', fakeAsync(() => {
      data$.next(makeProductReviewsData(['rev-1']));
      tick();
      component.reload();
      expect(queryRefMock.refetch).toHaveBeenCalledWith(expect.objectContaining({ id: 'prod-1' }));
    }));
  });

  describe('form visibility', () => {
    it('shows "Sign in" prompt for unauthenticated users', () => {
      expect(nativeText(fixture)).toContain('Sign in');
    });

    it('shows "Write a review" button for logged-in users without a review', fakeAsync(() => {
      authMock.isLoggedIn = signal(true);
      authMock.currentUser = signal({
        id: 'user-99',
        email: 'u@t.com',
        displayName: 'U',
        role: 'user',
      });

      data$.next(makeProductReviewsData([], 'other-user'));
      tick();
      fixture.detectChanges();

      expect(nativeText(fixture)).toContain('Write a review');
    }));
  });

  describe('onFormCancelled', () => {
    it('hides the form and clears editingReview', () => {
      component.showForm.set(true);
      component.editingReview.set({ id: 'rev-1', rating: 4, title: 'T', body: 'Body.' });
      component.onFormCancelled();
      expect(component.showForm()).toBe(false);
      expect(component.editingReview()).toBeUndefined();
    });
  });

  describe('onFormSaved', () => {
    it('hides the form, reloads data, and emits reviewsChanged', fakeAsync(() => {
      const changedSpy = jest.fn();
      component.reviewsChanged.subscribe(changedSpy);
      component.showForm.set(true);
      component.onFormSaved();
      tick();
      expect(component.showForm()).toBe(false);
      expect(queryRefMock.refetch).toHaveBeenCalled();
      expect(changedSpy).toHaveBeenCalled();
    }));
  });

  describe('onDelete', () => {
    it('calls deleteReview and emits reviewsChanged on success', fakeAsync(() => {
      jest.spyOn(window, 'confirm').mockReturnValue(true);
      commandMock.deleteReview.mockReturnValue(of(undefined));
      const changedSpy = jest.fn();
      component.reviewsChanged.subscribe(changedSpy);

      component.onDelete('rev-1');
      tick();

      expect(commandMock.deleteReview).toHaveBeenCalledWith('rev-1');
      expect(changedSpy).toHaveBeenCalled();
    }));

    it('does not call deleteReview if the user cancels the confirm dialog', () => {
      jest.spyOn(window, 'confirm').mockReturnValue(false);
      component.onDelete('rev-1');
      expect(commandMock.deleteReview).not.toHaveBeenCalled();
    });
  });
});
