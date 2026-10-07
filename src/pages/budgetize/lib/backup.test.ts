import { describe, expect, it } from 'vitest';
import { BACKUP_VERSION, parseBackup, parseBudgetData, serializeBackup } from './backup';
import type { BudgetData } from '../types';
import { emptyBudget, monthlyRecurrence } from '../types';
import { yearSchedule } from '../testFixtures';

const sample: BudgetData = {
  ...emptyBudget(),
  people: [
    {
      id: 'p1',
      name: 'Courtney',
      schedule: yearSchedule(2027, 561_87),
      personalBalanceCents: 50_00,
    },
  ],
  bills: [
    { id: 'a', name: 'Rent', amountCents: 3250_00, dueDay: 1, paidFrom: 'shared', ...monthlyRecurrence() },
    { id: 'b', name: 'Spectrum', amountCents: 90_00, dueDay: 21, paidFrom: 'autopay', ...monthlyRecurrence() },
  ],
  debts: [
    {
      id: 'd1',
      name: 'Best Buy',
      balanceCents: 3536_82,
      minPaymentCents: 77_00,
      suggestedPaymentCents: 589_47,
      hasPromotion: true,
      interestRateBps: 0,
      promoEndISO: '2027-06-01',
      postPromoRateBps: 2800,
      dueDay: 1,
      paidFrom: 'autopay',
      ...monthlyRecurrence(),
    },
    {
      id: 'd2',
      name: 'Aidvantage',
      balanceCents: 28246_32,
      minPaymentCents: 0,
      suggestedPaymentCents: null,
      hasPromotion: false,
      interestRateBps: 420,
      promoEndISO: null,
      postPromoRateBps: null,
      dueDay: 1,
      paidFrom: 'shared',
      ...monthlyRecurrence(),
    },
  ],
  essentialsBalanceCents: 1200_00,
  autopayBalanceCents: 350_00,
  projectionStartISO: '2027-01-15',
  debtStrategy: 'minimum',
};

describe('backup roundtrip', () => {
  it('preserves separate contribution locks including zero and null', () => {
    const data = { ...sample, people: [{
      ...sample.people[0], autopayLockedPerPaycheckCents: 0, essentialsLockedPerPaycheckCents: 12345,
    }, { ...sample.people[0], id: 'p2', autopayLockedPerPaycheckCents: null }] };
    expect(parseBackup(serializeBackup(data))).toEqual({ ok: true, data });
    expect(parseBudgetData(data)).toEqual({ ok: true, data });
  });

  it.each([-1, 1.5, '100', true])('rejects invalid contribution locks: %s', (lock) => {
    expect(parseBudgetData({ ...sample, people: [{
      ...sample.people[0], autopayLockedPerPaycheckCents: lock,
    }] })).toMatchObject({ ok: false, error: expect.stringContaining('contribution lock') });
  });

  it('reads earlier monthly-named locks as the entered per-paycheck amount', () => {
    const legacy = { ...sample, people: [{
      ...sample.people[0], autopayLockedMonthlyCents: 20000, essentialsLockedMonthlyCents: 0,
    }] };
    const expected = { ...sample, people: [{
      ...sample.people[0], autopayLockedPerPaycheckCents: 20000, essentialsLockedPerPaycheckCents: 0,
    }] };
    expect(parseBudgetData(legacy)).toEqual({ ok: true, data: expected });
    expect(parseBackup(JSON.stringify({ app: 'budgetize-me', version: 7, data: legacy })))
      .toEqual({ ok: true, data: expected });
    expect(parseBudgetData({ ...legacy, people: [{
      ...legacy.people[0], autopayLockedPerPaycheckCents: null,
    }] })).toEqual({ ok: true, data: { ...expected, people: [{
      ...expected.people[0], autopayLockedPerPaycheckCents: null,
    }] } });
  });

  it('preserves subscription section assignments in backups and server payloads', () => {
    const data: BudgetData = {
      ...sample,
      bills: [...sample.bills, { ...sample.bills[1], id: 'subscription', isSubscription: true }],
    };
    expect(parseBackup(serializeBackup(data))).toEqual({ ok: true, data });
    expect(parseBudgetData(JSON.parse(JSON.stringify(data)))).toEqual({ ok: true, data });
  });

  it('keeps older bills without a subscription flag unchanged', () => {
    expect(parseBackup(JSON.stringify({ app: 'budgetize-me', version: 5, data: sample })))
      .toEqual({ ok: true, data: sample });
  });

  it('rejects invalid subscription flags rather than changing the section silently', () => {
    const data = { ...sample, bills: [{ ...sample.bills[0], isSubscription: 'yes' }] };
    expect(parseBudgetData(data)).toMatchObject({
      ok: false,
      error: expect.stringContaining('subscription flag'),
    });
  });

  it('serializes and restores identical data', () => {
    const json = serializeBackup(sample, new Date('2026-09-25T12:00:00Z'));
    const parsed = JSON.parse(json);
    expect(parsed.app).toBe('budgetize-me');
    expect(parsed.version).toBe(BACKUP_VERSION);
    expect(parsed.exportedAt).toBe('2026-09-25T12:00:00.000Z');

    const result = parseBackup(json);
    expect(result).toEqual({ ok: true, data: sample });
  });

  it('generates ids for entries missing them', () => {
    const json = serializeBackup(sample);
    const raw = JSON.parse(json);
    delete raw.data.bills[0].id;
    delete raw.data.debts[0].id;
    delete raw.data.people[0].id;
    const result = parseBackup(JSON.stringify(raw));
    if (!result.ok) throw new Error(result.error);
    expect(result.data.bills[0].id).toBeTruthy();
    expect(result.data.bills[1].id).toBe('b');
    expect(result.data.debts[0].id).toBeTruthy();
    expect(result.data.people[0].id).toBeTruthy();
  });
});

