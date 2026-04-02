import { TimeAgoPipe } from './time-ago.pipe';

const now = new Date('2024-06-15T12:00:00.000Z');

const dateSecondsAgo = (seconds: number): Date => new Date(now.getTime() - seconds * 1000);

describe('TimeAgoPipe', () => {
  let pipe: TimeAgoPipe;

  beforeEach(() => {
    pipe = new TimeAgoPipe();
    jest.useFakeTimers();
    jest.setSystemTime(now);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates an instance', () => {
    expect(pipe).toBeTruthy();
  });

  describe('just now (< 60 seconds)', () => {
    it('returns "just now" for 0 seconds ago', () => {
      expect(pipe.transform(dateSecondsAgo(0))).toBe('just now');
    });

    it('returns "just now" for 59 seconds ago', () => {
      expect(pipe.transform(dateSecondsAgo(59))).toBe('just now');
    });
  });

  describe('minutes (60s – 59m)', () => {
    it('returns "1m ago" for 60 seconds ago', () => {
      expect(pipe.transform(dateSecondsAgo(60))).toBe('1m ago');
    });

    it('returns "30m ago" for 30 minutes ago', () => {
      expect(pipe.transform(dateSecondsAgo(30 * 60))).toBe('30m ago');
    });

    it('returns "59m ago" just before 1 hour', () => {
      expect(pipe.transform(dateSecondsAgo(59 * 60))).toBe('59m ago');
    });
  });

  describe('hours (1h – 23h)', () => {
    it('returns "1h ago" for exactly 1 hour ago', () => {
      expect(pipe.transform(dateSecondsAgo(3600))).toBe('1h ago');
    });

    it('returns "12h ago" for 12 hours ago', () => {
      expect(pipe.transform(dateSecondsAgo(12 * 3600))).toBe('12h ago');
    });

    it('returns "23h ago" just before 1 day', () => {
      expect(pipe.transform(dateSecondsAgo(23 * 3600))).toBe('23h ago');
    });
  });

  describe('days (1d – 6d)', () => {
    it('returns "1d ago" for exactly 1 day ago', () => {
      expect(pipe.transform(dateSecondsAgo(86400))).toBe('1d ago');
    });

    it('returns "6d ago" just before 1 week', () => {
      expect(pipe.transform(dateSecondsAgo(6 * 86400))).toBe('6d ago');
    });
  });

  describe('weeks (1w – 4w)', () => {
    it('returns "1w ago" for exactly 1 week ago', () => {
      expect(pipe.transform(dateSecondsAgo(7 * 86400))).toBe('1w ago');
    });

    it('returns "4w ago" just before 5 weeks', () => {
      expect(pipe.transform(dateSecondsAgo(34 * 86400))).toBe('4w ago');
    });
  });

  describe('months (1mo – 11mo)', () => {
    it('returns "1mo ago" for 35 days ago', () => {
      expect(pipe.transform(dateSecondsAgo(35 * 86400))).toBe('1mo ago');
    });

    it('returns "11mo ago" for 330 days ago', () => {
      // 330 days → diffMonths=11 (< 12), diffYears=0 → "11mo ago"
      expect(pipe.transform(dateSecondsAgo(330 * 86400))).toBe('11mo ago');
    });
  });

  describe('years (1y+)', () => {
    it('returns "1y ago" for exactly 365 days ago', () => {
      expect(pipe.transform(dateSecondsAgo(365 * 86400))).toBe('1y ago');
    });

    it('returns "3y ago" for 3 years ago', () => {
      expect(pipe.transform(dateSecondsAgo(3 * 365 * 86400))).toBe('3y ago');
    });
  });

  describe('accepts a string input', () => {
    it('parses an ISO string the same as a Date object', () => {
      const date = dateSecondsAgo(3600);
      expect(pipe.transform(date.toISOString())).toBe(pipe.transform(date));
    });
  });
});
