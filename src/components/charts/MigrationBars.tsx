import { useMemo } from 'react';
import DivergingBars, { type DivergingBarsItem } from './DivergingBars';
import type { CityPanelRow } from '../../data/types';
import { cleanCityName } from '../../lib/derive';

// Net migration is a 2024-census snapshot — same value in both year rows of the
// panel. Picking year=2024 guarantees one row per city and avoids double-counting.
export default function MigrationBars({ rows, n = 10 }: { rows: CityPanelRow[]; n?: number }) {
  const items: DivergingBarsItem[] = useMemo(
    () =>
      rows
        .filter((r) => r.year === 2024 && r.mig_10yr_net_pct != null)
        .map((r) => ({ label: cleanCityName(r.city_name), value: r.mig_10yr_net_pct as number })),
    [rows],
  );

  return (
    <DivergingBars
      items={items}
      n={n}
      xLabel="Net migration (10-year), % of sedentary population"
      valueFormat={(v) => `${v.toFixed(0)}%`}
    />
  );
}
