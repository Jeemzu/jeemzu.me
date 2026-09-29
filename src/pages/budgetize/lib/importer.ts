import { read, utils, write } from 'xlsx';
import type { Bill, DebtAccount, ImportedPerson, MonthlyIncome, MonthRef } from '../types';
import { compareMonthlyIncome, monthlyRecurrence } from '../types';
import { parseMoney } from './money';
import { getPaydays } from './paydays';

export type CellValue = string | number | boolean | Date | null;
export type CellGrid = CellValue[][];

export interface WorkbookGrids {
  sheetNames: string[];
  grids: Record<string, CellGrid>;
}

/**
 * A rectangular block whose header row is a run of adjacent labels. Sheets hold
 * several of these side by side and stacked, so every mapping carries its own
 * row and column bounds instead of assuming it owns the sheet.
 */
export interface TableRegion {
  /** 0-based header row index. */
  headerRow: number;
  /** 0-based inclusive column bounds of the header run. */
  startCol: number;
  endCol: number;
  /** 0-based exclusive end of the body. */
  bodyEndRow: number;
  /** Header text keyed by absolute column index; '' outside the run. */
  headers: string[];
  /** Label from the single-cell row directly above, when there is one. */
  title: string;
}

export interface ColumnMapping {
  headerRow: number;
  bodyEndRow: number;
  nameCol: number;
  amountCol: number;
  dueDayCol: number | null;
}

export interface DebtColumnMapping {
  headerRow: number;
  bodyEndRow: number;
  nameCol: number;
  balanceCol: number;
  minPaymentCol: number;
  dueDayCol: number | null;
  promoCol: number | null;
  suggestedCol: number | null;
  rateCol: number | null;
  promoEndCol: number | null;
  postPromoRateCol: number | null;
}

export interface IncomeColumnMapping {
  headerRow: number;
  bodyEndRow: number;
  yearCol: number;
  monthCol: number;
  paycheckCountCol: number | null;
  /** One column per person, e.g. "Courtney Deposit Amount per Paycheck". */
  personCols: { name: string; col: number }[];
}

export interface RowReport {
  /** 1-based row number as shown in Excel. */
  rowNumber: number;
  name: string;
  status: 'ok' | 'warning' | 'error';
  message: string;
}

export interface ImportExtraction {
  bills: Bill[];
  reports: RowReport[];
}

export interface DebtExtraction {
  debts: DebtAccount[];
  reports: RowReport[];
}

export interface IncomeExtraction {
  people: ImportedPerson[];
  months: MonthRef[];
  reports: RowReport[];
}

export function readWorkbook(buffer: ArrayBuffer): WorkbookGrids {
  const wb = read(buffer, { type: 'array' });
  const grids: Record<string, CellGrid> = {};
  for (const name of wb.SheetNames) {
    grids[name] = utils.sheet_to_json<CellValue[]>(wb.Sheets[name], { header: 1, defval: null });
  }
  return { sheetNames: wb.SheetNames, grids };
}

export function gridColumnCount(grid: CellGrid): number {
  return Math.min(
    grid.reduce((max, row) => Math.max(max, row.length), 0),
    40,
  );
}

