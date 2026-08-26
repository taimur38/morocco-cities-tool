// One set of marks, four readings of it.
//
// A treemap of a city's employment, a ranking of its industries, a distribution
// of them and a scatter draw the same objects — one rectangle per industry —
// and the only thing that separates the four is where those rectangles are put
// and how round their corners are. This module computes the geometry for each
// reading; nothing here touches React or the DOM, so the four layouts can be
// diffed, tested and reasoned about as plain functions of (nodes, box).
//
// The module is shared with the Growth Lab cities tool and the Africa trade
// atlas, where the same readings are applied to metro employment by NAICS
// industry and to trade by HS product. The abstraction transfers because the
// underlying object is the same shape — a composition with a group level above
// a leaf level. Here the leaf is a CNSS industry, the group its NACE section,
// and the area measure is workers. The observation that makes it work at all: a
// <rect> whose rx is half its side is a circle, so a treemap cell, a bar and a
// scatter dot are one element in three states rather than three elements.
//
// The consequence worth stating, because it drives the whole design: the marks
// persist across a view change and the FURNITURE does not. Axes, tick labels,
// row names and section chips are computed per view and crossfaded, because a
// tick value tweened halfway to another tick value is a number that was never
// true. So each layout returns frames (tweened) and furniture (crossfaded), and
// the component keeps them in separate layers.
//
// One reading from the other two copies is absent here: the product-space map,
// which places each mark at fixed coordinates from a global co-export network.
// Nothing in this tool's parquets carries industry-space coordinates, so the
// view would have nothing to draw.

import { hierarchy, treemap, treemapSquarify } from 'd3-hierarchy';
import { forceSimulation, forceX, forceY, forceCollide } from 'd3-force';
import { niceTicks, median } from '../../lib/scales';
import { truncate, LEAF_FONT, GROUP_GUTTER, LEAF_HAIRLINE } from '../../lib/chartText';

export type MorphView = 'treemap' | 'bars' | 'beeswarm' | 'scatter';

// One mark. `key` is the identity that has to survive a view change — if it
// changes, the component unmounts the rectangle and remounts it somewhere else
// instead of moving it, which is exactly the effect this module exists to
// avoid. `value` is always the area metric (workers); everything else a view
// might position by comes through a MorphMetric.
export type MorphNode<T = unknown> = {
  key: string;
  name: string;
  short?: string;
  value: number;
  groupKey: string;
  groupName: string;
  groupShort?: string;
  groupColor: string;
  datum: T;
};

// Where one mark sits and what shape it is. `rx` at half the side turns the
// rect into a circle; the tween through intermediate rx is what makes a cell
// visibly become a dot rather than cut to one.
export type Frame = {
  x: number;
  y: number;
  w: number;
  h: number;
  rx: number;
  opacity: number;
  // Fraction of the move to wait before this mark starts, 0–1. Lets a view
  // order its own arrival — the ranked view lands its bars top-first, so the
  // transition reads as a sort rather than as fourteen things moving at once.
  delay?: number;
};

