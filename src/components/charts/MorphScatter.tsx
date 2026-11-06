import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { niceTicks } from '../../lib/scales';
import {
  FURNITURE_IN_MS,
  FURNITURE_OUT_MS,
  MOVE_MS,
  easeCubicInOut,
  usePrefersReducedMotion,
} from './MorphTreemap';

// A scatter whose marks persist between readings, in the same motion language as
// MorphTreemap: one <circle> per key that never unmounts, geometry tweened by a
// single rAF loop writing attributes, and the furniture (axes, ticks, captions)
// faded out, swapped while invisible and faded back in rather than interpolated.
// A change of y metric, an RCA filter, a zoom or a moved reference line is then
// something the reader watches happen to the same marks.
//
// Reference lines are tweened with the marks rather than swapped with the
// furniture: when the quadrant lines move from the national average to a city's
// own mean, the movement is the point.
//
// A resize snaps, as in MorphTreemap; everything the reader asks for animates.

export type ScatterMark = {
  key: string;
  /** null hides the mark (it fades out where it stands). */
  x: number | null;
  y: number | null;
  r: number;
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  /** 0 hides the mark; hidden marks take no pointer events. */
  opacity: number;
  /** Text drawn to the right of the mark, moving with it. */
  label?: string;
  labelColor?: string;
  labelWeight?: number;
  /** Paint order: higher is drawn later (on top). */
  z?: number;
};

export type RefLine = { key: string; axis: 'x' | 'y'; value: number; label?: string };
export type CornerLabel = { text: string; corner: 'tl' | 'tr' | 'bl' | 'br' };
export type Domain = { x: [number, number]; y: [number, number] };

type Props = {
  marks: ScatterMark[];
  refs?: RefLine[];
  corners?: CornerLabel[];
  xLabel: string;
  yLabel: string;
  xFmt?: (v: number) => string;
  yFmt?: (v: number) => string;
  /** Changes when the reading changes (a new y metric), so the furniture blinks
   *  out and back instead of relabelling under moving marks. */
  furnitureKey: string;
  renderTooltip?: (key: string) => ReactNode;
  onSelect?: (key: string) => void;
  zoom: Domain | null;
  onZoom: (d: Domain | null) => void;
  /** Fixed domain; otherwise the visible marks and reference lines decide it. */
  domain?: Domain;
};

const INK = { rule: '#c8c8c2', tick: '#6b6b6b', caption: '#555', ref: '#999', grid: '#eee' };
const M = { l: 58, r: 18, t: 14, b: 46 };

type Frame = { x: number; y: number; r: number; o: number };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function padDomain(lo: number, hi: number, pct = 0.06): [number, number] {
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return [-1, 1];
  const pad = (hi - lo) * pct || 0.5;
  return [lo - pad, hi + pad];
}

