import { useMemo, useState } from 'react';
import {
  ComposedChart,
  Bar,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { CityIndustryShiftShareRow } from '../../data/types';
import { fmtInt } from '../../lib/format';
import { useLang } from '../../i18n/context';
import { useT, sectionLabel, industryLabel } from '../../i18n/ui';

// The first two rank the same bar (observed change) against the expected-change
// dot; the last two drop the dot and plot a single shift-share component on its
// own, since a component has no counterfactual to sit beside it.
type Rank = 'movers' | 'gap' | 'industry_mix' | 'local_share';

const WITH_EXPECTED: Rank[] = ['movers', 'gap'];

const TOP_OPTIONS = [15, 30, 50];
const ROW_HEIGHT = 22;
const LABEL_WIDTH = 250;
const LABEL_MAX_CHARS = 42;

const GAIN = '#1a1a1a';
const LOSS = '#c64646';
const EXPECTED_STROKE = '#1a1a1a';

type Mover = {
  id: string;
  name: string;
  section: string;
  workers_2014: number;
  workers_2024: number;
  /** Observed 2014→2024 change in workers. */
  actual: number;
  /** national_share + industry_mix: the change implied by national trends alone. */
  expected: number;
  industry_mix: number;
  /** Identically equal to actual − expected, so the gap-from-expected and
   *  local-share rankings pick the same industries in the same order. */
  local_share: number;
};

type Props = {
  rows: CityIndustryShiftShareRow[];
  cityId: number;
  translations?: Map<string, string> | null;
};

// Per-industry view of the shift-share decomposition for incumbent industries
// (workers_2014 > 0). Each row is one CNSS industry: the bar is the observed
// change in workers, the dot is the change national trends alone would have
// produced (national-growth + industry-mix terms). The distance between them is
// the local-share effect — the residual the city itself is responsible for.
//
// Replaces the earlier treemap-of-effects: with several hundred industries per
// city, area-plus-color made the largest movers hard to pick out. Ranking to a
// top-N list trades exhaustiveness for legibility.
export default function IndustryMovers({ rows, cityId, translations }: Props) {
  const t = useT();
  const { lang } = useLang();
  const [topN, setTopN] = useState(15);
  const [rank, setRank] = useState<Rank>('movers');

  const { movers, total } = useMemo(() => {
    const cells = rows.filter((r) => r.city_id === cityId && r.workers_2014 > 0);
    const movers: Mover[] = cells.map((c) => ({
      id: c.CODE_ACTIVITE_NMA2010,
      name: industryLabel(c.LIBELLE_ACTIVITE, translations, lang),
      section: c.section,
      workers_2014: c.workers_2014,
      workers_2024: c.workers_2024,
      actual: c.workers_2024 - c.workers_2014,
      expected: c.national_share + c.industry_mix,
      industry_mix: c.industry_mix,
      local_share: c.local_share,
    }));
    return { movers, total: movers.length };
  }, [rows, cityId, translations, lang]);

  // Which field the bar draws. The two expected-change views share one bar (the
  // observed change) and differ only in how the top N is picked.
  const barKey: keyof Mover =
    rank === 'industry_mix' ? 'industry_mix'
    : rank === 'local_share' ? 'local_share'
    : 'actual';
  const withExpected = WITH_EXPECTED.includes(rank);

  // Rank by magnitude to pick the top N, then order the survivors by signed
  // value so the chart reads gainers-down-to-losers on whichever metric the
  // reader chose.
  const display = useMemo(() => {
    const key = (m: Mover) =>
      rank === 'movers' ? m.actual
      : rank === 'industry_mix' ? m.industry_mix
      : m.local_share; // 'gap' and 'local_share' rank identically by construction
    return [...movers]
      .sort((a, b) => Math.abs(key(b)) - Math.abs(key(a)))
      .slice(0, topN)
      .sort((a, b) => key(b) - key(a));
  }, [movers, rank, topN]);

  if (display.length === 0) {
    return <p className="muted">{t('tm.empty.incumbent')}</p>;
  }

  const labels = display.map((d) => truncate(d.name, LABEL_MAX_CHARS));
  const metric = t(
    rank === 'industry_mix' ? 'mv.metric.industryMix'
    : rank === 'local_share' ? 'mv.metric.localShare'
    : 'mv.metric.observed',
  );

  return (
    <div>
      <div className="chart-toolbar">
        <label className="chart-toolbar-control">
          {t('mv.rankBy')}
          <select
            className="chart-toolbar-select"
            value={rank}
            onChange={(e) => setRank(e.target.value as Rank)}
          >
            <option value="movers">{t('mv.opt.movers')}</option>
            <option value="gap">{t('mv.opt.gap')}</option>
            <option value="industry_mix">{t('mv.opt.industryMix')}</option>
            <option value="local_share">{t('mv.opt.localShare')}</option>
          </select>
        </label>
        <label className="chart-toolbar-control">
          {t('mv.topN')}
          <select
            className="chart-toolbar-select"
            value={topN}
            onChange={(e) => setTopN(Number(e.target.value))}
          >
            {TOP_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <span className="chart-toolbar-hint">
          {t('mv.hint', { n: display.length, total })}
        </span>
      </div>

      <ResponsiveContainer width="100%" height={display.length * ROW_HEIGHT + 90}>
        <ComposedChart
          data={display}
          layout="vertical"
          margin={{ top: 8, right: 28, bottom: 44, left: 4 }}
        >
          <CartesianGrid stroke="#eee" strokeDasharray="2 2" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 12 }}
            tickFormatter={signed}
            label={{
              value: withExpected ? t('mv.axis') : t('mv.axis.component', { m: metric }),
              position: 'insideBottom',
              offset: -16,
              style: { textAnchor: 'middle', fontSize: 13, fill: '#555' },
            }}
          />
          <YAxis
            type="category"
            dataKey="id"
            width={LABEL_WIDTH}
            interval={0}
            tickLine={false}
            tick={<IndustryTick labels={labels} />}
          />
          <ReferenceLine x={0} stroke="#999" />
          <Tooltip
            cursor={{ fill: '#f3f3f0' }}
            wrapperStyle={{ zIndex: 10 }}
            content={<MoverTooltip />}
          />
          <Bar dataKey={barKey} barSize={12} isAnimationActive={false}>
            {display.map((d) => (
              <Cell key={d.id} fill={(d[barKey] as number) >= 0 ? GAIN : LOSS} />
            ))}
          </Bar>
          {withExpected && (
            <Scatter
              dataKey="expected"
              isAnimationActive={false}
              shape={<ExpectedMarker />}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>

      <div className="section-legend">
        <span className="section-legend-item">
          <span className="section-legend-swatch" style={{ background: GAIN }} />
          {t('mv.legend.gain', { m: metric })}
        </span>
        <span className="section-legend-item">
          <span className="section-legend-swatch" style={{ background: LOSS }} />
          {t('mv.legend.loss', { m: metric })}
        </span>
        {withExpected && (
          <span className="section-legend-item">
            <svg width="11" height="11" aria-hidden="true">
              <circle
                cx={5.5}
                cy={5.5}
                r={3.6}
                fill="#fff"
                stroke={EXPECTED_STROKE}
                strokeWidth={1.6}
              />
            </svg>
            {t('mv.legend.expected')}
          </span>
        )}
      </div>
      <div className="treemap-legend-note">
        {t(
          withExpected ? 'mv.note'
          : rank === 'industry_mix' ? 'mv.note.industryMix'
          : 'mv.note.localShare',
        )}
      </div>
    </div>
  );
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max - 1).trimEnd()}…`;
}

function signed(n: number): string {
  if (n === 0) return '0';
  const sign = n > 0 ? '+' : '−';
  return `${sign}${fmtInt.format(Math.abs(Math.round(n)))}`;
}

function changeClass(n: number): string {
  return n > 0 ? 'pos' : n < 0 ? 'neg' : '';
}

// Recharts clones the tick element with x/y/index at render time, so those
// arrive injected rather than from the JSX site. `labels` is indexed by the
// row's position because the category axis keys on the industry code (unique)
// while the visible label is the translated industry name (not necessarily so).
// With interval={0} every category gets a tick, so tick index === row index.
type TickProps = {
  x?: number;
  y?: number;
  index?: number;
  labels: string[];
};

function IndustryTick({ x = 0, y = 0, index, labels }: TickProps) {
  const label = labels[index ?? -1];
  if (label == null) return null;
  return (
    <text x={x - 6} y={y} dy={4} textAnchor="end" fontSize={12} fill="#333">
      {label}
    </text>
  );
}

// Scatter hands its shape the resolved point, so the marker only has to place
// itself. The gap to the end of the bar is left to read as empty space.
type MarkerProps = { cx?: number; cy?: number };

function ExpectedMarker({ cx, cy }: MarkerProps) {
  if (cx == null || cy == null) return null;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={4}
      fill="#fff"
      stroke={EXPECTED_STROKE}
      strokeWidth={1.6}
    />
  );
}

type TipProps = { active?: boolean; payload?: { payload?: Mover }[] };

function MoverTooltip({ active, payload }: TipProps) {
  const t = useT();
  const { lang } = useLang();
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0]?.payload;
  if (!p) return null;
  return (
    <div className="treemap-tooltip">
      <div className="treemap-tooltip-name">{p.name}</div>
      <div className="treemap-tooltip-section">{sectionLabel(p.section, lang)}</div>
      <dl className="treemap-tooltip-grid">
        <dt>{t('tip.workers2014')}</dt>
        <dd>{fmtInt.format(p.workers_2014)}</dd>
        <dt>{t('tip.workers2024')}</dt>
        <dd>{fmtInt.format(p.workers_2024)}</dd>
        <dt>{t('mv.tip.actual')}</dt>
        <dd className={changeClass(p.actual)}>{signed(p.actual)}</dd>
        <dt>{t('mv.tip.expected')}</dt>
        <dd>{signed(p.expected)}</dd>
        <dt>{t('mv.metric.industryMix')}</dt>
        <dd className={changeClass(p.industry_mix)}>{signed(p.industry_mix)}</dd>
        <dt>{t('mv.metric.localShare')}</dt>
        <dd className={changeClass(p.local_share)}>{signed(p.local_share)}</dd>
      </dl>
    </div>
  );
}
