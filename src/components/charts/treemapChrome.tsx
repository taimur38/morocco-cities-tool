// Labels and outlines drawn over the marks.
//
// Everything here is furniture in the sense morphLayout uses the word: it
// describes a particular reading of the data and is crossfaded when the reading
// changes, rather than tweened along with the marks.

import {
  CHIP_H,
  GROUP_FONT,
  LEAF_FONT,
  LEAF_SUB_FONT,
  fitLabel,
  inkOn,
  mix,
  textWidth,
  truncate,
} from '../../lib/chartText';

// Painted attributes tween on a fixed layout; geometry does not. Recolouring a
// treemap must not move a cell, so the fill transitions in CSS while the layout
// stays exactly where the tween left it.
export const PAINT = 'fill 0.7s ease, stroke 0.7s ease';

const PAPER = '#ffffff';

const CHIP_PAD_X = 6;
const CHIP_BASELINE = 12;
const LEAF_PAD_X = 6;
const LEAF_BASELINE = 14;
const LEAF_SUB_BASELINE = 27;

// Set a section aside without letting the ground show through it.
export const fade = (color: string) => mix(color, PAPER, 0.72);

// ── Group chrome ─────────────────────────────────────────────────────────

/**
 * The box the section's label chip will occupy, or null if no chip is drawn.
 *
 * Exported because the chip is painted over the cells, and a leaf label in the
 * section's top-left corner would otherwise be printed under it. The two labels
 * are produced by different layers — chrome and leaf — so the only way for the
 * leaf to know it is in the way is to ask the same question the chip asked.
 * Kept in one place so the answer cannot drift from what GroupChrome draws.
 */
export function chipBox(
  names: Array<string | null | undefined>,
  width: number,
  height: number,
): { w: number; h: number } | null {
  const label = fitLabel(names, Math.max(0, width - CHIP_PAD_X * 2), GROUP_FONT);
  if (label === null || height <= CHIP_H + 3) return null;
  return {
    w: Math.min(width, textWidth(label, GROUP_FONT) + CHIP_PAD_X * 2),
    h: Math.min(CHIP_H, height),
  };
}

type GroupProps = {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  names: Array<string | null | undefined>;
  faded?: boolean;
  ground?: string;
  // Space to carve out of the section's box for the gutter. Pass 0 where the
  // LAYOUT already left the gutter unallocated — as morphLayout's treemap
  // does — since carving again would take a second gutter out of the box.
  gutter?: number;
};

/**
 * A NACE section: a hairline in its own colour and a label chip, drawn over the
 * section's children.
 */
export function GroupChrome({
  x,
  y,
  width,
  height,
  color,
  names,
  faded = false,
  ground = PAPER,
  gutter = 0,
}: GroupProps) {
  const g = gutter;
  const iw = Math.max(0, width - g);
  const ih = Math.max(0, height - g);

  // A faded section keeps its label legible — the reader has to be able to tell
  // what has been set aside — but it must not end up louder than the sections
  // still lit, so the ink is chosen against the chip's actual colour and then
  // pulled partway back toward it.
  const chipFill = faded ? fade(color) : color;
  const chipInk = faded ? mix(inkOn(chipFill), chipFill, 0.45) : inkOn(chipFill);
  const label = fitLabel(names, Math.max(0, iw - CHIP_PAD_X * 2), GROUP_FONT);
  const show = label !== null && ih > CHIP_H + 3;
  const chipW = show ? Math.min(iw, textWidth(label, GROUP_FONT) + CHIP_PAD_X * 2) : 0;

  return (
    <g>
      {g > 0 && (
        <rect x={x} y={y} width={width} height={height} fill="none" stroke={ground} strokeWidth={g} />
      )}
      <rect
        x={x + g / 2}
        y={y + g / 2}
        width={iw}
        height={ih}
        rx={2}
        fill="none"
        stroke={chipFill}
        strokeWidth={1}
        style={{ transition: PAINT }}
      />
      {show && (
        <>
          <rect
            x={x + g / 2}
            y={y + g / 2}
            width={chipW}
            height={Math.min(CHIP_H, ih)}
            fill={chipFill}
            stroke="none"
            style={{ transition: PAINT }}
          />
          <text
            x={x + g / 2 + CHIP_PAD_X}
            y={y + g / 2 + CHIP_BASELINE}
            fontSize={GROUP_FONT.size}
            fontWeight={GROUP_FONT.weight}
            fill={chipInk}
            stroke="none"
            style={{ letterSpacing: `${GROUP_FONT.tracking}em`, transition: PAINT }}
          >
            {label}
          </text>
        </>
      )}
    </g>
  );
}

// ── Leaf label ───────────────────────────────────────────────────────────

type LeafLabelProps = {
  x: number;
  y: number;
  width: number;
  height: number;
  names: Array<string | null | undefined>;
  sub?: string;
  fill: string;
  /** Push the first baseline down by this much, to clear a section chip that
   *  overlaps the cell's top-left corner. */
  inset?: number;
};

/**
 * An industry name, and optionally one figure under it, laid on the cell's own
 * fill. No halo: the ink is picked against the fill, which is what a halo would
 * have been standing in for. Renders nothing where the cell has no room.
 */
// The shortest ellipsised label that still identifies an industry. CNSS names
// share long prefixes — "Wholesale of…", "Retail sale of…", "Other…" — so a
// cell trimmed to a handful of characters does not name anything: half a dozen
// neighbouring cells all end up reading "Whol…", which is noise wearing the
// shape of a label. A name that fits whole is always drawn, however short; this
// governs only what is left after trimming.
const MIN_TRIMMED_CHARS = 12;

export function LeafLabel({ x, y, width, height, names, sub, fill, inset = 0 }: LeafLabelProps) {
  const room = Math.max(0, width - LEAF_PAD_X * 2);
  if (height < LEAF_BASELINE + inset + 4 || room < 34) return null;
  const known = names.filter((n): n is string => !!n);
  if (known.length === 0) return null;
  const label = fitLabel(known, room, LEAF_FONT) ?? truncate(known[0], room, LEAF_FONT);
  if (!label) return null;
  if (label.endsWith('…') && label.length < MIN_TRIMMED_CHARS) return null;
  const ink = inkOn(fill);
  const showSub = sub != null && height >= LEAF_SUB_BASELINE + inset + 4;
  return (
    <>
      <text
        x={x + LEAF_PAD_X}
        y={y + LEAF_BASELINE + inset}
        fontSize={LEAF_FONT.size}
        fontWeight={LEAF_FONT.weight}
        fill={ink}
        stroke="none"
        style={{ transition: PAINT }}
      >
        {label}
      </text>
      {showSub && (
        <text
          x={x + LEAF_PAD_X}
          y={y + LEAF_SUB_BASELINE + inset}
          fontSize={LEAF_SUB_FONT.size}
          fill={ink}
          fillOpacity={0.75}
          stroke="none"
          style={{ fontVariantNumeric: 'tabular-nums', transition: PAINT }}
        >
          {sub}
        </text>
      )}
    </>
  );
}

export { LEAF_FONT, LEAF_SUB_FONT };
