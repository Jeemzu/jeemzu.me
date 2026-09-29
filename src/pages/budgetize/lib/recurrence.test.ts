import { describe, expect, it } from 'vitest';
import { computeProjection, toISODate } from './projection';
import { computeMonthSummary } from './schedule';
import { occurrencesInMonth, occursOn } from './recurrence';
import type { BudgetData, OneOffEvent, ScheduleOverride } from '../types';
import { emptyBudget } from '../types';
import { bill, paidPerson, person } from '../testFixtures';

function skip(targetId: string, fromISO: string, toISO: string): ScheduleOverride {
  return { id: `skip-${targetId}`, targetKind: 'bill', targetId, fromISO, toISO, mode: 'skip', amountCents: null, note: '' };
}

function reduceTo(targetId: string, fromISO: string, toISO: string, amountCents: number): ScheduleOverride {
  return { id: `amt-${targetId}`, targetKind: 'bill', targetId, fromISO, toISO, mode: 'amount', amountCents, note: '' };
}

function oneOff(partial: Partial<OneOffEvent> & Pick<OneOffEvent, 'id' | 'name' | 'amountCents' | 'dateISO'>): OneOffEvent {
  return { kind: 'expense', account: 'shared', personId: null, note: '', ...partial };
}

/** Rent on the 1st, paid from the shared essentials account, with a $10k cushion. */
function rentBudget(partial: Partial<BudgetData> = {}): BudgetData {
  return {
    ...emptyBudget(),
    bills: [bill({ id: 'rent', name: 'Rent', amountCents: 2000_00, dueDay: 1 })],
    essentialsBalanceCents: 10_000_00,
    ...partial,
  };
}

/** Sums every outflow named `name` across the whole projection. */
function totalFor(data: BudgetData, start: Date, weeks: number, name: string): number {
  return computeProjection(data, start, weeks).weeks.reduce(
    (sum, week) =>
      sum + week.outflows.reduce((s, o) => (o.name === name ? s + o.amountCents : s), 0),
    0,
  );
}

// Thursday Oct 1 2026.
const start = new Date(2026, 9, 1);

describe('schedule overrides', () => {
  it('skips rent for October and November but charges it again in December', () => {
    const data = rentBudget({ overrides: [skip('rent', '2026-10-01', '2026-11-30')] });
    const charges = computeProjection(data, start, 14).weeks.flatMap((w) => w.outflows);

    expect(charges.map((c) => c.dateISO)).toEqual(['2026-12-01', '2027-01-01']);
    expect(charges[0].amountCents).toBe(2000_00);
  });

  it('leaves the underlying bill untouched once the range ends', () => {
    const data = rentBudget({ overrides: [skip('rent', '2026-10-01', '2026-11-30')] });
    expect(data.bills[0].amountCents).toBe(2000_00);
    expect(computeMonthSummary(data, 2026, 11).billsTotalCents).toBe(2000_00);
  });

  it('charges a reduced amount inside the range and the full amount outside it', () => {
    const data = rentBudget({ overrides: [reduceTo('rent', '2026-11-01', '2026-11-30', 500_00)] });

    expect(computeMonthSummary(data, 2026, 9).billsTotalCents).toBe(2000_00);
    expect(computeMonthSummary(data, 2026, 10).billsTotalCents).toBe(500_00);
    expect(computeMonthSummary(data, 2026, 11).billsTotalCents).toBe(2000_00);
  });

  it('marks an overridden occurrence as adjusted', () => {
    const data = rentBudget({ overrides: [reduceTo('rent', '2026-11-01', '2026-11-30', 500_00)] });
    expect(computeMonthSummary(data, 2026, 10).scheduled[0].adjusted).toBe(true);
    expect(computeMonthSummary(data, 2026, 9).scheduled[0].adjusted).toBe(false);
  });

  it('lets a later override win over an earlier overlapping one', () => {
    const data = rentBudget({
      overrides: [
        reduceTo('rent', '2026-10-01', '2026-12-31', 500_00),
        skip('rent', '2026-11-01', '2026-11-30'),
      ],
    });

    expect(computeMonthSummary(data, 2026, 9).billsTotalCents).toBe(500_00);
    expect(computeMonthSummary(data, 2026, 10).billsTotalCents).toBe(0);
    expect(computeMonthSummary(data, 2026, 11).billsTotalCents).toBe(500_00);
  });
});

