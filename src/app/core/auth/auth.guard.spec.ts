import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { signal } from '@angular/core';
import { authGuard } from './auth.guard';
import { AuthService } from './auth.service';

const makeRouterState = (url: string): RouterStateSnapshot =>
  ({ url }) as unknown as RouterStateSnapshot;

const makeRoute = (): ActivatedRouteSnapshot => ({}) as unknown as ActivatedRouteSnapshot;

describe('authGuard', () => {
  let mockIsLoggedIn: ReturnType<typeof signal<boolean>>;
  let mockCreateUrlTree: jest.Mock;

  beforeEach(() => {
    mockIsLoggedIn = signal(false);
    mockCreateUrlTree = jest.fn(
      (commands: unknown[], extras: unknown) => ({ commands, extras }) as unknown as UrlTree,
    );

    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: { isLoggedIn: mockIsLoggedIn },
        },
        {
          provide: Router,
          useValue: { createUrlTree: mockCreateUrlTree },
        },
      ],
    });
  });

  const run = (url = '/my-reviews') =>
    TestBed.runInInjectionContext(() => authGuard(makeRoute(), makeRouterState(url)));

  it('returns true when the user is logged in', () => {
    mockIsLoggedIn.set(true);
    expect(run()).toBe(true);
  });

  it('returns a UrlTree (redirect) when not logged in', () => {
    mockIsLoggedIn.set(false);
    const result = run('/my-reviews');
    expect(result).not.toBe(true);
    expect(mockCreateUrlTree).toHaveBeenCalledWith(
      ['/auth/login'],
      expect.objectContaining({ queryParams: { returnUrl: '/my-reviews' } }),
    );
  });

  it('includes the original url as returnUrl query param', () => {
    mockIsLoggedIn.set(false);
    void run('/products/123');
    expect(mockCreateUrlTree).toHaveBeenCalledWith(
      ['/auth/login'],
      expect.objectContaining({ queryParams: { returnUrl: '/products/123' } }),
    );
  });

  it('does not call createUrlTree when authenticated', () => {
    mockIsLoggedIn.set(true);
    void run('/my-reviews');
    expect(mockCreateUrlTree).not.toHaveBeenCalled();
  });
});
