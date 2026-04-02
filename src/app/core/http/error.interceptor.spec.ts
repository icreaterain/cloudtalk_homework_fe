import { TestBed } from '@angular/core/testing';
import {
  HttpClient,
  HttpErrorResponse,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { errorInterceptor } from './error.interceptor';
import { AuthService } from '../auth/auth.service';

const mockTokenResponse = { data: { accessToken: 'new-token', user: null } };

describe('errorInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let mockAccessToken: ReturnType<typeof signal<string | null>>;
  let mockRefresh: jest.Mock;
  let mockClearSession: jest.Mock;

  beforeEach(() => {
    mockAccessToken = signal<string | null>(null);
    mockRefresh = jest.fn();
    mockClearSession = jest.fn();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: {
            accessToken: mockAccessToken,
            refresh: mockRefresh,
            clearSession: mockClearSession,
          },
        },
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('passes through non-401 errors without calling refresh', () => {
    let capturedError: HttpErrorResponse | undefined;

    httpClient.get('/api/products').subscribe({
      error: (e: HttpErrorResponse) => {
        capturedError = e;
      },
    });
    httpMock.expectOne('/api/products').flush({}, { status: 404, statusText: 'Not Found' });

    expect(capturedError?.status).toBe(404);
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it('passes through 500 errors without calling refresh', () => {
    let capturedError: HttpErrorResponse | undefined;

    httpClient.get('/api/products').subscribe({
      error: (e: HttpErrorResponse) => {
        capturedError = e;
      },
    });
    httpMock
      .expectOne('/api/products')
      .flush({}, { status: 500, statusText: 'Internal Server Error' });

    expect(capturedError?.status).toBe(500);
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it('does not attempt refresh for 401 responses from /auth/ endpoints', () => {
    let capturedError: HttpErrorResponse | undefined;

    httpClient.post('/api/auth/refresh', {}).subscribe({
      error: (e: HttpErrorResponse) => {
        capturedError = e;
      },
    });
    httpMock.expectOne('/api/auth/refresh').flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(capturedError?.status).toBe(401);
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it('calls refresh() on 401 and retries the original request with the new token', () => {
    const newToken = 'refreshed-token';
    mockRefresh.mockImplementation(() => {
      mockAccessToken.set(newToken);
      return of(mockTokenResponse);
    });

    let responseData: unknown;
    httpClient.get('/api/products').subscribe({
      next: (d) => {
        responseData = d;
      },
    });

    // First attempt: 401
    httpMock.expectOne('/api/products').flush({}, { status: 401, statusText: 'Unauthorized' });

    // refresh() was called; interceptor now retries with the new token
    const retryReq = httpMock.expectOne('/api/products');
    expect(retryReq.request.headers.get('Authorization')).toBe(`Bearer ${newToken}`);
    retryReq.flush({ data: 'products-list' });

    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(responseData).toEqual({ data: 'products-list' });
  });

  it('retries without Authorization header when no token is available after refresh', () => {
    mockRefresh.mockImplementation(() => {
      // token remains null
      return of(mockTokenResponse);
    });

    httpClient.get('/api/products').subscribe({ error: () => undefined, next: () => undefined });
    httpMock.expectOne('/api/products').flush({}, { status: 401, statusText: 'Unauthorized' });

    const retryReq = httpMock.expectOne('/api/products');
    expect(retryReq.request.headers.has('Authorization')).toBe(false);
    retryReq.flush({});
  });

  it('clears the session and propagates the error when refresh itself fails', () => {
    const refreshError = new Error('Refresh failed');
    mockRefresh.mockReturnValue(throwError(() => refreshError));

    let errorThrown: unknown;
    httpClient.get('/api/products').subscribe({
      error: (e: unknown) => {
        errorThrown = e;
      },
    });
    httpMock.expectOne('/api/products').flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(mockClearSession).toHaveBeenCalledTimes(1);
    expect(errorThrown).toBe(refreshError);
  });
});
