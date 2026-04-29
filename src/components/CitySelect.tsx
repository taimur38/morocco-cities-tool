import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CityPanelRow } from '../data/types';
import { citySlug } from '../lib/slug';
import { cleanCityName } from '../lib/derive';

export default function CitySelect({
  rows,
  current,
}: {
  rows: CityPanelRow[];
  current: string;
}) {
  const navigate = useNavigate();
  const cities = useMemo(
    () =>
      [...new Map(rows.map((r) => [r.city_id, r])).values()]
        .map((r) => ({ slug: citySlug(r.city_name), name: cleanCityName(r.city_name) }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [rows],
  );

  return (
    <select
      className="city-select"
      value={current}
      onChange={(e) => navigate(`/city/${e.target.value}`)}
      aria-label="Select a city"
    >
      {cities.map((c) => (
        <option key={c.slug} value={c.slug}>
          {c.name}
        </option>
      ))}
    </select>
  );
}
