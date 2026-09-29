import { describe, expect, it } from 'vitest';
import { read, utils, write } from 'xlsx';
import type { CellGrid, WorkbookGrids } from './importer';
import {
  analyzeWorkbook,
  buildTemplateWorkbook,
  columnLetter,
  detectDebtMapping,
  detectIncomeMapping,
  detectMapping,
  extractBills,
  extractDebts,
  extractIncome,
  findTableRegions,
  parseDueDay,
  parseMonthIndex,
  parsePercentBps,
  parseSheetDate,
  readWorkbook,
} from './importer';

/**
 * Mirrors the real "Payable Accounts & Regular Bills" sheet: a Payable Accounts
 * table on top and, below it, Regular Bills and Totals side by side. Each table
 * carries a banner row above its header and closes with an unlabelled totals row.
 */
const accountsSheet: CellGrid = [
  ['Payable Accounts', null, null, null, null, null, null, null, null],
  ['Name', 'Due Date', 'Current Balance', 'Min. Monthly Payment', 'Current Interest Rate', 'Has Promotion', 'Promotion End Date', 'Interest Rate After Promotion', 'Suggested Monthly Payment'],
  ['Chase Freedom Unlimited', 9, 8258.7, 77, 0.2774, false, null, null, 77],
  ['Courtney Freedom Card', 8, 2595.2, 75, 0, true, '6/1/2027', 0.28, 75],
  ['Bank of America', null, null, null, null, false, null, null, null],
  ['HVCU Car Loan', 25, 14331.12, 413.62, 0.0499, false, null, null, 413.62],
  [null, null, 179111.33, 2572.77, null, null, null, null, 9794.38],
  [null, null, null, null, null, null, null, null, null],
  [null, null, 'Total Credit Card Balance', null, null, null, null, null, null],
  [null, null, 38960.64, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null, null],
  ['Regular Bills', null, null, null, null, 'Totals', null, null, null],
  ['Name', 'Monthly Payment', 'Due Date', null, null, 'Cost Category', 'Amount', null, null],
  ['Rent', 3250, 1, null, null, 'Credit Card Balance', 32960.64, null, null],
  ['Electric', 300, 1, null, null, 'Debt Balance', 179111.33, null, null],
  ['Water', 20, null, null, null, 'Minimum Autopay/month', 3047, null, null],
  ['James Therapy', null, 6, null, null, 'Essential/month', 3870, null, null],
  ['Spectrum', 90, 21, null, null, null, null, null, null],
  [null, 4344.23, null, null, null, null, null, null, null],
];

describe('findTableRegions', () => {
  it('finds stacked and side-by-side tables with their own bounds', () => {
    const regions = findTableRegions(accountsSheet).map((r) => [
      r.title,
      r.headerRow,
      r.startCol,
      r.endCol,
      r.bodyEndRow,
    ]);
    expect(regions).toContainEqual(['Payable Accounts', 1, 0, 8, 7]);
    expect(regions).toContainEqual(['Regular Bills', 12, 0, 2, 19]);
    expect(regions).toContainEqual(['Totals', 12, 5, 6, 17]);
  });
});

describe('detectMapping', () => {
  it('finds the Regular Bills table and ignores the accounts and totals tables', () => {
    expect(detectMapping(accountsSheet)).toEqual({
      headerRow: 12,
      bodyEndRow: 19,
      nameCol: 0,
      amountCol: 1,
      dueDayCol: 2,
    });
  });

  it('maps the bundled template', () => {
    const grids = readWorkbook(buildTemplateWorkbook());
    expect(grids.sheetNames).toEqual(['Payable Accounts', 'Regular Bills', 'Monthly Income']);
    expect(detectMapping(grids.grids['Regular Bills'])).toEqual({
      headerRow: 0,
      bodyEndRow: 4,
      nameCol: 0,
      amountCol: 1,
      dueDayCol: 2,
    });
  });

  it('returns null when nothing maps', () => {
    expect(detectMapping([['just', 'words'], [1, 2]])).toBeNull();
    expect(detectMapping([])).toBeNull();
  });
});

