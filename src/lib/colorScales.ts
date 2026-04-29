// Continuous color scales sourced from the Growth Lab design library so the
// webapp matches charts produced in the R/ggplot pipeline.
//
// - `complexityColor`: Atlas complexity gradient (orange → cream → teal),
//   transcribed from `~/dev/gl-design/design-library/visualization_colors/
//   atlas/complexity_color_scale.csv`.
// - `divergingPctColor`: GL-palette green/red diverging scale for "% of base
//   workforce gained or lost" — green from the categorical palette, red from
//   `gl$highlight`.

type Stop = { t: number; rgb: [number, number, number] };

// Atlas complexity gradient stops (t in [0,1]).
const COMPLEXITY_STOPS: Stop[] = [
  { t: 0.0, rgb: [227, 159, 96] },
  { t: 0.2787, rgb: [231, 173, 120] },
  { t: 0.339, rgb: [235, 188, 143] },
  { t: 0.3983, rgb: [240, 202, 168] },
  { t: 0.4483, rgb: [244, 217, 191] },
  { t: 0.494, rgb: [248, 231, 215] },
  { t: 0.4941, rgb: [192, 228, 225] },
  { t: 0.5337, rgb: [154, 211, 207] },
  { t: 0.5714, rgb: [116, 195, 189] },
  { t: 0.6066, rgb: [77, 178, 171] },
  { t: 0.6617, rgb: [40, 162, 153] },
  { t: 1.0, rgb: [2, 146, 135] },
];

function lerpStops(stops: Stop[], t: number): string {
  const c = Math.max(0, Math.min(1, t));
  for (let i = 1; i < stops.length; i++) {
    const a = stops[i - 1];
    const b = stops[i];
    if (c <= b.t) {
      const span = b.t - a.t;
      const u = span === 0 ? 0 : (c - a.t) / span;
      const r = Math.round(a.rgb[0] + (b.rgb[0] - a.rgb[0]) * u);
      const g = Math.round(a.rgb[1] + (b.rgb[1] - a.rgb[1]) * u);
      const bb = Math.round(a.rgb[2] + (b.rgb[2] - a.rgb[2]) * u);
      return `rgb(${r}, ${g}, ${bb})`;
    }
  }
  const last = stops[stops.length - 1].rgb;
  return `rgb(${last[0]}, ${last[1]}, ${last[2]})`;
}

// `value` is centered (PCI is mean ≈ 0). `scale` is the absolute bound that
// maps to ±1 (e.g. the 95th-percentile of |PCI| or the global max).
export function complexityColor(value: number | null, scale: number): string {
  if (value == null || !Number.isFinite(value) || scale <= 0) {
    return 'rgb(248, 231, 215)';
  }
  const t = 0.5 + (Math.max(-scale, Math.min(scale, value)) / scale) * 0.5;
  return lerpStops(COMPLEXITY_STOPS, t);
}

// Diverging green/red scale. `value` is a signed percent (already in % units).
// The color is capped at ±`bound` (e.g. 100 — the cap requested for treemaps).
const DIV_POS: [number, number, number] = [54, 178, 80];
const DIV_NEG: [number, number, number] = [198, 70, 70];
const DIV_NEUTRAL: [number, number, number] = [244, 244, 241];

const toRgb = (c: [number, number, number]) => `rgb(${c[0]}, ${c[1]}, ${c[2]})`;

export function divergingPctColor(value: number, bound: number): string {
  if (!Number.isFinite(value) || bound <= 0) return toRgb(DIV_NEUTRAL);
  const t = Math.max(-1, Math.min(1, value / bound));
  if (t === 0) return toRgb(DIV_NEUTRAL);
  const target = t > 0 ? DIV_POS : DIV_NEG;
  const u = Math.abs(t);
  const r = Math.round(DIV_NEUTRAL[0] + (target[0] - DIV_NEUTRAL[0]) * u);
  const g = Math.round(DIV_NEUTRAL[1] + (target[1] - DIV_NEUTRAL[1]) * u);
  const b = Math.round(DIV_NEUTRAL[2] + (target[2] - DIV_NEUTRAL[2]) * u);
  return `rgb(${r}, ${g}, ${b})`;
}
