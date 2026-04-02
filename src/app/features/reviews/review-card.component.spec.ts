import { TestBed, ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { signal } from '@angular/core';
import { ReviewCardComponent, ReviewCardData } from './review-card.component';
import { AuthService } from '../../core/auth/auth.service';

const makeReview = (overrides: Partial<ReviewCardData> = {}): ReviewCardData => ({
  id: 'rev-1',
  rating: 4,
  title: 'Great product',
  body: 'Really enjoyed using this.',
  createdAt: new Date(Date.now() - 60_000).toISOString(),
  helpfulCount: 3,
  author: { id: 'user-1', displayName: 'Alice Smith' },
  ...overrides,
});

const mockAuthService = (userId: string | undefined) => ({
  currentUser: signal(
    userId ? { id: userId, email: 'u@t.com', displayName: 'U', role: 'user' } : null,
  ),
  isLoggedIn: signal(userId !== undefined),
});

const nativeText = (f: ComponentFixture<ReviewCardComponent>): string =>
  (f.nativeElement as HTMLElement).textContent ?? '';

describe('ReviewCardComponent', () => {
  let fixture: ComponentFixture<ReviewCardComponent>;
  let component: ReviewCardComponent;

  function create(userId?: string, review: ReviewCardData = makeReview()): void {
    TestBed.configureTestingModule({
      imports: [ReviewCardComponent],
      providers: [{ provide: AuthService, useValue: mockAuthService(userId) }],
    });
    fixture = TestBed.createComponent(ReviewCardComponent);
    component = fixture.componentInstance;
    component.review = review;
    fixture.detectChanges();
  }

  it('renders the author display name', () => {
    create();
    expect(nativeText(fixture)).toContain('Alice Smith');
  });

  it('derives the initial from the first character of displayName', () => {
    create();
    expect(component.initial).toBe('A');
  });

  it('renders the review title when provided', () => {
    create();
    expect(nativeText(fixture)).toContain('Great product');
  });

  it('does not render a title element when title is null', () => {
    create(undefined, makeReview({ title: null }));
    const h3 = fixture.debugElement.query(By.css('h3'));
    expect(h3).toBeNull();
  });

  it('renders the review body', () => {
    create();
    expect(nativeText(fixture)).toContain('Really enjoyed using this.');
  });

  it('shows helpful count when greater than zero', () => {
    create();
    const text = nativeText(fixture);
    expect(text).toContain('3');
    expect(text).toContain('people found');
  });

  it('uses singular form for helpful count of 1', () => {
    create(undefined, makeReview({ helpfulCount: 1 }));
    expect(nativeText(fixture)).toContain('person found');
  });

  it('hides the helpful count section when count is 0', () => {
    create(undefined, makeReview({ helpfulCount: 0 }));
    expect(nativeText(fixture)).not.toContain('found this helpful');
  });

  describe('isOwner', () => {
    it('returns true when logged-in user is the review author', () => {
      create('user-1');
      expect(component.isOwner).toBe(true);
    });

    it('returns false when logged-in user is different', () => {
      create('user-2');
      expect(component.isOwner).toBe(false);
    });

    it('returns false when no user is logged in', () => {
      create(undefined);
      expect(component.isOwner).toBe(false);
    });
  });

  describe('edit/delete buttons', () => {
    it('shows edit and delete buttons for the review owner', () => {
      create('user-1');
      const buttons = fixture.debugElement.queryAll(By.css('button'));
      const labels = buttons.map((b) =>
        (b.nativeElement as HTMLButtonElement).getAttribute('aria-label'),
      );
      expect(labels).toContain('Edit review');
      expect(labels).toContain('Delete review');
    });

    it('hides edit and delete buttons for non-owners', () => {
      create('user-2');
      const buttons = fixture.debugElement.queryAll(By.css('button'));
      const labels = buttons.map((b) =>
        (b.nativeElement as HTMLButtonElement).getAttribute('aria-label'),
      );
      expect(labels).not.toContain('Edit review');
      expect(labels).not.toContain('Delete review');
    });

    it('emits the review on edit button click', () => {
      create('user-1');
      const editSpy = jest.fn();
      component.edit.subscribe(editSpy);
      const editBtn = fixture.debugElement.query(By.css('[aria-label="Edit review"]'));
      (editBtn.nativeElement as HTMLButtonElement).click();
      expect(editSpy).toHaveBeenCalledWith(component.review);
    });

    it('emits the review id on delete button click', () => {
      create('user-1');
      const deleteSpy = jest.fn();
      component.delete.subscribe(deleteSpy);
      const deleteBtn = fixture.debugElement.query(By.css('[aria-label="Delete review"]'));
      (deleteBtn.nativeElement as HTMLButtonElement).click();
      expect(deleteSpy).toHaveBeenCalledWith('rev-1');
    });
  });
});
