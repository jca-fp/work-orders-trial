import { describe, expect, it } from 'vitest';
import { formatDueDate } from '../src/dates.js';

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
