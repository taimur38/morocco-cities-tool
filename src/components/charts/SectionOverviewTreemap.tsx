import { useCallback, useMemo, useState } from 'react';
import type {
  CityIndustryShiftShareRow,
  IndustryComplexityRow,
} from '../../data/types';
import { fmtInt, fmtNum } from '../../lib/format';
import { sectionColor } from '../../lib/sectionPalette';
import { complexityColor, divergingPctColor } from '../../lib/colorScales';
import { mix } from '../../lib/chartText';
import { ComplexityLegend, SectionLegend, WageLegend } from './treemapLegends';
import MorphTreemap, { MorphViewSwitch } from './MorphTreemap';
import type { MorphMetric, MorphNode, MorphView } from './morphLayout';
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

// Rows past this in the ranked view collapse and fade. Fourteen is what fits
// the 520px frame at a bar height the eye can still compare.
const RANK_TOP_N = 14;

// The colour of an unmeasured cell — an industry with no wage or no complexity
// score. --bg-alt, so it reads as "no answer" rather than as a low value.
const NO_VALUE = '#f6f6f4';

type Leaf = {
  code: string;
  name: string;
  section: string;
  pci: number | null;
  workers_2024: number;
  daily_wage_2014: number | null;
  daily_wage_2024: number | null;
  industry_median_wage: number | null;
  wage_dev_industry_pct: number | null;
  wage_dev_city_pct: number | null;
  wage_cagr_pct: number | null;
  share: number;
};

type Props = {
  rows: CityIndustryShiftShareRow[];
  complexity: IndustryComplexityRow[] | null;
  cityId: number;
  cityMedianWage?: number | null;
  translations?: Map<string, string> | null;
};

const signedPct = (v: number, digits = 1) =>
  `${v >= 0 ? '+' : ''}${fmtNum(v, digits)}%`;

