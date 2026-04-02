import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StarRatingComponent } from './star-rating.component';

describe('StarRatingComponent', () => {
  let fixture: ComponentFixture<StarRatingComponent>;
  let component: StarRatingComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StarRatingComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(StarRatingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('renders 5 star buttons', () => {
    const el = fixture.nativeElement as HTMLElement;
    const buttons = el.querySelectorAll('button');
    expect(buttons.length).toBe(5);
  });

  describe('getStarClass', () => {
    it('returns yellow class for stars at or below the current rating', () => {
      component.rating = 3;
      component.readonly = true;
      const cls = component.getStarClass(3);
      expect(cls).toContain('text-yellow-400');
    });

    it('returns gray class for stars above the current rating', () => {
      component.rating = 3;
      component.readonly = true;
      const cls = component.getStarClass(4);
      expect(cls).toContain('text-gray-300');
    });

    it('returns yellow class for hovered star in interactive mode', () => {
      component.rating = 0;
      component.readonly = false;
      component.hovered.set(3);
      expect(component.getStarClass(2)).toContain('text-yellow-400');
      expect(component.getStarClass(4)).toContain('text-gray-300');
    });

    it('uses cursor-default for readonly mode', () => {
      component.readonly = true;
      expect(component.getStarClass(1)).toContain('cursor-default');
    });

    it('uses cursor-pointer for interactive mode', () => {
      component.readonly = false;
      expect(component.getStarClass(1)).toContain('cursor-pointer');
    });
  });

  describe('onSelect', () => {
    it('emits the selected star value', () => {
      const emitted: number[] = [];
      component.ratingChange.subscribe((v: number) => emitted.push(v));

      component.onSelect(4);

      expect(emitted).toEqual([4]);
    });

    it('emits each star value independently', () => {
      const emitted: number[] = [];
      component.ratingChange.subscribe((v: number) => emitted.push(v));

      component.onSelect(1);
      component.onSelect(5);

      expect(emitted).toEqual([1, 5]);
    });
  });

  describe('readonly mode', () => {
    it('buttons are disabled when readonly=true', () => {
      // default is true — already rendered by beforeEach detectChanges
      const el = fixture.nativeElement as HTMLElement;
      const buttons = el.querySelectorAll<HTMLButtonElement>('button');
      buttons.forEach((btn) => expect(btn.disabled).toBe(true));
    });

    it('buttons are not disabled when readonly=false', () => {
      // Use setInput so OnPush change detection is triggered
      fixture.componentRef.setInput('readonly', false);
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      const buttons = el.querySelectorAll<HTMLButtonElement>('button');
      buttons.forEach((btn) => expect(btn.disabled).toBe(false));
    });
  });
});