describe('version 1 migration', () => {
  it('turns weekly income into a Household person with no debts', () => {
    const v1 = {
      app: 'budgetize-me',
      version: 1,
      data: {
        weeklyIncomeCents: 2300_00,
        bills: [{ id: 'a', name: 'Rent', amountCents: 3250_00, dueDay: 1 }],
      },
    };
    const result = parseBackup(JSON.stringify(v1));
    if (!result.ok) throw new Error(result.error);
    expect(result.data.bills).toHaveLength(1);
    expect(result.data.debts).toEqual([]);
    expect(result.data.essentialsBalanceCents).toBe(0);
    expect(result.data.autopayBalanceCents).toBe(0);
    expect(result.data.people).toHaveLength(1);
    expect(result.data.people[0]).toMatchObject({
      name: 'Household',
      personalBalanceCents: 0,
    });
    expect(result.data.people[0].schedule).toHaveLength(12);
    expect(result.data.people[0].schedule[0].perPaycheckCents).toBe(2300_00);
  });

  it('creates no people when v1 income was zero', () => {
    const v1 = { app: 'budgetize-me', version: 1, data: { weeklyIncomeCents: 0, bills: [] } };
    const result = parseBackup(JSON.stringify(v1));
    if (!result.ok) throw new Error(result.error);
    expect(result.data.people).toEqual([]);
  });

  it('rejects invalid v1 income', () => {
    const result = parseBackup(
      JSON.stringify({ app: 'budgetize-me', version: 1, data: { weeklyIncomeCents: -5, bills: [] } }),
    );
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining('income') });
  });
});

