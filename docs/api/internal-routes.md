# API — Routes internes

[← Sommaire](../README.md)

Route Handlers Next.js sous `src/app/api/**` (exportent `GET`/`POST`/`PATCH`).

## Bundles (Supabase)

- **`api/bundles/route.ts`** — `POST`. Crée un bundle. Body `{ data: BundleSnapshot }` → insert Supabase → `{ uuid }` (201).
- **`api/bundles/[uuid]/route.ts`** — `GET` (récupère `uuid,email,data,created_at,updated_at`, 404 si absent) et `PATCH` (met à jour `data`).
- **`api/bundles/[uuid]/save/route.ts`** — `POST`. Body `{ email }` (validé par regex). Enregistre l'email, appelle `sendBundleLinkEmail`, retourne `{ ok, link, sent }`.

## Recherche

- **`api/hotels/search/route.ts`** — `GET`. Query `lat,lng,radius(=10),checkin,checkout`. → `LiteApiHotelAdapter`, puis `OverpassHotelAdapter` si LiteAPI échoue ou ne renvoie rien. Tri `pricePerNight` asc (hôtels sans prix à la fin). En-tête `X-Data-Source: liteapi | overpass | none`.
- **`api/events/search/route.ts`** — `GET`. Query `q` (recherche libre) ou `cities=Paris,Lyon,…` (idées de sortie : événements à venir filtrés sur `eventsConfig.ideaKeywords`, situés dans ces villes, alternés ville par ville, `eventsConfig.ideasLimit` au plus, sans lieux Mapbox/OSM). Dans les deux cas, la première lettre de chaque titre est mise en majuscule (`capitalizeFirst`, `utils/format.ts`), les sources renvoyant parfois des titres en minuscules. Événements (Ticketmaster → OpenAgenda → Open Data IDF) + lieux (Mapbox POI, Nominatim), dédoublonnés et classés. → `{ venues, eventSource }`. Garde la clé Ticketmaster côté serveur.
- **`api/buses/search/route.ts`** — `GET`. Query `fromLat,fromLng,toLat,toLng,date?`. Meilleure liaison directe en car entre les arrêts proches (≤ 50 km) d'après `bus-network.json` ; `date` filtre les jours de circulation. → `{ connection: { operator, from, to, durationMinutes, departures[] } | null, validTo }`.
- **`api/flights/search/route.ts`** — `GET`. Query `origin,destination` (IATA), `departure_at?`. → **Travelpayouts** `aviasales/v3/prices_for_dates` (EUR, tri prix, limit 5). → `{ flights }`.
- **`api/stations/route.ts`** — `GET`. Query `lat,lng,radius(=50)?`. Cache 24h de tous les `stop_areas` **SNCF** (paginé, Basic auth). Avec lat/lng : ≤20 gares les plus proches ; sinon toutes. → `{ stations, total }`.
- **`api/trains/search/route.ts`** — `GET`. Query `from,to` (IDs SNCF), `datetime?`, `represents?` (`departure` par défaut, ou `arrival` pour « arriver avant »). → **SNCF** `/journeys` (count 5, temps réel) → `TrainDetail[]` + coords + tarif. → `{ journeys }`.
- **`api/trains/route-geometry/route.ts`** — `GET`, `dynamic="force-dynamic"`. Query `from,to`. Polyligne stylée : trajet SNCF → arrêts (`vehicle_journeys`) → géométrie via **OpenRailRouting** (train) ou `fetchRoadRoute` (Mapbox Directions → OSRM) pour la marche et la route. Cache 30 min. → `{ coordinates, sections, stops }`.

## Deep-links de réservation (redirections 302)

- **`api/booking/train/route.ts`** — `GET`. Résout les noms de gare → URNs **Trainline**, redirige vers `book/results` (A/R via `journeySearchType=return` + `inwardDate`). Repli : Google Maps transit.
- **`api/booking/bus/route.ts`** — `GET`. Résout les villes → UUIDs **FlixBus**, redirige vers `shop.flixbus.com/search` (A/R via `returnDate`). Repli : Google Maps transit.

Détails : [../features/booking-links.md](../features/booking-links.md).

## Diagnostic

- **`api/health/email/route.ts`** — `GET`. Sans param : renvoie `{ brevoConfigured, from:{name,email} }` (vérifie si `BREVO_API_KEY` est présent et ce que `EMAIL_FROM` produit). Avec `?send=1` : tente un envoi Brevo **vers l'expéditeur lui-même** (donc non abusable) et renvoie `test:{ ok, status, body }` (la réponse exacte de Brevo : 201 OK / 400 sender invalide / 401 clé invalide). Outil de debug prod — supprimable une fois l'email fiabilisé.
