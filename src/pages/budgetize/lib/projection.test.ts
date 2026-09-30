import { describe, expect, it } from 'vitest';
import { computeProjection, toISODate, weeksForRange, type ProjectionRange } from './projection';
import type { BudgetData } from '../types';
import { emptyBudget } from '../types';
import { bill, debt, paidPerson, person } from '../testFixtures';

// Sep 2026 has 5 Wednesdays (2, 9, 16, 23, 30); Oct 2026 has 4 (7, 14, 21, 28).
// A grosses $500/paycheck and B $1,500, so the household need splits 25% / 75%.
const data: BudgetData = {
  ...emptyBudget(),
  people: [
    paidPerson('A', 2026, 500_00, { personalBalanceCents: 500_00 }),
    paidPerson('B', 2026, 1500_00),
  ],
  bills: [bill({ name: 'Rent', amountCents: 1200_00, dueDay: 1 })],
  debts: [debt({ name: 'Plain', minPaymentCents: 400_00, dueDay: 2, paidFrom: 'shared' })],
  essentialsBalanceCents: 2000_00,
};

describe('computeProjection', () => {
  // Friday Sep 25 2026; next Wednesday is Sep 30.
  const start = new Date(2026, 8, 25);

  it('makes week 1 a payday-free stub running up to the next Wednesday', () => {
    const { weeks } = computeProjection(data, start, 3);
    expect(weeks[0].startISO).toBe('2026-09-25');
    expect(weeks[0].endISO).toBe('2026-09-29');
    expect(weeks[0].paydayCount).toBe(0);
    expect(weeks[0].outflows).toEqual([]);
    expect(weeks[0].personal.map((a) => a.endBalanceCents)).toEqual([500_00, 0]);
    expect(weeks[0].essentials.endBalanceCents).toBe(2000_00);
  });

  it('deposits each month only what keeps essentials from going negative', () => {
    const { weeks } = computeProjection(data, start, 3);
    const week2 = weeks[1];
    expect(week2.startISO).toBe('2026-09-30');
    expect(week2.endISO).toBe('2026-10-06');
    expect(week2.paydayCount).toBe(1);
    expect(week2.incomeKnown).toBe(true);
    // The $2,000 balance already covers October's $1,600 due before Oct 7, so September deposits nothing.
    expect(week2.essentials.depositCents).toBe(0);
    expect(week2.personal.map((a) => a.depositCents)).toEqual([500_00, 1500_00]);
    expect(week2.outflows.map((o) => [o.name, o.amountCents, o.dateISO])).toEqual([
      ['Rent', 1200_00, '2026-10-01'],
      ['Plain', 400_00, '2026-10-02'],
    ]);
    expect(week2.essentials.endBalanceCents).toBe(2000_00 - 1600_00);

    // October's 4 paydays rebuild $1,600 for November's early charges: ($1,600 + $1,600 − $2,000) ÷ 4.
    const week3 = weeks[2];
    expect(week3.startISO).toBe('2026-10-07');
    expect(week3.essentials.depositCents).toBe(300_00);
    expect(week3.personal.map((a) => a.depositCents)).toEqual([425_00, 1275_00]);
  });

  it('starts week 1 as a full payday week when today is Wednesday', () => {
    const { weeks } = computeProjection(data, new Date(2026, 8, 30), 1);
    expect(weeks[0].startISO).toBe('2026-09-30');
    expect(weeks[0].endISO).toBe('2026-10-06');
    expect(weeks[0].paydayCount).toBe(1);
  });

  it('charges the promo payoff under the suggested strategy and the minimum otherwise', () => {
    const promo = {
      ...data,
      debts: [
        debt({
          name: 'Promo',
          minPaymentCents: 100_00,
          suggestedPaymentCents: 300_00,
          hasPromotion: true,
          dueDay: 13,
          paidFrom: 'shared',
        }),
      ],
    };
    const suggested = computeProjection(promo, start, 3);
    expect(suggested.weeks[2].outflows.map((o) => o.amountCents)).toEqual([300_00]);
    const minimum = computeProjection(promo, start, 3, 'minimum');
    expect(minimum.weeks[2].outflows.map((o) => o.amountCents)).toEqual([100_00]);
  });

  it('produces the requested number of weeks (8 by default)', () => {
    expect(computeProjection(data, start).weeks).toHaveLength(8);
    expect(computeProjection(data, start, 4).weeks).toHaveLength(4);
  });
});

