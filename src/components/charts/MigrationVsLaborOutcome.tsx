import { useMemo, useState } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  LabelList,
} from 'recharts';
import type { CityPanelRow } from '../../data/types';
import { cityPairs, cagr, cleanCityName } from '../../lib/derive';
import { fmtNum } from '../../lib/format';
import { useT } from '../../i18n/ui';

type T = ReturnType<typeof useT>;

type Metric = 'wage_median' | 'wage_mean' | 'unemp' | 'wage_premium_fe';

// Metrics measured in annualized % (vs. the unemployment Δ, in pp). Wage premium
// growth is also a %/yr rate, so it shares the wage formatting and tooltip wording.
const isPct = (m: Metric): m is 'wage_median' | 'wage_mean' | 'wage_premium_fe' =>
  m === 'wage_median' || m === 'wage_mean' || m === 'wage_premium_fe';

type Point = {
  city_id: number;
  city: string;
  migration: number;
  wageMedianCagr: number;
  wageMeanCagr: number;
  unempDelta: number;
  // Annualized change in the two-way (city + industry) fixed-effects wage premium,
  // computed upstream. Null for cities absent from the regression's coverage.
  premiumFe: number | null;
};

type Props = {
  rows: CityPanelRow[];
  highlightCityId?: number;
  defaultMetric?: Metric;
  // Per-city wage_premium_fe_growth. When provided, a "Wage-premium growth" option
  // appears in the Y-axis toggle; omit to hide it.
  feGrowthByCity?: Map<number, number>;
};

type Domain = { x: [number, number]; y: [number, number] };
type MouseEvt = { xValue?: number; yValue?: number } | null;

const HIGHLIGHT = '#c64646';
const BASE = '#1a1a1a';

const metricLabel = (m: Metric, t: T): string => {
  if (m === 'wage_median') return t('labor.metric.wageMedian');
  if (m === 'wage_mean') return t('labor.metric.wageMean');
  if (m === 'wage_premium_fe') return t('labor.metric.wagePremiumFe');
  return t('labor.metric.unemp');
};