export function columnLetter(index: number): string {
  let label = '';
  let n = index;
  do {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return label;
}

function cellText(value: CellValue | undefined): string {
  if (value == null) return '';
  if (value instanceof Date) return value.toLocaleDateString('en-US');
  return String(value).trim();
}

const AMOUNT_EXCLUDE = /min\.?|suggested|balance|interest|total|rate|deposit/i;
const AMOUNT_MATCH = /amount|payment|cost|price/i;
const AMOUNT_EXACT = /^(monthly\s+)?(payment|amount|bill|cost)s?$/i;
const NAME_MATCH = /name|bill|payee|description|account/i;
const NAME_EXCLUDE = /rate|date|amount|payment|balance|category/i;
const DUE_MATCH = /due/i;
const BALANCE_MATCH = /balance/i;
const MIN_PAYMENT_MATCH = /min\.?(imum)?\s.*payment/i;
const PROMO_MATCH = /promotion/i;
const PROMO_EXCLUDE = /end|date|rate|after/i;
const PROMO_END_MATCH = /promotion\s+end/i;
const SUGGESTED_MATCH = /suggested/i;
const RATE_MATCH = /interest\s+rate/i;
const RATE_AFTER_MATCH = /after/i;
const TOTAL_EXCLUDE = /total/i;
const INCOME_PERSON_MATCH = /^(.+?)\s+deposit\s+amount\s+per\s+paycheck$/i;
const YEAR_MATCH = /^year$/i;
const MONTH_MATCH = /^month$/i;
const PAYCHECK_COUNT_MATCH = /paychecks?\s+per\s+month/i;

function pickNearest(texts: string[], match: RegExp, anchor: number, exclude?: RegExp): number | null {
  let best: number | null = null;
  for (let i = 0; i < texts.length; i++) {
    const text = texts[i];
    if (!text || !match.test(text) || (exclude && exclude.test(text))) continue;
    if (best === null || Math.abs(i - anchor) < Math.abs(best - anchor)) best = i;
  }
  return best;
}

function pickAmountColumn(texts: string[]): number | null {
  let fallback: number | null = null;
  for (let i = 0; i < texts.length; i++) {
    const text = texts[i];
    if (!text || AMOUNT_EXCLUDE.test(text) || !AMOUNT_MATCH.test(text)) continue;
    if (AMOUNT_EXACT.test(text)) return i;
    if (fallback === null) fallback = i;
  }
  return fallback;
}

function rowTexts(grid: CellGrid, row: number): string[] {
  return (grid[row] ?? []).map((cell) => (typeof cell === 'string' ? cell.trim() : ''));
}

function rowHasContent(grid: CellGrid, row: number, startCol: number, endCol: number): boolean {
  const cells = grid[row] ?? [];
  for (let c = startCol; c <= endCol; c++) {
    if (cellText(cells[c]) !== '') return true;
  }
  return false;
}

/** Runs of two or more adjacent label cells, which is what a header row looks like. */
function headerRuns(texts: string[]): [number, number][] {
  const runs: [number, number][] = [];
  let start = -1;
  for (let c = 0; c <= texts.length; c++) {
    const filled = c < texts.length && texts[c] !== '';
    if (filled && start < 0) start = c;
    if (!filled && start >= 0) {
      if (c - start >= 2) runs.push([start, c - 1]);
      start = -1;
    }
  }
  return runs;
}

/** Every candidate table on a sheet, including side-by-side and stacked blocks. */
export function findTableRegions(grid: CellGrid): TableRegion[] {
  const regions: TableRegion[] = [];
  const consumed = new Set<string>();

  for (let r = 0; r < grid.length; r++) {
    const texts = rowTexts(grid, r);
    for (const [startCol, endCol] of headerRuns(texts)) {
      if (consumed.has(`${r}:${startCol}`)) continue;
      if (!rowHasContent(grid, r + 1, startCol, endCol)) continue;

      let bodyEndRow = r + 1;
      while (bodyEndRow < grid.length && rowHasContent(grid, bodyEndRow, startCol, endCol)) {
        consumed.add(`${bodyEndRow}:${startCol}`);
        bodyEndRow++;
      }

      const headers: string[] = [];
      for (let c = 0; c <= endCol; c++) headers[c] = c >= startCol ? texts[c] : '';
      const above = r > 0 ? rowTexts(grid, r - 1).slice(startCol, endCol + 1).filter(Boolean) : [];
      regions.push({
        headerRow: r,
        startCol,
        endCol,
        bodyEndRow,
        headers,
        title: above.length === 1 ? above[0] : '',
      });
    }
  }
  return regions;
}

export function parseDueDay(raw: CellValue | undefined): number | null {
  let n: number;
  if (typeof raw === 'number') {
    n = raw;
  } else if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!/^\d+(\.0+)?$/.test(trimmed)) return null;
    n = Number(trimmed);
  } else {
    return null;
  }
  if (!Number.isInteger(n)) {
    if (Math.abs(n - Math.round(n)) > 1e-9) return null;
    n = Math.round(n);
  }
  return n >= 1 && n <= 31 ? n : null;
}