export type GroupFrame = {
  key: string;
  name: string;
  short?: string;
  color: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type Tick = { value: number; pos: number; label: string };

export type AxisSpec = {
  orient: 'x' | 'y';
  // The rule itself.
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  caption: string;
  captionX: number;
  captionY: number;
  ticks: Tick[];
};

// A named row beside a bar, with its value at the far end.
export type BarRow = {
  key: string;
  label: string;
  labelX: number;
  valueX: number;
  valueAnchor: 'start' | 'end';
  valueText: string;
  textY: number;
};

// A line the reader is meant to measure against — the national industry median,
// or a median that cuts a scatter into quadrants.
export type RefLine = {
  kind: 'x' | 'y';
  pos: number;
  from: number;
  to: number;
  label?: string;
  labelX?: number;
  labelY?: number;
  labelAnchor?: 'start' | 'middle' | 'end';
};

export type MorphLayout = {
  frames: Map<string, Frame>;
  groups: GroupFrame[];
  axes: AxisSpec[];
  rows: BarRow[];
  refs: RefLine[];
  // Set when a view can only show part of the data, so the chart can say so
  // rather than letting the reader assume they are looking at everything.
  omitted: number;
};

// How a view positions marks along its metric axis. Separating this from the
// views is what keeps "five colour modes × four views" from becoming twenty
// code paths: a view knows how to draw a metric, and a metric knows nothing
// about views.
export type MorphMetric<T = unknown> = {
  key: string;
  // Axis caption and, in the bar view, the caption under the bars.
  label: string;
  of: (n: MorphNode<T>) => number | null;
  format: (v: number) => string;
  // Positional scale is logarithmic. Values at or below zero are dropped from
  // the positional views rather than clamped, since a log axis has no place to
  // put them and clamping would pile them onto the left edge as if they shared
  // a value.
  log?: boolean;
  // Bars grow from here rather than from the domain's low end. Set to 0 for a
  // signed deviation like "% above the national industry median", where the
  // reading is "above or below the reference" and a bar starting at the minimum
  // would hide the sign.
  baseline?: number;
  // What the baseline is called, when it is worth naming on the chart.
  baselineLabel?: string;
  // Ascending puts the smallest first in the bar view. Default is descending.
  ascending?: boolean;
  // This metric IS the area measure the marks are sized by. The scatter puts
  // size on its y axis, so a metric that is also size would plot a quantity
  // against itself and draw a diagonal line; when this is set the scatter view
  // reads as a strip plot by section instead. See stripFrames.
  isSize?: boolean;
};

// ── Scales ───────────────────────────────────────────────────────────────
//
// Linear and log only, hand-rolled. d3-scale is in the tree as a transitive
// dependency of recharts, and depending on a package we do not declare is how
// a working build breaks on someone else's machine.

type Scale = (v: number) => number;

function scaleFor(
  domain: [number, number],
  range: [number, number],
  log: boolean,
): Scale {
  if (log) {
    const d0 = Math.log(Math.max(1e-9, domain[0]));
    const d1 = Math.log(Math.max(1e-9, domain[1]));
    const span = d1 - d0 || 1;
    return (v: number) =>
      range[0] + ((Math.log(Math.max(1e-9, v)) - d0) / span) * (range[1] - range[0]);
  }
  const span = domain[1] - domain[0] || 1;
  return (v: number) => range[0] + ((v - domain[0]) / span) * (range[1] - range[0]);
}

// 1-2-5 ticks per decade, which is the only tick set a log axis reads well at.
function logTicks(min: number, max: number, maxCount = 6): number[] {
  if (!(min > 0) || !(max > min)) return [];
  const out: number[] = [];
  const lo = Math.floor(Math.log10(min));
  const hi = Math.ceil(Math.log10(max));
  for (let e = lo; e <= hi; e++) {
    for (const m of [1, 2, 5]) {
      const v = m * 10 ** e;
      if (v >= min && v <= max) out.push(v);
    }
  }
  // Thin to decades, then to alternate decades, rather than crowding the rule.
  if (out.length <= maxCount) return out;
  const decades = out.filter((v) => Math.abs(Math.log10(v) % 1) < 1e-9);
  if (decades.length <= maxCount) return decades;
  return decades.filter((_, i) => i % Math.ceil(decades.length / maxCount) === 0);
}

// ── Shared box metrics ───────────────────────────────────────────────────

const AXIS_BOTTOM = 52; // room under the plot for the x rule, its ticks, its caption
const AXIS_LEFT = 46; // room left of the plot for a y rule and its ticks
const PAD = 10;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// ── Treemap ──────────────────────────────────────────────────────────────

/**
 * Section-grouped squarified treemap, separated by real padding.
 *
 * The two separations this chart draws — a gutter between NACE sections, a
 * hairline between industries inside one — are put into the LAYOUT here rather
 * than painted over it. Under recharts they had to be an overpaint: the tiling
 * was flush and the only way to show a gap was to stroke the group boundary in
 * white and let half the stroke fall either side. That worked while every cell
 * was a saturated section colour and failed the moment a cell was pale, because
 * a white stroke over a near-white fill is not a gap — which is exactly what
 * happened under the complexity and wage ramps, where the middle of the scale
 * is cream.
 *
 * Owning the layout removes the problem rather than tuning it: the space is
 * genuinely not allocated, so the ground shows through whatever the cells are
 * painted. d3's paddingInner is called with the PARENT, so depth 0 separates
 * the sections and depth 1 the industries within one.
 */
function treemapFrames<T>(
  nodes: MorphNode<T>[],
  W: number,
  H: number,
  grouped: boolean,
): MorphLayout {
  const frames = new Map<string, Frame>();
  const groups: GroupFrame[] = [];
  if (nodes.length === 0 || W <= 0 || H <= 0) {
    return { frames, groups, axes: [], rows: [], refs: [], omitted: 0 };
  }

  type HDatum = {
    node?: MorphNode<T>;
    group?: { key: string; name: string; short?: string; color: string };
    children?: HDatum[];
  };

  let rootDatum: HDatum;
  if (grouped) {
    const buckets = new Map<string, HDatum>();
    for (const n of nodes) {
      let b = buckets.get(n.groupKey);
      if (!b) {
        b = {
          group: {
            key: n.groupKey,
            name: n.groupName,
            short: n.groupShort,
            color: n.groupColor,
          },
          children: [],
        };
        buckets.set(n.groupKey, b);
      }
      b.children!.push({ node: n });
    }
    rootDatum = { children: Array.from(buckets.values()) };
  } else {
    rootDatum = { children: nodes.map((n) => ({ node: n })) };
  }

  const laid = treemap<HDatum>()
    .size([W, H])
    .tile(treemapSquarify)
    .paddingInner((node) => (node.depth === 0 ? GROUP_GUTTER : LEAF_HAIRLINE))
    .round(false)(
    hierarchy<HDatum>(rootDatum, (d) => d.children)
      .sum((d) => (d.node ? Math.max(0, d.node.value) : 0))
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0)),
  );

  for (const leaf of laid.leaves()) {
    const n = leaf.data.node;
    if (!n) continue;
    frames.set(n.key, {
      x: leaf.x0,
      y: leaf.y0,
      w: Math.max(0, leaf.x1 - leaf.x0),
      h: Math.max(0, leaf.y1 - leaf.y0),
      rx: 0,
      opacity: 1,
    });
  }

  if (grouped) {
    for (const g of laid.children ?? []) {
      const meta = g.data.group;
      if (!meta) continue;
      groups.push({
        ...meta,
        x: g.x0,
        y: g.y0,
        w: Math.max(0, g.x1 - g.x0),
        h: Math.max(0, g.y1 - g.y0),
      });
    }
  }

  return { frames, groups, axes: [], rows: [], refs: [], omitted: 0 };
}

