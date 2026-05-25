# Cities tool — narrative outline

Argument scaffold for the Home page. Each section lists its purpose,
chart, and the beats the prose needs to hit. Copy yet to be written.

---

## §0 — How are Morocco's cities doing?

- **Purpose:** Frame the question. Define "city" so the rest of the
  page has a unit of analysis.
- **Chart:** none.
- **Beats:**
  - We want to evaluate city performance.
  - A city = a local labor market (commuting catchment).
  - Operationalized via GHSL Functional Urban Areas; communes →
    63 cities (+ 3 manual southern centers).

---

## §1 — Migration: people vote with their feet

- **Purpose:** Establish migration as the headline outcome signal.
- **Chart:** Top/bottom 10 net internal migration, 2014–2024 (% of
  sedentary population).
- **Beats:**
  - Direct revealed-preference measure.
  - Decade of net flows, normalized by sedentary population.
  - Brief callouts on the extremes (without explaining yet).

### §1b — Aside: why the unit of analysis matters

- **Purpose:** Defend the FUA-based city definition by directly contesting
  the "Casablanca and Rabat are shrinking" narrative that appears in the
  policy literature.
- **Chart (candidate):** Side-by-side bars or arrows showing two growth
  rates per major city: (a) commune-level (e.g., commune of Casablanca,
  commune of Rabat) and (b) FUA-based aggregate. Highlight the cases
  where the sign flips.
- **Sources to cite / push back on:**
  - Handbook ch.14 (Karibi, Kharmich, El Harrouni 2024) — claims
    Casablanca AAGR fell to −0.38% (2014–24) and Rabat to −1.04%, using
    administrative/commune-level census figures.
  - Lall et al. 2019 (World Bank) — already notes the same pattern with
    earlier-decade data: Greater Casablanca +1.6% vs. commune of
    Casablanca +1.0%; Rabat–Salé–Kenitra +1.3% vs. Rabat commune −0.8%.
    The 2019 note **already flags this as a measurement issue** ("the
    concentration of population around — not within — larger cities").
- **Argument:**
  - Commune boundaries are an administrative artifact frozen during a
    period of rapid suburbanization. Treating a single core commune as
    "the city" measures the donut, not the donut + hole.
  - The FUA aggregation (GHSL + interacting communes) tracks the actual
    labor market. Under this definition, Casablanca and Rabat are
    growing — not shrinking. The "decline" disappears when you draw the
    boundary at the commuting catchment instead of the historic city
    wall.
  - This isn't only a Moroccan story — it's the standard reason OECD
    and others moved to FUA-style metro definitions globally.
- **Tone:** Brief and confident, not pedantic. Treat it as a useful
  worked example of why "what is a city" matters before you start
  ranking them.

---

## §2 — What's driving the moves? Jobs and wages

- **Purpose:** Introduce the first candidate explanation — labor
  income.
- **Chart:** Top/bottom 10 wage CAGR, 2014–2024 (CNSS formal sector).
- **Beats:**
  - Natural first hypothesis: people chase higher-paying labor
    markets.
  - Source: CNSS microdata; CAGR of average daily wage.
  - Setup for the joint view in §3.

---

## §3 — Putting the two changes together

- **Purpose:** Test the wage story against migration in one frame;
  expose off-diagonal cases that wages alone can't explain.
- **Chart:** Net migration (X) vs wage CAGR (Y), with national-norm
  reference lines and quadrant captions.
- **Beats:**
  - Spatial-equilibrium logic: rising labor demand should lift both
    pay and population.
  - Reference lines = national norms (aggregate wage CAGR;
    cross-city mean migration).
  - Off-diagonal quadrants are the interesting ones — preview the
    "wage isn't the whole story" pivot.

---

## §4 — But the wage isn't the whole story

This is the conceptual core. Three sub-beats, then a formula, then
the comparison chart.

### §4a — Cost of living
- **Purpose:** Name the first omitted variable.
- **Chart:** none.
- **Beats:**
  - A wage premium evaporates if prices are higher.
  - We don't have city-level CPI for Morocco — parked, not measured.
  - Flag as the natural next variable.

### §4b — Probability of finding work
- **Purpose:** Name the second omitted variable, and earn it with
  data (unlike cost of living, this one we can measure).
- **Chart:** Slim full-width KDE of city unemployment rates (2024),
  with Casablanca and Oujda marked as vertical reference lines.
- **Beats:**
  - Unemployment is high in Morocco, and the cross-city spread is
    wide (more so than in comparator countries).
  - The wage that matters is conditional on getting hired.
  - Casa vs Oujda as anchoring example of the spread.

### §4c — A utility framing
- **Purpose:** Compress wages + cost of living + employment odds
  into a single object.
- **Chart:** none — just the formula.
- **Display:**

> U = (wage / cost of living) × Pr(employed)

- **Beats:**
  - People (loosely) choose the city that maximizes utility.
  - We can't observe cost of living; we can observe wages and
    employment probability.

### §4d — Spatial equilibrium

Two paragraphs: a definition, then an interpretation that shows
what the framing buys us when reading the data.

**Paragraph 1 — definition.**
- Open with "Spatial equilibrium is the idea that…".
- Utility tends to equalize across places; if any city offered a
  systematically higher U, workers would move there until
  something gave (wages fell, cost of living rose, or
  unemployment climbed) and the gap closed.
- No free lunches in space.

**Paragraph 2 — interpretation.**
- Lead question: if utility is equalized, how should we read the
  labor-market outcomes we observe?
- A high wage could be offset by a higher cost of living — real
  wages would then tend to be similar across space.
- A high wage could equally be offset by a lower probability of
  employment, as workers arrive in hopes of capturing the wage and
  bid down their chances of landing it. In that view, rising
  unemployment can sometimes be a symptom of relative success.
- Combining wage / unemployment with net migration — voting with
  one's feet — helps disambiguate the two stories.
- Concrete example: Tetouan has seen significant net migration
  alongside a significant rise in unemployment. End on the
  rhetorical question: should we read its rising unemployment as
  a symptom of relative success?

### §4e — Net migration vs labor-market outcomes
- **Purpose:** Give the reader a way to inspect the data with the
  equilibrium framing in hand. Neutral exploration — not a claim
  about which variable explains migration.
- **Chart:** Net migration (X) vs labor-market outcome (Y), with a
  dropdown that toggles Y between Δ unemployment (2014→2024, pp,
  the default) and wage CAGR. National-norm reference lines on
  both axes.
- **Beats:**
  - Same X as §3, swappable Y.
  - Default view is unemployment because it's the new variable
    being introduced here; wage view is the toggle.
  - Framing: a way to see the pattern. Avoid language that
    promises a correlation or a clear winner between the two
    variables.

---

## §5 — Pick a city

- **Purpose:** Hand off from narrative to lookup.
- **Chart:** none — city picker.
- **Beats:**
  - 2014↔2024 levels available per-city.
  - Population, participation, wages, migration, complexity.
