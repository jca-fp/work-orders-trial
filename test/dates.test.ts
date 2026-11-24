import { describe, expect, it } from 'vitest';
import { formatDueDate } from '../src/dates.js';
import { BUSINESS_TIME_ZONE, todayIn } from '../src/dates.js';

describe('formatDueDate', () => {
  it('formats a calendar date the same way in every time zone', () => {
    expect(formatDueDate('2026-03-09')).toBe('Mar 9, 2026');
    expect(formatDueDate('2026-01-01')).toBe('Jan 1, 2026');
    expect(formatDueDate('2026-12-31')).toBe('Dec 31, 2026');
  });

  it('rejects anything that is not a calendar date', () => {
    expect(() => formatDueDate('09/03/2026')).toThrow();
    expect(() => formatDueDate('2026-13-01')).toThrow();
  });
});

describe('todayIn', () => {
  it('takes the date in New York, not in the machine time zone', () => {
    // 22:00 on Nov 24 in New York; already Nov 25 in UTC and in Tokyo.
    expect(todayIn('America/New_York', new Date('2026-11-25T03:00:00Z'))).toBe('2026-11-24');
    // Midnight has passed in New York.
    expect(todayIn('America/New_York', new Date('2026-11-25T05:00:00Z'))).toBe('2026-11-25');
  });

  it('follows summer time in New York', () => {
    // 23:59 on Jun 30 in New York (UTC-4).
    expect(todayIn('America/New_York', new Date('2026-07-01T03:59:00Z'))).toBe('2026-06-30');
    expect(todayIn('America/New_York', new Date('2026-07-01T04:00:00Z'))).toBe('2026-07-01');
  });

  it('uses New York as the business time zone', () => {
    expect(BUSINESS_TIME_ZONE).toBe('America/New_York');
  });
});