// A mark this view cannot place. It keeps the geometry it already has and
// simply fades: shrinking a few hundred rectangles into their own centres at
// once reads as a collapse — an event in its own right — when the intended
// reading is that they are not part of THIS answer. Fading in place also means
// they are already in the right cell when the reader goes back to the treemap,
// so the return is a fade rather than an expansion out of nowhere.
function vanish<T>(
  nodes: MorphNode<T>[],
  keep: Set<string>,
  prev: Map<string, Frame>,
  W: number,
  H: number,
  frames: Map<string, Frame>,
): number {
  let gone = 0;
  for (const n of nodes) {
    if (keep.has(n.key)) continue;
    gone += 1;
    const p = prev.get(n.key);
    frames.set(
      n.key,
      p
        ? { ...p, opacity: 0, delay: undefined }
        : { x: W / 2, y: H / 2, w: 0, h: 0, rx: 0, opacity: 0 },
    );
  }
  return gone;
}

// ── Bars ─────────────────────────────────────────────────────────────────

/**
 * Ranked bars on the metric, names down the left.
 *
 * Two shapes, chosen by whether the metric declares a baseline:
 *
 *   from zero    the ordinary ranking. Bars start at the name gutter and run
 *                right; longest is largest. This is what a headcount gets.
 *   from a       a signed deviation — a wage against a median, a growth rate
 *   reference    against zero. Bars start at the value the metric calls
 *                neutral and run either way, so the sign of the comparison is
 *                the direction of the bar rather than something the reader has
 *                to recover from a colour.
 *
 * Marks that do not make the cut collapse and fade. They are not unmounted: the
 * reader flips back to the treemap and they have to be there, in the cell they
 * came from, having gone nowhere.
 */
