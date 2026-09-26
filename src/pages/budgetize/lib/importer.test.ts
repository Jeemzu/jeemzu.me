import { describe, expect, it } from 'vitest';
import { read, utils, write } from 'xlsx';
import type { CellGrid, WorkbookGrids } from './importer';
import {
  analyzeWorkbook,
  buildTemplateWorkbook,
  classifyIncomeSheet,
  columnLetter,
  detectDebtMapping,
  detectIncomeMapping,
  detectMapping,
  extractBills,
  extractDebts,
  extractIncomes,
  parseDueDay,
  readWorkbook,
} from './importer';

/** Mirrors the real "Payable Accounts & Regular Bill" sheet: two side-by-side tables. */
const workbookLikeGrid: CellGrid = [
  ['Name', 'Due Date', 'Current Balance', 'Min. Monthly Payment', 'Current Interest Rate', 'Has Promotion', 'Promotion End Date', 'Interest Rate After Promotion', 'Suggested Monthly Payment', null, 'Name', 'Monthly Payment', 'Due Date', null],
  ['Raymour & Flanigan', 13, 1822.61, 179, 0, 1, '5/18/2027', 0.2999, 260.37, null, 'Rent', 3250, 1, null],
  ['Bank of America', null, null, null, null, 0, null, null, null, null, 'Electric', 300, 1, null],
  ['CitiBank', 16, 7920.46, 72.84, 0, 1, '3/1/2027', 0.2949, 1584.09, null, 'Water', 20, null, null],
  ['Best Buy', 1, 3536.82, 77, 0, 1, '4/01/2027', 0.2999, 589.47, null, 'Garbage', 37.23, null, null],
  ['Capital One', 1, 5023.99, 120, 0, 1, '11/19/2026', 0.2874, 5023.99, null, 'James Therapy1', null, 6, null],
  [null, null, null, null, null, null, null, null, null, null, 'Spectrum', 90, 21, null],
  [null, null, null, null, null, null, null, null, null, null, null, null, null, null],
  [null, null, 'Total Balance', 'Total Min. Monthly Payment', null, null, null, null, null, null, null, 'Total Monthly Bills', null, null],
  [null, null, 170516.13, 2379.41, null, null, null, null, null, null, null, 4357.23, null, null],
];

describe('detectMapping', () => {
  it('finds the bills table among side-by-side tables with duplicate headers', () => {
    const mapping = detectMapping(workbookLikeGrid);
    expect(mapping).toEqual({
      headerRow: 0,
      nameCol: 10,
      amountCol: 11,
      dueDayCol: 12,
      categoryCol: null,
    });
  });

  it('maps the bundled template', () => {
    const grids = readWorkbook(buildTemplateWorkbook());
    expect(grids.sheetNames).toEqual(['Bills']);
    const mapping = detectMapping(grids.grids.Bills);
    expect(mapping).toEqual({
      headerRow: 0,
      nameCol: 0,
      amountCol: 1,
      dueDayCol: 2,
      categoryCol: 3,
    });
  });

  it('returns null when nothing maps', () => {
    expect(detectMapping([['just', 'words'], [1, 2]])).toBeNull();
    expect(detectMapping([])).toBeNull();
  });
});

