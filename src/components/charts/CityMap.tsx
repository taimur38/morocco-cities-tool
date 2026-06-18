import { useEffect, useMemo, useRef, useState } from 'react';
import { geoIdentity, geoPath, type GeoPermissibleObjects } from 'd3-geo';
import {
  useCityGeo,
  useNationalBase,
  type BaseFeature,
  type CityFeature,
  type CommuneProps,
} from '../../data/useCityGeo';

type Variant = 'migration' | 'definition' | 'explorer';

type Props = {
  slug: string;
  cityName: string;
  variant?: Variant;
};

const POS = '#2f7d3a';
const NEG = '#c64646';
const NEUTRAL = '#f0f0ec';
const BOUNDARY = '#1a1a1a';
const LAND = '#ececea';
const LAND_STROKE = '#d6d6d0';
const OCEAN = '#d6e6f0';
// Definition-variant fill: a muted rose, derived from the GL accent but
// desaturated. Distinct from the cool grey of neighboring land without
// becoming the loudest thing on the page.
const DEFINITION_FILL = '#d6a8a8';
// Sequential ramp for the explorer indicators — a single muted blue hue,
// light (low) → deep (high). Distinct from the grey neighbouring land and
// from the green/red diverging migration scale, and never the red accent.
const SEQ_LO = '#e9eef2';
const SEQ_HI = '#16527e';

const WIDTH = 720;
const HEIGHT = 480;
const PAD = 0.4; // expand city bbox by 40% so neighbors are visible

// --- Indicator dropdown (explorer variant) ------------------------------------
// One entry per option in the "Color by" dropdown. Migration keeps its
// diverging scale; every census level uses the sequential blue ramp. There is
// deliberately no wage option — CNSS wages are matched at the ville level, not
// the commune, so there is no honest commune-level wage to map.
type IndicatorKey =
  | 'migration'
  | 'unemployment'
  | 'female_unemployment'
  | 'lfp'
  | 'female_lfp'
  | 'tertiary'
  | 'dependency'
  | 'population'
  | 'slum';

type IndicatorDef = {
  key: IndicatorKey;
  label: string;
  kind: 'diverging' | 'sequential';
  accessor: (p: CommuneProps) => number | null;
  fmt: (v: number) => string;
  log?: boolean; // log-scale the sequential ramp (population is heavily skewed)
  hint: string; // legend note explaining the colour direction
};

const fmtPct1 = (v: number) => `${v.toFixed(1)}%`;
const fmtSignedPct1 = (v: number) =>
  `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(1)}%`;
const fmtPop = (v: number) => Math.round(v).toLocaleString('en-US');
// Dependency ratio is a count per 100, not a percentage.
const fmtRatio1 = (v: number) => `${v.toFixed(1)} per 100`;

const INDICATORS: IndicatorDef[] = [
  {
    key: 'migration',
    label: 'Net migration (10-yr)',
    kind: 'diverging',
    accessor: (p) => p.mig_10yr_net_pct,
    fmt: fmtSignedPct1,
    hint: 'Green = net inflow · Red = net outflow',
  },
  {
    key: 'unemployment',
    label: 'Unemployment rate',
    kind: 'sequential',
    accessor: (p) => p.unemployment_rate,
    fmt: fmtPct1,
    hint: 'Darker = higher unemployment',
  },
  {
    key: 'female_unemployment',
    label: 'Female unemployment rate',
    kind: 'sequential',
    accessor: (p) => p.female_unemployment_rate,
    fmt: fmtPct1,
    hint: 'Darker = higher female unemployment',
  },
  {
    key: 'lfp',
    label: 'Labor-force participation',
    kind: 'sequential',
    accessor: (p) => p.lfp_rate,
    fmt: fmtPct1,
    hint: 'Darker = higher participation',
  },
  {
    key: 'female_lfp',
    label: 'Female labor-force participation',
    kind: 'sequential',
    accessor: (p) => p.female_lfp_rate,
    fmt: fmtPct1,
    hint: 'Women in the labor force · darker = higher',
  },
  {
    key: 'tertiary',
    label: 'Tertiary education',
    kind: 'sequential',
    accessor: (p) => p.tertiary_pct,
    fmt: fmtPct1,
    hint: 'Adults with tertiary education · darker = higher',
  },
  {
    key: 'dependency',
    label: 'Dependency ratio',
    kind: 'sequential',
    accessor: (p) => p.dependency_ratio,
    fmt: fmtRatio1,
    hint: 'Dependents per 100 working-age · darker = higher',
  },
  {
    key: 'population',
    label: 'Population',
    kind: 'sequential',
    accessor: (p) => p.population,
    fmt: fmtPop,
    log: true,
    hint: 'Legal population · log-scaled · darker = larger',
  },
  {
    key: 'slum',
    label: 'Slum housing share',
    kind: 'sequential',
    accessor: (p) => p.slum_pct,
    fmt: fmtPct1,
    hint: 'Households in slum housing · darker = higher',
  },
];

