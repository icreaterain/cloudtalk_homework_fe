import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { LoginComponent } from './login.component';
import { AuthService } from '../../core/auth/auth.service';

const mockTokenResponse = {
  data: {
    accessToken: 'tok',
    user: { id: 'u1', email: 'u@test.com', displayName: 'User', role: 'user' },
  },
};

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;
  let mockAuthService: { login: jest.Mock };
  let router: Router;

  beforeEach(async () => {
    mockAuthService = { login: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    jest.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('starts with an invalid form (empty fields)', () => {
    expect(component.form.invalid).toBe(true);
  });

  it('marks all controls as touched on invalid submit', () => {
    component.submit();
    expect(component.emailControl.touched).toBe(true);
    expect(component.passwordControl.touched).toBe(true);
  });

  it('does not call AuthService when form is invalid', () => {
    component.submit();
    expect(mockAuthService.login).not.toHaveBeenCalled();
  });

  it('calls AuthService.login with form values on valid submit', fakeAsync(() => {
    mockAuthService.login.mockReturnValue(of(mockTokenResponse));
    component.form.setValue({ email: 'user@test.com', password: 'password123' });

    component.submit();
    tick();

    expect(mockAuthService.login).toHaveBeenCalledWith({
      email: 'user@test.com',
      password: 'password123',
    });
  }));

  it('navigates to /products by default after successful login', fakeAsync(() => {
    mockAuthService.login.mockReturnValue(of(mockTokenResponse));
    component.form.setValue({ email: 'user@test.com', password: 'password123' });

    component.submit();
    tick();

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(router.navigateByUrl).toHaveBeenCalledWith('/products');
  }));

  it('navigates to the returnUrl when provided', fakeAsync(() => {
    // Patch the snapshot query param directly
    const route = (
      component as unknown as { route: { snapshot: { queryParamMap: { get: jest.Mock } } } }
    ).route;
    jest.spyOn(route.snapshot.queryParamMap, 'get').mockReturnValue('/my-reviews');

    mockAuthService.login.mockReturnValue(of(mockTokenResponse));
    component.form.setValue({ email: 'user@test.com', password: 'password123' });

    component.submit();
    tick();

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(router.navigateByUrl).toHaveBeenCalledWith('/my-reviews');
  }));

  it('sets errorMessage from the API error envelope on failure', fakeAsync(() => {
    mockAuthService.login.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            error: { error: { message: 'Invalid email or password' } },
            status: 401,
          }),
      ),
    );
    component.form.setValue({ email: 'bad@test.com', password: 'wrongpass' });

    component.submit();
    tick();

    expect(component.errorMessage()).toBe('Invalid email or password');
  }));

  it('sets a fallback errorMessage when API error has no message', fakeAsync(() => {
    mockAuthService.login.mockReturnValue(
      throwError(() => new HttpErrorResponse({ error: {}, status: 401 })),
    );
    component.form.setValue({ email: 'bad@test.com', password: 'wrongpass' });

    component.submit();
    tick();

    expect(component.errorMessage()).toBe('Invalid email or password.');
  }));

  it('resets isLoading to false after success', fakeAsync(() => {
    mockAuthService.login.mockReturnValue(of(mockTokenResponse));
    component.form.setValue({ email: 'user@test.com', password: 'password123' });

    component.submit();
    tick();

    expect(component.isLoading()).toBe(false);
  }));

  it('resets isLoading to false after failure', fakeAsync(() => {
    mockAuthService.login.mockReturnValue(
      throwError(() => new HttpErrorResponse({ error: {}, status: 401 })),
    );
    component.form.setValue({ email: 'bad@test.com', password: 'wrongpass' });

    component.submit();
    tick();

    expect(component.isLoading()).toBe(false);
  }));
});