function barFrames<T>(
  nodes: MorphNode<T>[],
  W: number,
  H: number,
  metric: MorphMetric<T>,
  topN: number,
  prev: Map<string, Frame>,
): MorphLayout {
  const frames = new Map<string, Frame>();
  const rows: BarRow[] = [];
  const refs: RefLine[] = [];

  const scored = nodes
    .map((n) => ({ n, v: metric.of(n) }))
    .filter((d): d is { n: MorphNode<T>; v: number } => d.v != null && Number.isFinite(d.v))
    .filter((d) => !metric.log || d.v > 0);
  scored.sort((a, b) => (metric.ascending ? a.v - b.v : b.v - a.v));

  const shown = scored.slice(0, topN);
  const omitted = nodes.length - shown.length;

  // Retire everything not shown first, so a key that appears in neither list
  // (a null metric) still gets a frame and does not jump.
  const shownKeys = new Set(shown.map((d) => d.n.key));
  vanish(nodes, shownKeys, prev, W, H, frames);

  if (shown.length === 0 || W <= 0 || H <= 0) {
    return { frames, groups: [], axes: [], rows, refs, omitted };
  }

  // The name gutter takes a third of the box, bounded so a narrow container
  // does not leave the bars nothing and a wide one does not leave the names an
  // acre. Names are truncated to it rather than allowed to collide with the
  // bars, which is the failure the fixed-width version of this had.
  const gutter = clamp(W * 0.34, 110, 320);
  const valueRoom = 62;
  const plotL = gutter + 8;
  const plotR = Math.max(plotL + 20, W - valueRoom);

  const values = shown.map((d) => d.v);
  const lo = Math.min(...values);
  const hi = Math.max(...values);

  // Bar length is a quantity, and a quantity read off a log axis is not one:
  // on a log scale from the smallest value shown, the smallest bar is zero
  // long and the ratio between any two bars is whatever the domain happened to
  // be. So a ranking from zero is always linear, whatever the metric says —
  // `log` is a statement about where a value belongs on an AXIS, which is the
  // beeswarm's and the scatter's question, not this one's.
  //
  // The exception is a bar that starts at a baseline, where the length is a
  // displacement rather than a quantity. For a ratio against a reference the
  // displacement is multiplicative, and log is what makes 2x and 1/2x the same
  // distance either side of the line.
  const barLog = metric.baseline != null && !!metric.log;

  let domain: [number, number];
  if (metric.baseline != null) {
    // Symmetric about the baseline, so a gain and a loss of the same size are
    // the same distance from the line and the reader can compare them by eye.
    if (barLog) {
      const b = Math.log(metric.baseline);
      const reach = Math.max(
        Math.abs(Math.log(Math.max(1e-9, hi)) - b),
        Math.abs(Math.log(Math.max(1e-9, lo)) - b),
        Math.log(1.25),
      );
      domain = [Math.exp(b - reach), Math.exp(b + reach)];
    } else {
      const reach = Math.max(Math.abs(hi - metric.baseline), Math.abs(lo - metric.baseline), 1e-6);
      domain = [metric.baseline - reach, metric.baseline + reach];
    }
  } else {
    // Zero-anchored unless the data straddles zero, in which case the axis has
    // to carry both signs.
    domain = [Math.min(0, lo), Math.max(0, hi)];
    if (domain[0] === domain[1]) domain = [0, domain[1] || 1];
  }

  const x = scaleFor(domain, [plotL, plotR], barLog);
  const zeroAt = metric.baseline != null ? x(metric.baseline) : x(domain[0]);

  const captionRoom = 26;
  const rowH = (H - captionRoom) / shown.length;
  const barH = clamp(rowH - 6, 3, 26);

  shown.forEach((d, i) => {
    const cx = x(d.v);
    const yTop = i * rowH + (rowH - barH) / 2;
    const x0 = Math.min(zeroAt, cx);
    const x1 = Math.max(zeroAt, cx);
    frames.set(d.n.key, {
      x: x0,
      y: yTop,
      w: Math.max(1.5, x1 - x0),
      h: barH,
      rx: Math.min(2, barH / 2),
      opacity: 1,
      // Land top-first. A ranking is an ordered claim and arriving in that
      // order says so; arriving together is fourteen rectangles crossing paths.
      delay: shown.length > 1 ? 0.06 + 0.24 * (i / (shown.length - 1)) : 0,
    });

    const textY = yTop + barH / 2 + 4;
    const label =
      truncate(d.n.name, gutter - 12, LEAF_FONT) ??
      truncate(d.n.short ?? d.n.name, gutter - 12, LEAF_FONT) ??
      '';
    // The value sits past the far end of the bar, on whichever side that is.
    const rightward = cx >= zeroAt;
    rows.push({
      key: d.n.key,
      label,
      labelX: gutter,
      valueX: rightward ? x1 + 6 : x0 - 6,
      valueAnchor: rightward ? 'start' : 'end',
      valueText: metric.format(d.v),
      textY,
    });
  });

  const bottom = shown.length * rowH;
  if (metric.baseline != null) {
    refs.push({
      kind: 'x',
      pos: zeroAt,
      from: 0,
      to: bottom,
      label: metric.baselineLabel,
      labelX: zeroAt,
      labelY: bottom + 16,
      labelAnchor: 'middle',
    });
  }

  const axes: AxisSpec[] = [
    {
      orient: 'x',
      x1: plotL,
      y1: bottom + 2,
      x2: plotR,
      y2: bottom + 2,
      caption: metric.label,
      captionX: plotL,
      captionY: bottom + 18,
      ticks: [],
    },
  ];

  return { frames, groups: [], axes, rows, refs, omitted };
}

