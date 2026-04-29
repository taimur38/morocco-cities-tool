import { useMemo, useState } from 'react';
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';
import type {
  CityIndustryShiftShareRow,
  IndustryComplexityRow,
} from '../../data/types';
import { fmtInt, fmtNum } from '../../lib/format';
import { sectionColor } from '../../lib/sectionPalette';
import { complexityColor } from '../../lib/colorScales';
import { ComplexityLegend, SectionLegend } from './treemapLegends';

type Mode = 'section' | 'complexity';

type Leaf = {
  name: string;
  size: number;
  section: string;
  pci: number | null;
  workers_2024: number;
};
type Group = { name: string; children: Leaf[] };

const truncateForBox = (s: string, w: number): string => {
  const cap = Math.max(0, Math.floor((w - 8) / 6.2));
  return s.length <= cap ? s : `${s.slice(0, Math.max(1, cap - 1))}…`;
};

type Props = {
  rows: CityIndustryShiftShareRow[];
  complexity: IndustryComplexityRow[] | null;
  cityId: number;
  translations?: Map<string, string> | null;
};

// Treemap of the city's 2024 industrial composition: rectangles sized by
// workers_2024, grouped by NACE section. Color toggles between section
// (categorical, GL Metroverse industry palette) and industry complexity
// (sequential, Atlas complexity gradient). Hover for full per-industry detail.
export default function SectionOverviewTreemap({
  rows,
  complexity,
  cityId,
  translations,
}: Props) {
  const [mode, setMode] = useState<Mode>('section');

  const { pciByCode, pciScale } = useMemo(() => {
    if (!complexity) return { pciByCode: new Map<string, number>(), pciScale: 0 };
    const m = new Map<string, number>();
    let scale = 0;
    for (const r of complexity) {
      // Pin to the most recent year so the color reflects "where this
      // industry sits on the complexity ladder right now."
      if (r.year === 2024 && r.pci_workers != null) {
        m.set(r.CODE_ACTIVITE_NMA2010, r.pci_workers);
        scale = Math.max(scale, Math.abs(r.pci_workers));
      }
    }
    return { pciByCode: m, pciScale: scale };
  }, [complexity]);

  const { data, totalWorkers } = useMemo(() => {
    const cells = rows.filter((r) => r.city_id === cityId && r.workers_2024 > 0);
    if (cells.length === 0) return { data: [] as Group[], totalWorkers: 0 };

    let totalWorkers = 0;
    const bySection = new Map<string, Leaf[]>();
    for (const c of cells) {
      totalWorkers += c.workers_2024;
      const label = translations?.get(c.LIBELLE_ACTIVITE) ?? c.LIBELLE_ACTIVITE;
      const pci = pciByCode.get(c.CODE_ACTIVITE_NMA2010) ?? null;
      const arr = bySection.get(c.section) ?? [];
      arr.push({
        name: label,
        size: c.workers_2024,
        section: c.section,
        pci,
        workers_2024: c.workers_2024,
      });
      bySection.set(c.section, arr);
    }

    const data: Group[] = [...bySection.entries()]
      .map(([name, children]) => ({
        name,
        children: children.sort((a, b) => b.size - a.size),
      }))
      .sort((a, b) => sumSize(b.children) - sumSize(a.children));

    return { data, totalWorkers };
  }, [rows, cityId, translations, pciByCode]);

  if (data.length === 0) {
    return <p className="muted">No 2024 industry employment for this city.</p>;
  }

  return (
    <div>
      <div className="chart-toolbar">
        <label className="chart-toolbar-control">
          Color by
          <select
            className="chart-toolbar-select"
            value={mode}
            onChange={(e) => setMode(e.target.value as Mode)}
          >
            <option value="section">Industry section</option>
            <option value="complexity">Industry complexity</option>
          </select>
        </label>
        <span className="chart-toolbar-hint">
          Sized by 2024 workers · {fmtInt.format(totalWorkers)} total
        </span>
      </div>
      <ResponsiveContainer width="100%" height={520}>
        <Treemap
          data={data}
          dataKey="size"
          stroke="#fff"
          aspectRatio={4 / 3}
          isAnimationActive={false}
          content={<Cell mode={mode} pciScale={pciScale} />}
        >
          <Tooltip content={<LeafTooltip />} />
        </Treemap>
      </ResponsiveContainer>
      {mode === 'section' ? (
        <SectionLegend sections={data.map((g) => g.name)} />
      ) : (
        <ComplexityLegend scale={pciScale} />
      )}
    </div>
  );
}

function sumSize(arr: Leaf[]): number {
  return arr.reduce((s, x) => s + x.size, 0);
}

type CellProps = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  depth?: number;
  name?: string;
  section?: string;
  pci?: number | null;
  workers_2024?: number;
};

function Cell(props: CellProps & { mode: Mode; pciScale: number }) {
  const { x = 0, y = 0, width = 0, height = 0, depth = 0, name = '', mode, pciScale } = props;
  if (width <= 0 || height <= 0) return null;

  if (depth === 1) {
    const tone = mode === 'section' ? sectionColor(name) : '#1a1a1a';
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill="none"
          stroke={tone}
          strokeOpacity={0.85}
          strokeWidth={1.5}
        />
        {width > 80 && height > 28 && (
          <text
            x={x + 6}
            y={y + 14}
            fontFamily="'JetBrains Mono', ui-monospace, monospace"
            fontSize={10}
            fontWeight={500}
            letterSpacing={0.6}
            fill={tone}
            style={{
              paintOrder: 'stroke',
              stroke: '#fff',
              strokeWidth: 3,
              strokeLinejoin: 'round',
              textTransform: 'uppercase',
            }}
          >
            {name.toUpperCase()}
          </text>
        )}
      </g>
    );
  }

  if (depth === 2) {
    const fill =
      mode === 'section'
        ? sectionColor(props.section)
        : complexityColor(props.pci ?? null, pciScale);
    const fillOpacity = mode === 'section' ? 0.55 : 1;
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={fill}
          fillOpacity={fillOpacity}
          stroke="#fff"
          strokeWidth={0.6}
        />
        {width > 70 && height > 22 && (
          <text
            x={x + 5}
            y={y + 14}
            fontSize={11}
            fill="#1a1a1a"
            style={{
              paintOrder: 'stroke',
              stroke: '#fff',
              strokeWidth: 2.5,
              strokeLinejoin: 'round',
            }}
          >
            {truncateForBox(name, width)}
          </text>
        )}
      </g>
    );
  }

  return null;
}

type TipPayload = {
  payload?: {
    name?: string;
    section?: string;
    pci?: number | null;
    workers_2024?: number;
    children?: unknown[];
  };
};
type TipProps = { active?: boolean; payload?: TipPayload[] };

function LeafTooltip({ active, payload }: TipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0]?.payload;
  if (!p || p.children) return null;
  return (
    <div className="treemap-tooltip">
      <div className="treemap-tooltip-name">{p.name}</div>
      <div className="treemap-tooltip-section">{p.section}</div>
      <dl className="treemap-tooltip-grid">
        <dt>Workers 2024</dt>
        <dd>{fmtInt.format(p.workers_2024 ?? 0)}</dd>
        <dt>Industry complexity (PCI)</dt>
        <dd>{p.pci == null ? '—' : fmtNum(p.pci, 2)}</dd>
      </dl>
    </div>
  );
}
