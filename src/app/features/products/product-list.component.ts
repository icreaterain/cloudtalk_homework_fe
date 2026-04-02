import { Component } from '@angular/core';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [],
  template: `
    <div class="max-w-7xl mx-auto px-4 py-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">Products</h1>
      <p class="text-gray-500 mb-8">Browse our catalog and read reviews.</p>
      <div class="flex items-center justify-center py-24 text-gray-400">
        <div class="text-center">
          <svg class="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            />
          </svg>
          <p class="text-lg font-medium">Product list coming in Phase 8</p>
        </div>
      </div>
    </div>
  `,
})
export class ProductListComponent {}