/** Percentages arrive as fractions (0.2774) or as display text ("27.74%"); both become basis points. */
export function parsePercentBps(raw: CellValue | undefined): number | null {
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw)) return null;
    return Math.round((Math.abs(raw) <= 1 ? raw * 100 : raw) * 100);
  }
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const explicit = trimmed.endsWith('%');
  const n = Number(trimmed.replace(/[%\s,]/g, ''));
  if (!Number.isFinite(n)) return null;
  return Math.round((explicit || Math.abs(n) > 1 ? n : n * 100) * 100);
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function parseSheetDate(raw: CellValue | undefined): string | null {
  if (raw instanceof Date) {
    return `${raw.getFullYear()}-${pad2(raw.getMonth() + 1)}-${pad2(raw.getDate())}`;
  }
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const slash = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  return slash ? `${slash[3]}-${pad2(Number(slash[1]))}-${pad2(Number(slash[2]))}` : null;
}

const MONTH_NAMES = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
];

/** Month name, abbreviation, or 1-12 to a 0-based index. */
export function parseMonthIndex(raw: CellValue | undefined): number | null {
  if (raw instanceof Date) return raw.getMonth();
  if (typeof raw === 'number') {
    return Number.isInteger(raw) && raw >= 1 && raw <= 12 ? raw - 1 : null;
  }
  if (typeof raw !== 'string') return null;
  const text = raw.trim().toLowerCase().replace(/\.$/, '');
  if (text === '') return null;
  if (/^\d{1,2}$/.test(text)) {
    const n = Number(text);
    return n >= 1 && n <= 12 ? n - 1 : null;
  }
  const index = MONTH_NAMES.findIndex((name) => name === text || name.slice(0, 3) === text);
  return index >= 0 ? index : null;
}

function parseYear(raw: CellValue | undefined): number | null {
  const text = cellText(raw);
  if (!/^\d{4}$/.test(text)) return null;
  const n = Number(text);
  return n >= 1900 && n <= 2999 ? n : null;
}

/** Scan a sheet for a bills table: a name and a plain payment amount, no balances. */
export function detectMapping(grid: CellGrid): ColumnMapping | null {
  for (const region of findTableRegions(grid)) {
    const mapping = billMappingFor(region);
    if (mapping) return mapping;
  }
  return null;
}

function billMappingFor(region: TableRegion): ColumnMapping | null {
  const { headers } = region;
  if (headers.some((t) => t && BALANCE_MATCH.test(t) && !TOTAL_EXCLUDE.test(t))) return null;
  const amountCol = pickAmountColumn(headers);
  if (amountCol === null) return null;
  const nameCol = pickNearest(headers, NAME_MATCH, amountCol, NAME_EXCLUDE);
  if (nameCol === null) return null;
  return {
    headerRow: region.headerRow,
    bodyEndRow: region.bodyEndRow,
    nameCol,
    amountCol,
    dueDayCol: pickNearest(headers, DUE_MATCH, amountCol),
  };
}

export function extractBills(grid: CellGrid, mapping: ColumnMapping): ImportExtraction {
  const bills: Bill[] = [];
  const reports: RowReport[] = [];
  const end = mapping.bodyEndRow ?? grid.length;

  for (let r = mapping.headerRow + 1; r < end; r++) {
    const row = grid[r] ?? [];
    const rowNumber = r + 1;
    const name = cellText(row[mapping.nameCol]);

    // Tables end in an unlabelled totals row, so a missing name means the body is over.
    if (!name || /^total/i.test(name)) break;

    const amountCents = parseMoney(row[mapping.amountCol]);
    if (amountCents === null) {
      reports.push({ rowNumber, name, status: 'error', message: 'Amount is missing or not a number.' });
      continue;
    }
    if (amountCents < 0) {
      reports.push({ rowNumber, name, status: 'error', message: 'Amount cannot be negative.' });
      continue;
    }

    let dueDay = 1;
    let status: 'ok' | 'warning' = 'ok';
    let message = 'Ready to import.';
    const dueRaw = mapping.dueDayCol === null ? null : row[mapping.dueDayCol];
    if (dueRaw == null || cellText(dueRaw) === '') {
      status = 'warning';
      message = 'No due day found — defaulted to the 1st.';
    } else {
      const parsed = parseDueDay(dueRaw);
      if (parsed === null) {
        reports.push({
          rowNumber,
          name,
          status: 'error',
          message: 'Due day must be a whole number from 1 to 31.',
        });
        continue;
      }
      dueDay = parsed;
    }

    bills.push({
      id: crypto.randomUUID(),
      name,
      amountCents,
      dueDay,
      paidFrom: 'shared',
      ...monthlyRecurrence(),
    });
    reports.push({ rowNumber, name, status, message });
  }

  return { bills, reports };
}

