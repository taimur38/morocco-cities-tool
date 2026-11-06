import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  computeLayout,
  type Frame,
  type MorphMetric,
  type MorphNode,
  type MorphView,
} from './morphLayout';
import { GroupChrome, LeafLabel, chipBox, LEAF_FONT, LEAF_SUB_FONT } from './treemapChrome';

// A city's industrial composition drawn four ways, on marks that persist
// between them.
//
// The whole component rests on one observation: the rectangle that is a treemap
// cell, the rectangle that is a bar, and the circle that is a scatter dot are
// the same element. An SVG rect with rx equal to half its side renders as a
// circle, so moving between the readings is a tween of five numbers (x, y,
// width, height, rx) on marks that never unmount. That is what makes the change
// legible as a change: the reader watches the industry they were looking at
// travel from its cell to its place on the axis, and so learns that the two
// pictures are of the same thing.
//
// The layering follows from that:
//
//   marks      one <rect> per node, keyed by a stable identity, always mounted.
//              Geometry tweens.
//   furniture  axes, ticks, section chips, row names — computed per view and
//              CROSSFADED, never tweened. A tick label interpolated halfway
//              between 100 and 1,000 reads as a number that was never true, and
//              a section chip has no meaningful position on a scatter.
//
// React renders the marks; an effect tweens them. The geometry is deliberately
// not React state: Casablanca's CNSS base is several hundred industries, and
// driving five animated numbers each through a component-per-mark animation
// library would mean thousands of value subscriptions and hundreds of extra
// component instances live for every frame of a transition. One rAF loop
// writing attributes is what d3.transition does, and it is what keeps this
// smooth at this many marks.
//
// The furniture is swapped rather than crossfaded, and held in its own state.
// A crossfade wants both the outgoing and the incoming set mounted at once,
// which means an exit animation has to complete before the old one is removed —
// and an exit that does not complete (a tab hidden mid-transition, a second
// view change on top of the first) leaves a stale axis painted over the new
// one. Fading the single layer out, swapping its contents while it is
// invisible, and fading it back in cannot get stuck: the worst case is that the
// swap happens with the layer already at zero.
//
// Responsiveness is a real reflow rather than a scaled viewBox: the container
// is measured in pixels and the layout is recomputed at that size, so an 11px
// label is 11px in a sidebar and 11px on a wall. A resize snaps rather than
// tweening — dragging a window edge should not launch a 950ms glide on every
// frame — while every change the reader actually asked for animates.

export type { MorphNode, MorphMetric, MorphView } from './morphLayout';

// Chart ink, mirroring the tokens in styles.css. Kept as literals because these
// are SVG presentation attributes rather than CSS properties, so a var() would
// not resolve on every one of them.
const INK = {
  rule: '#c8c8c2', // --rule
  tick: '#6b6b6b', // --muted
  caption: '#555',
  ref: '#999',
  row: '#1a1a1a', // --fg
};

// The furniture's two beats. Out is quick — nothing is being read while it
// leaves — and in is timed to land with the marks, so the axis appears under
// dots that have arrived rather than over cells that are still a treemap.
export const FURNITURE_OUT_MS = 200;
export const FURNITURE_IN_MS = 300;

// Long enough to read as travel rather than a cut. Below ~700ms the eye loses
// individual cells in the crowd; above ~1.2s the reader has already looked away.
export const MOVE_MS = 950;

// d3.easeCubicInOut, which is what the marks are tweened with. Slow at both
// ends so a cell's departure and its arrival are both readable, and quick
// through the middle where nothing is being read anyway.
export const easeCubicInOut = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// The one thing this component needs from an animation library, so it does not
// take one. Reading the query once at mount would miss a reader who changes the
// setting with the page open, hence the listener.
export function usePrefersReducedMotion(): boolean {
  const [reduce, setReduce] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true,
  );
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    const onChange = () => setReduce(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduce;
}

