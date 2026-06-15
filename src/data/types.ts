// Mirror of the columns in 04-spatial-equilibrium/generated/city_panel.parquet.
// Keep this in sync with 04-spatial-equilibrium/README.md.
export type CityPanelRow = {
  city_id: number;
  city_name: string;
  year: number;

  pop_total: number | null;
  pop_urban: number | null;
  wap_total: number | null;
  wap_urban: number | null;
  wap_male_total: number | null;
  wap_male_urban: number | null;

  lfp_total: number | null;
  lfp_urban: number | null;
  lfp_male_total: number | null;
  lfp_male_urban: number | null;
  employed_total: number | null;
  employed_urban: number | null;
  employed_male: number | null;
  employed_male_urban: number | null;

  unemp_rate_total: number | null;
  unemp_rate_urban: number | null;
  unemp_rate_male: number | null;
  unemp_rate_male_urban: number | null;

  nonemp_rate_total: number | null;
  nonemp_rate_urban: number | null;
  nonemp_rate_male: number | null;
  nonemp_rate_male_urban: number | null;

  cnss_workers: number | null;
  cnss_days: number | null;
  cnss_salary: number | null;
  cnss_n_sectors: number | null;
  cnss_avg_daily_wage: number | null;
  cnss_avg_annual_wage: number | null;
  cnss_avg_days_per_worker: number | null;
  cnss_median_daily_wage: number | null;

  mig_lifetime_entries: number | null;
  mig_lifetime_exits: number | null;
  mig_lifetime_net: number | null;
  mig_lifetime_sedentary: number | null;
  mig_10yr_entries: number | null;
  mig_10yr_exits: number | null;
  mig_10yr_net: number | null;
  mig_10yr_sedentary: number | null;
  mig_5yr_entries: number | null;
  mig_5yr_exits: number | null;
  mig_5yr_net: number | null;
  mig_5yr_sedentary: number | null;
  mig_international: number | null;
  mig_lifetime_net_pct: number | null;
  mig_10yr_net_pct: number | null;
  mig_5yr_net_pct: number | null;
};

export type CityComplexityRow = {
  city_id: number;
  city_name: string;
  year: number;
  eci_workers: number | null;
  eci_wages: number | null;
  diversity_workers: number | null;
  diversity_wages: number | null;
};

// One row per city, from generated/city_shift_share.parquet.
// 2014 + national_share + industry_mix + local_share + entry_share = 2024.
export type CityShiftShareRow = {
  city_id: number;
  city_name: string;
  workers_2014: number;
  workers_2024: number;
  national_share: number;
  industry_mix: number;
  local_share: number;
  entry_share: number;
  growth_total: number;
};

// One row per (city, industry), from generated/city_industry_shift_share.parquet.
export type CityIndustryShiftShareRow = {
  city_id: number;
  city_name: string;
  CODE_ACTIVITE_NMA2010: string;
  LIBELLE_ACTIVITE: string;
  section: string;
  workers_2014: number;
  workers_2024: number;
  daily_wage_2014: number | null;
  daily_wage_2024: number | null;
  national_share: number;
  industry_mix: number;
  local_share: number;
  entry_share: number;
};

// One row per (industry, year), from generated/industry_complexity.parquet.
// pci_workers / pci_wages are standardized so a national-level mean ≈ 0.
export type IndustryComplexityRow = {
  CODE_ACTIVITE_NMA2010: string;
  LIBELLE_ACTIVITE: string;
  year: number;
  pci_workers: number | null;
  pci_wages: number | null;
  ubiquity_workers: number | null;
  ubiquity_wages: number | null;
};
