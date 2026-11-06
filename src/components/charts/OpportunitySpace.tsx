import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type {
  CityIndustryDensityRow,
  FlowNeighbourRow,
  IndustryAttributeRow,
} from '../../data/types';
import MorphScatter, { type Domain, type ScatterMark } from './MorphScatter';
import { ComplexityLegend, WageLegend } from './treemapLegends';
import { complexityColor, divergingPctColor } from '../../lib/colorScales';
import { cleanCityName } from '../../lib/derive';
import { citySlug } from '../../lib/slug';
import { fmtInt } from '../../lib/format';
import { useLang } from '../../i18n/context';
import { useT } from '../../i18n/ui';

// The city's industries placed by two relatedness densities: co-location on x
// (how far the city's whole industrial profile resembles that of cities where
// the industry is found) and labour flow on y (how many of the industry's ten
// nearest skill neighbours the city is specialised in). Both are standardised
// across every city x industry cell in 2024, so the axes are the same for every
// city; the quadrant lines are cut either at that national average or at this
// city's own mean, and moving between the two is a tween of the lines.

type Show = 'all' | 'barely' | 'somewhat' | 'present';
type Lines = 'abs' | 'city';
type Colour = 'spec' | 'complexity' | 'wage';
type Size = 'uniform' | 'national' | 'local';
export type Quadrant = 'both' | 'labour' | 'colocation' | 'neither';

const INK = '#1a1a1a';
const MID = '#8a8a85';
const WAGE_DEV_BOUND = 50;

const SECTORS = [
  'Agriculture & mining',
  'Manufacturing',
  'Utilities & construction',
  'Trade & transport',
  'Business services',
  'Public & personal',
];

const quadrantOf = (zc: number, zf: number, cx: number, cy: number): Quadrant =>
  zf >= cy ? (zc >= cx ? 'both' : 'labour') : zc >= cx ? 'colocation' : 'neither';

const band = (rca: number): Exclude<Show, 'all'> =>
  rca >= 1 ? 'present' : rca >= 0.3 ? 'somewhat' : 'barely';

const sg = (v: number, d = 2) => `${v > 0 ? '+' : ''}${v.toFixed(d)}`;

type Props = {
  density: CityIndustryDensityRow[];
  neighbours: FlowNeighbourRow[];
  attributes: IndustryAttributeRow[];
  cityId: number;
  cityName: string;
  /** raw city names by id, for the host-city list */
  cityNames: Map<number, string>;
  cityMedianWage: number | null;
};

