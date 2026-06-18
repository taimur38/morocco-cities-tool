import { useState } from 'react';
import { useCityPanel } from '../data/usePanel';
import CityPicker from '../components/CityPicker';
import CityLink from '../components/CityLink';
import CityMap from '../components/charts/CityMap';
import MigrationBars from '../components/charts/MigrationBars';
import WageBars from '../components/charts/WageBars';
import MigrationVsWageScatter from '../components/charts/MigrationVsWageScatter';
import UnemploymentDensity from '../components/charts/UnemploymentDensity';
import MigrationVsLaborOutcome from '../components/charts/MigrationVsLaborOutcome';

type WageStat = 'median' | 'mean';

export default function Home() {
  const { data, loading, error } = useCityPanel();
  const [wageStat, setWageStat] = useState<WageStat>('median');

  return (
    <article>
      <h2>Morocco's cities over the past decade</h2>
      <p>
        Cities matter for Morocco's economy. In 2019, cities were
        estimated to generate 75% of national GDP, 80% of total tax
        receipts and 60% of total employment (Lall et al. 2019).
        Assessing the performance of Morocco's cities can therefore
        yield critical insights into Morocco's aggregate growth
        performance, as it will reveal which cities are succeeding and
        which are failing. It will also help generate strong
        hypotheses as to what is constraining their growth.
      </p>
      <p>
        To make progress on this topic, it is necessary to define
        (1) the boundaries of a city and (2) a
        framework to assess economic performance at the subnational
        level. In thinking about the economic growth of cities, it is
        useful to consider a city as an integrated labor market
        rather than at the administratively defined boundary. To
        identify the sets of communes that group together into a
        labor market and form a city, this article makes use of the
        Functional Urban Area definitions from the Global Human
        Settlement Layer (2019). It then introduces a framework which
        leverages the concept of spatial equilibrium, tailored to
        Morocco's specific context, to evaluate their relative
        performance over the past 10 years. Finally, a city dashboard
        allows readers to investigate the evolution of their own city
        over the past decade, and form hypotheses as to whether city
        growth is more constrained by labor demand or labor supply.
      </p>

      <h3>What is a city?</h3>
      <p>
        For the purpose of economic analysis, we evaluate a city as
        a labor market. This definition is in tension with the
        administrative definition of the city, but it captures the
        fact that workers and consumers are constantly crossing
        administrative boundaries in the course of living their
        lives, which includes going to work, shopping, or seeking
        services. The Functional Urban Area (FUA) framework
        developed by the Global Human Settlement Layer uses a
        geospatial model which estimates the boundaries of a city
        based on fine-grained population density data and commuting
        patterns in example cities (see{' '}
        <a
          href="https://human-settlement.emergency.copernicus.eu/ghs_fua.php"
          target="_blank"
          rel="noopener noreferrer"
        >
          GHSL documentation
        </a>
        ). We apply this framework in order to have a consistent
        process for defining the boundary of a city in Morocco, and
        aggregate administrative data for communes intersecting with
        this boundary to form the unit of analysis for our study. The
        boundary estimations are from satellite data as of 2015, and
        after 10 years of continuous development are arguably out of
        date, and we aim to improve on these boundaries in future
        work. We make four important manual corrections — we assign
        Ain el Aouda and Kenitra to the Rabat FUA, and we assign
        Deroua and Berrechid to the Casablanca FUA. While the boundary
        definitions used here can be improved, and it is an important
        question to refine them, we continue with our analysis at this
        level as it establishes a solid and systematic frame of
        reference to operate from. As an example,{' '}
        <CityLink name="Agadir" /> is visualized below: the dashed
        boundary comes from the GHSL definition, and the labelled
        communes are those that our process then aggregates to form
        definitions for each city. Each city's boundaries can be
        seen on its respective city profile page.
      </p>
      <div className="chart-block">
        <h4>The Agadir functional urban area</h4>
        <p className="chart-caption">
          Dashed line: GHSL functional area. Shaded polygons: the
          constituent communes our analysis aggregates into a single
          city.
        </p>
        <CityMap slug="agadir" cityName="Agadir" variant="definition" />
      </div>

      {loading && <p className="loading">Loading panel data…</p>}
      {error && <p className="error">Could not load panel: {error.message}</p>}

      {data && (
        <>
          <h3>Migration: people vote with their feet</h3>
          <p>
            One key difference between economic growth at the country
            level and at the subnational level is that people are
            more free to move across borders. It is easier for
            someone to move from <CityLink name="Oujda" /> to{' '}
            <CityLink name="Tangier" /> than it may be to move to
            the United States. Therefore, if Tangier experiences a
            positive economic shock relative to the rest of the
            country, it is likely to motivate a much stronger
            migration response than growth at the national level
            would draw from its neighbouring countries. This allows
            us to use net
            migration as a key indicator of the success or failure of
            a city in providing a good life for its people. People
            vote with their feet: if people are on net leaving, it is
            a strong signal that the city is not meeting the needs of
            its people, and if people are arriving in droves, the
            city might be getting something right. According to HCP
            data, roughly one in five Moroccans now lives in a
            different commune than they did in 2014. The graph below
            shows the top 10 gainers and bottom 10 losers in terms of
            growth rate among Morocco's functional urban areas.
          </p>
          <div className="chart-block">
            <h4>Net internal migration, 2014–2024</h4>
            <p className="chart-caption">
              Top 10 gainers and bottom 10 losers among the 59 cities
              in our analysis. Expressed as a percent of the
              2014 resident population — i.e. "Tangier gained 54% of
              its 2014 population on net through migration."
            </p>
            <MigrationBars rows={data} />
          </div>
          <p>
            Of the big cities, <CityLink name="Tangier" /> is
            extremely fast growing, followed by{' '}
            <CityLink name="Marrakesh" />, <CityLink name="Agadir" />,{' '}
            <CityLink name="Fez" />, <CityLink name="Casablanca" /> and{' '}
            <CityLink name="Rabat" />. Cities in the southern
            provinces like <CityLink name="Dakhla" /> and{' '}
            <CityLink name="Boujdour" /> also make the top ten, and{' '}
            <CityLink name="Tétouan" /> rounds out the list as another
            fast-growing city in the North by Tangier.
          </p>
          <p>
            A closer look at the migration patterns within the
            communes considered as part of{' '}
            <CityLink name="Casablanca" /> and <CityLink name="Rabat" />{' '}
            under the FUA definition confirms that growth in
            the central communes has been low while the surrounding
            areas have been growing rapidly. One hypothesis is that
            the cost of living at the center of the city has been
            increasing significantly relative to the periphery, as
            housing growth and improvements in transportation have
            made it increasingly viable to live further away. Still,
            under the FUA definitions, both Casablanca and Rabat have
            on the whole been growing through net migration, despite
            outflows in the city center.
            <sup className="footnote-marker">†</sup>
          </p>
          <div className="chart-block">
            <h4>Net migration within the Casablanca area, 2014–2024</h4>
            <p className="chart-caption">
              Communes shaded by net internal migration. Green: net
              inflow. Red: net outflow. Dashed line: FUA boundary.
            </p>
            <CityMap slug="casablanca" cityName="Casablanca" />
          </div>
          <div className="chart-block">
            <h4>Net migration within the Rabat area, 2014–2024</h4>
            <p className="chart-caption">
              Communes shaded by net internal migration. Green: net
              inflow. Red: net outflow. Dashed line: FUA boundary.
            </p>
            <CityMap slug="rabat" cityName="Rabat" />
          </div>
          <p className="footnote">
            <sup>†</sup> Lall et al. (2019) observed a similar pattern
            in the previous decade: the central commune was shrinking
            while the wider region grew. Karibi, Kharmich and El
            Harrouni (2024) report negative growth rates for the
            cities of <CityLink name="Rabat" /> and{' '}
            <CityLink name="Casablanca" /> and conclude that the two
            largest cities are shrinking outright. Both readings use
            the historic commune as the boundary of the city, which
            in both cases corresponds to an inner urban core inside a
            much larger functional area. The FUA aggregation used
            here picks up the redistribution from core to periphery
            without reading it as shrinkage.
          </p>

          <h3>The forces driving migration patterns</h3>
          <p>
            What drives the variation in migration patterns across
            cities? If we view cities within a country as labor
            markets that are constantly interacting with one another,
            then migration can be seen as an outcome of relative
            shifts in labor demand and labor supply across cities. A
            (relative) increase in labor demand should show up in
            rising wages and higher than average net in-migration,
            whereas (relative) decreases in labor demand should
            result in falling wages and lower than average net
            migration. The graph below visualizes wage growth in the
            10 fastest and slowest growing cities using Caisse
            Nationale de Sécurité Sociale (CNSS) data, which gives
            us a window into wages in the formal sector of the
            city's economy.
          </p>
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
            <h4>Wage growth in the formal sector, 2014–2024</h4>
            <p className="chart-caption">
              CAGR of {wageStat} daily wage among CNSS-registered
              workers. Top 10 gainers and bottom 10 losers. The
              toggle above switches between median (default, more
              robust to a handful of outlier industries) and mean;
              the same choice applies to every wage chart on this
              page.
            </p>
            <WageBars rows={data} wageStat={wageStat} />
          </div>

          <p>
            Plotting wage growth together with net migration patterns
            allows us to generate hypotheses as to what has been
            driving city growth or decline over the past decade. The
            scatter graph below is divided evenly into quadrants by
            the dashed lines at their respective averages. As
            described above, cities in the top right quadrant (those
            experiencing higher than average net migration and
            faster than average growing wages) are likely to be
            experiencing a positive labor demand shock, while those
            in the bottom-left quadrant are likely to be experiencing
            a negative labor demand shock.
          </p>
          <div className="chart-block">
            <h4>Net migration vs. wage growth</h4>
            <p className="chart-caption">
              Each point is one city. Hover for details; the cities
              furthest from the national average on either axis are
              labeled.
            </p>
            <MigrationVsWageScatter rows={data} wageStat={wageStat} />
          </div>

          <p>
            The off-diagonal cases suggest that people are not
            migrating solely as a result of changing wage conditions
            between cities. Differences in cost of living determine
            how much your wage can actually purchase, and housing
            costs are typically an important source of variation
            since housing is a significant cost and is non-tradable.
            Cities in the bottom right quadrant may be inducing
            in-migration driven more by a decreasing cost of living
            relative to other cities, such that the real wage (wages
            adjusted for local purchasing power) is rising.
            Alternatively, cities in the top left may be facing
            rising relative costs of living, forcing businesses to
            pay higher wages to try to retain workers. Unfortunately,
            at this time we do not have access to reliable city-level
            cost of living data, so this dimension remains largely
            hidden in our analysis.
          </p>
          <p>
            An additional factor relevant in Morocco is the
            probability of finding work in a city. Unemployment in
            Morocco is high, and varies significantly across cities,
            far more so than in some peer countries. Unemployment in{' '}
            <CityLink name="Casablanca" /> stood at 18% in 2024,
            while in <CityLink name="Oujda" /> it was reported at
            31%. Therefore, workers may discount the average wage in
            a city by the probability of achieving that wage, in a
            dynamic similar to what is expressed in Harris and
            Todaro's (1970) model for rural-to-urban migration.
          </p>
          <UnemploymentDensity rows={data} />
          <p>
            One way to hold these ideas together is to imagine
            people are choosing a city that maximizes their utility,
            which roughly takes the form:
          </p>
          <p className="formula">
            U ={' '}
            <span className="frac">
              <span className="frac-num">wage</span>
              <span className="frac-den">cost of living</span>
            </span>{' '}
            × Pr(employed)
          </p>
          <p>
            This gives us a simplified model that can capture enough
            of the variation to be useful in explaining the
            performance of Morocco's cities.
            <sup className="footnote-marker">‡</sup> It can be
            further extended with concepts like amenities
            (non-monetary factors that adjust the attractiveness of a
            city, like crime, temperature, access to beaches, parks,
            and more), as in the Rosen–Roback framework (Rosen 1979;
            Roback 1982). Our specification also does not explicitly
            model interactions with the informal economy, which is
            significant in Morocco. At the same time, it remains
            useful to illustrate the major forces shaping the growth
            dynamic.
          </p>
          <p>
            The concept of <strong>spatial equilibrium</strong>{' '}
            captures the idea that utility tends to equalize across
            places. If any city were to offer a systematically
            higher wage, workers would move there until one of the
            other variables adjusted, whether through an increased
            cost of living, as more workers bid for the same housing
            stock, or increasing unemployment as prospective workers
            arrive at the city and are unable to find work
            (Glaeser and Gottlieb 2009).
          </p>
          <p>
            This framing then changes how we read the labor-market
            outcomes we observe. A high wage could be offset by a
            higher cost of living, in which case real wages would
            tend to be similar across space. A high wage could
            equally be offset by a lower probability of employment,
            as workers arrive in hopes of capturing the wage and bid
            down their chances of landing it. From this perspective,
            rising unemployment can sometimes be a symptom of
            relative success rather than failure. Combining these
            indicators with net migration helps disambiguate the two
            stories. <CityLink name="Tétouan" />, for example, has
            seen significant net in-migration alongside a rise in
            unemployment, more consistent with the interpretation
            that it is a relatively attractive place to be
            unemployed than that the city is in decline.
          </p>
          <div className="chart-block">
            <h4>Net migration vs labor-market outcomes</h4>
            <p className="chart-caption">
              Each point is one city. The Y axis defaults to the
              2014–2024 change in the unemployment rate
              (percentage points); use the dropdown to switch to
              wage CAGR. Dashed lines mark the national norm on
              each axis.
            </p>
            <MigrationVsLaborOutcome rows={data} />
          </div>
          <p>
            This work has done two things: redrawn the boundary of
            a city more broadly, and built a minimal framework for
            assessing the economic performance of those cities. The
            framework draws on the urban economics of spatial
            equilibrium and internal migration to interpret
            labor-market outcomes, and organises the data into a
            tool that extends to every city in the Functional Urban
            Area database from the Global Human Settlement Layer.
            Read together, these indicators can recast outcomes that
            look unfavorable in isolation — <CityLink name="Tétouan" />'s
            rising unemployment, for instance — as plausible signals
            of relative attractiveness rather than decline.
          </p>
          <p>
            At the same time, the tool and framework would benefit
            from further development and come with important
            caveats. Changes in the measured unemployment rate may
            sometimes reflect a change in the incentives of
            respondents to report that they are unemployed, rather
            than isolating changes in true unemployment. Similarly,
            changes in firms and workers registered with the CNSS
            may reflect uneven formalization driven by changing
            incentives and administrative practices, alongside real
            expansions in production, and so should be interpreted
            with some caution. Readers should ask whether an
            increase in employment in a particular sector reflects
            previously informal firms becoming registered, or new
            firms being founded and growing employment. Finally,
            internal migration patterns capture both rural-to-urban
            and urban-to-urban migration. The spatial equilibrium
            concept may describe urban-to-urban migration better
            than rural-to-urban migration (see Gollin et al. 2017),
            but without source–destination migration flows we are
            unable to disambiguate these forces. Women, in
            particular, may face additional mobility constraints
            that weaken the spatial equilibrium claim, and this
            deserves further attention and study.
          </p>
          <p>
            Even so, this tool and framework offer a strong starting
            point for analyzing the evolution of cities in Morocco,
            and help frame important questions for researchers and
            policy makers to prioritize.
          </p>
          <p className="footnote">
            <sup>‡</sup> A similar utility specification appears in
            Boeri, Ichino, Moretti and Posch (2019), in their
            analysis of regional wage equalization in Italy and
            Germany.
          </p>

          <h3 id="cities">Explore a city</h3>
          <p>
            Each city in Morocco has evolved on its own particular
            trajectory over time. City profile pages enable readers
            to go deeper in analyzing the evolution of any of the
            cities identified by the Functional Urban Area approach.
            City profile pages first clarify the borders of the
            Functional Urban Area and the communes captured by this
            definition. They provide a picture snapshot of where
            that city stands in 2024 in terms of its population,
            formal wage, unemployment rate, and an overview of its
            economic structure as well as an estimate of its
            economic complexity. Readers can compare industry wages
            in a city against the average across Morocco, as well
            as against the average wage within the city, to
            understand which industries are paying relatively higher
            or lower median wages. Then, the profile discusses how
            the city has evolved over time, starting with a map of
            net migration patterns per commune within the
            functional urban area. It locates the city within the
            net migration versus wages scatter, which helps form a
            hypothesis as to what have been the primary forces
            driving the change in net migration over the past
            decade. A shift-share decomposition further dissects
            the component changes in labor demand, and allows the
            user to understand which industries have been driving
            these changes in particular. Finally, it shows the
            emergence of new industries, and puts the unemployment
            rate into perspective. A significant gap remains in the
            analysis of cost of living, which is a key supply-side
            factor that drives migration flows. Still, the profile
            provides a strong starting point for evaluating the
            economic performance of cities in Morocco over the past
            decade.
          </p>
          <CityPicker rows={data} />

          <details className="references">
            <summary>References</summary>
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
