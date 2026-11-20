# Algorithme de transport

[← Sommaire](../README.md)

Cœur dans **`src/utils/algorithms/routing.ts`** ; orchestration dans **`src/services/travel.ts` (`computeOptions`)**.

## Modes

`car`, `walking`, `bus`, `train`, `plane` (+ legs d'accès multimodaux).

Exports de `routing.ts` : `computeDirectRoute`, `computeBusRoute`, `computeTrainRoute`, `computePlaneRoute`, `computeMultimodalRoute`, `computeRoute`, `isShortHaulFlightBanned`, const `SHORT_HAUL_RAIL_THRESHOLD_MIN = 150`.

## Construction des segments

- `fetchRoadSegment(from,to,mode)` — géométrie réelle route/marche via `services/road-routing.ts` : **Mapbox Directions** puis **OSRM** en secours, coords `[lat,lng]`.
- `planeSegment` — arc grand-cercle (`interpolateGreatCircle`) + `estimateFlightDuration`.
- `fetchOpenRailRoutingSegment` — géométrie rail via **OpenRailRouting** (`profile=all_tracks`).
- `trainSegments` — privilégie `/api/trains/route-geometry` (sections SNCF stylées) ; repli OpenRailRouting, puis route (Mapbox/OSRM) à 200 km/h.
- `computeBusRoute` — interroge d'abord `/api/buses/search` (horaires GTFS FlixBus / BlaBlaCar Bus) : vrais arrêts, durée réelle du car, opérateur dans `segment.label`. Sans liaison directe, repli sur l'estimation : gares routières de `bus-stations.ts` et `busLongSegment` (route, 55 km/h).
- `accessSegment` — premier/dernier km vers gares/aéroports ; mode d'accès le plus rapide (marche ≤ 8 km ; train/bus approximés depuis le driving).

## Seuils de mode (distance à vol d'oiseau)

| Mode | Condition |
|---|---|
| marche | `< 8 km` |
| voiture | toujours |
| bus | `> 10 km` |
| train | `> 20 km` |
| avion | `> 200 km` **et non interdit** |

## Interdiction des vols courts (loi française 2h30)

`isShortHaulFlightBanned` :
1. Les deux points en **France métropolitaine** (`isInMetropolitanFrance` : lat 41.2–51.2, lng −5.4–9.8).
2. `railJourneyDurationMin` calcule le meilleur temps de train réel : gares proches → paires SNCF → `railMainLegForPair` (`/api/trains/search`) isolant **le tronçon principal longue distance** (exclut RER/Transilien/Métro/Tram/Bus/Navette/Car via `LOCAL_RAIL_MODES`, tronçon ≥ `MIN_MAIN_LEG_MIN` = 25 min).
   Le résultat est mémorisé par paire de villes (~1 km) pour la session (`railDurationCache`, échecs non mémorisés), et chaque appel `/api/trains/search` sans `datetime` est en cache serveur 6 h : les jusqu'à 9 appels SNCF ne sont payés qu'une fois par paire ([cache des APIs](../architecture/api-cache.md)).
3. Si un tronçon rail existe et dure `< 150 min` (2h30) → avion **interdit**, remplacé par un trajet train.

La loi vit **uniquement dans le routing** ; aucun garde-fou dans `booking.ts`.

## Multimodal & géodésie

`computeMultimodalRoute` évalue les candidats **en parallèle**, retourne le plus rapide ; `buildResult` retire d'abord les étapes vides (`removeEmptySegments`, `utils/algorithms/empty-segments.ts` : durée arrondie à 0 min et moins de 100 m, au moins une étape gardée), puis agrège et pose `isMultimodal`. Ces étapes venaient des sections SNCF sans transport (liaisons `crow_fly` de 0 m en début et fin de trajet, affichées comme un faux « train », et transferts de 0 m dans une même gare). `/api/trains/route-geometry` traite désormais `crow_fly` comme de la marche.

`src/utils/algorithms/geodesic.ts` : `haversineDistance` (km, R=6371), `interpolateGreatCircle`, `estimateFlightDuration` (800 km/h + 60 min).

## Prix des transports

`computeOptions` pose d'abord un `price` via `priceEstimate(mode, km)` (classement rapide). Dès que les dates sont connues, `BundleBuilder` appelle `quoteOptions` (`services/prices.ts`) :

| Mode | Source live | Repli |
|---|---|---|
| avion | Travelpayouts (`/api/flights/search`) | estimation km |
| train | tarifs SNCF open data min/max (`/api/prices/train`) ; Trainline seulement si `TRAINLINE_LIVE_PRICES=true` | estimation km (liaisons TER absentes des grilles) |
| bus | FlixBus (`/api/prices/bus`) | estimation (BlaBlaCar Bus non coté) |
| voiture | `/api/prices/fuel` × conso + péages | `pricesConfig.fallbackFuelPrice` |
| marche | 0 | — |

`bookableSpans` aligne le prix sur chaque bouton « Réserver sur … » : **le segment le plus long** par mode (ex. Rennes → Paris Montparnasse, pas toute la chaîne Mont-Saint-Michel → salle). Train : tarifs SNCF open data (min/max), sinon estimation (Trainline live en tête uniquement si `TRAINLINE_LIVE_PRICES=true`, l'API étant bloquée par DataDome depuis les serveurs). `combineQuotes` additionne ces billets + accès voiture. `modeQuotes` alimente le prix affiché sur chaque bouton.

## Empreinte carbone (état actuel)

`utils/constants/transport.ts` (`MODE_META`) expose une **bande CO₂ qualitative** (Bas/Moyen/Élevé) par mode — pas de grammes précis. Pour des chiffres exacts, il faudrait des facteurs d'émission (ex. ADEME) × `distanceKm` (déjà calculée par segment).

## Fusion des étapes & comptage des transports

`buildResult` passe les segments dans `mergeSegments` (`src/utils/algorithms/segments.ts`) avant d'agréger :
1. Supprime les segments « bruit » : début et fin sur la **même gare** (nom normalisé par `normalizeStationName` — accents, `(Ville)`/`[Ville]`, « Gare de » ignorés — **ou** distance < 150 m) et longueur < 300 m.
2. Fusionne les segments consécutifs de **même ligne** (même mode + libellé + couleur) ou de marche consécutifs (coordonnées concaténées, distances/durées sommées).
3. Répète jusqu'à stabilité ; ne renvoie jamais un trajet vide.

`countTransports` compte les véhicules réels (`train`, `bus`, `plane` ; la marche jamais ; la voiture seulement si c'est tout le trajet) → `RouteResult.transports` / `transportsByMode`. Correspondances = `transports − 1`.

Affichage (`RoutesView`) : un seul mode → « 3 Trains » ; modes mélangés → « N transports » ; + « N correspondance(s) » si > 1 transport. L'API `/api/trains/route-geometry` ignore aussi les transferts à pied dans une même gare.

## Horaires précis et correspondances (`timed-segments.ts`)

Pour permettre au voyageur de savoir quand partir et de ne pas attendre inutilement en gare :
- `resolveTimedSegments` et `getLegTiming` (`src/utils/algorithms/timed-segments.ts`) attribuent à chaque segment son **heure exacte de départ et d'arrivée** (`departureTime`, `arrivalTime` ISO) et calculent les **temps d'attente en correspondance** (`waitTimeMinutes`).
- **Train SNCF** : aligne les segments avec les sections réelles de `TrainJourney.trains` (horaires et numéros de train SNCF), calcule le temps d'attente entre l'arrivée du premier train et le départ du suivant (`waitTimeAfterMinutes`). L'accès amont est calé à rebours pour arriver à temps en gare.
- **Avion** : cale le vol sur `FlightInfo.departureAt`, intègre la marge aéroportuaire (90 min) et la récupération des bagages (20 min).
- **Voiture, bus, repli** : horodatage séquentiel à partir de l'heure cible (départ calculé depuis `arriveBy` pour l'aller, ou à partir de `leaveAfter` pour le retour), avec temps de battement en correspondance inter-modes.
- La date et l'heure de départ sont affichées sur chaque bloc aller et retour (`LegBlock`, `LegFacts`), sur chaque segment de transport (`SegmentList`), dans le détail des horaires SNCF (`TrainTimes`) et dans la feuille de route (`RoadmapLeg`).

## Datasets (`src/utils/constants/`)

- `airports.ts` (10 aéroports FR), `bus-stations.ts` (gares routières de secours), `bus-network.json` (réseau de cars généré par `npm run gtfs:sync`, voir [APIs externes](../api/external-apis.md)), `transport.ts` (`MODE_META`).
