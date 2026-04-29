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

type Point = {
  city_id: number;
  city: string;
  migration: number;
  wageCagr: number;
};

type Props = {
  rows: CityPanelRow[];
  highlightCityId?: number;
};

type Domain = { x: [number, number]; y: [number, number] };

const HIGHLIGHT = '#c64646';
const BASE = '#1a1a1a';

// Recharts mouse-event payload (their type isn't exported nicely).
type MouseEvt = {
  xValue?: number;
  yValue?: number;
  chartX?: number;
  chartY?: number;
} | null;

// Changes-vs-changes view: x = 10-yr net migration, y = wage CAGR. Reference
// lines mark national norms (aggregate-wage CAGR; simple cross-city mean for
// migration). Quadrants therefore compare each city against the national pace
// of wage growth rather than against zero.
//
// Drag-to-zoom: press and drag inside the plot to select a rectangle. On release
// the X/Y domains are clamped to the selection. Click "Reset" to clear.
export default function MigrationVsWageScatter({ rows, highlightCityId }: Props) {
  const { points, natWageCagr, natMig } = useMemo(() => {
    const points: Point[] = cityPairs(rows)
      .map((p) => {
        const c = cagr(p.r2014.cnss_avg_daily_wage, p.r2024.cnss_avg_daily_wage, 10);
        const m = p.r2024.mig_10yr_net_pct;
        if (c == null || m == null) return null;
        return {
          city_id: p.city_id,
          city: cleanCityName(p.city_name),
          migration: m as number,
          wageCagr: c,
        };
      })
      .filter((p): p is Point => p !== null);

    // National wage CAGR = CAGR of the aggregate national daily wage
    // (sum_salary / sum_days) between 2014 and 2024 — the wage growth a typical
    // formal-sector worker actually saw, not a cross-city mean of CAGRs.
    const agg = (year: number) => {
      const ys = rows.filter((r) => r.year === year);
      const sal = ys.reduce((s, r) => s + (r.cnss_salary ?? 0), 0);
      const days = ys.reduce((s, r) => s + (r.cnss_days ?? 0), 0);
      return days > 0 ? sal / days : null;
    };
    const w14 = agg(2014);
    const w24 = agg(2024);
    const natWageCagr = cagr(w14, w24, 10) ?? 0;

    // National migration reference = simple mean across cities. Population-
    // weighted equals zero by construction (net migration is internal), so a
    // city-level reference is what makes the chart legible.
    const migs = points.map((p) => p.migration);
    const natMig = migs.length ? migs.reduce((s, v) => s + v, 0) / migs.length : 0;

    return { points, natWageCagr, natMig };
  }, [rows]);

  const [zoom, setZoom] = useState<Domain | null>(null);
  const [drag, setDrag] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);

  // Cities visible in the current view — used for label-density logic so when
  // zoomed in we label the points the user actually sees rather than the
  // dataset-level outliers (which by definition aren't in the zoom window).
  const visiblePoints = useMemo(() => {
    if (!zoom) return points;
    return points.filter(
      (p) =>
        p.migration >= zoom.x[0] &&
        p.migration <= zoom.x[1] &&
        p.wageCagr >= zoom.y[0] &&
        p.wageCagr <= zoom.y[1],
    );
  }, [points, zoom]);

  // Label points furthest from the national-average origin within the visible
  // window, plus the highlighted city. Both axes are in percent units, so
  // distance is computed in those units (with a 5× scale on Y to reflect that
  // wage CAGR varies on a tighter range than migration).
  const cutoff = useMemo(() => {
    const dists = visiblePoints
      .map((p) => Math.hypot(p.migration - natMig, (p.wageCagr - natWageCagr) * 5))
      .sort((a, b) => b - a);
    const k = zoom ? Math.min(dists.length - 1, 7) : Math.min(dists.length - 1, 11);
    return dists[k] ?? 0;
  }, [visiblePoints, natWageCagr, natMig, zoom]);

  const labelFor = (p: Point) => {
    if (p.city_id === highlightCityId) return p.city;
    if (zoom) {
      const inView =
        p.migration >= zoom.x[0] &&
        p.migration <= zoom.x[1] &&
        p.wageCagr >= zoom.y[0] &&
        p.wageCagr <= zoom.y[1];
      if (!inView) return '';
    }
    return Math.hypot(p.migration - natMig, (p.wageCagr - natWageCagr) * 5) >= cutoff
      ? p.city
      : '';
  };

  const base = points
    .filter((p) => p.city_id !== highlightCityId)
    .map((p) => ({ ...p, label: labelFor(p) }));
  const highlight = points
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
    // Ignore stray clicks: require the rectangle to be at least 1% wide on x
    // and 0.2% tall on y (the units differ since migration is a 10-yr % and
    // CAGR is annualized).
    if (xHi - xLo > 1 && yHi - yLo > 0.2) {
      setZoom({ x: [xLo, xHi], y: [yLo, yHi] });
    }
    setDrag(null);
  };

  const xDomain: [number | string, number | string] = zoom ? zoom.x : ['auto', 'auto'];
  const yDomain: [number | string, number | string] = zoom ? zoom.y : ['auto', 'auto'];

  return (
    <div>
      <div className="chart-toolbar">
        <span className="chart-toolbar-hint">
          {zoom ? 'Zoomed in' : 'Drag a rectangle to zoom in'}
        </span>
        {zoom && (
          <button type="button" className="btn-link" onClick={() => setZoom(null)}>
            Reset zoom
          </button>
        )}
      </div>
      <ResponsiveContainer width="100%" height={540}>
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
            dataKey="wageCagr"
            name="Wage CAGR"
            unit="%"
            domain={yDomain}
            allowDataOverflow
            tick={{ fontSize: 12 }}
            width={56}
            tickFormatter={(v) => `${v.toFixed(1)}%`}
            label={{
              value: 'CNSS daily wage, CAGR 2014–2024 (%)',
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
            y={natWageCagr}
            stroke="#888"
            strokeDasharray="3 3"
            label={{
              value: `nat. avg ${natWageCagr.toFixed(1)}% / yr`,
              position: 'insideRight',
              fontSize: 10,
              fill: '#666',
            }}
          />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            content={({ payload }) => {
              if (!payload || !payload.length) return null;
              const p = payload[0].payload as Point;
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
                  <div>Net migration: {p.migration.toFixed(1)}%</div>
                  <div>Wage CAGR: {p.wageCagr.toFixed(1)}% / yr</div>
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

      <div className="quadrant-legend">
        <div>
          <div className="q-name">Top-left · wages rising, people leaving</div>
          <div className="q-desc">Pay grew faster than the national norm but the city still lost population — supply outran labor demand, or amenities/cost-of-living dominate.</div>
        </div>
        <div>
          <div className="q-name">Top-right · positive demand shock</div>
          <div className="q-desc">Wages and migration both above the national pace — labor demand is rising and workers are responding. The textbook story.</div>
        </div>
        <div>
          <div className="q-name">Bottom-left · negative demand shock</div>
          <div className="q-desc">Wage growth lagging and net outflows — the local economy is shedding both pay and people.</div>
        </div>
        <div>
          <div className="q-name">Bottom-right · attracting despite slow wage growth</div>
          <div className="q-desc">People are arriving even though wages aren't outpacing the country — driven by affordability, jobs that aren't yet showing up in CNSS pay, or non-wage pull.</div>
        </div>
      </div>
    </div>
  );
}
