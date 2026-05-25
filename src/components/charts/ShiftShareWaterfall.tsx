import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LabelList,
} from 'recharts';
import type { CityShiftShareRow } from '../../data/types';
import { fmtInt } from '../../lib/format';

type Step = {
  name: string;
  range: [number, number];
  value: number;
  kind: 'total' | 'pos' | 'neg';
};

const TOTAL = '#3a3a3a';
const POSITIVE = '#2f7d3a'; // matches the inflow green used in CityMap
const NEGATIVE = '#c64646';

const colorFor = (kind: Step['kind']) =>
  kind === 'total' ? TOTAL : kind === 'pos' ? POSITIVE : NEGATIVE;

const opacityFor = (_: Step['kind']) => 1;

// Decomposes a city's 2014→2024 employment growth into four contributing
// segments using a stacked-bar waterfall (Recharts' range-bar trick).
export default function ShiftShareWaterfall({ row }: { row: CityShiftShareRow }) {
  const steps = computeSteps(row);

  return (
    <ResponsiveContainer width="100%" height={440}>
      <BarChart data={steps} margin={{ top: 28, right: 24, bottom: 28, left: 4 }}>
        <CartesianGrid stroke="#eee" strokeDasharray="2 2" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 13 }} interval={0} />
        <YAxis tickFormatter={(v) => fmtInt.format(v)} tick={{ fontSize: 12 }} width={68} />
        <Tooltip
          cursor={{ fill: '#f3f3f0' }}
          content={({ payload }) => {
            if (!payload || !payload.length) return null;
            const s = payload[0].payload as Step;
            const sign = s.kind === 'neg' ? '−' : s.kind === 'pos' ? '+' : '';
            return (
              <div
                style={{
                  background: '#fff',
                  border: '1px solid #ddd',
                  padding: '6px 10px',
                  fontSize: 12,
                }}
              >
                <strong>{s.name}</strong>
                <div>
                  {sign}
                  {fmtInt.format(Math.abs(s.value))} workers
                </div>
              </div>
            );
          }}
        />
        <Bar dataKey="range" isAnimationActive={false}>
          {steps.map((s, i) => (
            <Cell key={i} fill={colorFor(s.kind)} fillOpacity={opacityFor(s.kind)} />
          ))}
          <LabelList
            dataKey="value"
            position="top"
            style={{ fontSize: 12, fill: '#444' }}
            formatter={(v: number) => {
              if (Math.abs(v) < 1) return '';
              const sign = v > 0 ? '+' : v < 0 ? '−' : '';
              return `${sign}${fmtInt.format(Math.round(Math.abs(v)))}`;
            }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function computeSteps(row: CityShiftShareRow): Step[] {
  const steps: Step[] = [];
  let running = 0;

  steps.push({
    name: '2014',
    range: [0, row.workers_2014],
    value: row.workers_2014,
    kind: 'total',
  });
  running = row.workers_2014;

  const addStep = (name: string, value: number) => {
    const next = running + value;
    if (value >= 0) {
      steps.push({ name, range: [running, next], value, kind: 'pos' });
    } else {
      steps.push({ name, range: [next, running], value, kind: 'neg' });
    }
    running = next;
  };

  addStep('National', row.national_share);
  addStep('Industry mix', row.industry_mix);
  addStep('Local share', row.local_share);
  if (Math.abs(row.entry_share) > 0.5) {
    addStep('New industries', row.entry_share);
  }

  steps.push({
    name: '2024',
    range: [0, row.workers_2024],
    value: row.workers_2024,
    kind: 'total',
  });
  return steps;
}
