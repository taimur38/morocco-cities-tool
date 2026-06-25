import { complexityColor, divergingPctColor } from '../../lib/colorScales';
import { sectionColor } from '../../lib/sectionPalette';
import { useLang } from '../../i18n/context';
import { useT, sectionLabel } from '../../i18n/ui';

const STOPS = [-1, -0.66, -0.33, 0, 0.33, 0.66, 1];

// Diverging "% of base workforce gained or lost" — capped at the bound the
// IndustryTreemap uses for its color scale.
export function DivergingPctLegend({
  bound,
  note,
}: {
  bound: number;
  note: string;
}) {
  const t = useT();
  return (
    <div className="treemap-legend">
      <div className="treemap-legend-bar">
        {STOPS.map((stop) => (
          <div
            key={stop}
            className="treemap-legend-stop"
            style={{ background: divergingPctColor(stop * bound, bound) }}
          />
        ))}
      </div>
      <div className="treemap-legend-labels">
        <span>≤ −{bound}% ({t('legend.lost')})</span>
        <span>0%</span>
        <span>≥ +{bound}% ({t('legend.gained')})</span>
      </div>
      <div className="treemap-legend-note">{note}</div>
    </div>
  );
}

// Diverging legend for "daily wage vs. some median." The reference label and
// note vary by mode (industry-national vs. city-internal comparison); callers
// pass translated strings, and unset props fall back to the default copy.
export function WageLegend({
  bound,
  reference,
  note,
  unit = '%',
  lowLabel,
  highLabel,
}: {
  bound: number;
  reference?: string;
  note?: string;
  unit?: string;
  lowLabel?: string;
  highLabel?: string;
}) {
  const t = useT();
  const ref = reference ?? t('legend.wage.industryMedian');
  const noteText = note ?? t('legend.wage.note.default');
  const low = lowLabel ?? t('legend.wage.lowerPay');
  const high = highLabel ?? t('legend.wage.higherPay');
  return (
    <div className="treemap-legend">
      <div className="treemap-legend-bar">
        {STOPS.map((stop) => (
          <div
            key={stop}
            className="treemap-legend-stop"
            style={{ background: divergingPctColor(stop * bound, bound) }}
          />
        ))}
      </div>
      <div className="treemap-legend-labels">
        <span>≤ −{bound}{unit} ({low})</span>
        <span>{ref}</span>
        <span>≥ +{bound}{unit} ({high})</span>
      </div>
      <div className="treemap-legend-note">{noteText}</div>
    </div>
  );
}

// Atlas-gradient (orange → cream → teal) legend for industry complexity.
// `scale` is the absolute bound that maps to ±1 in `complexityColor`.
export function ComplexityLegend({ scale }: { scale: number }) {
  const t = useT();
  return (
    <div className="treemap-legend">
      <div className="treemap-legend-bar">
        {STOPS.map((stop) => (
          <div
            key={stop}
            className="treemap-legend-stop"
            style={{ background: complexityColor(stop * scale, scale) }}
          />
        ))}
      </div>
      <div className="treemap-legend-labels">
        <span>{t('legend.complexity.less', { s: scale.toFixed(1) })}</span>
        <span>0</span>
        <span>{t('legend.complexity.more', { s: scale.toFixed(1) })}</span>
      </div>
      <div className="treemap-legend-note">{t('legend.complexity.note')}</div>
    </div>
  );
}

// Categorical section chips. Sections is the list present in the current
// treemap, ordered by how the data is laid out so the legend reads in the
// same order the eye scans. Section names are the English data keys; we
// translate the label for display while keeping the key for coloring.
export function SectionLegend({ sections }: { sections: string[] }) {
  const { lang } = useLang();
  if (sections.length === 0) return null;
  return (
    <div className="section-legend">
      {sections.map((s) => (
        <span key={s} className="section-legend-item">
          <span className="section-legend-swatch" style={{ background: sectionColor(s) }} />
          {sectionLabel(s, lang)}
        </span>
      ))}
    </div>
  );
}
