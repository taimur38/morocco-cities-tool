import { useEffect, useState } from 'react';
import type { FeatureCollection, Feature, MultiPolygon, Polygon } from 'geojson';

export type CommuneProps = {
  kind: 'commune' | 'fua';
  commune_id: string | null;
  commune_name: string | null;
  mig_10yr_net_pct: number | null;
  // Census-2024 commune levels, attached upstream by 06-city-maps-geo.R. Drive
  // the indicator dropdown on the explorer map. Null where the census has no
  // value for a commune. No wage field: CNSS wages are ville-level, not commune.
  unemployment_rate: number | null;
  lfp_rate: number | null;
  tertiary_pct: number | null;
  population: number | null;
  slum_pct: number | null;
};

export type CityFeature = Feature<Polygon | MultiPolygon, CommuneProps>;
export type CityFeatureCollection = FeatureCollection<Polygon | MultiPolygon, CommuneProps>;

export type BaseCommuneProps = { commune_id: string };
export type BaseFeature = Feature<Polygon | MultiPolygon, BaseCommuneProps>;
export type BaseFeatureCollection = FeatureCollection<Polygon | MultiPolygon, BaseCommuneProps>;

const cache = new Map<string, Promise<CityFeatureCollection>>();

function fetchGeo(slug: string): Promise<CityFeatureCollection> {
  const url = `/data/city_maps_geo/${slug}.geojson`;
  return fetch(url).then((r) => {
    if (!r.ok) throw new Error(`failed to fetch ${url}: ${r.status}`);
    return r.json() as Promise<CityFeatureCollection>;
  });
}

type State = {
  data: CityFeatureCollection | null;
  loading: boolean;
  error: Error | null;
};

export function useCityGeo(slug: string): State {
  const [state, setState] = useState<State>({ data: null, loading: true, error: null });

  useEffect(() => {
    let cancelled = false;
    setState({ data: null, loading: true, error: null });

    let p = cache.get(slug);
    if (!p) {
      p = fetchGeo(slug);
      cache.set(slug, p);
    }
    p.then(
      (data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      },
      (err: Error) => {
        if (!cancelled) {
          cache.delete(slug);
          setState({ data: null, loading: false, error: err });
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return state;
}

// National base: all Moroccan communes, geometry only. One-time fetch shared
// across every city profile.
let basePromise: Promise<BaseFeatureCollection> | null = null;
function fetchBase(): Promise<BaseFeatureCollection> {
  const url = '/data/city_maps_geo/morocco_communes_base.geojson';
  return fetch(url).then((r) => {
    if (!r.ok) throw new Error(`failed to fetch ${url}: ${r.status}`);
    return r.json() as Promise<BaseFeatureCollection>;
  });
}

type BaseState = { data: BaseFeatureCollection | null; loading: boolean; error: Error | null };

export function useNationalBase(): BaseState {
  const [state, setState] = useState<BaseState>({ data: null, loading: true, error: null });
  useEffect(() => {
    let cancelled = false;
    if (!basePromise) basePromise = fetchBase();
    basePromise.then(
      (data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      },
      (err: Error) => {
        if (!cancelled) {
          basePromise = null;
          setState({ data: null, loading: false, error: err });
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);
  return state;
}
