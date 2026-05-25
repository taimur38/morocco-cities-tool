import { useEffect, useMemo, useState } from 'react';
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';
import type { CityIndustryShiftShareRow } from '../../data/types';
import { fmtInt, fmtNum } from '../../lib/format';
import { sectionColor } from '../../lib/sectionPalette';
import { divergingPctColor } from '../../lib/colorScales';
import { SectionLegend, WageLegend } from './treemapLegends';
import {
  SectionLabelsOverlay,
  useSectionBoxes,
  type RecordBox,
} from './sectionLabels';

type Mode = 'section' | 'wage_industry' | 'wage_city';

// Same diverging bound as SectionOverviewTreemap for visual consistency.
const WAGE_DEV_BOUND = 50;

type Leaf = {
  name: string;
  size: number;
  workers_2024: number;
  section: string;
  daily_wage_2024: number | null;
  industry_median_wage: number | null;
  wage_dev_industry_pct: number | null;
  wage_dev_city_pct: number | null;
};
type Group = { name: string; children: Leaf[] };

type Props = {
  rows: CityIndustryShiftShareRow[];
  cityId: number;
  cityMedianWage?: number | null;
  translations?: Map<string, string> | null;
};

// Treemap of industries that didn't exist in this city in 2014 but do in 2024.
// Sized by 2024 workers, grouped by NACE section, colored by that section so
// the eye picks up where new activity is concentrated at a glance. Hover for
// the per-industry detail.
export default function NewIndustriesTreemap({
  rows,
  cityId,
  cityMedianWage = null,
  translations,
}: Props) {
  const [mode, setMode] = useState<Mode>('section');
  const { boxes: sectionBoxes, recordBox } = useSectionBoxes([cityId]);

  // Industry national median daily wage (same convention as SectionOverviewTreemap):
  // unweighted median across cities where the industry appears.
  const wageMedianByCode = useMemo(() => {
    const wagesByCode = new Map<string, number[]>();
    for (const r of rows) {
      if (r.workers_2024 > 0 && r.daily_wage_2024 != null && Number.isFinite(r.daily_wage_2024)) {
        const arr = wagesByCode.get(r.CODE_ACTIVITE_NMA2010) ?? [];
        arr.push(r.daily_wage_2024);
        wagesByCode.set(r.CODE_ACTIVITE_NMA2010, arr);
      }
    }
    const out = new Map<string, number>();
    for (const [code, arr] of wagesByCode) {
      arr.sort((a, b) => a - b);
      const n = arr.length;
      const m = n % 2 === 0 ? (arr[n / 2 - 1] + arr[n / 2]) / 2 : arr[(n - 1) / 2];
      out.set(code, m);
    }
    return out;
  }, [rows]);

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
      const wage =
        c.daily_wage_2024 != null && Number.isFinite(c.daily_wage_2024)
          ? c.daily_wage_2024
          : null;
      const med = wageMedianByCode.get(c.CODE_ACTIVITE_NMA2010) ?? null;
      const wage_dev_industry_pct =
        wage != null && med != null && med > 0 ? ((wage - med) / med) * 100 : null;
      const wage_dev_city_pct =
        wage != null && cityMedianWage != null && cityMedianWage > 0
          ? ((wage - cityMedianWage) / cityMedianWage) * 100
          : null;
      const arr = bySection.get(c.section) ?? [];
      arr.push({
        name: label,
        size: c.workers_2024,
        workers_2024: c.workers_2024,
        section: c.section,
        daily_wage_2024: wage,
        industry_median_wage: med,
        wage_dev_industry_pct,
        wage_dev_city_pct,
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
  }, [rows, cityId, translations, wageMedianByCode, cityMedianWage]);

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
        <label className="chart-toolbar-control">
          Color by
          <select
            className="chart-toolbar-select"
            value={mode}
            onChange={(e) => setMode(e.target.value as Mode)}
          >
            <option value="section">Industry section</option>
            <option value="wage_industry">Daily wage vs. industry national median</option>
            <option value="wage_city">Daily wage vs. city median</option>
          </select>
        </label>
        <span className="chart-toolbar-hint">
          {count} new industries · {fmtInt.format(total)} workers in 2024
        </span>
      </div>
      <div style={{ position: 'relative' }}>
        <ResponsiveContainer width="100%" height={440}>
          <Treemap
            data={data}
            dataKey="size"
            stroke="#fff"
            aspectRatio={4 / 3}
            isAnimationActive={false}
            content={<Cell mode={mode} recordBox={recordBox} />}
          >
            <Tooltip content={<LeafTooltip />} wrapperStyle={{ zIndex: 10 }} />
          </Treemap>
        </ResponsiveContainer>
        <SectionLabelsOverlay boxes={sectionBoxes} />
      </div>
      {mode === 'section' && <SectionLegend sections={sectionsPresent} />}
      {mode === 'wage_industry' && <WageLegend bound={WAGE_DEV_BOUND} />}
      {mode === 'wage_city' && (
        <WageLegend
          bound={WAGE_DEV_BOUND}
          reference="city median"
          note="Each cell's daily wage compared to the city's median daily wage across all CNSS person-days."
        />
      )}
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
  daily_wage_2024?: number | null;
  industry_median_wage?: number | null;
  wage_dev_industry_pct?: number | null;
  wage_dev_city_pct?: number | null;
  recordBox?: RecordBox;
};

function Cell(props: CellProps & { mode: Mode }) {
  const { x = 0, y = 0, width = 0, height = 0, depth = 0, name = '', mode, recordBox } = props;

  useEffect(() => {
    if (depth === 1 && name && recordBox && width > 0 && height > 0) {
      recordBox(name, { x, y, w: width, h: height });
    }
  }, [depth, name, x, y, width, height, recordBox]);

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
      </g>
    );
  }

  if (depth === 2) {
    let fill: string;
    if (mode === 'section') {
      fill = sectionColor(props.section);
    } else {
      const dev =
        mode === 'wage_industry' ? props.wage_dev_industry_pct : props.wage_dev_city_pct;
      fill = dev == null ? '#f6f6f4' : divergingPctColor(dev, WAGE_DEV_BOUND);
    }
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
      </g>
    );
  }

  return null;
}

type TipPayload = {
  payload?: {
    name?: string;
    section?: string;
    workers_2024?: number;
    daily_wage_2024?: number | null;
    wage_dev_industry_pct?: number | null;
    wage_dev_city_pct?: number | null;
    children?: unknown[];
  };
};
type TipProps = { active?: boolean; payload?: TipPayload[] };

function fmtSignedPct(v: number | null | undefined): string {
  if (v == null) return '—';
  return `${v >= 0 ? '+' : ''}${fmtNum(v, 1)}%`;
}

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
        <dt>Daily wage 2024 (MAD)</dt>
        <dd>{p.daily_wage_2024 == null ? '—' : fmtInt.format(Math.round(p.daily_wage_2024))}</dd>
        <dt>vs. industry national median</dt>
        <dd>{fmtSignedPct(p.wage_dev_industry_pct)}</dd>
        <dt>vs. city median</dt>
        <dd>{fmtSignedPct(p.wage_dev_city_pct)}</dd>
      </dl>
    </div>
  );
}
