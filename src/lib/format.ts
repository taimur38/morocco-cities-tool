export const fmtInt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
export const fmtPct = (x: number | null | undefined, digits = 1) =>
  x == null || Number.isNaN(x) ? '—' : `${x.toFixed(digits)}%`;
export const fmtNum = (x: number | null | undefined, digits = 1) =>
  x == null || Number.isNaN(x) ? '—' : x.toFixed(digits);
export const fmtMoney = (x: number | null | undefined) =>
  x == null || Number.isNaN(x) ? '—' : `${fmtInt.format(Math.round(x))} MAD`;

export function pctChange(a: number | null | undefined, b: number | null | undefined): number | null {
  if (a == null || b == null || a === 0 || Number.isNaN(a) || Number.isNaN(b)) return null;
  return ((b - a) / a) * 100;
}