// ── Beeswarm ─────────────────────────────────────────────────────────────

/**
 * Every mark on one axis, sized by employment, collision-resolved into a band.
 *
 * This is the view that answers "where does the whole city sit on this" without
 * throwing away how big each industry is, which is the question a ranked bar
 * chart cannot answer and a treemap can only answer by colour. The simulation
 * runs to completion synchronously — 220 ticks is past settling for a few
 * hundred nodes — because the marks are tweened into place afterwards, and a
 * live simulation underneath a tween would fight it.
 */
function beeswarmFrames<T>(
  nodes: MorphNode<T>[],
  W: number,
  H: number,
  metric: MorphMetric<T>,
  prev: Map<string, Frame>,
): MorphLayout {
  const frames = new Map<string, Frame>();

  const scored = nodes
    .map((n) => ({ n, v: metric.of(n) }))
    .filter((d): d is { n: MorphNode<T>; v: number } => d.v != null && Number.isFinite(d.v))
    .filter((d) => !metric.log || d.v > 0);
  const omitted = nodes.length - scored.length;

  vanish(nodes, new Set(scored.map((d) => d.n.key)), prev, W, H, frames);

  if (scored.length === 0 || W <= 0 || H <= 0) {
    return { frames, groups: [], axes: [], rows: [], refs: [], omitted };
  }

  const plotL = PAD + 26;
  const plotR = W - PAD - 8;
  const plotB = H - AXIS_BOTTOM;
  const midY = plotB * 0.5;

  const values = scored.map((d) => d.v);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const domain: [number, number] =
    metric.log ? [Math.max(1e-9, lo), Math.max(hi, lo * 1.0001)] : [lo, hi > lo ? hi : lo + 1];
  const x = scaleFor(domain, [plotL, plotR], !!metric.log);

  // Radius from area, not from a fixed maximum: the dots should cover about a
  // third of the plot however many there are and however large the container
  // is, which is what keeps the swarm legible on a phone and on a wall.
  const totalValue = scored.reduce((s, d) => s + Math.max(0, d.n.value), 0) || 1;
  const k = Math.sqrt((0.32 * (plotR - plotL) * plotB) / (Math.PI * totalValue));
  const rOf = (v: number) => clamp(k * Math.sqrt(Math.max(0, v)), 1.6, Math.min(38, plotB / 6));

  type Sim = { key: string; x: number; y: number; r: number; tx: number };
  const sim: Sim[] = scored.map((d) => ({
    key: d.n.key,
    x: x(d.v),
    y: midY,
    r: rOf(d.n.value),
    tx: x(d.v),
  }));

  forceSimulation(sim as unknown as Array<{ x: number; y: number }>)
    .force('x', forceX<Sim>((d) => d.tx).strength(1))
    .force('y', forceY<Sim>(midY).strength(0.08))
    .force('collide', forceCollide<Sim>((d) => d.r + 0.6))
    .stop()
    .tick(220);

  // No dot may leave the sheet. Pinning centres a radius inside every edge is
  // cheaper than re-running the simulation with walls, and at this density the
  // few that need it are on the extremes where a pixel of drift is invisible.
  // The bound is the box, not the plot: a large circle centred on the last tick
  // legitimately reaches past it, and clipping it would understate the very
  // industries the view exists to show.
  for (const s of sim) {
    s.x = clamp(s.x, s.r + 1, W - s.r - 1);
    s.y = clamp(s.y, s.r + 2, plotB - s.r - 2);
    frames.set(s.key, {
      x: s.x - s.r,
      y: s.y - s.r,
      w: s.r * 2,
      h: s.r * 2,
      rx: s.r,
      opacity: 1,
    });
  }

  const ticks = (metric.log ? logTicks(domain[0], domain[1]) : niceTicks(domain[0], domain[1], 6))
    .map((v) => ({ value: v, pos: x(v), label: metric.format(v) }));

  const axes: AxisSpec[] = [
    {
      orient: 'x',
      x1: PAD,
      y1: plotB + 8,
      x2: W - PAD,
      y2: plotB + 8,
      caption: metric.label,
      captionX: (plotL + plotR) / 2,
      captionY: plotB + 44,
      ticks,
    },
  ];

  const refs: RefLine[] = [];
  if (metric.baseline != null && metric.baseline > domain[0] && metric.baseline < domain[1]) {
    refs.push({
      kind: 'x',
      pos: x(metric.baseline),
      from: 0,
      to: plotB,
      label: metric.baselineLabel,
      labelX: x(metric.baseline),
      labelY: 14,
      labelAnchor: 'middle',
    });
  }

  return { frames, groups: [], axes, rows: [], refs, omitted };
}

