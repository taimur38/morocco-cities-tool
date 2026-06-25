import { useCallback } from 'react';
import { useLang, type Lang } from './context';

// Flat dictionary of shared, non-narrative UI strings. Page-specific prose lives
// in content.tsx; this file holds everything that recurs inside reusable chart,
// table, and map components. Values may contain {placeholders} filled by `tr`.
type Entry = Record<Lang, string>;

export const UI: Record<string, Entry> = {
  // --- Header / nav ---------------------------------------------------------
  'header.title': { en: 'Morocco Cities', fr: 'Villes du Maroc' },
  'header.overview': { en: 'Overview', fr: 'Vue d’ensemble' },
  'header.cities': { en: 'Cities', fr: 'Villes' },
  'header.switchLang': { en: 'Switch language', fr: 'Changer de langue' },

  // --- Common ---------------------------------------------------------------
  'common.loading': { en: 'Loading…', fr: 'Chargement…' },
  'common.backOverview': {
    en: '← Back to overview',
    fr: '← Retour à la vue d’ensemble',
  },
  'common.allCities': { en: '← All cities', fr: '← Toutes les villes' },
  'common.notFound': { en: 'Not found', fr: 'Introuvable' },
  'common.noCityMatch': {
    en: 'No city matches “{slug}”.',
    fr: 'Aucune ville ne correspond à « {slug} ».',
  },
  'home.loadingPanel': {
    en: 'Loading panel data…',
    fr: 'Chargement des données…',
  },
  'home.panelError': {
    en: 'Could not load panel: {msg}',
    fr: 'Échec du chargement des données : {msg}',
  },
  'cp.loadingShiftShare': {
    en: 'Loading shift-share…',
    fr: 'Chargement du shift-share…',
  },
  'cp.shiftShareError': {
    en: 'Could not load shift-share: {msg}',
    fr: 'Échec du chargement du shift-share : {msg}',
  },

  // --- City directory / select ---------------------------------------------
  'directory.search': { en: 'Search cities…', fr: 'Rechercher une ville…' },
  'directory.searchAria': { en: 'Search cities', fr: 'Rechercher une ville' },
  'directory.count': { en: '{n} of {total} cities', fr: '{n} sur {total} villes' },
  'directory.empty': {
    en: 'No cities match “{query}”.',
    fr: 'Aucune ville ne correspond à « {query} ».',
  },
  'select.aria': { en: 'Select a city', fr: 'Choisir une ville' },

  // --- Generic chart toolbar ------------------------------------------------
  'charts.colorBy': { en: 'Color by', fr: 'Couleur selon' },
  'charts.yAxis': { en: 'Y axis:', fr: 'Axe Y :' },
  'charts.wageStatistic': { en: 'Wage statistic:', fr: 'Statistique salariale :' },
  'charts.median': { en: 'Median', fr: 'Médiane' },
  'charts.mean': { en: 'Mean', fr: 'Moyenne' },
  'charts.dragToZoom': {
    en: 'Drag a rectangle to zoom in',
    fr: 'Tracez un rectangle pour zoomer',
  },
  'charts.zoomedIn': { en: 'Zoomed in', fr: 'Zoom activé' },
  'charts.resetZoom': { en: 'Reset zoom', fr: 'Réinitialiser le zoom' },
  'charts.sizedBy2024': {
    en: 'Sized by 2024 workers · {n} total',
    fr: 'Taille selon les effectifs 2024 · {n} au total',
  },
  'charts.sizedBy2014': {
    en: 'Sized by 2014 workers · {n} total',
    fr: 'Taille selon les effectifs 2014 · {n} au total',
  },

  // --- Wage-statistic adjective (agrees with "salaire", masculine) ----------
  'stat.adj.median': { en: 'median', fr: 'médian' },
  'stat.adj.mean': { en: 'mean', fr: 'moyen' },

  // --- Shared units ---------------------------------------------------------
  'unit.percentPerYr': { en: '% / yr', fr: '% / an' },
  'unit.pp': { en: 'pp', fr: 'pts' },

  // --- Diverging bars (migration / wage) ------------------------------------
  'bars.migration.xLabel': {
    en: 'Net migration (10-year), % of 2014 resident population',
    fr: 'Migration nette (10 ans), % de la population résidente de 2014',
  },
  'bars.wage.xLabel': {
    en: 'CNSS {stat} daily wage, CAGR 2014–2024',
    fr: 'Salaire journalier {stat} CNSS, TCAC 2014–2024',
  },

  // --- Scatter: migration vs wage ------------------------------------------
  'scatter.xAxis': {
    en: 'Net migration (10-yr), %',
    fr: 'Migration nette (10 ans), %',
  },
  'scatter.yAxis.wage': {
    en: 'CNSS {stat} daily wage, CAGR 2014–2024 (%)',
    fr: 'Salaire journalier {stat} CNSS, TCAC 2014–2024 (%)',
  },
  'scatter.yAxis.fe': {
    en: 'Wage-premium growth, regression FE (%/yr)',
    fr: 'Croissance de la prime salariale, EF de régression (%/an)',
  },
  'scatter.tip.netMigration': { en: 'Net migration', fr: 'Migration nette' },
  'scatter.tip.wageCagr': { en: 'Wage CAGR', fr: 'TCAC du salaire' },
  'scatter.tip.fePremium': { en: 'FE premium growth', fr: 'Croissance prime EF' },
  'scatter.ref.median': { en: 'median {v}%', fr: 'médiane {v} %' },
  'scatter.ref.nationalPace0': {
    en: 'national pace (0%)',
    fr: 'rythme national (0 %)',
  },
  'scatter.ref.medianPerYr': {
    en: 'median {v}% / yr',
    fr: 'médiane {v} % / an',
  },
  'scatter.ref.natAvgPerYr': {
    en: 'nat. avg {v}% / yr',
    fr: 'moy. nat. {v} % / an',
  },

  // --- Quadrant legend ------------------------------------------------------
  'quad.tl.name': {
    en: 'Top-left · wages rising, people leaving',
    fr: 'Haut-gauche · salaires en hausse, départs',
  },
  'quad.tl.desc': {
    en: 'Pay grew faster than the national norm but the city still lost population — supply outran labor demand, or amenities/cost-of-living dominate.',
    fr: 'Les rémunérations ont progressé plus vite que la norme nationale mais la ville a tout de même perdu de la population — l’offre a dépassé la demande de travail, ou les aménités et le coût de la vie l’emportent.',
  },
  'quad.tr.name': {
    en: 'Top-right · positive demand shock',
    fr: 'Haut-droite · choc de demande positif',
  },
  'quad.tr.desc': {
    en: 'Wages and migration both above the national pace — labor demand is rising and workers are responding. The textbook story.',
    fr: 'Salaires et migration tous deux au-dessus du rythme national — la demande de travail augmente et les travailleurs répondent. Le cas d’école.',
  },
  'quad.bl.name': {
    en: 'Bottom-left · negative demand shock',
    fr: 'Bas-gauche · choc de demande négatif',
  },
  'quad.bl.desc': {
    en: 'Wage growth lagging and net outflows — the local economy is shedding both pay and people.',
    fr: 'Croissance salariale à la traîne et sorties nettes — l’économie locale perd à la fois en rémunération et en population.',
  },
  'quad.br.name': {
    en: 'Bottom-right · attracting despite slow wage growth',
    fr: 'Bas-droite · attractive malgré une faible croissance salariale',
  },
  'quad.br.desc': {
    en: 'People are arriving even though wages aren’t outpacing the country — driven by affordability, jobs that aren’t yet showing up in CNSS pay, or non-wage pull.',
    fr: 'Des personnes arrivent alors même que les salaires ne dépassent pas le rythme national — sous l’effet du coût de la vie, d’emplois non encore visibles dans les salaires CNSS, ou d’attraits non salariaux.',
  },

  // --- Scatter: migration vs labor-market outcomes -------------------------
  'labor.metric.wageMedian': {
    en: 'CNSS median daily wage, CAGR 2014–2024 (%)',
    fr: 'Salaire journalier médian CNSS, TCAC 2014–2024 (%)',
  },
  'labor.metric.wageMean': {
    en: 'CNSS mean daily wage, CAGR 2014–2024 (%)',
    fr: 'Salaire journalier moyen CNSS, TCAC 2014–2024 (%)',
  },
  'labor.metric.wagePremiumFe': {
    en: 'Wage-premium growth, regression FE (%/yr)',
    fr: 'Croissance de la prime salariale, EF de régression (%/an)',
  },
  'labor.metric.unemp': {
    en: 'Δ unemployment rate, 2014→2024 (pp)',
    fr: 'Δ taux de chômage, 2014→2024 (pts)',
  },
  'labor.opt.wageMedian': {
    en: 'Median wage growth (CAGR, %)',
    fr: 'Croissance du salaire médian (TCAC, %)',
  },
  'labor.opt.wageMean': {
    en: 'Mean wage growth (CAGR, %)',
    fr: 'Croissance du salaire moyen (TCAC, %)',
  },
  'labor.opt.wagePremiumFe': {
    en: 'Wage-premium growth (FE, %)',
    fr: 'Croissance de la prime salariale (EF, %)',
  },
  'labor.opt.unemp': { en: 'Δ unemployment (pp)', fr: 'Δ chômage (pts)' },
  'labor.yname.wage': { en: 'Wage CAGR', fr: 'TCAC du salaire' },
  'labor.yname.unemp': { en: 'Δ unemployment', fr: 'Δ chômage' },
  'labor.tip.wagePremiumFe': {
    en: 'Wage-premium growth',
    fr: 'Croissance de la prime salariale',
  },
  'labor.tip.wageMedian': { en: 'Median wage CAGR', fr: 'TCAC du salaire médian' },
  'labor.tip.wageMean': { en: 'Mean wage CAGR', fr: 'TCAC du salaire moyen' },
  'labor.tip.unemp': { en: 'Δ unemployment', fr: 'Δ chômage' },
  'labor.ref.natAvgPp': {
    en: 'nat. avg {v} pp',
    fr: 'moy. nat. {v} pts',
  },

  // --- Unemployment density -------------------------------------------------
  'unemp.xLabel': {
    en: 'Unemployment rate, 2024 — distribution across 63 cities',
    fr: 'Taux de chômage, 2024 — répartition entre 63 villes',
  },

  // --- Shift-share waterfall ------------------------------------------------
  'ss.step.national': { en: 'National', fr: 'National' },
  'ss.step.industryMix': { en: 'Industry mix', fr: 'Composition sectorielle' },
  'ss.step.localShare': { en: 'Local share', fr: 'Part locale' },
  'ss.step.newIndustries': { en: 'New industries', fr: 'Nouvelles industries' },
  'ss.workers': { en: 'workers', fr: 'travailleurs' },

  // --- Section levels table -------------------------------------------------
  'levels.header.indicator': { en: 'Indicator', fr: 'Indicateur' },
  'levels.header.2024': { en: '2024', fr: '2024' },
  'levels.header.change': { en: 'Change since 2014', fr: 'Évolution depuis 2014' },
  'levels.header.rank': { en: 'Rank (of 63)', fr: 'Rang (sur 63)' },
  'levels.header.vsCasa': { en: 'vs. Casablanca', fr: 'Comparé à Casablanca' },
  'levels.noData': {
    en: 'No 2024 data for this city.',
    fr: 'Aucune donnée 2024 pour cette ville.',
  },
  'levels.population': { en: 'Population', fr: 'Population' },
  'levels.population.note': {
    en: 'Total residents in the FUA',
    fr: 'Population totale de l’AUF',
  },
  'levels.wage': { en: 'Daily formal wage', fr: 'Salaire formel journalier' },
  'levels.wage.note': {
    en: 'Median CNSS-registered worker',
    fr: 'Médiane des salariés enregistrés à la CNSS',
  },
  'levels.wage.noteAbsent': {
    en: 'No CNSS-matched ville — see notice above',
    fr: 'Aucune ville CNSS correspondante — voir l’avis ci-dessus',
  },
  'levels.unemp': { en: 'Unemployment', fr: 'Chômage' },
  'levels.unemp.note': {
    en: 'Share of the labor force',
    fr: 'Part de la population active',
  },
  'levels.eci': { en: 'Economic complexity', fr: 'Complexité économique' },
  'levels.eci.note': {
    en: 'ECI from CNSS worker-share specialization',
    fr: 'ICE selon la spécialisation des effectifs CNSS',
  },

  // --- City map: indicators -------------------------------------------------
  'map.ind.migration': {
    en: 'Net migration (10-yr)',
    fr: 'Migration nette (10 ans)',
  },
  'map.ind.unemployment': { en: 'Unemployment rate', fr: 'Taux de chômage' },
  'map.ind.female_unemployment': {
    en: 'Female unemployment rate',
    fr: 'Taux de chômage des femmes',
  },
  'map.ind.lfp': { en: 'Labor-force participation', fr: 'Taux d’activité' },
  'map.ind.female_lfp': {
    en: 'Female labor-force participation',
    fr: 'Taux d’activité des femmes',
  },
  'map.ind.tertiary': { en: 'Tertiary education', fr: 'Éducation supérieure' },
  'map.ind.dependency': { en: 'Dependency ratio', fr: 'Ratio de dépendance' },
  'map.ind.population': { en: 'Population', fr: 'Population' },
  'map.ind.slum': { en: 'Slum housing share', fr: 'Part d’habitat insalubre' },

  // --- City map: legend hints (colour direction) ----------------------------
  'map.hint.migration': {
    en: 'Green = net inflow · Red = net outflow',
    fr: 'Vert = entrées nettes · Rouge = sorties nettes',
  },
  'map.hint.unemployment': {
    en: 'Darker = higher unemployment',
    fr: 'Plus foncé = chômage plus élevé',
  },
  'map.hint.female_unemployment': {
    en: 'Darker = higher female unemployment',
    fr: 'Plus foncé = chômage des femmes plus élevé',
  },
  'map.hint.lfp': {
    en: 'Darker = higher participation',
    fr: 'Plus foncé = activité plus élevée',
  },
  'map.hint.female_lfp': {
    en: 'Women in the labor force · darker = higher',
    fr: 'Femmes dans la population active · plus foncé = plus élevé',
  },
  'map.hint.tertiary': {
    en: 'Adults with tertiary education · darker = higher',
    fr: 'Adultes diplômés du supérieur · plus foncé = plus élevé',
  },
  'map.hint.dependency': {
    en: 'Dependents per 100 working-age · darker = higher',
    fr: 'Personnes à charge pour 100 actifs · plus foncé = plus élevé',
  },
  'map.hint.population': {
    en: 'Legal population · log-scaled · darker = larger',
    fr: 'Population légale · échelle log · plus foncé = plus grand',
  },
  'map.hint.slum': {
    en: 'Households in slum housing · darker = higher',
    fr: 'Ménages en habitat insalubre · plus foncé = plus élevé',
  },
  'map.unit.per100': { en: '{v} per 100', fr: '{v} pour 100' },
  'map.unit.pp': { en: 'pp', fr: 'pts' },

  // --- City map: level/change toggle ---------------------------------------
  'map.colorBy': { en: 'Color by', fr: 'Colorer selon' },
  'map.mode.level': { en: 'Level', fr: 'Niveau' },
  'map.mode.change': { en: 'Change', fr: 'Évolution' },
  'map.mode.changeTitle': {
    en: 'Change over the decade (2014 → 2024)',
    fr: 'Évolution sur la décennie (2014 → 2024)',
  },
  'map.mode.aria': {
    en: 'Show current level or 10-year change',
    fr: 'Afficher le niveau actuel ou l’évolution sur 10 ans',
  },
  'map.changeLabel': { en: 'Change in {indicator}', fr: 'Évolution · {indicator}' },
  'map.communeChange': {
    en: '{n} {commune} · change 2014 → 2024',
    fr: '{n} {commune} · évolution 2014 → 2024',
  },

  // --- City map: change-view legend hints (green↔red direction) ------------
  'map.chgHint.unemployment': {
    en: 'Green = rose · red = fell · points, 2014→2024',
    fr: 'Vert = hausse · rouge = baisse · points, 2014→2024',
  },
  'map.chgHint.female_unemployment': {
    en: 'Green = rose · red = fell · points, 2014→2024',
    fr: 'Vert = hausse · rouge = baisse · points, 2014→2024',
  },
  'map.chgHint.lfp': {
    en: 'Green = rose · red = fell · points, 2014→2024',
    fr: 'Vert = hausse · rouge = baisse · points, 2014→2024',
  },
  'map.chgHint.female_lfp': {
    en: 'Green = rose · red = fell · points, 2014→2024',
    fr: 'Vert = hausse · rouge = baisse · points, 2014→2024',
  },
  'map.chgHint.tertiary': {
    en: 'Green = rose · red = fell · points, 2014→2024',
    fr: 'Vert = hausse · rouge = baisse · points, 2014→2024',
  },
  'map.chgHint.dependency': {
    en: 'Green = rose · red = fell · per 100, 2014→2024',
    fr: 'Vert = hausse · rouge = baisse · pour 100, 2014→2024',
  },
  'map.chgHint.population': {
    en: 'Green = grew · red = shrank · percent, 2014→2024',
    fr: 'Vert = croissance · rouge = déclin · pourcent, 2014→2024',
  },
  'map.chgHint.slum': {
    en: 'Green = rose · red = fell · points, 2014→2024',
    fr: 'Vert = hausse · rouge = baisse · points, 2014→2024',
  },

  // --- City map: legend / chrome -------------------------------------------
  'map.loading': { en: 'Loading map…', fr: 'Chargement de la carte…' },
  'map.loadError': {
    en: 'Could not load map: {msg}',
    fr: 'Échec du chargement de la carte : {msg}',
  },
  'map.baseLoadError': {
    en: 'Could not load base map: {msg}',
    fr: 'Échec du chargement du fond de carte : {msg}',
  },
  'map.communeCensus': {
    en: '{n} {commune} · census 2024',
    fr: '{n} {commune} · recensement 2024',
  },
  'map.commune.one': { en: 'commune', fr: 'commune' },
  'map.commune.many': { en: 'communes', fr: 'communes' },
  'map.legend.makeUp': {
    en: '{n} {commune} make up this city · {base}',
    fr: '{n} {commune} composent cette ville · {base}',
  },
  'map.legend.base': {
    en: 'Grey = neighboring communes · Blue = ocean · Dashed line: FUA boundary',
    fr: 'Gris = communes voisines · Bleu = océan · Ligne pointillée : limite de l’AUF',
  },
  'map.legend.zoomIn': {
    en: 'Drag to zoom in on an area',
    fr: 'Glissez pour zoomer sur une zone',
  },
  'map.legend.zoomFurther': {
    en: 'Drag to zoom further · Reset to return',
    fr: 'Glissez pour zoomer davantage · Réinitialiser pour revenir',
  },
  'map.legend.outflow': { en: '{v} (outflow)', fr: '{v} (sorties)' },
  'map.legend.inflow': { en: '{v} (inflow)', fr: '{v} (entrées)' },
  'map.legend.noData': { en: 'no data', fr: 'aucune donnée' },
  'map.aria.definition': {
    en: 'Map showing the communes that make up {city}’s functional urban area',
    fr: 'Carte des communes composant l’aire urbaine fonctionnelle de {city}',
  },
  'map.aria.colored': {
    en: 'Map of communes in {city} colored by {indicator}',
    fr: 'Carte des communes de {city} colorées selon {indicator}',
  },
  'map.aria.indicatorFallback': { en: 'indicator', fr: 'indicateur' },

  // --- Treemap legends ------------------------------------------------------
  'legend.lost': { en: 'lost', fr: 'perdu' },
  'legend.gained': { en: 'gained', fr: 'gagné' },
  'legend.wage.lowerPay': { en: 'lower pay', fr: 'rémunération plus faible' },
  'legend.wage.higherPay': { en: 'higher pay', fr: 'rémunération plus élevée' },
  'legend.wage.declining': { en: 'declining', fr: 'en baisse' },
  'legend.wage.rising': { en: 'rising', fr: 'en hausse' },
  'legend.wage.industryMedian': {
    en: 'industry median',
    fr: 'médiane sectorielle',
  },
  'legend.wage.cityMedian': { en: 'city median', fr: 'médiane de la ville' },
  'legend.wage.note.default': {
    en: 'Each cell’s daily wage (CNSS total salary ÷ days worked) compared to the median across all cities where that industry appears.',
    fr: 'Le salaire journalier de chaque cellule (salaire total CNSS ÷ jours travaillés) comparé à la médiane de toutes les villes où ce secteur est présent.',
  },
  'legend.wage.note.city': {
    en: 'Each cell’s daily wage compared to the city’s median daily wage across all CNSS person-days.',
    fr: 'Le salaire journalier de chaque cellule comparé au salaire journalier médian de la ville sur l’ensemble des jours-personnes CNSS.',
  },
  'legend.complexity.less': {
    en: 'PCI ≤ −{s} (less complex)',
    fr: 'ICP ≤ −{s} (moins complexe)',
  },
  'legend.complexity.more': {
    en: '≥ +{s} (more complex)',
    fr: '≥ +{s} (plus complexe)',
  },
  'legend.complexity.note': {
    en: 'Industry complexity from the national product space — based on worker-share specialization across cities.',
    fr: 'Complexité sectorielle issue de l’espace produit national — selon la spécialisation des effectifs entre villes.',
  },

  // --- Section overview treemap --------------------------------------------
  'tm.opt.section': { en: 'Industry section', fr: 'Section d’activité' },
  'tm.opt.complexity': { en: 'Industry complexity', fr: 'Complexité sectorielle' },
  'tm.opt.wageIndustry': {
    en: 'Daily wage vs. industry national median',
    fr: 'Salaire journalier vs médiane nationale du secteur',
  },
  'tm.opt.wageCity': {
    en: 'Daily wage vs. city median',
    fr: 'Salaire journalier vs médiane de la ville',
  },
  'tm.opt.wageGrowth': {
    en: 'Wage growth, CAGR 2014–2024',
    fr: 'Croissance salariale, TCAC 2014–2024',
  },
  'tm.opt.localShare': { en: 'Local-share effect', fr: 'Effet de part locale' },
  'tm.opt.industryMix': {
    en: 'Industry-mix effect',
    fr: 'Effet de composition sectorielle',
  },
  'tm.note.localShare': {
    en: 'Share of each industry’s 2014 workforce attributed to the local-share effect. Color scale capped at ±{bound}%.',
    fr: 'Part des effectifs 2014 de chaque secteur attribuée à l’effet de part locale. Échelle de couleur plafonnée à ±{bound} %.',
  },
  'tm.note.industryMix': {
    en: 'Share of each industry’s 2014 workforce attributed to the industry-mix effect. Color scale capped at ±{bound}%.',
    fr: 'Part des effectifs 2014 de chaque secteur attribuée à l’effet de composition sectorielle. Échelle de couleur plafonnée à ±{bound} %.',
  },
  'tm.note.wageGrowth': {
    en: 'Annualized growth in each industry’s mean daily wage between 2014 and 2024. Color scale capped at ±{bound}% / yr.',
    fr: 'Croissance annualisée du salaire journalier moyen de chaque secteur entre 2014 et 2024. Échelle de couleur plafonnée à ±{bound} % / an.',
  },
  'tm.zeroPerYr': { en: '0% / yr', fr: '0 % / an' },
  'tm.unit.perYr': { en: '% / yr', fr: '% / an' },
  'tm.empty.composition': {
    en: 'No 2024 industry employment for this city.',
    fr: 'Aucun emploi sectoriel 2024 pour cette ville.',
  },
  'tm.empty.incumbent': {
    en: 'No incumbent industries with 2014 employment for this city.',
    fr: 'Aucune industrie établie avec des effectifs 2014 pour cette ville.',
  },
  'tm.empty.new': {
    en: 'No industries appeared from scratch in this city between 2014 and 2024.',
    fr: 'Aucune industrie n’est apparue de toutes pièces dans cette ville entre 2014 et 2024.',
  },
  'tm.new.hint': {
    en: '{count} new industries · {n} workers in 2024',
    fr: '{count} nouvelles industries · {n} travailleurs en 2024',
  },

  // --- Treemap tooltips -----------------------------------------------------
  'tip.workers2024': { en: 'Workers 2024', fr: 'Effectifs 2024' },
  'tip.workers2014': { en: 'Workers 2014', fr: 'Effectifs 2014' },
  'tip.pci': { en: 'Industry complexity (PCI)', fr: 'Complexité sectorielle (ICP)' },
  'tip.dailyWage2024': {
    en: 'Daily wage 2024 (MAD)',
    fr: 'Salaire journalier 2024 (MAD)',
  },
  'tip.wageGrowth': {
    en: 'Wage growth 2014–2024',
    fr: 'Croissance salariale 2014–2024',
  },
  'tip.vsIndustryNat': {
    en: 'vs. industry national median',
    fr: 'vs médiane nationale du secteur',
  },
  'tip.vsCityMedian': { en: 'vs. city median', fr: 'vs médiane de la ville' },
  'tip.netChange': { en: 'Net change', fr: 'Variation nette' },
  'tip.localShareEffect': {
    en: 'Local-share effect',
    fr: 'Effet de part locale',
  },
  'tip.industryMixEffect': {
    en: 'Industry-mix effect',
    fr: 'Effet de composition sectorielle',
  },
  'tip.of2014Workforce': {
    en: 'of 2014 workforce',
    fr: 'des effectifs de 2014',
  },
  'tip.newEntrant0': { en: '0 (new entrant)', fr: '0 (nouvel arrivant)' },

  // --- NACE section labels (display only; English keys drive color) ---------
  'section.Trade': { en: 'Trade', fr: 'Commerce' },
  'section.Transport & Storage': {
    en: 'Transport & Storage',
    fr: 'Transport et entreposage',
  },
  'section.Manufacturing': { en: 'Manufacturing', fr: 'Industrie manufacturière' },
  'section.Agriculture': { en: 'Agriculture', fr: 'Agriculture' },
  'section.Mining': { en: 'Mining', fr: 'Industrie extractive' },
  'section.Water & Waste': { en: 'Water & Waste', fr: 'Eau et déchets' },
  'section.Electricity & Gas': {
    en: 'Electricity & Gas',
    fr: 'Électricité et gaz',
  },
  'section.Construction': { en: 'Construction', fr: 'Construction' },
  'section.Admin & Support': {
    en: 'Admin & Support',
    fr: 'Administratif et soutien',
  },
  'section.Professional Services': {
    en: 'Professional Services',
    fr: 'Services professionnels',
  },
  'section.ICT': { en: 'ICT', fr: 'TIC' },
  'section.Health & Social': { en: 'Health & Social', fr: 'Santé et action sociale' },
  'section.Education': { en: 'Education', fr: 'Éducation' },
  'section.Finance & Insurance': {
    en: 'Finance & Insurance',
    fr: 'Finance et assurance',
  },
  'section.Real Estate': { en: 'Real Estate', fr: 'Immobilier' },
  'section.Accommodation & Food': {
    en: 'Accommodation & Food',
    fr: 'Hébergement et restauration',
  },
  'section.Arts & Recreation': {
    en: 'Arts & Recreation',
    fr: 'Arts et loisirs',
  },
  'section.Other Services': { en: 'Other Services', fr: 'Autres services' },
  'section.Other': { en: 'Other', fr: 'Autre' },
  'section.Public Admin': { en: 'Public Admin', fr: 'Administration publique' },
  'section.Households': { en: 'Households', fr: 'Ménages' },
  'section.Extraterritorial': {
    en: 'Extraterritorial',
    fr: 'Extraterritorial',
  },
};

