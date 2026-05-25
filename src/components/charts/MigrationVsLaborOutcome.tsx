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

type Metric = 'wage' | 'unemp';
type WageStat = 'median' | 'mean';

type Point = {
  city_id: number;
  city: string;
  migration: number;
  wageCagr: number | null;
  unempDelta: number | null;
};

type Props = {
  rows: CityPanelRow[];
  highlightCityId?: number;
  wageStat?: WageStat;
};

type Domain = { x: [number, number]; y: [number, number] };
type MouseEvt = { xValue?: number; yValue?: number } | null;

const HIGHLIGHT = '#c64646';
const BASE = '#1a1a1a';

const metricLabel = (m: Metric, wageStat: WageStat): string =>
  m === 'wage'
    ? `CNSS ${wageStat} daily wage, CAGR 2014–2024 (%)`
    : 'Δ unemployment rate, 2014→2024 (pp)';

const TICK_FMT: Record<Metric, (v: number) => string> = {
  wage: (v) => `${v.toFixed(1)}%`,
  unemp: (v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}`,
};

const TOOLTIP_FMT: Record<Metric, (p: Point) => string> = {
  wage: (p) => (p.wageCagr == null ? '—' : `${p.wageCagr.toFixed(1)}% / yr`),
  unemp: (p) =>
    p.unempDelta == null
      ? '—'
      : `${p.unempDelta >= 0 ? '+' : ''}${p.unempDelta.toFixed(1)} pp`,
};

export default function MigrationVsLaborOutcome({
  rows,
  highlightCityId,
  wageStat = 'mean',
}: Props) {
  const [metric, setMetric] = useState<Metric>('unemp');

  const { points, natWageCagr, natUnempDelta, natMig } = useMemo(() => {
    const wageCol = wageStat === 'median' ? 'cnss_median_daily_wage' : 'cnss_avg_daily_wage';
    const points: Point[] = cityPairs(rows)
      .map((p) => {
        const mig = p.r2024.mig_10yr_net_pct;
        if (mig == null) return null;
        const wageCagr = cagr(p.r2014[wageCol], p.r2024[wageCol], 10);
        const u14 = p.r2014.unemp_rate_total;
        const u24 = p.r2024.unemp_rate_total;
        const unempDelta = u14 != null && u24 != null ? u24 - u14 : null;
        return {
          city_id: p.city_id,
          city: cleanCityName(p.city_name),
          migration: mig,
          wageCagr,
          unempDelta,
        };
      })
      .filter((p): p is Point => p !== null);

    // National wage CAGR: aggregate (days-weighted) average for mean wages;
    // cross-city median CAGR for median wages (since a national median can't
    // be built from city aggregates).
    let natWageCagr: number;
    if (wageStat === 'mean') {
      const aggWage = (year: number) => {
        const ys = rows.filter((r) => r.year === year);
        const sal = ys.reduce((s, r) => s + (r.cnss_salary ?? 0), 0);
        const days = ys.reduce((s, r) => s + (r.cnss_days ?? 0), 0);
        return days > 0 ? sal / days : null;
      };
      natWageCagr = cagr(aggWage(2014), aggWage(2024), 10) ?? 0;
    } else {
      const cs = points
        .map((p) => p.wageCagr)
        .filter((c): c is number => c != null)
        .sort((a, b) => a - b);
      const n = cs.length;
      natWageCagr = n === 0 ? 0 : n % 2 === 0 ? (cs[n / 2 - 1] + cs[n / 2]) / 2 : cs[(n - 1) / 2];
    }

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

    const migs = points.map((p) => p.migration);
    const natMig = migs.length ? migs.reduce((s, v) => s + v, 0) / migs.length : 0;

    return { points, natWageCagr, natUnempDelta, natMig };
  }, [rows, wageStat]);

  // Active points: filter out those missing the current Y metric.
  const active = useMemo(
    () =>
      points
        .map((p) => {
          const y = metric === 'wage' ? p.wageCagr : p.unempDelta;
          return y == null ? null : { ...p, y };
        })
        .filter((p): p is Point & { y: number } => p !== null),
    [points, metric],
  );

  const natY = metric === 'wage' ? natWageCagr : natUnempDelta;

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
        p.migration >= zoom.x[0] &&
        p.migration <= zoom.x[1] &&
        p.y >= zoom.y[0] &&
        p.y <= zoom.y[1],
    );
  }, [active, zoom]);

  // Y axes have different scales — wage CAGR is on a ~10pp range, unemp Δ on a
  // ~20pp range. Use the visible window's span to normalize distance for
  // outlier labeling so the same number of cities get labeled either way.
  const cutoff = useMemo(() => {
    if (visiblePoints.length === 0) return 0;
    const xSpan =
      Math.max(...visiblePoints.map((p) => p.migration)) -
      Math.min(...visiblePoints.map((p) => p.migration)) || 1;
    const ySpan =
      Math.max(...visiblePoints.map((p) => p.y)) -
      Math.min(...visiblePoints.map((p) => p.y)) || 1;
    const dists = visiblePoints
      .map((p) =>
        Math.hypot(
          (p.migration - natMig) / xSpan,
          (p.y - natY) / ySpan,
        ),
      )
      .sort((a, b) => b - a);
    const k = zoom ? Math.min(dists.length - 1, 7) : Math.min(dists.length - 1, 11);
    return dists[k] ?? 0;
  }, [visiblePoints, natMig, natY, zoom]);

  const labelFor = (p: Point & { y: number }) => {
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
      Math.max(...visiblePoints.map((q) => q.migration)) -
      Math.min(...visiblePoints.map((q) => q.migration)) || 1;
    const ySpan =
      Math.max(...visiblePoints.map((q) => q.y)) -
      Math.min(...visiblePoints.map((q) => q.y)) || 1;
    return Math.hypot((p.migration - natMig) / xSpan, (p.y - natY) / ySpan) >= cutoff
      ? p.city
      : '';
  };

  const base = active
    .filter((p) => p.city_id !== highlightCityId)
    .map((p) => ({ ...p, label: labelFor(p) }));
  const highlight = active
    .filter((p) => p.city_id === highlightCityId)
    .map((p) => ({ ...p, label: p.city }));

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

  const xDomain: [number | string, number | string] = zoom ? zoom.x : ['auto', 'auto'];
  const yDomain: [number | string, number | string] = zoom ? zoom.y : ['auto', 'auto'];

  const natYLabel =
    metric === 'wage'
      ? `nat. avg ${natY.toFixed(1)}% / yr`
      : `nat. avg ${natY >= 0 ? '+' : ''}${natY.toFixed(1)} pp`;

  return (
    <div>
      <div className="chart-toolbar">
        <label className="chart-toolbar-control">
          Y axis:
          <select
            className="chart-toolbar-select"
            value={metric}
            onChange={(e) => handleMetricChange(e.target.value as Metric)}
          >
            <option value="wage">{wageStat === 'median' ? 'Median' : 'Mean'} wage growth (CAGR, %)</option>
            <option value="unemp">Δ unemployment (pp)</option>
          </select>
        </label>
        <span style={{ flex: 1 }} />
        <span className="chart-toolbar-hint">
          {zoom ? 'Zoomed in' : 'Drag a rectangle to zoom in'}
        </span>
        {zoom && (
          <button type="button" className="btn-link" onClick={() => setZoom(null)}>
            Reset zoom
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
            name="Net migration"
            unit="%"
            domain={xDomain}
            allowDataOverflow
            tick={{ fontSize: 12 }}
            tickFormatter={(v) => `${v.toFixed(0)}%`}
            label={{
              value: 'Net migration (10-yr), %',
              position: 'insideBottom',
              offset: -22,
              style: { textAnchor: 'middle', fontSize: 13, fill: '#555' },
            }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name={metric === 'wage' ? 'Wage CAGR' : 'Δ unemployment'}
            domain={yDomain}
            allowDataOverflow
            tick={{ fontSize: 12 }}
            width={60}
            tickFormatter={TICK_FMT[metric]}
            label={{
              value: metricLabel(metric, wageStat),
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
              value: `nat. avg ${natMig.toFixed(1)}%`,
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
              position: 'insideRight',
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
                  <div>Net migration: {fmtNum(p.migration, 1)}%</div>
                  <div>
                    {metric === 'wage' ? 'Wage CAGR' : 'Δ unemployment'}: {TOOLTIP_FMT[metric](p)}
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
