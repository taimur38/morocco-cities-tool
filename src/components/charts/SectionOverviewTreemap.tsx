import { useEffect, useMemo, useState } from 'react';
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';
import type {
  CityIndustryShiftShareRow,
  IndustryComplexityRow,
} from '../../data/types';
import { fmtInt, fmtNum } from '../../lib/format';
import { sectionColor } from '../../lib/sectionPalette';
import { complexityColor, divergingPctColor } from '../../lib/colorScales';
import { ComplexityLegend, SectionLegend, WageLegend } from './treemapLegends';
import {
  SectionLabelsOverlay,
  useSectionBoxes,
  type RecordBox,
} from './sectionLabels';

type Mode = 'section' | 'complexity' | 'wage_industry' | 'wage_city';

// Diverging color scale for "% above/below the reference median", clipped at
// ±this bound. Picked empirically to keep the dominant signal readable while
// still letting outliers reach the extremes.
const WAGE_DEV_BOUND = 50;

type Leaf = {
  name: string;
  size: number;
  section: string;
  pci: number | null;
  workers_2024: number;
  daily_wage_2024: number | null;
  industry_median_wage: number | null;
  wage_dev_industry_pct: number | null;
  wage_dev_city_pct: number | null;
};
type Group = { name: string; children: Leaf[] };

type Props = {
  rows: CityIndustryShiftShareRow[];
  complexity: IndustryComplexityRow[] | null;
  cityId: number;
  cityMedianWage?: number | null;
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
  cityMedianWage = null,
  translations,
}: Props) {
  const [mode, setMode] = useState<Mode>('section');
  const { boxes: sectionBoxes, recordBox } = useSectionBoxes([cityId]);

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

  // Industry-level median daily wage, computed across all cities (not just the
  // current city) so the comparison is "this city vs. the typical city for
  // this industry." Unweighted: each city counts once per industry.
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

  const { data, totalWorkers } = useMemo(() => {
    const cells = rows.filter((r) => r.city_id === cityId && r.workers_2024 > 0);
    if (cells.length === 0) return { data: [] as Group[], totalWorkers: 0 };

    let totalWorkers = 0;
    const bySection = new Map<string, Leaf[]>();
    for (const c of cells) {
      totalWorkers += c.workers_2024;
      const label = translations?.get(c.LIBELLE_ACTIVITE) ?? c.LIBELLE_ACTIVITE;
      const pci = pciByCode.get(c.CODE_ACTIVITE_NMA2010) ?? null;
      const med = wageMedianByCode.get(c.CODE_ACTIVITE_NMA2010) ?? null;
      const wage = c.daily_wage_2024 != null && Number.isFinite(c.daily_wage_2024)
        ? c.daily_wage_2024
        : null;
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
        section: c.section,
        pci,
        workers_2024: c.workers_2024,
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

    return { data, totalWorkers };
  }, [rows, cityId, translations, pciByCode, wageMedianByCode, cityMedianWage]);

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
            <option value="wage_industry">Daily wage vs. industry national median</option>
            <option value="wage_city">Daily wage vs. city median</option>
          </select>
        </label>
        <span className="chart-toolbar-hint">
          Sized by 2024 workers · {fmtInt.format(totalWorkers)} total
        </span>
      </div>
      <div style={{ position: 'relative' }}>
        <ResponsiveContainer width="100%" height={520}>
          <Treemap
            data={data}
            dataKey="size"
            stroke="#fff"
            aspectRatio={4 / 3}
            isAnimationActive={false}
            content={<Cell mode={mode} pciScale={pciScale} recordBox={recordBox} />}
          >
            <Tooltip content={<LeafTooltip />} wrapperStyle={{ zIndex: 10 }} />
          </Treemap>
        </ResponsiveContainer>
        <SectionLabelsOverlay boxes={sectionBoxes} />
      </div>
      {mode === 'section' && <SectionLegend sections={data.map((g) => g.name)} />}
      {mode === 'complexity' && <ComplexityLegend scale={pciScale} />}
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
  daily_wage_2024?: number | null;
  industry_median_wage?: number | null;
  wage_dev_industry_pct?: number | null;
  wage_dev_city_pct?: number | null;
  recordBox?: RecordBox;
};

function Cell(props: CellProps & { mode: Mode; pciScale: number }) {
  const {
    x = 0,
    y = 0,
    width = 0,
    height = 0,
    depth = 0,
    name = '',
    mode,
    pciScale,
    recordBox,
  } = props;

  useEffect(() => {
    if (depth === 1 && name && recordBox && width > 0 && height > 0) {
      recordBox(name, { x, y, w: width, h: height });
    }
  }, [depth, name, x, y, width, height, recordBox]);

  if (width <= 0 || height <= 0) return null;

  if (depth === 1) {
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill="none"
          stroke="#fff"
          strokeWidth={6}
        />
      </g>
    );
  }

  if (depth === 2) {
    let fill: string;
    if (mode === 'section') {
      fill = sectionColor(props.section);
    } else if (mode === 'complexity') {
      fill = complexityColor(props.pci ?? null, pciScale);
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
          strokeWidth={1}
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
    pci?: number | null;
    workers_2024?: number;
    daily_wage_2024?: number | null;
    industry_median_wage?: number | null;
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
        <dt>Industry complexity (PCI)</dt>
        <dd>{p.pci == null ? '—' : fmtNum(p.pci, 2)}</dd>
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
