import type { CityPanelRow, CityIndustryShiftShareRow } from '../data/types';

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

// Annualized log growth as a percent: 100·(ln(end) − ln(start)) / years. Unlike
// CAGR this is additive across components and symmetric in direction, so weighted
// sums of it decompose cleanly (the standard choice for wage shift-share). For the
// small rates here it is numerically ≈ CAGR. Null when an endpoint is non-positive.
export function annLogGrowth(
  start: number | null | undefined,
  end: number | null | undefined,
  years: number,
): number | null {
  if (start == null || end == null || start <= 0 || end <= 0) return null;
  return ((Math.log(end) - Math.log(start)) / years) * 100;
}

// Composition-adjusted wage growth per city (the "control for industry mix" view of
// the migration-vs-wage scatter). For each city we measure how its within-industry
// wage growth compares to the *national* growth of those same industries, weighted
// by the city's own industry mix, so a city no longer looks like a wage winner just
// because it happens to host inherently fast-wage-growth industries.
//
//   adjusted_c = Σ_i  w_{c,i} · (g_{c,i} − g_i^nat)
//
//   w_{c,i}  = city c's share of 2024 employment in industry i (second-period size)
//   g_{c,i}  = annualized log growth of city c's daily wage in industry i, 2014→2024
//   g_i^nat  = annualized log growth of the national days-weighted daily wage in i
//
// Log growth (not CAGR) so the within-industry pieces add up consistently. Weights
// are renormalized over the industries with a defined growth rate on both the city
// and national side (skips entries/exits and zero-day cells), so they sum to 1.
// Result is an annualized percent comparable to the raw wage-growth axis; 0 means
// the city's industries grew at exactly the national pace. Note: 0 is a *weighted*
// benchmark, so an unweighted scatter of cities will not straddle it evenly.
export function compositionAdjustedWageGrowth(
  rows: CityIndustryShiftShareRow[],
  years = 10,
): Map<number, number> {
  const byCity = new Map<number, CityIndustryShiftShareRow[]>();
  for (const r of rows) {
    const arr = byCity.get(r.city_id);
    if (arr) arr.push(r);
    else byCity.set(r.city_id, [r]);
  }

  const out = new Map<number, number>();
  for (const [cityId, cells] of byCity) {
    let weighted = 0;
    let weightSum = 0;
    for (const c of cells) {
      const gCity = annLogGrowth(c.daily_wage_2014, c.daily_wage_2024, years);
      const gNat = annLogGrowth(c.natl_daily_wage_2014, c.natl_daily_wage_2024, years);
      const w = c.workers_2024;
      if (gCity == null || gNat == null || !(w > 0)) continue;
      weighted += w * (gCity - gNat);
      weightSum += w;
    }
    if (weightSum > 0) out.set(cityId, weighted / weightSum);
  }
  return out;
}

// Growth rate of a city's composition-adjusted wage *premium* (the level cousin of
// compositionAdjustedWageGrowth). For each year we form the log premium as the
// employment-weighted mean of within-industry log wage gaps:
//
//   S_{c,t} = Σ_i s_{ci,t} · ln( w_{ci,t} / w_{i,t}^nat ),   s = employment share
//
// i.e. on average across its industries (weighted by mix), how far above/below the
// national rate does the city pay? The metric is the annualized 2014→2024 change in
// S, in %/yr: is the city's pay-over-mix advantage widening or eroding? This
// "sum-of-log-ratios" form is the discrete analog of a two-way (city + industry)
// fixed-effects log-wage regression's city effect — see wage_premium_fe_growth, the
// regression itself, computed upstream. Differs from compositionAdjustedWageGrowth in
// that it uses each year's own mix, so it also captures employment reallocating toward
// industries where the city pays above/below benchmark, not only within-industry wage
// changes. 0 = premium unchanged (city kept pace with the national rate for its mix).
export function wagePremiumGrowth(
  rows: CityIndustryShiftShareRow[],
  years = 10,
): Map<number, number> {
  const byCity = new Map<number, CityIndustryShiftShareRow[]>();
  for (const r of rows) {
    const arr = byCity.get(r.city_id);
    if (arr) arr.push(r);
    else byCity.set(r.city_id, [r]);
  }

  // Employment-weighted mean of ln(wage / national wage) over a year's valid cells.
  const logPremium = (
    cells: CityIndustryShiftShareRow[],
    wage: (c: CityIndustryShiftShareRow) => number | null,
    natl: (c: CityIndustryShiftShareRow) => number | null,
    emp: (c: CityIndustryShiftShareRow) => number,
  ): number | null => {
    let weighted = 0;
    let weightSum = 0;
    for (const c of cells) {
      const w = wage(c);
      const n = natl(c);
      const e = emp(c);
      if (w == null || w <= 0 || n == null || n <= 0 || !(e > 0)) continue;
      weighted += e * Math.log(w / n);
      weightSum += e;
    }
    return weightSum > 0 ? weighted / weightSum : null;
  };

  const out = new Map<number, number>();
  for (const [cityId, cells] of byCity) {
    const s14 = logPremium(cells, (c) => c.daily_wage_2014, (c) => c.natl_daily_wage_2014, (c) => c.workers_2014);
    const s24 = logPremium(cells, (c) => c.daily_wage_2024, (c) => c.natl_daily_wage_2024, (c) => c.workers_2024);
    if (s14 == null || s24 == null) continue;
    // S is already in log units, so the annualized change is just a scaled difference.
    out.set(cityId, ((s24 - s14) / years) * 100);
  }
  return out;
}

// City names in the panel sometimes carry a trailing Arabic suffix
// (e.g. "Casablanca الدار البيضاء"). Strip it for chart labels and slugging.
export function cleanCityName(name: string): string {
  return name.replace(/\s+[^\x00-\x7F].*$/, '').trim();
}
