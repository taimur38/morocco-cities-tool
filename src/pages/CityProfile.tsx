import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  useCityPanel,
  useCityComplexity,
  useCityShiftShare,
  useCityIndustryShiftShare,
  useIndustryComplexity,
  useIndustryTranslations,
} from '../data/usePanel';
import CitySelect from '../components/CitySelect';
import SectionLevels from '../components/profile/SectionLevels';
import MigrationVsWageScatter from '../components/charts/MigrationVsWageScatter';
import ShiftShareWaterfall from '../components/charts/ShiftShareWaterfall';
import IndustryTreemap from '../components/charts/IndustryTreemap';
import NewIndustriesTreemap from '../components/charts/NewIndustriesTreemap';
import SectionOverviewTreemap from '../components/charts/SectionOverviewTreemap';
import CityMap from '../components/charts/CityMap';
import { citySlug } from '../lib/slug';
import { cleanCityName } from '../lib/derive';

type WageStat = 'median' | 'mean';

export default function CityProfile() {
  const { citySlug: slug = '' } = useParams();
  const panel = useCityPanel();
  const [wageStat, setWageStat] = useState<WageStat>('median');
  const complexity = useCityComplexity();
  const ss = useCityShiftShare();
  const ssIndustry = useCityIndustryShiftShare();
  const industryComplexity = useIndustryComplexity();
  const translations = useIndustryTranslations();

  const city = useMemo(() => {
    if (!panel.data) return null;
    const rows = panel.data.filter((r) => citySlug(r.city_name) === slug);
    if (rows.length === 0) return null;
    return { id: rows[0].city_id, name: cleanCityName(rows[0].city_name) };
  }, [panel.data, slug]);

  if (panel.loading) return <p className="loading">Loading…</p>;
  if (panel.error) return <p className="error">{panel.error.message}</p>;
  if (!city || !panel.data) {
    return (
      <>
        <p className="error">No city matches "{slug}".</p>
        <p>
          <Link to="/">← Back to overview</Link>
        </p>
      </>
    );
  }

  const cityShiftShare = ss.data?.find((r) => r.city_id === city.id) ?? null;
  const cityMedianWage =
    panel.data.find((r) => r.city_id === city.id && r.year === 2024)
      ?.cnss_median_daily_wage ?? null;

  return (
    <article>
      <p className="muted">
        <Link to="/">← All cities</Link>
      </p>

      <div className="city-header">
        <h2 className="city-title">{city.name}</h2>
        <CitySelect rows={panel.data} current={slug} />
      </div>

      <div className="chart-block">
        <h4>What we mean by {city.name}</h4>
        <p className="chart-caption">
          The functional urban area (dashed boundary) and the communes inside it.
          Together they form the city's labor market for the rest of this page.
        </p>
        <CityMap slug={slug} cityName={city.name} variant="definition" />
      </div>

      <p className="muted">
        The rest of the page compares {city.name} on levels (where it stands today) and changes
        (how it moved between 2014 and 2024).
      </p>

      {/* SECTION 1 — LEVELS */}
      <h3>1. Where {city.name} stands today</h3>
      <p>
        How big is the city, what does it pay, and how easy is it to find a job? Each block shows
        the level, the city's rank among the 63 functional urban areas, and a comparison to
        Casablanca — Morocco's largest and most-watched city.
      </p>
      <SectionLevels rows={panel.data} cityId={city.id} complexity={complexity.data} />

      <div className="chart-block">
        <h4>What {city.name} does for a living</h4>
        <p className="chart-caption">
          The city's 2024 industrial composition. Each rectangle is one CNSS industry, sized by
          workers, grouped by NACE section. Toggle the color to view sectional kind,
          industry-level economic complexity (PCI from the national product space), or how this
          city's daily wage in each industry compares to the cross-city median for that industry.
        </p>
        {ssIndustry.data && (
          <SectionOverviewTreemap
            rows={ssIndustry.data}
            complexity={industryComplexity.data}
            cityId={city.id}
            cityMedianWage={cityMedianWage}
            translations={translations.data}
          />
        )}
      </div>

      {/* SECTION 2 — CHANGES */}
      <h3>2. How {city.name} has changed</h3>
      <p>
        Where does the city sit on the migration-versus-wages plot from the overview? And among
        the formal-sector workers it has gained (or lost) since 2014, what stories does the
        composition tell?
      </p>

      <div className="chart-block">
        <h4>Where the people are moving</h4>
        <p className="chart-caption">
          Communes shaded by net internal migration over the last decade. Green = net inflow, red =
          net outflow. The dashed boundary is the FUA used to define the city.
        </p>
        <CityMap slug={slug} cityName={city.name} />
      </div>

      <div className="chart-block">
        <div className="chart-toolbar">
          <label className="chart-toolbar-control">
            Wage statistic:
            <select
              className="chart-toolbar-select"
              value={wageStat}
              onChange={(e) => setWageStat(e.target.value as WageStat)}
            >
              <option value="median">Median</option>
              <option value="mean">Mean</option>
            </select>
          </label>
        </div>
        <h4>Position in the migration vs. wages map</h4>
        <p className="chart-caption">
          Each point is one city. {city.name} is highlighted in red. The Y axis shows the
          CAGR of the {wageStat} CNSS daily wage; toggle between median (more robust to
          outlier industries) and mean.
        </p>
        <MigrationVsWageScatter
          rows={panel.data}
          highlightCityId={city.id}
          wageStat={wageStat}
        />
      </div>

      <h4>What's driven the change in formal employment?</h4>
      <p>
        We decompose the city's 2014→2024 change in CNSS workers into four pieces using a
        shift-share. <strong>National</strong> is the rising-tide effect (every city grew with
        Morocco). <strong>Industry mix</strong> rewards or penalises a city for its inherited
        industrial composition — cities heavy in nationally-fast-growing industries get a boost.{' '}
        <strong>Local share</strong> is the city-specific bit: how much its industries
        outperformed (or underperformed) the same industries elsewhere in Morocco. This is the
        cleanest signal of a local positive or negative shock.
      </p>

      {ss.loading && <p className="loading">Loading shift-share…</p>}
      {ss.error && <p className="error">Could not load shift-share: {ss.error.message}</p>}
      {!ss.loading && !cityShiftShare && (
        <p className="muted">
          No shift-share data for this city — typically because no CNSS villes match it. The
          three manual cities (Laayoune, Es-Semara, Tan Tan) fall in this bucket.
        </p>
      )}
      {cityShiftShare && (
        <>
          <div className="chart-block">
            <h4>Decomposition of formal-employment change</h4>
            <p className="chart-caption">
              Bars step from 2014 to 2024 workers; each contribution is labelled.
            </p>
            <ShiftShareWaterfall row={cityShiftShare} />
          </div>

          <div className="chart-block">
            <h4>Industry mix in 2014, by section</h4>
            <p className="chart-caption">
              Each rectangle is one CNSS industry, sized by 2014 workers and grouped by NACE
              section. Toggle the color to see which industries gained or lost the largest share
              of their 2014 workforce via the local-share or industry-mix component (capped at
              ±100%). Hover for the per-industry detail.
            </p>
            {ssIndustry.loading && <p className="loading">Loading industry detail…</p>}
            {ssIndustry.data && (
              <IndustryTreemap
                rows={ssIndustry.data}
                cityId={city.id}
                translations={translations.data}
              />
            )}
          </div>

          <div className="chart-block">
            <h4>New industries since 2014</h4>
            <p className="chart-caption">
              Industries with zero CNSS workers in 2014 that show up by 2024. Toggle the color
              to view by NACE section, by daily wage relative to the industry's national median,
              or by daily wage relative to the city's median. These contribute entirely to the
              entry-effect bar in the waterfall above.
            </p>
            {ssIndustry.data && (
              <NewIndustriesTreemap
                rows={ssIndustry.data}
                cityId={city.id}
                cityMedianWage={cityMedianWage}
                translations={translations.data}
              />
            )}
          </div>
        </>
      )}
    </article>
  );
}
