# API — APIs externes

[← Sommaire](../README.md)

| Service | Usage | Où |
|---|---|---|
| **Mapbox** | Geocoding (autocomplete départ) + rendu cartes | `services/geocoding.ts`, `TravelMap` |
| **LiteAPI** | Recherche d'hôtels + prix | `adapters/hotels/liteapi.adapter.ts` |
| **Overpass** | Hôtels OSM (repli si LiteAPI indisponible) | `adapters/hotels/overpass.adapter.ts` |
| **OSRM** | Géométrie route/marche | `algorithms/routing.ts`, `/api/trains/route-geometry` |
| **OpenRailRouting** | Géométrie rail | `algorithms/routing.ts`, `/api/trains/route-geometry` |
| **SNCF** | Gares, trajets trains, sections/arrêts | `/api/stations`, `/api/trains/*` |
| **Travelpayouts** (Aviasales) | Prix des vols | `/api/flights/search` |
| **Trainline** | Deep-link réservation train | `/api/booking/train` |
| **FlixBus** | Deep-link réservation bus | `/api/booking/bus` |
| **Kayak / Google Flights** | Deep-link vols | `utils/booking.ts` |
| **Booking.com** | Deep-link hôtel | `utils/booking.ts` |
| **Google Maps** | Itinéraires voiture/marche + replis transit | `utils/booking.ts`, routes booking |
| **Supabase** | Persistance des bundles | `lib/supabase/server.ts`, `/api/bundles/*` |
| **Brevo** | Emailing | `lib/email.ts` |
| **api.qrserver.com** | QR code du lien | `SaveBundleModal.tsx` |

Les configs (baseUrl, timeouts, clés) sont dans `src/config/*` (barrel `config/index.ts`) :
`liteapi, mapbox, sncf, overpass, travelpayouts, osrm, openrailwayrouting, supabase, api-cache`. Les durées de cache et quotas sont dans `config/api-cache.ts` ([cache des APIs](../architecture/api-cache.md)).

## Open Data Île-de-France — événements (Cibul)
- `GET https://opendata.iledefrance.fr/api/explore/v2.1/catalog/datasets/evenements-publics-cibul/records`
- Utilisé par `OpenDataEventAdapter` (recherche plein texte sur `title_fr`, événements à venir uniquement). Aucune clé requise.

## Mapbox Search Box (POI) — lieux
- `GET https://api.mapbox.com/search/searchbox/v1/forward?q={query}&types=poi&country=fr`
- Utilisé par `MapboxVenueAdapter` pour trouver stades, parcs, salles (ex. Stade de France) en France entière. Requiert `NEXT_PUBLIC_MAPBOX_TOKEN`.

## OpenStreetMap Nominatim — lieux
- `GET https://nominatim.openstreetmap.org/search?q={query}&format=jsonv2&countrycodes=fr`
- Utilisé par `OsmVenueAdapter` (parcs, stades, salles : ex. Puy du Fou). Aucune clé ; politique d'usage : ~1 requête/s max, pas d'usage intensif.
