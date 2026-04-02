import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  signal,
} from '@angular/core';

@Component({
  selector: 'app-star-rating',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="flex items-center gap-0.5"
      role="group"
      [attr.aria-label]="readonly ? 'Rating: ' + rating + ' out of 5 stars' : 'Select a rating'"
    >
      @for (star of stars; track star) {
        <button
          type="button"
          [class]="getStarClass(star)"
          [disabled]="readonly"
          [attr.aria-label]="'Rate ' + star + ' star' + (star > 1 ? 's' : '')"
          (mouseenter)="!readonly && hovered.set(star)"
          (mouseleave)="!readonly && hovered.set(0)"
          (click)="!readonly && onSelect(star)"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            [class]="size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-7 w-7' : 'h-5 w-5'"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
            />
          </svg>
        </button>
      }
    </div>
  `,
})
export class StarRatingComponent {
  @Input() rating = 0;
  @Input() readonly = true;
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Output() ratingChange = new EventEmitter<number>();

  readonly stars = [1, 2, 3, 4, 5];
  readonly hovered = signal(0);

  getStarClass(star: number): string {
    const active = star <= (this.hovered() || this.rating);
    const base = 'transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 rounded';
    const color = active ? 'text-yellow-400' : 'text-gray-300';
    const cursor = this.readonly ? 'cursor-default' : 'cursor-pointer hover:text-yellow-400';
    return `${base} ${color} ${cursor}`;
  }

  onSelect(star: number): void {
    this.ratingChange.emit(star);
  }
}
