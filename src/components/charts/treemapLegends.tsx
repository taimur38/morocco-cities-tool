import { complexityColor, divergingPctColor } from '../../lib/colorScales';
import { sectionColor } from '../../lib/sectionPalette';

// Diverging "% of base workforce gained or lost" — capped at the bound the
// IndustryTreemap uses for its color scale.
export function DivergingPctLegend({
  bound,
  note,
}: {
  bound: number;
  note: string;
}) {
  const stops = [-1, -0.66, -0.33, 0, 0.33, 0.66, 1];
  return (
    <div className="treemap-legend">
      <div className="treemap-legend-bar">
        {stops.map((t) => (
          <div
            key={t}
            className="treemap-legend-stop"
            style={{ background: divergingPctColor(t * bound, bound) }}
          />
        ))}
      </div>
      <div className="treemap-legend-labels">
        <span>≤ −{bound}% (lost)</span>
        <span>0%</span>
        <span>≥ +{bound}% (gained)</span>
      </div>
      <div className="treemap-legend-note">{note}</div>
    </div>
  );
}

// Diverging legend for "daily wage vs. some median." The reference label and
// note vary by mode (industry-national vs. city-internal comparison).
export function WageLegend({
  bound,
  reference = 'industry median',
  note = "Each cell's daily wage (CNSS total salary ÷ days worked) compared to the median across all cities where that industry appears.",
  unit = '%',
  lowLabel = 'lower pay',
  highLabel = 'higher pay',
}: {
  bound: number;
  reference?: string;
  note?: string;
  unit?: string;
  lowLabel?: string;
  highLabel?: string;
}) {
  const stops = [-1, -0.66, -0.33, 0, 0.33, 0.66, 1];
  return (
    <div className="treemap-legend">
      <div className="treemap-legend-bar">
        {stops.map((t) => (
          <div
            key={t}
            className="treemap-legend-stop"
            style={{ background: divergingPctColor(t * bound, bound) }}
          />
        ))}
      </div>
      <div className="treemap-legend-labels">
        <span>≤ −{bound}{unit} ({lowLabel})</span>
        <span>{reference}</span>
        <span>≥ +{bound}{unit} ({highLabel})</span>
      </div>
      <div className="treemap-legend-note">{note}</div>
    </div>
  );
}

// Atlas-gradient (orange → cream → teal) legend for industry complexity.
// `scale` is the absolute bound that maps to ±1 in `complexityColor`.
export function ComplexityLegend({ scale }: { scale: number }) {
  const stops = [-1, -0.66, -0.33, 0, 0.33, 0.66, 1];
  return (
    <div className="treemap-legend">
      <div className="treemap-legend-bar">
        {stops.map((t) => (
          <div
            key={t}
            className="treemap-legend-stop"
            style={{ background: complexityColor(t * scale, scale) }}
          />
        ))}
      </div>
      <div className="treemap-legend-labels">
        <span>PCI ≤ −{scale.toFixed(1)} (less complex)</span>
        <span>0</span>
        <span>≥ +{scale.toFixed(1)} (more complex)</span>
      </div>
      <div className="treemap-legend-note">
        Industry complexity from the national product space — based on
        worker-share specialization across cities.
      </div>
    </div>
  );
}

// Categorical section chips. Sections is the list present in the current
// treemap, ordered by how the data is laid out so the legend reads in the
// same order the eye scans.
export function SectionLegend({ sections }: { sections: string[] }) {
  if (sections.length === 0) return null;
  return (
    <div className="section-legend">
      {sections.map((s) => (
        <span key={s} className="section-legend-item">
          <span className="section-legend-swatch" style={{ background: sectionColor(s) }} />
          {s}
        </span>
      ))}
    </div>
  );
}
