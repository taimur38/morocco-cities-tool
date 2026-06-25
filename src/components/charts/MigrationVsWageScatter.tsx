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
import { useT } from '../../i18n/ui';

type Point = {
  city_id: number;
  city: string;
  migration: number;
  wageCagr: number;
};

type WageStat = 'median' | 'mean';

// Y-axis measure. 'raw' = wage CAGR; 'fe' = annualized change in the city's two-way
// (city + industry) fixed-effects wage premium, computed upstream. The latter needs
// feGrowthByCity and is expressed as a deviation from national pace (0).
type YMode = 'raw' | 'fe';

type Props = {
  rows: CityPanelRow[];
  highlightCityId?: number;
  wageStat?: WageStat;
  // Which measure to plot on the Y axis. 'raw' (default) = wage CAGR; 'fe' = the
  // regression fixed-effects wage-premium growth, which requires feGrowthByCity.
  yMode?: YMode;
  // Cleaned display names (as produced by cleanCityName) that should always be
  // labeled regardless of salience — e.g. cities the surrounding prose calls out.
  alwaysLabel?: string[];
  // The quadrant-interpretation legend below the chart. On by default; pass false
  // to suppress it when the same legend already appears above (e.g. a second chart
  // sharing the same quadrant framing).
  showQuadrantLegend?: boolean;
  // Per-city annualized change in the two-way (city + industry) fixed-effects wage
  // premium (wage_premium_fe_growth, computed upstream). Required when yMode='fe';
  // if absent the chart falls back to raw CAGR.
  feGrowthByCity?: Map<number, number>;
};

type Domain = { x: [number, number]; y: [number, number] };

// Horizontal placement of a city label relative to its dot. 'middle' centers the
// text above the point; 'start'/'end' anchor it to the right/left so labels for
// cities at the extreme edges of the plot stay inside the frame instead of being
// clipped (e.g. Tangier on the far right, Ben Guerir on the far left).
type Anchor = 'start' | 'middle' | 'end';
type LabeledPoint = Point & { label: string; anchor: Anchor };

const HIGHLIGHT = '#c64646';
const BASE = '#1a1a1a';

