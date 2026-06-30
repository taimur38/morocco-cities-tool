# Morocco Cities Tool

A static web app for exploring Moroccan city profiles and the spatial-equilibrium
story between 2014 and 2024. It is a companion to the Growth Lab's
`04-spatial-equilibrium` analysis pipeline: it consumes that pipeline's outputs
and never writes back into it.

## What's in here

- A **national overview** page (the data story) at `/`, with charts for
  migration, wages, employment composition, complexity, and shift-share
  decompositions.
- A **city profile** page at `/city/:slug` (e.g. `/city/casablanca`) showing the
  same dimensions, 2014 ↔ 2024, including a per-city commune map.
- **French / English** localisation, toggled in the header.

## Stack

- Vite + React 18 + TypeScript, React Router for client-side routing.
- [hyparquet](https://github.com/hyparam/hyparquet) — pure-JS parquet reader, so
  the static build fetches `*.parquet` directly from `/data/` with no backend.
- Recharts for charts; d3-geo for the commune maps.

No backend. Everything is served as static files.

## Getting the data

**Data is not committed to this repository.** `public/data/` is gitignored, so a
fresh clone has no data and the app will not render until it is provided. Request
the data bundle from the maintainer and unzip it into `public/data/`. The
expected contents are:

```
public/data/
├── city_panel.parquet
├── city_complexity.parquet
├── industry_complexity.parquet
├── city_commune_lookup.parquet
├── city_shift_share.parquet
├── city_industry_shift_share.parquet
├── industry_translations.csv      # English labels for CNSS industries
└── city_maps_geo/                 # per-city *.geojson + index.json
```

These files are produced by the upstream `04-spatial-equilibrium` pipeline (R).
Within the Growth Lab monorepo that pipeline sits alongside this tool, and
`npm run prepare-data` copies the outputs in automatically (see below). Outside
that monorepo, the files must be supplied as a bundle.

## Develop

```bash
npm install
npm run dev          # runs prepare-data, then starts Vite on :5173
```

`npm run dev` runs `prepare-data` first. That step behaves differently depending
on the checkout:

- **In the monorepo** — it copies the parquet/CSV/geojson outputs from
  `../04-spatial-equilibrium/generated/` into `public/data/`. Re-run
  `npm run prepare-data` whenever the upstream pipeline regenerates outputs.
- **Standalone** (no upstream pipeline present) — it detects that `public/data/`
  is already populated from a provided bundle and skips the copy. If the
  directory is empty it exits with instructions to obtain the bundle.

## Build

```bash
npm run build        # emits dist/, ready to host as a static site
npm run preview      # serve dist/ locally
npm run typecheck    # tsc -b --noEmit
```

## Layout

```
06-cities-tool/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── scripts/
│   └── copy-data.mjs       # populates public/data/ from the upstream pipeline
├── public/
│   └── data/               # gitignored — see "Getting the data"
└── src/
    ├── main.tsx            # entry, mounts <BrowserRouter>
    ├── App.tsx             # routes
    ├── styles.css
    ├── components/         # Layout, pickers, Stat, profile/, charts/
    ├── data/               # types + parquet/csv loaders + hooks
    ├── i18n/               # FR/EN content, context, UI strings
    ├── lib/                # slug, format, colour scales, palettes, derived metrics
    └── pages/              # Home, CityProfile, NotFound
```

## Relationship to the upstream pipeline

- This tool is **read-only** with respect to `04-spatial-equilibrium`: the prep
  script only copies files out.
- `public/data/` and the local build artifact are gitignored, so data snapshots
  never enter version control. This is why the repository can be public.
- No R code lives here; the analysis pipeline stays upstream.

## Status

The tool is feature-complete and intended for production deployment. Routing,
layout, localisation, parquet/CSV loading, the data hooks, and all charts on both
the overview and city-profile pages draw on real pipeline outputs (population,
participation, unemployment, non-employment, CNSS wages, migration, ECI,
shift-share, and commune geometries). There are no stubbed sections remaining;
the only external dependency is the data bundle described above.
