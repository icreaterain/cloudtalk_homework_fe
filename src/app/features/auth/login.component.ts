import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="min-h-[80vh] flex items-center justify-center px-4">
      <div class="card p-8 w-full max-w-md">
        <h2 class="text-2xl font-bold text-gray-900 mb-2">Sign in</h2>
        <p class="text-gray-500 mb-8 text-sm">
          Don't have an account?
          <a routerLink="/auth/register" class="text-primary-600 hover:underline">Register</a>
        </p>
        <p class="text-gray-400">Login form coming in Phase 7.</p>
      </div>
    </div>
  `,
})
export class LoginComponent {}
