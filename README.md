# Morocco Cities Tool

A small web app for exploring Moroccan city profiles and the spatial-equilibrium story between 2014 and 2024. Companion to `04-spatial-equilibrium/` — this directory consumes its outputs and never writes back into it.

## What's in here

- A **national overview** page (the data story) at `/`.
- A **city profile** page at `/city/:slug` (e.g. `/city/casablanca`) showing the same dimensions we care about in the paper, 2014 ↔ 2024.

## Stack

- Vite + React 18 + TypeScript
- React Router for client-side routing
- [hyparquet](https://github.com/hyparam/hyparquet) — pure-JS parquet reader, so the static build can fetch `*.parquet` directly from `/data/`
- Recharts (already a dep) for charts when we start adding them

No backend. Everything is served as static files. If parquet-over-HTTP gets too heavy later, the natural next steps are (a) shrinking the panel to a JSON snapshot, or (b) putting DuckDB-WASM in front of it for client-side SQL.

## Layout

```
06-cities-tool/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── scripts/
│   └── copy-data.mjs       # copies parquet from ../04-spatial-equilibrium/generated/
├── public/
│   └── data/               # gitignored — populated by `npm run prepare-data`
└── src/
    ├── main.tsx            # entry, mounts <BrowserRouter>
    ├── App.tsx             # routes
    ├── styles.css
    ├── components/         # Layout, CityPicker, Stat
    ├── data/               # types + parquet loaders + hooks
    ├── lib/                # slug, format helpers
    └── pages/              # Home, CityProfile, NotFound
```

## Develop

```bash
cd 06-cities-tool
npm install
npm run dev          # copies parquet, then starts vite on :5173
```

`npm run dev` runs `prepare-data` first, which copies the four parquet files (`city_panel`, `city_complexity`, `industry_complexity`, `city_commune_lookup`) from `04-spatial-equilibrium/generated/` into `public/data/`. Re-run `npm run prepare-data` whenever the upstream pipeline regenerates outputs.

## Build

```bash
npm run build        # emits dist/, ready to host as a static site
npm run preview      # serve dist/ locally
```

## Isolation from the rest of the repo

- This directory is **read-only** with respect to `04-spatial-equilibrium/` — the prep script only copies files out.
- `public/data/` is covered by the root `.gitignore` (`**/data/`) so the parquet snapshots don't end up in version control.
- The local `.gitignore` carves out `index.html` from the root's `*.html` ignore so the Vite entry point is tracked.
- No R code in here. The pipeline stays in `04-spatial-equilibrium/`.

## What's stubbed vs. real

Real:
- Routing, layout, parquet loading, the four core data hooks, the slug/format helpers
- City profile pulls real numbers from the panel + complexity files for population, participation, unemployment, non-employment, CNSS wages, migration, ECI

Stubbed (waiting for narrative + chart decisions):
- The "story" section on Home — placeholder text for the spatial-equilibrium thesis
- Charts on CityProfile — placeholder, will fill in once we decide on which views (wage trajectory, employment composition, ECI vs. real wage, etc.)
