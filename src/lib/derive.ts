import type { CityPanelRow } from '../data/types';

export type CityPair = {
  city_id: number;
  city_name: string;
  r2014: CityPanelRow;
  r2024: CityPanelRow;
};

// Pivot the long city panel (year ∈ {2014, 2024}) to one row per city.
// Drops cities missing either endpoint.
export function cityPairs(rows: CityPanelRow[]): CityPair[] {
  const byId = new Map<number, { r2014?: CityPanelRow; r2024?: CityPanelRow; name?: string }>();
  for (const r of rows) {
    const slot = byId.get(r.city_id) ?? {};
    if (r.year === 2014) slot.r2014 = r;
    if (r.year === 2024) slot.r2024 = r;
    slot.name = r.city_name;
    byId.set(r.city_id, slot);
  }
  const pairs: CityPair[] = [];
  for (const [id, v] of byId) {
    if (v.r2014 && v.r2024 && v.name) {
      pairs.push({ city_id: id, city_name: v.name, r2014: v.r2014, r2024: v.r2024 });
    }
  }
  return pairs;
}

// Compound annual growth rate as a percent. Returns null if either endpoint is
// missing or non-positive (CAGR is undefined when crossing zero).
export function cagr(
  start: number | null | undefined,
  end: number | null | undefined,
  years: number,
): number | null {
  if (start == null || end == null || start <= 0 || end <= 0) return null;
  return (Math.pow(end / start, 1 / years) - 1) * 100;
}

// City names in the panel sometimes carry a trailing Arabic suffix
// (e.g. "Casablanca الدار البيضاء"). Strip it for chart labels and slugging.
export function cleanCityName(name: string): string {
  return name.replace(/\s+[^\x00-\x7F].*$/, '').trim();
}