describe('extractBills', () => {
  const mapping = detectMapping(workbookLikeGrid)!;

  it('imports valid rows, warns on missing due days, errors on missing amounts', () => {
    const { bills, reports } = extractBills(workbookLikeGrid, mapping);

    expect(bills.map((b) => [b.name, b.amountCents, b.dueDay])).toEqual([
      ['Rent', 325000, 1],
      ['Electric', 30000, 1],
      ['Water', 2000, 1],
      ['Garbage', 3723, 1],
      ['Spectrum', 9000, 21],
    ]);

    const water = reports.find((r) => r.name === 'Water');
    expect(water?.status).toBe('warning');
    expect(water?.message).toContain('defaulted');

    const therapy = reports.find((r) => r.name === 'James Therapy1');
    expect(therapy?.status).toBe('error');
    expect(therapy?.message).toContain('Amount');
    expect(therapy?.rowNumber).toBe(6);
  });

  it('skips blank spacer rows and totals rows silently', () => {
    const { reports } = extractBills(workbookLikeGrid, mapping);
    expect(reports).toHaveLength(6); // 5 bills + 1 error, no totals noise
  });

  it('extracts categories when mapped', () => {
    const grid: CellGrid = [
      ['Bill Name', 'Monthly Amount', 'Due Day', 'Category'],
      ['Rent', 1500, 1, 'Housing'],
      ['Netflix', '$15.49', 12, null],
    ];
    const { bills } = extractBills(grid, { headerRow: 0, nameCol: 0, amountCol: 1, dueDayCol: 2, categoryCol: 3 });
    expect(bills).toHaveLength(2);
    expect(bills[0].category).toBe('Housing');
    expect(bills[1].category).toBe('');
    expect(bills[1].amountCents).toBe(1549);
  });

  it('reports rows with amounts but no name', () => {
    const grid: CellGrid = [
      ['Bill Name', 'Monthly Amount', 'Due Day'],
      [null, 42, 3],
    ];
    const { bills, reports } = extractBills(grid, { headerRow: 0, nameCol: 0, amountCol: 1, dueDayCol: 2, categoryCol: null });
    expect(bills).toHaveLength(0);
    expect(reports[0]).toMatchObject({ status: 'error', message: 'Missing bill name.' });
  });

  it('errors on out-of-range or non-numeric due days', () => {
    const grid: CellGrid = [
      ['Bill Name', 'Monthly Amount', 'Due Day'],
      ['A', 10, 32],
      ['B', 10, 'next tuesday'],
    ];
    const { bills, reports } = extractBills(grid, { headerRow: 0, nameCol: 0, amountCol: 1, dueDayCol: 2, categoryCol: null });
    expect(bills).toHaveLength(0);
    expect(reports.every((r) => r.status === 'error')).toBe(true);
  });
});

