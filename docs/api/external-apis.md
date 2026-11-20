# API — APIs externes

[← Sommaire](../README.md)

| Service | Usage | Où |
|---|---|---|
| **API Adresse (Géoplateforme)** | Autocomplétion de l'adresse de départ (1er choix) | `adapters/geocoding/geoplateforme.adapter.ts`, `services/geocoding.ts` |
| **Mapbox** | Geocoding (2e choix), recherche de lieux (POI), itinéraires route/marche (1er choix), carte (1er choix, style `outdoors-v12`) | `services/geocoding.ts`, `MapboxVenueAdapter`, `services/road-routing.ts`, `lib/map-engine.ts` |
| **MapLibre + OpenFreeMap** | Rendu de la carte (secours, sans clé) | `lib/map-engine.ts`, `TravelMap` |
| **Ticketmaster Discovery** | Événements (1er choix) | `adapters/events/ticketmaster.adapter.ts` |
| **OpenAgenda** (open data national) | Événements (2e choix) | `OpenAgendaEventAdapter` |
| **Open Data Île-de-France** | Événements (3e choix) | `OpenDataEventAdapter` |
| **LiteAPI** | Hôtels + prix (1er choix) | `adapters/hotels/liteapi.adapter.ts` |
| **Overpass** | Hôtels OSM sans prix (dernier secours de LiteAPI) | `adapters/hotels/overpass.adapter.ts` |
| **LiteAPI** | Hôtels + prix + conditions du tarif (annulation, formule) (1er choix) | `adapters/hotels/liteapi.adapter.ts` |
| **Overpass** | Hôtels OSM sans prix (secours de LiteAPI) | `adapters/hotels/overpass.adapter.ts` |
| **OSRM** | Itinéraires route/marche (secours de Mapbox Directions) | `services/road-routing.ts` |
| **OpenRailRouting** | Géométrie rail | `algorithms/routing.ts`, `/api/trains/route-geometry` |
| **SNCF** | Gares, trajets trains, sections/arrêts | `/api/stations`, `/api/trains/*` |
| **GTFS FlixBus / BlaBlaCar Bus** (transport.data.gouv.fr) | Arrêts et horaires des cars longue distance | `scripts/sync-bus-gtfs.mjs`, `/api/buses/search` |
| **Travelpayouts** (Aviasales) | Prix des vols | `/api/flights/search`, `services/prices.ts` |
| **Trainline** | Deep-link + prix train (1er choix) | `/api/booking/train`, `/api/prices/train`, `adapters/prices/trainline.adapter.ts` |
| **SNCF open data** (ressources.data.sncf.com) | Tarifs min/max TGV / OUIGO / Intercités (repli train) | `adapters/prices/sncf-tariffs.adapter.ts` |
| **FlixBus** | Deep-link + prix car | `/api/booking/bus`, `/api/prices/bus`, `adapters/prices/flixbus.adapter.ts` |
| **prix-carburants** (data.economie.gouv.fr) | Prix moyen carburant (voiture) | `/api/prices/fuel`, `adapters/prices/fuel.adapter.ts` |
| **BlaBlaCar Bus** | Lien vers le site de réservation | `utils/booking.ts` (`busConfig.operatorSites`) |
| **Kayak / Google Flights** | Deep-link vols | `utils/booking.ts` |
| **Booking.com** | Deep-link hôtel | `utils/booking.ts` |
| **Google Maps** | Itinéraires voiture/marche + replis transit | `utils/booking.ts`, routes booking |
| **Supabase** | Persistance des bundles | `lib/supabase/server.ts`, `/api/bundles/*` |
| **Brevo** | Emailing | `lib/email.ts` |
| **api.qrserver.com** | QR code du lien | `SaveBundleModal.tsx` |