const TICK_FMT: Record<Metric, (v: number) => string> = {
  wage_median: (v) => `${v.toFixed(1)}%`,
  wage_mean: (v) => `${v.toFixed(1)}%`,
  wage_premium_fe: (v) => `${v.toFixed(1)}%`,
  unemp: (v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}`,
};

const yOf = (p: Point, m: Metric): number | null =>
  m === 'wage_median'
    ? p.wageMedianCagr
    : m === 'wage_mean'
    ? p.wageMeanCagr
    : m === 'wage_premium_fe'
    ? p.premiumFe
    : p.unempDelta;

const tooltipFmt = (p: Point, m: Metric, t: T): string => {
  if (isPct(m)) {
    const v = yOf(p, m);
    return v == null ? '—' : `${v.toFixed(1)}${t('unit.percentPerYr')}`;
  }
  return p.unempDelta == null
    ? '—'
    : `${p.unempDelta >= 0 ? '+' : ''}${p.unempDelta.toFixed(1)} ${t('unit.pp')}`;
};

export default function MigrationVsLaborOutcome({
  rows,
  highlightCityId,
  defaultMetric = 'unemp',
  feGrowthByCity,
}: Props) {
  const t = useT();
  const hasFe = !!feGrowthByCity && feGrowthByCity.size > 0;
  const [metric, setMetric] = useState<Metric>(defaultMetric);

  const { points, natWageMedianCagr, natWageMeanCagr, natUnempDelta, natMig } = useMemo(() => {
    // Require migration, both wage statistics, AND unemployment delta to all
    // be present so the data array stays stable across every toggle. Recharts
    // animates scatter points by their position in the data array; if the city
    // at index i changes, the dot interpolates to the wrong city's new position.
    const points: Point[] = cityPairs(rows)
      .map((p) => {
        const mig = p.r2024.mig_10yr_net_pct;
        const cMed = cagr(
          p.r2014.cnss_median_daily_wage,
          p.r2024.cnss_median_daily_wage,
          10,
        );
        const cMean = cagr(
          p.r2014.cnss_avg_daily_wage,
          p.r2024.cnss_avg_daily_wage,
          10,
        );
        const u14 = p.r2014.unemp_rate_total;
        const u24 = p.r2024.unemp_rate_total;
        if (mig == null || cMed == null || cMean == null || u14 == null || u24 == null)
          return null;
        return {
          city_id: p.city_id,
          city: cleanCityName(p.city_name),
          migration: mig,
          wageMedianCagr: cMed,
          wageMeanCagr: cMean,
          unempDelta: u24 - u14,
          // Premium FE growth is optional coverage, so it's attached as a nullable
          // field rather than gating a city out of the (stable) data array.
          premiumFe: feGrowthByCity?.get(p.city_id) ?? null,
        };
      })
      .filter((p): p is Point => p !== null);

    // National mean-wage CAGR: days-weighted aggregate (the wage a typical
    // formal-sector worker actually saw).
    const aggMeanWage = (year: number) => {
      const ys = rows.filter((r) => r.year === year);
      const sal = ys.reduce((s, r) => s + (r.cnss_salary ?? 0), 0);
      const days = ys.reduce((s, r) => s + (r.cnss_days ?? 0), 0);
      return days > 0 ? sal / days : null;
    };
    const natWageMeanCagr = cagr(aggMeanWage(2014), aggMeanWage(2024), 10) ?? 0;

    // National median-wage CAGR: cross-city median (a national median can't be
    // built from city aggregates).
    const medCagrs = points.map((p) => p.wageMedianCagr).sort((a, b) => a - b);
    const nMed = medCagrs.length;
    const natWageMedianCagr =
      nMed === 0
        ? 0
        : nMed % 2 === 0
          ? (medCagrs[nMed / 2 - 1] + medCagrs[nMed / 2]) / 2
          : medCagrs[(nMed - 1) / 2];

    // National unemployment change = aggregate change in (unemp / labor force)
    // across all cities. Built from levels — sum(employed) and sum(labor force).
    const aggUnemp = (year: number) => {
      const ys = rows.filter((r) => r.year === year);
      let emp = 0;
      let lf = 0;
      for (const r of ys) {
        if (r.employed_total != null && r.unemp_rate_total != null) {
          // labor force = employed / (1 - u)
          const u = r.unemp_rate_total / 100;
          if (u < 1) {
            const lfCity = r.employed_total / (1 - u);
            emp += r.employed_total;
            lf += lfCity;
          }
        }
      }
      return lf > 0 ? (1 - emp / lf) * 100 : null;
    };
    const u14n = aggUnemp(2014);
    const u24n = aggUnemp(2024);
    const natUnempDelta = u14n != null && u24n != null ? u24n - u14n : 0;

    // Median is robust to the long right tail of fast-growing peripheries
    // (Ain El Aouda, Deroua, Tangier) which would otherwise drag a mean.
    const migsSorted = points.map((p) => p.migration).sort((a, b) => a - b);
    const mN = migsSorted.length;
    const natMig =
      mN === 0
        ? 0
        : mN % 2 === 0
        ? (migsSorted[mN / 2 - 1] + migsSorted[mN / 2]) / 2
        : migsSorted[(mN - 1) / 2];

    return { points, natWageMedianCagr, natWageMeanCagr, natUnempDelta, natMig };
  }, [rows, feGrowthByCity]);

  // Map points to the active Y value for the current metric. No filtering
  // here: points already requires every metric to be present, so the array
  // length and order stay stable across the metric toggle. That stability
  // is what lets Recharts animate each dot from its own previous position
  // to its own new position when the user switches metrics.
  const active = useMemo(
    () =>
      points.map((p) => ({
        ...p,
        y: yOf(p, metric),
      })),
    [points, metric],
  );

  const natY =
    metric === 'wage_median'
      ? natWageMedianCagr
      : metric === 'wage_mean'
        ? natWageMeanCagr
        : metric === 'wage_premium_fe'
          ? 0 // premium growth is already a deviation from the national pace
          : natUnempDelta;

  const [zoom, setZoom] = useState<Domain | null>(null);
  const [drag, setDrag] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);

  // Reset zoom when metric changes — old window doesn't apply.
  const handleMetricChange = (m: Metric) => {
    setMetric(m);
    setZoom(null);
  };

  const visiblePoints = useMemo(() => {
    if (!zoom) return active;
    return active.filter(
      (p) =>
        p.y != null &&
        p.migration >= zoom.x[0] &&
        p.migration <= zoom.x[1] &&
        p.y >= zoom.y[0] &&
        p.y <= zoom.y[1],
    );
  }, [active, zoom]);

  // Y axes have different scales — wage CAGR is on a ~10pp range, unemp Δ on a
  // ~20pp range. Use the visible window's span to normalize distance for
  // outlier labeling so the same number of cities get labeled either way.
  // Points with a finite y for the active metric — premium FE growth has gaps in
  // coverage, so the span/label math runs over the plottable subset.
  const plottable = useMemo(
    () => visiblePoints.filter((p): p is typeof p & { y: number } => p.y != null),
    [visiblePoints],
  );
  const cutoff = useMemo(() => {
    if (plottable.length === 0) return 0;
    const xSpan =
      Math.max(...plottable.map((p) => p.migration)) -
      Math.min(...plottable.map((p) => p.migration)) || 1;
    const ySpan =
      Math.max(...plottable.map((p) => p.y)) -
      Math.min(...plottable.map((p) => p.y)) || 1;
    const dists = plottable
      .map((p) =>
        Math.hypot(
          (p.migration - natMig) / xSpan,
          (p.y - natY) / ySpan,
        ),
      )
      .sort((a, b) => b - a);
    const k = zoom ? Math.min(dists.length - 1, 7) : Math.min(dists.length - 1, 11);
    return dists[k] ?? 0;
  }, [plottable, natMig, natY, zoom]);

  const labelFor = (p: Point & { y: number | null }) => {
    if (p.y == null) return '';
    if (p.city_id === highlightCityId) return p.city;
    if (zoom) {
      const inView =
        p.migration >= zoom.x[0] &&
        p.migration <= zoom.x[1] &&
        p.y >= zoom.y[0] &&
        p.y <= zoom.y[1];
      if (!inView) return '';
    }
    const xSpan =
      Math.max(...plottable.map((q) => q.migration)) -
      Math.min(...plottable.map((q) => q.migration)) || 1;
    const ySpan =
      Math.max(...plottable.map((q) => q.y)) -
      Math.min(...plottable.map((q) => q.y)) || 1;
    return Math.hypot((p.migration - natMig) / xSpan, (p.y - natY) / ySpan) >= cutoff
      ? p.city
      : '';
  };

  const base = active
    .filter((p) => p.city_id !== highlightCityId)
    .map((p) => ({ ...p, label: labelFor(p) }));
  const highlight = active
    .filter((p) => p.city_id === highlightCityId)
    .map((p) => ({ ...p, label: p.y == null ? '' : p.city }));

  const handleMouseDown = (e: MouseEvt) => {
    if (!e || e.xValue == null || e.yValue == null) return;
    setDrag({ x1: e.xValue, y1: e.yValue, x2: e.xValue, y2: e.yValue });
  };
  const handleMouseMove = (e: MouseEvt) => {
    if (!drag || !e || e.xValue == null || e.yValue == null) return;
    setDrag({ ...drag, x2: e.xValue, y2: e.yValue });
  };
  const handleMouseUp = () => {
    if (!drag) return;
    const xLo = Math.min(drag.x1, drag.x2);
    const xHi = Math.max(drag.x1, drag.x2);
    const yLo = Math.min(drag.y1, drag.y2);
    const yHi = Math.max(drag.y1, drag.y2);
    if (xHi - xLo > 1 && yHi - yLo > 0.2) {
      setZoom({ x: [xLo, xHi], y: [yLo, yHi] });
    }
    setDrag(null);
  };

  // 2.5% padding on either side of the data range so labels for cities at the
  // extreme ends don't get clipped by the plot edge.
  const padded = (vals: number[], pct = 0.025): [number, number] => {
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    const pad = (hi - lo) * pct || 1;
    return [lo - pad, hi + pad];
  };
  const xDomain: [number | string, number | string] = zoom
    ? zoom.x
    : points.length
    ? padded(points.map((p) => p.migration))
    : ['auto', 'auto'];
  const yDomain: [number | string, number | string] = zoom ? zoom.y : ['auto', 'auto'];

  const natYLabel =
    metric === 'wage_premium_fe'
      ? t('scatter.ref.nationalPace0')
      : metric === 'wage_median'
      ? t('scatter.ref.medianPerYr', { v: natY.toFixed(1) })
      : isPct(metric)
      ? t('scatter.ref.natAvgPerYr', { v: natY.toFixed(1) })
      : t('labor.ref.natAvgPp', { v: `${natY >= 0 ? '+' : ''}${natY.toFixed(1)}` });

  return (
    <div>
      <div className="chart-toolbar">
        <label className="chart-toolbar-control">
          {t('charts.yAxis')}
          <select
            className="chart-toolbar-select"
            value={metric}
            onChange={(e) => handleMetricChange(e.target.value as Metric)}
          >
            <option value="wage_median">{t('labor.opt.wageMedian')}</option>
            <option value="wage_mean">{t('labor.opt.wageMean')}</option>
            {hasFe && (
              <option value="wage_premium_fe">{t('labor.opt.wagePremiumFe')}</option>
            )}
            <option value="unemp">{t('labor.opt.unemp')}</option>
          </select>
        </label>
        <span style={{ flex: 1 }} />
        <span className="chart-toolbar-hint">
          {zoom ? t('charts.zoomedIn') : t('charts.dragToZoom')}
        </span>
        {zoom && (
          <button type="button" className="btn-link" onClick={() => setZoom(null)}>
            {t('charts.resetZoom')}
          </button>
        )}
      </div>
      <ResponsiveContainer width="100%" height={520}>
        <ScatterChart
          margin={{ top: 16, right: 24, bottom: 48, left: 12 }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ cursor: drag ? 'crosshair' : 'default', userSelect: 'none' }}
        >
          <CartesianGrid stroke="#eee" strokeDasharray="2 2" />
          <XAxis
            type="number"
            dataKey="migration"
            name={t('scatter.tip.netMigration')}
            domain={xDomain}
            allowDataOverflow
            tick={{ fontSize: 12 }}
            tickFormatter={(v) => `${v.toFixed(0)}%`}
            label={{
              value: t('scatter.xAxis'),
              position: 'insideBottom',
              offset: -22,
              style: { textAnchor: 'middle', fontSize: 13, fill: '#555' },
            }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name={isPct(metric) ? t('labor.yname.wage') : t('labor.yname.unemp')}
            domain={yDomain}
            allowDataOverflow
            tick={{ fontSize: 12 }}
            width={60}
            tickFormatter={TICK_FMT[metric]}
            label={{
              value: metricLabel(metric, t),
              angle: -90,
              position: 'insideLeft',
              offset: 12,
              style: { textAnchor: 'middle', fontSize: 13, fill: '#555' },
            }}
          />
          <ReferenceLine
            x={natMig}
            stroke="#888"
            strokeDasharray="3 3"
            label={{
              value: t('scatter.ref.median', { v: natMig.toFixed(1) }),
              position: 'insideTopLeft',
              fontSize: 10,
              fill: '#666',
            }}
          />
          <ReferenceLine
            y={natY}
            stroke="#888"
            strokeDasharray="3 3"
            label={{
              value: natYLabel,
              position: 'insideTopRight',
              offset: 4,
              fontSize: 10,
              fill: '#666',
            }}
          />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            content={({ payload }) => {
              if (!payload || !payload.length) return null;
              const p = payload[0].payload as Point & { y: number };
              return (
                <div
                  style={{
                    background: '#fff',
                    border: '1px solid #ddd',
                    padding: '6px 10px',
                    fontSize: 12,
                  }}
                >
                  <strong>{p.city}</strong>
                  <div>
                    {t('scatter.tip.netMigration')}: {fmtNum(p.migration, 1)}%
                  </div>
                  <div>
                    {metric === 'wage_premium_fe'
                      ? t('labor.tip.wagePremiumFe')
                      : metric === 'wage_median'
                      ? t('labor.tip.wageMedian')
                      : metric === 'wage_mean'
                      ? t('labor.tip.wageMean')
                      : t('labor.tip.unemp')}
                    : {tooltipFmt(p, metric, t)}
                  </div>
                </div>
              );
            }}
          />
          <Scatter data={base} fill={BASE} fillOpacity={highlightCityId ? 0.35 : 1}>
            <LabelList
              dataKey="label"
              position="top"
              style={{ fontSize: 12, fill: '#444' }}
            />
          </Scatter>
          {highlight.length > 0 && (
            <Scatter data={highlight} fill={HIGHLIGHT} legendType="none">
              <LabelList
                dataKey="label"
                position="top"
                style={{ fontSize: 14, fontWeight: 600, fill: HIGHLIGHT }}
              />
            </Scatter>
          )}
          {drag && (
            <ReferenceArea
              x1={drag.x1}
              x2={drag.x2}
              y1={drag.y1}
              y2={drag.y2}
              stroke={HIGHLIGHT}
              strokeOpacity={0.6}
              fill={HIGHLIGHT}
              fillOpacity={0.1}
            />
          )}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