describe('parseDueDay', () => {
  it('accepts integers and float-formatted integers 1-31', () => {
    expect(parseDueDay(13)).toBe(13);
    expect(parseDueDay(13.0)).toBe(13);
    expect(parseDueDay('13')).toBe(13);
    expect(parseDueDay('13.0')).toBe(13);
    expect(parseDueDay(1)).toBe(1);
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

describe('detectDebtMapping', () => {
  it('maps the debts side of the real workbook layout', () => {
    expect(detectDebtMapping(workbookLikeGrid)).toEqual({
      headerRow: 0,
      nameCol: 0,
      balanceCol: 2,
      minPaymentCol: 3,
      dueDayCol: 1,
      promoCol: 5,
      suggestedCol: 8,
    });
  });

  it('returns null when there is no balance/min-payment pair', () => {
    const grids = readWorkbook(buildTemplateWorkbook());
    expect(detectDebtMapping(grids.grids.Bills)).toBeNull();
  });
});

describe('extractDebts', () => {
  const mapping = detectDebtMapping(workbookLikeGrid)!;

  it('imports debt rows with promo flags and skips data-less accounts', () => {
    const { debts, reports } = extractDebts(workbookLikeGrid, mapping);

    expect(debts.map((d) => [d.name, d.balanceCents, d.minPaymentCents, d.suggestedPaymentCents, d.hasPromotion, d.dueDay])).toEqual([
      ['Raymour & Flanigan', 182261, 17900, 26037, true, 13],
      ['CitiBank', 792046, 7284, 158409, true, 16],
      ['Best Buy', 353682, 7700, 58947, true, 1],
      ['Capital One', 502399, 12000, 502399, true, 1],
    ]);

    const boa = reports.find((r) => r.name === 'Bank of America');
    expect(boa?.status).toBe('warning');
    expect(boa?.message).toContain('skipped');
    // 4 imported + 1 skipped; totals rows stay silent.
    expect(reports).toHaveLength(5);
  });

  it('defaults missing minimum payment and due day with a warning', () => {
    const grid: CellGrid = [
      ['Name', 'Due Date', 'Current Balance', 'Min. Monthly Payment', 'Has Promotion', 'Suggested Monthly Payment'],
      ['Aidvantage', null, 28246.32, null, false, null],
    ];
    const { debts, reports } = extractDebts(grid, detectDebtMapping(grid)!);
    expect(debts).toEqual([
      expect.objectContaining({
        name: 'Aidvantage',
        balanceCents: 2824632,
        minPaymentCents: 0,
        suggestedPaymentCents: null,
        hasPromotion: false,
        dueDay: 1,
      }),
    ]);
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

/** Mirrors the real income sheets: month rows, per-person paycheck columns. */
const incomeGrid: CellGrid = [
  ['Month', 'Courtney Deposit Amount per Paycheck', 'James Deposit Amount per Paycheck', 'Courtney Paychecks per Month', 'James Paychecks per Month', 'Courtney Deposit Amount per Month', 'James Deposit Amount per Month', 'Household Monthly Net Income'],
  ['January', 0, '$0.00', 3, 5, 0, 0, 0],
  ['February', 0, 0, 2, 4, 0, 0, 0],
  ['September', 105.23, 163.93, 1, 1, 105.23, 163.93, 269.16],
  ['October', 105.23, 163.93, 4, 4, 420.92, 655.72, 1076.64],
  [null, null, null, null, null, 1473.22, 2295.02, 3768.24],
];

describe('income sheets', () => {
  it('classifies sheets by name', () => {
    expect(classifyIncomeSheet('Monthly Income Personal')).toBe('personal');
    expect(classifyIncomeSheet('Monthly Income Essential')).toBe('essentials');
    expect(classifyIncomeSheet('Payable Accounts & Regular Bills')).toBeNull();
  });

  it('detects per-person paycheck columns and names', () => {
    expect(detectIncomeMapping(incomeGrid)).toEqual({
      headerRow: 0,
      personCols: [
        { name: 'Courtney', col: 1 },
        { name: 'James', col: 2 },
      ],
    });
    expect(detectIncomeMapping(workbookLikeGrid)).toBeNull();
  });

  it('takes each person\u2019s first non-zero amount', () => {
    expect(extractIncomes(incomeGrid, detectIncomeMapping(incomeGrid)!)).toEqual([
      { name: 'Courtney', perPaycheckCents: 10523 },
      { name: 'James', perPaycheckCents: 16393 },
    ]);
  });

  it('falls back to zero when a column never has a value', () => {
    const zeros: CellGrid = [
      ['Month', 'Courtney Deposit Amount per Paycheck'],
      ['January', 0],
      ['February', '$0.00'],
    ];
    expect(extractIncomes(zeros, detectIncomeMapping(zeros)!)).toEqual([
      { name: 'Courtney', perPaycheckCents: 0 },
    ]);
  });
});

describe('analyzeWorkbook', () => {
  it('finds bills, debts, and merged people across the real sheet layout', () => {
    const essentialsGrid: CellGrid = [
      ['Month', 'Courtney Deposit Amount per Paycheck', 'James Deposit Amount per Paycheck'],
      ['January', 0, 0],
      ['September', 400, 1900],
    ];
    const workbook: WorkbookGrids = {
      sheetNames: ['Payable Accounts & Regular Bills', 'Monthly Income Personal', 'Monthly Income Essential'],
      grids: {
        'Payable Accounts & Regular Bills': workbookLikeGrid,
        'Monthly Income Personal': incomeGrid,
        'Monthly Income Essential': essentialsGrid,
      },
    };
    const analysis = analyzeWorkbook(workbook);

    expect(analysis.bills?.sheet).toBe('Payable Accounts & Regular Bills');
    expect(analysis.bills?.extraction.bills).toHaveLength(5);
    expect(analysis.debts?.sheet).toBe('Payable Accounts & Regular Bills');
    expect(analysis.debts?.extraction.debts).toHaveLength(4);
    expect(analysis.personalIncome?.sheet).toBe('Monthly Income Personal');
    expect(analysis.essentialsIncome?.sheet).toBe('Monthly Income Essential');
    expect(analysis.people).toEqual([
      { name: 'Courtney', personalPerPaycheckCents: 10523, essentialsPerPaycheckCents: 40000 },
      { name: 'James', personalPerPaycheckCents: 16393, essentialsPerPaycheckCents: 190000 },
    ]);
  });

  it('never treats income sheets as bill tables', () => {
    const workbook: WorkbookGrids = {
      sheetNames: ['Monthly Income Personal'],
      grids: { 'Monthly Income Personal': incomeGrid },
    };
    const analysis = analyzeWorkbook(workbook);
    expect(analysis.bills).toBeNull();
    expect(analysis.debts).toBeNull();
    expect(analysis.people).toEqual([
      { name: 'Courtney', personalPerPaycheckCents: 10523, essentialsPerPaycheckCents: 0 },
      { name: 'James', personalPerPaycheckCents: 16393, essentialsPerPaycheckCents: 0 },
    ]);
  });
});
