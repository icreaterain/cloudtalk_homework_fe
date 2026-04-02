import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  ApiReviewResponse,
  CreateReviewRequest,
  UpdateReviewRequest,
  ReviewResponse,
} from '../../shared/models/review.models';

@Injectable({ providedIn: 'root' })
export class ReviewCommandService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = this.resolveApiUrl();

  createReview(
    productId: string,
    payload: CreateReviewRequest,
  ): Observable<ApiReviewResponse<ReviewResponse>> {
    return this.http.post<ApiReviewResponse<ReviewResponse>>(
      `${this.apiUrl}/products/${productId}/reviews`,
      payload,
    );
  }

  updateReview(
    reviewId: string,
    payload: UpdateReviewRequest,
  ): Observable<ApiReviewResponse<ReviewResponse>> {
    return this.http.put<ApiReviewResponse<ReviewResponse>>(
      `${this.apiUrl}/reviews/${reviewId}`,
      payload,
    );
  }

  deleteReview(reviewId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/reviews/${reviewId}`);
  }

  private resolveApiUrl(): string {
    return (
      (window as Window & { __env?: { API_URL?: string } }).__env?.API_URL ??
      'http://localhost:3000/api'
    );
  }
}
