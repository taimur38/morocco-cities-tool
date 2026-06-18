// Copies parquet outputs from the spatial-equilibrium pipeline into public/data
// so the Vite dev server (and the static build) can serve them at /data/*.parquet.
//
// Run via: npm run prepare-data
//
// This is intentionally a copy (not a symlink) so the bundled /dist works on any host.
// Re-run whenever the upstream pipeline regenerates outputs.

import { mkdirSync, copyFileSync, existsSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const SRC = resolve(root, '..', '04-spatial-equilibrium', 'generated');
const DEST = resolve(root, 'public', 'data');

const FILES = [
  'city_panel.parquet',
  'city_complexity.parquet',
  'industry_complexity.parquet',
  'city_commune_lookup.parquet',
  'city_shift_share.parquet',
  'city_industry_shift_share.parquet',
];

// English labels for CNSS industries — the upstream parquet only carries the
// French LIBELLE_ACTIVITE, so we ship this CSV alongside and join client-side.
const EXTRA = [
  { from: resolve(root, '..', 'data', 'industry_translations.csv'), name: 'industry_translations.csv' },
];

if (!existsSync(SRC)) {
  console.error(`[copy-data] source not found: ${SRC}`);
  console.error('  Run the 04-spatial-equilibrium pipeline first.');
  process.exit(1);
}

mkdirSync(DEST, { recursive: true });

let copied = 0;
const missing = [];
for (const f of FILES) {
  const from = join(SRC, f);
  const to = join(DEST, f);
  if (!existsSync(from)) {
    missing.push(f);
    continue;
  }
  copyFileSync(from, to);
  copied += 1;
}

console.log(`[copy-data] copied ${copied}/${FILES.length} parquet files to ${DEST}`);
if (missing.length) {
  console.warn(`[copy-data] missing in source: ${missing.join(', ')}`);
}

for (const e of EXTRA) {
  if (!existsSync(e.from)) {
    console.warn(`[copy-data] missing: ${e.from}`);
    continue;
  }
  copyFileSync(e.from, join(DEST, e.name));
  console.log(`[copy-data] copied ${e.name}`);
}

// Copy per-city geojson directory (city_maps_geo/*.geojson + index.json)
const GEO_SRC = join(SRC, 'city_maps_geo');
const GEO_DEST = join(DEST, 'city_maps_geo');
if (existsSync(GEO_SRC) && statSync(GEO_SRC).isDirectory()) {
  mkdirSync(GEO_DEST, { recursive: true });
  // Mirror the source: drop stale geojsons (e.g. cities removed by merges) first.
  for (const name of readdirSync(GEO_DEST)) {
    if (name.endsWith('.geojson') || name === 'index.json') unlinkSync(join(GEO_DEST, name));
  }
  let geoCount = 0;
  for (const name of readdirSync(GEO_SRC)) {
    if (name.endsWith('.geojson') || name === 'index.json') {
      copyFileSync(join(GEO_SRC, name), join(GEO_DEST, name));
      geoCount += 1;
    }
  }
  console.log(`[copy-data] copied ${geoCount} geojson files to ${GEO_DEST}`);
} else {
  console.warn('[copy-data] city_maps_geo/ not found in source — run 06-city-maps-geo.R');
}

console.log(`[copy-data] available in public/data:`, readdirSync(DEST).join(', '));
