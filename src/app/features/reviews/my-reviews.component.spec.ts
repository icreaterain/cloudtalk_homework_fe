import { TestBed, ComponentFixture, fakeAsync, tick } from '@angular/core/testing';
import { Subject, of } from 'rxjs';
import { MyReviewsComponent } from './my-reviews.component';
import { MyReviewsGQL } from '../../../generated/graphql';
import { ReviewCommandService } from './review-command.service';
import { provideRouter } from '@angular/router';

const nativeText = (f: ComponentFixture<MyReviewsComponent>): string =>
  (f.nativeElement as HTMLElement).textContent ?? '';

const makeReviewEdge = (id: string, withProduct = true) => ({
  node: {
    id,
    rating: 5,
    title: `Title ${id}`,
    body: `Body for review ${id}`,
    createdAt: new Date().toISOString(),
    helpfulCount: 0,
    author: { id: 'user-1', displayName: 'Test User' },
    product: withProduct ? { id: 'prod-1', name: 'Test Product', imageUrl: null } : null,
  },
});

const makeMyReviewsData = (ids: string[], hasNextPage = false) => ({
  loading: false,
  errors: undefined as { message: string }[] | undefined,
  data: {
    myReviews: {
      pageInfo: { hasNextPage, endCursor: hasNextPage ? 'cursor-1' : null },
      edges: ids.map((id) => makeReviewEdge(id)),
    },
  },
});

type GqlResult = ReturnType<typeof makeMyReviewsData>;

describe('MyReviewsComponent', () => {
  let fixture: ComponentFixture<MyReviewsComponent>;
  let component: MyReviewsComponent;
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

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.spyOn(window, 'scrollTo').mockImplementation(jest.fn());
    data$ = new Subject<GqlResult>();
    queryRefMock.valueChanges = data$.asObservable();
    queryRefMock.refetch.mockResolvedValue(undefined);
    queryRefMock.fetchMore.mockResolvedValue(undefined);
    gqlMock.watch.mockReturnValue(queryRefMock);

    await TestBed.configureTestingModule({
      imports: [MyReviewsComponent],
      providers: [
        provideRouter([]),
        { provide: MyReviewsGQL, useValue: gqlMock },
        { provide: ReviewCommandService, useValue: commandMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MyReviewsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('calls watch on init', () => {
    expect(gqlMock.watch).toHaveBeenCalled();
  });

  it('renders review bodies after data arrives', fakeAsync(() => {
    data$.next(makeMyReviewsData(['rev-1', 'rev-2']));
    tick();
    fixture.detectChanges();

    const text = nativeText(fixture);
    expect(text).toContain('Body for review rev-1');
    expect(text).toContain('Body for review rev-2');
  }));

  it('sets loading = false after data arrives', fakeAsync(() => {
    data$.next(makeMyReviewsData(['rev-1']));
    tick();
    expect(component.loading()).toBe(false);
  }));

  it('sets queryError on GQL errors', fakeAsync(() => {
    data$.next({ ...makeMyReviewsData([]), errors: [{ message: 'Unauthorized' }] });
    tick();
    expect(component.queryError()).toBe('Unauthorized');
  }));

  it('shows empty state when there are no reviews', fakeAsync(() => {
    data$.next(makeMyReviewsData([]));
    tick();
    fixture.detectChanges();

    expect(nativeText(fixture)).toContain('No reviews yet');
  }));

  it('shows product name when review has a product', fakeAsync(() => {
    data$.next(makeMyReviewsData(['rev-1']));
    tick();
    fixture.detectChanges();

    expect(nativeText(fixture)).toContain('Test Product');
  }));

  describe('onEdit', () => {
    it('sets editingReview with correct shape', fakeAsync(() => {
      data$.next(makeMyReviewsData(['rev-1']));
      tick();
      const review = component.reviews()[0];
      component.onEdit(review);
      expect(component.editingReview()).toEqual({
        id: 'rev-1',
        rating: review.rating,
        title: review.title,
        body: review.body,
      });
    }));
  });

  describe('onFormSaved', () => {
    it('clears editingReview and reloads', fakeAsync(() => {
      data$.next(makeMyReviewsData(['rev-1']));
      tick();
      component.onEdit(component.reviews()[0]);
      expect(component.editingReview()).toBeDefined();

      component.onFormSaved();
      expect(component.editingReview()).toBeUndefined();
      expect(queryRefMock.refetch).toHaveBeenCalled();
    }));
  });

  describe('onDelete', () => {
    it('calls deleteReview and reloads on success', fakeAsync(() => {
      jest.spyOn(window, 'confirm').mockReturnValue(true);
      commandMock.deleteReview.mockReturnValue(of(undefined));

      component.onDelete('rev-1');
      tick();

      expect(commandMock.deleteReview).toHaveBeenCalledWith('rev-1');
      expect(queryRefMock.refetch).toHaveBeenCalled();
    }));

    it('does not call deleteReview when user cancels confirm', () => {
      jest.spyOn(window, 'confirm').mockReturnValue(false);
      component.onDelete('rev-1');
      expect(commandMock.deleteReview).not.toHaveBeenCalled();
    });
  });

  describe('onLoadMore', () => {
    it('calls fetchMore when hasNextPage is true', fakeAsync(() => {
      data$.next(makeMyReviewsData(['rev-1'], true));
      tick();
      component.onLoadMore();
      expect(queryRefMock.fetchMore).toHaveBeenCalled();
    }));

    it('does not call fetchMore when hasNextPage is false', fakeAsync(() => {
      data$.next(makeMyReviewsData(['rev-1'], false));
      tick();
      component.onLoadMore();
      expect(queryRefMock.fetchMore).not.toHaveBeenCalled();
    }));
  });

  describe('reload', () => {
    it('resets loading and error, then calls refetch', () => {
      component.reload();
      expect(component.loading()).toBe(true);
      expect(component.queryError()).toBe('');
      expect(queryRefMock.refetch).toHaveBeenCalled();
    });
  });
});
