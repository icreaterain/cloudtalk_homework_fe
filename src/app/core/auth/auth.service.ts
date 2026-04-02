import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError, EMPTY } from 'rxjs';
import {
  ApiResponse,
  AuthUser,
  LoginRequest,
  RegisterRequest,
  TokenResponse,
} from '../../shared/models/auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly apiUrl = this.resolveApiUrl();

  private readonly _accessToken = signal<string | null>(null);
  private readonly _currentUser = signal<AuthUser | null>(null);

  readonly isLoggedIn = computed(() => this._accessToken() !== null);
  readonly currentUser = computed(() => this._currentUser());
  readonly accessToken = computed(() => this._accessToken());

  constructor() {
    effect(() => {
      const token = this._accessToken();
      if (token !== null) {
        sessionStorage.setItem('at', token);
      } else {
        sessionStorage.removeItem('at');
      }
    });
  }

  initFromSession(): void {
    const stored = sessionStorage.getItem('at');
    if (stored) {
      this._accessToken.set(stored);
    }
  }

  login(credentials: LoginRequest): Observable<ApiResponse<TokenResponse>> {
    return this.http
      .post<ApiResponse<TokenResponse>>(`${this.apiUrl}/auth/login`, credentials, {
        withCredentials: true,
      })
      .pipe(
        tap(({ data }) => {
          this._accessToken.set(data.accessToken);
          this._currentUser.set(data.user);
        }),
      );
  }

  register(payload: RegisterRequest): Observable<ApiResponse<TokenResponse>> {
    return this.http
      .post<ApiResponse<TokenResponse>>(`${this.apiUrl}/auth/register`, payload, {
        withCredentials: true,
      })
      .pipe(
        tap(({ data }) => {
          this._accessToken.set(data.accessToken);
          this._currentUser.set(data.user);
        }),
      );
  }

  refresh(): Observable<ApiResponse<TokenResponse>> {
    return this.http
      .post<
        ApiResponse<TokenResponse>
      >(`${this.apiUrl}/auth/refresh`, {}, { withCredentials: true })
      .pipe(
        tap(({ data }) => {
          this._accessToken.set(data.accessToken);
          this._currentUser.set(data.user);
        }),
        catchError(() => {
          this.clearSession();
          return EMPTY;
        }),
      );
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/auth/logout`, {}, { withCredentials: true }).pipe(
      tap(() => {
        this.clearSession();
        void this.router.navigate(['/auth/login']);
      }),
      catchError((err: unknown) => {
        this.clearSession();
        void this.router.navigate(['/auth/login']);
        return throwError(() => err);
      }),
    );
  }

  setTokens(accessToken: string, user: AuthUser): void {
    this._accessToken.set(accessToken);
    this._currentUser.set(user);
  }

  clearSession(): void {
    this._accessToken.set(null);
    this._currentUser.set(null);
    sessionStorage.removeItem('at');
  }

  private resolveApiUrl(): string {
    return (
      (window as Window & { __env?: { API_URL?: string } }).__env?.API_URL ??
      'http://localhost:3000/api'
    );
  }
}
