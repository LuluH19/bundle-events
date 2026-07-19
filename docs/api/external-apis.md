# API — APIs externes

[← Sommaire](../README.md)

| Service | Usage | Où |
|---|---|---|
| **Mapbox** | Geocoding (autocomplete départ) + rendu cartes | `services/geocoding.ts`, `TravelMap` |
| **LiteAPI** | Recherche d'hôtels + prix | `adapters/hotels/liteapi.adapter.ts` |
| **Overpass** | Hôtels OSM (alternatif, non câblé) | `adapters/hotels/overpass.adapter.ts` |
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

Les configs (baseUrl, timeouts, TTL, clés) sont dans `src/config/*` (barrel `config/index.ts`) :
`liteapi, mapbox, sncf, overpass, travelpayouts, osrm, openrailwayrouting, supabase`.
