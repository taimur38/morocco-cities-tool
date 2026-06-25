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
import { useLang } from '../../i18n/context';
import { useT, sectionLabel, industryLabel } from '../../i18n/ui';

type Mode =
  | 'section'
  | 'complexity'
  | 'wage_industry'
  | 'wage_city'
  | 'wage_growth';

// Diverging color scale for "% above/below the reference median", clipped at
// ±this bound. Picked empirically to keep the dominant signal readable while
// still letting outliers reach the extremes.
const WAGE_DEV_BOUND = 50;
// Annualized wage-growth CAGR (%) — clipped at ±this bound. Picked so the
// dominant signal stays readable; CNSS industry wage growth typically sits
// well inside a ±15% range, with the long tail driven by small denominators.
const WAGE_CAGR_BOUND = 15;

type Leaf = {
  name: string;
  size: number;
  section: string;
  pci: number | null;
  workers_2024: number;
  daily_wage_2014: number | null;
  daily_wage_2024: number | null;
  industry_median_wage: number | null;
  wage_dev_industry_pct: number | null;
  wage_dev_city_pct: number | null;
  wage_cagr_pct: number | null;
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
  const t = useT();
  const { lang } = useLang();
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
      const label = industryLabel(c.LIBELLE_ACTIVITE, translations, lang);
      const pci = pciByCode.get(c.CODE_ACTIVITE_NMA2010) ?? null;
      const med = wageMedianByCode.get(c.CODE_ACTIVITE_NMA2010) ?? null;
      const wage = c.daily_wage_2024 != null && Number.isFinite(c.daily_wage_2024)
        ? c.daily_wage_2024
        : null;
      const wage14 =
        c.daily_wage_2014 != null && Number.isFinite(c.daily_wage_2014)
          ? c.daily_wage_2014
          : null;
      const wage_dev_industry_pct =
        wage != null && med != null && med > 0 ? ((wage - med) / med) * 100 : null;
      const wage_dev_city_pct =
        wage != null && cityMedianWage != null && cityMedianWage > 0
          ? ((wage - cityMedianWage) / cityMedianWage) * 100
          : null;
      // Per-industry wage growth = CAGR of the city-level mean daily wage
      // (sum_salary / sum_days) within this CNSS industry. Reported as %/yr;
      // null when the industry was absent in 2014 (treemap is restricted to
      // workers_2024 > 0, but workers_2014 may be 0 — those are entry cells).
      const wage_cagr_pct =
        wage != null && wage14 != null && wage14 > 0
          ? (Math.pow(wage / wage14, 1 / 10) - 1) * 100
          : null;
      const arr = bySection.get(c.section) ?? [];
      arr.push({
        name: label,
        size: c.workers_2024,
        section: c.section,
        pci,
        workers_2024: c.workers_2024,
        daily_wage_2014: wage14,
        daily_wage_2024: wage,
        industry_median_wage: med,
        wage_dev_industry_pct,
        wage_dev_city_pct,
        wage_cagr_pct,
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
  }, [rows, cityId, translations, lang, pciByCode, wageMedianByCode, cityMedianWage]);

  if (data.length === 0) {
    return <p className="muted">{t('tm.empty.composition')}</p>;
  }

  return (
    <div>
      <div className="chart-toolbar">
        <label className="chart-toolbar-control">
          {t('charts.colorBy')}
          <select
            className="chart-toolbar-select"
            value={mode}
            onChange={(e) => setMode(e.target.value as Mode)}
          >
            <option value="section">{t('tm.opt.section')}</option>
            <option value="complexity">{t('tm.opt.complexity')}</option>
            <option value="wage_industry">{t('tm.opt.wageIndustry')}</option>
            <option value="wage_city">{t('tm.opt.wageCity')}</option>
            <option value="wage_growth">{t('tm.opt.wageGrowth')}</option>
          </select>
        </label>
        <span className="chart-toolbar-hint">
          {t('charts.sizedBy2024', { n: fmtInt.format(totalWorkers) })}
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
          reference={t('legend.wage.cityMedian')}
          note={t('legend.wage.note.city')}
        />
      )}
      {mode === 'wage_growth' && (
        <WageLegend
          bound={WAGE_CAGR_BOUND}
          reference={t('tm.zeroPerYr')}
          unit={t('tm.unit.perYr')}
          lowLabel={t('legend.wage.declining')}
          highLabel={t('legend.wage.rising')}
          note={t('tm.note.wageGrowth', { bound: WAGE_CAGR_BOUND })}
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
  daily_wage_2014?: number | null;
  daily_wage_2024?: number | null;
  industry_median_wage?: number | null;
  wage_dev_industry_pct?: number | null;
  wage_dev_city_pct?: number | null;
  wage_cagr_pct?: number | null;
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
    } else if (mode === 'wage_growth') {
      const v = props.wage_cagr_pct ?? null;
      fill = v == null ? '#f6f6f4' : divergingPctColor(v, WAGE_CAGR_BOUND);
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
    daily_wage_2014?: number | null;
    daily_wage_2024?: number | null;
    industry_median_wage?: number | null;
    wage_dev_industry_pct?: number | null;
    wage_dev_city_pct?: number | null;
    wage_cagr_pct?: number | null;
    children?: unknown[];
  };
};
type TipProps = { active?: boolean; payload?: TipPayload[] };

function fmtSignedPct(v: number | null | undefined): string {
  if (v == null) return '—';
  return `${v >= 0 ? '+' : ''}${fmtNum(v, 1)}%`;
}

function LeafTooltip({ active, payload }: TipProps) {
  const t = useT();
  const { lang } = useLang();
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0]?.payload;
  if (!p || p.children) return null;
  return (
    <div className="treemap-tooltip">
      <div className="treemap-tooltip-name">{p.name}</div>
      <div className="treemap-tooltip-section">{sectionLabel(p.section, lang)}</div>
      <dl className="treemap-tooltip-grid">
        <dt>{t('tip.workers2024')}</dt>
        <dd>{fmtInt.format(p.workers_2024 ?? 0)}</dd>
        <dt>{t('tip.pci')}</dt>
        <dd>{p.pci == null ? '—' : fmtNum(p.pci, 2)}</dd>
        <dt>{t('tip.dailyWage2024')}</dt>
        <dd>{p.daily_wage_2024 == null ? '—' : fmtInt.format(Math.round(p.daily_wage_2024))}</dd>
        <dt>{t('tip.wageGrowth')}</dt>
        <dd>
          {p.wage_cagr_pct == null
            ? '—'
            : `${p.wage_cagr_pct >= 0 ? '+' : ''}${fmtNum(p.wage_cagr_pct, 1)} ${t('tm.unit.perYr')}`}
        </dd>
        <dt>{t('tip.vsIndustryNat')}</dt>
        <dd>{fmtSignedPct(p.wage_dev_industry_pct)}</dd>
        <dt>{t('tip.vsCityMedian')}</dt>
        <dd>{fmtSignedPct(p.wage_dev_city_pct)}</dd>
      </dl>
    </div>
  );
}