describe('extractBills', () => {
  const mapping = detectMapping(accountsSheet)!;

  it('imports valid rows, warns on missing due days, errors on missing amounts', () => {
    const { bills, reports } = extractBills(accountsSheet, mapping);

    expect(bills.map((b) => [b.name, b.amountCents, b.dueDay])).toEqual([
      ['Rent', 325000, 1],
      ['Electric', 30000, 1],
      ['Water', 2000, 1],
      ['Spectrum', 9000, 21],
    ]);

    const water = reports.find((r) => r.name === 'Water');
    expect(water?.status).toBe('warning');
    expect(water?.message).toContain('defaulted');

    const therapy = reports.find((r) => r.name === 'James Therapy');
    expect(therapy?.status).toBe('error');
    expect(therapy?.message).toContain('Amount');
  });

  it('stops at the unlabelled totals row instead of importing it', () => {
    const { reports } = extractBills(accountsSheet, mapping);
    expect(reports).toHaveLength(5); // 4 bills + 1 error, no totals noise
    expect(reports.some((r) => r.name === '(blank)')).toBe(false);
  });

  it('errors on out-of-range or non-numeric due days', () => {
    const grid: CellGrid = [
      ['Bill Name', 'Monthly Amount', 'Due Day'],
      ['A', 10, 32],
      ['B', 10, 'next tuesday'],
    ];
    const { bills, reports } = extractBills(grid, detectMapping(grid)!);
    expect(bills).toHaveLength(0);
    expect(reports.every((r) => r.status === 'error')).toBe(true);
  });
});

describe('parseDueDay', () => {
  it('accepts integers and float-formatted integers 1-31', () => {
    expect(parseDueDay(13)).toBe(13);
    expect(parseDueDay('13.0')).toBe(13);
    expect(parseDueDay(31)).toBe(31);
  });

  it('rejects out-of-range and non-day values', () => {
    expect(parseDueDay(0)).toBeNull();
    expect(parseDueDay(32)).toBeNull();
    expect(parseDueDay(13.5)).toBeNull();
    expect(parseDueDay('5/18/2027')).toBeNull();
    expect(parseDueDay(null)).toBeNull();
  });
});

describe('parsePercentBps', () => {
  it('reads fractions, percent strings, and plain percentages', () => {
    expect(parsePercentBps(0.2774)).toBe(2774);
    expect(parsePercentBps('27.74%')).toBe(2774);
    expect(parsePercentBps(27.74)).toBe(2774);
    expect(parsePercentBps(0)).toBe(0);
    expect(parsePercentBps('0.00%')).toBe(0);
  });

  it('returns null for empty or unparseable cells', () => {
    expect(parsePercentBps(null)).toBeNull();
    expect(parsePercentBps('')).toBeNull();
    expect(parsePercentBps('n/a')).toBeNull();
  });
});

describe('parseSheetDate', () => {
  it('reads dates from cells and common text formats', () => {
    expect(parseSheetDate(new Date(2027, 5, 1))).toBe('2027-06-01');
    expect(parseSheetDate('6/1/2027')).toBe('2027-06-01');
    expect(parseSheetDate('2027-06-01')).toBe('2027-06-01');
    expect(parseSheetDate(null)).toBeNull();
    expect(parseSheetDate('soon')).toBeNull();
  });
});

describe('parseMonthIndex', () => {
  it('reads names, abbreviations, and 1-12', () => {
    expect(parseMonthIndex('January')).toBe(0);
    expect(parseMonthIndex('dec')).toBe(11);
    expect(parseMonthIndex('Sept.')).toBeNull();
    expect(parseMonthIndex(3)).toBe(2);
    expect(parseMonthIndex('12')).toBe(11);
    expect(parseMonthIndex(0)).toBeNull();
    expect(parseMonthIndex('nope')).toBeNull();
  });
});

describe('detectDebtMapping', () => {
  it('maps every column of the Payable Accounts table', () => {
    expect(detectDebtMapping(accountsSheet)).toEqual({
      headerRow: 1,
      bodyEndRow: 7,
      nameCol: 0,
      balanceCol: 2,
      minPaymentCol: 3,
      dueDayCol: 1,
      promoCol: 5,
      suggestedCol: 8,
      rateCol: 4,
      promoEndCol: 6,
      postPromoRateCol: 7,
    });
  });

  it('returns null when there is no balance/min-payment pair', () => {
    const grids = readWorkbook(buildTemplateWorkbook());
    expect(detectDebtMapping(grids.grids['Regular Bills'])).toBeNull();
  });
});