/** Scan a sheet for a debts table anchored on balance + minimum payment columns. */
export function detectDebtMapping(grid: CellGrid): DebtColumnMapping | null {
  for (const region of findTableRegions(grid)) {
    const mapping = debtMappingFor(region);
    if (mapping) return mapping;
  }
  return null;
}

function debtMappingFor(region: TableRegion): DebtColumnMapping | null {
  const { headers } = region;
  const balanceCol = headers.findIndex((t) => t && BALANCE_MATCH.test(t) && !TOTAL_EXCLUDE.test(t));
  if (balanceCol < 0) return null;
  const minPaymentCol = headers.findIndex(
    (t) => t && MIN_PAYMENT_MATCH.test(t) && !TOTAL_EXCLUDE.test(t),
  );
  if (minPaymentCol < 0) return null;
  const nameCol = pickNearest(headers, NAME_MATCH, balanceCol, NAME_EXCLUDE);
  if (nameCol === null) return null;
  const postPromoRateCol = headers.findIndex(
    (t) => t && RATE_MATCH.test(t) && RATE_AFTER_MATCH.test(t),
  );
  return {
    headerRow: region.headerRow,
    bodyEndRow: region.bodyEndRow,
    nameCol,
    balanceCol,
    minPaymentCol,
    dueDayCol: pickNearest(headers, DUE_MATCH, balanceCol, PROMO_END_MATCH),
    promoCol: pickNearest(headers, PROMO_MATCH, balanceCol, PROMO_EXCLUDE),
    suggestedCol: pickNearest(headers, SUGGESTED_MATCH, balanceCol),
    rateCol: pickNearest(headers, RATE_MATCH, balanceCol, RATE_AFTER_MATCH),
    promoEndCol: pickNearest(headers, PROMO_END_MATCH, balanceCol),
    postPromoRateCol: postPromoRateCol >= 0 ? postPromoRateCol : null,
  };
}

function parsePromotion(raw: CellValue | undefined): boolean {
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'number') return raw !== 0;
  if (typeof raw === 'string') return /^(true|yes|y|x|1|✓)$/i.test(raw.trim());
  return false;
}

export function extractDebts(grid: CellGrid, mapping: DebtColumnMapping): DebtExtraction {
  const debts: DebtAccount[] = [];
  const reports: RowReport[] = [];
  const end = mapping.bodyEndRow ?? grid.length;

  for (let r = mapping.headerRow + 1; r < end; r++) {
    const row = grid[r] ?? [];
    const rowNumber = r + 1;
    const name = cellText(row[mapping.nameCol]);
    if (!name || /^total/i.test(name)) break;

    const balanceCents = parseMoney(row[mapping.balanceCol]);
    const minPaymentCents = parseMoney(row[mapping.minPaymentCol]);
    if (balanceCents === null && minPaymentCents === null) {
      reports.push({
        rowNumber,
        name,
        status: 'warning',
        message: 'No balance or payment data — skipped.',
      });
      continue;
    }
    if ((balanceCents ?? 0) < 0 || (minPaymentCents ?? 0) < 0) {
      reports.push({ rowNumber, name, status: 'error', message: 'Amounts cannot be negative.' });
      continue;
    }

    const notes: string[] = [];
    if (minPaymentCents === null) notes.push('no minimum payment — recorded as $0');
    if (balanceCents === null) notes.push('no balance — recorded as $0');

    let dueDay = 1;
    const dueRaw = mapping.dueDayCol === null ? null : row[mapping.dueDayCol];
    if (dueRaw == null || cellText(dueRaw) === '') {
      notes.push('no due day — defaulted to the 1st');
    } else {
      const parsed = parseDueDay(dueRaw);
      if (parsed === null) {
        reports.push({
          rowNumber,
          name,
          status: 'error',
          message: 'Due day must be a whole number from 1 to 31.',
        });
        continue;
      }
      dueDay = parsed;
    }

    const suggestedCents = parseMoney(
      mapping.suggestedCol === null ? null : row[mapping.suggestedCol],
    );
    debts.push({
      id: crypto.randomUUID(),
      name,
      balanceCents: balanceCents ?? 0,
      minPaymentCents: minPaymentCents ?? 0,
      suggestedPaymentCents: suggestedCents !== null && suggestedCents >= 0 ? suggestedCents : null,
      hasPromotion: mapping.promoCol === null ? false : parsePromotion(row[mapping.promoCol]),
      interestRateBps: mapping.rateCol === null ? null : parsePercentBps(row[mapping.rateCol]),
      promoEndISO: mapping.promoEndCol === null ? null : parseSheetDate(row[mapping.promoEndCol]),
      postPromoRateBps:
        mapping.postPromoRateCol === null ? null : parsePercentBps(row[mapping.postPromoRateCol]),
      dueDay,
      paidFrom: 'autopay',
      ...monthlyRecurrence(),
    });
    reports.push({
      rowNumber,
      name,
      status: notes.length > 0 ? 'warning' : 'ok',
      message: notes.length > 0 ? `Imported (${notes.join('; ')}).` : 'Ready to import.',
    });
  }

  return { debts, reports };
}

