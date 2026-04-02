import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div class="card p-8 w-full max-w-md">
        <h1 class="text-2xl font-bold text-gray-900 mb-1">Sign in</h1>
        <p class="text-gray-500 mb-8 text-sm">
          Don't have an account?
          <a routerLink="/auth/register" class="text-primary-600 hover:underline font-medium">
            Register
          </a>
        </p>

        @if (errorMessage()) {
          <div
            class="rounded-md bg-red-50 border border-red-200 p-3 mb-6 text-sm text-red-800"
            role="alert"
          >
            {{ errorMessage() }}
          </div>
        }

        <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="space-y-5">
          <div>
            <label for="email" class="label">Email address</label>
            <input
              id="email"
              type="email"
              formControlName="email"
              class="input"
              [class.border-red-500]="emailControl.invalid && emailControl.touched"
              autocomplete="email"
              placeholder="you@example.com"
              aria-describedby="email-error"
            />
            @if (emailControl.invalid && emailControl.touched) {
              <p id="email-error" class="mt-1 text-xs text-red-600" role="alert">
                @if (emailControl.errors?.['required']) {
                  Email is required.
                } @else {
                  Enter a valid email address.
                }
              </p>
            }
          </div>

          <div>
            <label for="password" class="label">Password</label>
            <input
              id="password"
              type="password"
              formControlName="password"
              class="input"
              [class.border-red-500]="passwordControl.invalid && passwordControl.touched"
              autocomplete="current-password"
              placeholder="••••••••"
              aria-describedby="password-error"
            />
            @if (passwordControl.invalid && passwordControl.touched) {
              <p id="password-error" class="mt-1 text-xs text-red-600" role="alert">
                @if (passwordControl.errors?.['required']) {
                  Password is required.
                } @else {
                  Password must be at least 6 characters.
                }
              </p>
            }
          </div>

          <button type="submit" class="btn-primary w-full mt-2" [disabled]="isLoading()">
            @if (isLoading()) {
              <svg
                class="animate-spin h-4 w-4 mr-2"
                xmlns="http://www.w3.org/2000/svg"
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
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Signing in…
            } @else {
              Sign in
            }
          </button>
        </form>

        <p class="mt-6 text-xs text-gray-400 text-center">
          Demo: <span class="font-mono">user&#64;demo.com</span> /
          <span class="font-mono">password123</span>
        </p>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  get emailControl() {
    return this.form.controls.email;
  }
  get passwordControl() {
    return this.form.controls.password;
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.isLoading()) {
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const { email, password } = this.form.getRawValue();
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/products';

    this.authService
      .login({ email, password })
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: () => void this.router.navigateByUrl(returnUrl),
        error: (err: unknown) => {
          if (err instanceof HttpErrorResponse) {
            const body = err.error as { error?: { message?: string } };
            this.errorMessage.set(body?.error?.message ?? 'Invalid email or password.');
          } else {
            this.errorMessage.set('Login failed. Please try again.');
          }
        },
      });
  }
}
