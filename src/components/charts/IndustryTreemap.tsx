import { useEffect, useMemo, useState } from 'react';
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';
import type { CityIndustryShiftShareRow } from '../../data/types';
import { fmtInt } from '../../lib/format';
import { divergingPctColor } from '../../lib/colorScales';
import { DivergingPctLegend } from './treemapLegends';
import {
  SectionLabelsOverlay,
  useSectionBoxes,
  type RecordBox,
} from './sectionLabels';
import { useLang } from '../../i18n/context';
import { useT, sectionLabel, industryLabel } from '../../i18n/ui';

type Mode = 'local_share' | 'industry_mix';

const PCT_BOUND = 100;

type Leaf = {
  name: string;
  size: number;
  pct: number;
  workers_2014: number;
  workers_2024: number;
  fullName: string;
  section: string;
};

type Group = {
  name: string;
  children: Leaf[];
};

type Props = {
  rows: CityIndustryShiftShareRow[];
  cityId: number;
  translations?: Map<string, string> | null;
};

// Treemap of incumbent industries (workers_2014 > 0) grouped by NACE section.
// Box area is 2014 employment; box color encodes one of the two shift-share
// contributions expressed as a *percent of base-year workers* — i.e. the
// fraction of the industry's 2014 workforce gained or lost via that effect.
// The color scale is hard-capped at ±100% so the diverging hue stays
// interpretable across cities and modes.
export default function IndustryTreemap({ rows, cityId, translations }: Props) {
  const t = useT();
  const { lang } = useLang();
  const [mode, setMode] = useState<Mode>('local_share');
  const { boxes: sectionBoxes, recordBox } = useSectionBoxes([cityId]);

  const { data, totalWorkers } = useMemo(() => {
    const cells = rows.filter(
      (r) => r.city_id === cityId && r.workers_2014 > 0,
    );
    if (cells.length === 0) {
      return { data: [] as Group[], totalWorkers: 0 };
    }

    let totalWorkers = 0;
    const bySection = new Map<string, Leaf[]>();
    for (const c of cells) {
      const metric = mode === 'local_share' ? c.local_share : c.industry_mix;
      const pct = c.workers_2014 > 0 ? (metric / c.workers_2014) * 100 : 0;
      totalWorkers += c.workers_2014;
      const label = industryLabel(c.LIBELLE_ACTIVITE, translations, lang);
      const arr = bySection.get(c.section) ?? [];
      arr.push({
        name: label,
        fullName: label,
        size: c.workers_2014,
        pct,
        workers_2014: c.workers_2014,
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

    return { data, totalWorkers };
  }, [rows, cityId, mode, translations, lang]);

  if (data.length === 0) {
    return <p className="muted">{t('tm.empty.incumbent')}</p>;
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
            <option value="local_share">{t('tm.opt.localShare')}</option>
            <option value="industry_mix">{t('tm.opt.industryMix')}</option>
          </select>
        </label>
        <span className="chart-toolbar-hint">
          {t('charts.sizedBy2014', { n: fmtInt.format(totalWorkers) })}
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
            content={<TreemapCell recordBox={recordBox} />}
          >
            <Tooltip content={<LeafTooltip mode={mode} />} wrapperStyle={{ zIndex: 10 }} />
          </Treemap>
        </ResponsiveContainer>
        <SectionLabelsOverlay boxes={sectionBoxes} />
      </div>
      <DivergingPctLegend
        bound={PCT_BOUND}
        note={t(
          mode === 'local_share' ? 'tm.note.localShare' : 'tm.note.industryMix',
          { bound: PCT_BOUND },
        )}
      />
    </div>
  );
}

function sumSize(arr: Leaf[]): number {
  return arr.reduce((s, x) => s + x.size, 0);
}

// Recharts clones the `content` element and merges in node props (x, y,
// width, height, depth, name, plus any custom fields on the data leaf) at
// render time — so this component is invoked without those at the JSX site
// and they're injected later. The signature reflects that.
type TreemapNodeProps = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  depth?: number;
  name?: string;
  children?: unknown[];
  pct?: number;
  workers_2014?: number;
  workers_2024?: number;
  section?: string;
  recordBox?: RecordBox;
};

function TreemapCell(props: TreemapNodeProps) {
  const { x = 0, y = 0, width = 0, height = 0, depth = 0, name = '', recordBox } = props;

  // Push the section's box up to the parent so the overlay layer can draw the
  // label on top of all leaves. useEffect fires after Recharts commits this
  // cell, so the parent re-renders with the correct dimensions even on the
  // first paint (ResponsiveContainer's initial measure round-trip).
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
    const pct = props.pct ?? 0;
    const fill = divergingPctColor(pct, PCT_BOUND);
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={fill}
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
    pct?: number;
    workers_2014?: number;
    workers_2024?: number;
    children?: unknown[];
  };
};
type TipProps = { active?: boolean; payload?: TipPayload[]; mode: Mode };

function LeafTooltip({ active, payload, mode }: TipProps) {
  const t = useT();
  const { lang } = useLang();
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0]?.payload;
  if (!p || p.children) return null; // section frames have children — skip
  const w14 = p.workers_2014 ?? 0;
  const w24 = p.workers_2024 ?? 0;
  const change = w24 - w14;
  return (
    <div className="treemap-tooltip">
      <div className="treemap-tooltip-name">{p.name}</div>
      <div className="treemap-tooltip-section">{sectionLabel(p.section, lang)}</div>
      <dl className="treemap-tooltip-grid">
        <dt>{t('tip.workers2014')}</dt>
        <dd>{fmtInt.format(w14)}</dd>
        <dt>{t('tip.workers2024')}</dt>
        <dd>{fmtInt.format(w24)}</dd>
        <dt>{t('tip.netChange')}</dt>
        <dd className={changeClass(change)}>
          {signed(change)} ({signedPct((change / Math.max(w14, 1)) * 100)})
        </dd>
        <dt>{mode === 'local_share' ? t('tip.localShareEffect') : t('tip.industryMixEffect')}</dt>
        <dd className={changeClass(p.pct ?? 0)}>
          {signedPct(p.pct ?? 0)} {t('tip.of2014Workforce')}
        </dd>
      </dl>
    </div>
  );
}

function signed(n: number): string {
  if (n === 0) return '0';
  const sign = n > 0 ? '+' : '−';
  return `${sign}${fmtInt.format(Math.abs(n))}`;
}
function signedPct(p: number): string {
  if (!Number.isFinite(p)) return '—';
  const sign = p > 0 ? '+' : p < 0 ? '−' : '';
  return `${sign}${Math.abs(p).toFixed(0)}%`;
}
function changeClass(n: number): string {
  return n > 0 ? 'pos' : n < 0 ? 'neg' : '';
}
