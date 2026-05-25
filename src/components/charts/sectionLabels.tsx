import { useCallback, useEffect, useState, type DependencyList } from 'react';

export type SectionBox = { x: number; y: number; w: number; h: number };
export type RecordBox = (name: string, box: SectionBox) => void;

// Recharts' ResponsiveContainer measures its container in its own internal
// state and only re-renders the Treemap subtree, not the parent — so a
// useLayoutEffect at the parent never sees the boxes captured during the
// first Treemap render. Instead, each depth=1 Cell calls `recordBox` from a
// useEffect, which schedules a parent setState. React batches the calls, so
// one re-render is enough to flush all section boxes into the overlay.
//
// `resetDeps` clears stale boxes when the underlying data shape changes
// (e.g. switching cities) — pass [cityId] or similar so the overlay drops
// labels for sections that no longer exist.
export function useSectionBoxes(resetDeps: DependencyList = []) {
  const [boxes, setBoxes] = useState<Map<string, SectionBox>>(new Map());

  useEffect(() => {
    setBoxes(new Map());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, resetDeps);

  const recordBox = useCallback<RecordBox>((name, box) => {
    setBoxes((prev) => {
      const existing = prev.get(name);
      if (existing && samePosition(existing, box)) return prev;
      const next = new Map(prev);
      next.set(name, box);
      return next;
    });
  }, []);

  return { boxes, recordBox };
}

function samePosition(a: SectionBox, b: SectionBox): boolean {
  return (
    Math.abs(a.x - b.x) < 0.5 &&
    Math.abs(a.y - b.y) < 0.5 &&
    Math.abs(a.w - b.w) < 0.5 &&
    Math.abs(a.h - b.h) < 0.5
  );
}

const truncateForBox = (s: string, w: number): string => {
  // Approximate char-fit at the rendered font size; leaves a small buffer.
  const cap = Math.max(0, Math.floor((w - 8) / 6.2));
  return s.length <= cap ? s : `${s.slice(0, Math.max(1, cap - 1))}…`;
};

// SVG layer drawn on top of the treemap cells so leaves can't cover label
// overflow. Reads its positions from `boxes`, which the parent populates via
// useSectionBoxes.
export function SectionLabelsOverlay({
  boxes,
  minWidth = 80,
  minHeight = 28,
}: {
  boxes: Map<string, SectionBox>;
  minWidth?: number;
  minHeight?: number;
}) {
  if (boxes.size === 0) return null;
  return (
    <svg
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    >
      {[...boxes.entries()]
        .filter(([, b]) => b.w >= minWidth && b.h >= minHeight)
        .map(([name, b]) => (
          <text
            key={name}
            x={b.x + 6}
            y={b.y + 14}
            fontFamily="'JetBrains Mono', ui-monospace, monospace"
            fontSize={10}
            fontWeight={500}
            letterSpacing={0.6}
            fill="#1a1a1a"
            style={{
              paintOrder: 'stroke',
              stroke: '#fff',
              strokeWidth: 3,
              strokeLinejoin: 'round',
              textTransform: 'uppercase',
            }}
          >
            {truncateForBox(name.toUpperCase(), b.w)}
          </text>
        ))}
    </svg>
  );
}