describe('weeksForRange', () => {
  const endsFor = (start: Date, range: ProjectionRange) =>
    computeProjection(data, start, weeksForRange(range, start)).weeks.map((w) => w.endISO);

  it('returns 8 for the default range', () => {
    expect(weeksForRange('8w', new Date(2026, 8, 30))).toBe(8);
  });

  it('covers exactly through the date N months after the start', () => {
    const ends = endsFor(new Date(2026, 8, 30), '6m');
    expect(ends[ends.length - 1] >= '2027-03-30').toBe(true);
    expect(ends[ends.length - 2] < '2027-03-30').toBe(true);
  });

  it('grows past 8 weeks for month ranges', () => {
    const start = new Date(2026, 8, 25);
    expect(weeksForRange('3m', start)).toBeGreaterThan(8);
    expect(weeksForRange('6m', start)).toBeGreaterThan(weeksForRange('5m', start));
  });

  it('clamps to the end of a shorter target month', () => {
    const ends = endsFor(new Date(2026, 7, 31), '6m');
    expect(ends[ends.length - 1] >= '2027-02-28').toBe(true);
    expect(ends[ends.length - 2] < '2027-02-28').toBe(true);
  });
});

describe('computeProjection with missing income months', () => {
  const start = new Date(2026, 8, 25);

  it('deposits nothing and flags the week when a payday month has no schedule entry', () => {
    const noIncome: BudgetData = {
      ...emptyBudget(),
      people: [person({ name: 'A', personalBalanceCents: 500_00 })],
      bills: [bill({ name: 'Rent', amountCents: 1200_00, dueDay: 1 })],
      essentialsBalanceCents: 2000_00,
    };
    const { weeks } = computeProjection(noIncome, start, 2);
    expect(weeks[0].incomeKnown).toBe(true); // no payday at all
    expect(weeks[1].incomeKnown).toBe(false);
    expect(weeks[1].paydayCount).toBe(1);
    expect(weeks[1].essentials.depositCents).toBe(0);
    expect(weeks[1].personal[0].depositCents).toBe(0);
    // Bills still draft, so the shortfall shows up as a falling balance.
    expect(weeks[1].essentials.endBalanceCents).toBe(800_00);
  });
});

describe('computeProjection auto-pay lane', () => {
  // Friday Sep 25 2026; paydays Sep 30, Oct 7, Oct 14.
  const start = new Date(2026, 8, 25);
  const autopayData: BudgetData = {
    ...emptyBudget(),
    people: [paidPerson('A', 2026, 500_00), paidPerson('B', 2026, 1500_00)],
    bills: [bill({ name: 'Electric', amountCents: 400_00, dueDay: 15, paidFrom: 'autopay' })],
  };

  it('deposits nothing until a charge needs covering', () => {
    const { weeks } = computeProjection(autopayData, start, 2);
    const week2 = weeks[1];
    expect(week2.paydayCount).toBe(1);
    // Nothing drafts auto-pay before Oct 7, so September's payday keeps all its pay.
    expect(week2.autopay).toEqual({ depositCents: 0, outflowCents: 0, endBalanceCents: 0 });
    expect(week2.essentials.depositCents).toBe(0);
    expect(week2.personal.map((a) => a.depositCents)).toEqual([500_00, 1500_00]);
  });

  it('drafts auto-pay items from the auto-pay lane, not essentials', () => {
    const { weeks } = computeProjection(autopayData, start, 4);
    const week4 = weeks[3];
    expect(week4.outflows).toEqual([
      { kind: 'bill', name: 'Electric', amountCents: 400_00, dateISO: '2026-10-15', source: 'autopay', personId: null },
    ]);
    expect(week4.essentials.outflowCents).toBe(0);
    // Oct 7 and Oct 14 must cover the Oct 15 charge: $200 each.
    expect(week4.autopay.endBalanceCents).toBe(0);
  });

  it('starts the auto-pay lane from the current balance', () => {
    const seeded = { ...autopayData, autopayBalanceCents: 500_00 };
    const { weeks } = computeProjection(seeded, start, 4);
    // The balance already covers October, so nothing is deposited.
    expect(weeks[3].autopay.endBalanceCents).toBe(100_00);
  });
});

describe('toISODate', () => {
  it('formats local dates without timezone shifts', () => {
    expect(toISODate(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(toISODate(new Date(2026, 11, 31))).toBe('2026-12-31');
  });
});
