import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CityCoiRow, CityComplexityRow, CityPanelRow } from '../../data/types';
import MorphScatter, { type Domain, type ScatterMark } from './MorphScatter';
import { cleanCityName } from '../../lib/derive';
import { citySlug } from '../../lib/slug';
import { fmtInt } from '../../lib/format';
import { useT } from '../../i18n/ui';

// Cities placed by two questions. x: is the city more or less complex than its
// size predicts — the residual of 2024 ECI (headcount-based) on log 2024
// population, fitted across the cities shown. y: how much complexity lies
// within reach — the Complexity Outlook Index, which sums the PCI of industries
// the city lacks, weighted by how close each is to what the city already does.
// The reader picks the closeness: predicted entry probability from both
// densities together (default), labour-flow density, or co-location density.
// Switching it moves the same dots vertically.

type YMetric = 'joint' | 'flow' | 'colocation';

const HIGHLIGHT = '#c64646';
const INK = '#1a1a1a';

type Point = {
  city_id: number;
  name: string;
  slug: string;
  pop: number;
  eci: number;
  resid: number;
  joint: number;
  flow: number;
  colocation: number;
};

const sg = (v: number, d = 2) => `${v > 0 ? '+' : ''}${v.toFixed(d)}`;

export default function ComplexityOutlook({
  panel,
  complexity,
  coi,
  cityId,
}: {
  panel: CityPanelRow[];
  complexity: CityComplexityRow[];
  coi: CityCoiRow[];
  cityId: number;
}) {
  const t = useT();
  const navigate = useNavigate();
  const [metric, setMetric] = useState<YMetric>('joint');
  const [zoom, setZoom] = useState<Domain | null>(null);

  const { points, fit } = useMemo(() => {
    const pop = new Map(
      panel.filter((r) => r.year === 2024 && r.pop_total).map((r) => [r.city_id, r.pop_total as number]),
    );
    const eci = new Map(
      complexity
        .filter((r) => r.year === 2024 && r.eci_workers != null)
        .map((r) => [r.city_id, r.eci_workers as number]),
    );
    const base = coi
      .filter((c) => pop.has(c.city_id) && eci.has(c.city_id))
      .map((c) => ({
        city_id: c.city_id,
        name: cleanCityName(c.city_name),
        slug: citySlug(c.city_name),
        pop: pop.get(c.city_id)!,
        eci: eci.get(c.city_id)!,
        joint: c.z_joint,
        flow: c.z_flow,
        colocation: c.z_colocation,
      }));
    // OLS of ECI on log population across the cities shown.
    const xs = base.map((p) => Math.log(p.pop));
    const ys = base.map((p) => p.eci);
    const n = xs.length || 1;
    const mx = xs.reduce((a, b) => a + b, 0) / n;
    const my = ys.reduce((a, b) => a + b, 0) / n;
    let sxy = 0;
    let sxx = 0;
    let syy = 0;
    for (let i = 0; i < xs.length; i++) {
      sxy += (xs[i] - mx) * (ys[i] - my);
      sxx += (xs[i] - mx) ** 2;
      syy += (ys[i] - my) ** 2;
    }
    const slope = sxx ? sxy / sxx : 0;
    const intercept = my - slope * mx;
    const r2 = sxx && syy ? (sxy * sxy) / (sxx * syy) : 0;
    const points: Point[] = base.map((p, i) => ({ ...p, resid: p.eci - (intercept + slope * xs[i]) }));
    return { points, fit: { slope, r2 } };
  }, [panel, complexity, coi]);

  // Label the highlighted city and the cities furthest from the centre on the
  // current reading, as the other city scatters do.
  const labelled = useMemo(() => {
    const sx = Math.max(...points.map((p) => Math.abs(p.resid))) || 1;
    const sy = Math.max(...points.map((p) => Math.abs(p[metric]))) || 1;
    return new Set(
      [...points]
        .sort((a, b) => Math.hypot(b.resid / sx, b[metric] / sy) - Math.hypot(a.resid / sx, a[metric] / sy))
        .slice(0, 9)
        .map((p) => p.city_id),
    );
  }, [points, metric]);

  const marks: ScatterMark[] = useMemo(
    () =>
      points.map((p) => {
        const self = p.city_id === cityId;
        return {
          key: String(p.city_id),
          x: p.resid,
          y: p[metric],
          r: self ? 6 : 4.5,
          fill: self ? HIGHLIGHT : INK,
          opacity: self ? 1 : 0.4,
          label: self || labelled.has(p.city_id) ? p.name : undefined,
          labelColor: self ? HIGHLIGHT : '#444',
          labelWeight: self ? 600 : 400,
          z: self ? 2 : 1,
        };
      }),
    [points, metric, cityId, labelled],
  );

  const byKey = useMemo(() => new Map(points.map((p) => [String(p.city_id), p])), [points]);
  const tooltip = (key: string) => {
    const p = byKey.get(key);
    if (!p) return null;
    return (
      <>
        <div className="treemap-tooltip-name">{p.name}</div>
        <dl className="treemap-tooltip-grid">
          <dt>{t('outlook.tip.resid')}</dt>
          <dd>{sg(p.resid)}</dd>
          <dt>{t('outlook.tip.eci')}</dt>
          <dd>{sg(p.eci)}</dd>
          <dt>{t('outlook.tip.pop')}</dt>
          <dd>{fmtInt.format(p.pop)}</dd>
          <dt>{t('outlook.y.joint')}</dt>
          <dd>{sg(p.joint)} SD</dd>
          <dt>{t('outlook.y.flow')}</dt>
          <dd>{sg(p.flow)} SD</dd>
          <dt>{t('outlook.y.colocation')}</dt>
          <dd>{sg(p.colocation)} SD</dd>
        </dl>
        {p.city_id !== cityId && <div className="opp-tip-hint">{t('outlook.tip.click')}</div>}
      </>
    );
  };

  return (
    <div>
      <div className="chart-toolbar">
        <span className="chart-toolbar-control">
          {t('charts.yAxis')}
          <span className="seg-toggle" role="group" aria-label={t('charts.yAxis')}>
            {(['joint', 'flow', 'colocation'] as YMetric[]).map((v) => (
              <button
                key={v}
                type="button"
                className={v === metric ? 'active' : undefined}
                aria-pressed={v === metric}
                onClick={() => {
                  setMetric(v);
                  setZoom(null);
                }}
              >
                {t(`outlook.y.${v}`)}
              </button>
            ))}
          </span>
        </span>
        <span style={{ flex: 1 }} />
        <span className="chart-toolbar-hint">{zoom ? t('charts.zoomedIn') : t('charts.dragToZoom')}</span>
        {zoom && (
          <button type="button" className="btn-link" onClick={() => setZoom(null)}>
            {t('charts.resetZoom')}
          </button>
        )}
      </div>
      <div className="morph-frame morph-frame--short">
        <MorphScatter
          marks={marks}
          refs={[
            { key: 'resid', axis: 'x', value: 0, label: t('outlook.ref.expected') },
            { key: 'avg', axis: 'y', value: 0 },
          ]}
          xLabel={t('outlook.axis.x')}
          yLabel={t(`outlook.axis.y.${metric}`)}
          xFmt={(v) => sg(v, 1)}
          yFmt={(v) => sg(v, v % 1 === 0 ? 0 : 1)}
          furnitureKey={metric}
          renderTooltip={tooltip}
          onSelect={(key) => {
            const p = byKey.get(key);
            if (p && p.city_id !== cityId) navigate(`/city/${p.slug}`);
          }}
          zoom={zoom}
          onZoom={setZoom}
        />
      </div>
      <p className="opp-counts">
        {t('outlook.fit', { n: points.length, b: fit.slope.toFixed(2), r2: fit.r2.toFixed(2) })}
      </p>
    </div>
  );
}