function paint(el: SVGRectElement, f: Frame) {
  el.setAttribute('x', String(f.x));
  el.setAttribute('y', String(f.y));
  el.setAttribute('width', String(Math.max(0, f.w)));
  el.setAttribute('height', String(Math.max(0, f.h)));
  el.setAttribute('rx', String(Math.max(0, f.rx)));
  el.setAttribute('opacity', String(f.opacity));
  // A collapsed mark must not keep swallowing hovers where it used to be.
  el.setAttribute('pointer-events', f.opacity > 0.05 ? 'auto' : 'none');
}

type Hover = { key: string; x: number; y: number } | null;

export type MorphTreemapProps<T> = {
  nodes: MorphNode<T>[];
  view: MorphView;
  /** Positions the marks in every view but the treemap. */
  metric: MorphMetric<T>;
  /** Final paint for a mark, fade included. The component stays ignorant of
   *  what a colour mode or an emphasis means. */
  fillOf: (n: MorphNode<T>) => string;
  /** Two levels (section → industry) or one (the section IS the leaf). */
  grouped?: boolean;
  /** Bar view only: rows past this collapse into their own centre and fade. */
  topN?: number;
  /** What the area metric is called, for the scatter's y axis. */
  sizeLabel?: string;
  /** Label cells in the treemap view. */
  leafLabels?: boolean;
  leafSub?: (n: MorphNode<T>) => string | undefined;
  renderTooltip?: (n: MorphNode<T>) => ReactNode;
  /** Section chips over the cells in the treemap view. Off where the sections
   *  are not a reading the chart makes. */
  groupChrome?: boolean;
  /** Told what a view had to leave out, so a top-N ranking does not read as the
   *  whole city. */
  onOmitted?: (n: number) => void;
  /** Clicking a mark. */
  onSelect?: (n: MorphNode<T>) => void;
};

