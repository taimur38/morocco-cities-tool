import CityLink from '../components/CityLink';

// Long-form narrative for the Home (overview) and CityProfile pages. Kept here,
// separate from the structural page components, so the English and French
// versions sit side by side for translation and review. Embedded <CityLink>s,
// links, and emphasis are preserved per language because word order differs.
//
// Types are intentionally inferred (no annotation) so each entry keeps its
// precise shape — most are { en, fr } JSX, a few are { en, fr } functions.
//
// Place names are intentionally left in their data spelling (e.g. "Tangier",
// "Fez", "Marrakesh") in both languages — they double as <CityLink> targets.

const GHSL_FUA_URL = 'https://human-settlement.emergency.copernicus.eu/ghs_fua.php';

export const homeContent = {
  title: {
    en: <>Morocco's cities over the past decade</>,
    fr: <>Les villes du Maroc au cours de la dernière décennie</>,
  },

  introP1: {
    en: (
      <>
        Cities matter for Morocco's economy. In 2019, cities were estimated to
        generate 75% of national GDP, 80% of total tax receipts and 60% of total
        employment (Lall et al. 2019). Assessing the performance of Morocco's
        cities can therefore yield critical insights into Morocco's aggregate
        growth performance, as it will reveal which cities are succeeding and
        which are failing. It will also help generate strong hypotheses as to
        what is constraining their growth.
      </>
    ),
    fr: (
      <>
        Les villes sont déterminantes pour l'économie marocaine. En 2019, on
        estimait qu'elles généraient 75 % du PIB national, 80 % des recettes
        fiscales totales et 60 % de l'emploi total (Lall et al. 2019). Évaluer la
        performance des villes du Maroc peut donc apporter un éclairage essentiel
        sur la dynamique de croissance agrégée du pays, en révélant quelles
        villes réussissent et lesquelles sont en difficulté. Cela aide également
        à formuler des hypothèses solides quant à ce qui freine leur croissance.
      </>
    ),
  },

  introP2: {
    en: (
      <>
        To make progress on this topic, it is necessary to define (1) the
        boundaries of a city and (2) a framework to assess economic performance
        at the subnational level. In thinking about the economic growth of
        cities, it is useful to consider a city as an integrated labor market
        rather than at the administratively defined boundary. To identify the
        sets of communes that group together into a labor market and form a city,
        this article makes use of the Functional Urban Area definitions from the
        Global Human Settlement Layer (2019). It then introduces a framework
        which leverages the concept of spatial equilibrium, tailored to Morocco's
        specific context, to evaluate their relative performance over the past 10
        years. Finally, a city dashboard allows readers to investigate the
        evolution of their own city over the past decade, and form hypotheses as
        to whether city growth is more constrained by labor demand or labor
        supply.
      </>
    ),
    fr: (
      <>
        Pour avancer sur ce sujet, il faut définir (1) les limites d'une ville et
        (2) un cadre permettant d'évaluer la performance économique à l'échelle
        infranationale. Lorsqu'on réfléchit à la croissance économique des
        villes, il est utile de considérer une ville comme un marché du travail
        intégré plutôt que selon ses limites administratives. Pour identifier les
        ensembles de communes qui se regroupent en un marché du travail et
        forment une ville, cet article s'appuie sur les définitions des aires
        urbaines fonctionnelles du Global Human Settlement Layer (2019). Il
        introduit ensuite un cadre qui mobilise le concept d'équilibre spatial,
        adapté au contexte propre au Maroc, afin d'évaluer leur performance
        relative au cours des dix dernières années. Enfin, un tableau de bord des
        villes permet au lecteur d'explorer l'évolution de sa propre ville sur la
        dernière décennie et de formuler des hypothèses quant à savoir si la
        croissance urbaine est davantage contrainte par la demande ou par l'offre
        de travail.
      </>
    ),
  },

  whatIsCityH3: {
    en: <>What is a city?</>,
    fr: <>Qu'est-ce qu'une ville&nbsp;?</>,
  },

  cityDefP: {
    en: (
      <>
        For the purpose of economic analysis, we evaluate a city as a labor
        market. This definition is in tension with the administrative definition
        of the city, but it captures the fact that workers and consumers are
        constantly crossing administrative boundaries in the course of living
        their lives, which includes going to work, shopping, or seeking services.
        The Functional Urban Area (FUA) framework developed by the Global Human
        Settlement Layer uses a geospatial model which estimates the boundaries
        of a city based on fine-grained population density data and commuting
        patterns in example cities (see{' '}
        <a href={GHSL_FUA_URL} target="_blank" rel="noopener noreferrer">
          GHSL documentation
        </a>
        ). We apply this framework in order to have a consistent process for
        defining the boundary of a city in Morocco, and aggregate administrative
        data for communes intersecting with this boundary to form the unit of
        analysis for our study. The boundary estimations are from satellite data
        as of 2015, and after 10 years of continuous development are arguably out
        of date, and we aim to improve on these boundaries in future work. We
        make four important manual corrections — we assign Ain el Aouda and
        Kenitra to the Rabat FUA, and we assign Deroua and Berrechid to the
        Casablanca FUA. While the boundary definitions used here can be improved,
        and it is an important question to refine them, we continue with our
        analysis at this level as it establishes a solid and systematic frame of
        reference to operate from. As an example, <CityLink name="Agadir" /> is
        visualized below: the dashed boundary comes from the GHSL definition, and
        the labelled communes are those that our process then aggregates to form
        definitions for each city. Each city's boundaries can be seen on its
        respective city profile page.
      </>
    ),
    fr: (
      <>
        Pour les besoins de l'analyse économique, nous évaluons une ville comme
        un marché du travail. Cette définition est en tension avec la définition
        administrative de la ville, mais elle rend compte du fait que les
        travailleurs et les consommateurs franchissent en permanence les limites
        administratives au cours de leur vie quotidienne — pour se rendre au
        travail, faire leurs achats ou recourir à des services. Le cadre des
        aires urbaines fonctionnelles (AUF) développé par le Global Human
        Settlement Layer s'appuie sur un modèle géospatial qui estime les limites
        d'une ville à partir de données fines de densité de population et des
        schémas de navettage observés dans des villes de référence (voir la{' '}
        <a href={GHSL_FUA_URL} target="_blank" rel="noopener noreferrer">
          documentation du GHSL
        </a>
        ). Nous appliquons ce cadre afin de disposer d'un procédé cohérent pour
        délimiter une ville au Maroc, et nous agrégeons les données
        administratives des communes qui intersectent cette limite pour former
        l'unité d'analyse de notre étude. Les estimations de limites proviennent
        de données satellitaires de 2015 et, après dix ans de développement
        continu, sont sans doute dépassées ; nous comptons les améliorer dans de
        futurs travaux. Nous apportons quatre corrections manuelles importantes :
        nous rattachons Ain el Aouda et Kenitra à l'AUF de Rabat, et Deroua et
        Berrechid à l'AUF de Casablanca. Si les définitions de limites employées
        ici peuvent être améliorées — et leur affinement est une question
        importante —, nous poursuivons notre analyse à ce niveau car il établit
        un cadre de référence solide et systématique. À titre d'exemple,{' '}
        <CityLink name="Agadir" /> est représentée ci-dessous : la limite en
        pointillés provient de la définition du GHSL, et les communes étiquetées
        sont celles que notre procédé agrège ensuite pour constituer la
        définition de chaque ville. Les limites de chaque ville sont consultables
        sur sa fiche respective.
      </>
    ),
  },

  agadirTitle: {
    en: <>The Agadir functional urban area</>,
    fr: <>L'aire urbaine fonctionnelle d'Agadir</>,
  },
  agadirCaption: {
    en: (
      <>
        Dashed line: GHSL functional area. Shaded polygons: the constituent
        communes our analysis aggregates into a single city.
      </>
    ),
    fr: (
      <>
        Ligne pointillée : aire fonctionnelle du GHSL. Polygones colorés : les
        communes constitutives que notre analyse agrège en une seule ville.
      </>
    ),
  },

  migrationH3: {
    en: <>Migration: people vote with their feet</>,
    fr: <>Migration : les gens votent avec leurs pieds</>,
  },
  migrationP: {
    en: (
      <>
        One key difference between economic growth at the country level and at
        the subnational level is that people are more free to move across
        borders. It is easier for someone to move from <CityLink name="Oujda" />{' '}
        to <CityLink name="Tangier" /> than it may be to move to the United
        States. Therefore, if Tangier experiences a positive economic shock
        relative to the rest of the country, it is likely to motivate a much
        stronger migration response than growth at the national level would draw
        from its neighbouring countries. This allows us to use net migration as a
        key indicator of the success or failure of a city in providing a good
        life for its people. People vote with their feet: if people are on net
        leaving, it is a strong signal that the city is not meeting the needs of
        its people, and if people are arriving in droves, the city might be
        getting something right. According to HCP data, roughly one in five
        Moroccans now lives in a different commune than they did in 2014. The
        graph below shows the top 10 gainers and bottom 10 losers in terms of
        growth rate among Morocco's functional urban areas.
      </>
    ),
    fr: (
      <>
        Une différence essentielle entre la croissance économique à l'échelle
        nationale et à l'échelle infranationale tient à ce que les personnes
        peuvent se déplacer plus librement d'un territoire à l'autre. Il est plus
        facile pour quelqu'un de déménager d'<CityLink name="Oujda" /> à{' '}
        <CityLink name="Tangier" /> que d'émigrer vers les États-Unis. Dès lors,
        si Tangier connaît un choc économique positif par rapport au reste du
        pays, elle suscitera probablement une réponse migratoire bien plus forte
        que la croissance nationale n'en attirerait des pays voisins. Cela nous
        permet d'utiliser la migration nette comme indicateur clé de la réussite
        ou de l'échec d'une ville à offrir une vie de qualité à ses habitants.
        Les gens votent avec leurs pieds : si la population s'en va en net, c'est
        un signal fort que la ville ne répond pas aux besoins de ses habitants ;
        si elle afflue, c'est que la ville fait peut-être quelque chose de bien.
        Selon les données du HCP, environ un Marocain sur cinq vit aujourd'hui
        dans une commune différente de celle où il résidait en 2014. Le graphique
        ci-dessous présente les dix plus forts gains et les dix plus fortes
        pertes, en taux de croissance, parmi les aires urbaines fonctionnelles du
        Maroc.
      </>
    ),
  },
  migBarsTitle: {
    en: <>Net internal migration, 2014–2024</>,
    fr: <>Migration interne nette, 2014–2024</>,
  },
  migBarsCaption: {
    en: (
      <>
        Top 10 gainers and bottom 10 losers among the 59 cities in our analysis.
        Expressed as a percent of the 2014 resident population — i.e. "Tangier
        gained 54% of its 2014 population on net through migration."
      </>
    ),
    fr: (
      <>
        Les dix plus forts gains et les dix plus fortes pertes parmi les 59
        villes de notre analyse. Exprimé en pourcentage de la population
        résidente de 2014 — par exemple « Tangier a gagné en net 54 % de sa
        population de 2014 par la migration ».
      </>
    ),
  },
  bigCitiesP: {
    en: (
      <>
        Of the big cities, <CityLink name="Tangier" /> is extremely fast growing,
        followed by <CityLink name="Marrakesh" />, <CityLink name="Agadir" />,{' '}
        <CityLink name="Fez" />, <CityLink name="Casablanca" /> and{' '}
        <CityLink name="Rabat" />. Cities in the southern provinces like{' '}
        <CityLink name="Dakhla" /> and <CityLink name="Boujdour" /> also make the
        top ten, and <CityLink name="Tétouan" /> rounds out the list as another
        fast-growing city in the North by Tangier.
      </>
    ),
    fr: (
      <>
        Parmi les grandes villes, <CityLink name="Tangier" /> croît très
        rapidement, suivie de <CityLink name="Marrakesh" />,{' '}
        <CityLink name="Agadir" />, <CityLink name="Fez" />,{' '}
        <CityLink name="Casablanca" /> et <CityLink name="Rabat" />. Des villes
        des provinces du Sud comme <CityLink name="Dakhla" /> et{' '}
        <CityLink name="Boujdour" /> figurent aussi dans le top dix, et{' '}
        <CityLink name="Tétouan" /> complète la liste comme autre ville du Nord à
        forte croissance, proche de Tangier.
      </>
    ),
  },
  casaRabatP: {
    en: (
      <>
        A closer look at the migration patterns within the communes considered as
        part of <CityLink name="Casablanca" /> and <CityLink name="Rabat" /> under
        the FUA definition confirms that growth in the central communes has been
        low while the surrounding areas have been growing rapidly. One hypothesis
        is that the cost of living at the center of the city has been increasing
        significantly relative to the periphery, as housing growth and
        improvements in transportation have made it increasingly viable to live
        further away. Still, under the FUA definitions, both Casablanca and Rabat
        have on the whole been growing through net migration, despite outflows in
        the city center.
        <sup className="footnote-marker">†</sup>
      </>
    ),
    fr: (
      <>
        Un examen plus attentif des schémas migratoires au sein des communes
        rattachées à <CityLink name="Casablanca" /> et <CityLink name="Rabat" />{' '}
        selon la définition de l'AUF confirme que la croissance des communes
        centrales a été faible tandis que les zones périphériques croissaient
        rapidement. Une hypothèse est que le coût de la vie au centre-ville a
        fortement augmenté par rapport à la périphérie, l'essor du logement et
        l'amélioration des transports rendant de plus en plus viable le fait
        d'habiter plus loin. Néanmoins, selon les définitions de l'AUF,
        Casablanca comme Rabat ont, dans l'ensemble, crû grâce à la migration
        nette, malgré des sorties dans le centre-ville.
        <sup className="footnote-marker">†</sup>
      </>
    ),
  },
  casaMapTitle: {
    en: <>Net migration within the Casablanca area, 2014–2024</>,
    fr: <>Migration nette au sein de l'aire de Casablanca, 2014–2024</>,
  },
  rabatMapTitle: {
    en: <>Net migration within the Rabat area, 2014–2024</>,
    fr: <>Migration nette au sein de l'aire de Rabat, 2014–2024</>,
  },
  cityMapCaption: {
    en: (
      <>
        Communes shaded by net internal migration. Green: net inflow. Red: net
        outflow. Dashed line: FUA boundary.
      </>
    ),
    fr: (
      <>
        Communes colorées selon la migration interne nette. Vert : entrées
        nettes. Rouge : sorties nettes. Ligne pointillée : limite de l'AUF.
      </>
    ),
  },
  footnoteDagger: {
    en: (
      <>
        <sup>†</sup> Lall et al. (2019) observed a similar pattern in the
        previous decade: the central commune was shrinking while the wider region
        grew. Karibi, Kharmich and El Harrouni (2024) report negative growth
        rates for the cities of <CityLink name="Rabat" /> and{' '}
        <CityLink name="Casablanca" /> and conclude that the two largest cities
        are shrinking outright. Both readings use the historic commune as the
        boundary of the city, which in both cases corresponds to an inner urban
        core inside a much larger functional area. The FUA aggregation used here
        picks up the redistribution from core to periphery without reading it as
        shrinkage.
      </>
    ),
    fr: (
      <>
        <sup>†</sup> Lall et al. (2019) observaient un schéma similaire lors de
        la décennie précédente : la commune centrale se contractait tandis que la
        région élargie croissait. Karibi, Kharmich et El Harrouni (2024) font
        état de taux de croissance négatifs pour les villes de{' '}
        <CityLink name="Rabat" /> et <CityLink name="Casablanca" /> et concluent
        que les deux plus grandes villes se contractent purement et simplement.
        Ces deux lectures retiennent la commune historique comme limite de la
        ville, ce qui correspond dans les deux cas à un noyau urbain interne situé
        dans une aire fonctionnelle bien plus vaste. L'agrégation par AUF utilisée
        ici capte la redistribution du centre vers la périphérie sans
        l'interpréter comme une contraction.
      </>
    ),
  },

  forcesH3: {
    en: <>The forces driving migration patterns</>,
    fr: <>Les forces qui façonnent les schémas migratoires</>,
  },
  forcesP: {
    en: (
      <>
        What drives the variation in migration patterns across cities? If we view
        cities within a country as labor markets that are constantly interacting
        with one another, then migration can be seen as an outcome of relative
        shifts in labor demand and labor supply across cities. A (relative)
        increase in labor demand should show up in rising wages and higher than
        average net in-migration, whereas (relative) decreases in labor demand
        should result in falling wages and lower than average net migration. The
        graph below visualizes wage growth in the 10 fastest and slowest growing
        cities using Caisse Nationale de Sécurité Sociale (CNSS) data, which gives
        us a window into wages in the formal sector of the city's economy.
      </>
    ),
    fr: (
      <>
        Qu'est-ce qui explique la variation des schémas migratoires d'une ville à
        l'autre ? Si l'on conçoit les villes d'un pays comme des marchés du
        travail en interaction permanente, la migration peut être vue comme le
        résultat de variations relatives de la demande et de l'offre de travail
        entre les villes. Une hausse (relative) de la demande de travail devrait
        se traduire par une hausse des salaires et une migration nette supérieure
        à la moyenne, tandis qu'une baisse (relative) de la demande de travail
        devrait entraîner une baisse des salaires et une migration nette
        inférieure à la moyenne. Le graphique ci-dessous représente la croissance
        des salaires dans les dix villes à la croissance la plus rapide et la plus
        lente, à partir des données de la Caisse Nationale de Sécurité Sociale
        (CNSS), qui offrent une fenêtre sur les salaires du secteur formel de
        l'économie urbaine.
      </>
    ),
  },
  wageBarsTitle: {
    en: <>Wage growth in the formal sector, 2014–2024</>,
    fr: <>Croissance des salaires dans le secteur formel, 2014–2024</>,
  },
  wageBarsCaption: {
    en: (s: string) => (
      <>
        CAGR of {s} daily wage among CNSS-registered workers. Top 10 gainers and
        bottom 10 losers. The toggle above switches between median (default, more
        robust to a handful of outlier industries) and mean; the same choice
        applies to every wage chart on this page.
      </>
    ),
    fr: (s: string) => (
      <>
        TCAC du salaire journalier {s} des salariés enregistrés à la CNSS. Les dix
        plus fortes hausses et les dix plus fortes baisses. Le sélecteur ci-dessus
        bascule entre la médiane (par défaut, plus robuste face à quelques
        secteurs atypiques) et la moyenne ; ce choix s'applique à tous les
        graphiques de salaires de cette page.
      </>
    ),
  },
  scatterIntroP: {
    en: (
      <>
        Plotting wage growth together with net migration patterns allows us to
        generate hypotheses as to what has been driving city growth or decline
        over the past decade. The scatter graph below is divided evenly into
        quadrants by the dashed lines at their respective averages. As described
        above, cities in the top right quadrant (those experiencing higher than
        average net migration and faster than average growing wages) are likely to
        be experiencing a positive labor demand shock, while those in the
        bottom-left quadrant are likely to be experiencing a negative labor demand
        shock.
      </>
    ),
    fr: (
      <>
        Représenter la croissance des salaires conjointement avec les schémas de
        migration nette permet de formuler des hypothèses sur ce qui a stimulé la
        croissance ou le déclin des villes au cours de la dernière décennie. Le
        nuage de points ci-dessous est divisé en quadrants par les lignes
        pointillées situées à leurs moyennes respectives. Comme indiqué plus haut,
        les villes du quadrant supérieur droit (celles dont la migration nette
        dépasse la moyenne et dont les salaires croissent plus vite que la
        moyenne) connaissent vraisemblablement un choc de demande de travail
        positif, tandis que celles du quadrant inférieur gauche connaissent
        vraisemblablement un choc de demande de travail négatif.
      </>
    ),
  },
  scatterTitle: {
    en: <>Net migration vs. wage growth</>,
    fr: <>Migration nette vs croissance des salaires</>,
  },
  scatterCaption: {
    en: (
      <>
        Each point is one city. Hover for details; the cities furthest from the
        national average on either axis are labeled.
      </>
    ),
    fr: (
      <>
        Chaque point représente une ville. Survolez pour les détails ; les villes
        les plus éloignées de la moyenne nationale sur l'un ou l'autre axe sont
        étiquetées.
      </>
    ),
  },
  offDiagonalP: {
    en: (
      <>
        The off-diagonal cases suggest that people are not migrating solely as a
        result of changing wage conditions between cities. Differences in cost of
        living determine how much your wage can actually purchase, and housing
        costs are typically an important source of variation since housing is a
        significant cost and is non-tradable. Cities in the bottom right quadrant
        may be inducing in-migration driven more by a decreasing cost of living
        relative to other cities, such that the real wage (wages adjusted for
        local purchasing power) is rising. Alternatively, cities in the top left
        may be facing rising relative costs of living, forcing businesses to pay
        higher wages to try to retain workers. Unfortunately, at this time we do
        not have access to reliable city-level cost of living data, so this
        dimension remains largely hidden in our analysis.
      </>
    ),
    fr: (
      <>
        Les cas hors diagonale suggèrent que les gens ne migrent pas uniquement en
        raison de l'évolution des conditions salariales entre les villes. Les
        écarts de coût de la vie déterminent ce que le salaire permet réellement
        d'acheter, et le coût du logement constitue souvent une source de
        variation importante, le logement étant une dépense majeure et non
        échangeable. Les villes du quadrant inférieur droit attirent peut-être des
        arrivées davantage motivées par une baisse du coût de la vie par rapport
        aux autres villes, de sorte que le salaire réel (le salaire ajusté du
        pouvoir d'achat local) augmente. À l'inverse, les villes du quadrant
        supérieur gauche font peut-être face à une hausse relative du coût de la
        vie, contraignant les entreprises à verser des salaires plus élevés pour
        tenter de retenir les travailleurs. Malheureusement, nous ne disposons pas
        pour l'instant de données fiables sur le coût de la vie à l'échelle des
        villes ; cette dimension reste donc largement absente de notre analyse.
      </>
    ),
  },

  compositionH3: {
    en: <>Correcting wages for industrial composition</>,
    fr: <>Corriger les salaires de la composition sectorielle</>,
  },
  compositionP: {
    en: (
      <>
        It may be that a city experiences a labor demand boom, but one
        concentrated in low-wage jobs. As new workers migrate in to take
        advantage of that opportunity, the city's average wage mechanically moves
        down. Ideally, one would calculate a wage premium by regressing an
        individual's wage on a series of controls — including city, occupation,
        industry, experience, sex, and education. Here we are able to control for
        industrial composition by regressing log wages on industry and city. We
        visualize this below, where the y axis is the growth rate of the wage
        premium generated by that regression between 2014 and 2024.{' '}
        <CityLink name="Marrakesh" />, which originally showed below-median wage
        growth, now moves above the line — arguing that it has in fact seen a
        positive labor demand shock. <CityLink name="Tangier" /> also moves to
        just above the line, giving a similar signal. By accounting for industrial
        composition, the wage premium generates a stronger diagnostic signal. The
        trade-off is that it is a more complicated metric to explain.
      </>
    ),
    fr: (
      <>
        Il se peut qu'une ville connaisse un essor de la demande de travail, mais
        concentré dans des emplois peu rémunérés. À mesure que de nouveaux
        travailleurs migrent pour saisir cette opportunité, le salaire moyen de la
        ville baisse mécaniquement. Idéalement, on calculerait une prime salariale
        en régressant le salaire d'un individu sur une série de variables de
        contrôle — dont la ville, la profession, le secteur, l'expérience, le sexe
        et le niveau d'éducation. Ici, nous pouvons contrôler la composition
        sectorielle en régressant le logarithme des salaires sur le secteur et la
        ville. Nous représentons ce résultat ci-dessous, où l'axe des ordonnées
        correspond au taux de croissance de la prime salariale issue de cette
        régression entre 2014 et 2024. <CityLink name="Marrakesh" />, qui
        affichait initialement une croissance salariale inférieure à la médiane,
        passe désormais au-dessus de la ligne — ce qui suggère qu'elle a en
        réalité connu un choc de demande de travail positif.{' '}
        <CityLink name="Tangier" /> passe également juste au-dessus de la ligne, ce
        qui donne un signal similaire. En tenant compte de la composition
        sectorielle, la prime salariale produit un signal diagnostique plus net.
        La contrepartie est que cet indicateur est plus difficile à expliquer.
      </>
    ),
  },
  fePremiumTitle: {
    en: <>Net migration vs. wage-premium growth</>,
    fr: <>Migration nette vs croissance de la prime salariale</>,
  },
  fePremiumCaption: {
    en: (
      <>
        Each point is one city. The y axis is the annualized change, 2014–2024, in
        the city's wage premium from a two-way (city + industry) regression of log
        wages; zero means the city kept pace with the national rate for its
        industry mix.
      </>
    ),
    fr: (
      <>
        Chaque point représente une ville. L'axe des ordonnées correspond à la
        variation annualisée, 2014–2024, de la prime salariale de la ville issue
        d'une régression à deux dimensions (ville + secteur) du logarithme des
        salaires ; zéro signifie que la ville a suivi le rythme national compte
        tenu de sa composition sectorielle.
      </>
    ),
  },
  unempIntroP: {
    en: (
      <>
        An additional factor relevant in Morocco is the probability of finding
        work in a city. Unemployment in Morocco is high, and varies significantly
        across cities, far more so than in some peer countries. Unemployment in{' '}
        <CityLink name="Casablanca" /> stood at 18% in 2024, while in{' '}
        <CityLink name="Oujda" /> it was reported at 31%. Therefore, workers may
        discount the average wage in a city by the probability of achieving that
        wage, in a dynamic similar to what is expressed in Harris and Todaro's
        (1970) model for rural-to-urban migration.
      </>
    ),
    fr: (
      <>
        Un facteur supplémentaire pertinent au Maroc est la probabilité de trouver
        un emploi dans une ville. Le chômage y est élevé et varie fortement d'une
        ville à l'autre, bien plus que dans certains pays comparables. Le chômage
        à <CityLink name="Casablanca" /> s'établissait à 18 % en 2024, contre 31 %
        à <CityLink name="Oujda" />. Les travailleurs peuvent donc pondérer le
        salaire moyen d'une ville par la probabilité de l'obtenir, selon une
        dynamique proche de celle exprimée dans le modèle de migration des
        campagnes vers les villes de Harris et Todaro (1970).
      </>
    ),
  },
  utilityIntroP: {
    en: (
      <>
        One way to hold these ideas together is to imagine people are choosing a
        city that maximizes their utility, which roughly takes the form:
      </>
    ),
    fr: (
      <>
        Une façon de relier ces idées est d'imaginer que les individus
        choisissent la ville qui maximise leur utilité, laquelle prend
        approximativement la forme :
      </>
    ),
  },
  formula: {
    en: (
      <>
        U ={' '}
        <span className="frac">
          <span className="frac-num">wage</span>
          <span className="frac-den">cost of living</span>
        </span>{' '}
        × Pr(employed)
      </>
    ),
    fr: (
      <>
        U ={' '}
        <span className="frac">
          <span className="frac-num">salaire</span>
          <span className="frac-den">coût de la vie</span>
        </span>{' '}
        × Pr(emploi)
      </>
    ),
  },
  utilityModelP: {
    en: (
      <>
        This gives us a simplified model that can capture enough of the variation
        to be useful in explaining the performance of Morocco's cities.
        <sup className="footnote-marker">‡</sup> It can be further extended with
        concepts like amenities (non-monetary factors that adjust the
        attractiveness of a city, like crime, temperature, access to beaches,
        parks, and more), as in the Rosen–Roback framework (Rosen 1979; Roback
        1982). Our specification also does not explicitly model interactions with
        the informal economy, which is significant in Morocco. At the same time,
        it remains useful to illustrate the major forces shaping the growth
        dynamic.
      </>
    ),
    fr: (
      <>
        Cela nous donne un modèle simplifié capable de capter une part suffisante
        de la variation pour être utile à l'explication de la performance des
        villes du Maroc.
        <sup className="footnote-marker">‡</sup> Il peut être étendu avec des
        concepts comme les aménités (des facteurs non monétaires qui modulent
        l'attractivité d'une ville — criminalité, température, accès aux plages,
        aux parcs, etc.), comme dans le cadre de Rosen–Roback (Rosen 1979 ; Roback
        1982). Notre spécification ne modélise pas non plus explicitement les
        interactions avec l'économie informelle, pourtant importante au Maroc.
        Elle reste néanmoins utile pour illustrer les grandes forces qui façonnent
        la dynamique de croissance.
      </>
    ),
  },
  spatialEqP: {
    en: (
      <>
        The concept of <strong>spatial equilibrium</strong> captures the idea
        that utility tends to equalize across places. If any city were to offer a
        systematically higher wage, workers would move there until one of the
        other variables adjusted, whether through an increased cost of living, as
        more workers bid for the same housing stock, or increasing unemployment as
        prospective workers arrive at the city and are unable to find work
        (Glaeser and Gottlieb 2009).
      </>
    ),
    fr: (
      <>
        Le concept d'<strong>équilibre spatial</strong> traduit l'idée que
        l'utilité tend à s'égaliser entre les lieux. Si une ville offrait un
        salaire systématiquement plus élevé, les travailleurs s'y déplaceraient
        jusqu'à ce que l'une des autres variables s'ajuste — soit par une hausse
        du coût de la vie, à mesure que davantage de travailleurs se disputent le
        même parc de logements, soit par une hausse du chômage, à mesure que des
        candidats arrivent dans la ville sans parvenir à y trouver du travail
        (Glaeser et Gottlieb 2009).
      </>
    ),
  },
  readingP: {
    en: (
      <>
        This framing then changes how we read the labor-market outcomes we
        observe. A high wage could be offset by a higher cost of living, in which
        case real wages would tend to be similar across space. A high wage could
        equally be offset by a lower probability of employment, as workers arrive
        in hopes of capturing the wage and bid down their chances of landing it.
        From this perspective, rising unemployment can sometimes be a symptom of
        relative success rather than failure. Combining these indicators with net
        migration helps disambiguate the two stories. <CityLink name="Tétouan" />,
        for example, has seen significant net in-migration alongside a rise in
        unemployment, more consistent with the interpretation that it is a
        relatively attractive place to be unemployed than that the city is in
        decline.
      </>
    ),
    fr: (
      <>
        Ce cadre modifie alors notre lecture des résultats observés sur le marché
        du travail. Un salaire élevé peut être compensé par un coût de la vie plus
        élevé, auquel cas les salaires réels tendraient à être semblables d'un
        lieu à l'autre. Un salaire élevé peut tout aussi bien être compensé par
        une probabilité d'emploi plus faible, à mesure que des travailleurs
        arrivent dans l'espoir de capter ce salaire et réduisent leurs propres
        chances de l'obtenir. Sous cet angle, une hausse du chômage peut parfois
        être le symptôme d'une réussite relative plutôt que d'un échec. Combiner
        ces indicateurs avec la migration nette aide à départager les deux récits.{' '}
        <CityLink name="Tétouan" />, par exemple, a connu une forte migration
        nette positive accompagnée d'une hausse du chômage, ce qui est plus
        cohérent avec l'idée qu'il s'agit d'un endroit relativement attractif où
        être au chômage qu'avec celle d'une ville en déclin.
      </>
    ),
  },
  laborOutcomeTitle: {
    en: <>Net migration vs labor-market outcomes</>,
    fr: <>Migration nette vs résultats du marché du travail</>,
  },
  laborOutcomeCaption: {
    en: (
      <>
        Each point is one city. The Y axis defaults to the 2014–2024 change in the
        unemployment rate (percentage points); use the dropdown to switch to wage
        CAGR or composition-adjusted wage-premium growth. Dashed lines mark the
        national norm on each axis.
      </>
    ),
    fr: (
      <>
        Chaque point représente une ville. L'axe des ordonnées affiche par défaut
        la variation 2014–2024 du taux de chômage (en points de pourcentage) ;
        utilisez le menu déroulant pour passer au TCAC des salaires ou à la
        croissance de la prime salariale ajustée de la composition. Les lignes
        pointillées marquent la norme nationale sur chaque axe.
      </>
    ),
  },
  summaryP: {
    en: (
      <>
        This work has done two things: redrawn the boundary of a city more
        broadly, and built a minimal framework for assessing the economic
        performance of those cities. The framework draws on the urban economics of
        spatial equilibrium and internal migration to interpret labor-market
        outcomes, and organises the data into a tool that extends to every city in
        the Functional Urban Area database from the Global Human Settlement Layer.
        Read together, these indicators can recast outcomes that look unfavorable
        in isolation — <CityLink name="Tétouan" />'s rising unemployment, for
        instance — as plausible signals of relative attractiveness rather than
        decline.
      </>
    ),
    fr: (
      <>
        Ce travail a accompli deux choses : redéfinir la limite d'une ville de
        façon plus large, et construire un cadre minimal pour évaluer la
        performance économique de ces villes. Ce cadre s'appuie sur l'économie
        urbaine de l'équilibre spatial et de la migration interne pour interpréter
        les résultats du marché du travail, et organise les données dans un outil
        qui couvre chaque ville de la base des aires urbaines fonctionnelles du
        Global Human Settlement Layer. Lus conjointement, ces indicateurs peuvent
        reformuler des résultats qui paraissent défavorables isolément — la hausse
        du chômage à <CityLink name="Tétouan" />, par exemple — comme des signaux
        plausibles d'attractivité relative plutôt que de déclin.
      </>
    ),
  },
  caveatsP: {
    en: (
      <>
        At the same time, the tool and framework would benefit from further
        development and come with important caveats. Changes in the measured
        unemployment rate may sometimes reflect a change in the incentives of
        respondents to report that they are unemployed, rather than isolating
        changes in true unemployment. Similarly, changes in firms and workers
        registered with the CNSS may reflect uneven formalization driven by
        changing incentives and administrative practices, alongside real
        expansions in production, and so should be interpreted with some caution.
        Readers should ask whether an increase in employment in a particular
        sector reflects previously informal firms becoming registered, or new
        firms being founded and growing employment. Finally, internal migration
        patterns capture both rural-to-urban and urban-to-urban migration. The
        spatial equilibrium concept may describe urban-to-urban migration better
        than rural-to-urban migration (see Gollin et al. 2017), but without
        source–destination migration flows we are unable to disambiguate these
        forces. Women, in particular, may face additional mobility constraints
        that weaken the spatial equilibrium claim, and this deserves further
        attention and study.
      </>
    ),
    fr: (
      <>
        Dans le même temps, l'outil et le cadre gagneraient à être approfondis et
        s'accompagnent de réserves importantes. Les variations du taux de chômage
        mesuré peuvent parfois refléter une évolution des incitations des
        répondants à se déclarer au chômage, plutôt que d'isoler les variations du
        chômage réel. De même, les évolutions du nombre d'entreprises et de
        travailleurs enregistrés à la CNSS peuvent refléter une formalisation
        inégale, portée par des incitations et des pratiques administratives
        changeantes, en plus d'expansions réelles de la production ; elles doivent
        donc être interprétées avec prudence. Le lecteur doit se demander si une
        hausse de l'emploi dans un secteur donné traduit l'enregistrement
        d'entreprises auparavant informelles ou la création de nouvelles
        entreprises augmentant leurs effectifs. Enfin, les schémas de migration
        interne recouvrent à la fois la migration des campagnes vers les villes et
        la migration entre villes. Le concept d'équilibre spatial décrit peut-être
        mieux la migration entre villes que celle des campagnes vers les villes
        (voir Gollin et al. 2017), mais, faute de flux migratoires
        origine–destination, nous ne pouvons départager ces forces. Les femmes, en
        particulier, peuvent être soumises à des contraintes de mobilité
        supplémentaires qui affaiblissent l'hypothèse de l'équilibre spatial, ce
        qui mérite une attention et une étude plus approfondies.
      </>
    ),
  },
  closingP: {
    en: (
      <>
        Even so, this tool and framework offer a strong starting point for
        analyzing the evolution of cities in Morocco, and help frame important
        questions for researchers and policy makers to prioritize.
      </>
    ),
    fr: (
      <>
        Malgré cela, cet outil et ce cadre constituent un point de départ solide
        pour analyser l'évolution des villes du Maroc et aident à formuler des
        questions importantes que chercheurs et décideurs pourront prioriser.
      </>
    ),
  },
  footnoteDoubleDagger: {
    en: (
      <>
        <sup>‡</sup> A similar utility specification appears in Boeri, Ichino,
        Moretti and Posch (2019), in their analysis of regional wage equalization
        in Italy and Germany.
      </>
    ),
    fr: (
      <>
        <sup>‡</sup> Une spécification d'utilité similaire apparaît chez Boeri,
        Ichino, Moretti et Posch (2019), dans leur analyse de l'égalisation
        régionale des salaires en Italie et en Allemagne.
      </>
    ),
  },
  exploreH3: {
    en: <>Explore a city</>,
    fr: <>Explorer une ville</>,
  },
  exploreP: {
    en: (
      <>
        Each city in Morocco has evolved on its own particular trajectory over
        time. City profile pages enable readers to go deeper in analyzing the
        evolution of any of the cities identified by the Functional Urban Area
        approach. City profile pages first clarify the borders of the Functional
        Urban Area and the communes captured by this definition. They provide a
        picture snapshot of where that city stands in 2024 in terms of its
        population, formal wage, unemployment rate, and an overview of its economic
        structure as well as an estimate of its economic complexity. Readers can
        compare industry wages in a city against the average across Morocco, as
        well as against the average wage within the city, to understand which
        industries are paying relatively higher or lower median wages. Then, the
        profile discusses how the city has evolved over time, starting with a map
        of net migration patterns per commune within the functional urban area. It
        locates the city within the net migration versus wages scatter, which
        helps form a hypothesis as to what have been the primary forces driving the
        change in net migration over the past decade. A shift-share decomposition
        further dissects the component changes in labor demand, and allows the user
        to understand which industries have been driving these changes in
        particular. Finally, it shows the emergence of new industries, and puts the
        unemployment rate into perspective. A significant gap remains in the
        analysis of cost of living, which is a key supply-side factor that drives
        migration flows. Still, the profile provides a strong starting point for
        evaluating the economic performance of cities in Morocco over the past
        decade.
      </>
    ),
    fr: (
      <>
        Chaque ville du Maroc a suivi sa propre trajectoire au fil du temps. Les
        fiches de ville permettent au lecteur d'approfondir l'analyse de
        l'évolution de n'importe quelle ville identifiée par l'approche des aires
        urbaines fonctionnelles. Elles précisent d'abord les limites de l'aire
        urbaine fonctionnelle et les communes que cette définition recouvre. Elles
        offrent un instantané de la situation de la ville en 2024 — population,
        salaire formel, taux de chômage — ainsi qu'un aperçu de sa structure
        économique et une estimation de sa complexité économique. Le lecteur peut
        comparer les salaires sectoriels d'une ville à la moyenne nationale, ainsi
        qu'au salaire moyen de la ville elle-même, afin de comprendre quels
        secteurs versent des salaires médians relativement plus élevés ou plus
        faibles. La fiche analyse ensuite l'évolution de la ville dans le temps, en
        commençant par une carte des schémas de migration nette par commune au sein
        de l'aire urbaine fonctionnelle. Elle situe la ville dans le nuage
        migration nette vs salaires, ce qui aide à formuler une hypothèse sur les
        principales forces à l'origine de l'évolution de la migration nette au cours
        de la dernière décennie. Une décomposition par shift-share détaille les
        composantes de la variation de la demande de travail et permet de comprendre
        quels secteurs en particulier l'ont portée. Enfin, elle montre l'émergence
        de nouvelles industries et met en perspective le taux de chômage. Une lacune
        importante subsiste dans l'analyse du coût de la vie, facteur clé du côté de
        l'offre qui détermine les flux migratoires. La fiche n'en constitue pas moins
        un point de départ solide pour évaluer la performance économique des villes
        du Maroc au cours de la dernière décennie.
      </>
    ),
  },
  referencesSummary: {
    en: <>References</>,
    fr: <>Références</>,
  },
};

// --- City profile narrative (all parametrized by the city's display name) ----
// Every entry is a { en, fr } pair of functions taking the city's display name
// (some ignore it). Types inferred so the call sites stay precise.
export const cityContent = {
  dataGapNotice: {
    en: (name: string) => (
      <>
        <strong>No CNSS coverage for {name}.</strong> The social-security
        registry has no ville matching this FUA's communes, so formal-sector
        figures — wages, industry composition, complexity, and the shift-share —
        are not shown. Workers from {name} most likely report under a
        neighbouring CNSS ville. Census-based indicators (population,
        unemployment, migration) below are unaffected.
      </>
    ),
    fr: (name: string) => (
      <>
        <strong>Aucune couverture CNSS pour {name}.</strong> Le registre de
        sécurité sociale ne contient aucune ville correspondant aux communes de
        cette AUF ; les données du secteur formel — salaires, composition
        sectorielle, complexité et shift-share — ne sont donc pas affichées. Les
        travailleurs de {name} déclarent très probablement sous une ville CNSS
        voisine. Les indicateurs issus du recensement (population, chômage,
        migration) présentés ci-dessous ne sont pas affectés.
      </>
    ),
  },
  whatWeMeanTitle: {
    en: (name: string) => <>What we mean by {name}</>,
    fr: (name: string) => <>Ce que nous entendons par {name}</>,
  },
  whatWeMeanCaption: {
    en: (_name: string) => (
      <>
        The functional urban area (dashed boundary) and the communes inside it.
        Together they form the city's labor market for the rest of this page.
      </>
    ),
    fr: (_name: string) => (
      <>
        L'aire urbaine fonctionnelle (limite en pointillés) et les communes
        qu'elle contient. Ensemble, elles forment le marché du travail de la ville
        pour le reste de cette page.
      </>
    ),
  },
  levelsIntro: {
    en: (name: string) => (
      <>
        The rest of the page compares {name} on levels (where it stands today) and
        changes (how it moved between 2014 and 2024).
      </>
    ),
    fr: (name: string) => (
      <>
        La suite de la page compare {name} en niveaux (où elle se situe
        aujourd'hui) et en évolutions (comment elle a évolué entre 2014 et 2024).
      </>
    ),
  },
  section1H3: {
    en: (name: string) => <>1. Where {name} stands today</>,
    fr: (name: string) => <>1. Où en est {name} aujourd'hui</>,
  },
  levelsP: {
    en: (_name: string) => (
      <>
        How big is the city, what does it pay, and how easy is it to find a job?
        Each row shows the 2024 level, the change since 2014, the city's rank
        among the 63 functional urban areas, and a comparison to Casablanca —
        Morocco's largest and most-watched city.
      </>
    ),
    fr: (_name: string) => (
      <>
        Quelle est la taille de la ville, combien y gagne-t-on et est-il facile
        d'y trouver un emploi ? Chaque ligne indique le niveau de 2024,
        l'évolution depuis 2014, le rang de la ville parmi les 63 aires urbaines
        fonctionnelles, et une comparaison avec Casablanca — la plus grande ville
        du Maroc et la plus suivie.
      </>
    ),
  },
  compositionTitle: {
    en: (name: string) => <>What {name} does for a living</>,
    fr: (name: string) => <>De quoi vit {name}</>,
  },
  compositionCaption: {
    en: (_name: string) => (
      <>
        The city's 2024 industrial composition. Each rectangle is one CNSS
        industry, sized by workers, grouped by NACE section. Toggle the color to
        view sectional kind, industry-level economic complexity (PCI from the
        national product space), how this city's daily wage in each industry
        compares to the cross-city median for that industry, or the 2014–2024 wage
        growth (CAGR) within each industry.
      </>
    ),
    fr: (_name: string) => (
      <>
        La composition sectorielle de la ville en 2024. Chaque rectangle
        correspond à un secteur CNSS, dimensionné selon les effectifs et regroupé
        par section NACE. Changez la couleur pour afficher la section d'activité,
        la complexité économique du secteur (ICP issu de l'espace produit
        national), la comparaison du salaire journalier de la ville dans chaque
        secteur avec la médiane inter-villes de ce secteur, ou la croissance
        salariale 2014–2024 (TCAC) au sein de chaque secteur.
      </>
    ),
  },
  section2H3: {
    en: (name: string) => <>2. How {name} has changed</>,
    fr: (name: string) => <>2. Comment {name} a évolué</>,
  },
  changesIntro: {
    en: (name: string) => (
      <>
        The rest of this section asks what has driven the city's evolution over
        the past decade. We start with the within-city map of where people are
        moving, then locate {name} on the migration-versus-labor-outcomes scatter
        from the overview. The charts that follow decompose the change in formal
        employment: a shift-share splits it into national, industry-mix, and
        local-share components; one treemap shows which industries gained or lost
        share; another shows new industries that have entered since 2014.
      </>
    ),
    fr: (name: string) => (
      <>
        La suite de cette section s'interroge sur ce qui a guidé l'évolution de la
        ville au cours de la dernière décennie. Nous commençons par la carte
        interne des déplacements de population, puis nous situons {name} dans le
        nuage migration / résultats du marché du travail de la vue d'ensemble. Les
        graphiques suivants décomposent la variation de l'emploi formel : un
        shift-share la répartit entre une composante nationale, une composante de
        composition sectorielle et une composante de part locale ; un premier
        treemap montre quels secteurs ont gagné ou perdu en part ; un autre montre
        les nouvelles industries apparues depuis 2014.
      </>
    ),
  },
  movingTitle: {
    en: (_name: string) => <>Where the people are moving</>,
    fr: (_name: string) => <>Où se déplacent les gens</>,
  },
  movingCaption: {
    en: (_name: string) => (
      <>
        Communes shaded by net internal migration over the last decade. Green =
        net inflow, red = net outflow. The dashed boundary is the FUA used to
        define the city.
      </>
    ),
    fr: (_name: string) => (
      <>
        Communes colorées selon la migration interne nette de la dernière
        décennie. Vert = entrées nettes, rouge = sorties nettes. La limite en
        pointillés est l'AUF qui sert à définir la ville.
      </>
    ),
  },
  positionIntro: {
    en: (name: string) => (
      <>
        Stepping back from {name}'s internal flows to its position among the 66
        cities: the scatter below places {name} (in red) in the
        migration-versus-wages plane introduced on the overview. Cities in the
        upper right show positive demand shocks (both migration and wages above
        the national norm); cities in the lower left show the opposite; the
        off-diagonal quadrants are the ambiguous cases the spatial-equilibrium
        framing was set up to read.
      </>
    ),
    fr: (name: string) => (
      <>
        En passant des flux internes de {name} à sa position parmi les 66 villes :
        le nuage ci-dessous place {name} (en rouge) dans le plan migration /
        salaires présenté dans la vue d'ensemble. Les villes du quadrant supérieur
        droit présentent des chocs de demande positifs (migration et salaires
        au-dessus de la norme nationale) ; celles du quadrant inférieur gauche,
        l'inverse ; les quadrants hors diagonale correspondent aux cas ambigus que
        le cadre de l'équilibre spatial a été conçu pour interpréter.
      </>
    ),
  },
  positionTitle: {
    en: (_name: string) => <>Position in the migration vs. labor-market outcomes map</>,
    fr: (_name: string) => <>Position dans la carte migration vs résultats du marché du travail</>,
  },
  positionCaption: {
    en: (name: string) => (
      <>
        Each point is one city. {name} is highlighted in red. The Y axis toggle
        switches between median and mean wage growth (CAGR of CNSS daily wage),
        composition-adjusted wage-premium growth, and the 2014–2024 change in the
        unemployment rate. Dashed lines mark the national norm on each axis.
      </>
    ),
    fr: (name: string) => (
      <>
        Chaque point représente une ville. {name} est mise en évidence en rouge.
        Le sélecteur de l'axe des ordonnées bascule entre la croissance du salaire
        médian et moyen (TCAC du salaire journalier CNSS), la croissance de la
        prime salariale ajustée de la composition, et la variation 2014–2024 du
        taux de chômage. Les lignes pointillées marquent la norme nationale sur
        chaque axe.
      </>
    ),
  },
  drivenTitle: {
    en: (_name: string) => <>What's driven the change in formal employment?</>,
    fr: (_name: string) => <>Qu'est-ce qui a guidé l'évolution de l'emploi formel ?</>,
  },
  drivenP: {
    en: (_name: string) => (
      <>
        The scatter signals the sign of the demand shock; the next three charts
        characterise its content. We decompose the city's 2014→2024 change in CNSS
        workers into four pieces using a shift-share. <strong>National</strong> is
        the rising-tide effect (every city grew with Morocco).{' '}
        <strong>Industry mix</strong> rewards or penalises a city for its inherited
        industrial composition: cities heavy in nationally-fast-growing industries
        get a boost. <strong>Local share</strong> is the city-specific bit, how
        much its industries outperformed (or underperformed) the same industries
        elsewhere in Morocco. This is the cleanest signal of a local positive or
        negative demand shock.
      </>
    ),
    fr: (_name: string) => (
      <>
        Le nuage indique le signe du choc de demande ; les trois graphiques
        suivants en caractérisent le contenu. Nous décomposons la variation
        2014→2024 des effectifs CNSS de la ville en quatre éléments à l'aide d'un
        shift-share. La composante <strong>nationale</strong> correspond à l'effet
        d'entraînement (toutes les villes ont crû avec le Maroc). La composante de{' '}
        <strong>composition sectorielle</strong> récompense ou pénalise une ville
        pour sa structure sectorielle héritée : les villes spécialisées dans des
        secteurs en forte croissance au niveau national en bénéficient. La{' '}
        <strong>part locale</strong> est l'élément propre à la ville : la mesure
        dans laquelle ses secteurs ont surperformé (ou sous-performé) les mêmes
        secteurs ailleurs au Maroc. C'est le signal le plus net d'un choc de
        demande local, positif ou négatif.
      </>
    ),
  },
  ssMissing: {
    en: (name: string) => (
      <>
        No shift-share for {name} — no CNSS-matched ville means there is no
        formal-employment series to decompose.
      </>
    ),
    fr: (name: string) => (
      <>
        Pas de shift-share pour {name} — l'absence de ville CNSS correspondante
        signifie qu'il n'existe pas de série d'emploi formel à décomposer.
      </>
    ),
  },
  decompTitle: {
    en: (_name: string) => <>Decomposition of formal-employment change</>,
    fr: (_name: string) => <>Décomposition de la variation de l'emploi formel</>,
  },
  decompCaption: {
    en: (_name: string) => <>Bars step from 2014 to 2024 workers; each contribution is labelled.</>,
    fr: (_name: string) => (
      <>Les barres vont des effectifs de 2014 à ceux de 2024 ; chaque contribution est étiquetée.</>
    ),
  },
  waterfallToTreemapP: {
    en: (_name: string) => (
      <>
        The waterfall summarises the change at the aggregate level; the treemap
        below opens it up by industry. Each rectangle is one CNSS industry as it
        stood in 2014, and the colour toggle reveals which industries account for
        the local-share or industry-mix gains and losses. This is the most
        concrete view of what is growing or shrinking on the demand side.
      </>
    ),
    fr: (_name: string) => (
      <>
        Le graphique en cascade résume la variation au niveau agrégé ; le treemap
        ci-dessous la détaille par secteur. Chaque rectangle correspond à un
        secteur CNSS tel qu'il se présentait en 2014, et le sélecteur de couleur
        révèle quels secteurs expliquent les gains et les pertes de part locale ou
        de composition sectorielle. C'est la vue la plus concrète de ce qui croît
        ou se contracte du côté de la demande.
      </>
    ),
  },
  mixTitle: {
    en: (_name: string) => <>Industry mix in 2014, by section</>,
    fr: (_name: string) => <>Composition sectorielle en 2014, par section</>,
  },
  mixCaption: {
    en: (_name: string) => (
      <>
        Each rectangle is one CNSS industry, sized by 2014 workers and grouped by
        NACE section. Toggle the color to see which industries gained or lost the
        largest share of their 2014 workforce via the local-share or industry-mix
        component (capped at ±100%). Hover for the per-industry detail.
      </>
    ),
    fr: (_name: string) => (
      <>
        Chaque rectangle correspond à un secteur CNSS, dimensionné selon les
        effectifs de 2014 et regroupé par section NACE. Changez la couleur pour
        voir quels secteurs ont gagné ou perdu la plus grande part de leurs
        effectifs de 2014 via la composante de part locale ou de composition
        sectorielle (plafonnée à ±100 %). Survolez pour le détail par secteur.
      </>
    ),
  },
  loadingIndustryDetail: {
    en: (_name: string) => <>Loading industry detail…</>,
    fr: (_name: string) => <>Chargement du détail sectoriel…</>,
  },
  newIndIntroP: {
    en: (name: string) => (
      <>
        Not all of the new formal employment in {name} has come from existing
        industries expanding. The treemap below isolates industries that had zero
        workers in the city in 2014 and a positive count in 2024. These represent
        entry into new lines of activity, and a useful diagnostic for whether the
        city has been diversifying its productive structure or simply growing
        within its existing one.
      </>
    ),
    fr: (name: string) => (
      <>
        L'ensemble du nouvel emploi formel à {name} ne provient pas de l'expansion
        de secteurs existants. Le treemap ci-dessous isole les secteurs qui
        comptaient zéro travailleur dans la ville en 2014 et un effectif positif en
        2024. Ils représentent l'entrée dans de nouvelles activités, et
        constituent un diagnostic utile pour savoir si la ville a diversifié sa
        structure productive ou si elle s'est simplement développée dans la
        structure existante.
      </>
    ),
  },
  newIndTitle: {
    en: (_name: string) => <>New industries since 2014</>,
    fr: (_name: string) => <>Nouvelles industries depuis 2014</>,
  },
  newIndCaption: {
    en: (_name: string) => (
      <>
        Industries with zero CNSS workers in 2014 that show up by 2024. Toggle the
        color to view by NACE section, by daily wage relative to the industry's
        national median, or by daily wage relative to the city's median. These
        contribute entirely to the entry-effect bar in the waterfall above.
      </>
    ),
    fr: (_name: string) => (
      <>
        Secteurs comptant zéro travailleur CNSS en 2014 et présents en 2024.
        Changez la couleur pour afficher par section NACE, par salaire journalier
        relatif à la médiane nationale du secteur, ou par salaire journalier
        relatif à la médiane de la ville. Ces secteurs contribuent entièrement à la
        barre d'effet d'entrée du graphique en cascade ci-dessus.
      </>
    ),
  },
  section3H3: {
    en: (name: string) => <>3. {name} commune by commune</>,
    fr: (name: string) => <>3. {name}, commune par commune</>,
  },
  communeP: {
    en: (name: string) => (
      <>
        The maps above each told one story. This last one is open-ended: pick an
        indicator and the communes that make up {name} shade by it. Net migration
        is the within-city flow already seen above; the rest are 2024 census levels
        — how tight the labor market is (unemployment, participation), the human
        capital on hand (tertiary education), where the city's mass sits
        (population), and housing deprivation (slum share). Together they sketch why
        people sort the way they do inside the city. Formal wages are absent on
        purpose: CNSS pay is recorded at the ville level, not the commune, so there
        is no honest commune-level wage to map.
      </>
    ),
    fr: (name: string) => (
      <>
        Chacune des cartes précédentes racontait une histoire. Cette dernière est
        ouverte : choisissez un indicateur et les communes qui composent {name} se
        colorent en conséquence. La migration nette est le flux interne déjà vu
        plus haut ; les autres sont des niveaux du recensement 2024 — la tension du
        marché du travail (chômage, activité), le capital humain disponible
        (éducation supérieure), la répartition de la masse de population
        (population) et la précarité du logement (part d'habitat insalubre).
        Ensemble, ils esquissent pourquoi les habitants se répartissent comme ils
        le font à l'intérieur de la ville. Les salaires formels sont volontairement
        absents : la rémunération CNSS est enregistrée à l'échelle de la ville, pas
        de la commune ; il n'existe donc pas de salaire honnête à cartographier au
        niveau communal.
      </>
    ),
  },
  communeTitle: {
    en: (name: string) => <>Explore {name}'s communes by indicator</>,
    fr: (name: string) => <>Explorer les communes de {name} par indicateur</>,
  },
  communeCaption: {
    en: (_name: string) => (
      <>
        Each commune in the FUA (dashed boundary) shaded by the selected indicator.
        Use the dropdown to switch indicators; hover a commune for its value, and
        drag to zoom.
      </>
    ),
    fr: (_name: string) => (
      <>
        Chaque commune de l'AUF (limite en pointillés) colorée selon l'indicateur
        choisi. Utilisez le menu déroulant pour changer d'indicateur ; survolez une
        commune pour sa valeur, et glissez pour zoomer.
      </>
    ),
  },
};
