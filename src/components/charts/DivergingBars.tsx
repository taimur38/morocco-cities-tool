import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';

export type DivergingBarsItem = { label: string; value: number };

type Props = {
  items: DivergingBarsItem[];
  n?: number;
  xLabel?: string;
  valueFormat?: (v: number) => string;
};

const POSITIVE = '#1a1a1a';
const NEGATIVE = '#c64646';

// Sorts items descending and shows the top-n gainers and bottom-n losers
// as a horizontal diverging bar chart. Positive bars use the body color,
// negative bars use the project's highlight red.
export default function DivergingBars({
  items,
  n = 10,
  xLabel,
  valueFormat = (v) => `${v.toFixed(1)}%`,
}: Props) {
  const sorted = [...items].sort((a, b) => b.value - a.value);
  const display =
    sorted.length <= 2 * n ? sorted : [...sorted.slice(0, n), ...sorted.slice(-n)];

  return (
    <ResponsiveContainer width="100%" height={Math.max(440, display.length * 30 + 70)}>
      <BarChart data={display} layout="vertical" margin={{ top: 8, right: 24, bottom: 40, left: 4 }}>
        <CartesianGrid stroke="#eee" strokeDasharray="2 2" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 12 }}
          tickFormatter={(v) => valueFormat(v)}
          label={
            xLabel
              ? {
                  value: xLabel,
                  position: 'insideBottom',
                  offset: -14,
                  style: { textAnchor: 'middle', fontSize: 13, fill: '#555' },
                }
              : undefined
          }
        />
        <YAxis
          type="category"
          dataKey="label"
          width={155}
          tick={{ fontSize: 13 }}
          interval={0}
        />
        <ReferenceLine x={0} stroke="#999" />
        <Tooltip
          cursor={{ fill: '#f3f3f0' }}
          formatter={(v: number) => valueFormat(v)}
          labelStyle={{ fontSize: 13, fontWeight: 600 }}
          contentStyle={{ fontSize: 13 }}
        />
        <Bar dataKey="value">
          {display.map((d, i) => (
            <Cell key={i} fill={d.value >= 0 ? POSITIVE : NEGATIVE} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