// ── Scatter ──────────────────────────────────────────────────────────────

/**
 * The metric against size, cut into quadrants at the two medians.
 *
 * Employment moves from area to the y axis here, which is the trade this view
 * makes: it gives up the "all of it adds to the whole" reading a treemap has,
 * and buys the ability to say "big AND complex" — a conjunction a treemap can
 * only gesture at with colour. The median lines are what make the corner
 * readable as a corner rather than as a general drift.
 */
function scatterFrames<T>(
  nodes: MorphNode<T>[],
  W: number,
  H: number,
  metric: MorphMetric<T>,
  sizeLabel: string,
  prev: Map<string, Frame>,
): MorphLayout {
  const frames = new Map<string, Frame>();

  const scored = nodes
    .map((n) => ({ n, v: metric.of(n) }))
    .filter((d): d is { n: MorphNode<T>; v: number } => d.v != null && Number.isFinite(d.v))
    .filter((d) => !metric.log || d.v > 0)
    .filter((d) => d.n.value > 0);
  const omitted = nodes.length - scored.length;

  vanish(nodes, new Set(scored.map((d) => d.n.key)), prev, W, H, frames);

  if (scored.length === 0 || W <= 0 || H <= 0) {
    return { frames, groups: [], axes: [], rows: [], refs: [], omitted };
  }

  const plotL = AXIS_LEFT;
  const plotR = W - PAD - 8;
  const plotT = PAD + 6;
  const plotB = H - AXIS_BOTTOM;

  const xs = scored.map((d) => d.v);
  const ys = scored.map((d) => d.n.value);
  const xDom: [number, number] = metric.log
    ? [Math.max(1e-9, Math.min(...xs)), Math.max(...xs)]
    : [Math.min(...xs), Math.max(...xs)];
  const yDom: [number, number] = [Math.max(1, Math.min(...ys)), Math.max(...ys)];
  const R = clamp(
    Math.sqrt(((plotR - plotL) * (plotB - plotT)) / (scored.length * Math.PI)) * 0.55,
    2.5,
    9,
  );
  // Inset by a radius at both ends: the extremes are the point of this view, and
  // an industry at the top of the complexity range should read as the most
  // complex rather than as a half-circle cut off by the frame.
  const x = scaleFor(xDom, [plotL + 8 + R, plotR - R], !!metric.log);
  // Workers on a log axis: within a city the distribution runs over three or
  // four orders of magnitude, and a linear one puts every industry but the
  // largest handful on the floor.
  const y = scaleFor(yDom, [plotB - 6 - R, plotT + R], true);

  for (const d of scored) {
    frames.set(d.n.key, {
      x: x(d.v) - R,
      y: y(Math.max(1, d.n.value)) - R,
      w: R * 2,
      h: R * 2,
      rx: R,
      opacity: 1,
    });
  }

  const axes: AxisSpec[] = [
    {
      orient: 'x',
      x1: plotL,
      y1: plotB,
      x2: plotR,
      y2: plotB,
      caption: metric.label,
      captionX: (plotL + plotR) / 2,
      captionY: plotB + 42,
      ticks: (metric.log ? logTicks(xDom[0], xDom[1]) : niceTicks(xDom[0], xDom[1], 6)).map((v) => ({
        value: v,
        pos: x(v),
        label: metric.format(v),
      })),
    },
    {
      orient: 'y',
      x1: plotL,
      y1: plotT,
      x2: plotL,
      y2: plotB,
      caption: sizeLabel,
      captionX: plotL - 34,
      captionY: (plotT + plotB) / 2,
      ticks: logTicks(yDom[0], yDom[1], 5).map((v) => ({
        value: v,
        pos: y(v),
        label: compactNumber(v),
      })),
    },
  ];

  const refs: RefLine[] = [];
  const mx = metric.baseline ?? median(xs);
  const my = median(ys);
  if (mx != null && Number.isFinite(mx)) {
    refs.push({
      kind: 'x',
      pos: x(mx),
      from: plotT,
      to: plotB,
      label: metric.baseline != null ? metric.baselineLabel : undefined,
      labelX: x(mx),
      labelY: plotT - 2,
      labelAnchor: 'middle',
    });
  }
  if (my != null && Number.isFinite(my)) {
    refs.push({ kind: 'y', pos: y(my), from: plotL, to: plotR });
  }

  return { frames, groups: [], axes, rows: [], refs, omitted };
}

