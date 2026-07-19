# Algorithme de transport

[← Sommaire](../README.md)

Cœur dans **`src/utils/algorithms/routing.ts`** ; orchestration dans **`src/services/travel.ts` (`computeOptions`)**.

## Modes

`car`, `walking`, `bus`, `train`, `plane` (+ legs d'accès multimodaux).

Exports de `routing.ts` : `computeDirectRoute`, `computeBusRoute`, `computeTrainRoute`, `computePlaneRoute`, `computeMultimodalRoute`, `computeRoute`, `isShortHaulFlightBanned`, const `SHORT_HAUL_RAIL_THRESHOLD_MIN = 150`.

## Construction des segments

- `fetchOSRMSegment(from,to,mode)` — géométrie réelle route/marche via **OSRM** (`driving`/`foot`), coords `[lat,lng]`.
- `planeSegment` — arc grand-cercle (`interpolateGreatCircle`) + `estimateFlightDuration`.
- `fetchOpenRailRoutingSegment` — géométrie rail via **OpenRailRouting** (`profile=all_tracks`).
- `trainSegments` — privilégie `/api/trains/route-geometry` (sections SNCF stylées) ; repli OpenRailRouting, puis OSRM-driving à 200 km/h.
- `busLongSegment` — OSRM driving, durée recalculée à 55 km/h.
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
3. Si un tronçon rail existe et dure `< 150 min` (2h30) → avion **interdit**, remplacé par un trajet train.

La loi vit **uniquement dans le routing** ; aucun garde-fou dans `booking.ts`.

## Multimodal & géodésie

`computeMultimodalRoute` évalue les candidats **en parallèle**, retourne le plus rapide ; `buildResult` agrège et pose `isMultimodal`.

`src/utils/algorithms/geodesic.ts` : `haversineDistance` (km, R=6371), `interpolateGreatCircle`, `estimateFlightDuration` (800 km/h + 60 min).

## Empreinte carbone (état actuel)

`utils/constants/transport.ts` (`MODE_META`) expose une **bande CO₂ qualitative** (Bas/Moyen/Élevé) par mode — pas de grammes précis. Pour des chiffres exacts, il faudrait des facteurs d'émission (ex. ADEME) × `distanceKm` (déjà calculée par segment).

## Datasets (`src/utils/constants/`)

- `airports.ts` (10 aéroports FR), `bus-stations.ts` (18 gares routières), `venues.ts` (16 salles/stades), `transport.ts` (`MODE_META`).