// The city's 2024 industrial composition, sized by workers_2024 and grouped by
// NACE section. "Color by" chooses what the cells say — the section itself, the
// industry's complexity, or its wage against one of three references — and
// "View" chooses how the same marks are arranged.
//
// The four views answer different questions off one set of rectangles. The
// treemap is the composition: how much of the city each industry IS. The
// ranking puts the colour metric on a length, which is the only form a reader
// can compare precisely; a treemap can only put it in a hue. The distribution
// keeps every industry and its size but drops the packing, so the reader sees
// where the city sits on the metric as a whole rather than industry by
// industry. And the scatter separates size from the metric, which is what
// answers "large AND well paid" — the conjunction the treemap can only gesture
// at by putting a colour on a big rectangle.
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
  const [view, setView] = useState<MorphView>('treemap');
  const [omitted, setOmitted] = useState(0);

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

  const { nodes, totalWorkers, sectionsPresent } = useMemo(() => {
    const cells = rows.filter((r) => r.city_id === cityId && r.workers_2024 > 0);
    if (cells.length === 0) {
      return { nodes: [] as MorphNode<Leaf>[], totalWorkers: 0, sectionsPresent: [] as string[] };
    }

    let totalWorkers = 0;
    for (const c of cells) totalWorkers += c.workers_2024;

    const nodes: MorphNode<Leaf>[] = cells.map((c) => {
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
      // null when the industry was absent in 2014 (the chart is restricted to
      // workers_2024 > 0, but workers_2014 may be 0 — those are entry cells).
      const wage_cagr_pct =
        wage != null && wage14 != null && wage14 > 0
          ? (Math.pow(wage / wage14, 1 / 10) - 1) * 100
          : null;

      const datum: Leaf = {
        code: c.CODE_ACTIVITE_NMA2010,
        name: label,
        section: c.section,
        pci,
        workers_2024: c.workers_2024,
        daily_wage_2014: wage14,
        daily_wage_2024: wage,
        industry_median_wage: med,
        wage_dev_industry_pct,
        wage_dev_city_pct,
        wage_cagr_pct,
        share: totalWorkers > 0 ? c.workers_2024 / totalWorkers : 0,
      };

      return {
        // The CNSS code, not the label: the key is the identity a mark carries
        // across a view change, and the label moves when the reader switches
        // language, which would unmount every rectangle and remount it.
        key: c.CODE_ACTIVITE_NMA2010,
        name: label,
        value: c.workers_2024,
        groupKey: c.section,
        groupName: sectionLabel(c.section, lang),
        groupColor: sectionColor(c.section),
        datum,
      };
    });

    // Sections in descending order of employment, so the legend reads in the
    // order the treemap lays them out.
    const totals = new Map<string, number>();
    for (const n of nodes) {
      totals.set(n.groupKey, (totals.get(n.groupKey) ?? 0) + n.value);
    }
    const sectionsPresent = [...totals.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([s]) => s);

    return { nodes, totalWorkers, sectionsPresent };
  }, [rows, cityId, translations, lang, pciByCode, wageMedianByCode, cityMedianWage]);

  // What a cell is painted. Section fills are mixed toward paper rather than
  // drawn at reduced opacity: the label layer picks its ink by the luminance of
  // the fill it sits on, and it can only do that if the fill it is handed is
  // the colour actually on screen.
  const fillOf = useCallback(
    (n: MorphNode<Leaf>) => {
      const d = n.datum;
      switch (mode) {
        case 'section':
          return mix(sectionColor(d.section), '#ffffff', 0.45);
        case 'complexity':
          return complexityColor(d.pci, pciScale);
        case 'wage_growth':
          return d.wage_cagr_pct == null
            ? NO_VALUE
            : divergingPctColor(d.wage_cagr_pct, WAGE_CAGR_BOUND);
        case 'wage_industry':
          return d.wage_dev_industry_pct == null
            ? NO_VALUE
            : divergingPctColor(d.wage_dev_industry_pct, WAGE_DEV_BOUND);
        case 'wage_city':
          return d.wage_dev_city_pct == null
            ? NO_VALUE
            : divergingPctColor(d.wage_dev_city_pct, WAGE_DEV_BOUND);
      }
    },
    [mode, pciScale],
  );

  // The metric is the colour mode read as a number. Keeping the two in step is
  // deliberate: the reader picks what the cells say once, and every view then
  // answers that same question in its own form.
  const metric = useMemo<MorphMetric<Leaf>>(() => {
    switch (mode) {
      case 'complexity':
        return {
          key: 'pci',
          label: t('tip.pci'),
          of: (n) => n.datum.pci,
          format: (v) => fmtNum(v, 2),
          baseline: 0,
          baselineLabel: t('tm.ref.nationalAvg'),
        };
      case 'wage_industry':
        return {
          key: 'wage_industry',
          label: t('tm.axis.wageIndustry'),
          of: (n) => n.datum.wage_dev_industry_pct,
          format: (v) => signedPct(v, 0),
          baseline: 0,
          baselineLabel: t('tm.ref.industryMedian'),
        };
      case 'wage_city':
        return {
          key: 'wage_city',
          label: t('tm.axis.wageCity'),
          of: (n) => n.datum.wage_dev_city_pct,
          format: (v) => signedPct(v, 0),
          baseline: 0,
          baselineLabel: t('tm.ref.cityMedian'),
        };
      case 'wage_growth':
        return {
          key: 'wage_growth',
          label: t('tm.axis.wageGrowth'),
          of: (n) => n.datum.wage_cagr_pct,
          format: (v) => signedPct(v),
          baseline: 0,
          baselineLabel: t('tm.ref.noChange'),
        };
      case 'section':
      default:
        // Colouring by section says nothing numeric, so the positional views
        // fall back to the area measure. `isSize` is what tells the scatter to
        // become a strip plot by section rather than plot workers against
        // workers and draw a diagonal.
        return {
          key: 'workers',
          label: t('tm.axis.workers'),
          of: (n) => n.value,
          format: (v) => fmtInt.format(Math.round(v)),
          log: true,
          isSize: true,
        };
    }
  }, [mode, t]);

  const views = useMemo(
    () => [
      { value: 'treemap' as MorphView, label: t('tm.view.treemap') },
      { value: 'bars' as MorphView, label: t('tm.view.ranked') },
      { value: 'beeswarm' as MorphView, label: t('tm.view.distribution') },
      {
        value: 'scatter' as MorphView,
        label: metric.isSize ? t('tm.view.bySection') : t('tm.view.vsSize'),
      },
    ],
    [t, metric.isSize],
  );

  if (nodes.length === 0) {
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
        <MorphViewSwitch
          value={view}
          onChange={setView}
          views={views}
          label={t('tm.view')}
        />
        {view !== 'bars' && (
          <span className="chart-toolbar-hint">
            {t('charts.sizedBy2024', { n: fmtInt.format(totalWorkers) })}
          </span>
        )}
      </div>
      <div className="morph-frame">
        <MorphTreemap<Leaf>
          nodes={nodes}
          view={view}
          metric={metric}
          fillOf={fillOf}
          leafLabels
          leafSub={(n) => (n.datum.share >= 0.02 ? `${(n.datum.share * 100).toFixed(0)}%` : undefined)}
          topN={RANK_TOP_N}
          sizeLabel={t('tm.axis.workersShort')}
          onOmitted={setOmitted}
          renderTooltip={(n) => <LeafTooltip d={n.datum} />}
        />
      </div>
      {omitted > 0 && (
        <p className="chart-toolbar-hint muted">
          {view === 'bars'
            ? t('tm.topOf', { shown: nodes.length - omitted, total: nodes.length })
            : t('tm.omitted', { n: omitted })}
        </p>
      )}
      {mode === 'section' && <SectionLegend sections={sectionsPresent} />}
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

function fmtSignedPct(v: number | null | undefined): string {
  if (v == null) return '—';
  return signedPct(v);
}

function LeafTooltip({ d }: { d: Leaf }) {
  const t = useT();
  const { lang } = useLang();
  return (
    <>
      <div className="treemap-tooltip-name">{d.name}</div>
      <div className="treemap-tooltip-section">{sectionLabel(d.section, lang)}</div>
      <dl className="treemap-tooltip-grid">
        <dt>{t('tip.workers2024')}</dt>
        <dd>{fmtInt.format(d.workers_2024)}</dd>
        <dt>{t('tip.pci')}</dt>
        <dd>{d.pci == null ? '—' : fmtNum(d.pci, 2)}</dd>
        <dt>{t('tip.dailyWage2024')}</dt>
        <dd>{d.daily_wage_2024 == null ? '—' : fmtInt.format(Math.round(d.daily_wage_2024))}</dd>
        <dt>{t('tip.wageGrowth')}</dt>
        <dd>
          {d.wage_cagr_pct == null
            ? '—'
            : `${d.wage_cagr_pct >= 0 ? '+' : ''}${fmtNum(d.wage_cagr_pct, 1)} ${t('tm.unit.perYr')}`}
        </dd>
        <dt>{t('tip.vsIndustryNat')}</dt>
        <dd>{fmtSignedPct(d.wage_dev_industry_pct)}</dd>
        <dt>{t('tip.vsCityMedian')}</dt>
        <dd>{fmtSignedPct(d.wage_dev_city_pct)}</dd>
      </dl>
    </>
  );
}