function compactNumber(v: number): string {
  if (v >= 1e6) return `${(v / 1e6).toFixed(v >= 1e7 ? 0 : 1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(v >= 1e4 ? 0 : 1)}k`;
  return String(Math.round(v));
}

// ── Strip plot ───────────────────────────────────────────────────────────

/**
 * A row per section, marks laid along the metric axis within it.
 *
 * This is what the scatter becomes when the metric IS the size measure.
 * Workers against workers is a diagonal line and says nothing; workers against
 * SECTION says something the treemap cannot — whether a section is a few large
 * employers or many small ones. Two sections with the same total area are the
 * same rectangle on a treemap and completely different rows here.
 *
 * Vertical placement inside a row is a hash of the key rather than a random
 * jitter, so a mark sits in the same place every time the view is opened. A
 * jitter that moved on each render would read as data.
 */
function stripFrames<T>(
  nodes: MorphNode<T>[],
  W: number,
  H: number,
  metric: MorphMetric<T>,
  prev: Map<string, Frame>,
): MorphLayout {
  const frames = new Map<string, Frame>();

  const scored = nodes
    .map((n) => ({ n, v: metric.of(n) }))
    .filter((d): d is { n: MorphNode<T>; v: number } => d.v != null && Number.isFinite(d.v))
    .filter((d) => !metric.log || d.v > 0);
  const omitted = nodes.length - scored.length;

  vanish(nodes, new Set(scored.map((d) => d.n.key)), prev, W, H, frames);
  if (scored.length === 0 || W <= 0 || H <= 0) {
    return { frames, groups: [], axes: [], rows: [], refs: [], omitted };
  }

  // Sections ordered by total size, so the row order is the treemap's reading
  // order and the eye can follow a section from one view to the other.
  const totals = new Map<string, number>();
  for (const d of scored) {
    totals.set(d.n.groupKey, (totals.get(d.n.groupKey) ?? 0) + Math.max(0, d.n.value));
  }
  const order = Array.from(totals.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k);
  const rowOf = new Map(order.map((k, i) => [k, i]));
  const labelOf = new Map<string, { name: string; short?: string }>();
  for (const d of scored) {
    if (!labelOf.has(d.n.groupKey)) {
      labelOf.set(d.n.groupKey, { name: d.n.groupName, short: d.n.groupShort });
    }
  }

  const gutter = clamp(W * 0.2, 88, 190);
  const plotL = gutter + 10;
  const plotR = W - PAD - 8;
  const plotB = H - AXIS_BOTTOM;
  const rowH = plotB / Math.max(1, order.length);
  const R = clamp(rowH * 0.16, 2, 7);

  const values = scored.map((d) => d.v);
  const domain: [number, number] = [Math.max(1e-9, Math.min(...values)), Math.max(...values)];
  const x = scaleFor(domain, [plotL + R, plotR - R], !!metric.log);

  const jitter = (key: string) => {
    let h = 2166136261;
    for (const c of key) {
      h ^= c.charCodeAt(0);
      h = Math.imul(h, 16777619);
    }
    return ((h >>> 0) % 1000) / 1000 - 0.5;
  };

  for (const d of scored) {
    const row = rowOf.get(d.n.groupKey) ?? 0;
    const cy = row * rowH + rowH / 2 + jitter(d.n.key) * (rowH - R * 2.6);
    frames.set(d.n.key, {
      x: x(d.v) - R,
      y: cy - R,
      w: R * 2,
      h: R * 2,
      rx: R,
      opacity: 1,
    });
  }

  const rows: BarRow[] = order.map((k, i) => {
    const meta = labelOf.get(k);
    const name = meta?.name ?? k;
    return {
      key: `strip-${k}`,
      label:
        truncate(name, gutter - 8, LEAF_FONT) ??
        truncate(meta?.short ?? name, gutter - 8, LEAF_FONT) ??
        '',
      labelX: gutter,
      valueX: gutter,
      valueAnchor: 'end',
      valueText: '',
      textY: i * rowH + rowH / 2 + 4,
    };
  });

  const axes: AxisSpec[] = [
    {
      orient: 'x',
      x1: plotL,
      y1: plotB + 6,
      x2: plotR,
      y2: plotB + 6,
      caption: metric.label,
      captionX: (plotL + plotR) / 2,
      captionY: plotB + 42,
      ticks: (metric.log ? logTicks(domain[0], domain[1]) : niceTicks(domain[0], domain[1], 6)).map(
        (v) => ({ value: v, pos: x(v), label: metric.format(v) }),
      ),
    },
  ];

  return { frames, groups: [], axes, rows, refs: [], omitted };
}

