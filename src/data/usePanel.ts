import { useEffect, useMemo, useState } from 'react';
import { loadParquet } from './loadParquet';
import { loadCsv } from './loadCsv';
import type {
  CityPanelRow,
  CityComplexityRow,
  CityShiftShareRow,
  CityIndustryShiftShareRow,
  IndustryComplexityRow,
} from './types';

type State<T> = { data: T | null; loading: boolean; error: Error | null };

// Module-level cache so route changes don't re-fetch.
const cache = new Map<string, Promise<unknown>>();

function cached<T>(path: string, fetcher: (p: string) => Promise<T>): Promise<T> {
  let p = cache.get(path) as Promise<T> | undefined;
  if (!p) {
    p = fetcher(path);
    cache.set(path, p);
  }
  return p;
}

function useResource<T>(path: string, fetcher: (p: string) => Promise<T>): State<T> {
  const [state, setState] = useState<State<T>>({ data: null, loading: true, error: null });
  useEffect(() => {
    let live = true;
    cached<T>(path, fetcher)
      .then((data) => live && setState({ data, loading: false, error: null }))
      .catch((error) => live && setState({ data: null, loading: false, error }));
    return () => {
      live = false;
    };
  }, [path, fetcher]);
  return state;
}

const fetchParquet = <T>(p: string) => loadParquet<T>(p);
const fetchCsv = (p: string) => loadCsv(p);

export const useCityPanel = () => useResource<CityPanelRow[]>('/data/city_panel.parquet', fetchParquet);
export const useCityComplexity = () => useResource<CityComplexityRow[]>('/data/city_complexity.parquet', fetchParquet);
export const useCityShiftShare = () => useResource<CityShiftShareRow[]>('/data/city_shift_share.parquet', fetchParquet);
export const useCityIndustryShiftShare = () =>
  useResource<CityIndustryShiftShareRow[]>('/data/city_industry_shift_share.parquet', fetchParquet);
export const useIndustryComplexity = () =>
  useResource<IndustryComplexityRow[]>('/data/industry_complexity.parquet', fetchParquet);

// Returns a Map<LIBELLE_ACTIVITE (FR), LIBELLE_EN>. Components fall back to the
// French label when an entry is missing — keeps things readable mid-pipeline if
// the CSV lags the parquet.
export function useIndustryTranslations(): State<Map<string, string>> {
  const csv = useResource<Record<string, string>[]>(
    '/data/industry_translations.csv',
    fetchCsv,
  );
  const data = useMemo(() => {
    if (!csv.data) return null;
    const m = new Map<string, string>();
    for (const r of csv.data) {
      if (r.LIBELLE_ACTIVITE && r.LIBELLE_EN) m.set(r.LIBELLE_ACTIVITE, r.LIBELLE_EN);
    }
    return m;
  }, [csv.data]);
  return { data, loading: csv.loading, error: csv.error };
}