/** Scan a sheet for the gross income table: Year, Month, and per-person paycheck columns. */
export function detectIncomeMapping(grid: CellGrid): IncomeColumnMapping | null {
  for (const region of findTableRegions(grid)) {
    const mapping = incomeMappingFor(region);
    if (mapping) return mapping;
  }
  return null;
}

function incomeMappingFor(region: TableRegion): IncomeColumnMapping | null {
  const { headers } = region;
  const personCols: IncomeColumnMapping['personCols'] = [];
  for (let c = 0; c < headers.length; c++) {
    const match = INCOME_PERSON_MATCH.exec(headers[c] ?? '');
    if (match) personCols.push({ name: match[1].trim(), col: c });
  }
  if (personCols.length === 0) return null;
  const yearCol = headers.findIndex((t) => t && YEAR_MATCH.test(t));
  const monthCol = headers.findIndex((t) => t && MONTH_MATCH.test(t));
  if (yearCol < 0 || monthCol < 0) return null;
  const paycheckCountCol = headers.findIndex((t) => t && PAYCHECK_COUNT_MATCH.test(t));
  return {
    headerRow: region.headerRow,
    bodyEndRow: region.bodyEndRow,
    yearCol,
    monthCol,
    paycheckCountCol: paycheckCountCol >= 0 ? paycheckCountCol : null,
    personCols,
  };
}

function parsePaycheckCount(raw: CellValue | undefined): number | null {
  const n = typeof raw === 'number' ? raw : Number(cellText(raw));
  return Number.isInteger(n) && n >= 1 && n <= 6 ? n : null;
}

/** One row per month; the table may span any number of years. */
export function extractIncome(grid: CellGrid, mapping: IncomeColumnMapping): IncomeExtraction {
  const schedules = new Map<string, MonthlyIncome[]>();
  const months: MonthRef[] = [];
  const seenMonths = new Set<string>();
  const reports: RowReport[] = [];
  const end = mapping.bodyEndRow ?? grid.length;
  for (const { name } of mapping.personCols) schedules.set(name, []);

  for (let r = mapping.headerRow + 1; r < end; r++) {
    const row = grid[r] ?? [];
    const rowNumber = r + 1;
    const yearRaw = row[mapping.yearCol];
    const monthRaw = row[mapping.monthCol];
    if (cellText(yearRaw) === '' && cellText(monthRaw) === '') break;

    const label = `${cellText(monthRaw) || '?'} ${cellText(yearRaw) || '?'}`;
    const year = parseYear(yearRaw);
    if (year === null) {
      reports.push({ rowNumber, name: label, status: 'error', message: 'Year must be a 4-digit number.' });
      continue;
    }
    const month = parseMonthIndex(monthRaw);
    if (month === null) {
      reports.push({ rowNumber, name: label, status: 'error', message: 'Month is not recognizable.' });
      continue;
    }

    const notes: string[] = [];
    let paycheckCount = getPaydays(year, month).length;
    const countRaw = mapping.paycheckCountCol === null ? null : row[mapping.paycheckCountCol];
    if (countRaw != null && cellText(countRaw) !== '') {
      const parsed = parsePaycheckCount(countRaw);
      if (parsed === null) {
        reports.push({
          rowNumber,
          name: label,
          status: 'error',
          message: 'Paychecks per month must be a whole number from 1 to 6.',
        });
        continue;
      }
      if (parsed !== paycheckCount) {
        notes.push(`sheet says ${parsed} paychecks, the Wednesday calendar has ${paycheckCount}`);
      }
      paycheckCount = parsed;
    }

    for (const { name, col } of mapping.personCols) {
      const perPaycheckCents = parseMoney(row[col]);
      if (perPaycheckCents === null || perPaycheckCents < 0) {
        notes.push(`no amount for ${name}`);
        continue;
      }
      schedules.get(name)?.push({ year, month, paycheckCount, perPaycheckCents });
    }

    const key = `${year}-${month}`;
    if (!seenMonths.has(key)) {
      seenMonths.add(key);
      months.push({ year, month });
    }
    reports.push({
      rowNumber,
      name: label,
      status: notes.length > 0 ? 'warning' : 'ok',
      message: notes.length > 0 ? `Imported (${notes.join('; ')}).` : 'Ready to import.',
    });
  }

  const people: ImportedPerson[] = [...schedules.entries()].map(([name, schedule]) => ({
    name,
    schedule: schedule.sort(compareMonthlyIncome),
  }));
  return { people, months, reports };
}