describe('extractDebts', () => {
  const mapping = detectDebtMapping(accountsSheet)!;

  it('imports rates, promo dates, and skips data-less accounts', () => {
    const { debts, reports } = extractDebts(accountsSheet, mapping);

    expect(
      debts.map((d) => [
        d.name,
        d.balanceCents,
        d.minPaymentCents,
        d.hasPromotion,
        d.interestRateBps,
        d.promoEndISO,
        d.postPromoRateBps,
        d.dueDay,
      ]),
    ).toEqual([
      ['Chase Freedom Unlimited', 825870, 7700, false, 2774, null, null, 9],
      ['Courtney Freedom Card', 259520, 7500, true, 0, '2027-06-01', 2800, 8],
      ['HVCU Car Loan', 1433112, 41362, false, 499, null, null, 25],
    ]);

    const boa = reports.find((r) => r.name === 'Bank of America');
    expect(boa?.status).toBe('warning');
    expect(boa?.message).toContain('skipped');
    // 3 imported + 1 skipped; the totals row is never reported.
    expect(reports).toHaveLength(4);
  });

  it('defaults missing minimum payment and due day with a warning', () => {
    const grid: CellGrid = [
      ['Name', 'Due Date', 'Current Balance', 'Min. Monthly Payment', 'Has Promotion', 'Suggested Monthly Payment'],
      ['Aidvantage', null, 28246.32, null, false, null],
    ];
    const { debts, reports } = extractDebts(grid, detectDebtMapping(grid)!);
    expect(debts[0]).toMatchObject({
      name: 'Aidvantage',
      balanceCents: 2824632,
      minPaymentCents: 0,
      suggestedPaymentCents: null,
      hasPromotion: false,
      interestRateBps: null,
      promoEndISO: null,
      dueDay: 1,
    });
    expect(reports[0].status).toBe('warning');
  });

  it('parses checkbox-style promotion cells', () => {
    const grid: CellGrid = [
      ['Name', 'Due Date', 'Current Balance', 'Min. Monthly Payment', 'Has Promotion', 'Suggested Monthly Payment'],
      ['A', 1, 100, 10, true, 50],
      ['B', 1, 100, 10, 'TRUE', 50],
      ['C', 1, 100, 10, 0, 50],
      ['D', 1, 100, 10, null, 50],
    ];
    const { debts } = extractDebts(grid, detectDebtMapping(grid)!);
    expect(debts.map((d) => d.hasPromotion)).toEqual([true, true, false, false]);
  });
});

/** Mirrors the real "Monthly Income" sheet, spanning the tail of 2026 into 2027. */
const incomeSheet: CellGrid = [
  ['Gross Income', null, null, null, null, null, null, null],
  ['Year', 'Month', 'Courtney Deposit Amount per Paycheck', 'James Deposit Amount per Paycheck', 'Paychecks per Month', 'Courtney Deposit Amount per Month', 'James Deposit Amount per Month', 'Household Monthly Net Income'],
  [2026, 'October', 561.87, 2063.96, 4, 2247.48, 8255.84, 10503.32],
  [2026, 'November', 561.87, 2063.96, 4, 2247.48, 8255.84, 10503.32],
  [2026, 'December', 561.87, 2063.96, 5, 2809.35, 10319.8, 13129.15],
  [2027, 'January', 561.87, 2063.96, 4, 2247.48, 8255.84, 10503.32],
];

