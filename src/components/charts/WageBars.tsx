import { useMemo } from 'react';
import DivergingBars, { type DivergingBarsItem } from './DivergingBars';
import type { CityPanelRow } from '../../data/types';
import { cityPairs, cagr, cleanCityName } from '../../lib/derive';

// CAGR of CNSS average daily wage from 2014 to 2024.
export default function WageBars({ rows, n = 10 }: { rows: CityPanelRow[]; n?: number }) {
  const items: DivergingBarsItem[] = useMemo(
    () =>
      cityPairs(rows)
        .map((p) => ({
          label: cleanCityName(p.city_name),
          value: cagr(p.r2014.cnss_avg_daily_wage, p.r2024.cnss_avg_daily_wage, 10),
        }))
        .filter((d): d is DivergingBarsItem => d.value != null),
    [rows],
  );

  return (
    <DivergingBars
      items={items}
      n={n}
      xLabel="CNSS avg. daily wage, CAGR 2014–2024"
      valueFormat={(v) => `${v.toFixed(1)}%`}
    />
  );
}
