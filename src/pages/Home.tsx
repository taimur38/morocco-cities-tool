import { useMemo, useState } from 'react';
import { useCityPanel, useCityShiftShare } from '../data/usePanel';
import CityPicker from '../components/CityPicker';
import CityMap from '../components/charts/CityMap';
import MigrationBars from '../components/charts/MigrationBars';
import WageBars from '../components/charts/WageBars';
import MigrationVsWageScatter from '../components/charts/MigrationVsWageScatter';
import UnemploymentDensity from '../components/charts/UnemploymentDensity';
import MigrationVsLaborOutcome from '../components/charts/MigrationVsLaborOutcome';
import { useLang } from '../i18n/context';
import { useT } from '../i18n/ui';
import { homeContent } from '../i18n/content';

type WageStat = 'median' | 'mean';

export default function Home() {
  const { data, loading, error } = useCityPanel();
  const { data: cityShiftShare } = useCityShiftShare();
  const [wageStat, setWageStat] = useState<WageStat>('median');
  const { lang } = useLang();
  const t = useT();
  const c = homeContent;

  // Per-city regression-FE wage-premium growth, keyed for O(1) lookup in the scatter.
  const feGrowthByCity = useMemo(() => {
    if (!cityShiftShare) return undefined;
    const m = new Map<number, number>();
    for (const r of cityShiftShare) {
      if (r.wage_premium_fe_growth != null) m.set(r.city_id, r.wage_premium_fe_growth);
    }
    return m;
  }, [cityShiftShare]);

  const statAdj = t(`stat.adj.${wageStat}`);

  return (
    <article>
      <h2>{c.title[lang]}</h2>
      <p>{c.introP1[lang]}</p>
      <p>{c.introP2[lang]}</p>

      <h3>{c.whatIsCityH3[lang]}</h3>
      <p>{c.cityDefP[lang]}</p>
      <div className="chart-block">
        <h4>{c.agadirTitle[lang]}</h4>
        <p className="chart-caption">{c.agadirCaption[lang]}</p>
        <CityMap slug="agadir" cityName="Agadir" variant="definition" />
      </div>

      {loading && <p className="loading">{t('home.loadingPanel')}</p>}
      {error && (
        <p className="error">{t('home.panelError', { msg: error.message })}</p>
      )}

      {data && (
        <>
          <h3>{c.migrationH3[lang]}</h3>
          <p>{c.migrationP[lang]}</p>
          <div className="chart-block">
            <h4>{c.migBarsTitle[lang]}</h4>
            <p className="chart-caption">{c.migBarsCaption[lang]}</p>
            <MigrationBars rows={data} />
          </div>
          <p>{c.bigCitiesP[lang]}</p>
          <p>{c.casaRabatP[lang]}</p>
          <div className="chart-block">
            <h4>{c.casaMapTitle[lang]}</h4>
            <p className="chart-caption">{c.cityMapCaption[lang]}</p>
            <CityMap slug="casablanca" cityName="Casablanca" />
          </div>
          <div className="chart-block">
            <h4>{c.rabatMapTitle[lang]}</h4>
            <p className="chart-caption">{c.cityMapCaption[lang]}</p>
            <CityMap slug="rabat" cityName="Rabat" />
          </div>
          <p className="footnote">{c.footnoteDagger[lang]}</p>

          <h3>{c.forcesH3[lang]}</h3>
          <p>{c.forcesP[lang]}</p>
          <div className="chart-block">
            <div className="chart-toolbar">
              <label className="chart-toolbar-control">
                {t('charts.wageStatistic')}
                <select
                  className="chart-toolbar-select"
                  value={wageStat}
                  onChange={(e) => setWageStat(e.target.value as WageStat)}
                >
                  <option value="median">{t('charts.median')}</option>
                  <option value="mean">{t('charts.mean')}</option>
                </select>
              </label>
            </div>
            <h4>{c.wageBarsTitle[lang]}</h4>
            <p className="chart-caption">{c.wageBarsCaption[lang](statAdj)}</p>
            <WageBars rows={data} wageStat={wageStat} />
          </div>

          <p>{c.scatterIntroP[lang]}</p>
          <div className="chart-block">
            <h4>{c.scatterTitle[lang]}</h4>
            <p className="chart-caption">{c.scatterCaption[lang]}</p>
            <MigrationVsWageScatter rows={data} wageStat={wageStat} />
          </div>

          <p>{c.offDiagonalP[lang]}</p>

          <h3>{c.compositionH3[lang]}</h3>
          <p>{c.compositionP[lang]}</p>
          <div className="chart-block">
            <h4>{c.fePremiumTitle[lang]}</h4>
            <p className="chart-caption">{c.fePremiumCaption[lang]}</p>
            <MigrationVsWageScatter
              rows={data}
              yMode="fe"
              feGrowthByCity={feGrowthByCity}
              alwaysLabel={['Marrakesh', 'Tangier']}
              showQuadrantLegend={false}
            />
          </div>

          <p>{c.unempIntroP[lang]}</p>
          <UnemploymentDensity rows={data} />
          <p>{c.utilityIntroP[lang]}</p>
          <p className="formula">{c.formula[lang]}</p>
          <p>{c.utilityModelP[lang]}</p>
          <p>{c.spatialEqP[lang]}</p>
          <p>{c.readingP[lang]}</p>
          <div className="chart-block">
            <h4>{c.laborOutcomeTitle[lang]}</h4>
            <p className="chart-caption">{c.laborOutcomeCaption[lang]}</p>
            <MigrationVsLaborOutcome rows={data} feGrowthByCity={feGrowthByCity} />
          </div>
          <p>{c.summaryP[lang]}</p>
          <p>{c.caveatsP[lang]}</p>
          <p>{c.closingP[lang]}</p>
          <p className="footnote">{c.footnoteDoubleDagger[lang]}</p>

          <h3 id="cities">{c.exploreH3[lang]}</h3>
          <p>{c.exploreP[lang]}</p>
          <CityPicker rows={data} />

          <details className="references">
            <summary>{c.referencesSummary[lang]}</summary>
            <ul>
              <li>
                Boeri, T., Ichino, A., Moretti, E., &amp; Posch, J.
                (2019). <em>Wage Equalization and Regional
                Misallocation: Evidence from Italian and German
                Provinces</em>. NBER Working Paper No. 25612.
                (Published in <em>Journal of the European Economic
                Association</em> 19(6), 2021.)
              </li>
              <li>
                Glaeser, E. L., &amp; Gottlieb, J. D. (2009). The
                Wealth of Cities: Agglomeration Economies and
                Spatial Equilibrium in the United States.{' '}
                <em>Journal of Economic Literature</em>, 47(4),
                983–1028.{' '}
                <a
                  href="https://doi.org/10.1257/jel.47.4.983"
                  target="_blank"
                  rel="noreferrer"
                >
                  doi.org/10.1257/jel.47.4.983
                </a>
              </li>
              <li>
                GHSL. (2019). <em>Global Human Settlement Layer —
                Functional Urban Areas</em>. European Commission
                Joint Research Centre.{' '}
                <a
                  href="https://human-settlement.emergency.copernicus.eu/ghs_fua.php"
                  target="_blank"
                  rel="noreferrer"
                >
                  human-settlement.emergency.copernicus.eu
                </a>
              </li>
              <li>
                Gollin, D., Kirchberger, M., &amp; Lagakos, D.
                (2017). <em>In Search of a Spatial Equilibrium in
                the Developing World</em>. NBER Working Paper No.
                23916.{' '}
                <a
                  href="https://www.nber.org/papers/w23916"
                  target="_blank"
                  rel="noreferrer"
                >
                  nber.org/papers/w23916
                </a>
              </li>
              <li>
                Harris, J. R., &amp; Todaro, M. P. (1970). Migration,
                Unemployment and Development: A Two-Sector Analysis.{' '}
                <em>American Economic Review</em>, 60(1), 126–142.
              </li>
              <li>
                Karibi, K., Kharmich, H., &amp; El Harrouni, K.
                (2024). Urban Policy and Transformation in Morocco.
                In <em>Morocco Handbook</em> (Ch. 14).
              </li>
              <li>
                Lall, S., Mahgoub, A., Maria, A., Touati, A., &amp;
                Acero, J. L. (2019). <em>Leveraging Urbanization to
                Promote a New Growth Model While Reducing Territorial
                Disparities in Morocco: Urban and Regional
                Development Policy Note</em>. World Bank.{' '}
                <a
                  href="https://doi.org/10.1596/978-1-4648-1433-4"
                  target="_blank"
                  rel="noreferrer"
                >
                  doi.org/10.1596/978-1-4648-1433-4
                </a>
              </li>
              <li>
                Roback, J. (1982). Wages, Rents, and the Quality of
                Life. <em>Journal of Political Economy</em>, 90(6),
                1257–1278.
              </li>
              <li>
                Rosen, S. (1979). Wage-based indexes of urban
                quality of life. In P. M. Mieszkowski &amp; M. R.
                Straszheim (Eds.), <em>Current Issues in Urban
                Economics</em>. Johns Hopkins University Press.
              </li>
            </ul>
          </details>
        </>
      )}
    </article>
  );
}
