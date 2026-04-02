import { TestBed, ComponentFixture, fakeAsync, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { ReviewFormComponent, ReviewFormData } from './review-form.component';
import { ReviewCommandService } from './review-command.service';

const stubReviewResponse = {
  data: {
    id: 'rev-1',
    rating: 5,
    body: 'Great product!!!!',
    status: 'published',
    createdAt: '',
    updatedAt: '',
  },
};

const mockService = {
  createReview: jest.fn(),
  updateReview: jest.fn(),
  deleteReview: jest.fn(),
};

describe('ReviewFormComponent', () => {
  let fixture: ComponentFixture<ReviewFormComponent>;
  let component: ReviewFormComponent;

  beforeEach(async () => {
    jest.clearAllMocks();

    await TestBed.configureTestingModule({
      imports: [ReviewFormComponent],
      providers: [{ provide: ReviewCommandService, useValue: mockService }],
    }).compileComponents();

    fixture = TestBed.createComponent(ReviewFormComponent);
    component = fixture.componentInstance;
    component.productId = 'prod-1';
    fixture.detectChanges();
  });

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('starts in create mode when no review input is provided', () => {
    expect(component.isEditMode).toBe(false);
  });

  it('starts in edit mode when a review input is provided', () => {
    component.review = { id: 'rev-1', rating: 4, body: 'Nice.', title: null };
    expect(component.isEditMode).toBe(true);
  });

  it('patches the form with the provided review values on init', () => {
    const reviewData: ReviewFormData = {
      id: 'rev-1',
      rating: 3,
      title: 'Good',
      body: 'Pretty good product.',
    };
    component.review = reviewData;
    component.ngOnInit();
    fixture.detectChanges();

    expect(component.form.value).toMatchObject({
      rating: 3,
      title: 'Good',
      body: 'Pretty good product.',
    });
  });

  it('form is invalid when rating is 0', () => {
    component.form.controls.rating.setValue(0);
    component.form.controls.body.setValue('Long enough body here.');
    expect(component.form.invalid).toBe(true);
  });

  it('form is invalid when body is shorter than 10 characters', () => {
    component.form.controls.rating.setValue(5);
    component.form.controls.body.setValue('Short');
    expect(component.form.invalid).toBe(true);
  });

  it('form is valid with rating >= 1 and body >= 10 characters', () => {
    component.form.controls.rating.setValue(4);
    component.form.controls.body.setValue('This is a valid review body.');
    expect(component.form.valid).toBe(true);
  });

  it('onRatingChange updates the rating control and marks it touched', () => {
    component.onRatingChange(5);
    expect(component.form.controls.rating.value).toBe(5);
    expect(component.form.controls.rating.touched).toBe(true);
  });

  describe('submit – create mode', () => {
    beforeEach(() => {
      mockService.createReview.mockReturnValue(of(stubReviewResponse));
      component.form.controls.rating.setValue(5);
      component.form.controls.body.setValue('Excellent product for the price.');
    });

    it('calls createReview with correct productId and payload', fakeAsync(() => {
      component.submit();
      tick();
      expect(mockService.createReview).toHaveBeenCalledWith('prod-1', {
        rating: 5,
        title: undefined,
        body: 'Excellent product for the price.',
      });
    }));

    it('emits saved on success', fakeAsync(() => {
      const savedSpy = jest.fn();
      component.saved.subscribe(savedSpy);
      component.submit();
      tick();
      expect(savedSpy).toHaveBeenCalled();
    }));

    it('clears pending signal after success', fakeAsync(() => {
      component.submit();
      tick();
      expect(component.pending()).toBe(false);
    }));
  });

  describe('submit – edit mode', () => {
    beforeEach(() => {
      mockService.updateReview.mockReturnValue(of(stubReviewResponse));
      component.review = { id: 'rev-1', rating: 4, body: 'Old body text here.', title: null };
      component.ngOnInit();
      component.form.controls.rating.setValue(5);
      component.form.controls.body.setValue('Updated body text here.');
      fixture.detectChanges();
    });

    it('calls updateReview instead of createReview', fakeAsync(() => {
      component.submit();
      tick();
      expect(mockService.updateReview).toHaveBeenCalledWith(
        'rev-1',
        expect.objectContaining({ rating: 5 }),
      );
      expect(mockService.createReview).not.toHaveBeenCalled();
    }));
  });

  describe('error handling', () => {
    it('sets generic error message on HTTP error', fakeAsync(() => {
      mockService.createReview.mockReturnValue(
        throwError(
          () =>
            new HttpErrorResponse({ status: 500, error: { error: { message: 'Server error' } } }),
        ),
      );
      component.form.controls.rating.setValue(5);
      component.form.controls.body.setValue('Long enough body text here.');
      component.submit();
      tick();
      expect(component.error()).toBe('Server error');
    }));

    it('maps DUPLICATE_REVIEW code to friendly message', fakeAsync(() => {
      mockService.createReview.mockReturnValue(
        throwError(
          () =>
            new HttpErrorResponse({ status: 422, error: { error: { code: 'DUPLICATE_REVIEW' } } }),
        ),
      );
      component.form.controls.rating.setValue(5);
      component.form.controls.body.setValue('Long enough body text here.');
      component.submit();
      tick();
      expect(component.error()).toBe('You have already reviewed this product.');
    }));

    it('clears pending signal on error', fakeAsync(() => {
      mockService.createReview.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500 })),
      );
      component.form.controls.rating.setValue(5);
      component.form.controls.body.setValue('Long enough body text here.');
      component.submit();
      tick();
      expect(component.pending()).toBe(false);
    }));
  });

  describe('cancel button', () => {
    it('emits cancelled when cancel is clicked', () => {
      const emitSpy = jest.spyOn(component.cancelled, 'emit');
      fixture.detectChanges();
      // Find the Cancel button among all top-level buttons in the component template
      const allBtns = fixture.debugElement.queryAll(By.css('button'));
      const cancelBtn = allBtns.find(
        (b) => (b.nativeElement as HTMLButtonElement).textContent?.trim() === 'Cancel',
      );
      expect(cancelBtn).toBeTruthy();
      cancelBtn!.triggerEventHandler('click', null);
      expect(emitSpy).toHaveBeenCalled();
    });
  });

  describe('submit guard', () => {
    it('does not call service when form is invalid', () => {
      component.submit();
      expect(mockService.createReview).not.toHaveBeenCalled();
    });

    it('marks all controls as touched on invalid submit attempt', () => {
      component.submit();
      expect(component.form.controls.rating.touched).toBe(true);
      expect(component.form.controls.body.touched).toBe(true);
    });
  });
});
