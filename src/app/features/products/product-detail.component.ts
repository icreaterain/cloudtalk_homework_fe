import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="max-w-7xl mx-auto px-4 py-8">
      <a
        routerLink="/products"
        class="text-primary-600 hover:underline text-sm mb-6 inline-flex items-center gap-1"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Back to Products
      </a>
      <p class="text-gray-400 mt-4">Product detail for ID: {{ id }}</p>
      <p class="text-gray-400">Full implementation coming in Phase 8.</p>
    </div>
  `,
})
export class ProductDetailComponent {
  @Input() id!: string;
}