Les configs (baseUrl, timeouts, clés) sont dans `src/config/*` (barrel `config/index.ts`) :
`liteapi, mapbox, map, geoplateforme, events, bus, sncf, overpass, travelpayouts, osrm, openrailwayrouting, supabase, nominatim, api-cache`. Les durées de cache et quotas sont dans `config/api-cache.ts`. Les flux GTFS sont dans `config/bus-gtfs.json` (lu aussi par le script de synchronisation).
Les configs (baseUrl, timeouts, TTL, clés) sont dans `src/config/*` (barrel `config/index.ts`) :
`liteapi, mapbox, map, geoplateforme, events, bus, sncf, overpass, travelpayouts, osrm, openrailwayrouting, supabase, nominatim, prices`. Les flux GTFS sont dans `config/bus-gtfs.json` (lu aussi par le script de synchronisation).
`liteapi, fare-conditions, mapbox, map, geoplateforme, events, bus, sncf, overpass, travelpayouts, osrm, openrailwayrouting, supabase, nominatim`. Les flux GTFS sont dans `config/bus-gtfs.json` (lu aussi par le script de synchronisation).

## Chaînes de secours

Chaque besoin a une source principale et des sources de secours. On passe à la suivante quand la source échoue (erreur HTTP, délai dépassé, clé absente) ou ne renvoie rien. L'utilitaire commun est `utils/fallback.ts` (`firstNonEmpty` pour les listes, `firstSuccess` pour un résultat unique).

