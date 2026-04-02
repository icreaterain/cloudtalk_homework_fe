import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { RegisterComponent } from './register.component';
import { AuthService } from '../../core/auth/auth.service';

const mockTokenResponse = {
  data: {
    accessToken: 'tok',
    user: { id: 'u1', email: 'new@test.com', displayName: 'New User', role: 'user' },
  },
};

describe('RegisterComponent', () => {
  let fixture: ComponentFixture<RegisterComponent>;
  let component: RegisterComponent;
  let mockAuthService: { register: jest.Mock };
  let router: Router;

  beforeEach(async () => {
    mockAuthService = { register: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    jest.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(RegisterComponent);
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
    expect(component.displayNameControl.touched).toBe(true);
    expect(component.emailControl.touched).toBe(true);
    expect(component.passwordControl.touched).toBe(true);
  });

  it('does not call AuthService when form is invalid', () => {
    component.submit();
    expect(mockAuthService.register).not.toHaveBeenCalled();
  });

  it('calls AuthService.register with form values on valid submit', fakeAsync(() => {
    mockAuthService.register.mockReturnValue(of(mockTokenResponse));
    component.form.setValue({
      displayName: 'Jane Smith',
      email: 'jane@test.com',
      password: 'password123',
    });

    component.submit();
    tick();

    expect(mockAuthService.register).toHaveBeenCalledWith({
      displayName: 'Jane Smith',
      email: 'jane@test.com',
      password: 'password123',
    });
  }));

  it('navigates to /products after successful registration', fakeAsync(() => {
    mockAuthService.register.mockReturnValue(of(mockTokenResponse));
    component.form.setValue({
      displayName: 'Jane Smith',
      email: 'jane@test.com',
      password: 'password123',
    });

    component.submit();
    tick();

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(router.navigate).toHaveBeenCalledWith(['/products']);
  }));

  it('sets errorMessage from the API error envelope for duplicate email', fakeAsync(() => {
    mockAuthService.register.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            error: { error: { message: 'Email already taken' } },
            status: 409,
          }),
      ),
    );
    component.form.setValue({
      displayName: 'Jane',
      email: 'taken@test.com',
      password: 'password123',
    });

    component.submit();
    tick();

    expect(component.errorMessage()).toBe('Email already taken');
  }));

  it('sets a fallback errorMessage when error has no message', fakeAsync(() => {
    mockAuthService.register.mockReturnValue(
      throwError(() => new HttpErrorResponse({ error: {}, status: 500 })),
    );
    component.form.setValue({
      displayName: 'Jane',
      email: 'jane@test.com',
      password: 'password123',
    });

    component.submit();
    tick();

    expect(component.errorMessage()).toBe('Registration failed. Please try again.');
  }));

  it('resets isLoading to false after success', fakeAsync(() => {
    mockAuthService.register.mockReturnValue(of(mockTokenResponse));
    component.form.setValue({
      displayName: 'Jane',
      email: 'jane@test.com',
      password: 'password123',
    });

    component.submit();
    tick();

    expect(component.isLoading()).toBe(false);
  }));

  it('resets isLoading to false after failure', fakeAsync(() => {
    mockAuthService.register.mockReturnValue(
      throwError(() => new HttpErrorResponse({ error: {}, status: 409 })),
    );
    component.form.setValue({
      displayName: 'Jane',
      email: 'jane@test.com',
      password: 'password123',
    });

    component.submit();
    tick();

    expect(component.isLoading()).toBe(false);
  }));
});
