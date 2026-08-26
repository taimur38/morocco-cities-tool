// Text measurement and fitting for in-chart labels.
//
// Labels are placed by the layout functions in components/charts/morphLayout,
// which run before anything is in the DOM, so widths have to be measured rather
// than discovered. A canvas context measures the actual font; the arithmetic
// fallback exists so a label still appears if the context is unavailable, at
// the cost of some slack.

export const GROUP_GUTTER = 8;
export const LEAF_HAIRLINE = 1;

export type LabelFont = { size: number; weight: number; tracking?: number };

// 11px is the floor for a chart label here. Sentence case at 11px reads; the
// small-caps-with-wide-tracking alternative separates letters faster than the
// eye regroups them.
export const GROUP_FONT: LabelFont = { size: 11, weight: 600, tracking: 0.01 };
export const LEAF_FONT: LabelFont = { size: 11, weight: 600 };
export const LEAF_SUB_FONT: LabelFont = { size: 10, weight: 400 };

// Label chip metrics. The chip brings its own ground so a label never has to
// survive whatever section colour happens to lie under it.
export const CHIP_H = 17;

const FAMILY = "'Source Sans 3', system-ui, sans-serif";

const widths = new Map<string, number>();
let measureCtx: CanvasRenderingContext2D | null | undefined;

export function textWidth(text: string, font: LabelFont): number {
  const key = `${font.size}|${font.weight}|${font.tracking ?? 0}|${text}`;
  const hit = widths.get(key);
  if (hit !== undefined) return hit;

  if (measureCtx === undefined) {
    measureCtx =
      typeof document === 'undefined'
        ? null
        : document.createElement('canvas').getContext('2d');
  }
  const base = measureCtx
    ? ((measureCtx.font = `${font.weight} ${font.size}px ${FAMILY}`),
      measureCtx.measureText(text).width)
    : text.length * font.size * 0.58;
  const w = base + Math.max(0, text.length - 1) * font.size * (font.tracking ?? 0);
  widths.set(key, w);
  return w;
}

// The first candidate that fits, or null. Callers pass a cascade — full name,
// then short form — so a box too narrow for "Wholesale and retail trade of
// motor vehicles" says "Trade" rather than a truncation that identifies
// nothing.
export function fitLabel(
  candidates: Array<string | null | undefined>,
  maxWidth: number,
  font: LabelFont,
): string | null {
  for (const c of candidates) {
    if (c && textWidth(c, font) <= maxWidth) return c;
  }
  return null;
}

// Trim to fit with an ellipsis. Only for leaf labels, where the name is the
// point of the cell and a clipped one still identifies it; group labels use
// fitLabel and drop instead, because a truncated section name is worse than
// none.
export function truncate(text: string, maxWidth: number, font: LabelFont): string | null {
  if (textWidth(text, font) <= maxWidth) return text;
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (textWidth(`${text.slice(0, mid)}…`, font) <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  return lo >= 2 ? `${text.slice(0, lo).trimEnd()}…` : null;
}

// ── Contrast ─────────────────────────────────────────────────────────────
//
// A label sitting directly on a cell fill has to be legible against it, and the
// fills here run from the pale cream at the centre of the complexity ramp to
// the saturated Metroverse section hues. Relative luminance decides ink or
// paper rather than a per-section lookup that would need editing every time a
// colour moved.
//
// Both notations are accepted: lib/sectionPalette returns hex, while
// lib/colorScales interpolates and returns `rgb(r, g, b)`.

const channel = (c: number): number => {
  const u = c / 255;
  return u <= 0.04045 ? u / 12.92 : ((u + 0.055) / 1.055) ** 2.4;
};

export function parseColor(color: string): [number, number, number] {
  const rgb = color.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
  if (rgb) {
    return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  }
  const h = color.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return Number.isFinite(n) ? [(n >> 16) & 255, (n >> 8) & 255, n & 255] : [128, 128, 128];
}

export function luminance(color: string): number {
  const [r, g, b] = parseColor(color);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function inkOn(color: string): string {
  return luminance(color) > 0.42 ? '#1a1a1a' : '#ffffff';
}

// Blend two colours, in either notation, and return hex.
export function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = parseColor(a);
  const [r2, g2, b2] = parseColor(b);
  const c = (x: number, y: number) => Math.round(x + (y - x) * t);
  return `#${[c(r1, r2), c(g1, g2), c(b1, b2)]
    .map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0'))
    .join('')}`;
}