| Besoin | Ordre | Où |
|---|---|---|
| Événements | Ticketmaster → OpenAgenda → Open Data IDF (les lieux Mapbox POI + Nominatim sont toujours ajoutés en parallèle) | `services/event-search.ts` |
| Hôtels | LiteAPI → hôtels déjà vus autour de la salle (sans prix) → Overpass | `/api/hotels/search` (en-tête `X-Data-Source`) |
| Adresse de départ | API Adresse → Mapbox → Nominatim | `services/geocoding.ts` |
| Adresse inverse | API Adresse → Mapbox → coordonnées brutes | `services/geocoding.ts` |
| Itinéraire route/marche | Mapbox Directions → OSRM | `services/road-routing.ts` |
| Carte | Mapbox GL (style `outdoors-v12` : relief, forêts, bâtiments) → MapLibre + OpenFreeMap (sans token, ou si l'API de style Mapbox ne répond pas) | `lib/map-engine.ts` |
| Cars | Horaires GTFS → estimation (gares routières `bus-stations.ts`, 55 km/h) | `algorithms/routing.ts` |
| Prix train | Trainline journey-search → tarifs SNCF open data | `/api/prices/train` |

**Lien avec le [cache des APIs](../architecture/api-cache.md)** : chaque maillon serveur d'une chaîne passe par `cached()` (clé par fournisseur). Le cache évite de rappeler une API pour une même requête et sert la dernière copie connue en cas de panne ; la chaîne de secours ne passe au fournisseur suivant que si le précédent n'a ni réponse ni copie. Couvert : événements, lieux (Mapbox POI, Nominatim), hôtels, SNCF, Travelpayouts. Non couvert : ce qui s'exécute dans le navigateur (adresse de départ, itinéraires `road-routing.ts`, carte), et les cars (fichier GTFS local, aucun appel).

## Ticketmaster Discovery — événements
- `GET https://app.ticketmaster.com/discovery/v2/events.json?apikey=…&keyword={q}&countryCode=FR&locale=fr-fr&sort=date,asc`
- Si la recherche par mot-clé est vide, nouvel essai avec `city={q}` (puces de villes de l'accueil).
- Requiert `TICKETMASTER_API_KEY` (gratuite sur developer.ticketmaster.com). Sans clé, l'adapter renvoie `[]` et la chaîne passe à OpenAgenda.

## OpenAgenda — événements (open data national)
- `GET https://public.opendatasoft.com/api/explore/v2.1/catalog/datasets/evenements-publics-openagenda/records`
- Même schéma que le jeu Île-de-France, filtré sur `location_countrycode = "FR"`. Aucune clé requise. Ids préfixés `oa-`.
- Les deux jeux OpenData contiennent aussi des activités permanentes publiées comme un seul événement sur plusieurs années (« 2021 - 2027 »). On les écarte : début il y a au plus `eventsConfig.maxEventSpanDays` (31) jours (`firstdate_begin >= now(days=-31)`) et durée totale de 31 jours au plus (`isShortEvent`).
- Chaque événement porte aussi `startDate` / `endDate` (`YYYY-MM-DD`, jour à Paris via `parisIsoDate`) : `firstdate_begin` / `lastdate_end` pour OpenData, `dates.start.localDate` pour Ticketmaster. Le lieu choisi les garde (`Location.startDate` / `endDate`) pour marquer ces jours dans le calendrier. Clé de cache des recherches : `events:v4:…` (les anciennes réponses n'avaient pas ces dates). La requête envoyée à OpenData remplace traits d'union et apostrophes par des espaces : « Tout-petit festival » trouve l'événement.

## Open Data Île-de-France — événements (Cibul)
- `GET https://opendata.iledefrance.fr/api/explore/v2.1/catalog/datasets/evenements-publics-cibul/records`
- Utilisé par `OpenDataEventAdapter` (recherche plein texte sur `title_fr`, événements à venir uniquement). Aucune clé requise.

## Mapbox Search Box (POI) — lieux
- `GET https://api.mapbox.com/search/searchbox/v1/forward?q={query}&types=poi&country=fr`
- Utilisé par `MapboxVenueAdapter` pour trouver stades, parcs, salles (ex. Stade de France) en France entière. Requiert `NEXT_PUBLIC_MAPBOX_TOKEN`.
- Mapbox renvoie tous les commerces qui portent le nom cherché (ex. « Céline » : boutiques, avocat, coiffeur). On ne garde que les lieux dont `poi_category_ids` contient une catégorie de `mapboxConfig.venueCategoryIds` (salle de concert, théâtre, stade, parc d'attractions…).

## OpenStreetMap Nominatim — lieux et secours du geocoding
- `GET https://nominatim.openstreetmap.org/search?q={query}&format=jsonv2&countrycodes=fr`
- Utilisé par `OsmVenueAdapter` (côté serveur, avec `User-Agent: bundle-events`) et en dernier recours par `searchLocation`. Seuls les lieux dont le `type` OSM est dans `nominatimConfig.venueTypes` sont gardés (stade, théâtre, salle de concert, parc d'attractions, parc…), pas les commerces ni les hameaux homonymes. Aucune clé ; politique d'usage : ~1 requête/s max, pas d'usage intensif.

## API Adresse (Géoplateforme) — adresses
- `GET https://data.geopf.fr/geocodage/search?q={q}&index=address&limit=5&autocomplete=1` et `/geocodage/reverse?lon=&lat=`
- Service de l'État (IGN), gratuit, sans clé, CORS ouvert. Appelé depuis le navigateur.

## Mapbox Directions — itinéraires
- `GET https://api.mapbox.com/directions/v5/mapbox/{driving|walking}/{lng,lat;lng,lat}?geometries=geojson&overview=full`
- Utilise `NEXT_PUBLIC_MAPBOX_TOKEN`. Au-delà de 25 points (sections SNCF longues), Mapbox refuse et OSRM prend le relais.

## OpenFreeMap — fond de carte
- Style `https://tiles.openfreemap.org/styles/liberty`, rendu avec MapLibre GL (v6, imports nommés). Gratuit, sans clé. Utilisé seulement en secours : moins détaillé que Mapbox `outdoors` (peu de différence visible entre forêts et villes aux zooms régionaux). L'attribution OpenFreeMap / OpenStreetMap est affichée (bouton ⓘ replié).

## GTFS cars — FlixBus et BlaBlaCar Bus
- Flux publiés sur transport.data.gouv.fr (obligation LOM). URLs dans `config/bus-gtfs.json`.
- `npm run gtfs:sync` télécharge les flux, garde les arrêts en France (`stop_timezone = Europe/Paris`), calcule pour chaque paire d'arrêts reliés directement les départs (heure, durée, jours de circulation sur 90 jours) et écrit `utils/constants/bus-network.json` (~250 Ko).
- À relancer régulièrement (horaires valables jusqu'à `validTo` dans le fichier). Le fichier n'est lu que côté serveur (`/api/buses/search`).