// Resolve a key for a language, interpolating {placeholders} from params.
export function tr(
  lang: Lang,
  key: string,
  params?: Record<string, string | number>,
): string {
  const entry = UI[key];
  let s = entry ? entry[lang] : key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      // Function replacement so `$` in values isn't treated as a special pattern.
      s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), () => String(v));
    }
  }
  return s;
}

// Hook form: returns a translator bound to the current language.
export function useT() {
  const { lang } = useLang();
  return useCallback(
    (key: string, params?: Record<string, string | number>) => tr(lang, key, params),
    [lang],
  );
}

// Translate a NACE section name for display. The English name remains the key
// used everywhere internally (coloring, grouping); this only swaps the label.
export function sectionLabel(name: string | undefined, lang: Lang): string {
  if (!name) return '';
  const entry = UI[`section.${name}`];
  return entry ? entry[lang] : name;
}

// Industry labels: the data's LIBELLE_ACTIVITE is the original French name, and
// `translations` maps it to English. So French mode shows the raw label; English
// mode shows the translated one (falling back to the raw label when missing).
export function industryLabel(
  rawFr: string,
  translations: Map<string, string> | null | undefined,
  lang: Lang,
): string {
  if (lang === 'fr') return rawFr;
  return translations?.get(rawFr) ?? rawFr;
}
