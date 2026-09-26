import type { AccountSource, Bill, BudgetData, DebtAccount, PersonIncome } from '../types';

export const BACKUP_VERSION = 2;
const APP_ID = 'budgetize-me';

export interface BackupFile {
  app: typeof APP_ID;
  version: number;
  exportedAt: string;
  data: BudgetData;
}

export function serializeBackup(data: BudgetData, now: Date = new Date()): string {
  const backup: BackupFile = {
    app: APP_ID,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    data,
  };
  return JSON.stringify(backup, null, 2);
}

export type ParseBackupResult = { ok: true; data: BudgetData } | { ok: false; error: string };

function isCents(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

/** Cash balances may be negative (overdraft); amounts and payments may not. */
function isSignedCents(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value);
}

function readPaidFrom(value: unknown, fallback: AccountSource): AccountSource {
  return value === 'shared' || value === 'autopay' ? value : fallback;
}

function readId(obj: Record<string, unknown>): string {
  return typeof obj.id === 'string' && obj.id ? obj.id : crypto.randomUUID();
}

function sanitizeBill(raw: unknown, index: number): Bill | string {
  if (typeof raw !== 'object' || raw === null) return `Bill #${index + 1} is not an object.`;
  const obj = raw as Record<string, unknown>;
  const name = typeof obj.name === 'string' ? obj.name.trim() : '';
  if (!name) return `Bill #${index + 1} is missing a name.`;
  if (!isCents(obj.amountCents)) return `Bill "${name}" has an invalid amount.`;
  const dueDay = obj.dueDay;
  if (typeof dueDay !== 'number' || !Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) {
    return `Bill "${name}" has an invalid due day (must be 1-31).`;
  }
  return {
    id: readId(obj),
    name,
    amountCents: obj.amountCents,
    dueDay,
    category: typeof obj.category === 'string' ? obj.category.trim() : '',
    paidFrom: readPaidFrom(obj.paidFrom, 'shared'),
  };
}

function sanitizeDebt(raw: unknown, index: number): DebtAccount | string {
  if (typeof raw !== 'object' || raw === null) return `Debt #${index + 1} is not an object.`;
  const obj = raw as Record<string, unknown>;
  const name = typeof obj.name === 'string' ? obj.name.trim() : '';
  if (!name) return `Debt #${index + 1} is missing a name.`;
  if (!isCents(obj.balanceCents)) return `Debt "${name}" has an invalid balance.`;
  if (!isCents(obj.minPaymentCents)) return `Debt "${name}" has an invalid minimum payment.`;
  const suggested = obj.suggestedPaymentCents ?? null;
  if (suggested !== null && !isCents(suggested)) {
    return `Debt "${name}" has an invalid suggested payment.`;
  }
  const dueDay = obj.dueDay;
  if (typeof dueDay !== 'number' || !Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) {
    return `Debt "${name}" has an invalid due day (must be 1-31).`;
  }
  return {
    id: readId(obj),
    name,
    balanceCents: obj.balanceCents,
    minPaymentCents: obj.minPaymentCents,
    suggestedPaymentCents: suggested,
    hasPromotion: obj.hasPromotion === true,
    dueDay,
    paidFrom: readPaidFrom(obj.paidFrom, 'autopay'),
  };
}

function sanitizePerson(raw: unknown, index: number): PersonIncome | string {
  if (typeof raw !== 'object' || raw === null) return `Person #${index + 1} is not an object.`;
  const obj = raw as Record<string, unknown>;
  const name = typeof obj.name === 'string' ? obj.name.trim() : '';
  if (!name) return `Person #${index + 1} is missing a name.`;
  if (!isCents(obj.personalPerPaycheckCents)) return `"${name}" has an invalid personal deposit.`;
  if (!isCents(obj.essentialsPerPaycheckCents)) return `"${name}" has an invalid essentials deposit.`;
  if (!isSignedCents(obj.personalBalanceCents)) return `"${name}" has an invalid personal balance.`;
  return {
    id: readId(obj),
    name,
    personalPerPaycheckCents: obj.personalPerPaycheckCents,
    essentialsPerPaycheckCents: obj.essentialsPerPaycheckCents,
    personalBalanceCents: obj.personalBalanceCents,
  };
}

