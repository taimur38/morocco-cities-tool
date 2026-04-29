import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { citySlug } from '../lib/slug';
import { cleanCityName } from '../lib/derive';
import type { CityPanelRow } from '../data/types';

type CityEntry = { id: number; name: string; slug: string; firstLetter: string };

// Strips diacritics so "Tétouan" matches a search for "tetouan".
function fold(s: string): string {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

export default function CityPicker({ rows }: { rows: CityPanelRow[] }) {
  const cities: CityEntry[] = useMemo(() => {
    const dedup = new Map<number, string>();
    for (const r of rows) {
      if (!dedup.has(r.city_id)) dedup.set(r.city_id, cleanCityName(r.city_name));
    }
    return [...dedup.entries()]
      .map(([id, name]) => ({
        id,
        name,
        slug: citySlug(name),
        firstLetter: name.charAt(0).toUpperCase(),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);

  const [query, setQuery] = useState('');
  const q = fold(query.trim());

  const filtered = useMemo(() => (q ? cities.filter((c) => fold(c.name).includes(q)) : cities), [
    cities,
    q,
  ]);

  // Group filtered list by first letter, preserving alphabetical order.
  const groups = useMemo(() => {
    const out = new Map<string, CityEntry[]>();
    for (const c of filtered) {
      const arr = out.get(c.firstLetter) ?? [];
      arr.push(c);
      out.set(c.firstLetter, arr);
    }
    return [...out.entries()];
  }, [filtered]);

  return (
    <div className="city-directory" id="cities">
      <input
        className="city-directory-search"
        type="search"
        placeholder="Search cities…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search cities"
      />
      <p className="city-directory-count">
        {filtered.length} of {cities.length} cities
      </p>
      {groups.length === 0 && <p className="city-directory-empty">No cities match "{query}".</p>}
      {groups.map(([letter, entries]) => (
        <div key={letter} className="city-directory-letter">
          <div className="city-directory-letter-label">{letter}</div>
          <div className="city-directory-cities">
            {entries.map((c) => (
              <Link key={c.id} to={`/city/${c.slug}`}>
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
