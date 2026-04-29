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

type Point = {
  city_id: number;
  city: string;
  wageCagr: number;
  deltaU: number;
  u14: number;
  u24: number;
  expWagePctChange: number;
  aboveMedian: boolean;
};

type Props = {
  rows: CityPanelRow[];
  highlightCityId?: number;
};

type Domain = { x: [number, number]; y: [number, number] };
type MouseEvt = { xValue?: number; yValue?: number } | null;

const POS = '#36b250'; // GL palette green — above-median ΔE[w]
const NEG = '#c64646'; // GL highlight red — below-median ΔE[w]

const median = (arr: number[]): number => {
  const a = [...arr].sort((x, y) => x - y);
  const n = a.length;
  if (n === 0) return 0;
  return n % 2 === 0 ? (a[n / 2 - 1] + a[n / 2]) / 2 : a[(n - 1) / 2];
};

// Decomposition view of the expected wage E[w] = (1 − u) · w. X = wage CAGR,
// Y = change in unemployment rate (percentage points). Quadrants split at the
// cross-city medians of each axis. Dots are colored binary — green if the
// city's actual %ΔE[w] is above the cross-city median, red if below — so the
// reader can see which combinations net positive without any contour math.
//
// Drag-to-zoom: press and drag inside the plot to clamp the X/Y domains.
export default function ExpectedWageDecomposition({ rows, highlightCityId }: Props) {
  const { points, medianG, medianDU, medianM } = useMemo(() => {
    const raw = cityPairs(rows)
      .map((p) => {
        const u14 = p.r2014.unemp_rate_total;
        const u24 = p.r2024.unemp_rate_total;
        const w14 = p.r2014.cnss_avg_daily_wage;
        const w24 = p.r2024.cnss_avg_daily_wage;
        if (u14 == null || u24 == null || w14 == null || w24 == null) return null;
        const g = cagr(w14, w24, 10);
        if (g == null) return null;
        const e14 = (1 - u14 / 100) * w14;
        const e24 = (1 - u24 / 100) * w24;
        if (e14 <= 0 || e24 <= 0) return null;
        return {
          city_id: p.city_id,
          city: cleanCityName(p.city_name),
          wageCagr: g,
          deltaU: u24 - u14,
          u14,
          u24,
          expWagePctChange: ((e24 - e14) / e14) * 100,
        };
      })
      .filter((p): p is Omit<Point, 'aboveMedian'> => p !== null);

    const medianG = median(raw.map((p) => p.wageCagr));
    const medianDU = median(raw.map((p) => p.deltaU));
    const medianM = median(raw.map((p) => p.expWagePctChange));

    const points: Point[] = raw.map((p) => ({
      ...p,
      aboveMedian: p.expWagePctChange > medianM,
    }));

    return { points, medianG, medianDU, medianM };
  }, [rows]);

  const [zoom, setZoom] = useState<Domain | null>(null);
  const [drag, setDrag] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);

  const visiblePoints = useMemo(() => {
    if (!zoom) return points;
    return points.filter(
      (p) =>
        p.wageCagr >= zoom.x[0] &&
        p.wageCagr <= zoom.x[1] &&
        p.deltaU >= zoom.y[0] &&
        p.deltaU <= zoom.y[1],
    );
  }, [points, zoom]);

  // Outliers (relative to the medians) get labelled — fewer when zoomed in.
  const labelCutoff = useMemo(() => {
    const dists = visiblePoints
      .map((p) => Math.hypot(p.wageCagr - medianG, p.deltaU - medianDU))
      .sort((a, b) => b - a);
    const k = zoom ? Math.min(dists.length - 1, 7) : Math.min(dists.length - 1, 11);
    return dists[k] ?? 0;
  }, [visiblePoints, medianG, medianDU, zoom]);

  const labelFor = (p: Point) => {
    if (p.city_id === highlightCityId) return p.city;
    if (zoom) {
      const inView =
        p.wageCagr >= zoom.x[0] &&
        p.wageCagr <= zoom.x[1] &&
        p.deltaU >= zoom.y[0] &&
        p.deltaU <= zoom.y[1];
      if (!inView) return '';
    }
    return Math.hypot(p.wageCagr - medianG, p.deltaU - medianDU) >= labelCutoff
      ? p.city
      : '';
  };

  // Two series for the binary fill. The highlight city (if any) is layered on
  // top in its own series so it can be drawn larger with a black ring.
  const above = points
    .filter((p) => p.aboveMedian && p.city_id !== highlightCityId)
    .map((p) => ({ ...p, label: labelFor(p) }));
  const below = points
    .filter((p) => !p.aboveMedian && p.city_id !== highlightCityId)
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
    if (xHi - xLo > 0.2 && yHi - yLo > 0.5) {
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
            dataKey="wageCagr"
            name="Wage CAGR"
            unit="%"
            domain={xDomain}
            allowDataOverflow
            tick={{ fontSize: 12 }}
            tickFormatter={(v) => `${v.toFixed(1)}%`}
            label={{
              value: 'CNSS daily wage, CAGR 2014–2024 (% / yr)',
              position: 'insideBottom',
              offset: -22,
              style: { textAnchor: 'middle', fontSize: 13, fill: '#555' },
            }}
          />
          <YAxis
            type="number"
            dataKey="deltaU"
            name="Δ Unemp"
            unit=" pp"
            domain={yDomain}
            allowDataOverflow
            tick={{ fontSize: 12 }}
            width={60}
            tickFormatter={(v) => `${v >= 0 ? '+' : ''}${v.toFixed(0)}`}
            label={{
              value: 'Δ Unemployment rate, 2014→2024 (pp)',
              angle: -90,
              position: 'insideLeft',
              offset: 12,
              style: { textAnchor: 'middle', fontSize: 13, fill: '#555' },
            }}
          />
          <ReferenceLine
            x={medianG}
            stroke="#888"
            strokeDasharray="3 3"
            label={{
              value: `median ${fmtNum(medianG, 1)}% / yr`,
              position: 'insideTopRight',
              fontSize: 10,
              fill: '#666',
            }}
          />
          <ReferenceLine
            y={medianDU}
            stroke="#888"
            strokeDasharray="3 3"
            label={{
              value: `median ${medianDU >= 0 ? '+' : ''}${fmtNum(medianDU, 1)} pp`,
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
                  <div>Wage CAGR: {fmtNum(p.wageCagr, 1)}% / yr</div>
                  <div>
                    Δ Unemp: {p.deltaU >= 0 ? '+' : ''}
                    {fmtNum(p.deltaU, 1)} pp ({fmtNum(p.u14, 1)}% → {fmtNum(p.u24, 1)}%)
                  </div>
                  <div style={{ marginTop: 4, color: p.aboveMedian ? POS : NEG }}>
                    %ΔE[w]: {p.expWagePctChange >= 0 ? '+' : ''}
                    {fmtNum(p.expWagePctChange, 1)}%{' '}
                    ({p.aboveMedian ? 'above' : 'below'} median {fmtNum(medianM, 1)}%)
                  </div>
                </div>
              );
            }}
          />
          <Scatter data={above} fill={POS}>
            <LabelList
              dataKey="label"
              position="top"
              style={{ fontSize: 12, fill: '#444' }}
            />
          </Scatter>
          <Scatter data={below} fill={NEG}>
            <LabelList
              dataKey="label"
              position="top"
              style={{ fontSize: 12, fill: '#444' }}
            />
          </Scatter>
          {highlight.length > 0 && (
            <Scatter
              data={highlight}
              fill={highlight[0].aboveMedian ? POS : NEG}
              shape={(props: { cx?: number; cy?: number }) =>
                props.cx == null || props.cy == null ? (
                  <g />
                ) : (
                  <circle
                    cx={props.cx}
                    cy={props.cy}
                    r={7}
                    fill={highlight[0].aboveMedian ? POS : NEG}
                    stroke="#1a1a1a"
                    strokeWidth={1.5}
                  />
                )
              }
              legendType="none"
            >
              <LabelList
                dataKey="label"
                position="top"
                style={{ fontSize: 14, fontWeight: 600, fill: '#1a1a1a' }}
              />
            </Scatter>
          )}
          {drag && (
            <ReferenceArea
              x1={drag.x1}
              x2={drag.x2}
              y1={drag.y1}
              y2={drag.y2}
              stroke="#888"
              strokeOpacity={0.6}
              fill="#888"
              fillOpacity={0.08}
            />
          )}
        </ScatterChart>
      </ResponsiveContainer>
      <div className="quadrant-legend">
        <div>
          <div className="q-name">Top-left · stagnant wages, rising unemployment</div>
          <div className="q-desc">
            Both moves cut into the expected wage — local economy losing ground on both margins.
          </div>
        </div>
        <div>
          <div className="q-name">Top-right · wages and unemployment both rising</div>
          <div className="q-desc">
            Demand expanded but in-migration outpaced job creation — a positive shock with an
            even stronger supply response.
          </div>
        </div>
        <div>
          <div className="q-name">Bottom-left · slow wage growth, unemployment falling</div>
          <div className="q-desc">
            Jobs being added without the pay envelope expanding — relatively low-quality
            employment growth.
          </div>
        </div>
        <div>
          <div className="q-name">Bottom-right · wages rising, unemployment falling</div>
          <div className="q-desc">
            Both margins improving — the textbook positive labor-demand shock.
          </div>
        </div>
      </div>
      <p className="chart-caption" style={{ marginTop: 8 }}>
        Green dots: cities whose expected wage E[w] = (1 − u) · w grew by more than the
        cross-city median ({fmtNum(medianM, 1)}%). Red dots: below-median.
      </p>
    </div>
  );
}
