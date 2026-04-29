import { cleanCityName } from './derive';

// Deterministic mapping between a city's display name and a URL-safe slug.
export function citySlug(name: string): string {
  return cleanCityName(name)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
