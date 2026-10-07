import type { DebtAccount } from '../types';
import { parseISODate } from './recurrence';

/** Promotions ending within this many months start weighing their post-promo rate. */
export const PROMO_RAMP_MONTHS = 12;

const DAYS_PER_MONTH = 30.44;

export type PromoStatus = 'none' | 'active' | 'ending-soon' | 'expired';

export interface DebtPriority {
  /** 1 = pay down first; equal rates fall back to the smaller balance. */
  rank: number;
  /** Rate used for ranking, blending in the post-promo rate as a promotion nears its end. */
  effectiveRateBps: number;
  promoStatus: PromoStatus;
  /** Whole months until the promotion ends; null without a dated active promotion. */
  promoMonthsLeft: number | null;
}

function monthsBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / (DAYS_PER_MONTH * 24 * 60 * 60 * 1000);
}

/** The rate a debt is effectively costing as of `asOf`, with its promotion status. */
export function effectiveRate(
  debt: DebtAccount,
  asOf: Date,
): Pick<DebtPriority, 'effectiveRateBps' | 'promoStatus' | 'promoMonthsLeft'> {
  const current = debt.interestRateBps ?? 0;
  const after = debt.postPromoRateBps ?? current;
  const promoEnd = parseISODate(debt.promoEndISO);

  if (promoEnd && promoEnd <= asOf && (debt.hasPromotion || debt.postPromoRateBps !== null)) {
    return { effectiveRateBps: after, promoStatus: 'expired', promoMonthsLeft: null };
  }
  if (!debt.hasPromotion) {
    return { effectiveRateBps: current, promoStatus: 'none', promoMonthsLeft: null };
  }
  if (!promoEnd) {
    return { effectiveRateBps: current, promoStatus: 'active', promoMonthsLeft: null };
  }
  const monthsLeft = monthsBetween(asOf, promoEnd);
  // Ramps linearly from the promo rate to the post-promo rate over the final months.
  const urgency = Math.min(1, Math.max(0, 1 - monthsLeft / PROMO_RAMP_MONTHS));
  return {
    effectiveRateBps: Math.round(current + (after - current) * urgency),
    promoStatus: urgency > 0 ? 'ending-soon' : 'active',
    promoMonthsLeft: Math.max(0, Math.ceil(monthsLeft)),
  };
}

/**
 * Ranks debts by effective interest rate (the avalanche method). Equal rates
 * fall back to the smaller balance. Promotions count at their promo rate while
 * far off, then increasingly at their post-promo rate as they near expiry;
 * expired promotions count at the post-promo rate. Paid-off debts rank last.
 */
export function rankDebtPriority(debts: DebtAccount[], asOf: Date): Map<string, DebtPriority> {
  const scored = debts.map((debt) => {
    const rate = effectiveRate(debt, asOf);
    return { debt, rate };
  });
  scored.sort(
    (a, b) =>
      Number(b.debt.balanceCents > 0) - Number(a.debt.balanceCents > 0) ||
      b.rate.effectiveRateBps - a.rate.effectiveRateBps ||
      a.debt.balanceCents - b.debt.balanceCents ||
      a.debt.name.localeCompare(b.debt.name),
  );
  return new Map(
    scored.map(({ debt, rate }, i) => [debt.id, { rank: i + 1, ...rate }]),
  );
}
