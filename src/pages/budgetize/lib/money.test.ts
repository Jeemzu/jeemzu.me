import { describe, expect, it } from 'vitest';
import { formatMoney, parseMoney } from './money';

describe('parseMoney', () => {
  it('parses plain numbers to cents', () => {
    expect(parseMoney(37.23)).toBe(3723);
    expect(parseMoney(3250)).toBe(325000);
    expect(parseMoney(0)).toBe(0);
  });

  it('rounds sub-cent precision (workbook formula values)', () => {
    expect(parseMoney(788.7868)).toBe(78879);
  });

  it('parses formatted strings', () => {
    expect(parseMoney('$1,234.56')).toBe(123456);
    expect(parseMoney(' 37.23 ')).toBe(3723);
    expect(parseMoney('.5')).toBe(50);
  });

  it('parses negative values (callers decide whether to allow them)', () => {
    expect(parseMoney('-5')).toBe(-500);
  });

  it('rejects non-numeric input', () => {
    expect(parseMoney('')).toBeNull();
    expect(parseMoney('abc')).toBeNull();
    expect(parseMoney('5/18/2027')).toBeNull();
    expect(parseMoney(null)).toBeNull();
    expect(parseMoney(undefined)).toBeNull();
    expect(parseMoney(Number.NaN)).toBeNull();
  });
});

describe('formatMoney', () => {
  it('formats cents as USD', () => {
    expect(formatMoney(123456)).toBe('$1,234.56');
    expect(formatMoney(0)).toBe('$0.00');
    expect(formatMoney(-45000)).toBe('-$450.00');
  });
});