// ── Entry point ──────────────────────────────────────────────────────────

export type LayoutOptions<T> = {
  view: MorphView;
  nodes: MorphNode<T>[];
  width: number;
  height: number;
  metric: MorphMetric<T>;
  // Two-level (section → industry) or one (section as leaf).
  grouped: boolean;
  // Bar view only. Rows past this collapse and fade.
  topN?: number;
  // What the area metric is called, for the scatter's y axis.
  sizeLabel?: string;
  // The frames the marks currently hold. Used to send a mark that this view
  // cannot place back into its own centre rather than to the middle of the box,
  // so it shrinks in place instead of sliding across the chart to vanish.
  prev?: Map<string, Frame>;
};

export function computeLayout<T>(opts: LayoutOptions<T>): MorphLayout {
  const { view, nodes, width, height, metric, grouped } = opts;
  const prev = opts.prev ?? new Map<string, Frame>();
  switch (view) {
    case 'bars':
      return barFrames(nodes, width, height, metric, opts.topN ?? 14, prev);
    case 'beeswarm':
      return beeswarmFrames(nodes, width, height, metric, prev);
    case 'scatter':
      return metric.isSize && grouped
        ? stripFrames(nodes, width, height, metric, prev)
        : scatterFrames(nodes, width, height, metric, opts.sizeLabel ?? 'size', prev);
    case 'treemap':
    default:
      return treemapFrames(nodes, width, height, grouped);
  }
}
