import { Component } from '@angular/core';

@Component({
  selector: 'app-my-reviews',
  standalone: true,
  imports: [],
  template: `
    <div class="max-w-7xl mx-auto px-4 py-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">My Reviews</h1>
      <p class="text-gray-500 mb-8">All reviews you have submitted.</p>
      <p class="text-gray-400">Full implementation coming in Phase 8.</p>
    </div>
  `,
})
export class MyReviewsComponent {}
