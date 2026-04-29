import { useMemo } from 'react';
import type { CityComplexityRow, CityPanelRow } from '../../data/types';
import { fmtInt, fmtMoney, fmtNum, fmtPct } from '../../lib/format';
import { cleanCityName } from '../../lib/derive';

type Props = {
  rows: CityPanelRow[];
  cityId: number;
  complexity?: CityComplexityRow[] | null;
};

type Indicator = {
  name: string;
  note: string;
  value: string;
  rank: number;
  rankOf: number;
  casaShare: number | null;
};

export default function SectionLevels({ rows, cityId, complexity }: Props) {
  const indicators = useMemo(
    () => deriveIndicators(rows, cityId, complexity ?? null),
    [rows, cityId, complexity],
  );
  if (!indicators) return <p className="muted">No 2024 data for this city.</p>;

  return (
    <table className="levels-table">
      <thead>
        <tr>
          <th>Indicator</th>
          <th className="col-num">2024</th>
          <th className="col-num">Rank (of 63)</th>
          <th className="col-num">vs. Casablanca</th>
        </tr>
      </thead>
      <tbody>
        {indicators.map((i) => (
          <tr key={i.name}>
            <td>
              <span className="indicator-name">{i.name}</span>
              <span className="indicator-note">{i.note}</span>
            </td>
            <td className="col-num value">{i.value}</td>
            <td className="col-num">{i.rank}</td>
            <td className="col-num">
              {i.casaShare == null ? '—' : `${i.casaShare.toFixed(0)}%`}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function deriveIndicators(
  rows: CityPanelRow[],
  cityId: number,
  complexity: CityComplexityRow[] | null,
): Indicator[] | null {
  const y2024 = rows.filter((r) => r.year === 2024);
  const me = y2024.find((r) => r.city_id === cityId);
  if (!me) return null;
  const casa = y2024.find((r) => cleanCityName(r.city_name) === 'Casablanca');

  const popLevel = level(y2024, me, casa, (r) => r.pop_total, 'desc');
  const wageLevel = level(y2024, me, casa, (r) => r.cnss_avg_daily_wage, 'desc');
  const unempLevel = level(y2024, me, casa, (r) => r.unemp_rate_total, 'asc');
  if (!popLevel || !wageLevel || !unempLevel) return null;

  const indicators: Indicator[] = [
    {
      name: 'Population',
      note: 'Total residents in the FUA',
      value: fmtInt.format(popLevel.value),
      rank: popLevel.rank,
      rankOf: popLevel.rankOf,
      casaShare: popLevel.casaShare,
    },
    {
      name: 'Daily formal wage',
      note: 'Mean CNSS-registered worker',
      value: fmtMoney(wageLevel.value),
      rank: wageLevel.rank,
      rankOf: wageLevel.rankOf,
      casaShare: wageLevel.casaShare,
    },
    {
      name: 'Unemployment',
      note: 'Share of the labor force',
      value: fmtPct(unempLevel.value),
      rank: unempLevel.rank,
      rankOf: unempLevel.rankOf,
      casaShare: unempLevel.casaShare,
    },
  ];

  if (complexity && complexity.length > 0) {
    const eci = makeEciIndicator(complexity, cityId);
    if (eci) indicators.push(eci);
  }

  return indicators;
}

function makeEciIndicator(
  complexity: CityComplexityRow[],
  cityId: number,
): Indicator | null {
  const c2024 = complexity.filter((r) => r.year === 2024);
  const me = c2024.find((r) => r.city_id === cityId);
  if (!me || me.eci_workers == null) return null;
  const cohort = c2024
    .map((r) => ({ id: r.city_id, v: r.eci_workers }))
    .filter((r): r is { id: number; v: number } => r.v != null);
  cohort.sort((a, b) => b.v - a.v);
  const rank = cohort.findIndex((r) => r.id === cityId) + 1;
  const casa = c2024.find((r) => cleanCityName(r.city_name) === 'Casablanca');
  const casaValue = casa?.eci_workers ?? null;
  const casaShare =
    casaValue != null && casaValue !== 0 ? (me.eci_workers / casaValue) * 100 : null;
  return {
    name: 'Economic complexity',
    note: 'ECI from CNSS worker-share specialization',
    value: fmtNum(me.eci_workers, 2),
    rank,
    rankOf: cohort.length,
    casaShare,
  };
}

type Level = { value: number; rank: number; rankOf: number; casaShare: number | null };

function level(
  population: CityPanelRow[],
  me: CityPanelRow,
  casa: CityPanelRow | undefined,
  pick: (r: CityPanelRow) => number | null | undefined,
  direction: 'asc' | 'desc',
): Level | null {
  const myValue = pick(me);
  if (myValue == null) return null;
  const cohort = population
    .map((r) => ({ id: r.city_id, v: pick(r) }))
    .filter((r): r is { id: number; v: number } => r.v != null);
  cohort.sort((a, b) => (direction === 'desc' ? b.v - a.v : a.v - b.v));
  const rank = cohort.findIndex((r) => r.id === me.city_id) + 1;
  const casaValue = casa ? pick(casa) : null;
  const casaShare = casaValue && casaValue !== 0 ? (myValue / casaValue) * 100 : null;
  return { value: myValue, rank, rankOf: cohort.length, casaShare };
}