describe('recurrence frequencies', () => {
  it('charges a quarterly bill every third month from its anchor', () => {
    const insurance = bill({
      id: 'ins',
      name: 'Insurance',
      amountCents: 600_00,
      dueDay: 10,
      frequency: 'quarterly',
      anchorISO: '2026-10-10',
    });

    expect(occurrencesInMonth(insurance, 2026, 9).map(toISODate)).toEqual(['2026-10-10']);
    expect(occurrencesInMonth(insurance, 2026, 10)).toEqual([]);
    expect(occurrencesInMonth(insurance, 2026, 11)).toEqual([]);
    expect(occurrencesInMonth(insurance, 2027, 0).map(toISODate)).toEqual(['2027-01-10']);
  });

  it('never charges a quarterly bill before its anchor', () => {
    const insurance = bill({
      id: 'ins',
      name: 'Insurance',
      amountCents: 600_00,
      dueDay: 10,
      frequency: 'quarterly',
      anchorISO: '2026-10-10',
    });
    expect(occursOn(insurance, new Date(2026, 6, 10))).toBe(false);
  });

  it('charges a weekly bill every 7 days from its anchor, ignoring the due day', () => {
    const gym = bill({
      id: 'gym',
      name: 'Gym',
      amountCents: 25_00,
      dueDay: 1,
      frequency: 'weekly',
      anchorISO: '2026-10-02',
    });

    expect(occurrencesInMonth(gym, 2026, 9).map(toISODate)).toEqual([
      '2026-10-02',
      '2026-10-09',
      '2026-10-16',
      '2026-10-23',
      '2026-10-30',
    ]);
  });

  it('charges a biweekly bill every 14 days across a DST boundary', () => {
    const trash = bill({
      id: 'trash',
      name: 'Trash',
      amountCents: 40_00,
      dueDay: 1,
      frequency: 'biweekly',
      anchorISO: '2026-10-21',
    });

    // US DST ends Nov 1 2026; the stride must not drift.
    expect(occurrencesInMonth(trash, 2026, 10).map(toISODate)).toEqual(['2026-11-04', '2026-11-18']);
  });

  it('charges an annual bill once a year on its anchor month', () => {
    const domain = bill({
      id: 'dom',
      name: 'Domain',
      amountCents: 18_00,
      dueDay: 5,
      frequency: 'annual',
      anchorISO: '2026-11-05',
    });

    expect(occurrencesInMonth(domain, 2026, 10).map(toISODate)).toEqual(['2026-11-05']);
    expect(occurrencesInMonth(domain, 2027, 10).map(toISODate)).toEqual(['2027-11-05']);
    expect(occurrencesInMonth(domain, 2027, 9)).toEqual([]);
  });
});

describe('item start and end windows', () => {
  it('stops charging a bill after its end date lands mid-projection', () => {
    const data = rentBudget({
      bills: [bill({ id: 'lease', name: 'Lease', amountCents: 900_00, dueDay: 1, endISO: '2026-12-15' })],
    });

    const dates = computeProjection(data, start, 20).weeks.flatMap((w) =>
      w.outflows.map((o) => o.dateISO),
    );
    expect(dates).toEqual(['2026-10-01', '2026-11-01', '2026-12-01']);
  });

  it('does not charge a bill before its start date', () => {
    const data = rentBudget({
      bills: [bill({ id: 'new', name: 'NewPlan', amountCents: 300_00, dueDay: 1, startISO: '2026-12-01' })],
    });

    expect(computeMonthSummary(data, 2026, 10).billsTotalCents).toBe(0);
    expect(computeMonthSummary(data, 2026, 11).billsTotalCents).toBe(300_00);
  });
});

describe('one-off events', () => {
  it('deposits one-off income on a non-payday without touching the paycheck math', () => {
    const data = rentBudget({
      bills: [],
      people: [paidPerson('A', 2026, 100_00)],
      // Friday, not a Wednesday payday.
      oneOffs: [oneOff({ id: 'bonus', kind: 'income', name: 'Bonus', amountCents: 1500_00, dateISO: '2026-10-02' })],
    });

    const week = computeProjection(data, start, 1).weeks[0];
    expect(week.paydayCount).toBe(0);
    expect(week.inflows.map((i) => i.name)).toEqual(['Bonus']);
    expect(week.essentials.depositCents).toBe(1500_00);
    expect(week.essentials.endBalanceCents).toBe(10_000_00 + 1500_00);
  });

  it('charges a one-off expense against the named personal account', () => {
    const data = rentBudget({
      bills: [],
      people: [person({ name: 'A', personalBalanceCents: 800_00 }), person({ name: 'B' })],
      oneOffs: [
        oneOff({ id: 'tires', name: 'Tires', amountCents: 300_00, dateISO: '2026-10-02', account: 'personal', personId: 'A' }),
      ],
    });

    const week = computeProjection(data, start, 1).weeks[0];
    expect(week.personal[0].endBalanceCents).toBe(500_00);
    expect(week.personal[1].endBalanceCents).toBe(0);
    expect(week.essentials.outflowCents).toBe(0);
  });

  it('counts one-off expenses in the month summary but not in recurring bill totals', () => {
    const data = rentBudget({
      oneOffs: [oneOff({ id: 'vet', name: 'Vet', amountCents: 250_00, dateISO: '2026-10-20' })],
    });
    const summary = computeMonthSummary(data, 2026, 9);

    expect(summary.billsTotalCents).toBe(2000_00);
    expect(summary.oneOffExpenseCents).toBe(250_00);
    expect(summary.outflowTotalCents).toBe(2250_00);
  });

  it('only fires once, on its exact date', () => {
    const data = rentBudget({
      bills: [],
      oneOffs: [oneOff({ id: 'vet', name: 'Vet', amountCents: 250_00, dateISO: '2026-10-20' })],
    });
    expect(totalFor(data, start, 20, 'Vet')).toBe(250_00);
  });
});
