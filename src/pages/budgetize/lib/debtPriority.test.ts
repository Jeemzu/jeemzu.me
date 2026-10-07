import { describe, expect, it } from 'vitest';
import { effectiveRate, rankDebtPriority } from './debtPriority';
import { debt } from '../testFixtures';

const asOf = new Date(2026, 9, 7);

describe('effectiveRate', () => {
  it('uses the current rate without a promotion', () => {
    const d = debt({ name: 'Card', minPaymentCents: 1, interestRateBps: 2500 });
    expect(effectiveRate(d, asOf)).toEqual({ effectiveRateBps: 2500, promoStatus: 'none', promoMonthsLeft: null });
  });

  it('keeps the promo rate while the promotion is far off', () => {
    const d = debt({
      name: 'Promo',
      minPaymentCents: 1,
      hasPromotion: true,
      interestRateBps: 0,
      promoEndISO: '2028-06-01',
      postPromoRateBps: 2800,
    });
    expect(effectiveRate(d, asOf).effectiveRateBps).toBe(0);
    expect(effectiveRate(d, asOf).promoStatus).toBe('active');
  });

  it('blends in the post-promo rate as the promotion nears its end', () => {
    const d = debt({
      name: 'Promo',
      minPaymentCents: 1,
      hasPromotion: true,
      interestRateBps: 0,
      promoEndISO: '2027-04-07',
      postPromoRateBps: 2800,
    });
    const rate = effectiveRate(d, asOf);
    expect(rate.promoStatus).toBe('ending-soon');
    expect(rate.promoMonthsLeft).toBe(6);
    expect(rate.effectiveRateBps).toBeGreaterThan(1300);
    expect(rate.effectiveRateBps).toBeLessThan(1500);
  });

  it('uses the post-promo rate once the promotion has expired', () => {
    const d = debt({
      name: 'Expired',
      minPaymentCents: 1,
      hasPromotion: true,
      interestRateBps: 0,
      promoEndISO: '2026-09-01',
      postPromoRateBps: 2800,
    });
    expect(effectiveRate(d, asOf)).toEqual({ effectiveRateBps: 2800, promoStatus: 'expired', promoMonthsLeft: null });
  });
});

describe('rankDebtPriority', () => {
  it('ranks highest interest rates first and paid-off debts last', () => {
    const debts = [
      debt({ name: 'Paid', minPaymentCents: 0, balanceCents: 0, interestRateBps: 3000 }),
      debt({ name: 'Big', minPaymentCents: 1, balanceCents: 10_000_00, interestRateBps: 2500 }),
      debt({ name: 'Small', minPaymentCents: 1, balanceCents: 1_000_00, interestRateBps: 2000 }),
      debt({
        name: 'Promo',
        minPaymentCents: 1,
        balanceCents: 500_00,
        hasPromotion: true,
        interestRateBps: 0,
        promoEndISO: '2028-06-01',
        postPromoRateBps: 2800,
      }),
      debt({
        name: 'Expired',
        minPaymentCents: 1,
        balanceCents: 3_000_00,
        hasPromotion: true,
        interestRateBps: 0,
        promoEndISO: '2026-01-01',
        postPromoRateBps: 2800,
      }),
    ];
    const ranks = rankDebtPriority(debts, asOf);
    const order = [...ranks.entries()].sort((a, b) => a[1].rank - b[1].rank).map(([id]) => id);
    expect(order).toEqual(['Expired', 'Big', 'Small', 'Promo', 'Paid']);
  });
});
