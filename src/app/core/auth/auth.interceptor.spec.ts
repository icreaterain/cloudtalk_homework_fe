import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

describe('authInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let mockAccessToken: ReturnType<typeof signal<string | null>>;

  beforeEach(() => {
    mockAccessToken = signal<string | null>(null);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: { accessToken: mockAccessToken },
        },
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('adds Authorization: Bearer header when a token is present', () => {
    mockAccessToken.set('my-access-token');

    httpClient.get('/api/products').subscribe();

    const req = httpMock.expectOne('/api/products');
    expect(req.request.headers.get('Authorization')).toBe('Bearer my-access-token');
    req.flush({});
  });

  it('does not add an Authorization header when token is null', () => {
    mockAccessToken.set(null);

    httpClient.get('/api/products').subscribe();

    const req = httpMock.expectOne('/api/products');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('passes through the request body and method unchanged', () => {
    mockAccessToken.set('tok');
    const body = { rating: 5, body: 'Great!' };

    httpClient.post('/api/products/1/reviews', body).subscribe();

    const req = httpMock.expectOne('/api/products/1/reviews');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({});
  });

  it('uses a fresh token value if it changes between requests', () => {
    mockAccessToken.set('token-v1');
    httpClient.get('/api/a').subscribe();
    httpMock.expectOne('/api/a').flush({});

    mockAccessToken.set('token-v2');
    httpClient.get('/api/b').subscribe();
    const req2 = httpMock.expectOne('/api/b');
    expect(req2.request.headers.get('Authorization')).toBe('Bearer token-v2');
    req2.flush({});
  });
});
