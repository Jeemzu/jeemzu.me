/** Parse a dollar value (number or string like "$1,234.56") into integer cents. */
export function parseMoney(input: unknown): number | null {
  if (typeof input === 'number') {
    if (!Number.isFinite(input)) return null;
    return Math.round(input * 100);
  }
  if (typeof input === 'string') {
    const cleaned = input.replace(/[$,\s]/g, '');
    if (cleaned === '' || !/^-?(\d+\.?\d*|\.\d+)$/.test(cleaned)) return null;
    return Math.round(Number(cleaned) * 100);
  }
  return null;
}

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export function formatMoney(cents: number): string {
  return usd.format(cents / 100);
}

/** Dollars string suitable for a number input value. */
export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2);
}
