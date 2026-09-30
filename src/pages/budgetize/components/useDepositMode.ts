import { useEffect, useState } from 'react';
import type { DepositMode } from '../lib/funding';

const STORAGE_KEY = 'budgetize.depositMode.v1';

function load(): DepositMode {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'flat' ? 'flat' : 'minimum';
  } catch {
    return 'minimum';
  }
}

/** Whether projections use monthly minimum or flat weekly deposits, remembered in this browser. */
export function useDepositMode() {
  const [mode, setMode] = useState<DepositMode>(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // Storage blocked; the choice just won't persist.
    }
  }, [mode]);

  return [mode, setMode] as const;
}
