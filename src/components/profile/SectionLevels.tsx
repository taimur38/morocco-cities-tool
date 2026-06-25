import { useMemo } from 'react';
import type { CityComplexityRow, CityPanelRow } from '../../data/types';
import { fmtInt, fmtMoney, fmtNum, fmtPct, pctChange } from '../../lib/format';
import { cleanCityName } from '../../lib/derive';
import { useT } from '../../i18n/ui';

type T = ReturnType<typeof useT>;

type Props = {
  rows: CityPanelRow[];
  cityId: number;
  complexity?: CityComplexityRow[] | null;
};

type Indicator = {
  name: string;
  note: string;
  value: string;
  change: string;
  // string lets us render '—' when the source data is absent (e.g. CNSS wage
  // for FUAs that have no matching ville in the registry).
  rank: string;
  // null = don't show; '—' is shown explicitly when set to a string
  vsCasa: string | null;
};

export default function SectionLevels({ rows, cityId, complexity }: Props) {
  const t = useT();
  const indicators = useMemo(
    () => deriveIndicators(rows, cityId, complexity ?? null, t),
    [rows, cityId, complexity, t],
  );
  if (!indicators) return <p className="muted">{t('levels.noData')}</p>;

  return (
    <table className="levels-table">
      <thead>
        <tr>
          <th>{t('levels.header.indicator')}</th>
          <th className="col-num">{t('levels.header.2024')}</th>
          <th className="col-num">{t('levels.header.change')}</th>
          <th className="col-num">{t('levels.header.rank')}</th>
          <th className="col-num">{t('levels.header.vsCasa')}</th>
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
            <td className="col-num">{i.change}</td>
            <td className="col-num">{i.rank}</td>
            <td className="col-num">{i.vsCasa ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Signed percent-change formatter, e.g. +12% / −7%.
function signedPct(x: number | null, digits = 0): string {
  if (x == null || Number.isNaN(x)) return '—';
  if (x === 0) return '0%';
  return `${x > 0 ? '+' : '−'}${Math.abs(x).toFixed(digits)}%`;
}

// Signed percentage-point formatter, e.g. +3.2 pp / −1.5 pp.
function signedPp(x: number | null, digits = 1): string {
  if (x == null || Number.isNaN(x)) return '—';
  if (x === 0) return '0 pp';
  return `${x > 0 ? '+' : '−'}${Math.abs(x).toFixed(digits)} pp`;
}

// Signed delta formatter for an unbounded numeric metric (ECI).
function signedDelta(x: number | null, digits = 2): string {
  if (x == null || Number.isNaN(x)) return '—';
  if (x === 0) return '0';
  return `${x > 0 ? '+' : '−'}${Math.abs(x).toFixed(digits)}`;
}

// "vs Casa" as a % share, used for level indicators on a meaningful zero scale.
function vsCasaShare(x: number | null): string {
  if (x == null || Number.isNaN(x)) return '—';
  return `${x.toFixed(0)}%`;
}

function deriveIndicators(
  rows: CityPanelRow[],
  cityId: number,
  complexity: CityComplexityRow[] | null,
  t: T,
): Indicator[] | null {
  const y2024 = rows.filter((r) => r.year === 2024);
  const y2014 = rows.filter((r) => r.year === 2014);
  const me = y2024.find((r) => r.city_id === cityId);
  const me14 = y2014.find((r) => r.city_id === cityId);
  if (!me) return null;
  const casa = y2024.find((r) => cleanCityName(r.city_name) === 'Casablanca');

  const popLevel = level(y2024, me, me14, casa, (r) => r.pop_total, 'desc');
  const wageLevel = level(y2024, me, me14, casa, (r) => r.cnss_median_daily_wage, 'desc');
  const unempLevel = level(y2024, me, me14, casa, (r) => r.unemp_rate_total, 'asc');
  // Population is the FUA-defining metric and is always present; wage and
  // unemployment can be missing (three FUAs have no CNSS-matched villes, so
  // wageLevel is null for them). Render what we have.
  if (!popLevel) return null;

  const indicators: Indicator[] = [
    {
      name: t('levels.population'),
      note: t('levels.population.note'),
      value: fmtInt.format(popLevel.value),
      change: signedPct(pctChange(popLevel.prior, popLevel.value)),
      rank: popLevel.rank.toString(),
      vsCasa: vsCasaShare(popLevel.casaShare),
    },
    wageLevel
      ? {
          name: t('levels.wage'),
          note: t('levels.wage.note'),
          value: fmtMoney(wageLevel.value),
          change: signedPct(pctChange(wageLevel.prior, wageLevel.value)),
          rank: wageLevel.rank.toString(),
          vsCasa: vsCasaShare(wageLevel.casaShare),
        }
      : {
          name: t('levels.wage'),
          note: t('levels.wage.noteAbsent'),
          value: '—',
          change: '—',
          rank: '—',
          vsCasa: '—',
        },
  ];

  if (unempLevel) {
    indicators.push({
      name: t('levels.unemp'),
      note: t('levels.unemp.note'),
      value: fmtPct(unempLevel.value),
      // Unemployment is itself a rate, so a % change reads awkwardly — use pp.
      change: signedPp(
        unempLevel.prior == null ? null : unempLevel.value - unempLevel.prior,
      ),
      rank: unempLevel.rank.toString(),
      vsCasa: vsCasaShare(unempLevel.casaShare),
    });
  }

  if (complexity && complexity.length > 0) {
    const eci = makeEciIndicator(complexity, cityId, t);
    if (eci) indicators.push(eci);
  }

  return indicators;
}

function makeEciIndicator(
  complexity: CityComplexityRow[],
  cityId: number,
  t: T,
): Indicator | null {
  const c2024 = complexity.filter((r) => r.year === 2024);
  const c2014 = complexity.filter((r) => r.year === 2014);
  const me = c2024.find((r) => r.city_id === cityId);
  if (!me || me.eci_workers == null) return null;
  const me14 = c2014.find((r) => r.city_id === cityId);
  const cohort = c2024
    .map((r) => ({ id: r.city_id, v: r.eci_workers }))
    .filter((r): r is { id: number; v: number } => r.v != null);
  cohort.sort((a, b) => b.v - a.v);
  const rank = cohort.findIndex((r) => r.id === cityId) + 1;
  const delta = me14?.eci_workers != null ? me.eci_workers - me14.eci_workers : null;
  return {
    name: t('levels.eci'),
    note: t('levels.eci.note'),
    value: fmtNum(me.eci_workers, 2),
    change: signedDelta(delta),
    rank: rank.toString(),
    // ECI is a standardized index centered near 0, so a "% of Casablanca's
    // value" reading is misleading (sign flips, blows up near zero). Show "—".
    vsCasa: null,
  };
}

type Level = {
  value: number;
  prior: number | null;
  rank: number;
  casaShare: number | null;
};

function level(
  population: CityPanelRow[],
  me: CityPanelRow,
  me14: CityPanelRow | undefined,
  casa: CityPanelRow | undefined,
  pick: (r: CityPanelRow) => number | null | undefined,
  direction: 'asc' | 'desc',
): Level | null {
  const myValue = pick(me);
  if (myValue == null) return null;
  const prior = me14 ? pick(me14) ?? null : null;
  const cohort = population
    .map((r) => ({ id: r.city_id, v: pick(r) }))
    .filter((r): r is { id: number; v: number } => r.v != null);
  cohort.sort((a, b) => (direction === 'desc' ? b.v - a.v : a.v - b.v));
  const rank = cohort.findIndex((r) => r.id === me.city_id) + 1;
  const casaValue = casa ? pick(casa) : null;
  const casaShare = casaValue && casaValue !== 0 ? (myValue / casaValue) * 100 : null;
  return { value: myValue, prior, rank, casaShare };
}
