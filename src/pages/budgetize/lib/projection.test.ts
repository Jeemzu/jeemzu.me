import { describe, expect, it } from 'vitest';
import { computeProjection, toISODate } from './projection';
import type { BudgetData, DebtAccount, PersonIncome } from '../types';

function person(
  partial: Partial<PersonIncome> & Pick<PersonIncome, 'name'>,
): PersonIncome {
  return {
    id: partial.name,
    personalPerPaycheckCents: 0,
    essentialsPerPaycheckCents: 0,
    personalBalanceCents: 0,
    ...partial,
  };
}

function debt(partial: Partial<DebtAccount> & Pick<DebtAccount, 'name' | 'minPaymentCents'>): DebtAccount {
  return {
    id: partial.name,
    balanceCents: 0,
    suggestedPaymentCents: null,
    hasPromotion: false,
    dueDay: 1,
    paidFrom: 'shared',
    ...partial,
  };
}

const data: BudgetData = {
  people: [
    person({ name: 'A', personalPerPaycheckCents: 100_00, essentialsPerPaycheckCents: 400_00, personalBalanceCents: 500_00 }),
    person({ name: 'B', personalPerPaycheckCents: 200_00, essentialsPerPaycheckCents: 600_00 }),
  ],
  bills: [
    { id: 'rent', name: 'Rent', amountCents: 1000_00, dueDay: 1, category: '', paidFrom: 'shared' },
    { id: 'eom', name: 'EndOfMonth', amountCents: 50_00, dueDay: 31, category: '', paidFrom: 'shared' },
  ],
  debts: [
    debt({ name: 'Promo', minPaymentCents: 100_00, suggestedPaymentCents: 300_00, hasPromotion: true, dueDay: 13 }),
    debt({ name: 'Plain', minPaymentCents: 70_00, dueDay: 2 }),
  ],
  essentialsBalanceCents: 2000_00,
  autopayBalanceCents: 0,
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

  it('applies deposits on Wednesdays and outflows on clamped due days', () => {
    const { weeks } = computeProjection(data, start, 3);
    const week2 = weeks[1];
    expect(week2.startISO).toBe('2026-09-30');
    expect(week2.endISO).toBe('2026-10-06');
    expect(week2.paydayCount).toBe(1);
    // Sep 30: EndOfMonth (31 clamps to 30) · Oct 1: Rent · Oct 2: Plain minimum.
    expect(week2.outflows.map((o) => [o.name, o.amountCents, o.dateISO])).toEqual([
      ['EndOfMonth', 50_00, '2026-09-30'],
      ['Rent', 1000_00, '2026-10-01'],
      ['Plain', 70_00, '2026-10-02'],
    ]);
    expect(week2.personal.map((a) => a.endBalanceCents)).toEqual([600_00, 200_00]);
    // 2000 + (400+600) − (50+1000+70)
    expect(week2.essentials.endBalanceCents).toBe(1880_00);

    const week3 = weeks[2];
    expect(week3.startISO).toBe('2026-10-07');
    // Promo debt pays its suggested amount on Oct 13.
    expect(week3.outflows).toEqual([
      { kind: 'debt', name: 'Promo', amountCents: 300_00, dateISO: '2026-10-13', source: 'shared' },
    ]);
    expect(week3.essentials.endBalanceCents).toBe(1880_00 + 1000_00 - 300_00);
    expect(week3.personal.map((a) => a.endBalanceCents)).toEqual([700_00, 400_00]);
  });

  it('starts week 1 as a full payday week when today is Wednesday', () => {
    const { weeks } = computeProjection(data, new Date(2026, 8, 30), 1);
    expect(weeks[0].startISO).toBe('2026-09-30');
    expect(weeks[0].endISO).toBe('2026-10-06');
    expect(weeks[0].paydayCount).toBe(1);
  });

  it('charges minimum debt payments under the minimum strategy', () => {
    const { weeks } = computeProjection(data, start, 3, 'minimum');
    expect(weeks[2].outflows).toEqual([
      { kind: 'debt', name: 'Promo', amountCents: 100_00, dateISO: '2026-10-13', source: 'shared' },
    ]);
    expect(weeks[2].essentials.endBalanceCents).toBe(1880_00 + 1000_00 - 100_00);
  });

  it('produces the requested number of weeks (8 by default)', () => {
    expect(computeProjection(data, start).weeks).toHaveLength(8);
    expect(computeProjection(data, start, 4).weeks).toHaveLength(4);
  });
});

describe('computeProjection auto-pay lane', () => {
  // Friday Sep 25 2026; paydays Sep 30, Oct 7, Oct 14.
  const start = new Date(2026, 8, 25);
  // Gross: A 500, B 1500 → 25% / 75% of the $100 per-payday funding.
  const autopayData: BudgetData = {
    people: [
      person({ name: 'A', personalPerPaycheckCents: 100_00, essentialsPerPaycheckCents: 400_00 }),
      person({ name: 'B', personalPerPaycheckCents: 500_00, essentialsPerPaycheckCents: 1000_00 }),
    ],
    bills: [{ id: 'el', name: 'Electric', amountCents: 400_00, dueDay: 15, category: '', paidFrom: 'autopay' }],
    debts: [],
    essentialsBalanceCents: 0,
    autopayBalanceCents: 0,
  };

  it('carves each payday auto-pay share out of the essentials deposits', () => {
    const { weeks } = computeProjection(autopayData, start, 2);
    const week2 = weeks[1];
    expect(week2.paydayCount).toBe(1);
    expect(week2.autopay).toEqual({ depositCents: 100_00, outflowCents: 0, endBalanceCents: 100_00 });
    // (400−25) + (1000−75)
    expect(week2.essentials.depositCents).toBe(1300_00);
    expect(week2.personal.map((a) => a.depositCents)).toEqual([100_00, 500_00]);
  });

  it('drafts auto-pay items from the auto-pay lane, not essentials', () => {
    const { weeks } = computeProjection(autopayData, start, 4);
    const week4 = weeks[3];
    expect(week4.outflows).toEqual([
      { kind: 'bill', name: 'Electric', amountCents: 400_00, dateISO: '2026-10-15', source: 'autopay' },
    ]);
    expect(week4.essentials.outflowCents).toBe(0);
    // 3 paydays × $100 − $400
    expect(week4.autopay.endBalanceCents).toBe(-100_00);
  });

  it('starts the auto-pay lane from the current balance', () => {
    const seeded = { ...autopayData, autopayBalanceCents: 500_00 };
    const { weeks } = computeProjection(seeded, start, 4);
    expect(weeks[3].autopay.endBalanceCents).toBe(400_00);
  });
});

describe('toISODate', () => {
  it('formats local dates without timezone shifts', () => {
    expect(toISODate(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(toISODate(new Date(2026, 11, 31))).toBe('2026-12-31');
  });
});
