import { useEffect, useState } from 'react';
import { DEFAULT_PROJECTION_RANGE, PROJECTION_RANGES, type ProjectionRange } from '../lib/projection';

const STORAGE_KEY = 'budgetize.projectionRange.v1';

function load(): ProjectionRange {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return PROJECTION_RANGES.find((r) => r.value === stored)?.value ?? DEFAULT_PROJECTION_RANGE;
  } catch {
    return DEFAULT_PROJECTION_RANGE;
  }
}

/** How far ahead to project, remembered in this browser. */
export function useProjectionRange() {
  const [range, setRange] = useState<ProjectionRange>(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, range);
    } catch {
      // Storage blocked; the choice just won't persist.
    }
  }, [range]);

  return [range, setRange] as const;
}