// Diverging color scale: red for outflows, green for inflows. Anchored at zero,
// but each side has its own saturation point — some cities have communes that
// are -15% on the outflow side but +60% on the inflow side, and forcing a
// symmetric scale washes the inflow side into a single hue.
function colorForMig(
  v: number | null | undefined,
  negBound: number,
  posBound: number,
): string {
  if (v == null || !Number.isFinite(v)) return NEUTRAL;
  if (v >= 0) {
    const t = posBound > 0 ? Math.min(1, v / posBound) : 0;
    return blendHex(NEUTRAL, POS, t);
  }
  const t = negBound > 0 ? Math.min(1, -v / negBound) : 0;
  return blendHex(NEUTRAL, NEG, t);
}

// Sequential blue ramp over [min, max] for this city's communes. Optionally
// log-scaled so a single very large commune (e.g. central Casablanca) doesn't
// flatten everything else to the light end.
function sequentialColor(
  v: number | null | undefined,
  min: number,
  max: number,
  log: boolean,
): string {
  if (v == null || !Number.isFinite(v)) return NEUTRAL;
  let val = v;
  let lo = min;
  let hi = max;
  if (log) {
    val = Math.log(Math.max(v, 1));
    lo = Math.log(Math.max(min, 1));
    hi = Math.log(Math.max(max, 1));
  }
  const t = hi > lo ? Math.max(0, Math.min(1, (val - lo) / (hi - lo))) : 0.5;
  return blendHex(SEQ_LO, SEQ_HI, t);
}