describe('income table', () => {
  it('maps year, month, paycheck count, and per-person columns only', () => {
    expect(detectIncomeMapping(incomeSheet)).toEqual({
      headerRow: 1,
      bodyEndRow: 6,
      yearCol: 0,
      monthCol: 1,
      paycheckCountCol: 4,
      personCols: [
        { name: 'Courtney', col: 2 },
        { name: 'James', col: 3 },
      ],
    });
    expect(detectIncomeMapping(accountsSheet)).toBeNull();
  });

  it('builds one schedule entry per row per person across years', () => {
    const { people, months, reports } = extractIncome(
      incomeSheet,
      detectIncomeMapping(incomeSheet)!,
    );

    expect(months).toEqual([
      { year: 2026, month: 9 },
      { year: 2026, month: 10 },
      { year: 2026, month: 11 },
      { year: 2027, month: 0 },
    ]);
    expect(people.map((p) => p.name)).toEqual(['Courtney', 'James']);
    expect(people[0].schedule).toEqual([
      { year: 2026, month: 9, paycheckCount: 4, perPaycheckCents: 56187 },
      { year: 2026, month: 10, paycheckCount: 4, perPaycheckCents: 56187 },
      { year: 2026, month: 11, paycheckCount: 5, perPaycheckCents: 56187 },
      { year: 2027, month: 0, paycheckCount: 4, perPaycheckCents: 56187 },
    ]);
    expect(people[1].schedule[0].perPaycheckCents).toBe(206396);
    expect(reports.every((r) => r.status === 'ok')).toBe(true);
  });

  it('falls back to the Wednesday calendar when the count column is absent', () => {
    const grid: CellGrid = [
      ['Year', 'Month', 'A Deposit Amount per Paycheck'],
      [2026, 'December', 100],
    ];
    const { people } = extractIncome(grid, detectIncomeMapping(grid)!);
    expect(people[0].schedule[0].paycheckCount).toBe(5);
  });

  it('warns when the sheet count disagrees with the calendar', () => {
    const grid: CellGrid = [
      ['Year', 'Month', 'A Deposit Amount per Paycheck', 'Paychecks per Month'],
      [2026, 'December', 100, 4],
    ];
    const { people, reports } = extractIncome(grid, detectIncomeMapping(grid)!);
    expect(people[0].schedule[0].paycheckCount).toBe(4);
    expect(reports[0].status).toBe('warning');
    expect(reports[0].message).toContain('Wednesday calendar has 5');
  });

  it('errors on unusable years, months, and paycheck counts', () => {
    const grid: CellGrid = [
      ['Year', 'Month', 'A Deposit Amount per Paycheck', 'Paychecks per Month'],
      ['soon', 'January', 100, 4],
      [2027, 'Smarch', 100, 4],
      [2027, 'January', 100, 99],
    ];
    const { people, reports } = extractIncome(grid, detectIncomeMapping(grid)!);
    expect(people[0].schedule).toEqual([]);
    expect(reports.map((r) => r.status)).toEqual(['error', 'error', 'error']);
    expect(reports[0].message).toContain('Year');
    expect(reports[1].message).toContain('Month');
    expect(reports[2].message).toContain('Paychecks per month');
  });
});

describe('analyzeWorkbook', () => {
  it('finds bills, debts, and income across the real sheet layout', () => {
    const workbook: WorkbookGrids = {
      sheetNames: ['Payable Accounts & Regular Bills', 'Monthly Income'],
      grids: {
        'Payable Accounts & Regular Bills': accountsSheet,
        'Monthly Income': incomeSheet,
      },
    };
    const analysis = analyzeWorkbook(workbook);

    expect(analysis.bills?.sheet).toBe('Payable Accounts & Regular Bills');
    expect(analysis.bills?.extraction.bills).toHaveLength(4);
    expect(analysis.debts?.sheet).toBe('Payable Accounts & Regular Bills');
    expect(analysis.debts?.extraction.debts).toHaveLength(3);
    expect(analysis.income?.sheet).toBe('Monthly Income');
    expect(analysis.income?.extraction.months).toHaveLength(4);
    expect(analysis.people.map((p) => [p.name, p.schedule.length])).toEqual([
      ['Courtney', 4],
      ['James', 4],
    ]);
  });

  it('never treats the income table as a bills or debts table', () => {
    const analysis = analyzeWorkbook({
      sheetNames: ['Monthly Income'],
      grids: { 'Monthly Income': incomeSheet },
    });
    expect(analysis.bills).toBeNull();
    expect(analysis.debts).toBeNull();
    expect(analysis.people).toHaveLength(2);
  });
});

describe('readWorkbook roundtrip', () => {
  it('reads a generated workbook back into grids', () => {
    const ws = utils.aoa_to_sheet([
      ['Name', 'Monthly Payment', 'Due Date'],
      ['Rent', 3250, 1],
    ]);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;

    const grids = readWorkbook(buffer);
    expect(grids.sheetNames).toEqual(['Sheet1']);
    expect(grids.grids.Sheet1[1]).toEqual(['Rent', 3250, 1]);

    // sanity: xlsx read API used the same way the app does
    const wb2 = read(buffer, { type: 'array' });
    expect(wb2.SheetNames).toEqual(['Sheet1']);
  });
});

describe('columnLetter', () => {
  it('produces spreadsheet column labels', () => {
    expect(columnLetter(0)).toBe('A');
    expect(columnLetter(11)).toBe('L');
    expect(columnLetter(25)).toBe('Z');
    expect(columnLetter(26)).toBe('AA');
  });
});
