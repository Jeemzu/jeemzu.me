import { useEffect, useState } from 'react';
import type {
  ColumnSizingState,
  ColumnVisibilityState,
  SortingState,
} from '@tanstack/react-table';

export interface TablePrefs {
  sizing: ColumnSizingState;
  visibility: ColumnVisibilityState;
  sorting: SortingState;
}

const EMPTY: TablePrefs = { sizing: {}, visibility: {}, sorting: [] };

const storageKey = (tableId: string) => `budgetize.table.${tableId}.v1`;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function defaults(hidden: string[] = []): TablePrefs {
  return { ...EMPTY, visibility: Object.fromEntries(hidden.map((id) => [id, false])) };
}

function load(tableId: string, base: TablePrefs): TablePrefs {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(storageKey(tableId)) ?? 'null');
    if (!isRecord(parsed)) return base;
    return {
      sizing: isRecord(parsed.sizing) ? (parsed.sizing as ColumnSizingState) : {},
      // Saved choices win; defaults fill in columns the user never toggled.
      visibility: {
        ...base.visibility,
        ...(isRecord(parsed.visibility) ? (parsed.visibility as ColumnVisibilityState) : {}),
      },
      sorting: Array.isArray(parsed.sorting) ? (parsed.sorting as SortingState) : [],
    };
  } catch {
    return base;
  }
}

/** Column widths, visibility and sort order, remembered per table in this browser. */
export function useTablePrefs(tableId: string, defaultHidden?: string[]) {
  const [prefs, setPrefs] = useState<TablePrefs>(() => load(tableId, defaults(defaultHidden)));

  useEffect(() => {
    // Debounced so dragging a column edge doesn't write on every pixel.
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(storageKey(tableId), JSON.stringify(prefs));
      } catch {
        // Storage full or blocked; the layout just won't persist.
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [tableId, prefs]);

  const reset = () => setPrefs(defaults(defaultHidden));

  return { prefs, setPrefs, reset };
}
