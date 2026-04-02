import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { StarRatingComponent } from '../../shared/components/star-rating/star-rating.component';
import { ErrorMessageComponent } from '../../shared/components/error-message.component';
import { ReviewCommandService } from './review-command.service';

export interface ReviewFormData {
  id: string;
  rating: number;
  title?: string | null;
  body: string;
}

@Component({
  selector: 'app-review-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, StarRatingComponent, ErrorMessageComponent],
  template: `
    <div class="bg-white rounded-lg border border-gray-200 p-5">
      <h2 class="text-base font-semibold text-gray-900 mb-4">
        {{ isEditMode ? 'Edit your review' : 'Write a review' }}
      </h2>
      <form [formGroup]="form" (ngSubmit)="submit()">
        <!-- Rating -->
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Your rating <span class="text-red-500" aria-hidden="true">*</span>
          </label>
          <app-star-rating
            [rating]="form.controls.rating.value"
            [readonly]="false"
            size="lg"
            (ratingChange)="onRatingChange($event)"
          />
          @if (form.controls.rating.touched && form.controls.rating.invalid) {
            <p class="mt-1 text-xs text-red-600" role="alert">Please select a rating.</p>
          }
        </div>

        <!-- Title -->
        <div class="mb-4">
          <label for="review-title" class="label">
            Title <span class="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            id="review-title"
            type="text"
            formControlName="title"
            class="input"
            placeholder="Summarise your experience"
            maxlength="200"
          />
          @if (form.controls.title.invalid && form.controls.title.touched) {
            <p class="mt-1 text-xs text-red-600" role="alert">
              Title is too long (max 200 characters).
            </p>
          }
        </div>

        <!-- Body -->
        <div class="mb-4">
          <label for="review-body" class="label">
            Review <span class="text-red-500" aria-hidden="true">*</span>
          </label>
          <textarea
            id="review-body"
            formControlName="body"
            rows="4"
            class="input resize-none"
            placeholder="Share your thoughts about this product..."
            maxlength="5000"
          ></textarea>
          @if (form.controls.body.touched) {
            @if (form.controls.body.hasError('required')) {
              <p class="mt-1 text-xs text-red-600" role="alert">Review text is required.</p>
            } @else if (form.controls.body.hasError('minlength')) {
              <p class="mt-1 text-xs text-red-600" role="alert">
                Review must be at least 10 characters.
              </p>
            }
          }
          <p class="mt-1 text-xs text-gray-400 text-right" aria-live="polite">
            {{ form.controls.body.value.length }} / 5000
          </p>
        </div>

        <!-- API error -->
        @if (error()) {
          <div class="mb-4">
            <app-error-message [message]="error()" />
          </div>
        }

        <!-- Actions -->
        <div class="flex items-center gap-3">
          <button type="submit" class="btn-primary" [disabled]="form.invalid || pending()">
            @if (pending()) {
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
            {{ isEditMode ? 'Update review' : 'Submit review' }}
          </button>
          <button type="button" class="btn-secondary" (click)="cancelled.emit()">Cancel</button>
        </div>
      </form>
    </div>
  `,
})
export class ReviewFormComponent implements OnInit {
  @Input() productId?: string;
  @Input() review?: ReviewFormData;
  @Output() readonly saved = new EventEmitter<void>();
  @Output() readonly cancelled = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly reviewCommandService = inject(ReviewCommandService);

  readonly pending = signal(false);
  readonly error = signal('');

  readonly form = this.fb.nonNullable.group({
    rating: [0, [Validators.required, Validators.min(1), Validators.max(5)]],
    title: ['', [Validators.maxLength(200)]],
    body: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(5000)]],
  });

  get isEditMode(): boolean {
    return !!this.review?.id;
  }

  ngOnInit(): void {
    if (this.review) {
      this.form.patchValue({
        rating: this.review.rating,
        title: this.review.title ?? '',
        body: this.review.body,
      });
    }
  }

  onRatingChange(rating: number): void {
    this.form.controls.rating.setValue(rating);
    this.form.controls.rating.markAsTouched();
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.pending()) return;

    const { rating, title, body } = this.form.getRawValue();
    const payload = { rating, title: title || undefined, body };

    this.pending.set(true);
    this.error.set('');

    const request$ = this.isEditMode
      ? this.reviewCommandService.updateReview(this.review!.id, payload)
      : this.reviewCommandService.createReview(this.productId!, payload);

    request$.subscribe({
      next: () => {
        this.pending.set(false);
        this.saved.emit();
      },
      error: (e: unknown) => {
        this.pending.set(false);
        this.error.set(this.extractError(e));
      },
    });
  }

  private extractError(e: unknown): string {
    if (e instanceof HttpErrorResponse) {
      const body = e.error as { error?: { message?: string; code?: string } } | null;
      if (body?.error?.code === 'DUPLICATE_REVIEW') {
        return 'You have already reviewed this product.';
      }
      return body?.error?.message ?? 'Something went wrong. Please try again.';
    }
    return 'Something went wrong. Please try again.';
  }
}