// Custom LabelList renderer: places each city name above its dot with an
// edge-aware text anchor (see Anchor). Recharts hands us the point's viewBox
// (x/y/width/height in pixels) and the entry index, which we use to look up the
// matching datum — and its precomputed anchor — in `arr`.
const cityLabelContent =
  (arr: LabeledPoint[], style: { fontSize: number; fontWeight?: number; fill: string }) =>
  (props: {
    // Recharts' ViewBox is a Cartesian | Polar union; we only use the Cartesian
    // fields but include cx/cy so the type stays assignable from the union.
    viewBox?: { x?: number; y?: number; width?: number; height?: number; cx?: number; cy?: number };
    index?: number;
  }) => {
    const { viewBox, index } = props;
    if (!viewBox || index == null || viewBox.x == null || viewBox.y == null) return null;
    const d = arr[index];
    if (!d || !d.label) return null;
    const cx = viewBox.x + (viewBox.width ?? 0) / 2;
    // Nudge edge labels a few px off the dot so the text doesn't sit on the point.
    const dx = d.anchor === 'end' ? -4 : d.anchor === 'start' ? 4 : 0;
    return (
      <text
        x={cx + dx}
        y={viewBox.y - 6}
        textAnchor={d.anchor}
        style={{ fontSize: style.fontSize, fontWeight: style.fontWeight, fill: style.fill }}
      >
        {d.label}
      </text>
    );
  };

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
export default function MigrationVsWageScatter({
  rows,
  highlightCityId,
  wageStat = 'mean',
  yMode = 'raw',
  alwaysLabel,
  showQuadrantLegend = true,
  feGrowthByCity,
}: Props) {
  const t = useT();
  const alwaysLabelKey = (alwaysLabel ?? []).join('|');
  const hasFe = !!feGrowthByCity && feGrowthByCity.size > 0;
  // Fall back to raw if the requested mode's data isn't available, so we can't
  // strand on an empty derived view.
  const mode: YMode = yMode === 'fe' && !hasFe ? 'raw' : yMode;
  const isDeriv = mode !== 'raw';

  const yByCity = mode === 'fe' ? feGrowthByCity ?? null : null;

  const { points, natWageCagr, natMig } = useMemo(() => {
    // Require both wage statistics (and migration) so the data array stays
    // stable across the median/mean toggle. Recharts animates scatter points
    // by their position in the data array, so any change in length or order
    // makes a dot interpolate to the wrong city's new position.
    const points: Point[] = cityPairs(rows)
      .map((p) => {
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
        const m = p.r2024.mig_10yr_net_pct;
        // In a derived mode the Y value comes from the per-city measure instead of
        // the raw wage CAGR; require whichever one we plot.
        const derived = isDeriv ? yByCity?.get(p.city_id) ?? null : null;
        const wageCagr = isDeriv ? derived : wageStat === 'median' ? cMed : cMean;
        if (wageCagr == null || m == null) return null;
        return {
          city_id: p.city_id,
          city: cleanCityName(p.city_name),
          migration: m as number,
          wageCagr,
        };
      })
      .filter((p): p is Point => p !== null);

    // National wage reference line. In a derived mode the measure is already a
    // deviation from national pace, so the benchmark is 0 by construction. For
    // raw mean wages we use the days-weighted national average (sum_salary /
    // sum_days) — the wage a typical formal-sector worker actually saw. For raw
    // median wages we use the cross-city median CAGR, since a national median
    // can't be computed by summing city-level aggregates.
    let natWageCagr: number;
    if (isDeriv) {
      natWageCagr = 0;
    } else if (wageStat === 'mean') {
      const agg = (year: number) => {
        const ys = rows.filter((r) => r.year === year);
        const sal = ys.reduce((s, r) => s + (r.cnss_salary ?? 0), 0);
        const days = ys.reduce((s, r) => s + (r.cnss_days ?? 0), 0);
        return days > 0 ? sal / days : null;
      };
      natWageCagr = cagr(agg(2014), agg(2024), 10) ?? 0;
    } else {
      const cagrs = points.map((p) => p.wageCagr).sort((a, b) => a - b);
      const n = cagrs.length;
      natWageCagr = n === 0 ? 0 : n % 2 === 0 ? (cagrs[n / 2 - 1] + cagrs[n / 2]) / 2 : cagrs[(n - 1) / 2];
    }

    // National migration reference = cross-city median. Population-weighted
    // equals zero by construction (net migration is internal); median is
    // robust to the long right tail of fast-growing peripheries (Ain El
    // Aouda, Deroua, Tangier) that would otherwise drag a mean upward.
    const migsSorted = points.map((p) => p.migration).sort((a, b) => a - b);
    const mN = migsSorted.length;
    const natMig =
      mN === 0
        ? 0
        : mN % 2 === 0
        ? (migsSorted[mN / 2 - 1] + migsSorted[mN / 2]) / 2
        : migsSorted[(mN - 1) / 2];

    return { points, natWageCagr, natMig };
  }, [rows, wageStat, isDeriv, yByCity]);

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

  // Which cities to label. We rank points by salience — distance from the
  // national-norm origin, normalized by the visible span on each axis so the two
  // axes are comparable — then accept them greedily, skipping any candidate whose
  // label box would collide with one already accepted. Bounding-box de-confliction
  // (rather than a fixed top-K) lets us show more labels while avoiding pile-ups
  // where several notable cities cluster together. The label box is modeled as
  // wider than tall (GAP_X > GAP_Y) since the text is horizontal.
  const labeledIds = useMemo(() => {
    const ids = new Set<number>();
    if (visiblePoints.length === 0) return ids;
    const xs = visiblePoints.map((p) => p.migration);
    const ys = visiblePoints.map((p) => p.wageCagr);
    const xSpan = Math.max(...xs) - Math.min(...xs) || 1;
    const ySpan = Math.max(...ys) - Math.min(...ys) || 1;
    const GAP_X = 0.085;
    const GAP_Y = 0.045;
    const accepted: Point[] = [];
    const tryAccept = (p: Point) => {
      const clash = accepted.some(
        (a) =>
          Math.abs((a.migration - p.migration) / xSpan) < GAP_X &&
          Math.abs((a.wageCagr - p.wageCagr) / ySpan) < GAP_Y,
      );
      if (clash) return;
      accepted.push(p);
      ids.add(p.city_id);
    };
    // Highlighted city is always labeled, and seeds the conflict set first so
    // nearby cities yield to it.
    const hl = visiblePoints.find((p) => p.city_id === highlightCityId);
    if (hl) {
      accepted.push(hl);
      ids.add(hl.city_id);
    }
    // Cities the prose calls out are forced on next — labeled regardless of
    // salience or collisions, and seeding the conflict set so neighbours defer.
    const forced = new Set(alwaysLabelKey ? alwaysLabelKey.split('|') : []);
    if (forced.size > 0) {
      for (const p of visiblePoints) {
        if (forced.has(p.city) && !ids.has(p.city_id)) {
          accepted.push(p);
          ids.add(p.city_id);
        }
      }
    }
    const max = zoom ? 14 : 20;
    const ranked = visiblePoints
      .filter((p) => p.city_id !== highlightCityId)
      .map((p) => ({
        p,
        d: Math.hypot((p.migration - natMig) / xSpan, (p.wageCagr - natWageCagr) / ySpan),
      }))
      .sort((a, b) => b.d - a.d);
    for (const { p } of ranked) {
      if (ids.size >= max) break;
      tryAccept(p);
    }
    return ids;
  }, [visiblePoints, natMig, natWageCagr, zoom, highlightCityId, alwaysLabelKey]);

  // 2.5% padding on either side of the data range so labels for cities at the
  // extreme ends don't get clipped by the plot edge.
  const padded = (vals: number[], pct = 0.025): [number, number] => {
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    const pad = (hi - lo) * pct || 1;
    return [lo - pad, hi + pad];
  };
  const xRange: [number, number] | null = zoom
    ? zoom.x
    : points.length
    ? padded(points.map((p) => p.migration))
    : null;

  // Edge-aware text anchor based on where the point sits in the x range: cities in
  // the outer ~18% on either side get their label anchored inward so it doesn't run
  // off the frame.
  const anchorFor = (mig: number): Anchor => {
    if (!xRange) return 'middle';
    const f = (mig - xRange[0]) / (xRange[1] - xRange[0] || 1);
    return f > 0.82 ? 'end' : f < 0.18 ? 'start' : 'middle';
  };

  const base: LabeledPoint[] = points
    .filter((p) => p.city_id !== highlightCityId)
    .map((p) => ({
      ...p,
      label: labeledIds.has(p.city_id) ? p.city : '',
      anchor: anchorFor(p.migration),
    }));
  const highlight: LabeledPoint[] = points
    .filter((p) => p.city_id === highlightCityId)
    .map((p) => ({ ...p, label: p.city, anchor: anchorFor(p.migration) }));

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

  const xDomain: [number | string, number | string] = xRange ?? ['auto', 'auto'];
  const yDomain: [number | string, number | string] = zoom ? zoom.y : ['auto', 'auto'];

  return (
    <div>
      <div className="chart-toolbar">
        <span className="chart-toolbar-hint">
          {zoom ? t('charts.zoomedIn') : t('charts.dragToZoom')}
        </span>
        {zoom && (
          <button type="button" className="btn-link" onClick={() => setZoom(null)}>
            {t('charts.resetZoom')}
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
            dataKey="wageCagr"
            name="Wage CAGR"
            domain={yDomain}
            allowDataOverflow
            tick={{ fontSize: 12 }}
            width={60}
            tickFormatter={(v) => `${v.toFixed(1)}%`}
            label={{
              value: isDeriv
                ? t('scatter.yAxis.fe')
                : t('scatter.yAxis.wage', { stat: t(`stat.adj.${wageStat}`) }),
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
            y={natWageCagr}
            stroke="#888"
            strokeDasharray="3 3"
            label={{
              value: isDeriv
                ? t('scatter.ref.nationalPace0')
                : wageStat === 'median'
                ? t('scatter.ref.medianPerYr', { v: natWageCagr.toFixed(1) })
                : t('scatter.ref.natAvgPerYr', { v: natWageCagr.toFixed(1) }),
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
                  <div>
                    {t('scatter.tip.netMigration')}: {p.migration.toFixed(1)}%
                  </div>
                  <div>
                    {isDeriv ? t('scatter.tip.fePremium') : t('scatter.tip.wageCagr')}:{' '}
                    {p.wageCagr.toFixed(1)}
                    {t('unit.percentPerYr')}
                  </div>
                </div>
              );
            }}
          />
          <Scatter data={base} fill={BASE} fillOpacity={highlightCityId ? 0.35 : 1}>
            <LabelList content={cityLabelContent(base, { fontSize: 12, fill: '#444' })} />
          </Scatter>
          {highlight.length > 0 && (
            <Scatter data={highlight} fill={HIGHLIGHT} legendType="none">
              <LabelList
                content={cityLabelContent(highlight, {
                  fontSize: 14,
                  fontWeight: 600,
                  fill: HIGHLIGHT,
                })}
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

      {showQuadrantLegend && (
        <div className="quadrant-legend">
          <div>
            <div className="q-name">{t('quad.tl.name')}</div>
            <div className="q-desc">{t('quad.tl.desc')}</div>
          </div>
          <div>
            <div className="q-name">{t('quad.tr.name')}</div>
            <div className="q-desc">{t('quad.tr.desc')}</div>
          </div>
          <div>
            <div className="q-name">{t('quad.bl.name')}</div>
            <div className="q-desc">{t('quad.bl.desc')}</div>
          </div>
          <div>
            <div className="q-name">{t('quad.br.name')}</div>
            <div className="q-desc">{t('quad.br.desc')}</div>
          </div>
        </div>
      )}
    </div>
  );
}