function sanitizeList<T>(
  raw: unknown,
  label: string,
  sanitize: (entry: unknown, index: number) => T | string,
): T[] | string {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) return `Backup has an invalid ${label} list.`;
  const items: T[] = [];
  for (const [index, entry] of raw.entries()) {
    const result = sanitize(entry, index);
    if (typeof result === 'string') return result;
    items.push(result);
  }
  return items;
}

/** Version 1 backups had a single weekly income and bills only. */
function migrateV1(dataObj: Record<string, unknown>, bills: Bill[]): ParseBackupResult {
  const weekly = dataObj.weeklyIncomeCents;
  if (!isCents(weekly)) {
    return { ok: false, error: 'Backup has an invalid weekly income value.' };
  }
  const people: PersonIncome[] =
    weekly > 0
      ? [
          {
            id: crypto.randomUUID(),
            name: 'Household',
            personalPerPaycheckCents: 0,
            essentialsPerPaycheckCents: weekly,
            personalBalanceCents: 0,
          },
        ]
      : [];
  return { ok: true, data: { people, bills, debts: [], essentialsBalanceCents: 0, autopayBalanceCents: 0 } };
}

export function parseBackup(json: string): ParseBackupResult {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { ok: false, error: 'That file is not valid JSON.' };
  }
  if (typeof raw !== 'object' || raw === null) {
    return { ok: false, error: 'Backup must be a JSON object.' };
  }
  const obj = raw as Record<string, unknown>;
  if (obj.app !== APP_ID) {
    return { ok: false, error: 'This file is not a Budgetize Me backup.' };
  }
  if (typeof obj.version !== 'number' || obj.version < 1 || obj.version > BACKUP_VERSION) {
    return { ok: false, error: `Unsupported backup version (expected 1-${BACKUP_VERSION}).` };
  }
  const data = obj.data;
  if (typeof data !== 'object' || data === null) {
    return { ok: false, error: 'Backup is missing its data section.' };
  }
  const dataObj = data as Record<string, unknown>;

  if (obj.version === 1) {
    const bills = sanitizeList(dataObj.bills ?? [], 'bills', sanitizeBill);
    if (typeof bills === 'string') return { ok: false, error: bills };
    return migrateV1(dataObj, bills);
  }

  return parseBudgetData(dataObj);
}

/** Validates a bare budget payload, such as one loaded from the server. */
export function parseBudgetData(raw: unknown): ParseBackupResult {
  if (typeof raw !== 'object' || raw === null) {
    return { ok: false, error: 'Budget data is missing.' };
  }
  const dataObj = raw as Record<string, unknown>;

  const bills = sanitizeList(dataObj.bills ?? [], 'bills', sanitizeBill);
  if (typeof bills === 'string') return { ok: false, error: bills };
  const debts = sanitizeList(dataObj.debts, 'debts', sanitizeDebt);
  if (typeof debts === 'string') return { ok: false, error: debts };
  const people = sanitizeList(dataObj.people, 'people', sanitizePerson);
  if (typeof people === 'string') return { ok: false, error: people };
  const essentialsBalanceCents = dataObj.essentialsBalanceCents ?? 0;
  if (!isSignedCents(essentialsBalanceCents)) {
    return { ok: false, error: 'Backup has an invalid essentials balance.' };
  }
  const autopayBalanceCents = dataObj.autopayBalanceCents ?? 0;
  if (!isSignedCents(autopayBalanceCents)) {
    return { ok: false, error: 'Backup has an invalid auto-pay balance.' };
  }
  return { ok: true, data: { people, bills, debts, essentialsBalanceCents, autopayBalanceCents } };
}
