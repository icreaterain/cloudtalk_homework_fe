import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ReviewCommandService } from './review-command.service';

describe('ReviewCommandService', () => {
  let service: ReviewCommandService;
  let httpMock: HttpTestingController;

  const apiUrl = 'http://localhost:3000/api';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), ReviewCommandService],
    });
    service = TestBed.inject(ReviewCommandService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('createReview', () => {
    it('POSTs to /products/:productId/reviews', () => {
      const payload = { rating: 5, body: 'Excellent product.' };
      service.createReview('prod-1', payload).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/products/prod-1/reviews`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(payload);
      req.flush({
        data: {
          id: 'rev-1',
          rating: 5,
          body: 'Excellent product.',
          status: 'published',
          createdAt: '',
          updatedAt: '',
        },
      });
    });

    it('returns the response data', () => {
      const response = {
        data: {
          id: 'rev-2',
          rating: 3,
          body: 'OK.',
          status: 'published',
          createdAt: '',
          updatedAt: '',
        },
      };
      let result: unknown;
      service.createReview('prod-1', { rating: 3, body: 'OK.' }).subscribe((r) => (result = r));

      httpMock.expectOne(`${apiUrl}/products/prod-1/reviews`).flush(response);
      expect(result).toEqual(response);
    });
  });

  describe('updateReview', () => {
    it('PUTs to /reviews/:reviewId', () => {
      const payload = { rating: 4 };
      service.updateReview('rev-1', payload).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/reviews/rev-1`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(payload);
      req.flush({
        data: {
          id: 'rev-1',
          rating: 4,
          body: 'Good.',
          status: 'published',
          createdAt: '',
          updatedAt: '',
        },
      });
    });
  });

  describe('deleteReview', () => {
    it('DELETEs to /reviews/:reviewId', () => {
      service.deleteReview('rev-1').subscribe();

      const req = httpMock.expectOne(`${apiUrl}/reviews/rev-1`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null, { status: 204, statusText: 'No Content' });
    });
  });
});
