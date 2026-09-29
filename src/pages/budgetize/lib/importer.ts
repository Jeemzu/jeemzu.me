import { read, utils, write } from 'xlsx';
import type { Bill, DebtAccount, ImportedPerson } from '../types';
import { monthlyRecurrence } from '../types';
import { parseMoney } from './money';

export type CellValue = string | number | boolean | Date | null;
export type CellGrid = CellValue[][];

export interface WorkbookGrids {
  sheetNames: string[];
  grids: Record<string, CellGrid>;
}

export interface ColumnMapping {
  /** 0-based index of the header row within the grid. */
  headerRow: number;
  nameCol: number;
  amountCol: number;
  dueDayCol: number | null;
  categoryCol: number | null;
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

export interface DebtColumnMapping {
  headerRow: number;
  nameCol: number;
  balanceCol: number;
  minPaymentCol: number;
  dueDayCol: number | null;
  promoCol: number | null;
  suggestedCol: number | null;
}

export interface DebtExtraction {
  debts: DebtAccount[];
  reports: RowReport[];
}

export interface IncomeMapping {
  headerRow: number;
  /** One column per person, e.g. "Courtney Deposit Amount per Paycheck". */
  personCols: { name: string; col: number }[];
}

export interface PersonPaycheck {
  name: string;
  perPaycheckCents: number;
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
const NAME_EXCLUDE = /rate|date|amount|payment|balance/i;
const DUE_MATCH = /due/i;
const CATEGORY_MATCH = /category|type|group/i;
const BALANCE_MATCH = /balance/i;
const MIN_PAYMENT_MATCH = /min\.?(imum)?\s.*payment/i;
const PROMO_MATCH = /promotion/i;
const PROMO_EXCLUDE = /end|date|rate|after/i;
const SUGGESTED_MATCH = /suggested/i;
const TOTAL_EXCLUDE = /total/i;
const INCOME_COL_MATCH = /^(.+?)\s+deposit\s+amount\s+per\s+paycheck$/i;

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

/** Scan the first rows for a header row with recognizable bill columns. */
export function detectMapping(grid: CellGrid): ColumnMapping | null {
  const limit = Math.min(grid.length, 10);
  for (let r = 0; r < limit; r++) {
    const texts = (grid[r] ?? []).map((cell) => (typeof cell === 'string' ? cell.trim() : ''));
    if (texts.filter(Boolean).length < 2) continue;
    const amountCol = pickAmountColumn(texts);
    if (amountCol === null) continue;
    const nameCol = pickNearest(texts, NAME_MATCH, amountCol, NAME_EXCLUDE);
    if (nameCol === null) continue;
    const dueDayCol = pickNearest(texts, DUE_MATCH, amountCol);
    const categoryCol = pickNearest(texts, CATEGORY_MATCH, amountCol);
    return { headerRow: r, nameCol, amountCol, dueDayCol, categoryCol };
  }
  return null;
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

export function extractBills(grid: CellGrid, mapping: ColumnMapping): ImportExtraction {
  const bills: Bill[] = [];
  const reports: RowReport[] = [];

  for (let r = mapping.headerRow + 1; r < grid.length; r++) {
    const row = grid[r] ?? [];
    const rowNumber = r + 1;
    const name = cellText(row[mapping.nameCol]);
    const amountRaw = row[mapping.amountCol];
    const hasAmount = cellText(amountRaw) !== '';

    // Skip spacer rows and summary/total rows entirely.
    if (!name && !hasAmount) continue;
    if (row.some((cell) => typeof cell === 'string' && /^total/i.test(cell.trim()))) continue;
    if (/^total/i.test(name)) continue;

    if (!name) {
      // Value rows directly beneath a "Total …" label row are summary output, not bills.
      const prevRow = grid[r - 1] ?? [];
      if (prevRow.some((cell) => typeof cell === 'string' && /^total/i.test(cell.trim()))) continue;
      reports.push({ rowNumber, name: '(blank)', status: 'error', message: 'Missing bill name.' });
      continue;
    }

    const amountCents = parseMoney(amountRaw);
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

    const category = mapping.categoryCol === null ? '' : cellText(row[mapping.categoryCol]);
    const bill: Bill = {
      id: crypto.randomUUID(),
      name,
      amountCents,
      dueDay,
      category,
      paidFrom: 'shared',
      ...monthlyRecurrence(),
    };
    bills.push(bill);
    reports.push({ rowNumber, name, status, message });
  }

  return { bills, reports };
}

/** Scan the first rows for a debts table anchored on balance + minimum payment columns. */
export function detectDebtMapping(grid: CellGrid): DebtColumnMapping | null {
  const limit = Math.min(grid.length, 10);
  for (let r = 0; r < limit; r++) {
    const texts = (grid[r] ?? []).map((cell) => (typeof cell === 'string' ? cell.trim() : ''));
    if (texts.filter(Boolean).length < 2) continue;
    const balanceCol = texts.findIndex((t) => t && BALANCE_MATCH.test(t) && !TOTAL_EXCLUDE.test(t));
    if (balanceCol < 0) continue;
    const minPaymentCol = texts.findIndex(
      (t) => t && MIN_PAYMENT_MATCH.test(t) && !TOTAL_EXCLUDE.test(t),
    );
    if (minPaymentCol < 0) continue;
    const nameCol = pickNearest(texts, NAME_MATCH, balanceCol, NAME_EXCLUDE);
    if (nameCol === null) continue;
    const dueDayCol = pickNearest(texts, DUE_MATCH, balanceCol);
    const promoCol = pickNearest(texts, PROMO_MATCH, balanceCol, PROMO_EXCLUDE);
    const suggestedCol = pickNearest(texts, SUGGESTED_MATCH, balanceCol);
    return { headerRow: r, nameCol, balanceCol, minPaymentCol, dueDayCol, promoCol, suggestedCol };
  }
  return null;
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

  for (let r = mapping.headerRow + 1; r < grid.length; r++) {
    const row = grid[r] ?? [];
    const rowNumber = r + 1;
    const name = cellText(row[mapping.nameCol]);
    const balanceCents = parseMoney(row[mapping.balanceCol]);
    const minPaymentCents = parseMoney(row[mapping.minPaymentCol]);

    if (!name && balanceCents === null && minPaymentCents === null) continue;
    if (row.some((cell) => typeof cell === 'string' && /^total/i.test(cell.trim()))) continue;
    if (/^total/i.test(name)) continue;
    if (!name) {
      // Value rows directly beneath a "Total …" label row are summary output, not debts.
      const prevRow = grid[r - 1] ?? [];
      if (prevRow.some((cell) => typeof cell === 'string' && /^total/i.test(cell.trim()))) continue;
      reports.push({ rowNumber, name: '(blank)', status: 'error', message: 'Missing account name.' });
      continue;
    }
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

    const suggestedRaw = mapping.suggestedCol === null ? null : row[mapping.suggestedCol];
    const suggestedCents = parseMoney(suggestedRaw);
    const debt: DebtAccount = {
      id: crypto.randomUUID(),
      name,
      balanceCents: balanceCents ?? 0,
      minPaymentCents: minPaymentCents ?? 0,
      suggestedPaymentCents: suggestedCents !== null && suggestedCents >= 0 ? suggestedCents : null,
      hasPromotion: mapping.promoCol === null ? false : parsePromotion(row[mapping.promoCol]),
      dueDay,
      paidFrom: 'autopay',
      ...monthlyRecurrence(),
    };
    debts.push(debt);
    reports.push({
      rowNumber,
      name,
      status: notes.length > 0 ? 'warning' : 'ok',
      message: notes.length > 0 ? `Imported (${notes.join('; ')}).` : 'Ready to import.',
    });
  }

  return { debts, reports };
}

/** Scan the first rows for "<Person> Deposit Amount per Paycheck" income columns. */
export function detectIncomeMapping(grid: CellGrid): IncomeMapping | null {
  const limit = Math.min(grid.length, 10);
  for (let r = 0; r < limit; r++) {
    const texts = (grid[r] ?? []).map((cell) => (typeof cell === 'string' ? cell.trim() : ''));
    const personCols: IncomeMapping['personCols'] = [];
    for (let c = 0; c < texts.length; c++) {
      const match = INCOME_COL_MATCH.exec(texts[c]);
      if (match) personCols.push({ name: match[1].trim(), col: c });
    }
    if (personCols.length > 0) return { headerRow: r, personCols };
  }
  return null;
}

/** Rows are months; a person's amount is the first non-zero value scanning down. */
export function extractIncomes(grid: CellGrid, mapping: IncomeMapping): PersonPaycheck[] {
  return mapping.personCols.map(({ name, col }) => {
    for (let r = mapping.headerRow + 1; r < grid.length; r++) {
      const row = grid[r] ?? [];
      if (row.some((cell) => typeof cell === 'string' && /^total/i.test(cell.trim()))) continue;
      const cents = parseMoney(row[col]);
      if (cents !== null && cents > 0) return { name, perPaycheckCents: cents };
    }
    return { name, perPaycheckCents: 0 };
  });
}

export type IncomeSheetKind = 'personal' | 'essentials' | null;

export function classifyIncomeSheet(sheetName: string): IncomeSheetKind {
  if (/essential/i.test(sheetName)) return 'essentials';
  if (/personal/i.test(sheetName)) return 'personal';
  return null;
}

export interface WorkbookAnalysis {
  bills: { sheet: string; mapping: ColumnMapping; extraction: ImportExtraction } | null;
  debts: { sheet: string; mapping: DebtColumnMapping; extraction: DebtExtraction } | null;
  personalIncome: { sheet: string; incomes: PersonPaycheck[] } | null;
  essentialsIncome: { sheet: string; incomes: PersonPaycheck[] } | null;
  /** Personal + essentials paycheck amounts merged by person name. */
  people: ImportedPerson[];
}

/** Auto-detect every table the app understands across all sheets. */
export function analyzeWorkbook(workbook: WorkbookGrids): WorkbookAnalysis {
  const analysis: WorkbookAnalysis = {
    bills: null,
    debts: null,
    personalIncome: null,
    essentialsIncome: null,
    people: [],
  };

  for (const sheet of workbook.sheetNames) {
    const grid = workbook.grids[sheet];
    const incomeKind = classifyIncomeSheet(sheet);
    if (incomeKind) {
      const mapping = detectIncomeMapping(grid);
      if (mapping) {
        const entry = { sheet, incomes: extractIncomes(grid, mapping) };
        if (incomeKind === 'personal' && !analysis.personalIncome) analysis.personalIncome = entry;
        if (incomeKind === 'essentials' && !analysis.essentialsIncome) analysis.essentialsIncome = entry;
      }
      continue;
    }
    if (!analysis.bills) {
      const mapping = detectMapping(grid);
      if (mapping) analysis.bills = { sheet, mapping, extraction: extractBills(grid, mapping) };
    }
    if (!analysis.debts) {
      const mapping = detectDebtMapping(grid);
      if (mapping) analysis.debts = { sheet, mapping, extraction: extractDebts(grid, mapping) };
    }
  }

  const byName = new Map<string, ImportedPerson>();
  const upsert = (name: string) => {
    const key = name.toLowerCase();
    let person = byName.get(key);
    if (!person) {
      person = { name, personalPerPaycheckCents: 0, essentialsPerPaycheckCents: 0 };
      byName.set(key, person);
    }
    return person;
  };
  for (const { name, perPaycheckCents } of analysis.personalIncome?.incomes ?? []) {
    upsert(name).personalPerPaycheckCents = perPaycheckCents;
  }
  for (const { name, perPaycheckCents } of analysis.essentialsIncome?.incomes ?? []) {
    upsert(name).essentialsPerPaycheckCents = perPaycheckCents;
  }
  analysis.people = [...byName.values()];

  return analysis;
}

/** Simple starter workbook for users whose spreadsheet cannot be mapped. */
export function buildTemplateWorkbook(): ArrayBuffer {
  const ws = utils.aoa_to_sheet([
    ['Bill Name', 'Monthly Amount', 'Due Day', 'Category'],
    ['Rent', 1500, 1, 'Housing'],
    ['Electric', 120, 15, 'Utilities'],
    ['Car Insurance', 150, 2, 'Insurance'],
  ]);
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, 'Bills');
  return write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}
