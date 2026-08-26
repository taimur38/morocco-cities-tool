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

type Mode = 'section' | 'complexity' | 'wage_industry' | 'wage_city';

// Same diverging bound as SectionOverviewTreemap for visual consistency.
const WAGE_DEV_BOUND = 50;

// Fewer rows than the composition chart: this one is a shorter frame, and the
// set of new industries is small enough that ten is often most of it.
const RANK_TOP_N = 12;

const NO_VALUE = '#f6f6f4';

type Leaf = {
  code: string;
  name: string;
  workers_2024: number;
  section: string;
  pci: number | null;
  daily_wage_2024: number | null;
  industry_median_wage: number | null;
  wage_dev_industry_pct: number | null;
  wage_dev_city_pct: number | null;
  share: number;
};

type Props = {
  rows: CityIndustryShiftShareRow[];
  complexity?: IndustryComplexityRow[] | null;
  cityId: number;
  cityMedianWage?: number | null;
  translations?: Map<string, string> | null;
};

const signedPct = (v: number, digits = 1) =>
  `${v >= 0 ? '+' : ''}${fmtNum(v, digits)}%`;

// Industries that had no CNSS employment in this city in 2014 and do in 2024,
// sized by 2024 workers and grouped by NACE section. Same four readings as the
// composition chart: the treemap shows where new activity concentrated, the
// ranking and the distribution put the colour metric on an axis, and the
// scatter separates how large a new industry is from how well it pays.
export default function NewIndustriesTreemap({
  rows,
  complexity = null,
  cityId,
  cityMedianWage = null,
  translations,
}: Props) {
  const t = useT();
  const { lang } = useLang();
  const [mode, setMode] = useState<Mode>('section');
  const [view, setView] = useState<MorphView>('treemap');
  const [omitted, setOmitted] = useState(0);

  // Pinned to 2024 and scaled by the national max |PCI|, matching
  // SectionOverviewTreemap so the two charts share one complexity ramp.
  const { pciByCode, pciScale } = useMemo(() => {
    if (!complexity) return { pciByCode: new Map<string, number>(), pciScale: 0 };
    const m = new Map<string, number>();
    let scale = 0;
    for (const r of complexity) {
      if (r.year === 2024 && r.pci_workers != null) {
        m.set(r.CODE_ACTIVITE_NMA2010, r.pci_workers);
        scale = Math.max(scale, Math.abs(r.pci_workers));
      }
    }
    return { pciByCode: m, pciScale: scale };
  }, [complexity]);

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

  const { nodes, total, count, sectionsPresent } = useMemo(() => {
    const cells = rows.filter(
      (r) => r.city_id === cityId && r.workers_2014 === 0 && r.workers_2024 > 0,
    );
    if (cells.length === 0) {
      return { nodes: [] as MorphNode<Leaf>[], total: 0, count: 0, sectionsPresent: [] as string[] };
    }

    let total = 0;
    for (const c of cells) total += c.workers_2024;

    const nodes: MorphNode<Leaf>[] = cells.map((c) => {
      const label = industryLabel(c.LIBELLE_ACTIVITE, translations, lang);
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

      const datum: Leaf = {
        code: c.CODE_ACTIVITE_NMA2010,
        name: label,
        workers_2024: c.workers_2024,
        section: c.section,
        pci: pciByCode.get(c.CODE_ACTIVITE_NMA2010) ?? null,
        daily_wage_2024: wage,
        industry_median_wage: med,
        wage_dev_industry_pct,
        wage_dev_city_pct,
        share: total > 0 ? c.workers_2024 / total : 0,
      };

      return {
        key: c.CODE_ACTIVITE_NMA2010,
        name: label,
        value: c.workers_2024,
        groupKey: c.section,
        groupName: sectionLabel(c.section, lang),
        groupColor: sectionColor(c.section),
        datum,
      };
    });

    const totals = new Map<string, number>();
    for (const n of nodes) {
      totals.set(n.groupKey, (totals.get(n.groupKey) ?? 0) + n.value);
    }
    const sectionsPresent = [...totals.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([s]) => s);

    return { nodes, total, count: cells.length, sectionsPresent };
  }, [rows, cityId, translations, lang, pciByCode, wageMedianByCode, cityMedianWage]);

  const fillOf = useCallback(
    (n: MorphNode<Leaf>) => {
      const d = n.datum;
      switch (mode) {
        case 'section':
          return mix(sectionColor(d.section), '#ffffff', 0.45);
        case 'complexity':
          return complexityColor(d.pci, pciScale);
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
      case 'section':
      default:
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
    return <p className="muted">{t('tm.empty.new')}</p>;
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
          </select>
        </label>
        <MorphViewSwitch
          value={view}
          onChange={setView}
          views={views}
          label={t('tm.view')}
        />
        <span className="chart-toolbar-hint">
          {t('tm.new.hint', { count, n: fmtInt.format(total) })}
        </span>
      </div>
      <div className="morph-frame morph-frame--short">
        <MorphTreemap<Leaf>
          nodes={nodes}
          view={view}
          metric={metric}
          fillOf={fillOf}
          leafLabels
          leafSub={(n) => (n.datum.share >= 0.03 ? `${(n.datum.share * 100).toFixed(0)}%` : undefined)}
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
        <dt>{t('tip.workers2014')}</dt>
        <dd>{t('tip.newEntrant0')}</dd>
        <dt>{t('tip.pci')}</dt>
        <dd>{d.pci == null ? '—' : fmtNum(d.pci, 2)}</dd>
        <dt>{t('tip.dailyWage2024')}</dt>
        <dd>{d.daily_wage_2024 == null ? '—' : fmtInt.format(Math.round(d.daily_wage_2024))}</dd>
        <dt>{t('tip.vsIndustryNat')}</dt>
        <dd>{fmtSignedPct(d.wage_dev_industry_pct)}</dd>
        <dt>{t('tip.vsCityMedian')}</dt>
        <dd>{fmtSignedPct(d.wage_dev_city_pct)}</dd>
      </dl>
    </>
  );
}
