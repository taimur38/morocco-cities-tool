import { useMemo } from 'react';
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';
import type { CityIndustryShiftShareRow } from '../../data/types';
import { fmtInt } from '../../lib/format';
import { sectionColor } from '../../lib/sectionPalette';
import { SectionLegend } from './treemapLegends';

type Leaf = {
  name: string;
  size: number;
  workers_2024: number;
  section: string;
};
type Group = { name: string; children: Leaf[] };

type Props = {
  rows: CityIndustryShiftShareRow[];
  cityId: number;
  translations?: Map<string, string> | null;
};

// Treemap of industries that didn't exist in this city in 2014 but do in 2024.
// Sized by 2024 workers, grouped by NACE section, colored by that section so
// the eye picks up where new activity is concentrated at a glance. Hover for
// the per-industry detail.
export default function NewIndustriesTreemap({ rows, cityId, translations }: Props) {
  const { data, total, count, sectionsPresent } = useMemo(() => {
    const cells = rows.filter(
      (r) =>
        r.city_id === cityId && r.workers_2014 === 0 && r.workers_2024 > 0,
    );
    if (cells.length === 0) {
      return { data: [] as Group[], total: 0, count: 0, sectionsPresent: [] as string[] };
    }

    const bySection = new Map<string, Leaf[]>();
    let total = 0;
    for (const c of cells) {
      total += c.workers_2024;
      const label = translations?.get(c.LIBELLE_ACTIVITE) ?? c.LIBELLE_ACTIVITE;
      const arr = bySection.get(c.section) ?? [];
      arr.push({
        name: label,
        size: c.workers_2024,
        workers_2024: c.workers_2024,
        section: c.section,
      });
      bySection.set(c.section, arr);
    }
    const data: Group[] = [...bySection.entries()]
      .map(([name, children]) => ({
        name,
        children: children.sort((a, b) => b.size - a.size),
      }))
      .sort((a, b) => sumSize(b.children) - sumSize(a.children));

    return { data, total, count: cells.length, sectionsPresent: data.map((g) => g.name) };
  }, [rows, cityId, translations]);

  if (data.length === 0) {
    return (
      <p className="muted">
        No industries appeared from scratch in this city between 2014 and 2024.
      </p>
    );
  }

  return (
    <div>
      <div className="chart-toolbar">
        <span className="chart-toolbar-hint">
          {count} new industries · {fmtInt.format(total)} workers in 2024
        </span>
      </div>
      <ResponsiveContainer width="100%" height={440}>
        <Treemap
          data={data}
          dataKey="size"
          stroke="#fff"
          aspectRatio={4 / 3}
          isAnimationActive={false}
          content={<Cell />}
        >
          <Tooltip content={<LeafTooltip />} />
        </Treemap>
      </ResponsiveContainer>
      <SectionLegend sections={sectionsPresent} />
    </div>
  );
}

function sumSize(arr: Leaf[]): number {
  return arr.reduce((s, x) => s + x.size, 0);
}

// Recharts injects the layout fields (x/y/width/height/depth/name) onto this
// element via cloneElement — they're optional from the call-site's view.
type CellProps = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  depth?: number;
  name?: string;
  workers_2024?: number;
  section?: string;
};

function Cell(props: CellProps) {
  const { x = 0, y = 0, width = 0, height = 0, depth = 0, name = '' } = props;
  if (width <= 0 || height <= 0) return null;

  if (depth === 1) {
    // Section frame — outline only; the colored leaves carry the hue. The
    // section label uses the section's own color so the relationship between
    // frame and tile is unambiguous.
    const tone = sectionColor(name);
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
    const fill = sectionColor(props.section);
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={fill}
          fillOpacity={0.55}
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
            {fitText(name, width)}
          </text>
        )}
      </g>
    );
  }

  return null;
}

function fitText(s: string, w: number): string {
  const cap = Math.max(0, Math.floor((w - 8) / 6.2));
  return s.length <= cap ? s : `${s.slice(0, Math.max(1, cap - 1))}…`;
}

type TipPayload = {
  payload?: {
    name?: string;
    section?: string;
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
        <dt>Workers 2014</dt>
        <dd>0 (new entrant)</dd>
      </dl>
    </div>
  );
}
