import { describe, expect, it } from 'vitest';
import { addMonths, daysInMonth, getPaydays, monthLabel } from './paydays';

describe('getPaydays', () => {
  it('finds 5 Wednesdays in September 2026', () => {
    expect(getPaydays(2026, 8)).toEqual([2, 9, 16, 23, 30]);
  });

  it('finds 4 Wednesdays in October 2026', () => {
    expect(getPaydays(2026, 9)).toEqual([7, 14, 21, 28]);
  });

  it('finds 5 Wednesdays in December 2026 (matches workbook paycheck count)', () => {
    expect(getPaydays(2026, 11)).toEqual([2, 9, 16, 23, 30]);
  });

  it('finds 4 Wednesdays in February 2027 (non-leap)', () => {
    expect(getPaydays(2027, 1)).toEqual([3, 10, 17, 24]);
  });

  it('finds 5 Wednesdays in June 2027 (30-day month)', () => {
    expect(getPaydays(2027, 5)).toEqual([2, 9, 16, 23, 30]);
  });

  it('always returns 4 or 5 actual Wednesdays', () => {
    for (let offset = 0; offset < 36; offset++) {
      const { year, month } = addMonths({ year: 2026, month: 0 }, offset);
      const paydays = getPaydays(year, month);
      expect(paydays.length).toBeGreaterThanOrEqual(4);
      expect(paydays.length).toBeLessThanOrEqual(5);
      for (const day of paydays) {
        expect(new Date(year, month, day).getDay()).toBe(3);
      }
      const inRange = paydays.every((d) => d >= 1 && d <= daysInMonth(year, month));
      expect(inRange).toBe(true);
    }
  });
});

describe('addMonths', () => {
  it('wraps year boundaries in both directions', () => {
    expect(addMonths({ year: 2026, month: 11 }, 1)).toEqual({ year: 2027, month: 0 });
    expect(addMonths({ year: 2026, month: 0 }, -1)).toEqual({ year: 2025, month: 11 });
  });
});

describe('monthLabel', () => {
  it('formats US-style month labels', () => {
    expect(monthLabel({ year: 2026, month: 8 })).toBe('September 2026');
  });
});
