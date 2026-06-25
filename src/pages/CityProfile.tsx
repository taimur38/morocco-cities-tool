import { useMemo } from 'react';
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
import MigrationVsLaborOutcome from '../components/charts/MigrationVsLaborOutcome';
import ShiftShareWaterfall from '../components/charts/ShiftShareWaterfall';
import IndustryTreemap from '../components/charts/IndustryTreemap';
import NewIndustriesTreemap from '../components/charts/NewIndustriesTreemap';
import SectionOverviewTreemap from '../components/charts/SectionOverviewTreemap';
import CityMap from '../components/charts/CityMap';
import { citySlug } from '../lib/slug';
import { cleanCityName } from '../lib/derive';
import { useLang } from '../i18n/context';
import { useT } from '../i18n/ui';
import { cityContent } from '../i18n/content';

export default function CityProfile() {
  const { citySlug: slug = '' } = useParams();
  const panel = useCityPanel();
  const complexity = useCityComplexity();
  const ss = useCityShiftShare();
  const ssIndustry = useCityIndustryShiftShare();
  const industryComplexity = useIndustryComplexity();
  const translations = useIndustryTranslations();
  const { lang } = useLang();
  const t = useT();
  const cc = cityContent;

  const city = useMemo(() => {
    if (!panel.data) return null;
    const rows = panel.data.filter((r) => citySlug(r.city_name) === slug);
    if (rows.length === 0) return null;
    return { id: rows[0].city_id, name: cleanCityName(rows[0].city_name) };
  }, [panel.data, slug]);

  // Per-city regression-FE wage-premium growth, for the labor-outcome scatter's
  // wage-premium option.
  const feGrowthByCity = useMemo(() => {
    if (!ss.data) return undefined;
    const m = new Map<number, number>();
    for (const r of ss.data) {
      if (r.wage_premium_fe_growth != null) m.set(r.city_id, r.wage_premium_fe_growth);
    }
    return m;
  }, [ss.data]);

  if (panel.loading) return <p className="loading">{t('common.loading')}</p>;
  if (panel.error) return <p className="error">{panel.error.message}</p>;
  if (!city || !panel.data) {
    return (
      <>
        <p className="error">{t('common.noCityMatch', { slug })}</p>
        <p>
          <Link to="/">{t('common.backOverview')}</Link>
        </p>
      </>
    );
  }

  const cityShiftShare = ss.data?.find((r) => r.city_id === city.id) ?? null;
  const cityMedianWage =
    panel.data.find((r) => r.city_id === city.id && r.year === 2024)
      ?.cnss_median_daily_wage ?? null;
  // A handful of FUAs (currently Deroua, Souk Sebt Oulad Nemma, M'rirt) have
  // no ville in the CNSS registry — formal-sector employers in those areas
  // file under a neighbouring ville. Detect once and gate the CNSS-derived
  // chart blocks plus the top-of-page notice off this flag.
  const hasCnss = panel.data.some(
    (r) => r.city_id === city.id && r.cnss_workers != null,
  );

  return (
    <article>
      <p className="muted">
        <Link to="/">{t('common.allCities')}</Link>
      </p>

      <div className="city-header">
        <h2 className="city-title">{city.name}</h2>
        <CitySelect rows={panel.data} current={slug} />
      </div>

      {!hasCnss && (
        <aside className="data-gap-notice">{cc.dataGapNotice[lang](city.name)}</aside>
      )}

      <div className="chart-block">
        <h4>{cc.whatWeMeanTitle[lang](city.name)}</h4>
        <p className="chart-caption">{cc.whatWeMeanCaption[lang](city.name)}</p>
        <CityMap slug={slug} cityName={city.name} variant="definition" />
      </div>

      <p className="muted">{cc.levelsIntro[lang](city.name)}</p>

      {/* SECTION 1 — LEVELS */}
      <h3>{cc.section1H3[lang](city.name)}</h3>
      <p>{cc.levelsP[lang](city.name)}</p>
      <SectionLevels rows={panel.data} cityId={city.id} complexity={complexity.data} />

      {hasCnss && (
        <div className="chart-block">
          <h4>{cc.compositionTitle[lang](city.name)}</h4>
          <p className="chart-caption">{cc.compositionCaption[lang](city.name)}</p>
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
      )}

      {/* SECTION 2 — CHANGES */}
      <h3>{cc.section2H3[lang](city.name)}</h3>
      <p>{cc.changesIntro[lang](city.name)}</p>

      <div className="chart-block">
        <h4>{cc.movingTitle[lang](city.name)}</h4>
        <p className="chart-caption">{cc.movingCaption[lang](city.name)}</p>
        <CityMap slug={slug} cityName={city.name} />
      </div>

      <p>{cc.positionIntro[lang](city.name)}</p>
      <div className="chart-block">
        <h4>{cc.positionTitle[lang](city.name)}</h4>
        <p className="chart-caption">{cc.positionCaption[lang](city.name)}</p>
        <MigrationVsLaborOutcome
          rows={panel.data}
          highlightCityId={city.id}
          defaultMetric="wage_median"
          feGrowthByCity={feGrowthByCity}
        />
      </div>

      <h4>{cc.drivenTitle[lang](city.name)}</h4>
      <p>{cc.drivenP[lang](city.name)}</p>

      {ss.loading && <p className="loading">{t('cp.loadingShiftShare')}</p>}
      {ss.error && (
        <p className="error">{t('cp.shiftShareError', { msg: ss.error.message })}</p>
      )}
      {!ss.loading && !cityShiftShare && (
        <p className="muted">{cc.ssMissing[lang](city.name)}</p>
      )}
      {cityShiftShare && (
        <>
          <div className="chart-block">
            <h4>{cc.decompTitle[lang](city.name)}</h4>
            <p className="chart-caption">{cc.decompCaption[lang](city.name)}</p>
            <ShiftShareWaterfall row={cityShiftShare} />
          </div>

          <p>{cc.waterfallToTreemapP[lang](city.name)}</p>
          <div className="chart-block">
            <h4>{cc.mixTitle[lang](city.name)}</h4>
            <p className="chart-caption">{cc.mixCaption[lang](city.name)}</p>
            {ssIndustry.loading && (
              <p className="loading">{cc.loadingIndustryDetail[lang](city.name)}</p>
            )}
            {ssIndustry.data && (
              <IndustryTreemap
                rows={ssIndustry.data}
                cityId={city.id}
                translations={translations.data}
              />
            )}
          </div>

          <p>{cc.newIndIntroP[lang](city.name)}</p>
          <div className="chart-block">
            <h4>{cc.newIndTitle[lang](city.name)}</h4>
            <p className="chart-caption">{cc.newIndCaption[lang](city.name)}</p>
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

      {/* SECTION 3 — COMMUNE EXPLORER */}
      <h3>{cc.section3H3[lang](city.name)}</h3>
      <p>{cc.communeP[lang](city.name)}</p>
      <div className="chart-block">
        <h4>{cc.communeTitle[lang](city.name)}</h4>
        <p className="chart-caption">{cc.communeCaption[lang](city.name)}</p>
        <CityMap slug={slug} cityName={city.name} variant="explorer" />
      </div>
    </article>
  );
}
