import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { AuthUser, TokenResponse, ApiResponse } from '../../shared/models/auth.models';

const mockUser: AuthUser = {
  id: 'user-1',
  email: 'user@test.com',
  displayName: 'Test User',
  role: 'user',
};

const mockTokenResponse: ApiResponse<TokenResponse> = {
  data: { accessToken: 'test-access-token', user: mockUser },
};

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  const mockRouter = { navigate: jest.fn().mockResolvedValue(true) };

  beforeEach(() => {
    sessionStorage.clear();
    jest.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: mockRouter },
      ],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('initial state', () => {
    it('has isLoggedIn = false', () => {
      expect(service.isLoggedIn()).toBe(false);
    });

    it('has null accessToken', () => {
      expect(service.accessToken()).toBeNull();
    });

    it('has null currentUser', () => {
      expect(service.currentUser()).toBeNull();
    });
  });

  describe('initFromSession()', () => {
    it('restores the access token from sessionStorage', () => {
      sessionStorage.setItem('at', 'stored-token');
      service.initFromSession();

      expect(service.isLoggedIn()).toBe(true);
      expect(service.accessToken()).toBe('stored-token');
    });

    it('leaves state unchanged when sessionStorage is empty', () => {
      service.initFromSession();

      expect(service.isLoggedIn()).toBe(false);
      expect(service.accessToken()).toBeNull();
    });
  });

  describe('setTokens()', () => {
    it('sets isLoggedIn to true', () => {
      service.setTokens('my-token', mockUser);

      expect(service.isLoggedIn()).toBe(true);
      expect(service.accessToken()).toBe('my-token');
      expect(service.currentUser()).toEqual(mockUser);
    });
  });

  describe('clearSession()', () => {
    it('resets all auth state to null', () => {
      service.setTokens('my-token', mockUser);
      expect(service.isLoggedIn()).toBe(true);

      service.clearSession();

      expect(service.isLoggedIn()).toBe(false);
      expect(service.accessToken()).toBeNull();
      expect(service.currentUser()).toBeNull();
    });

    it('removes the token from sessionStorage', () => {
      sessionStorage.setItem('at', 'old-token');
      service.clearSession();

      expect(sessionStorage.getItem('at')).toBeNull();
    });
  });

  describe('login()', () => {
    it('sets isLoggedIn to true and stores user on success', fakeAsync(() => {
      let resolved = false;
      service.login({ email: 'user@test.com', password: 'password' }).subscribe({
        next: () => {
          resolved = true;
        },
      });

      const req = httpMock.expectOne((r) => r.url.includes('/auth/login'));
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ email: 'user@test.com', password: 'password' });
      expect(req.request.withCredentials).toBe(true);
      req.flush(mockTokenResponse);
      tick();

      expect(resolved).toBe(true);
      expect(service.isLoggedIn()).toBe(true);
      expect(service.accessToken()).toBe('test-access-token');
      expect(service.currentUser()).toEqual(mockUser);
    }));

    it('does not change state on HTTP error', fakeAsync(() => {
      let errored = false;
      service.login({ email: 'user@test.com', password: 'wrong' }).subscribe({
        error: () => {
          errored = true;
        },
      });

      const req = httpMock.expectOne((r) => r.url.includes('/auth/login'));
      req.flush(
        { error: { code: 'UNAUTHORIZED', message: 'Invalid credentials', statusCode: 401 } },
        {
          status: 401,
          statusText: 'Unauthorized',
        },
      );
      tick();

      expect(errored).toBe(true);
      expect(service.isLoggedIn()).toBe(false);
    }));
  });

  describe('register()', () => {
    it('sets isLoggedIn to true and stores user on success', fakeAsync(() => {
      let resolved = false;
      service
        .register({ email: 'new@test.com', displayName: 'New User', password: 'pass12345' })
        .subscribe({
          next: () => {
            resolved = true;
          },
        });

      const req = httpMock.expectOne((r) => r.url.includes('/auth/register'));
      expect(req.request.method).toBe('POST');
      expect(req.request.withCredentials).toBe(true);
      req.flush(mockTokenResponse);
      tick();

      expect(resolved).toBe(true);
      expect(service.isLoggedIn()).toBe(true);
      expect(service.accessToken()).toBe('test-access-token');
      expect(service.currentUser()).toEqual(mockUser);
    }));
  });

  describe('logout()', () => {
    it('clears the session and navigates to /auth/login on success', fakeAsync(() => {
      service.setTokens('my-token', mockUser);
      expect(service.isLoggedIn()).toBe(true);

      service.logout().subscribe();

      const req = httpMock.expectOne((r) => r.url.includes('/auth/logout'));
      expect(req.request.method).toBe('POST');
      expect(req.request.withCredentials).toBe(true);
      req.flush(null);
      tick();

      expect(service.isLoggedIn()).toBe(false);
      expect(service.accessToken()).toBeNull();
      expect(service.currentUser()).toBeNull();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login']);
    }));

    it('still clears the session even when the request fails', fakeAsync(() => {
      service.setTokens('my-token', mockUser);

      let errored = false;
      service.logout().subscribe({
        error: () => {
          errored = true;
        },
      });

      const req = httpMock.expectOne((r) => r.url.includes('/auth/logout'));
      req.flush(
        { error: { code: 'INTERNAL_ERROR', message: 'Server error', statusCode: 500 } },
        { status: 500, statusText: 'Internal Server Error' },
      );
      tick();

      expect(errored).toBe(true);
      expect(service.isLoggedIn()).toBe(false);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login']);
    }));
  });

  describe('refresh()', () => {
    it('updates the access token and user on success', fakeAsync(() => {
      const refreshedUser: AuthUser = { ...mockUser, displayName: 'Updated Name' };
      const refreshResponse: ApiResponse<TokenResponse> = {
        data: { accessToken: 'refreshed-token', user: refreshedUser },
      };

      service.refresh().subscribe();

      const req = httpMock.expectOne((r) => r.url.includes('/auth/refresh'));
      expect(req.request.method).toBe('POST');
      expect(req.request.withCredentials).toBe(true);
      req.flush(refreshResponse);
      tick();

      expect(service.accessToken()).toBe('refreshed-token');
      expect(service.currentUser()).toEqual(refreshedUser);
    }));

    it('clears the session when refresh fails', fakeAsync(() => {
      service.setTokens('expired-token', mockUser);

      service.refresh().subscribe();

      const req = httpMock.expectOne((r) => r.url.includes('/auth/refresh'));
      req.flush(
        { error: { code: 'UNAUTHORIZED', message: 'Refresh token expired', statusCode: 401 } },
        {
          status: 401,
          statusText: 'Unauthorized',
        },
      );
      tick();

      expect(service.isLoggedIn()).toBe(false);
      expect(service.accessToken()).toBeNull();
    }));
  });
});