export interface WorkbookAnalysis {
  bills: { sheet: string; mapping: ColumnMapping; extraction: ImportExtraction } | null;
  debts: { sheet: string; mapping: DebtColumnMapping; extraction: DebtExtraction } | null;
  income: { sheet: string; mapping: IncomeColumnMapping; extraction: IncomeExtraction } | null;
  people: ImportedPerson[];
}

/** Auto-detect every table the app understands across all sheets. */
export function analyzeWorkbook(workbook: WorkbookGrids): WorkbookAnalysis {
  const analysis: WorkbookAnalysis = { bills: null, debts: null, income: null, people: [] };

  for (const sheet of workbook.sheetNames) {
    const grid = workbook.grids[sheet];
    for (const region of findTableRegions(grid)) {
      if (!analysis.income) {
        const mapping = incomeMappingFor(region);
        if (mapping) {
          analysis.income = { sheet, mapping, extraction: extractIncome(grid, mapping) };
          continue;
        }
      }
      if (!analysis.debts) {
        const mapping = debtMappingFor(region);
        if (mapping) {
          analysis.debts = { sheet, mapping, extraction: extractDebts(grid, mapping) };
          continue;
        }
      }
      if (!analysis.bills) {
        const mapping = billMappingFor(region);
        if (mapping) analysis.bills = { sheet, mapping, extraction: extractBills(grid, mapping) };
      }
    }
  }

  analysis.people = analysis.income?.extraction.people ?? [];
  return analysis;
}

/** Starter workbook matching the layout the importer expects. */
export function buildTemplateWorkbook(): ArrayBuffer {
  const accounts = utils.aoa_to_sheet([
    [
      'Name',
      'Due Date',
      'Current Balance',
      'Min. Monthly Payment',
      'Current Interest Rate',
      'Has Promotion',
      'Promotion End Date',
      'Interest Rate After Promotion',
      'Suggested Monthly Payment',
    ],
    ['Example Card', 9, 8258.7, 77, 0.2774, false, null, null, 77],
    ['Example Promo Card', 8, 2595.2, 75, 0, true, '2027-06-01', 0.28, 216.27],
  ]);
  const bills = utils.aoa_to_sheet([
    ['Name', 'Monthly Payment', 'Due Date'],
    ['Rent', 3250, 1],
    ['Electric', 300, 1],
    ['Water', 20, 1],
  ]);
  const income = utils.aoa_to_sheet([
    [
      'Year',
      'Month',
      'Person A Deposit Amount per Paycheck',
      'Person B Deposit Amount per Paycheck',
      'Paychecks per Month',
    ],
    [2027, 'January', 561.87, 2063.96, 4],
    [2027, 'February', 561.87, 2063.96, 4],
    [2027, 'March', 561.87, 2063.96, 5],
  ]);

  const wb = utils.book_new();
  utils.book_append_sheet(wb, accounts, 'Payable Accounts');
  utils.book_append_sheet(wb, bills, 'Regular Bills');
  utils.book_append_sheet(wb, income, 'Monthly Income');
  return write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}
