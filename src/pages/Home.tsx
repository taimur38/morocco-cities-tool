import { useCityPanel } from '../data/usePanel';
import CityPicker from '../components/CityPicker';
import MigrationBars from '../components/charts/MigrationBars';
import WageBars from '../components/charts/WageBars';
import MigrationVsWageScatter from '../components/charts/MigrationVsWageScatter';
import ExpectedWageDecomposition from '../components/charts/ExpectedWageDecomposition';

export default function Home() {
  const { data, loading, error } = useCityPanel();

  return (
    <article>
      <h2>How are Morocco's cities doing?</h2>
      <p>
        We want to examine the performance of cities in Morocco — but to do that we first need to
        say what a city <em>is</em>. We treat cities as <strong>local labor markets</strong>: the
        commuting catchments inside which workers and firms actually meet. We use <strong>Functional
        Urban Areas</strong> from the Global Human Settlement Layer (GHSL) to aggregate communes
        into 63 cities. A city is the set of communes that intersect a single FUA, plus three
        manually-added southern centers (Laayoune, Es-Semara, Tan Tan).
      </p>

      {loading && <p className="loading">Loading panel data…</p>}
      {error && <p className="error">Could not load panel: {error.message}</p>}

      {data && (
        <>
          <h3>Migration: people vote with their feet</h3>
          <p>
            Once we have cities, the question is how each one is performing. The most direct
            signal is migration. If a place is succeeding, people move there. If it's failing,
            they leave. Below are the biggest gainers and losers in net internal migration over
            the last decade, expressed as a percent of the sedentary population (the people who
            were already there).
          </p>
          <div className="chart-block">
            <h4>Net internal migration, 2014–2024</h4>
            <p className="chart-caption">
              Top 10 gainers and bottom 10 losers among Morocco's 63 functional urban areas.
            </p>
            <MigrationBars rows={data} />
          </div>

          <h3>What's driving the moves? Jobs and wages</h3>
          <p>
            One natural explanation for these migration patterns is the labor market. Maybe
            people move to Tangier because that's where the good jobs are. To check, we look
            at how much average formal-sector wages have grown across cities, using the CNSS
            (social security) microdata. A high wage CAGR tells us a city's pay envelope is
            expanding.
          </p>
          <div className="chart-block">
            <h4>Wage growth in the formal sector, 2014–2024</h4>
            <p className="chart-caption">
              CAGR of average daily wage among CNSS-registered workers. Top 10 gainers and
              bottom 10 losers.
            </p>
            <WageBars rows={data} />
          </div>

          <h3>Putting the two changes together</h3>
          <p>
            The bars above tell each story separately — migration on its own, wage growth on its
            own. Plotting one against the other lines them up and exposes the spatial-equilibrium
            logic. If labor demand is rising in a city, we'd expect both to move up: wages grow
            faster than the country and people show up. If demand is contracting, both fall. The
            interesting cases sit in the off-diagonals — wages growing but people leaving (supply
            outpacing demand, or non-wage drivers), or people arriving despite slow wage growth.
            The dashed lines mark the national norms: average city net migration over the decade
            and the CAGR of the aggregate national daily wage.
          </p>
          <div className="chart-block">
            <h4>Net migration vs. wage growth</h4>
            <p className="chart-caption">
              Each point is one city. Hover for details; the cities furthest from the national
              average on either axis are labeled.
            </p>
            <MigrationVsWageScatter rows={data} />
          </div>

          <h3>But the wage isn't the whole story</h3>
          <p>
            Unemployment in Morocco is high and varies a lot across cities — much more so than
            in comparator countries. If you're considering a move to look for work, the wage
            you'd actually get is the wage <em>conditional on being employed</em>, multiplied by
            the probability of finding a job in the first place. We call this the{' '}
            <strong>expected wage</strong>:
          </p>
          <p className="formula">E[w] = Pr(employed) × wage</p>
          <p>
            The change in the expected wage decomposes cleanly into two pieces — the change
            in the wage itself, and the change in the probability of being employed. Both can
            move in the same direction or in opposite directions, and the spatial-equilibrium
            response to in-migration depends on whichever combination raises E[w]. A city
            where wages climb and unemployment also climbs is still a positive demand shock,
            just one whose supply response (workers showing up) outran the labor-demand
            expansion. Plotting the two components against each other exposes those cases.
          </p>
          <div className="chart-block">
            <h4>Decomposing the change in expected wage</h4>
            <p className="chart-caption">
              Each city placed by its 2014–2024 wage CAGR (x) and the change in its
              unemployment rate in percentage points (y). Quadrant lines mark the cross-city
              medians; dot color flags whether each city's expected wage grew by more
              (green) or less (red) than the median.
            </p>
            <ExpectedWageDecomposition rows={data} />
          </div>

          <h3 id="cities">Pick a city</h3>
          <p className="muted">
            Each city has a profile with 2014 ↔ 2024 numbers on population, participation,
            wages, migration, and complexity.
          </p>
          <CityPicker rows={data} />
        </>
      )}
    </article>
  );
}
