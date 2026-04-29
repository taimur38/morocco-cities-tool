// NACE section coloring uses the Growth Lab Metroverse `industry_groups`
// palette (`~/dev/gl-design/design-library/visualization_colors/metroverse/
// industry_groups.csv`). The Metroverse palette has 9 BLS-style buckets, so
// we semantically map each NACE Rev. 2 section into one of those buckets.
// Visually-related sections share a hue, which lets the eye pick out broad
// industry families in the treemap rather than getting lost in 22 distinct
// colors.
const METROVERSE: Record<string, string> = {
  Construction: '#A773BF',
  EducationHealth: '#F0866B',
  Financial: '#FFC034',
  Leisure: '#92CFCF',
  Manufacturing: '#498099',
  NaturalResources: '#76C799',
  Other: '#6A6AAC',
  Professional: '#d25262',
  TradeTransport: '#F28188',
};

export const SECTION_COLORS: Record<string, string> = {
  Trade: METROVERSE.TradeTransport,
  'Transport & Storage': METROVERSE.TradeTransport,
  Manufacturing: METROVERSE.Manufacturing,
  Agriculture: METROVERSE.NaturalResources,
  Mining: METROVERSE.NaturalResources,
  'Water & Waste': METROVERSE.NaturalResources,
  'Electricity & Gas': METROVERSE.NaturalResources,
  Construction: METROVERSE.Construction,
  'Admin & Support': METROVERSE.Professional,
  'Professional Services': METROVERSE.Professional,
  ICT: METROVERSE.Professional,
  'Health & Social': METROVERSE.EducationHealth,
  Education: METROVERSE.EducationHealth,
  'Finance & Insurance': METROVERSE.Financial,
  'Real Estate': METROVERSE.Financial,
  'Accommodation & Food': METROVERSE.Leisure,
  'Arts & Recreation': METROVERSE.Leisure,
  'Other Services': METROVERSE.Other,
  Other: METROVERSE.Other,
  'Public Admin': METROVERSE.Other,
  Households: METROVERSE.Other,
  Extraterritorial: METROVERSE.Other,
};

const FALLBACK = METROVERSE.Other;

export function sectionColor(name: string | undefined): string {
  if (!name) return FALLBACK;
  return SECTION_COLORS[name] ?? FALLBACK;
}