export default function MorphTreemap<T>({
  nodes,
  view,
  metric,
  fillOf,
  grouped = true,
  topN = 14,
  sizeLabel = 'workers',
  leafLabels = false,
  leafSub,
  renderTooltip,
  groupChrome = true,
  onOmitted,
  onSelect,
}: MorphTreemapProps<T>) {
  const reduce = usePrefersReducedMotion();
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [hover, setHover] = useState<Hover>(null);

  // Measured synchronously first, then observed. The observer alone would be
  // enough on a visible tab, but its first callback is delivered on a rendering
  // opportunity — which a background tab does not get. Mounting there (a
  // restored session, a page opened in a new tab) would leave the chart blank
  // until the reader looked at it. Reading the box directly at layout time
  // means the marks are already placed by first paint, and the observer only
  // has to carry changes from there.
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = (width: number, height: number) =>
      setBox((prev) =>
        Math.abs(prev.w - width) < 0.5 && Math.abs(prev.h - height) < 0.5
          ? prev
          : { w: width, h: height },
      );

    const r = el.getBoundingClientRect();
    measure(r.width, r.height);

    const ro = new ResizeObserver((entries) => {
      for (const e of entries) measure(e.contentRect.width, e.contentRect.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Where the marks currently are. A view that cannot place a mark sends it
  // back into its own centre to shrink away, rather than to the middle of the
  // box — otherwise every dropped industry slides across the chart to die in a
  // heap, which reads as a movement that means something.
  const prevRef = useRef<Map<string, Frame>>(new Map());
  const layout = useMemo(
    () =>
      computeLayout<T>({
        view,
        nodes,
        width: box.w,
        height: box.h,
        metric,
        grouped,
        topN,
        sizeLabel,
        prev: prevRef.current,
      }),
    [view, nodes, box.w, box.h, metric, grouped, topN, sizeLabel],
  );
  useEffect(() => {
    prevRef.current = layout.frames;
  }, [layout]);

  useEffect(() => {
    onOmitted?.(layout.omitted);
  }, [layout, onOmitted]);

  // ── The tween ──────────────────────────────────────────────────────────
  const marks = useRef(new Map<string, SVGRectElement>());
  const held = useRef(new Map<string, Frame>()); // what is on screen right now
  const lastBox = useRef({ w: 0, h: 0 });
  const raf = useRef(0);

  useLayoutEffect(() => {
    cancelAnimationFrame(raf.current);
    const target = layout.frames;
    // A resize is not a statement, so it lands rather than glides. Everything
    // the reader asked for — a view, a colour mode — animates.
    const resized = lastBox.current.w !== box.w || lastBox.current.h !== box.h;
    lastBox.current = { w: box.w, h: box.h };
    const ms = reduce || resized ? 0 : MOVE_MS;

    // Where each mark travels FROM. A mark that is currently invisible has no
    // position the reader can have been looking at, so it is teleported to its
    // destination and only fades in — otherwise an industry dropped by the
    // ranked view would slide back across the whole chart from wherever it
    // happened to be parked, which reads as a movement that means something.
    const from = new Map<string, Frame>();
    for (const [key, to] of target) {
      const h = held.current.get(key);
      if (!h) continue;
      from.set(key, h.opacity <= 0.02 && to.opacity > 0.02 ? { ...to, opacity: h.opacity } : h);
    }

    const apply = (t: number) => {
      for (const [key, to] of target) {
        const el = marks.current.get(key);
        if (!el) continue;
        const a = from.get(key);
        if (!a || t >= 1) {
          held.current.set(key, to);
          paint(el, to);
          continue;
        }
        const d = to.delay ?? 0;
        const e = easeCubicInOut(Math.min(1, Math.max(0, (t - d) / (1 - d))));
        const f: Frame = {
          x: lerp(a.x, to.x, e),
          y: lerp(a.y, to.y, e),
          w: lerp(a.w, to.w, e),
          h: lerp(a.h, to.h, e),
          rx: lerp(a.rx, to.rx, e),
          opacity: lerp(a.opacity, to.opacity, e),
        };
        held.current.set(key, f);
        paint(el, f);
      }
    };

    if (ms <= 0) {
      apply(1);
      return;
    }
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      apply(t);
      if (t < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [layout, box.w, box.h, reduce]);

  const byKey = useMemo(() => new Map(nodes.map((n) => [n.key, n])), [nodes]);
  const hovered = hover ? byKey.get(hover.key) : null;

  // ── The furniture ──────────────────────────────────────────────────────
  //
  // Held one step behind the marks: the reading it describes is `shown.view`,
  // not `view`, so while a transition is in flight the labels on screen still
  // belong to the picture the reader was looking at rather than to the one
  // arriving under them.
  //
  // A recolour is not a new reading. The treemap's furniture is section chips,
  // which say nothing about the metric, so changing "Color by" must not blink
  // them out and back. Every other view puts the metric on an axis, so there
  // the metric IS part of what the furniture says.
  const viewKey = view === 'treemap' ? 'treemap' : `${view}-${metric.key}`;
  const [shown, setShown] = useState({ view, layout, key: viewKey });
  const [furnitureOn, setFurnitureOn] = useState(true);
  const shownKey = useRef(viewKey);

  useEffect(() => {
    if (shownKey.current === viewKey) {
      // Same reading, new numbers — a city, a resize. Nothing to announce, so
      // the labels follow the marks without a blink.
      setShown({ view, layout, key: viewKey });
      return;
    }
    shownKey.current = viewKey;
    if (reduce) {
      setShown({ view, layout, key: viewKey });
      return;
    }
    setFurnitureOn(false);
    const t = window.setTimeout(() => {
      setShown({ view, layout, key: viewKey });
      setFurnitureOn(true);
    }, FURNITURE_OUT_MS);
    return () => window.clearTimeout(t);
  }, [layout, viewKey, view, reduce]);

  // How far each leaf label has to drop to clear its section's chip. Computed
  // from the furniture that is actually on screen (`shown`), not from the
  // layout being tweened to, so the offset matches the chip the reader can see.
  const chipInsets = useMemo(() => {
    const out = new Map<string, number>();
    if (shown.view !== 'treemap' || !leafLabels || !groupChrome) return out;
    for (const g of shown.layout.groups) {
      const chip = chipBox([g.name, g.short], g.w, g.h);
      if (!chip) continue;
      for (const n of nodes) {
        if (n.groupKey !== g.key) continue;
        const f = shown.layout.frames.get(n.key);
        if (!f) continue;
        const overlaps =
          f.x < g.x + chip.w && f.x + f.w > g.x && f.y < g.y + chip.h && f.y + f.h > g.y;
        if (overlaps) out.set(n.key, chip.h + 2);
      }
    }
    return out;
  }, [shown, nodes, leafLabels, groupChrome]);

  const ready = box.w > 0 && box.h > 0;

  return (
    <div ref={wrapRef} className="morph-chart">
      {ready && (
        <svg
          width={box.w}
          height={box.h}
          onMouseLeave={() => setHover(null)}
          style={{ display: 'block', overflow: 'visible' }}
        >
          {/* ── Marks ──────────────────────────────────────────────────── */}
          <g>
            {nodes.map((n) => (
              <rect
                key={n.key}
                ref={(el) => {
                  if (el) marks.current.set(n.key, el);
                  else marks.current.delete(n.key);
                }}
                fill={fillOf(n)}
                stroke="none"
                style={{ transition: 'fill 0.7s ease', cursor: onSelect ? 'pointer' : undefined }}
                onMouseMove={(e) => {
                  const r = wrapRef.current?.getBoundingClientRect();
                  if (!r) return;
                  setHover({ key: n.key, x: e.clientX - r.left, y: e.clientY - r.top });
                }}
                onMouseLeave={() => setHover((h) => (h?.key === n.key ? null : h))}
                onClick={onSelect ? () => onSelect(n) : undefined}
              />
            ))}
          </g>

          {/* ── Furniture ──────────────────────────────────────────────── */}
          <g
            style={{
              pointerEvents: 'none',
              opacity: furnitureOn ? 1 : 0,
              transition: reduce
                ? 'none'
                : furnitureOn
                  ? `opacity ${FURNITURE_IN_MS}ms ease ${MOVE_MS * 0.7 - FURNITURE_OUT_MS}ms`
                  : `opacity ${FURNITURE_OUT_MS}ms ease`,
            }}
          >
            {shown.view === 'treemap' &&
              groupChrome &&
              shown.layout.groups.map((g) => (
                <GroupChrome
                  key={g.key}
                  x={g.x}
                  y={g.y}
                  width={g.w}
                  height={g.h}
                  color={g.color}
                  names={[g.name, g.short]}
                  gutter={0}
                />
              ))}

            {shown.view === 'treemap' &&
              leafLabels &&
              nodes.map((n) => {
                const f = shown.layout.frames.get(n.key);
                if (!f || f.w <= 0 || f.h <= 0) return null;
                // No gutter to carve: the layout has already left the space
                // between cells unallocated, so the label sits on the cell it
                // belongs to and nothing has to be painted back over it.
                //
                // The section chip is a different matter. It is drawn over the
                // cells, in the section's top-left corner, which is exactly
                // where the largest cell in the section is and therefore where
                // a leaf label most wants to be. Any leaf whose corner falls
                // under the chip starts its label below it instead.
                const inset = chipInsets.get(n.key) ?? 0;
                return (
                  <LeafLabel
                    key={`lab-${n.key}`}
                    x={f.x}
                    y={f.y}
                    width={f.w}
                    height={f.h}
                    names={[n.name, n.short]}
                    sub={leafSub?.(n)}
                    fill={fillOf(n)}
                    inset={inset}
                  />
                );
              })}

            {/* Reference lines: the neutral point on a deviation, medians on a
                scatter. */}
            {shown.layout.refs.map((r, i) => (
              <g key={`ref-${i}`}>
                <line
                  x1={r.kind === 'x' ? r.pos : r.from}
                  x2={r.kind === 'x' ? r.pos : r.to}
                  y1={r.kind === 'x' ? r.from : r.pos}
                  y2={r.kind === 'x' ? r.to : r.pos}
                  stroke={INK.ref}
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
                {r.label && (
                  <text
                    x={r.labelX}
                    y={r.labelY}
                    textAnchor={r.labelAnchor ?? 'middle'}
                    fontSize={10}
                    fill={INK.tick}
                    stroke="none"
                  >
                    {r.label}
                  </text>
                )}
              </g>
            ))}

            {shown.layout.axes.map((a) => (
              <g key={`${a.orient}-${a.caption}`}>
                <line x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2} stroke={INK.rule} strokeWidth={1} />
                {a.ticks.map((t) => (
                  <text
                    key={t.value}
                    x={a.orient === 'x' ? t.pos : a.x1 - 6}
                    y={a.orient === 'x' ? a.y1 + 14 : t.pos + 3.5}
                    textAnchor={a.orient === 'x' ? 'middle' : 'end'}
                    fontSize={10}
                    fill={INK.tick}
                    stroke="none"
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {t.label}
                  </text>
                ))}
                <text
                  x={a.captionX}
                  y={a.captionY}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight={600}
                  fill={INK.caption}
                  stroke="none"
                  transform={
                    a.orient === 'y' ? `rotate(-90 ${a.captionX} ${a.captionY})` : undefined
                  }
                >
                  {a.caption}
                </text>
              </g>
            ))}

            {/* Bar rows: the name at the gutter, the figure past the end. */}
            {shown.layout.rows.map((r) => (
              <g key={`row-${r.key}`}>
                <text
                  x={r.labelX}
                  y={r.textY}
                  textAnchor="end"
                  fontSize={LEAF_FONT.size}
                  fontWeight={LEAF_FONT.weight}
                  fill={INK.row}
                  stroke="none"
                >
                  {r.label}
                </text>
                <text
                  x={r.valueX}
                  y={r.textY}
                  textAnchor={r.valueAnchor}
                  fontSize={LEAF_SUB_FONT.size}
                  fill={INK.tick}
                  stroke="none"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {r.valueText}
                </text>
              </g>
            ))}
          </g>
        </svg>
      )}

      {hovered && renderTooltip && (
        <div
          className="treemap-tooltip"
          style={{
            position: 'absolute',
            // Flip to the other side of the cursor near the right or bottom
            // edge, so the card never leaves the figure.
            left: hover!.x > box.w - 260 ? undefined : hover!.x + 14,
            right: hover!.x > box.w - 260 ? box.w - hover!.x + 14 : undefined,
            top: hover!.y > box.h - 180 ? undefined : hover!.y + 14,
            bottom: hover!.y > box.h - 180 ? box.h - hover!.y + 14 : undefined,
            pointerEvents: 'none',
            zIndex: 5,
          }}
        >
          {renderTooltip(hovered)}
        </div>
      )}
    </div>
  );
}

// ── View switcher ────────────────────────────────────────────────────────

/**
 * The segmented control that drives the morph.
 *
 * A segmented control rather than the <select> the rest of the chart toolbar
 * uses, and deliberately: the views are a thing to move between and back, and
 * the point of the whole component is that the reader can see they are the same
 * data. A dropdown hides the alternatives behind a click and makes each view
 * look like a separate chart that replaced the last one.
 */
export function MorphViewSwitch({
  value,
  onChange,
  views,
  label,
}: {
  value: MorphView;
  onChange: (v: MorphView) => void;
  views: Array<{ value: MorphView; label: string }>;
  label: string;
}) {
  if (views.length < 2) return null;
  return (
    <span className="chart-toolbar-control">
      {label}
      <span className="seg-toggle" role="group" aria-label={label}>
        {views.map((v) => (
          <button
            key={v.value}
            type="button"
            className={v.value === value ? 'active' : undefined}
            aria-pressed={v.value === value}
            onClick={() => onChange(v.value)}
          >
            {v.label}
          </button>
        ))}
      </span>
    </span>
  );
}
