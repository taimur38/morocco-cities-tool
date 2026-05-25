import { useMemo } from 'react';
import DivergingBars, { type DivergingBarsItem } from './DivergingBars';
import type { CityPanelRow } from '../../data/types';
import { cityPairs, cagr, cleanCityName } from '../../lib/derive';

type WageStat = 'median' | 'mean';

// CAGR of CNSS daily wage from 2014 to 2024. Defaults to the mean (days-weighted)
// to preserve existing CityProfile behavior; Home.tsx passes wageStat='median'.
export default function WageBars({
  rows,
  n = 10,
  wageStat = 'mean',
}: {
  rows: CityPanelRow[];
  n?: number;
  wageStat?: WageStat;
}) {
  const items: DivergingBarsItem[] = useMemo(() => {
    const col = wageStat === 'median' ? 'cnss_median_daily_wage' : 'cnss_avg_daily_wage';
    return cityPairs(rows)
      .map((p) => ({
        label: cleanCityName(p.city_name),
        value: cagr(p.r2014[col], p.r2024[col], 10),
      }))
      .filter((d): d is DivergingBarsItem => d.value != null);
  }, [rows, wageStat]);

  return (
    <DivergingBars
      items={items}
      n={n}
      xLabel={`CNSS ${wageStat} daily wage, CAGR 2014–2024`}
      valueFormat={(v) => `${v.toFixed(1)}%`}
    />
  );
}
