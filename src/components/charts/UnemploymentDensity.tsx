import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { CityPanelRow } from '../../data/types';
import { cleanCityName } from '../../lib/derive';

type Props = {
  rows: CityPanelRow[];
  /**
   * If set, mark this city instead of the default Casablanca + Oujda anchors.
   * Used on the city profile page so the chart focuses on a single city.
   */
  highlightCityId?: number;
};

const HIGHLIGHT = '#c64646';
const FILL = '#1a1a1a';

// Gaussian KDE with Silverman's rule of thumb. Returns y-values at evenly-spaced
// x-points spanning the data range plus a small bandwidth-sized pad.
function kde(values: number[], nPoints = 120) {
  const n = values.length;
  if (n === 0) return [];
  const mean = values.reduce((s, v) => s + v, 0) / n;
  const variance =
    values.reduce((s, v) => s + (v - mean) ** 2, 0) / Math.max(n - 1, 1);
  const sd = Math.sqrt(variance);
  const bw = Math.max(0.6, 1.06 * sd * Math.pow(n, -1 / 5));
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pad = bw * 2;
  const xLo = Math.max(0, lo - pad);
  const xHi = hi + pad;
  const step = (xHi - xLo) / (nPoints - 1);
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < nPoints; i++) {
    const x = xLo + step * i;
    let y = 0;
    for (const v of values) {
      const z = (x - v) / bw;
      y += Math.exp(-0.5 * z * z) / (Math.sqrt(2 * Math.PI) * bw);
    }
    out.push({ x, y: y / n });
  }
  return out;
}

export default function UnemploymentDensity({ rows, highlightCityId }: Props) {
  const { density, markers } = useMemo(() => {
    const r24 = rows.filter((r) => r.year === 2024);
    const valid = r24
      .map((r) => ({
        id: r.city_id,
        name: cleanCityName(r.city_name),
        rate: r.unemp_rate_total,
      }))
      .filter(
        (d): d is { id: number; name: string; rate: number } => d.rate != null,
      );

    const values = valid.map((d) => d.rate);

    let m: { label: string; rate: number }[] = [];
    if (highlightCityId != null) {
      const hit = valid.find((d) => d.id === highlightCityId);
      if (hit) m = [{ label: hit.name, rate: hit.rate }];
    } else {
      const find = (q: string) =>
        valid.find((d) => d.name.toLowerCase() === q)?.rate ?? null;
      const casa = find('casablanca');
      const oujda = find('oujda');
      if (casa != null) m.push({ label: 'Casablanca', rate: casa });
      if (oujda != null) m.push({ label: 'Oujda', rate: oujda });
    }

    return { density: kde(values), markers: m };
  }, [rows, highlightCityId]);

  if (density.length === 0) return null;

  return (
    <div style={{ margin: '0.6rem 0 1.4rem' }}>
      <ResponsiveContainer width="100%" height={140}>
        <AreaChart
          data={density}
          margin={{ top: 26, right: 16, bottom: 28, left: 8 }}
        >
          <XAxis
            type="number"
            dataKey="x"
            domain={['dataMin', 'dataMax']}
            tick={{ fontSize: 11, fill: '#666' }}
            tickFormatter={(v) => `${v.toFixed(0)}%`}
            label={{
              value: 'Unemployment rate, 2024 — distribution across 63 cities',
              position: 'insideBottom',
              offset: -14,
              style: { textAnchor: 'middle', fontSize: 12, fill: '#666' },
            }}
          />
          <YAxis hide domain={[0, 'dataMax']} />
          <Area
            type="monotone"
            dataKey="y"
            stroke={FILL}
            strokeWidth={1}
            fill={FILL}
            fillOpacity={0.08}
            isAnimationActive={false}
          />
          {markers.map((m) => (
            <ReferenceLine
              key={m.label}
              x={m.rate}
              stroke={HIGHLIGHT}
              strokeWidth={1.5}
              label={{
                value: `${m.label} · ${m.rate.toFixed(1)}%`,
                position: 'top',
                fontSize: 11,
                fill: HIGHLIGHT,
                offset: 6,
              }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