describe('parseBackup validation', () => {
  it('rejects invalid JSON', () => {
    expect(parseBackup('{nope')).toMatchObject({ ok: false });
  });

  it('rejects files from other apps', () => {
    const result = parseBackup(JSON.stringify({ app: 'other', version: 2, data: sample }));
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining('not a Budgetize Me backup') });
  });

  it('rejects newer backup versions', () => {
    const result = parseBackup(
      JSON.stringify({ app: 'budgetize-me', version: BACKUP_VERSION + 1, data: sample }),
    );
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining('version') });
  });

  it('rejects bills with bad due days', () => {
    const data = { ...sample, bills: [{ id: 'x', name: 'Bad', amountCents: 100, dueDay: 42 }] };
    const result = parseBackup(JSON.stringify({ app: 'budgetize-me', version: 2, data }));
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining('due day') });
  });

  it('rejects bills missing names', () => {
    const data = { ...sample, bills: [{ id: 'x', name: '', amountCents: 100, dueDay: 1 }] };
    const result = parseBackup(JSON.stringify({ app: 'budgetize-me', version: 2, data }));
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining('name') });
  });

  it('rejects debts with invalid amounts', () => {
    const data = {
      ...sample,
      debts: [{ id: 'x', name: 'Card', balanceCents: -5, minPaymentCents: 0, dueDay: 1 }],
    };
    const result = parseBackup(JSON.stringify({ app: 'budgetize-me', version: 2, data }));
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining('balance') });
  });

  it('rejects people with an invalid pay schedule entry', () => {
    const data = {
      ...sample,
      people: [
        {
          id: 'x',
          name: 'A',
          personalBalanceCents: 0,
          schedule: [{ year: 2027, month: 12, paycheckCount: 4, perPaycheckCents: 100 }],
        },
      ],
    };
    const result = parseBackup(JSON.stringify({ app: 'budgetize-me', version: 2, data }));
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining('invalid month') });
  });

  it('migrates pre-schedule people onto the current calendar year', () => {
    const data = {
      ...sample,
      people: [
        {
          id: 'x',
          name: 'A',
          personalPerPaycheckCents: 100_00,
          essentialsPerPaycheckCents: 400_00,
          personalBalanceCents: 0,
        },
      ],
    };
    const result = parseBackup(JSON.stringify({ app: 'budgetize-me', version: 3, data }));
    if (!result.ok) throw new Error(result.error);
    const schedule = result.data.people[0].schedule;
    expect(schedule).toHaveLength(12);
    expect(schedule[0].year).toBe(new Date().getFullYear());
    expect(schedule.every((e) => e.perPaycheckCents === 500_00)).toBe(true);
    expect(schedule.every((e) => e.paycheckCount === 4 || e.paycheckCount === 5)).toBe(true);
  });

  it('rejects an invalid essentials balance', () => {
    const data = { ...sample, essentialsBalanceCents: 'lots' };
    const result = parseBackup(JSON.stringify({ app: 'budgetize-me', version: 2, data }));
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining('essentials balance') });
  });

  it('rejects an invalid auto-pay balance', () => {
    const data = { ...sample, autopayBalanceCents: 1.5 };
    const result = parseBackup(JSON.stringify({ app: 'budgetize-me', version: 2, data }));
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining('auto-pay balance') });
  });

  it('rejects an invalid projection start date', () => {
    const data = { ...sample, projectionStartISO: '01/15/2027' };
    const result = parseBackup(JSON.stringify({ app: 'budgetize-me', version: 5, data }));
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining('start date') });
  });

  it('rejects an unknown debt strategy', () => {
    const data = { ...sample, debtStrategy: 'aggressive' };
    const result = parseBackup(JSON.stringify({ app: 'budgetize-me', version: 5, data }));
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining('strategy') });
  });

  it('accepts negative (overdrafted) cash balances', () => {
    const data = {
      ...sample,
      essentialsBalanceCents: -50_00,
      autopayBalanceCents: -1_00,
      people: [{ ...sample.people[0], personalBalanceCents: -20_00 }],
    };
    const result = parseBackup(JSON.stringify({ app: 'budgetize-me', version: 2, data }));
    if (!result.ok) throw new Error(result.error);
    expect(result.data.essentialsBalanceCents).toBe(-50_00);
    expect(result.data.autopayBalanceCents).toBe(-1_00);
    expect(result.data.people[0].personalBalanceCents).toBe(-20_00);
  });

  it('defaults paid-from and auto-pay balance on pre-autopay v2 backups', () => {
    const legacy = {
      app: 'budgetize-me',
      version: 2,
      data: {
        people: [],
        bills: [{ id: 'a', name: 'Rent', amountCents: 3250_00, dueDay: 1 }],
        debts: [
          {
            id: 'd1',
            name: 'Best Buy',
            balanceCents: 100_00,
            minPaymentCents: 10_00,
            suggestedPaymentCents: null,
            hasPromotion: false,
            dueDay: 1,
          },
        ],
        essentialsBalanceCents: 0,
      },
    };
    const result = parseBackup(JSON.stringify(legacy));
    if (!result.ok) throw new Error(result.error);
    expect(result.data.bills[0].paidFrom).toBe('shared');
    expect(result.data.debts[0].paidFrom).toBe('autopay');
    expect(result.data.autopayBalanceCents).toBe(0);
  });

  it('defaults missing v2 sections to empty', () => {
    const result = parseBackup(
      JSON.stringify({ app: 'budgetize-me', version: 2, data: { bills: [] } }),
    );
    expect(result).toEqual({ ok: true, data: emptyBudget() });
  });
});

describe('parseBudgetData', () => {
  it('accepts a budget payload loaded from the server', () => {
    expect(parseBudgetData(JSON.parse(JSON.stringify(sample)))).toEqual({ ok: true, data: sample });
  });

  it('rejects a missing payload', () => {
    expect(parseBudgetData(undefined)).toEqual({ ok: false, error: 'Budget data is missing.' });
  });

  it('rejects a payload with an invalid bill', () => {
    const result = parseBudgetData({ bills: [{ name: 'Rent', amountCents: -1, dueDay: 1 }] });

    expect(result.ok).toBe(false);
  });
});
