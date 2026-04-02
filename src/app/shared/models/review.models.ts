export interface CreateReviewRequest {
  rating: number;
  title?: string;
  body: string;
}

export interface UpdateReviewRequest {
  rating?: number;
  title?: string;
  body?: string;
}

export interface ReviewResponse {
  id: string;
  rating: number;
  title?: string;
  body: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiReviewResponse<T> {
  data: T;
}