export default function OpportunitySpace({
  density,
  neighbours,
  attributes,
  cityId,
  cityName,
  cityNames,
  cityMedianWage,
}: Props) {
  const t = useT();
  const { lang } = useLang();
  const [show, setShow] = useState<Show>('all');
  const [lines, setLines] = useState<Lines>('abs');
  const [sector, setSector] = useState<string>('all');
  const [colour, setColour] = useState<Colour>('spec');
  const [size, setSize] = useState<Size>('uniform');
  const [zoom, setZoom] = useState<Domain | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  // A new city is a new picture: drop the zoom and any open detail.
  useEffect(() => {
    setZoom(null);
    setSelected(null);
  }, [cityId]);

  const attrBy = useMemo(() => new Map(attributes.map((a) => [a.ind, a])), [attributes]);
  const label = (ind: string) => {
    const a = attrBy.get(ind);
    return a ? (lang === 'fr' ? a.label_fr : a.label) : ind;
  };

  const d24 = useMemo(() => density.filter((r) => r.year === 2024), [density]);
  const rows = useMemo(
    () => d24.filter((r) => r.city_id === cityId && r.z_flow != null),
    [d24, cityId],
  );
  const rowBy = useMemo(() => new Map(rows.map((r) => [r.ind, r])), [rows]);

  // The city's own mean over every industry, independent of the filters, so the
  // lines do not move when the reader narrows what is shown.
  const cityMean = useMemo(() => {
    const n = rows.length || 1;
    return {
      zc: rows.reduce((s, r) => s + r.z_colocation, 0) / n,
      zf: rows.reduce((s, r) => s + (r.z_flow as number), 0) / n,
    };
  }, [rows]);
  const cx = lines === 'city' ? cityMean.zc : 0;
  const cy = lines === 'city' ? cityMean.zf : 0;

  const national = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of d24) m.set(r.ind, (m.get(r.ind) ?? 0) + r.workers);
    return m;
  }, [d24]);

  const pciScale = useMemo(() => {
    const v = attributes.map((a) => Math.abs(a.pci)).sort((a, b) => a - b);
    return v.length ? Math.max(0.5, v[Math.floor(v.length * 0.95)]) : 1;
  }, [attributes]);

  const sizeOf = useMemo(() => {
    if (size === 'uniform') return () => 4;
    const src = size === 'national' ? (ind: string) => national.get(ind) ?? 0 : (ind: string) => rowBy.get(ind)?.workers ?? 0;
    const max = Math.max(1, ...rows.map((r) => src(r.ind)));
    return (ind: string) => 2.2 + 9 * Math.sqrt(src(ind) / max);
  }, [size, national, rowBy, rows]);

  const fillOf = (r: CityIndustryDensityRow): { fill: string; stroke?: string } => {
    const a = attrBy.get(r.ind);
    if (colour === 'complexity') {
      return { fill: complexityColor(a?.pci ?? null, pciScale), stroke: r.rca >= 1 ? INK : undefined };
    }
    if (colour === 'wage') {
      const dev =
        a?.wage != null && cityMedianWage ? (100 * (a.wage - cityMedianWage)) / cityMedianWage : null;
      return {
        fill: dev == null ? '#eee' : divergingPctColor(dev, WAGE_DEV_BOUND),
        stroke: r.rca >= 1 ? INK : undefined,
      };
    }
    // Specialisation in greys: specialised filled ink, partly present mid-grey,
    // barely present an open ring.
    const b = band(r.rca);
    return b === 'present' ? { fill: INK } : b === 'somewhat' ? { fill: MID } : { fill: '#fff', stroke: MID };
  };

  const visible = (r: CityIndustryDensityRow) =>
    (show === 'all' || band(r.rca) === show) &&
    (sector === 'all' || attrBy.get(r.ind)?.sector === sector);

  const marks: ScatterMark[] = useMemo(
    () =>
      rows.map((r) => {
        const { fill, stroke } = fillOf(r);
        const on = visible(r);
        return {
          key: r.ind,
          x: r.z_colocation,
          y: r.z_flow,
          r: sizeOf(r.ind),
          fill,
          stroke,
          strokeWidth: 1,
          opacity: on ? (r.rca >= 1 ? 0.9 : 0.75) : 0,
          z: r.ind === selected ? 3 : r.rca >= 1 ? 2 : 1,
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, show, sector, colour, sizeOf, selected, pciScale, cityMedianWage, attrBy],
  );

  const counts = useMemo(() => {
    const c: Record<Quadrant, number> = { both: 0, labour: 0, colocation: 0, neither: 0 };
    let n = 0;
    for (const r of rows) {
      if (!visible(r)) continue;
      n++;
      c[quadrantOf(r.z_colocation, r.z_flow as number, cx, cy)]++;
    }
    return { c, n };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, show, sector, cx, cy, attrBy]);

  // Fixed to every industry in the city, so filtering fades marks out without
  // rescaling the axes under the ones that remain.
  const domain = useMemo<Domain>(() => {
    const xs = rows.map((r) => r.z_colocation).concat([0, cityMean.zc]);
    const ys = rows.map((r) => r.z_flow as number).concat([0, cityMean.zf]);
    const pad = (lo: number, hi: number): [number, number] => {
      const p = (hi - lo) * 0.05 || 0.5;
      return [lo - p, hi + p];
    };
    return { x: pad(Math.min(...xs), Math.max(...xs)), y: pad(Math.min(...ys), Math.max(...ys)) };
  }, [rows, cityMean]);

  const refLabel = lines === 'city' ? t('opp.ref.cityMean', { city: cityName }) : t('opp.ref.national');

  const tooltip = (ind: string) => {
    const r = rowBy.get(ind);
    const a = attrBy.get(ind);
    if (!r) return null;
    const q = quadrantOf(r.z_colocation, r.z_flow as number, cx, cy);
    return (
      <>
        <div className="treemap-tooltip-name">{label(ind)}</div>
        <div className="treemap-tooltip-section">{a ? t(`opp.sector.${a.sector}`) : ''}</div>
        <dl className="treemap-tooltip-grid">
          <dt>{t('opp.tip.quadrant')}</dt>
          <dd>{t(`opp.q.${q}`)}</dd>
          <dt>{t('opp.tip.flow')}</dt>
          <dd>{sg(r.z_flow as number)} SD</dd>
          <dt>{t('opp.tip.colo')}</dt>
          <dd>{sg(r.z_colocation)} SD</dd>
          <dt>RCA</dt>
          <dd>{r.rca.toFixed(2)}</dd>
          <dt>{t('opp.tip.workersHere')}</dt>
          <dd>{fmtInt.format(r.workers)}</dd>
        </dl>
        <div className="opp-tip-hint">{t('opp.tip.click')}</div>
      </>
    );
  };

  return (
    <div>
      <div className="chart-toolbar">
        <span className="chart-toolbar-control">
          {t('opp.ctl.show')}
          <span className="seg-toggle" role="group" aria-label={t('opp.ctl.show')}>
            {(['all', 'barely', 'somewhat', 'present'] as Show[]).map((v) => (
              <button
                key={v}
                type="button"
                className={v === show ? 'active' : undefined}
                aria-pressed={v === show}
                onClick={() => setShow(v)}
              >
                {t(`opp.show.${v}`)}
              </button>
            ))}
          </span>
        </span>
        <span className="chart-toolbar-control">
          {t('opp.ctl.lines')}
          <span className="seg-toggle" role="group" aria-label={t('opp.ctl.lines')}>
            {(['abs', 'city'] as Lines[]).map((v) => (
              <button
                key={v}
                type="button"
                className={v === lines ? 'active' : undefined}
                aria-pressed={v === lines}
                onClick={() => setLines(v)}
              >
                {t(`opp.lines.${v}`)}
              </button>
            ))}
          </span>
        </span>
      </div>
      <div className="chart-toolbar">
        <label className="chart-toolbar-control">
          {t('opp.ctl.sector')}
          <select className="chart-toolbar-select" value={sector} onChange={(e) => setSector(e.target.value)}>
            <option value="all">{t('opp.sector.all')}</option>
            {SECTORS.map((s) => (
              <option key={s} value={s}>
                {t(`opp.sector.${s}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="chart-toolbar-control">
          {t('charts.colorBy')}
          <select className="chart-toolbar-select" value={colour} onChange={(e) => setColour(e.target.value as Colour)}>
            <option value="spec">{t('opp.colour.spec')}</option>
            <option value="complexity">{t('opp.colour.complexity')}</option>
            <option value="wage">{t('opp.colour.wage')}</option>
          </select>
        </label>
        <label className="chart-toolbar-control">
          {t('opp.ctl.size')}
          <select className="chart-toolbar-select" value={size} onChange={(e) => setSize(e.target.value as Size)}>
            <option value="uniform">{t('opp.size.uniform')}</option>
            <option value="national">{t('opp.size.national')}</option>
            <option value="local">{t('opp.size.local', { city: cityName })}</option>
          </select>
        </label>
        <span style={{ flex: 1 }} />
        <span className="chart-toolbar-hint">{zoom ? t('charts.zoomedIn') : t('charts.dragToZoom')}</span>
        {zoom && (
          <button type="button" className="btn-link" onClick={() => setZoom(null)}>
            {t('charts.resetZoom')}
          </button>
        )}
      </div>

      <div className="morph-frame">
        <MorphScatter
          marks={marks}
          refs={[
            { key: 'colo', axis: 'x', value: cx, label: refLabel },
            { key: 'flow', axis: 'y', value: cy },
          ]}
          corners={[
            { corner: 'tl', text: t('opp.q.labour') },
            { corner: 'tr', text: t('opp.q.both') },
            { corner: 'bl', text: t('opp.q.neither') },
            { corner: 'br', text: t('opp.q.colocation') },
          ]}
          domain={domain}
          xLabel={t('opp.axis.x')}
          yLabel={t('opp.axis.y')}
          xFmt={(v) => sg(v, v % 1 === 0 ? 0 : 1)}
          yFmt={(v) => sg(v, v % 1 === 0 ? 0 : 1)}
          furnitureKey="opp"
          renderTooltip={tooltip}
          onSelect={setSelected}
          zoom={zoom}
          onZoom={setZoom}
        />
      </div>

      {colour === 'spec' && (
        <div className="opp-legend">
          <span><span className="opp-swatch" style={{ background: INK }} />{t('opp.legend.present')}</span>
          <span><span className="opp-swatch" style={{ background: MID }} />{t('opp.legend.somewhat')}</span>
          <span><span className="opp-swatch opp-swatch--ring" />{t('opp.legend.barely')}</span>
        </div>
      )}
      {colour === 'complexity' && <ComplexityLegend scale={pciScale} />}
      {colour === 'wage' && (
        <WageLegend bound={WAGE_DEV_BOUND} reference={t('legend.wage.cityMedian')} note={t('opp.legend.wageNote')} />
      )}
      <p className="opp-counts">
        {t('opp.counts', {
          n: counts.n,
          both: counts.c.both,
          labour: counts.c.labour,
          colocation: counts.c.colocation,
          neither: counts.c.neither,
        })}
        {lines === 'city' &&
          ' ' +
            t('opp.counts.lines', { city: cityName, x: sg(cityMean.zc), y: sg(cityMean.zf) })}
      </p>

      {selected && rowBy.get(selected) && (
        <OpportunityDetail
          ind={selected}
          row={rowBy.get(selected)!}
          quadrant={quadrantOf(rowBy.get(selected)!.z_colocation, rowBy.get(selected)!.z_flow as number, cx, cy)}
          relative={lines === 'city'}
          d24={d24}
          rowBy={rowBy}
          neighbours={neighbours}
          attr={attrBy.get(selected)}
          label={label}
          cityId={cityId}
          cityName={cityName}
          cityNames={cityNames}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

// ── Detail ───────────────────────────────────────────────────────────────
// Why the industry sits where it does. Labour flow is decomposed exactly: the
// industry's nearest flow neighbours, the job changes behind each link, and
// which ones the city is specialised in — their shares sum to the density.
// Co-location cannot be decomposed that way (it averages over the whole
// profile), so the right-hand side shows instead the cities the industry is
// actually found in, which is what the city is being compared against.

function OpportunityDetail({
  ind,
  row,
  quadrant,
  relative,
  d24,
  rowBy,
  neighbours,
  attr,
  label,
  cityId,
  cityName,
  cityNames,
  onClose,
}: {
  ind: string;
  row: CityIndustryDensityRow;
  quadrant: Quadrant;
  relative: boolean;
  d24: CityIndustryDensityRow[];
  rowBy: Map<string, CityIndustryDensityRow>;
  neighbours: FlowNeighbourRow[];
  attr: IndustryAttributeRow | undefined;
  label: (ind: string) => string;
  cityId: number;
  cityName: string;
  cityNames: Map<number, string>;
  onClose: () => void;
}) {
  const t = useT();
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);

  const nb = neighbours.filter((n) => n.ind === ind).sort((a, b) => b.w - a.w);
  const tot = nb.reduce((s, n) => s + n.w, 0) || 1;
  const nOn = nb.filter((n) => (rowBy.get(n.neighbour)?.rca ?? 0) >= 1).length;

  const byCity = useMemo(() => {
    const m = new Map<number, { workers: number; diversity: number }>();
    for (const r of d24) {
      const c = m.get(r.city_id) ?? { workers: 0, diversity: 0 };
      c.workers += r.workers;
      c.diversity += r.present;
      m.set(r.city_id, c);
    }
    return m;
  }, [d24]);
  const cells = d24.filter((r) => r.ind === ind);
  const natW = cells.reduce((s, r) => s + r.workers, 0) || 1;
  const hosts = cells.filter((r) => r.rca >= 1).sort((a, b) => b.workers - a.workers);
  const shown = hosts.slice(0, 12);
  const hostRows = shown.some((r) => r.city_id === cityId) ? shown : [...shown, row];

  return (
    <div className="opp-modal" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="opp-modal-box" role="dialog" aria-modal="true" aria-labelledby="opp-modal-title">
        <button type="button" className="opp-modal-x" aria-label={t('opp.modal.close')} onClick={onClose}>
          ×
        </button>
        <h4 id="opp-modal-title">{label(ind)}</h4>
        <p className="opp-modal-meta">
          {cityName} · {t(`opp.q.${quadrant}`)}
          {relative ? ` (${t('opp.modal.vsCityMean')})` : ''} · RCA {row.rca.toFixed(2)} ·{' '}
          {t('opp.modal.workersHere', { n: fmtInt.format(row.workers) })}
          {attr?.wage != null && ` · ${t('opp.modal.wage', { w: fmtInt.format(Math.round(attr.wage)) })}`}
          {attr && ` · PCI ${sg(attr.pci)}`}
        </p>
        <div className="opp-modal-grid">
          <section>
            <h5>{t('opp.modal.flowTitle', { d: (row.density_flow ?? 0).toFixed(3), z: sg(row.z_flow ?? 0) })}</h5>
            <p className="opp-modal-note">
              {t('opp.modal.flowLead', { city: cityName, k: nOn, n: nb.length })}
              {nb.length < 10 && ' ' + t('opp.modal.flowShort', { n: nb.length })}
            </p>
            <table className="opp-table">
              <thead>
                <tr>
                  <th />
                  <th>{t('opp.modal.neighbour')}</th>
                  <th className="n">{t('opp.modal.moves')}</th>
                  <th className="n">{t('opp.modal.rcaHere')}</th>
                  <th className="n">{t('opp.modal.share')}</th>
                </tr>
              </thead>
              <tbody>
                {nb.map((n) => {
                  const rca = rowBy.get(n.neighbour)?.rca ?? 0;
                  const on = rca >= 1;
                  return (
                    <tr key={n.neighbour} className={on ? undefined : 'off'}>
                      <td>{on ? '●' : '○'}</td>
                      <td>{label(n.neighbour)}</td>
                      <td className="n">{fmtInt.format(n.n_moves)}</td>
                      <td className="n">{rca.toFixed(2)}</td>
                      <td className="n">{on ? `${Math.round((100 * n.w) / tot)}%` : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="opp-modal-note">{t('opp.modal.flowNote')}</p>
          </section>
          <section>
            <h5>{t('opp.modal.coloTitle', { d: row.density_colocation.toFixed(3), z: sg(row.z_colocation) })}</h5>
            <p className="opp-modal-note">
              {t('opp.modal.coloLead', { k: hosts.length, n: byCity.size, city: cityName })}
            </p>
            <table className="opp-table">
              <thead>
                <tr>
                  <th>{t('opp.modal.city')}</th>
                  <th className="n">{t('opp.modal.workers')}</th>
                  <th className="n">{t('opp.modal.natShare')}</th>
                  <th className="n">RCA</th>
                  <th className="n">{t('opp.modal.cityWorkers')}</th>
                  <th className="n">{t('opp.modal.diversity')}</th>
                </tr>
              </thead>
              <tbody>
                {hostRows.map((r) => {
                  const raw = cityNames.get(r.city_id) ?? String(r.city_id);
                  const c = byCity.get(r.city_id);
                  return (
                    <tr key={r.city_id} className={r.city_id === cityId ? 'self' : undefined}>
                      <td>
                        {r.city_id === cityId ? (
                          cleanCityName(raw)
                        ) : (
                          <Link className="city-link" to={`/city/${citySlug(raw)}`} onClick={onClose}>
                            {cleanCityName(raw)}
                          </Link>
                        )}
                      </td>
                      <td className="n">{fmtInt.format(r.workers)}</td>
                      <td className="n">{Math.round((100 * r.workers) / natW)}%</td>
                      <td className="n">{r.rca.toFixed(2)}</td>
                      <td className="n">{fmtInt.format(c?.workers ?? 0)}</td>
                      <td className="n">{c?.diversity ?? 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="opp-modal-note">{t('opp.modal.coloNote')}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
