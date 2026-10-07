import { describe, expect, it } from 'vitest';
import { read, utils } from 'xlsx';
import { buildExportSheets, buildExportWorkbook } from './spreadsheetExport';
import { bill, debt, paidPerson } from '../testFixtures';
import { emptyBudget } from '../types';
import type { BudgetData } from '../types';

const asOf = new Date(2026, 0, 1);

function sample(): BudgetData {
  return {
    ...emptyBudget(),
    people: [paidPerson('Alex', 2026, 2000_00, { personalBalanceCents: 150_00 })],
    bills: [bill({ name: 'Rent', amountCents: 1500_00, dueDay: 1 })],
    debts: [
      debt({ name: 'Big', minPaymentCents: 100_00, balanceCents: 10_000_00, interestRateBps: 2500 }),
      debt({ name: 'Small', minPaymentCents: 25_00, balanceCents: 500_00, interestRateBps: 1999 }),
    ],
    overrides: [
      {
        id: 'o1',
        targetKind: 'bill',
        targetId: 'Rent',
        fromISO: '2026-02-01',
        toISO: '2026-02-28',
        mode: 'skip',
        amountCents: null,
        note: 'Prepaid',
      },
    ],
  };
}

describe('buildExportSheets', () => {
  it('exports locked per-paycheck amounts as dollars, with null for unlocked accounts', () => {
    const data = sample();
    data.people[0].autopayLockedPerPaycheckCents = 0;
    data.people[0].essentialsLockedPerPaycheckCents = 12345;
    const accounts = buildExportSheets(data, asOf)[0].rows;
    expect(accounts).toContainEqual(['Alex locked per-paycheck auto-pay', 0]);
    expect(accounts).toContainEqual(['Alex locked per-paycheck essentials', 123.45]);
  });
  it('exports every table with dollar amounts and resolved names', () => {
    const sheets = Object.fromEntries(buildExportSheets(sample(), asOf).map((s) => [s.name, s.rows]));

    expect(Object.keys(sheets)).toEqual(['Accounts', 'Income', 'Bills', 'Debts', 'Schedule changes', 'One-time']);
    expect(sheets.Income).toHaveLength(13);
    expect(sheets.Bills[1]).toEqual(['Rent', 'Bill', 1500, 1, 'monthly', null, null, null, 'Essentials']);
    expect(sheets.Debts.slice(1).map((row) => [row[0], row[1], row[2]])).toEqual([
      [1, 'Small', 500],
      [2, 'Big', 10000],
    ]);
    expect(sheets['Schedule changes'][1]).toEqual(['Rent', 'bill', '2026-02-01', '2026-02-28', 'Skip', null, 'Prepaid']);
  });

  it('writes a workbook that reads back', () => {
    const wb = read(buildExportWorkbook(sample(), asOf), { type: 'array' });
    expect(wb.SheetNames).toContain('Debts');
    expect(utils.sheet_to_json(wb.Sheets.Bills)).toHaveLength(1);
  });
});
