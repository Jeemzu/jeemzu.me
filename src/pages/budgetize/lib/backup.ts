import type {
  AccountSource,
  Bill,
  BudgetData,
  DebtAccount,
  MonthlyIncome,
  OneOffEvent,
  PersonIncome,
  Recurrence,
  RecurrenceFrequency,
  ScheduleOverride,
} from '../types';
import { compareMonthlyIncome, monthlyRecurrence } from '../types';
import { getPaydays } from './paydays';
import { parseISODate } from './recurrence';

export const BACKUP_VERSION = 6;
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

function isInteger(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
}

/** Interest rates are reference-only, so anything unparseable is simply dropped. */
function readBps(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null;
}

function readPaidFrom(value: unknown, fallback: AccountSource): AccountSource {
  return value === 'shared' || value === 'autopay' ? value : fallback;
}

function readId(obj: Record<string, unknown>): string {
  return typeof obj.id === 'string' && obj.id ? obj.id : crypto.randomUUID();
}

const FREQUENCIES: RecurrenceFrequency[] = ['monthly', 'weekly', 'biweekly', 'quarterly', 'annual'];

function isISODate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function readISODate(value: unknown): string | null {
  return isISODate(value) ? value : null;
}

/** Backups written before frequencies existed have no recurrence fields; those items are monthly. */
function sanitizeRecurrence(obj: Record<string, unknown>, label: string): Recurrence | string {
  const raw = obj.frequency;
  if (raw === undefined || raw === null) return monthlyRecurrence();
  if (typeof raw !== 'string' || !FREQUENCIES.includes(raw as RecurrenceFrequency)) {
    return `${label} has an unknown frequency.`;
  }
  const frequency = raw as RecurrenceFrequency;
  const anchorISO = readISODate(obj.anchorISO);
  if (frequency !== 'monthly' && anchorISO === null) {
    return `${label} is ${frequency} but has no valid first-occurrence date.`;
  }
  const startISO = readISODate(obj.startISO);
  const endISO = readISODate(obj.endISO);
  if (startISO && endISO && endISO < startISO) {
    return `${label} ends before it starts.`;
  }
  return { frequency, anchorISO, startISO, endISO };
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
  const recurrence = sanitizeRecurrence(obj, `Bill "${name}"`);
  if (typeof recurrence === 'string') return recurrence;
  if (obj.isSubscription !== undefined && typeof obj.isSubscription !== 'boolean') {
    return `Bill "${name}" has an invalid subscription flag.`;
  }
  return {
    id: readId(obj),
    name,
    ...(obj.isSubscription === undefined ? {} : { isSubscription: obj.isSubscription }),
    amountCents: obj.amountCents,
    dueDay,
    paidFrom: readPaidFrom(obj.paidFrom, 'shared'),
    ...recurrence,
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
  const recurrence = sanitizeRecurrence(obj, `Debt "${name}"`);
  if (typeof recurrence === 'string') return recurrence;
  return {
    id: readId(obj),
    name,
    balanceCents: obj.balanceCents,
    minPaymentCents: obj.minPaymentCents,
    suggestedPaymentCents: suggested,
    hasPromotion: obj.hasPromotion === true,
    interestRateBps: readBps(obj.interestRateBps),
    promoEndISO: readISODate(obj.promoEndISO),
    postPromoRateBps: readBps(obj.postPromoRateBps),
    dueDay,
    paidFrom: readPaidFrom(obj.paidFrom, 'autopay'),
    ...recurrence,
  };
}

function sanitizeOverride(raw: unknown, index: number): ScheduleOverride | string {
  if (typeof raw !== 'object' || raw === null) return `Override #${index + 1} is not an object.`;
  const obj = raw as Record<string, unknown>;
  const label = `Override #${index + 1}`;
  if (obj.targetKind !== 'bill' && obj.targetKind !== 'debt') {
    return `${label} does not target a bill or debt.`;
  }
  if (typeof obj.targetId !== 'string' || !obj.targetId) return `${label} is missing its target.`;
  const fromISO = readISODate(obj.fromISO);
  const toISO = readISODate(obj.toISO);
  if (!fromISO || !toISO) return `${label} has an invalid date range.`;
  if (toISO < fromISO) return `${label} ends before it starts.`;
  if (obj.mode !== 'skip' && obj.mode !== 'amount') return `${label} has an unknown mode.`;
  const amountCents = obj.mode === 'amount' ? obj.amountCents : null;
  if (obj.mode === 'amount' && !isCents(amountCents)) {
    return `${label} has an invalid replacement amount.`;
  }
  return {
    id: readId(obj),
    targetKind: obj.targetKind,
    targetId: obj.targetId,
    fromISO,
    toISO,
    mode: obj.mode,
    amountCents: (amountCents as number | null) ?? null,
    note: typeof obj.note === 'string' ? obj.note.trim() : '',
  };
}

function sanitizeOneOff(raw: unknown, index: number): OneOffEvent | string {
  if (typeof raw !== 'object' || raw === null) return `One-time entry #${index + 1} is not an object.`;
  const obj = raw as Record<string, unknown>;
  const name = typeof obj.name === 'string' ? obj.name.trim() : '';
  if (!name) return `One-time entry #${index + 1} is missing a name.`;
  if (obj.kind !== 'expense' && obj.kind !== 'income') return `"${name}" must be an expense or income.`;
  if (!isCents(obj.amountCents)) return `"${name}" has an invalid amount.`;
  const dateISO = readISODate(obj.dateISO);
  if (!dateISO) return `"${name}" has an invalid date.`;
  const account = obj.account;
  if (account !== 'shared' && account !== 'autopay' && account !== 'personal') {
    return `"${name}" has an unknown account.`;
  }
  const personId = typeof obj.personId === 'string' && obj.personId ? obj.personId : null;
  if (account === 'personal' && personId === null) {
    return `"${name}" is a personal entry but names no person.`;
  }
  return {
    id: readId(obj),
    kind: obj.kind,
    name,
    amountCents: obj.amountCents,
    dateISO,
    account,
    personId: account === 'personal' ? personId : null,
    note: typeof obj.note === 'string' ? obj.note.trim() : '',
  };
}

function sanitizePerson(raw: unknown, index: number): PersonIncome | string {
  if (typeof raw !== 'object' || raw === null) return `Person #${index + 1} is not an object.`;
  const obj = raw as Record<string, unknown>;
  const name = typeof obj.name === 'string' ? obj.name.trim() : '';
  if (!name) return `Person #${index + 1} is missing a name.`;
  if (!isSignedCents(obj.personalBalanceCents)) return `"${name}" has an invalid personal balance.`;
  const schedule = sanitizeSchedule(obj, name);
  if (typeof schedule === 'string') return schedule;
  return {
    id: readId(obj),
    name,
    schedule,
    personalBalanceCents: obj.personalBalanceCents,
  };
}

function sanitizeSchedule(obj: Record<string, unknown>, name: string): MonthlyIncome[] | string {
  if (obj.schedule === undefined || obj.schedule === null) return legacySchedule(obj);
  if (!Array.isArray(obj.schedule)) return `"${name}" has an invalid pay schedule.`;
  const entries: MonthlyIncome[] = [];
  for (const raw of obj.schedule) {
    if (typeof raw !== 'object' || raw === null) return `"${name}" has an invalid pay schedule entry.`;
    const entry = raw as Record<string, unknown>;
    const { year, month, paycheckCount, perPaycheckCents } = entry;
    if (!isInteger(year, 1900, 2999)) return `"${name}" has a pay schedule entry with an invalid year.`;
    if (!isInteger(month, 0, 11)) return `"${name}" has a pay schedule entry with an invalid month.`;
    if (!isInteger(paycheckCount, 1, 6)) {
      return `"${name}" has a pay schedule entry with an invalid paycheck count.`;
    }
    if (!isCents(perPaycheckCents)) {
      return `"${name}" has a pay schedule entry with an invalid paycheck amount.`;
    }
    entries.push({
      year: year as number,
      month: month as number,
      paycheckCount: paycheckCount as number,
      perPaycheckCents: perPaycheckCents as number,
    });
  }
  return entries.sort(compareMonthlyIncome);
}

/**
 * People saved before per-month schedules existed carried a single fixed
 * paycheck split, which is spread over the current calendar year so their
 * projection keeps working after the upgrade.
 */
function legacySchedule(obj: Record<string, unknown>): MonthlyIncome[] {
  const personal = isCents(obj.personalPerPaycheckCents) ? obj.personalPerPaycheckCents : 0;
  const essentials = isCents(obj.essentialsPerPaycheckCents) ? obj.essentialsPerPaycheckCents : 0;
  const perPaycheckCents = personal + essentials;
  if (perPaycheckCents <= 0) return [];
  const year = new Date().getFullYear();
  return Array.from({ length: 12 }, (_, month) => ({
    year,
    month,
    paycheckCount: getPaydays(year, month).length,
    perPaycheckCents,
  }));
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
            schedule: legacySchedule({ essentialsPerPaycheckCents: weekly }),
            personalBalanceCents: 0,
          },
        ]
      : [];
  return {
    ok: true,
    data: {
      people,
      bills,
      debts: [],
      overrides: [],
      oneOffs: [],
      essentialsBalanceCents: 0,
      autopayBalanceCents: 0,
      projectionStartISO: null,
      debtStrategy: 'suggested',
    },
  };
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
  const overrides = sanitizeList(dataObj.overrides, 'overrides', sanitizeOverride);
  if (typeof overrides === 'string') return { ok: false, error: overrides };
  const oneOffs = sanitizeList(dataObj.oneOffs, 'one-time entries', sanitizeOneOff);
  if (typeof oneOffs === 'string') return { ok: false, error: oneOffs };

  const billIds = new Set(bills.map((b) => b.id));
  const debtIds = new Set(debts.map((d) => d.id));
  const orphan = overrides.find((o) =>
    o.targetKind === 'bill' ? !billIds.has(o.targetId) : !debtIds.has(o.targetId),
  );
  if (orphan) {
    return { ok: false, error: `An override points at a ${orphan.targetKind} that no longer exists.` };
  }
  const personIds = new Set(people.map((p) => p.id));
  const strayEvent = oneOffs.find((e) => e.personId !== null && !personIds.has(e.personId));
  if (strayEvent) {
    return { ok: false, error: `"${strayEvent.name}" points at a person who no longer exists.` };
  }

  const essentialsBalanceCents = dataObj.essentialsBalanceCents ?? 0;
  if (!isSignedCents(essentialsBalanceCents)) {
    return { ok: false, error: 'Backup has an invalid essentials balance.' };
  }
  const autopayBalanceCents = dataObj.autopayBalanceCents ?? 0;
  if (!isSignedCents(autopayBalanceCents)) {
    return { ok: false, error: 'Backup has an invalid auto-pay balance.' };
  }
  const projectionStartISO = dataObj.projectionStartISO ?? null;
  if (projectionStartISO !== null && parseISODate(projectionStartISO as string) === null) {
    return { ok: false, error: 'Backup has an invalid projection start date.' };
  }
  const debtStrategy = dataObj.debtStrategy ?? 'suggested';
  if (debtStrategy !== 'suggested' && debtStrategy !== 'minimum') {
    return { ok: false, error: 'Backup has an invalid debt payment strategy.' };
  }
  return {
    ok: true,
    data: {
      people,
      bills,
      debts,
      overrides,
      oneOffs,
      essentialsBalanceCents,
      autopayBalanceCents,
      projectionStartISO: projectionStartISO as string | null,
      debtStrategy,
    },
  };
}