export default function MorphScatter({
  marks,
  refs = [],
  corners = [],
  xLabel,
  yLabel,
  xFmt = (v) => String(v),
  yFmt = (v) => String(v),
  furnitureKey,
  renderTooltip,
  onSelect,
  zoom,
  onZoom,
  domain: fixedDomain,
}: Props) {
  const reduce = usePrefersReducedMotion();
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = (w: number, h: number) =>
      setBox((p) => (Math.abs(p.w - w) < 0.5 && Math.abs(p.h - h) < 0.5 ? p : { w, h }));
    const r = el.getBoundingClientRect();
    measure(r.width, r.height);
    const ro = new ResizeObserver((es) => {
      for (const e of es) measure(e.contentRect.width, e.contentRect.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Domain and scales ───────────────────────────────────────────────────
  const dataDomain = useMemo<Domain>(() => {
    if (fixedDomain) return fixedDomain;
    const vis = marks.filter((m) => m.opacity > 0 && m.x != null && m.y != null);
    const xs = vis.map((m) => m.x as number).concat(refs.filter((r) => r.axis === 'x').map((r) => r.value));
    const ys = vis.map((m) => m.y as number).concat(refs.filter((r) => r.axis === 'y').map((r) => r.value));
    if (!xs.length || !ys.length) return { x: [-1, 1], y: [-1, 1] };
    return {
      x: padDomain(Math.min(...xs), Math.max(...xs)),
      y: padDomain(Math.min(...ys), Math.max(...ys)),
    };
  }, [marks, refs, fixedDomain]);
  const dom = zoom ?? dataDomain;

  const pw = Math.max(0, box.w - M.l - M.r);
  const ph = Math.max(0, box.h - M.t - M.b);
  const sx = (v: number) => M.l + ((v - dom.x[0]) / (dom.x[1] - dom.x[0] || 1)) * pw;
  const sy = (v: number) => M.t + ph - ((v - dom.y[0]) / (dom.y[1] - dom.y[0] || 1)) * ph;
  const invX = (px: number) => dom.x[0] + ((px - M.l) / (pw || 1)) * (dom.x[1] - dom.x[0]);
  const invY = (py: number) => dom.y[0] + ((M.t + ph - py) / (ph || 1)) * (dom.y[1] - dom.y[0]);

  // ── Targets ─────────────────────────────────────────────────────────────
  const held = useRef(new Map<string, Frame>());
  const target = useMemo(() => {
    const out = new Map<string, Frame>();
    for (const m of marks) {
      const placed = m.x != null && m.y != null;
      const prev = held.current.get(m.key);
      out.set(m.key, {
        // A hidden mark keeps its last position and only fades.
        x: placed ? sx(m.x as number) : prev?.x ?? M.l,
        y: placed ? sy(m.y as number) : prev?.y ?? M.t + ph,
        r: m.r,
        o: placed ? m.opacity : 0,
      });
    }
    for (const r of refs) {
      const pos = r.axis === 'x' ? sx(r.value) : sy(r.value);
      out.set(`ref:${r.axis}:${r.key}`, { x: pos, y: pos, r: 0, o: 1 });
    }
    return out;
    // sx/sy are derived from dom and the box
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marks, refs, dom.x[0], dom.x[1], dom.y[0], dom.y[1], pw, ph]);

  // ── The tween ───────────────────────────────────────────────────────────
  const els = useRef(new Map<string, { hit?: SVGCircleElement; dot?: SVGCircleElement; text?: SVGTextElement; line?: SVGLineElement; lab?: SVGTextElement }>());
  const lastBox = useRef({ w: 0, h: 0 });
  const raf = useRef(0);

  const paint = (key: string, f: Frame) => {
    const e = els.current.get(key);
    if (!e) return;
    if (e.line) {
      const isX = key.startsWith('ref:x:');
      if (isX) {
        e.line.setAttribute('x1', String(f.x));
        e.line.setAttribute('x2', String(f.x));
        e.lab?.setAttribute('x', String(f.x + 4));
      } else {
        e.line.setAttribute('y1', String(f.y));
        e.line.setAttribute('y2', String(f.y));
        e.lab?.setAttribute('y', String(f.y - 4));
      }
      return;
    }
    for (const c of [e.dot, e.hit]) {
      if (!c) continue;
      c.setAttribute('cx', String(f.x));
      c.setAttribute('cy', String(f.y));
    }
    e.dot?.setAttribute('r', String(Math.max(0, f.r)));
    e.hit?.setAttribute('r', String(Math.max(0, f.r) + 4));
    e.dot?.setAttribute('opacity', String(f.o));
    e.hit?.setAttribute('pointer-events', f.o > 0.05 ? 'all' : 'none');
    if (e.text) {
      // Near the right edge the label flips to the left of its mark.
      const flip = f.x > M.l + pw - 110;
      e.text.setAttribute('text-anchor', flip ? 'end' : 'start');
      e.text.setAttribute('x', String(flip ? f.x - f.r - 3 : f.x + f.r + 3));
      e.text.setAttribute('y', String(f.y + 4));
      e.text.setAttribute('opacity', String(f.o > 0.05 ? 1 : 0));
    }
  };

  useLayoutEffect(() => {
    cancelAnimationFrame(raf.current);
    const resized = lastBox.current.w !== box.w || lastBox.current.h !== box.h;
    lastBox.current = { w: box.w, h: box.h };
    const ms = reduce || resized ? 0 : MOVE_MS;

    // A mark that is invisible now has no position the reader was looking at:
    // it appears at its destination and only fades in.
    const from = new Map<string, Frame>();
    for (const [key, to] of target) {
      const h = held.current.get(key);
      if (!h) continue;
      from.set(key, h.o <= 0.02 && to.o > 0.02 ? { ...to, o: h.o } : h);
    }
    const apply = (t: number) => {
      const e = easeCubicInOut(t);
      for (const [key, to] of target) {
        const a = from.get(key);
        const f =
          !a || t >= 1
            ? to
            : { x: lerp(a.x, to.x, e), y: lerp(a.y, to.y, e), r: lerp(a.r, to.r, e), o: lerp(a.o, to.o, e) };
        held.current.set(key, f);
        paint(key, f);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, box.w, box.h, reduce]);

  // ── Furniture: held one step behind, swapped while invisible ────────────
  const domKey = `${furnitureKey}|${dom.x.map((v) => v.toFixed(4)).join(',')}|${dom.y.map((v) => v.toFixed(4)).join(',')}`;
  const furniture = useMemo(() => {
    const xt = niceTicks(dom.x[0], dom.x[1], 6).map((v) => ({ v, pos: sx(v) }));
    const yt = niceTicks(dom.y[0], dom.y[1], 6).map((v) => ({ v, pos: sy(v) }));
    return { xt, yt, xLabel, yLabel };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domKey, pw, ph, xLabel, yLabel]);
  const [shown, setShown] = useState(furniture);
  const [furnOn, setFurnOn] = useState(true);
  const shownKey = useRef(domKey);
  useEffect(() => {
    if (shownKey.current === domKey || reduce) {
      shownKey.current = domKey;
      setShown(furniture);
      return;
    }
    shownKey.current = domKey;
    setFurnOn(false);
    const t = window.setTimeout(() => {
      setShown(furniture);
      setFurnOn(true);
    }, FURNITURE_OUT_MS);
    return () => window.clearTimeout(t);
  }, [furniture, domKey, reduce]);

  // ── Interaction ─────────────────────────────────────────────────────────
  const [hover, setHover] = useState<{ key: string; x: number; y: number } | null>(null);
  const [drag, setDrag] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const dragRef = useRef(drag);
  dragRef.current = drag;
  const local = (e: { clientX: number; clientY: number }) => {
    const r = wrapRef.current!.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top] as const;
  };
  useEffect(() => {
    if (!drag) return;
    const move = (e: MouseEvent) => {
      const [x, y] = local(e);
      setDrag((d) => (d ? { ...d, x1: x, y1: y } : d));
    };
    const up = () => {
      const d = dragRef.current;
      setDrag(null);
      if (d && Math.abs(d.x1 - d.x0) > 10 && Math.abs(d.y1 - d.y0) > 10) {
        onZoom({
          x: [invX(Math.min(d.x0, d.x1)), invX(Math.max(d.x0, d.x1))],
          y: [invY(Math.max(d.y0, d.y1)), invY(Math.min(d.y0, d.y1))],
        });
      }
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag !== null]);

  const ordered = useMemo(() => [...marks].sort((a, b) => (a.z ?? 0) - (b.z ?? 0)), [marks]);
  const ready = box.w > 0 && box.h > 0;
  const clipId = useMemo(() => `ms-clip-${Math.random().toString(36).slice(2)}`, []);
  const cornerPos = (c: CornerLabel['corner']) => ({
    x: c === 'tl' || c === 'bl' ? M.l + 8 : M.l + pw - 8,
    y: c === 'tl' || c === 'tr' ? M.t + 14 : M.t + ph - 8,
    anchor: c === 'tl' || c === 'bl' ? 'start' : 'end',
  });

  return (
    <div ref={wrapRef} className="morph-chart">
      {ready && (
        <svg
          width={box.w}
          height={box.h}
          style={{ display: 'block', overflow: 'visible', userSelect: 'none', cursor: drag ? 'crosshair' : 'default' }}
          onMouseLeave={() => setHover(null)}
        >
          <defs>
            <clipPath id={clipId}>
              <rect x={M.l} y={M.t} width={pw} height={ph} />
            </clipPath>
          </defs>

          {/* Background: catches the drag that starts a zoom. */}
          <rect
            x={M.l}
            y={M.t}
            width={pw}
            height={ph}
            fill="transparent"
            onMouseDown={(e) => {
              if (e.button !== 0) return;
              const [x, y] = local(e);
              setHover(null);
              setDrag({ x0: x, y0: y, x1: x, y1: y });
              e.preventDefault();
            }}
            onDoubleClick={() => onZoom(null)}
          />

          {/* Furniture */}
          <g
            style={{
              pointerEvents: 'none',
              opacity: furnOn ? 1 : 0,
              transition: reduce
                ? 'none'
                : furnOn
                  ? `opacity ${FURNITURE_IN_MS}ms ease ${MOVE_MS * 0.7 - FURNITURE_OUT_MS}ms`
                  : `opacity ${FURNITURE_OUT_MS}ms ease`,
            }}
          >
            {shown.xt.map((t) => (
              <g key={`x${t.v}`}>
                <line x1={t.pos} x2={t.pos} y1={M.t} y2={M.t + ph} stroke={INK.grid} strokeDasharray="2 2" />
                <text x={t.pos} y={M.t + ph + 16} textAnchor="middle" fontSize={11} fill={INK.tick} style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {xFmt(t.v)}
                </text>
              </g>
            ))}
            {shown.yt.map((t) => (
              <g key={`y${t.v}`}>
                <line x1={M.l} x2={M.l + pw} y1={t.pos} y2={t.pos} stroke={INK.grid} strokeDasharray="2 2" />
                <text x={M.l - 7} y={t.pos + 3.5} textAnchor="end" fontSize={11} fill={INK.tick} style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {yFmt(t.v)}
                </text>
              </g>
            ))}
            <line x1={M.l} x2={M.l + pw} y1={M.t + ph} y2={M.t + ph} stroke={INK.rule} />
            <line x1={M.l} x2={M.l} y1={M.t} y2={M.t + ph} stroke={INK.rule} />
            <text x={M.l + pw / 2} y={box.h - 6} textAnchor="middle" fontSize={13} fill={INK.caption}>
              {shown.xLabel}
            </text>
            <text
              x={14}
              y={M.t + ph / 2}
              textAnchor="middle"
              fontSize={13}
              fill={INK.caption}
              transform={`rotate(-90 14 ${M.t + ph / 2})`}
            >
              {shown.yLabel}
            </text>
            {corners.map((c) => {
              const p = cornerPos(c.corner);
              return (
                <text
                  key={c.corner}
                  x={p.x}
                  y={p.y}
                  textAnchor={p.anchor as 'start' | 'end'}
                  fontSize={11}
                  fontWeight={600}
                  letterSpacing="0.06em"
                  fill={INK.tick}
                >
                  {c.text.toUpperCase()}
                </text>
              );
            })}
          </g>

          <g clipPath={`url(#${clipId})`}>
            {/* Reference lines — tweened, not swapped */}
            {refs.map((r) => {
              const key = `ref:${r.axis}:${r.key}`;
              return (
                <g key={key} style={{ pointerEvents: 'none' }}>
                  <line
                    ref={(el) => {
                      const e = els.current.get(key) ?? {};
                      if (el) els.current.set(key, { ...e, line: el });
                    }}
                    x1={r.axis === 'x' ? 0 : M.l}
                    x2={r.axis === 'x' ? 0 : M.l + pw}
                    y1={r.axis === 'x' ? M.t : 0}
                    y2={r.axis === 'x' ? M.t + ph : 0}
                    stroke={INK.ref}
                    strokeDasharray="3 3"
                  />
                  {r.label && (
                    <text
                      ref={(el) => {
                        const e = els.current.get(key) ?? {};
                        if (el) els.current.set(key, { ...e, lab: el });
                      }}
                      x={r.axis === 'x' ? 0 : M.l + pw - 4}
                      y={r.axis === 'x' ? M.t + ph - 6 : 0}
                      textAnchor={r.axis === 'x' ? 'start' : 'end'}
                      fontSize={10}
                      fill={INK.tick}
                    >
                      {r.label}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Marks */}
            {ordered.map((m) => (
              <g key={m.key}>
                <circle
                  ref={(el) => {
                    const e = els.current.get(m.key) ?? {};
                    if (el) els.current.set(m.key, { ...e, dot: el });
                  }}
                  fill={m.fill}
                  stroke={m.stroke ?? 'none'}
                  strokeWidth={m.strokeWidth ?? 1}
                  pointerEvents="none"
                  style={{ transition: 'fill 0.7s ease, stroke 0.7s ease' }}
                />
                {m.label && (
                  <text
                    ref={(el) => {
                      const e = els.current.get(m.key) ?? {};
                      if (el) els.current.set(m.key, { ...e, text: el });
                    }}
                    fontSize={12}
                    fontWeight={m.labelWeight ?? 400}
                    fill={m.labelColor ?? '#444'}
                    pointerEvents="none"
                  >
                    {m.label}
                  </text>
                )}
                <circle
                  ref={(el) => {
                    const e = els.current.get(m.key) ?? {};
                    if (el) els.current.set(m.key, { ...e, hit: el });
                  }}
                  fill="transparent"
                  style={{ cursor: onSelect ? 'pointer' : 'default' }}
                  onMouseMove={(e) => {
                    if (drag) return;
                    const [x, y] = local(e);
                    setHover({ key: m.key, x, y });
                  }}
                  onMouseLeave={() => setHover((h) => (h?.key === m.key ? null : h))}
                  onClick={onSelect ? () => onSelect(m.key) : undefined}
                />
              </g>
            ))}
          </g>

          {drag && (
            <rect
              x={Math.min(drag.x0, drag.x1)}
              y={Math.min(drag.y0, drag.y1)}
              width={Math.abs(drag.x1 - drag.x0)}
              height={Math.abs(drag.y1 - drag.y0)}
              fill="#c64646"
              fillOpacity={0.08}
              stroke="#c64646"
              strokeOpacity={0.6}
              pointerEvents="none"
            />
          )}
        </svg>
      )}

      {hover && renderTooltip && !drag && (
        <div
          className="treemap-tooltip"
          style={{
            position: 'absolute',
            left: hover.x > box.w - 280 ? undefined : hover.x + 14,
            right: hover.x > box.w - 280 ? box.w - hover.x + 14 : undefined,
            top: hover.y > box.h - 200 ? undefined : hover.y + 14,
            bottom: hover.y > box.h - 200 ? box.h - hover.y + 14 : undefined,
            pointerEvents: 'none',
            zIndex: 5,
          }}
        >
          {renderTooltip(hover.key)}
        </div>
      )}
    </div>
  );
}
