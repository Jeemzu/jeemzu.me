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

function load(tableId: string): TablePrefs {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(storageKey(tableId)) ?? 'null');
    if (!isRecord(parsed)) return EMPTY;
    return {
      sizing: isRecord(parsed.sizing) ? (parsed.sizing as ColumnSizingState) : {},
      visibility: isRecord(parsed.visibility) ? (parsed.visibility as ColumnVisibilityState) : {},
      sorting: Array.isArray(parsed.sorting) ? (parsed.sorting as SortingState) : [],
    };
  } catch {
    return EMPTY;
  }
}

/** Column widths, visibility and sort order, remembered per table in this browser. */
export function useTablePrefs(tableId: string) {
  const [prefs, setPrefs] = useState<TablePrefs>(() => load(tableId));

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

  const reset = () => setPrefs(EMPTY);

  return { prefs, setPrefs, reset };
}
