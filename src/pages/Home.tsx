import { useState } from 'react';
import { useCityPanel } from '../data/usePanel';
import CityPicker from '../components/CityPicker';
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
            at how formal-sector wages have grown across cities, using the CNSS (social
            security) microdata. A high wage CAGR tells us a city's pay envelope is
            expanding. The toggle below switches between the median and mean daily wage —
            median is more robust to a handful of outlier industries (e.g. phosphates in
            Ben Guerir) and is the default; the same choice applies to every wage chart
            on this page.
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
              CAGR of {wageStat} daily wage among CNSS-registered workers. Top 10 gainers
              and bottom 10 losers.
            </p>
            <WageBars rows={data} wageStat={wageStat} />
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
            <MigrationVsWageScatter rows={data} wageStat={wageStat} />
          </div>

          <h3>But the wage isn't the whole story</h3>
          <p>
            People don't move for wages alone — they move for what those wages buy them, and
            for the chance of getting a job in the first place. The first piece is{' '}
            <strong>cost of living</strong>: a 20% wage premium is hollow if rent and food
            cost 25% more. Reliable city-level price data for Morocco isn't available, so
            this stays in the background of every comparison below — but it is the natural
            next variable.
          </p>
          <p>
            The second is the <strong>probability of finding work</strong>. Unemployment in
            Morocco is high and varies sharply across cities — far more so than in
            comparator countries — so the wage you'd actually earn is the posted wage
            discounted by your odds of being hired. The cities cluster between roughly 8%
            and 25% unemployment, with the two extremes a near-doubling apart:
          </p>
          <UnemploymentDensity rows={data} />
          <p>
            One compact way to hold these together is to imagine people choosing the city
            that maximizes a utility roughly of the form
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
            <strong>Spatial equilibrium</strong> is the idea that utility tends to
            equalize across places. If any city were offering a systematically higher U
            than the rest, workers would move there until something gave way — wages
            fell, cost of living rose, or unemployment climbed — and the gap closed.
            There are no free lunches in space.
          </p>
          <p>
            If utility is equalized across cities, how should we read the labor-market
            outcomes we observe? A high wage could be offset by a higher cost of living —
            real wages would then tend to be similar across space. A high wage could
            equally be offset by a lower probability of employment, as workers arrive in
            hopes of capturing the wage and bid down their chances of landing it. In that
            view, rising unemployment can sometimes be a symptom of relative success
            rather than failure. Combining these indicators with net migration — whether
            people are voting with their feet to abandon or move into the city — helps
            disambiguate which is which. Tetouan, for example, has seen significant net
            migration alongside a significant rise in unemployment. Should we read its
            rising unemployment as a symptom of relative success?
          </p>
          <div className="chart-block">
            <h4>Net migration vs labor-market outcomes</h4>
            <p className="chart-caption">
              Each point is one city. The Y axis defaults to the 2014–2024 change in the
              unemployment rate (percentage points); use the dropdown to switch to wage
              CAGR. Dashed lines mark the national norm on each axis.
            </p>
            <MigrationVsLaborOutcome rows={data} wageStat={wageStat} />
          </div>

          <h3 id="cities">Explore a city</h3>
          <p>
            The city profile pages below put together economic indicators and
            visualizations to help understand each city's story from 2014 to 2024. We
            bring together data from the census and the CNSS, and apply our
            city-diagnostic framework and our economic-complexity methodologies to bring
            it to life. Select a city below to see its story.
          </p>
          <CityPicker rows={data} />
        </>
      )}
    </article>
  );
}