function blendHex(a: string, b: string, t: number): string {
  const ar = parseInt(a.slice(1, 3), 16);
  const ag = parseInt(a.slice(3, 5), 16);
  const ab = parseInt(a.slice(5, 7), 16);
  const br = parseInt(b.slice(1, 3), 16);
  const bg = parseInt(b.slice(3, 5), 16);
  const bb = parseInt(b.slice(5, 7), 16);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bl.toString(16).padStart(2, '0')}`;
}

// Walk a (Multi)Polygon coords structure and extend a [minX, minY, maxX, maxY] tuple.
function extendBbox(bbox: number[], coords: unknown): void {
  if (Array.isArray(coords) && typeof coords[0] === 'number') {
    const [x, y] = coords as [number, number];
    if (x < bbox[0]) bbox[0] = x;
    if (y < bbox[1]) bbox[1] = y;
    if (x > bbox[2]) bbox[2] = x;
    if (y > bbox[3]) bbox[3] = y;
    return;
  }
  if (Array.isArray(coords)) {
    for (const c of coords) extendBbox(bbox, c);
  }
}

function bboxOfFeatures(features: { geometry?: { coordinates?: unknown } | null }[]): [number, number, number, number] {
  const bbox = [Infinity, Infinity, -Infinity, -Infinity];
  for (const f of features) {
    if (f.geometry && 'coordinates' in f.geometry) extendBbox(bbox, f.geometry.coordinates);
  }
  return bbox as [number, number, number, number];
}

// Returns a GeoJSON LineString that traces the padded bbox so geoIdentity.fitSize
// has something to fit against.
function bboxFitObject(b: [number, number, number, number]): GeoPermissibleObjects {
  return {
    type: 'LineString',
    coordinates: [
      [b[0], b[1]],
      [b[2], b[1]],
      [b[2], b[3]],
      [b[0], b[3]],
      [b[0], b[1]],
    ],
  };
}

export default function CityMap({ slug, cityName, variant = 'migration' }: Props) {
  const cityGeo = useCityGeo(slug);
  const baseGeo = useNationalBase();
  const [hover, setHover] = useState<{ x: number; y: number; f: CityFeature } | null>(null);

  // Explorer-only: which indicator drives the commune fill. Defaults to
  // population so the explorer opens on a different view than the dedicated
  // net-migration map earlier on the page.
  const [indicatorKey, setIndicatorKey] = useState<IndicatorKey>('population');

  // Drag-to-zoom: zoomBbox overrides the default city bbox when set;
  // dragRect is the in-progress selection in svg pixel coords.
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [zoomBbox, setZoomBbox] = useState<[number, number, number, number] | null>(null);
  const [dragRect, setDragRect] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);

  // Reset zoom when the city changes
  useEffect(() => {
    setZoomBbox(null);
    setDragRect(null);
  }, [slug]);

  const projection = useMemo(() => {
    if (!cityGeo.data) return null;
    let bbox: [number, number, number, number];
    if (zoomBbox) {
      bbox = zoomBbox;
    } else {
      const communes = cityGeo.data.features.filter((f) => f.properties.kind === 'commune');
      const fuaFeats = cityGeo.data.features.filter((f) => f.properties.kind === 'fua');
      // Prefer FUA bbox when available (gives a steadier extent than tightly-packed
      // commune polygons); fall back to the union of communes for manual cities.
      const sourceFeats = fuaFeats.length > 0 ? fuaFeats : communes;
      const [x0, y0, x1, y1] = bboxOfFeatures(sourceFeats);
      const w = x1 - x0;
      const h = y1 - y0;
      bbox = [x0 - w * PAD, y0 - h * PAD, x1 + w * PAD, y1 + h * PAD];
    }
    return geoIdentity().reflectY(true).fitSize([WIDTH, HEIGHT], bboxFitObject(bbox));
  }, [cityGeo.data, zoomBbox]);

  // Convert a client (mouse) coordinate to svg viewBox coordinates
  function clientToSvg(e: { clientX: number; clientY: number }): { x: number; y: number } | null {
    const svg = svgRef.current;
    if (!svg) return null;
    const r = svg.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * WIDTH,
      y: ((e.clientY - r.top) / r.height) * HEIGHT,
    };
  }

  // Document-level mouse listeners while dragging — so the user can drag
  // past the SVG edge without losing the rectangle.
  const dragging = dragRect !== null;
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      const p = clientToSvg(e);
      if (!p) return;
      setDragRect((d) => (d ? { ...d, x1: p.x, y1: p.y } : null));
    };
    const onUp = (e: MouseEvent) => {
      setDragRect((d) => {
        if (!d || !projection) return null;
        const p = clientToSvg(e) ?? { x: d.x1, y: d.y1 };
        const dx = Math.abs(p.x - d.x0);
        const dy = Math.abs(p.y - d.y0);
        // Ignore tiny rectangles (treat as a click, not a zoom)
        if (dx < 8 || dy < 8) return null;
        const invert = (projection as unknown as { invert: (xy: [number, number]) => [number, number] | null }).invert;
        const a = invert([Math.min(d.x0, p.x), Math.min(d.y0, p.y)]);
        const b = invert([Math.max(d.x0, p.x), Math.max(d.y0, p.y)]);
        if (a && b) {
          setZoomBbox([
            Math.min(a[0], b[0]),
            Math.min(a[1], b[1]),
            Math.max(a[0], b[0]),
            Math.max(a[1], b[1]),
          ]);
        }
        return null;
      });
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [dragging, projection]);

  const handleSvgMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return; // left-click only
    const p = clientToSvg(e);
    if (!p) return;
    setHover(null);
    setDragRect({ x0: p.x, y0: p.y, x1: p.x, y1: p.y });
    e.preventDefault();
  };

  const pathFn = useMemo(() => (projection ? geoPath(projection) : null), [projection]);

  // Filter the national base to just communes whose bbox intersects the visible
  // viewport. Saves drawing 1500 polygons when we only need ~30.
  const visibleBase = useMemo(() => {
    if (!baseGeo.data || !pathFn) return [] as BaseFeature[];
    const out: BaseFeature[] = [];
    for (const f of baseGeo.data.features) {
      const b = pathFn.bounds(f as GeoPermissibleObjects);
      // bounds returns [[x0,y0],[x1,y1]] in pixel space; cull off-screen.
      if (b[1][0] < 0 || b[1][1] < 0 || b[0][0] > WIDTH || b[0][1] > HEIGHT) continue;
      out.push(f);
    }
    return out;
  }, [baseGeo.data, pathFn]);

  if (cityGeo.loading || baseGeo.loading) return <p className="loading">Loading map…</p>;
  if (cityGeo.error) return <p className="error">Could not load map: {cityGeo.error.message}</p>;
  if (baseGeo.error) return <p className="error">Could not load base map: {baseGeo.error.message}</p>;
  if (!cityGeo.data || !pathFn) return null;

  const cityCommuneIds = new Set(
    cityGeo.data.features
      .filter((f) => f.properties.kind === 'commune')
      .map((f) => f.properties.commune_id)
      .filter((x): x is string => x != null),
  );
  const cityCommunes = cityGeo.data.features.filter(
    (f) => f.properties.kind === 'commune',
  ) as CityFeature[];
  const fua = cityGeo.data.features.find((f) => f.properties.kind === 'fua') ?? null;

  // The active indicator: explorer reads the dropdown; migration is fixed to
  // the diverging migration scale; definition has no indicator (rose fill).
  const activeKey: IndicatorKey | null =
    variant === 'explorer' ? indicatorKey : variant === 'migration' ? 'migration' : null;
  const activeDef = activeKey ? INDICATORS.find((d) => d.key === activeKey) ?? null : null;

  // Derive the colour domain for the active indicator from this city's communes.
  // Diverging: two bounds joined at zero (the negative side is capped at −100%,
  // the positive side anchored to the local maximum). Sequential: plain min/max.
  let negBound = 0;
  let posBound = 0;
  let seqMin = Infinity;
  let seqMax = -Infinity;
  if (activeDef) {
    for (const f of cityCommunes) {
      const v = activeDef.accessor(f.properties);
      if (v == null || !Number.isFinite(v)) continue;
      if (activeDef.kind === 'diverging') {
        if (v < 0) negBound = Math.max(negBound, -v);
        else posBound = Math.max(posBound, v);
      } else {
        if (v < seqMin) seqMin = v;
        if (v > seqMax) seqMax = v;
      }
    }
    negBound = Math.min(100, negBound);
  }
  const hasSeqDomain = Number.isFinite(seqMin) && Number.isFinite(seqMax);

  function fillFor(p: CommuneProps): string {
    if (!activeDef) return DEFINITION_FILL;
    const v = activeDef.accessor(p);
    if (activeDef.kind === 'diverging') return colorForMig(v, negBound, posBound);
    return sequentialColor(v, seqMin, seqMax, !!activeDef.log);
  }

  // Decide which city-commune labels to draw. Skip ones whose projected area is
  // tiny (< 28×14 px) so labels don't pile up on small communes.
  const labels: { x: number; y: number; text: string }[] = [];
  for (const f of cityCommunes) {
    const [cx, cy] = pathFn.centroid(f);
    const [[bx0, by0], [bx1, by1]] = pathFn.bounds(f);
    const w = bx1 - bx0;
    const h = by1 - by0;
    if (!Number.isFinite(cx) || !Number.isFinite(cy)) continue;
    if (w < 28 || h < 14) continue;
    const name = f.properties.commune_name ?? '';
    if (!name) continue;
    labels.push({ x: cx, y: cy, text: name });
  }

  const ariaLabel =
    variant === 'definition'
      ? `Map showing the communes that make up ${cityName}'s functional urban area`
      : `Map of communes in ${cityName} colored by ${activeDef?.label ?? 'indicator'}`;

  return (
    <div className="city-map-wrap">
      {variant === 'explorer' && (
        <div className="chart-toolbar">
          <label className="chart-toolbar-control">
            Color by
            <select
              className="chart-toolbar-select"
              value={indicatorKey}
              onChange={(e) => setIndicatorKey(e.target.value as IndicatorKey)}
            >
              {INDICATORS.map((d) => (
                <option key={d.key} value={d.key}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
          <span className="chart-toolbar-hint">
            {cityCommunes.length} commune{cityCommunes.length === 1 ? '' : 's'} · census 2024
          </span>
        </div>
      )}

      <div className="city-map">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          preserveAspectRatio="xMidYMid meet"
          style={{
            background: OCEAN,
            display: 'block',
            width: '100%',
            height: 'auto',
            aspectRatio: `${WIDTH} / ${HEIGHT}`,
            cursor: 'crosshair',
          }}
          role="img"
          aria-label={ariaLabel}
          onMouseDown={handleSvgMouseDown}
        >
          {/* Layer 1 — national base, drawn in light grey (land) */}
          <g>
            {visibleBase.map((f) => (
              <path
                key={f.properties.commune_id}
                d={pathFn(f) ?? ''}
                fill={cityCommuneIds.has(f.properties.commune_id) ? 'transparent' : LAND}
                stroke={LAND_STROKE}
                strokeWidth={0.4}
              />
            ))}
          </g>

          {/* Layer 2 — city communes, colored by the active indicator */}
          <g>
            {cityCommunes.map((f) => (
              <path
                key={f.properties.commune_id ?? Math.random()}
                d={pathFn(f) ?? ''}
                fill={fillFor(f.properties)}
                stroke="#fff"
                strokeWidth={0.6}
                onMouseMove={(e) => {
                  if (dragging) return; // suppress hover while drawing zoom rectangle
                  const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                  setHover({
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top,
                    f,
                  });
                }}
                onMouseLeave={() => setHover(null)}
              />
            ))}
          </g>

          {/* Layer 3 — FUA boundary on top */}
          {fua && (
            <path
              d={pathFn(fua) ?? ''}
              fill="none"
              stroke={BOUNDARY}
              strokeWidth={1.5}
              strokeDasharray="4 3"
              pointerEvents="none"
            />
          )}

          {/* Layer 4 — commune labels */}
          <g pointerEvents="none">
            {labels.map((l, i) => (
              <text
                key={i}
                x={l.x}
                y={l.y}
                textAnchor="middle"
                dominantBaseline="middle"
                style={{
                  fontSize: 9.5,
                  fontFamily: 'Source Sans 3, sans-serif',
                  fill: '#1a1a1a',
                  paintOrder: 'stroke',
                  stroke: '#fff',
                  strokeWidth: 2.5,
                  strokeLinejoin: 'round',
                }}
              >
                {l.text}
              </text>
            ))}
          </g>

          {/* Layer 5 — drag-to-zoom rectangle */}
          {dragRect && (
            <rect
              x={Math.min(dragRect.x0, dragRect.x1)}
              y={Math.min(dragRect.y0, dragRect.y1)}
              width={Math.abs(dragRect.x1 - dragRect.x0)}
              height={Math.abs(dragRect.y1 - dragRect.y0)}
              fill="rgba(26, 26, 26, 0.06)"
              stroke="#1a1a1a"
              strokeWidth={1}
              strokeDasharray="3 3"
              pointerEvents="none"
            />
          )}
        </svg>

        {hover && !dragging && (
          <div className="map-tooltip" style={{ left: hover.x + 12, top: hover.y + 12 }}>
            <strong>{hover.f.properties.commune_name ?? '—'}</strong>
            {activeDef && (
              <div>
                {activeDef.label}:{' '}
                {(() => {
                  const v = activeDef.accessor(hover.f.properties);
                  return v != null && Number.isFinite(v) ? activeDef.fmt(v) : '—';
                })()}
              </div>
            )}
          </div>
        )}

        {zoomBbox && (
          <button
            type="button"
            className="map-reset-zoom"
            onClick={() => setZoomBbox(null)}
          >
            Reset zoom
          </button>
        )}

        <MapLegend
          activeDef={activeDef}
          communeCount={cityCommunes.length}
          negBound={negBound}
          posBound={posBound}
          seqMin={seqMin}
          seqMax={seqMax}
          hasSeqDomain={hasSeqDomain}
          zoomed={zoomBbox != null}
        />
      </div>
    </div>
  );
}

function MapLegend({
  activeDef,
  communeCount,
  negBound,
  posBound,
  seqMin,
  seqMax,
  hasSeqDomain,
  zoomed,
}: {
  activeDef: IndicatorDef | null;
  communeCount: number;
  negBound: number;
  posBound: number;
  seqMin: number;
  seqMax: number;
  hasSeqDomain: boolean;
  zoomed: boolean;
}) {
  const zoomNote = zoomed ? 'Drag to zoom further · Reset to return' : 'Drag to zoom in on an area';
  const baseNote = 'Grey = neighboring communes · Blue = ocean · Dashed line: FUA boundary';

  // Definition variant — no indicator, just the explainer.
  if (!activeDef) {
    return (
      <div className="map-legend">
        <div className="map-legend-note">
          {communeCount} commune{communeCount === 1 ? '' : 's'} make up this city · {baseNote}
        </div>
        <div className="map-legend-note">{zoomNote}</div>
      </div>
    );
  }

  // Sequential indicator — single blue ramp light→deep over the city's range.
  if (activeDef.kind === 'sequential') {
    return (
      <div className="map-legend">
        <div
          className="map-legend-bar"
          style={{ background: `linear-gradient(to right, ${SEQ_LO} 0%, ${SEQ_HI} 100%)` }}
        />
        <div className="map-legend-labels">
          <span>{hasSeqDomain ? activeDef.fmt(seqMin) : '—'}</span>
          <span>{hasSeqDomain ? activeDef.fmt(seqMax) : 'no data'}</span>
        </div>
        <div className="map-legend-note">{activeDef.hint}</div>
        <div className="map-legend-note">{baseNote}</div>
        <div className="map-legend-note">{zoomNote}</div>
      </div>
    );
  }

  // Diverging indicator (migration) — two scales joined at the zero point. The
  // bar is a single CSS gradient so the transition reads as one seamless ramp;
  // the zero label is positioned at the proportional zero point.
  const total = negBound + posBound;
  const zeroPct = total > 0 ? (negBound / total) * 100 : 50;
  const fmt = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(0)}%`;
  return (
    <div className="map-legend">
      <div
        className="map-legend-bar"
        style={{
          background: `linear-gradient(to right, ${NEG} 0%, ${NEUTRAL} ${zeroPct.toFixed(2)}%, ${POS} 100%)`,
        }}
      />
      <div className="map-legend-labels" style={{ position: 'relative' }}>
        <span>{fmt(-negBound)} (outflow)</span>
        <span
          style={{
            position: 'absolute',
            left: `${zeroPct.toFixed(2)}%`,
            transform: 'translateX(-50%)',
          }}
        >
          0%
        </span>
        <span>{fmt(posBound)} (inflow)</span>
      </div>
      <div className="map-legend-note">{baseNote}</div>
      <div className="map-legend-note">{zoomNote}</div>
    </div>
  );
}
